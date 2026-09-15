// tests/catalog.test.ts
// Garde de forme réponse catalogue (sync-printful/_shared/catalog.ts) :
// result.product ne contient JAMAIS variants (vérifié live) — le niveau
// result.variants est la source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCatalogVariants } from "../supabase/functions/sync-printful/_shared/catalog.ts";

const V = [{ id: 1 }, { id: 2 }];

test("extract: préfère result.variants (forme live)", () => {
  const data = { result: { product: { id: 1577, name: "Hoodie" }, variants: V } };
  assert.deepEqual(extractCatalogVariants(data), V);
});

test("extract: accepte variants sous product si présents", () => {
  const data = { result: { product: { variants: V } } };
  assert.deepEqual(extractCatalogVariants(data), V);
});

test("extract: formes hostiles -> [] (jamais de crash)", () => {
  assert.deepEqual(extractCatalogVariants(null), []);
  assert.deepEqual(extractCatalogVariants(undefined), []);
  assert.deepEqual(extractCatalogVariants("x"), []);
  assert.deepEqual(extractCatalogVariants({}), []);
  assert.deepEqual(extractCatalogVariants({ result: null }), []);
  assert.deepEqual(extractCatalogVariants({ result: { product: { id: 1 } } }), []);
  assert.deepEqual(extractCatalogVariants({ result: { variants: "nope" } }), []);
});
