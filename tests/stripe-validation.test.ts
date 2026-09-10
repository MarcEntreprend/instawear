// tests/stripe-validation.test.ts
// Validation couleur/taille du payment-intent (stripe-checkout) :
// - FINI les whitelists en dur (XS..3XL, hex uniquement) qui rejetaient
//   des variantes réelles (5XL, tailles bébé, couleurs nommées).
// - La couleur/taille doit exister dans les variantes du produit en base.
// Miroirs de saneLabel + variantSelectionError (edge Deno).

import { test } from "node:test";
import assert from "node:assert/strict";

function saneLabel(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > maxLen) return null;
  if (/[\x00-\x1F\x7F]/.test(t)) return null;
  return t;
}

function variantSelectionError(
  product: any,
  color: unknown,
  size: unknown,
): string | null {
  const hasColor =
    color !== undefined && color !== null && String(color).trim() !== "";
  const hasSize =
    size !== undefined && size !== null && String(size).trim() !== "";
  const c = hasColor ? saneLabel(color, 100) : null;
  const s = hasSize ? saneLabel(size, 20) : null;
  if (hasColor && c === null) return "Couleur invalide";
  if (hasSize && s === null) return "Taille invalide";

  if (product && (c !== null || s !== null)) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variantColors =
      variants.length > 0
        ? variants.map((vv: any) => String(vv.color || "").toLowerCase())
        : (Array.isArray(product.colors)
            ? product.colors.map((x: any) => String(x).toLowerCase())
            : []);

    let colorVariant: any = null;
    if (c !== null) {
      if (
        variantColors.length > 0 &&
        !variantColors.includes(c.toLowerCase())
      ) {
        return "Couleur indisponible pour ce produit";
      }
      colorVariant =
        variants.find(
          (vv: any) => String(vv.color || "").toLowerCase() === c.toLowerCase(),
        ) || null;
    }

    if (s !== null) {
      let candidates: string[] = [];
      if (colorVariant && colorVariant.sizes && typeof colorVariant.sizes === "object") {
        candidates = Object.keys(colorVariant.sizes);
      } else if (variants.length > 0) {
        const set = new Set<string>();
        for (const vv of variants) {
          if (vv.sizes && typeof vv.sizes === "object") {
            for (const k of Object.keys(vv.sizes)) set.add(k);
          }
        }
        candidates = [...set];
      } else if (Array.isArray(product.sizes)) {
        candidates = product.sizes.map((x: any) => String(x));
      }
      if (candidates.length > 0 && !candidates.includes(s)) {
        return "Taille indisponible pour ce produit";
      }
    }
  }
  return null;
}

const tee = {
  variants: [
    { color: "#1a1a1a", sizes: { S: {}, M: {}, "5XL": {} } },
    { color: "Natural", sizes: { S: {}, M: {} } },
  ],
};
const baby = {
  variants: [{ color: "#ffffff", sizes: { "3-6M": {}, "6-12M": {}, "12-18M": {} } }],
};

// ─── Cas du bug report ──────────────────────────────────────────────────────

test("5XL accepté (était rejeté par la whitelist)", () => {
  assert.equal(variantSelectionError(tee, "#1a1a1a", "5XL"), null);
});

test("tailles bébé acceptées (3-6M, 12-18M)", () => {
  assert.equal(variantSelectionError(baby, "#ffffff", "3-6M"), null);
  assert.equal(variantSelectionError(baby, "#ffffff", "12-18M"), null);
});

test("couleur nommée acceptée (Natural)", () => {
  assert.equal(variantSelectionError(tee, "Natural", "M"), null);
  assert.equal(variantSelectionError(tee, "natural", "M"), null);
});

test("hex classique toujours accepté", () => {
  assert.equal(variantSelectionError(tee, "#1a1a1a", "M"), null);
});

// ─── Vrais rejets (sécurité conservée) ──────────────────────────────────────

test("taille inexistante rejetée", () => {
  assert.equal(
    variantSelectionError(tee, "#1a1a1a", "9XL"),
    "Taille indisponible pour ce produit",
  );
});

test("taille d'une autre couleur rejetée (5XL pas en Natural)", () => {
  assert.equal(
    variantSelectionError(tee, "Natural", "5XL"),
    "Taille indisponible pour ce produit",
  );
});

test("couleur inexistante rejetée", () => {
  assert.equal(
    variantSelectionError(tee, "Invisible Pink", "M"),
    "Couleur indisponible pour ce produit",
  );
});

test("chaîne vide/absente = champ ignoré (comme avant)", () => {
  assert.equal(variantSelectionError(tee, "", "M"), null);
  assert.equal(variantSelectionError(tee, null, undefined), null);
});

test("trop long rejeté (anti-injection)", () => {
  assert.equal(variantSelectionError(tee, "#1a1a1a", "M".padEnd(21, "X")), "Taille invalide");
  assert.equal(variantSelectionError(tee, "C".padEnd(101, "C"), "M"), "Couleur invalide");
});

test("caractères de contrôle rejetés", () => {
  assert.equal(variantSelectionError(tee, "#1a1a1a", "M\nDROP"), "Taille invalide");
  assert.equal(variantSelectionError(null, "ok", "M\x00"), "Taille invalide");
});

test("non-string rejeté", () => {
  assert.equal(variantSelectionError(tee, 123 as any, "M"), "Couleur invalide");
});

// ─── Produit introuvable : forme seule (total 0 ensuite, comme avant) ───────

test("produit inconnu : sanity check uniquement", () => {
  assert.equal(variantSelectionError(null, "#1a1a1a", "5XL"), null);
  assert.equal(variantSelectionError(undefined, "Natural", "3-6M"), null);
});

test("produit sans variantes ni listes : accepté si sain", () => {
  assert.equal(variantSelectionError({}, "#1a1a1a", "5XL"), null);
});

test("legacy colors/sizes utilisés si pas de variants", () => {
  const legacy = { colors: ["Red"], sizes: ["One Size"] };
  assert.equal(variantSelectionError(legacy, "Red", "One Size"), null);
  assert.equal(
    variantSelectionError(legacy, "Blue", "One Size"),
    "Couleur indisponible pour ce produit",
  );
  assert.equal(
    variantSelectionError(legacy, "Red", "M"),
    "Taille indisponible pour ce produit",
  );
});

// ─── isItemAvailableNow (miroir edge : données fraîches DB) ─────────────────

function isItemAvailableNow(product: any, color: unknown, size: unknown): boolean {
  if (!product) return false;
  const c = saneLabel(color, 100);
  const s = saneLabel(size, 20);
  if (!c || !s) return false;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length > 0) {
    const v = variants.find(
      (vv: any) => String(vv.color || "").toLowerCase() === c.toLowerCase(),
    );
    if (!v) return false;
    const e = v.sizes?.[s];
    if (!e) return false;
    return ((e as any).stock_status || "available") === "available";
  }
  if (Array.isArray(product.sizes)) {
    return product.sizes.map((x: any) => String(x)).includes(s);
  }
  return true;
}

const stocked = {
  variants: [
    {
      color: "#1a1a1a",
      sizes: {
        M: { price: 10, stock_status: "available" },
        "5XL": { price: 12, stock_status: "out_of_stock" },
      },
    },
    {
      color: "Natural",
      sizes: { S: { price: 10, stock_status: "discontinued" } },
    },
  ],
};

test("disponible → facturable", () => {
  assert.equal(isItemAvailableNow(stocked, "#1a1a1a", "M"), true);
});

test("rupture/supprimé → exclu (jamais facturé)", () => {
  assert.equal(isItemAvailableNow(stocked, "#1a1a1a", "5XL"), false);
  assert.equal(isItemAvailableNow(stocked, "Natural", "S"), false);
});

test("couleur/taille inconnue → exclu", () => {
  assert.equal(isItemAvailableNow(stocked, "#1a1a1a", "9XL"), false);
  assert.equal(isItemAvailableNow(stocked, "Blue", "M"), false);
});

test("produit inconnu → exclu (principe de précaution)", () => {
  assert.equal(isItemAvailableNow(null, "M", "M"), false);
});

test("produit sans variantes : membership tailles legacy", () => {
  assert.equal(isItemAvailableNow({ sizes: ["One Size"] }, "Red", "One Size"), true);
  assert.equal(isItemAvailableNow({ sizes: ["One Size"] }, "Red", "M"), false);
});
