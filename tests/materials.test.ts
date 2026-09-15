// tests/materials.test.ts
// Classification matière Printful -> slug (sync-printful/_shared/materials.ts).
// Forme live vérifiée (GET /products/1577) : name string minuscule,
// percentage number, blends réels.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyMaterialName,
  aggregateProductMaterials,
  normalizeLegacyMaterial,
} from "../supabase/functions/sync-printful/_shared/materials.ts";

test("classify: fibres simples", () => {
  assert.equal(classifyMaterialName("cotton").slug, "cotton");
  assert.equal(classifyMaterialName("Cotton").slug, "cotton");
  assert.equal(classifyMaterialName("polyester").slug, "polyester");
  assert.equal(classifyMaterialName("ceramic").slug, "ceramic");
});

test("classify: qualifiers (priorité organic > recycled > combed)", () => {
  const live = classifyMaterialName("Organic Ring Spun Combed");
  assert.equal(live.slug, "cotton-organic");
  assert.equal(live.label, "Organic Cotton");
  assert.equal(live.known, true);
  assert.equal(classifyMaterialName("Recycled Polyester").slug, "polyester-recycled");
  assert.equal(classifyMaterialName("Combed Cotton").slug, "cotton-combed");
});

test("classify: coton implicite peigné/ring-spun sans fibre", () => {
  assert.equal(classifyMaterialName("Ring Spun").slug, "cotton-combed");
  assert.equal(classifyMaterialName("Combed").slug, "cotton-combed");
});

test("classify: inconnu -> slug lisible + known=false (fail-open)", () => {
  const c = classifyMaterialName("Tencel Lyocell");
  assert.equal(c.known, false);
  assert.ok(c.slug.length > 0 && c.slug.length <= 40);
  assert.equal(classifyMaterialName("").slug, "other");
  assert.equal(classifyMaterialName(null).slug, "other");
  assert.equal(classifyMaterialName(42).slug, "other");
});

test("aggregate: blend live 80/20 -> dominant + tri", () => {
  const agg = aggregateProductMaterials([
    { name: "Organic Ring Spun Combed", percentage: 80.0 },
    { name: "Recycled Polyester", percentage: 20.0 },
  ]);
  assert.equal(agg.top, "cotton-organic");
  assert.equal(agg.breakdown.length, 2);
  assert.equal(agg.breakdown[0].percentage, 80);
  assert.deepEqual(agg.unmapped, []);
});

test("aggregate: formes hostiles (API10) -> jamais de crash", () => {
  assert.deepEqual(aggregateProductMaterials(null), { top: null, breakdown: [], unmapped: [] });
  assert.deepEqual(aggregateProductMaterials("x"), { top: null, breakdown: [], unmapped: [] });
  assert.deepEqual(aggregateProductMaterials([]), { top: null, breakdown: [], unmapped: [] });
  const agg = aggregateProductMaterials([
    null,
    42,
    { name: null, percentage: "NaN" },
    { percentage: -5 },
    { name: "cotton", percentage: "100" },
  ]);
  assert.equal(agg.top, "cotton");
  assert.equal(agg.unmapped.length, 0);
});

test("aggregate: doublons et divergences inter-variants", () => {
  const agg = aggregateProductMaterials([
    { name: "cotton", percentage: 100 },
    { name: "Cotton", percentage: 100 },
    { name: "polyester", percentage: 100 },
  ]);
  assert.equal(agg.top, "cotton");
  assert.equal(agg.breakdown.length, 2);
});

test("normalizeLegacyMaterial: anciens libellés FR", () => {
  assert.equal(normalizeLegacyMaterial("Coton bio"), "cotton-organic");
  assert.equal(normalizeLegacyMaterial("coton peigné"), "cotton-combed");
  assert.equal(normalizeLegacyMaterial("Polyester recyclé"), "polyester-recycled");
  assert.equal(normalizeLegacyMaterial("Molleton bio"), "fleece-organic");
  assert.equal(normalizeLegacyMaterial("Céramique"), "ceramic");
  assert.equal(normalizeLegacyMaterial("cotton-organic"), null);
  assert.equal(normalizeLegacyMaterial(""), null);
  assert.equal(normalizeLegacyMaterial(null), null);
});
