// tests/storefront.test.ts
// Devise settings + tailles + size guide côté boutique :
// - formatAmount : aucune conversion, symbole du store
// - pickAvailableVariant : null si rien d'achetable (carte non achetable)
// - convertMeasure : vraie conversion cm/in du guide
// - DEFAULT_SIZE_GUIDE : forme Printful valide

import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAmount } from "../src/data/currency.ts";
import { pickAvailableVariant } from "../src/hooks/useProductAvailability.ts";
import { convertMeasure } from "../src/components/product/SizeGuideModal.tsx";
import { DEFAULT_SIZE_GUIDE } from "../src/data/defaultSizeGuide.ts";

// ─── formatAmount (settings, pas de conversion) ─────────────────────────────

test("formatAmount : 2 décimales + symbole, sans conversion", () => {
  assert.equal(formatAmount(29.99, "$"), "29.99 $");
  assert.equal(formatAmount(35, "€"), "35.00 €");
  assert.equal(formatAmount(12.5, "R$"), "12.50 R$");
});

test("formatAmount : NaN → 0.00", () => {
  assert.equal(formatAmount(NaN, "$"), "0.00 $");
  assert.equal(formatAmount(Number("abc"), "$"), "0.00 $");
});

// ─── pickAvailableVariant : null = carte non achetable ──────────────────────

test("toutes tailles discontinued → null (non achetable)", () => {
  const p = {
    isActive: true,
    inStock: true,
    variants: [
      { color: "#000", sizes: { S: { price: 10, stock_status: "discontinued" } } },
      { color: "#fff", sizes: { M: { price: 10, stock_status: "out_of_stock" } } },
    ],
  };
  assert.equal(pickAvailableVariant(p as any), null);
});

test("une taille dispo → retournée (achetable)", () => {
  const p = {
    isActive: true,
    inStock: true,
    variants: [
      { color: "#000", sizes: { S: { price: 10, stock_status: "discontinued" } } },
      { color: "#fff", sizes: { M: { price: 10, stock_status: "available" } } },
    ],
  };
  assert.deepEqual(pickAvailableVariant(p as any), { color: "#fff", size: "M" });
});

test("produit inactif → null", () => {
  assert.equal(
    pickAvailableVariant({ isActive: false, variants: [] } as any),
    null,
  );
});

test("sans variantes mais en stock → première taille (produits manuels)", () => {
  const p = { isActive: true, inStock: true, colors: ["Red"], sizes: ["One Size"] };
  assert.deepEqual(pickAvailableVariant(p as any), { color: "Red", size: "One Size" });
});

// ─── convertMeasure ─────────────────────────────────────────────────────────

test("inches → cm (×2.54, 1 décimale)", () => {
  assert.equal(convertMeasure("20", "inches", "cm"), "50.8");
  assert.equal(convertMeasure("18", "inches", "cm"), "45.7");
});

test("cm → inches", () => {
  assert.equal(convertMeasure("50.8", "cm", "in"), "20");
});

test("même unité → inchangé", () => {
  assert.equal(convertMeasure("20", "inches", "in"), "20");
  assert.equal(convertMeasure("50.8", "cm", "cm"), "50.8");
});

test("non numérique/vide → tel quel ou —", () => {
  assert.equal(convertMeasure("abc", "inches", "cm"), "abc");
  assert.equal(convertMeasure(undefined, "inches", "cm"), "—");
  assert.equal(convertMeasure("", "inches", "cm"), "—");
});

// ─── DEFAULT_SIZE_GUIDE ─────────────────────────────────────────────────────

test("guide défaut : forme Printful (size_tables + available_sizes)", () => {
  assert.ok(Array.isArray(DEFAULT_SIZE_GUIDE.size_tables));
  assert.ok(DEFAULT_SIZE_GUIDE.size_tables.length > 0);
  const t = DEFAULT_SIZE_GUIDE.size_tables[0];
  assert.equal(t.unit, "inches");
  assert.ok(t.measurements.length >= 2);
  for (const s of ["S", "M", "L", "XL", "2XL", "3XL"]) {
    assert.ok(
      DEFAULT_SIZE_GUIDE.available_sizes.includes(s),
      `taille ${s} présente`,
    );
  }
  assert.equal(DEFAULT_SIZE_GUIDE.isDefault, true);
});
