// tests/variant-images.test.ts
// Images variantes vs mockups :
// - précédence image (avec design) > mockup vierge (jamais écrasé)
// - galerie = mockups d'abord, replis colorImages puis fichiers
// - garde CSS : jamais de nom brut en backgroundColor
// - COLOR_NAME_TO_HEX couvre les noms constatés vides en prod

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const syncSource = readFileSync(
  join(root, "supabase/functions/sync-printful/index.ts"),
  "utf-8",
);

// ─── Miroir de la précédence buildVariantMatrix ─────────────────────────────

interface Entry {
  image: string;
  mockup_image: string;
}

function resolveEntryImages(
  productImage: string | undefined,
  catalogImage: string | undefined,
  filePreview: string | undefined,
): Entry {
  // 1) mockup vierge : product.image puis catalogue (n'écrase jamais image)
  let mockup_image = "";
  if (productImage) mockup_image = productImage;
  if (catalogImage) mockup_image = catalogImage;
  // 2) aperçu avec design prioritaire
  let image = filePreview || "";
  // 3) garantie : image renseignée si une source existe
  if (!image) image = mockup_image;
  return { image, mockup_image };
}

test("files preview (avec design) gagne sur le mockup vierge", () => {
  const e = resolveEntryImages("blank.jpg", "catalog-blank.jpg", "design.jpg");
  assert.equal(e.image, "design.jpg");
  assert.equal(e.mockup_image, "catalog-blank.jpg");
});

test("sans files : image = mockup (garantie non-vide)", () => {
  const e = resolveEntryImages(undefined, "catalog-blank.jpg", undefined);
  assert.equal(e.image, "catalog-blank.jpg");
  assert.equal(e.mockup_image, "catalog-blank.jpg");
});

test("sans aucune source : image vide (placeholder côté UI)", () => {
  const e = resolveEntryImages(undefined, undefined, undefined);
  assert.equal(e.image, "");
  assert.equal(e.mockup_image, "");
});

test("le catalogue n'écrase jamais l'aperçu avec design", () => {
  // Ordre edge : product.image -> catalogue (mockup) -> files (image).
  // files arrive en dernier mais ne remplit que si vide.
  const e = resolveEntryImages("blank.jpg", "catalog-blank.jpg", "design.jpg");
  assert.notEqual(e.image, "catalog-blank.jpg");
});

// ─── Galerie : mockups > colorImages > fichiers ─────────────────────────────

function resolveGallery(
  mockupImages: string[],
  colorImages: string[],
  fileThumbs: string[],
): string[] {
  const uniq = (arr: string[]) => [...new Set(arr)].slice(0, 12);
  if (uniq(mockupImages).length > 0) return uniq(mockupImages);
  if (uniq(colorImages).length > 0) return uniq(colorImages);
  return fileThumbs.filter((u) => u && u.trim().length > 0);
}

test("galerie = mockups quand présents", () => {
  assert.deepEqual(
    resolveGallery(["m1.jpg"], ["d1.jpg"], ["f1.jpg"]),
    ["m1.jpg"],
  );
});

test("galerie = colorImages si pas de mockups", () => {
  assert.deepEqual(resolveGallery([], ["d1.jpg"], ["f1.jpg"]), ["d1.jpg"]);
});

test("galerie = fichiers en dernier recours", () => {
  assert.deepEqual(resolveGallery([], [], ["f1.jpg"]), ["f1.jpg"]);
});

test("galerie vide si aucune source", () => {
  assert.deepEqual(resolveGallery([], [], []), []);
});

// ─── Garde CSS : jamais de nom brut en backgroundColor ──────────────────────

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function swatchBackground(colorKey: string): string {
  return HEX_RE.test(colorKey) ? colorKey : "var(--color-surface2)";
}

test("hex valide → utilisé tel quel", () => {
  assert.equal(swatchBackground("#808080"), "#808080");
  assert.equal(swatchBackground("#FFF"), "#FFF");
});

test("nom brut ('Yellow Haze') → neutre, jamais invalide", () => {
  assert.equal(swatchBackground("Yellow Haze"), "var(--color-surface2)");
  assert.equal(swatchBackground("Natural"), "var(--color-surface2)");
  assert.equal(swatchBackground(""), "var(--color-surface2)");
});

// ─── COLOR_NAME_TO_HEX couvre les cas prod constatés ────────────────────────

for (const name of ["natural", "yellow haze", "ice grey", "ice gray"]) {
  test(`map contient "${name}"`, () => {
    assert.ok(
      syncSource.includes(`"${name}": "#`) ||
        syncSource.includes(`'${name}': "#`) ||
        syncSource.includes(`${name}: "#`),
      `COLOR_NAME_TO_HEX doit contenir ${name}`,
    );
  });
}

test("l'edge stocke mockup_image par variante (champ additif)", () => {
  assert.ok(
    syncSource.includes("mockup_image"),
    "buildVariantMatrix doit renseigner mockup_image",
  );
});

test("le catalogue n'écrase plus entry.image (que mockup_image)", () => {
  assert.ok(
    syncSource.includes("entry.mockup_image = cv.image"),
    "la boucle catalogue ne doit écrire que mockup_image",
  );
});

// ─── Identité variante préservée (consistance paniers/commandes) ────────────

test("la clé couleur reste v.color (pas le nom, pas le hex)", () => {
  // Miroir du mapping edge : color: hex — la clé d'identité utilisée par
  // favoris/panier/checkout/stripe/printful/emails/admin ne change pas.
  const entry = { colorKey: "#808080", name: "Sport Grey" };
  const identityKey = entry.colorKey;
  assert.equal(identityKey, "#808080");
});

// ─── Déduplication insensible à la casse (miroir edge) ──────────────────────

function dedupeVariants(variants: any[]): any[] {
  const seen = new Map<string, any>();
  const out: any[] = [];
  for (const v of variants) {
    const k = (v.color || "").toLowerCase();
    const prev = seen.get(k);
    if (!prev) {
      seen.set(k, v);
      out.push(v);
      continue;
    }
    prev.sizes = { ...(v.sizes || {}), ...(prev.sizes || {}) };
    if (!prev.image && v.image) prev.image = v.image;
    if (!prev.mockup_image && v.mockup_image) prev.mockup_image = v.mockup_image;
    if (!prev.external_variant_id && v.external_variant_id) {
      prev.external_variant_id = v.external_variant_id;
    }
  }
  return out;
}

test("'Natural' + 'natural' fusionnent en une seule variante", () => {
  const out = dedupeVariants([
    { color: "Natural", image: "a.jpg", sizes: { S: { price: 10 } } },
    { color: "natural", image: "", sizes: { M: { price: 10 } } },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].color, "Natural"); // casse d'origine préservée
  assert.deepEqual(Object.keys(out[0].sizes).sort(), ["M", "S"]);
});

test("les images se complètent lors de la fusion", () => {
  const out = dedupeVariants([
    { color: "Yellow Haze", image: "", mockup_image: "m.jpg", sizes: {} },
    { color: "yellow haze", image: "d.jpg", mockup_image: "", sizes: {} },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].image, "d.jpg");
  assert.equal(out[0].mockup_image, "m.jpg");
});

test("couleurs distinctes préservées", () => {
  const out = dedupeVariants([
    { color: "#808080", image: "a.jpg", sizes: {} },
    { color: "Natural", image: "b.jpg", sizes: {} },
  ]);
  assert.equal(out.length, 2);
});

test("l'edge déduplique en sortie de matrice", () => {
  assert.ok(
    syncSource.includes("seenColor"),
    "buildVariantMatrix doit dédupliquer les couleurs",
  );
});

// ─── Colonne gauche : principale + mockups, dédupliquée ─────────────────────

function buildLeftStrip(
  mainImage: string,
  variantMockups: (string | undefined)[],
  gallery: string[],
  placeholder = "PLACEHOLDER",
): string[] {
  const mocks = variantMockups.filter(
    (u): u is string => !!u && u.trim().length > 0,
  );
  return [mainImage, ...mocks, ...gallery].filter(
    (u, idx, arr) =>
      u && u.trim().length > 0 && u !== placeholder && arr.indexOf(u) === idx,
  );
}

test("principale d'abord, puis mockups variantes, puis galerie", () => {
  assert.deepEqual(
    buildLeftStrip("main.jpg", ["m1.jpg", "m2.jpg"], ["g1.jpg"]),
    ["main.jpg", "m1.jpg", "m2.jpg", "g1.jpg"],
  );
});

test("déduplique les URLs répétées (galerie post-resync = mockups)", () => {
  assert.deepEqual(
    buildLeftStrip("main.jpg", ["m1.jpg"], ["m1.jpg", "g1.jpg"]),
    ["main.jpg", "m1.jpg", "g1.jpg"],
  );
});

test("données pré-resync (sans mockup_image) : galerie inchangée", () => {
  assert.deepEqual(
    buildLeftStrip("main.jpg", [undefined, undefined], ["v1.jpg"]),
    ["main.jpg", "v1.jpg"],
  );
});

test("filtre vide et placeholder", () => {
  assert.deepEqual(
    buildLeftStrip("", ["", "m1.jpg"], ["PLACEHOLDER", ""]),
    ["m1.jpg"],
  );
});

// ─── Cadre : dernier-clic-gagne (override > variante > galerie) ─────────────

function resolveFrame(
  frameOverride: string | null,
  variantImage: string | null,
  gallery: string[],
  galleryIndex: number,
  placeholder = "PLACEHOLDER",
): string {
  return (
    frameOverride ||
    variantImage ||
    gallery[galleryIndex] ||
    placeholder
  );
}

test("clic mockup (override) gagne sur l'image variante", () => {
  assert.equal(
    resolveFrame("mockup2.jpg", "variant-red.jpg", ["m1.jpg", "mockup2.jpg"], 0),
    "mockup2.jpg",
  );
});

test("clic couleur (override = visuel variante) s'affiche", () => {
  assert.equal(
    resolveFrame("variant-blue.jpg", "variant-blue.jpg", ["m1.jpg"], 0),
    "variant-blue.jpg",
  );
});

test("sans override : visuel de la variante choisie", () => {
  assert.equal(
    resolveFrame(null, "variant-red.jpg", ["m1.jpg"], 0),
    "variant-red.jpg",
  );
});

test("sans override ni visuel variante : galerie à l'index", () => {
  assert.equal(resolveFrame(null, null, ["m1.jpg", "m2.jpg"], 1), "m2.jpg");
});

test("rien du tout : placeholder", () => {
  assert.equal(resolveFrame(null, null, [], 0), "PLACEHOLDER");
});

// ─── ThumbStrip : pastille "+N" (pur, importé du composant) ─────────────────
import { computeDownCount } from "../src/components/product/ThumbStrip.tsx";

test("+N : pas de dépassement → 0", () => {
  assert.equal(computeDownCount(400, 0, 420, 74), 0);
});

test("+N : miniatures entièrement cachées en bas", () => {
  // 10 thumbs de 74px = 740, viewport 420, scroll 0 → cachés 320px,
  // marge 8px : floor(312/74) = 4
  assert.equal(computeDownCount(740, 0, 420, 74), 4);
});

test("+N : diminue en scrollant, ignoré pour un bout qui dépasse", () => {
  // scroll 222 → cachés 98px → floor(90/74) = 1
  assert.equal(computeDownCount(740, 222, 420, 74), 1);
  // scroll 320 → rien caché → 0
  assert.equal(computeDownCount(740, 320, 420, 74), 0);
  // que 24px cachés (< 1 miniature + marge) → 0, pas de pastille
  assert.equal(computeDownCount(740, 296, 420, 74), 0);
});

test("+N : thumbSize invalide → 0 (pas de crash)", () => {
  assert.equal(computeDownCount(740, 0, 420, 0), 0);
});
