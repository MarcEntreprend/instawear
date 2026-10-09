// tests/hero-lot5.test.ts — gardes statiques de la migration lot 5 (secret, droits, empreinte).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(
  join(root, "supabase/migrations/20261036_hero_sync.sql"),
  "utf8",
);

test("lot 5 : aucune URL de hook dans git, secret lu depuis Vault", () => {
  assert.ok(!sql.includes("api.vercel.com"));
  assert.ok(sql.includes("vault.decrypted_secrets"));
});

test("lot 5 : fonctions internes inaccessibles au public ; RPC admin vérifient is_admin()", () => {
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.hero_flush_deploy_hook(boolean) FROM PUBLIC, anon, authenticated",
    ),
  );
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.hero_public_fingerprint() FROM PUBLIC, anon, authenticated",
    ),
  );
  assert.equal((sql.match(/IF NOT public\.is_admin\(\)/g) || []).length, 2);
});

test("lot 5 : le snapshot public reste INVOKER (la RLS s'applique) et sans html/css", () => {
  const fn = sql.slice(
    sql.indexOf("get_hero_snapshot()"),
    sql.indexOf("hero_public_fingerprint()"),
  );
  assert.ok(!/SECURITY DEFINER/.test(fn));
  assert.ok(!/\bhtml\b|\bcss\b/.test(fn));
});

test("lot 5 : débounce + empreinte (pas de build si le public n'a rien vu changer)", () => {
  assert.ok(sql.includes("interval '10 minutes'"));
  assert.ok(sql.includes("IS NOT DISTINCT FROM fp"));
  assert.ok(sql.includes("h.is_active = true"));
});
