// tests/hero-rls-phase0.test.ts — garde Phase 0 Hero Studio : les brouillons
// (is_active=false, futur HTML non publié) ne sont jamais lisibles en anon.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(
  join(root, "supabase/migrations/20261033_hero_rls_phase0.sql"),
  "utf8",
);

test("phase0 : select public restreint aux publiés", () => {
  assert.ok(
    sql.includes("FOR SELECT TO anon, authenticated") &&
      sql.includes("USING (is_active = true)"),
    "anon = publiés seuls",
  );
  assert.ok(
    !sql.match(/FOR SELECT[^;]*USING\s*\(\s*true\s*\)/),
    "plus aucun USING (true) en lecture",
  );
});

test("phase0 : admin complet + écritures admin-only versionnées", () => {
  assert.ok(
    sql.includes("hero_promotions_select_admin") && sql.includes("is_admin()"),
    "admin lit tout",
  );
  for (const op of ["INSERT", "UPDATE", "DELETE"]) {
    assert.ok(
      sql.includes(`FOR ${op} TO authenticated`),
      `${op} versionné`,
    );
  }
});
