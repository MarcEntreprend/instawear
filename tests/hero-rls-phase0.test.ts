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

test("phase1 : hero_version lisible anon limitée à version + updated_at", () => {
  const sql1 = readFileSync(
    join(root, "supabase/migrations/20261034_hero_studio_phase1.sql"),
    "utf8",
  );
  assert.ok(
    sql1.includes("GRANT SELECT (version, updated_at) ON public.hero_version"),
    "anon ne voit que version + updated_at",
  );
  assert.ok(
    !sql1.match(/FOR SELECT[^;]*hero_version[^;]*USING\s*\(\s*true\s*\)/) ||
      sql1.includes("hero_version_select_public"),
    "pas de lecture large",
  );
  // Phase 1 ne rouvre jamais la lecture hero_promotions au-delà des publiés.
  assert.ok(
    !sql1.match(
      /CREATE POLICY "hero_promotions_select_public"[^;]*USING\s*\(\s*true\s*\)/,
    ),
    "pas de USING (true) sur hero_promotions",
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
