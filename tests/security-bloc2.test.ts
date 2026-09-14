// tests/security-bloc2.test.ts
// Bloc 2 (audit) : D1/H2/H3 (colonnes explicites), H1/H4 (policies),
// Z1 (zombie), freeze verify_jwt. Verrous statiques (repo + migrations).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf-8");

// ─── D1/H3 : plus de select=* sur customers / admin_users ───────────────────

test("D1 : customerApi.list() en colonnes explicites (pas de DOB/prefs)", () => {
  const api = read("src/api/supabaseApi.ts");
  assert.ok(!api.includes('from("customers").select("*")'));
  assert.ok(
    api.includes(
      '.from("customers")\n      .select("id, email, name, registration_date, last_login_date")',
    ) || api.includes('select("id, email, name, registration_date, last_login_date")'),
  );
});

test("H3 : adminUserApi.list() n'envoie jamais password_hash", () => {
  const api = read("src/api/supabaseApi.ts");
  assert.ok(!api.includes('from("admin_users").select("*")'));
  assert.ok(
    api.includes('select("id, email, role, created_at, last_login_date")'),
  );
});

// ─── H1/H4 : migration resserrée, compatible ────────────────────────────────

const MIG = "supabase/migrations/20260913000002_bloc2_policies.sql";

test("H1 : insert notifs restreint aux authentifiés (plus d'anon)", () => {
  const sql = read(MIG);
  assert.ok(sql.includes("DROP POLICY IF EXISTS notifications_insert_public"));
  assert.ok(sql.includes("notifications_insert_authenticated"));
  assert.ok(sql.includes("FOR INSERT TO authenticated"));
});

test("H4 : delete orders au propriétaire + admin (invité préservé)", () => {
  const sql = read(MIG);
  assert.ok(sql.includes("DROP POLICY IF EXISTS orders_delete_public"));
  assert.ok(sql.includes("orders_delete_owner"));
  assert.ok(sql.includes("client_id IS NULL"), "cleanup invité préservé");
  assert.ok(sql.includes("client_id = (auth.uid())::text"), "propriétaire");
  assert.ok(sql.includes("01:00:00"), "fenêtre pending conservée");
  assert.ok(sql.includes("is_admin()"), "admin conservé");
});

// ─── Z1 : zombie reset-password banni ───────────────────────────────────────

test("Z1 : ni dossier, ni openapi, ni référence reset-password", () => {
  assert.equal(
    existsSync(join(root, "supabase/functions/reset-password")),
    false,
  );
  const spec = JSON.parse(
    readFileSync(join(root, "supabase/functions/openapi.json"), "utf-8"),
  );
  assert.ok(!Object.keys(spec.paths).some((p) => p.includes("reset-password")));
  assert.ok(!Object.keys(spec.paths).some((p) => p.includes("admin-order-notify")));
});

test("Z1 : aucun appelant vers l'edge supprimée", () => {
  const markers = ["admin-order-notify", "reset-password"];
  for (const f of ["src/api/supabaseApi.ts"]) {
    const src = read(f);
    for (const m of markers) {
      assert.ok(
        !src.includes(`functions/v1/${m}`),
        `${f} appelle encore ${m}`,
      );
    }
  }
});

// ─── Freeze verify_jwt : config.toml couvre les 20 edges ────────────────────

test("config.toml fige verify_jwt pour chaque edge openapi", () => {
  const spec = JSON.parse(
    readFileSync(join(root, "supabase/functions/openapi.json"), "utf-8"),
  );
  const toml = read("supabase/config.toml");
  const edges = Object.keys(spec.paths).map((p) => p.replace(/^\//, ""));
  assert.equal(edges.length, 20);
  for (const e of edges) {
    assert.ok(
      toml.includes(`[functions.${e}]`),
      `config.toml sans [functions.${e}]`,
    );
  }
  assert.ok(toml.includes("[functions.interaction-notify]"));
});
