// tests/reference-match.test.ts — appariement par mots-clés + tri ref.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  detectReference,
  refLabel,
  orderRefValues,
} from "../src/utils/referenceMatch.ts";

const CATS = [
  { value: "tshirt", label: "T-Shirt", keywords: ["t-shirt", "tee"], sortOrder: 0 },
  { value: "hoodie", label: "Hoodie", keywords: ["hoodie", "sweat"], sortOrder: 1 },
  { value: "mug", label: "Mug", keywords: ["mug", "tasse"], sortOrder: 2 },
];

test("detectReference : premier match, insensible casse, vide sinon", () => {
  assert.equal(
    detectReference("Bella + Canvas 3001 Unisex Jersey T-Shirt", CATS),
    "tshirt",
  );
  assert.equal(detectReference("Classic HOODIE", CATS), "hoodie");
  assert.equal(detectReference("Ceramic Mug 11oz", CATS), "mug");
  assert.equal(detectReference("Mystery Box", CATS), "");
  assert.equal(detectReference("", CATS), "");
  assert.equal(detectReference(null, CATS), "");
  assert.equal(detectReference("Tee", null), "");
});

test("refLabel : label ref, repli slug prettifié", () => {
  assert.equal(refLabel(CATS, "tshirt"), "T-Shirt");
  assert.equal(refLabel(CATS, "unknown-thing"), "Unknown Thing");
  assert.equal(refLabel([], ""), "Other");
});

test("orderRefValues : sort_order ref puis popularité", () => {
  const counts = new Map([
    ["mug", 9],
    ["tshirt", 2],
  ]);
  assert.deepEqual(orderRefValues(CATS, counts), ["tshirt", "mug"]);
  assert.deepEqual(orderRefValues(CATS, new Map()), []);
});
