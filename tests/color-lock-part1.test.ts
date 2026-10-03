// tests/color-lock-part1.test.ts
// PARTIE 1 — VERROU section couleur (comportement gelé, zéro changement) +
// garde-fou missing hors galerie CLIENT (admin voit le brut).
// - Réel : applyStorageToVariants (legacy : brut premier-arrivé, sans
//   filtre placement) + isPlaceholderImage.
// - Miroirs : finalize applique appliedByColor, image écrasée (legacy),
//   import color_images[0] d'abord, worker = même finalize, ProductPage
//   filtre missing, admin intact (brut visible).
// Toute modification volontaire de ces comportements DOIT mettre à jour
// ces tests explicitement (décision produit, jamais en passant).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { applyStorageToVariants } from "../supabase/functions/sync-printful/_shared/productImages.ts";
import { isPlaceholderImage } from "../src/utils/gallery.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

const RAW_FRONT = "https://printful-upload/tmp/violet-front-1.jpg";
const RAW_BACK = "https://printful-upload/tmp/violet-back-1.jpg";
const STORED = "https://x.supabase.co/storage/v1/object/public/product-mockups/p/aa.jpg";
const BLANK = "https://files.cdn.printful.com/products/1/1.jpg";

// ─── Verrou : Passe 1 legacy ─────────────────────────────────────────────

test("VERROU Passe 1 : assigne le mockup_url BRUT tel quel (même tmp/)", () => {
  const out = applyStorageToVariants(
    [{ color: "#1a1a1a", image: BLANK, sizes: { S: { catalog_variant_id: 1 } } }],
    [{ variant_ids: [1], mockup_url: RAW_FRONT, placement: "front" }],
    () => null,
    { "#1a1a1a": STORED },
  );
  // Brut assigné ALORS MÊME que le storage existe (Passe 1 ignore
  // hexToStorage) : c'est le comportement actuel aimé, gelé ici.
  assert.equal(out.variants[0].image, RAW_FRONT);
  assert.equal(out.applied.length, 1);
});

test("VERROU Passe 1 : premier arrivé gagne, AUCUN filtre placement", () => {
  const mk = () => [
    { color: "#1a1a1a", image: BLANK, sizes: { S: { catalog_variant_id: 1 } } },
  ];
  const backFirst = applyStorageToVariants(
    mk(),
    [
      { variant_ids: [1], mockup_url: RAW_BACK, placement: "back" },
      { variant_ids: [1], mockup_url: RAW_FRONT, placement: "front" },
    ],
    () => null,
    {},
  );
  assert.equal(backFirst.variants[0].image, RAW_BACK);
  const frontFirst = applyStorageToVariants(
    mk(),
    [
      { variant_ids: [1], mockup_url: RAW_FRONT, placement: "front" },
      { variant_ids: [1], mockup_url: RAW_BACK, placement: "back" },
    ],
    () => null,
    {},
  );
  assert.equal(frontFirst.variants[0].image, RAW_FRONT);
});

test("VERROU applied : forme {color, url} sans flag (legacy)", () => {
  const out = applyStorageToVariants(
    [{ color: "#1a1a1a", image: BLANK, sizes: { S: { catalog_variant_id: 1 } } }],
    [{ variant_ids: [1], mockup_url: RAW_FRONT }],
    () => null,
    {},
  );
  assert.deepEqual(Object.keys(out.applied[0]).sort(), ["color", "url"]);
});

// ─── Verrou : finalize + import + worker (miroirs) ───────────────────────

test("VERROU finalize : applique appliedByColor + écrase image (legacy)", () => {
  const src = read("supabase/functions/sync-printful/index.ts");
  assert.ok(src.includes("appliedByColor.get(String(v.color ??"), "application");
  assert.ok(src.includes("displayImageUrl(raw)"), "affichage via display");
  assert.ok(
    src.includes("updatePayload.image = displayImageUrl(firstMockupUrl)"),
    "main écrasée (legacy, changer = décision)",
  );
});

test("VERROU import : main = color_images[0] puis thumbnail (legacy)", () => {
  const src = read("src/admin/PrintfulProductForm.tsx");
  assert.ok(
    src.includes("data.color_images?.[0] || data.thumbnail_url"),
    "ordre legacy",
  );
});

test("VERROU worker Studio : même finalizeMockupTask que sparkle", () => {
  const src = read("supabase/functions/sync-printful/index.ts");
  const calls = src.match(/finalizeMockupTask\(/g) || [];
  assert.ok(calls.length >= 2, "sparkle + worker partagent le finalize");
});

// ─── Garde-fou missing : helper réel ─────────────────────────────────────

test("isPlaceholderImage : toutes les formes du manquant", () => {
  assert.equal(isPlaceholderImage("/Instawear-missing-item.svg"), true);
  assert.equal(
    isPlaceholderImage("https://instawear.vercel.app/Instawear-missing-item.svg"),
    true,
  );
  assert.equal(
    isPlaceholderImage("/INSTAWEAR-MISSING-ITEM.SVG?v=2"),
    true,
  );
  assert.equal(isPlaceholderImage(STORED), false);
  assert.equal(isPlaceholderImage(BLANK), false);
  assert.equal(isPlaceholderImage(""), false);
  assert.equal(isPlaceholderImage(null), false);
  assert.equal(isPlaceholderImage(42), false);
});

// ─── Garde-fou missing : client filtré, admin intact (miroirs) ───────────

test("ProductPage : missing hors galerie client, cadre fallback gardé", () => {
  const src = read("src/pages/ProductPage.tsx");
  assert.ok(src.includes("!isPlaceholderImage(u)"), "filtre galerie");
  assert.ok(
    src.includes("isPlaceholderImage(displayImage)"),
    "strip vide si tout manque",
  );
  assert.ok(
    src.includes("isLightboxOpen && gallery.length > 0"),
    "lightbox gardée",
  );
  assert.ok(src.includes("PLACEHOLDER_IMG;"), "fallback cadre unique");
});

test("Admin intact : voit le brut (pas de filtre missing)", () => {
  const products = read("src/admin/ProductsPage.tsx");
  assert.ok(
    products.includes("src={p.image || PLACEHOLDER_IMG}"),
    "vignette admin brute",
  );
  const quick = read("src/admin/ProductQuickViewModal.tsx");
  assert.ok(
    !quick.includes("isPlaceholderImage"),
    "quickview admin sans filtre",
  );
});
