// tests/color-families.test.ts — familles groupées (option A) + toggle.
// Groupement sur HEX réel (Printful color_code), jamais les noms.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyColorFamily,
  isColorFamilySlug,
  familyBySlug,
  parseColorParam,
  colorFilterMatches,
  resolveColorTarget,
  variantImageForColor,
  hexToHsl,
  compareColorHex,
  COLOR_FAMILIES,
} from "../src/utils/colors.ts";
import { buildColorFamilyFacets } from "../src/components/CatalogSection.tsx";

test("familles : 12 slugs stables façon stores", () => {
  assert.deepEqual(
    COLOR_FAMILIES.map((f) => f.slug),
    [
      "black",
      "white",
      "grey",
      "beige",
      "brown",
      "red",
      "orange",
      "yellow",
      "green",
      "blue",
      "purple",
      "pink",
    ],
  );
  assert.ok(isColorFamilySlug("grey"));
  assert.ok(!isColorFamilySlug("#808080"));
  assert.ok(!isColorFamilySlug("gris"));
  assert.equal(familyBySlug("blue")?.label, "Blue");
  assert.equal(familyBySlug("nope"), null);
});

test("classify : neutres (heather/stone sans le nom)", () => {
  assert.equal(classifyColorFamily("#000000"), "black");
  assert.equal(classifyColorFamily("#1a1a1a"), "black");
  assert.equal(classifyColorFamily("#ffffff"), "white");
  // Athletic Heather / Stone typiques : désaturés → grey, nom ignoré.
  assert.equal(classifyColorFamily("#9aa0a3"), "grey");
  assert.equal(classifyColorFamily("#8d867c"), "grey");
  assert.equal(classifyColorFamily("#b8b2a9"), "grey");
  assert.equal(classifyColorFamily("#d3d3d3"), "grey");
});

test("classify : roses jamais noyés dans red (famille séparée)", () => {
  // Roses (même désaturés/clairs, hue côté magenta) -> pink.
  assert.equal(classifyColorFamily("#d4a0a7"), "pink");
  assert.equal(classifyColorFamily("#e8b4b8"), "pink");
  assert.equal(classifyColorFamily("#ffb6c1"), "pink");
  assert.equal(classifyColorFamily("#e75480"), "pink");
  assert.equal(classifyColorFamily("#ff00ff"), "pink");
  // Rouges francs et profonds -> red (pas de fuite inverse).
  assert.equal(classifyColorFamily("#dc143c"), "red");
  assert.equal(classifyColorFamily("#c0392b"), "red");
  assert.equal(classifyColorFamily("#800020"), "red");
});

test("classify : saturés sombres (navy -> blue) + terre", () => {
  assert.equal(classifyColorFamily("#0a1931"), "blue");
  assert.equal(classifyColorFamily("#191970"), "blue");
  assert.equal(classifyColorFamily("#f5f0e8"), "beige");
  assert.equal(classifyColorFamily("#c19a6b"), "beige");
  assert.equal(classifyColorFamily("#6b4a2f"), "brown");
  assert.equal(classifyColorFamily("#3b2314"), "brown");
  assert.equal(classifyColorFamily("#c0392b"), "red");
  assert.equal(classifyColorFamily("#800020"), "red");
  assert.equal(classifyColorFamily("#e67e22"), "orange");
  assert.equal(classifyColorFamily("#d4a017"), "yellow");
  assert.equal(classifyColorFamily("#f1c40f"), "yellow");
  assert.equal(classifyColorFamily("#2e7d46"), "green");
  assert.equal(classifyColorFamily("#808000"), "green");
  assert.equal(classifyColorFamily("#ffff00"), "yellow");
  assert.equal(classifyColorFamily("#7d3c98"), "purple");
  assert.equal(classifyColorFamily("#e78fb3"), "pink");
  assert.equal(classifyColorFamily("#ff00ff"), "pink");
});

test("classify : invalides -> null (jamais de famille fantôme)", () => {
  assert.equal(classifyColorFamily(""), null);
  assert.equal(classifyColorFamily("red"), null);
  assert.equal(classifyColorFamily(null), null);
  assert.equal(classifyColorFamily(undefined), null);
});

test("parseColorParam : hex (retro-compat) ou slug, sinon null", () => {
  assert.equal(parseColorParam("918f8a"), "#918f8a");
  assert.equal(parseColorParam("#918F8A"), "#918f8a");
  assert.equal(parseColorParam("grey"), "grey");
  assert.equal(parseColorParam("Grey"), "grey");
  assert.equal(parseColorParam("gris"), null);
  assert.equal(parseColorParam("hello"), null);
  assert.equal(parseColorParam(""), null);
  assert.equal(parseColorParam(null), null);
});

test("colorFilterMatches : hex exact + famille + inconnu", () => {
  const colors = ["#9aa0a3", "#1a1a1a"];
  assert.equal(colorFilterMatches(colors, "#9AA0A3"), true);
  assert.equal(colorFilterMatches(colors, "#ffffff"), false);
  assert.equal(colorFilterMatches(colors, "grey"), true);
  assert.equal(colorFilterMatches(colors, "black"), true);
  assert.equal(colorFilterMatches(colors, "blue"), false);
  assert.equal(colorFilterMatches(colors, "nope"), false);
  assert.equal(colorFilterMatches([], "grey"), false);
  assert.equal(colorFilterMatches(colors, null), true);
});

test("resolveColorTarget : slug -> premier hex du produit dans la famille", () => {
  const colors = ["#1a1a1a", "#9aa0a3", "#8d867c"];
  assert.equal(resolveColorTarget(colors, "grey"), "#9aa0a3");
  assert.equal(resolveColorTarget(colors, "black"), "#1a1a1a");
  assert.equal(resolveColorTarget(colors, "blue"), "blue");
  assert.equal(resolveColorTarget(colors, "#9AA0A3"), "#9AA0A3");
  assert.equal(resolveColorTarget(colors, null), null);
  assert.equal(resolveColorTarget([], "grey"), "grey");
});

test("variantImageForColor : Groups montre le visuel (main en fallback)", () => {
  const variants = [
    { color: "#1a1a1a", color_name: "Black", image: "black.jpg" },
    { color: "#9aa0a3", color_name: "Athletic Heather", image: "heather.jpg" },
  ];
  const colors = ["#1a1a1a", "#9aa0a3"];
  const names = ["Black", "Athletic Heather"];
  // Famille -> même image que la nuance exacte.
  assert.equal(
    variantImageForColor(variants, colors, names, "grey"),
    "heather.jpg",
  );
  assert.equal(
    variantImageForColor(variants, colors, names, "#9aa0a3"),
    "heather.jpg",
  );
  // Famille absente du produit / variante sans image -> null (main fallback).
  assert.equal(variantImageForColor(variants, colors, names, "blue"), null);
  assert.equal(
    variantImageForColor(
      [{ color: "#1a1a1a", color_name: "Black", image: "" }],
      ["#1a1a1a"],
      ["Black"],
      "black",
    ),
    null,
  );
});
test("buildColorFamilyFacets : dedupe/produit, pastille canonique, ordre fixe", () => {
  const out = buildColorFamilyFacets([
    { colors: ["#9aa0a3", "#8d867c", "#1a1a1a"] },
    { colors: ["#9AA0A3"] },
    { colors: ["#c0392b"] },
    { colors: [] },
    {},
  ]);
  assert.equal(out.length, 3);
  // Ordre canonique fixe (Black, Grey, Red), PAS par popularité.
  assert.deepEqual(
    out.map((f) => f.value),
    ["black", "grey", "red"],
  );
  const grey = out.find((f) => f.value === "grey")!;
  assert.equal(grey.count, 2);
  assert.equal(grey.name, "Grey");
  // Pastille = swatch canonique saturé (jamais un pâle ambigu).
  assert.equal(grey.hex, familyBySlug("grey")!.swatch);
  assert.deepEqual(buildColorFamilyFacets([]), []);
});

test("compareColorHex : neutres (noir->blanc) puis arc-en-ciel", () => {
  const sorted = ["#c0392b", "#ffffff", "#2c5fa8", "#1a1a1a", "#f1c40f"].sort(
    compareColorHex,
  );
  assert.deepEqual(sorted, [
    "#1a1a1a",
    "#ffffff",
    "#c0392b",
    "#f1c40f",
    "#2c5fa8",
  ]);
});

test("pastilles familles : saturees, uniques, pas de pales ambigus", () => {
  const swatches = COLOR_FAMILIES.map((f) => f.swatch);
  assert.equal(new Set(swatches).size, swatches.length, "swatches uniques");
  for (const f of COLOR_FAMILIES) {
    const hsl = hexToHsl(f.swatch);
    assert.ok(hsl, `${f.slug} swatch valide`);
    if (f.slug === "black") assert.ok(hsl!.l < 0.2, "noir franc");
    else if (f.slug === "white") assert.ok(hsl!.l > 0.95, "blanc franc");
    // Gris : ton moyen (ni blanc cassé ni quasi-noir).
    else if (f.slug === "grey") assert.ok(hsl!.l > 0.3 && hsl!.l < 0.7);
    // Familles chromatiques : bien saturées (pas de pastel ambigu).
    else assert.ok(hsl!.s >= 0.45, `${f.slug} sature (${hsl!.s})`);
  }
});
