// tests/security-s2-storage.test.ts
// S2 (audit) : bucket product-images verrouillé par migration — admin ALL,
// clients cantonnés à tickets/, lecture publique conservée. Verrous
// statiques sur la migration (le reste se joue côté dashboard/SQL).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const MIG = "supabase/migrations/20260913000004_storage_product_images.sql";

test("S2 : anciennes policies larges droppées", () => {
  const sql = readFileSync(join(root, MIG), "utf-8");
  for (const name of [
    "Admins can delete",
    "Authenticated users can upload",
    "Public read access",
  ]) {
    assert.ok(sql.includes(`DROP POLICY IF EXISTS "${name}"`), name);
  }
});

test("S2 : admin ALL via is_admin(), clients cantonnés à tickets/", () => {
  const sql = readFileSync(join(root, MIG), "utf-8");
  assert.ok(sql.includes("product-images admin all"));
  assert.ok(sql.includes("is_admin()"));
  assert.ok(sql.includes(`(storage.foldername(name))[1] = 'tickets'`));
  assert.ok(sql.includes("FOR SELECT TO anon, authenticated"));
});

test("S2 : aucun UPDATE (personne n'en fait, upsert:false front)", () => {
  const sql = readFileSync(join(root, MIG), "utf-8");
  assert.ok(!sql.includes("FOR UPDATE"));
});

test("S2 : appelants front compatibles (admin→products, clients→tickets)", () => {
  const api = readFileSync(
    join(root, "src/api/storageApi.ts"),
    "utf-8",
  );
  assert.ok(api.includes("tickets/"), "pièces support sous tickets/");
  assert.ok(!api.includes("upsert: true"), "aucun écrasement");
});
