// tests/color-facets.test.ts
// Facettes couleur du catalogue : normalisation + agrégation depuis les produits.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normHex,
  buildColorFacets,
} from "../src/components/CatalogSection.tsx";

test("normHex: casse, #, raccourcis, invalides", () => {
  assert.equal(normHex("#F5F0E8"), "#f5f0e8");
  assert.equal(normHex("f5f0e8"), "#f5f0e8");
  assert.equal(normHex("#FFF"), "#ffffff");
  assert.equal(normHex("#fff"), "#ffffff");
  assert.equal(normHex("  #1a1a1a  "), "#1a1a1a");
  assert.equal(normHex("red"), "");
  assert.equal(normHex("#gggggg"), "");
  assert.equal(normHex(""), "");
  assert.equal(normHex(null), "");
  assert.equal(normHex(undefined), "");
});

test("buildColorFacets: agrège, déduplique (casse), noms alignés, tri popularité", () => {
  const out = buildColorFacets([
    { colors: ["#f5f0e8", "#1A1A1A"], colorNames: ["Vintage White", "Black"] },
    { colors: ["#F5F0E8", "red"], colorNames: ["Vintage White", "Rouge"] },
    { colors: [], colorNames: [] },
    {},
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].hex, "#f5f0e8");
  assert.equal(out[0].name, "Vintage White");
  assert.equal(out[0].count, 2);
  assert.equal(out[1].hex, "#1a1a1a");
  assert.equal(out[1].name, "Black");
  assert.equal(out[1].count, 1);
});

test("buildColorFacets: nom = hex si pas de nom, vide si rien", () => {
  const out = buildColorFacets([{ colors: ["#123456"] }]);
  assert.equal(out[0].name, "#123456");
  assert.deepEqual(buildColorFacets([]), []);
  assert.deepEqual(buildColorFacets([{ colors: ["x"] }]), []);
});
