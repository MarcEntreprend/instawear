// tests/product-images.test.ts
// Durabilité mockups générés en resync (_shared/productImages.ts) :
// un visuel storage ne doit jamais être écrasé par une valeur matrice.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isStorageMockupUrl,
  oldImagesByColor,
  substituteVariantImages,
  substituteAlignedImages,
  mergeGalleries,
  preferStoredMain,
} from "../supabase/functions/sync-printful/_shared/productImages.ts";

const ST = (hex: string) =>
  `https://x.supabase.co/storage/v1/object/public/product-mockups/p/${hex}.jpg`;
const PREV = "https://ik/x/tr:q-80/https://files.cdn.printful.com/preview.png";
const BLANK = "https://ik/x/tr:q-80/https://files.cdn.printful.com/products/1/1.jpg";

test("isStorageMockupUrl: que le bucket dédié", () => {
  assert.equal(isStorageMockupUrl(ST("aa")), true);
  assert.equal(isStorageMockupUrl(PREV), false);
  assert.equal(isStorageMockupUrl(BLANK), false);
  assert.equal(isStorageMockupUrl(""), false);
  assert.equal(isStorageMockupUrl(null), false);
  assert.equal(isStorageMockupUrl(42), false);
});

test("oldImagesByColor: indexe hex + nom, ignore le reste", () => {
  const m = oldImagesByColor([
    { color: "#AAAAAA", color_name: "Grey", image: ST("aa") },
    { color: "#BBBBBB", image: PREV },
    null,
    "x",
    { color: "#AAAAAA", image: ST("aa2") },
  ]);
  assert.equal(m.get("#aaaaaa"), ST("aa"));
  assert.equal(m.get("grey"), ST("aa"));
  assert.equal(m.has("#bbbbbb"), false);
  assert.equal(oldImagesByColor(null).size, 0);
  assert.equal(oldImagesByColor("x").size, 0);
});

test("substituteVariantImages: upgrade ciblé, sans toucher au reste", () => {
  const old = oldImagesByColor([{ color: "#AAAAAA", image: ST("aa") }]);
  const out = substituteVariantImages(
    [
      { color: "#AAAAAA", color_name: "Grey", image: PREV, sizes: { S: 1 } },
      { color: "#BBBBBB", image: BLANK },
      { color: "#CCCCCC", image: ST("cc") },
    ],
    old,
  ) as any[];
  assert.equal(out[0].image, ST("aa"));
  assert.deepEqual(out[0].sizes, { S: 1 });
  assert.equal(out[1].image, BLANK);
  assert.equal(out[2].image, ST("cc"));
  assert.deepEqual(substituteVariantImages(null, old), []);
  assert.deepEqual(substituteVariantImages("x", old), []);
});

test("substituteAlignedImages: alignement par colors[]", () => {
  const old = oldImagesByColor([{ color: "#AAAAAA", image: ST("aa") }]);
  const out = substituteAlignedImages(
    [PREV, BLANK],
    ["#AAAAAA", "#BBBBBB"],
    old,
  );
  assert.deepEqual(out, [ST("aa"), BLANK]);
  assert.deepEqual(substituteAlignedImages(null, [], old), []);
});

test("mergeGalleries: union frais + storage, cap, jamais vide", () => {
  assert.deepEqual(mergeGalleries([BLANK], [ST("aa"), PREV, ST("aa")], 12), [
    BLANK,
    ST("aa"),
  ]);
  assert.deepEqual(mergeGalleries([BLANK], [ST("aa")], 1), [BLANK]);
  assert.equal(mergeGalleries([], [ST("aa")], 12), null);
  assert.equal(mergeGalleries(null, [ST("aa")], 12), null);
  assert.deepEqual(mergeGalleries([BLANK], null, 12), [BLANK]);
});

test("preferStoredMain: storage gagne, sinon null", () => {
  assert.equal(preferStoredMain(ST("a"), PREV), ST("a"));
  assert.equal(preferStoredMain(PREV, ST("a")), ST("a"));
  assert.equal(preferStoredMain(PREV, BLANK), null);
  assert.equal(preferStoredMain("", ST("a")), null);
  assert.equal(preferStoredMain(null, null), null);
});
