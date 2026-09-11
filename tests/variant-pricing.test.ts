// tests/variant-pricing.test.ts
// Chaîne de prix des variantes (doc API Printful : sync=retail_price,
// catalogue=price). Une taille sans prix est CONSERVÉE (prix null).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCatalogPriceIndex,
  syncCatalogId,
  resolveUnitPrice,
} from "../supabase/functions/sync-printful/_shared/variantPricing.ts";

const catalog = buildCatalogPriceIndex([
  { id: 49804, price: "16.27" },
  { id: 49805, price: 18.5 },
  { id: 999, price: "n/a" },
]);

test("retail_price sync prioritaire (string ou number)", () => {
  assert.equal(resolveUnitPrice({ retail_price: "25.95" }, catalog), 25.95);
  assert.equal(resolveUnitPrice({ retail_price: 10 }, catalog), 10);
});

test("fallback prix catalogue via variant_id / product.variant_id", () => {
  assert.equal(resolveUnitPrice({ variant_id: 49804, size: "S" }, catalog), 16.27);
  assert.equal(
    resolveUnitPrice({ product: { variant_id: 49805 } }, catalog),
    18.5,
  );
});

test("prix invalide partout → null (taille conservée, jamais jetée)", () => {
  assert.equal(resolveUnitPrice({ size: "M" }, catalog), null);
  assert.equal(resolveUnitPrice({ retail_price: "n/a", variant_id: 999 }, catalog), null);
  assert.equal(resolveUnitPrice({}, new Map()), null);
});

test("syncCatalogId: ids numériques, null sinon", () => {
  assert.equal(syncCatalogId({ variant_id: 12 }), 12);
  assert.equal(syncCatalogId({ variant_id: "34" }), 34);
  assert.equal(syncCatalogId({ product: { variant_id: 56 } }), 56);
  assert.equal(syncCatalogId({}), null);
  assert.equal(syncCatalogId({ variant_id: "abc" }), null);
});
