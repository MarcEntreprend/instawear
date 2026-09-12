// tests/color-facets.test.ts
// Facettes couleur du catalogue : normalisation + agrégation depuis les produits.
import { test } from "node:test";
import assert from "node:assert/strict";
import { normHex, hexToRgb, variantImageForColor } from "../src/utils/colors.ts";
import { buildColorFacets } from "../src/components/CatalogSection.tsx";

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

test("hexToRgb: conversion + invalides", () => {
  assert.equal(hexToRgb("#f5f0e8"), "rgb(245, 240, 232)");
  assert.equal(hexToRgb("#000"), "rgb(0, 0, 0)");
  assert.equal(hexToRgb("#FFF"), "rgb(255, 255, 255)");
  assert.equal(hexToRgb("red"), "");
  assert.equal(hexToRgb(""), "");
});

test("variantImageForColor: hex, nom, fallbacks, null", () => {
  const variants = [
    { color: "#F5F0E8", color_name: "Vintage White", image: "vw.jpg" },
    { color: "#1a1a1a", color_name: "Black", image: "" },
  ];
  const colors = ["#f5f0e8", "#1a1a1a"];
  const names = ["Vintage White", "Black"];
  assert.equal(variantImageForColor(variants, colors, names, "#f5f0e8"), "vw.jpg");
  assert.equal(variantImageForColor(variants, colors, names, "#F5F0E8"), "vw.jpg");
  // Sans image variante → null (la carte garde le défaut)
  assert.equal(variantImageForColor(variants, colors, names, "#1a1a1a"), null);
  assert.equal(variantImageForColor(variants, colors, names, "#ff0000"), null);
  assert.equal(variantImageForColor(variants, colors, names, null), null);
  assert.equal(variantImageForColor([], colors, names, "#f5f0e8"), null);
  assert.equal(variantImageForColor(undefined, colors, names, "#f5f0e8"), null);
});
