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

test("buildColorFamilyFacets : dedupe/produit, pastille repre, tri", () => {
  const out = buildColorFamilyFacets([
    { colors: ["#9aa0a3", "#8d867c", "#1a1a1a"] },
    { colors: ["#9AA0A3"] },
    { colors: ["#c0392b"] },
    { colors: [] },
    {},
  ]);
  assert.equal(out.length, 3);
  const grey = out.find((f) => f.value === "grey")!;
  assert.equal(grey.count, 2);
  assert.equal(grey.name, "Grey");
  // Pastille = hex membre le plus fréquent (#9aa0a3 ×2).
  assert.equal(grey.hex, "#9aa0a3");
  assert.equal(out[0].value, "grey");
  assert.deepEqual(buildColorFamilyFacets([]), []);
});
