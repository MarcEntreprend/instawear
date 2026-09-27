// tests/gallery-dedupe.test.ts
// Galerie produit (décision) : les visuels AVEC design ne sont JAMAIS
// dédupliqués auto (doublons curatés affichés, retrait via kept) ; seuls
// les blanks (mockup_image) sont dédupliqués (anti-spam) ; placeholder jeté.
// Vrai code (src/utils/gallery.ts) + miroir d'usage (ProductPage).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { dedupeGallery } from "../src/utils/gallery.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

const PH = "placeholder.svg";
const GEN = "https://x/storage/gen-a.jpg";
const GEN2 = "https://x/storage/gen-b.jpg";
const BLANK = "https://files.cdn.printful.com/blank.jpg";

test("dedupeGallery : with-design gardés même en double, blanks dédupliqués", () => {
  const out = dedupeGallery(
    [GEN, BLANK, GEN, BLANK, GEN2, "", PH, null as any],
    new Set([BLANK]),
    PH,
  );
  assert.deepEqual(out, [GEN, BLANK, GEN, GEN2]);
});

test("dedupeGallery : entrées hostiles", () => {
  assert.deepEqual(dedupeGallery(null as any, new Set(), PH), []);
  assert.deepEqual(dedupeGallery([PH, "  ", 42 as any], new Set(), PH), []);
});

test("ProductPage : utilise dedupeGallery (fini indexOf global)", () => {
  const src = read("src/pages/ProductPage.tsx");
  assert.ok(src.includes("dedupeGallery("), "helper branché");
  assert.ok(!src.includes("arr.indexOf(u) === idx"), "plus de dédup globale");
});
