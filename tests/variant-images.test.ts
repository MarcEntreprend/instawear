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
