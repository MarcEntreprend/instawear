// tests/invariant.test.ts
// P0 harnais: invariants variants/prix apres sync
// Reutilise assertVariantInvariant du projet
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertVariantInvariant,
} from "../src/utils/variantInvariantCheck.ts";
import type { Product } from "../src/types";

const baseProduct: Product = {
  id: "test-1",
  isActive: true,
  title: "T-Shirt Test",
  brand: "INSTAWEAR",
  description: "",
  price: 19.99,
  image: "",
  gallery: [],
  colors: ["#000000", "#ffffff"],
  colorNames: ["Noir", "Blanc"],
  sizes: ["S", "M", "L"],
  tags: [],
  eventType: "culture",
  category: "tshirt",
  style: "street",
  ratings: { score: 0, count: 0 },
  boughtLastMonth: 0,
  inStock: true,
  variants: [
    { color: "#000000", color_name: "Noir", image: "", sizes: { S: { price: 19.99 }, M: { price: 19.99 }, L: { price: 21.99 } } },
    { color: "#ffffff", color_name: "Blanc", image: "", sizes: { S: { price: 19.99 }, M: { price: 19.99 }, L: { price: 21.99 } } },
  ],
};

test("variants valides: ok", () => {
  const r = assertVariantInvariant(null, baseProduct);
  assert.equal(r.ok, true);
  assert.equal(r.errors.length, 0);
});

test("couleur sans price: warning (pas erreur)", () => {
  const broken: Product = {
    ...baseProduct,
    variants: [
      { color: "#000000", color_name: "Noir", image: "", sizes: { S: { price: 0 } } },
    ],
  };
  const r = assertVariantInvariant(null, broken);
  // POD: price<=0 = warning non bloquant
  assert.equal(r.ok, true);
  assert.ok(r.warnings.length > 0, "price 0 doit produire un warning");
});

test("price undefined (champs absent) = erreur", () => {
  const broken = {
    ...baseProduct,
    variants: [
      { color: "#000000", color_name: "Noir", image: "", sizes: { S: {} as any } },
    ],
  } as unknown as Product;
  const r = assertVariantInvariant(null, broken);
  assert.equal(r.ok, false, "price undefined doit etre erreur");
  assert.ok(r.errors.some((e) => e.includes("prix manquant")));
});

test("stock_status invalide: erreur", () => {
  const broken: Product = {
    ...baseProduct,
    variants: [
      { color: "#000000", color_name: "Noir", image: "", sizes: { S: { price: 19.99, stock_status: "weird" } } },
    ],
  };
  const r = assertVariantInvariant(null, broken);
  assert.equal(r.ok, false);
});

test("discontinued garde le prix (P0 retro-compat)", () => {
  const after: Product = {
    ...baseProduct,
    variants: [
      { color: "#000000", color_name: "Noir", image: "", sizes: { S: { price: 19.99, stock_status: "discontinued" } } },
    ],
  };
  const r = assertVariantInvariant(baseProduct, after);
  assert.equal(r.ok, true, "discontinued doit garder le prix");
});

test("prix change genere warning (pas erreur)", () => {
  const before = baseProduct;
  const after: Product = {
    ...baseProduct,
    price: 22.99,
    variants: [
      { color: "#000000", color_name: "Noir", image: "", sizes: { S: { price: 22.99 }, M: { price: 22.99 }, L: { price: 24.99 } } },
      { color: "#ffffff", color_name: "Blanc", image: "", sizes: { S: { price: 22.99 }, M: { price: 22.99 }, L: { price: 24.99 } } },
    ],
  };
  const r = assertVariantInvariant(before, after);
  assert.equal(r.ok, true);
  assert.ok(r.warnings.length > 0, "warning prix change");
});

test("tout discontinued + inStock=true = warning", () => {
  const after: Product = {
    ...baseProduct,
    variants: [
      { color: "#000000", color_name: "Noir", image: "", sizes: { S: { price: 19.99, stock_status: "discontinued" } } },
    ],
    inStock: true,
  };
  const r = assertVariantInvariant(null, after);
  assert.ok(r.warnings.some((w) => w.includes("inStock=true")));
});
