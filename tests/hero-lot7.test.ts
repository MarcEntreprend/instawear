// tests/hero-lot7.test.ts — gardes statiques de la migration 20261040
// (renommée depuis 20261037 : numéro réservé au rollback, voir CHECKPOINT).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(
  join(root, "supabase/migrations/20261040_hero_templates_flush.sql"),
  "utf8",
);

test("lot 7 : modèles réservés aux admins, jamais de lecture anonyme", () => {
  assert.ok(sql.includes("ENABLE ROW LEVEL SECURITY"));
  assert.ok(sql.includes("REVOKE ALL ON public.hero_templates FROM anon"));
  for (const op of ["SELECT", "INSERT", "DELETE"]) {
    assert.ok(sql.includes(`FOR ${op} TO authenticated`), op);
  }
  assert.ok(!/USING\s*\(\s*true\s*\)/i.test(sql));
  assert.ok(!/TO\s+anon/i.test(sql.replace(/REVOKE[^;]*;/g, "")));
});

test("lot 7 : le flush exige is_admin() et reste débouncé côté serveur", () => {
  assert.ok(sql.includes("IF NOT public.is_admin()"));
  assert.ok(sql.includes("hero_flush_deploy_hook(false)")); // jamais p_force depuis ce chemin
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.hero_flush_if_changed() FROM PUBLIC, anon",
    ),
  );
});
