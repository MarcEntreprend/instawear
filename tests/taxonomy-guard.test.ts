// tests/taxonomy-guard.test.ts — anti-dérive taxonomie (vague discovers).
// 1) Les valeurs front (categories.ts) existent dans le seed versionné.
// 2) Plus aucune valeur en dur côté sync/import (culture/tshirt/street).
// 3) Le classifieur edge se comporte (défauts honnêtes).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EVENT_TYPES,
  PRODUCT_CATEGORIES,
} from "../src/data/categories.ts";
import {
  classifyByKeywords,
  classifyProduct,
} from "../supabase/functions/sync-printful/_shared/classify.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

/** Paires (type|value) seedées par la migration (source versionnée). */
function seededPairs(): Set<string> {
  const sql = read("supabase/migrations/20261032_taxonomy_seed.sql");
  const out = new Set<string>();
  const re =
    /where not exists \(select 1 from reference_lists where type = '([a-z_]+)' and value = '([^']+)'\);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) out.add(`${m[1]}|${m[2]}`);
  return out;
}

test("garde : valeurs front ⊆ seed versionné", () => {
  const seed = seededPairs();
  assert.ok(seed.size > 30, "seed non vide");
  for (const e of EVENT_TYPES) {
    assert.ok(
      seed.has(`event_type|${e.value}`),
      `event front inconnu du seed : ${e.value}`,
    );
  }
  for (const c of PRODUCT_CATEGORIES) {
    assert.ok(
      seed.has(`category|${c.value}`),
      `categorie front inconnue du seed : ${c.value}`,
    );
  }
});

test("garde : plus de défauts en dur (culture fantôme)", () => {
  const syncIndex = read("supabase/functions/sync-printful/index.ts");
  assert.ok(!syncIndex.includes('category: "tshirt"'), "défaut tshirt en dur");
  assert.ok(
    !syncIndex.includes('event_type: "culture"'),
    "fantôme culture en dur",
  );
  assert.ok(
    !syncIndex.includes('"culture"'),
    "aucune mention culture persistante",
  );
  const form = read("src/admin/PrintfulProductForm.tsx");
  assert.ok(
    !form.includes('useState<string>("culture")'),
    "défaut culture dans le form",
  );
});

test("classify : mots-clés puis replis honnêtes", () => {
  const refs = {
    category: [{ value: "tshirt", keywords: ["t-shirt", "tee"] }],
    event_type: [{ value: "halloween", keywords: ["halloween", "spooky"] }],
    style: [{ value: "retro", keywords: ["retro", "vintage"] }],
  };
  assert.equal(
    classifyProduct(
      { name: "Bella Canvas 3001 Halloween Tee" },
      refs,
    ).category,
    "tshirt",
  );
  assert.equal(
    classifyProduct({ name: "Bella Canvas 3001 Halloween Tee" }, refs)
      .event_type,
    "halloween",
  );
  // Sans match : other / casual / "" (jamais de fantôme).
  assert.deepEqual(classifyProduct({ name: "Mystery Box" }, refs), {
    category: "other",
    event_type: "casual",
    style: "",
  });
  assert.equal(classifyByKeywords(null, refs.category), "");
});
