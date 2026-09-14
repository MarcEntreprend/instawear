// tests/security-warns.test.ts
// WARNs de l'audit final, verrouillés : colonne password_hash bannie,
// dompurify retiré (inutilisé), redirection Stripe à préfixe imposé.
// Statique (lecture du repo) — échoue dès réintroduction.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "node_modules" || e === "_shared") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e) && !e.endsWith(".test.ts")) {
      out.push(p);
    }
  }
  return out;
}

// ─── password_hash : banni du code applicatif ───────────────────────────────

test("aucune référence password_hash dans src (colonne droppée)", () => {
  const bad: string[] = [];
  for (const f of walk(join(root, "src"))) {
    const code = readFileSync(f, "utf-8")
      .split("\n")
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    if (/password_hash/i.test(code)) bad.push(f);
  }
  assert.deepEqual(bad, []);
});

test("migration DROP COLUMN présente et idempotente", () => {
  const sql = readFileSync(
    join(root, "supabase/migrations/20260914000001_drop_password_hash.sql"),
    "utf-8",
  );
  assert.ok(sql.includes("DROP COLUMN IF EXISTS password_hash"));
});

// ─── dompurify : dépendance morte retirée ───────────────────────────────────

test("dompurify absent de package.json (0 usage constaté)", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!("dompurify" in all));
  assert.ok(existsSync(join(root, "package-lock.json")), "lockfile présent");
});

// ─── Redirection Stripe : préfixe imposé ────────────────────────────────────

test("CheckoutFlow : toute redirection variable est gardée par préfixe", () => {
  const lines = readFileSync(
    join(root, "src/components/CheckoutFlow.tsx"),
    "utf-8",
  ).split("\n");
  const risky = lines.filter(
    (l) =>
      l.includes("window.location.href =") &&
      !l.includes('"/"') &&
      !l.includes("window.location.origin"),
  );
  // La seule redirection variable restante : l'URL Stripe, gardée juste avant.
  assert.deepEqual(
    risky.map((l) => l.trim()),
    ["window.location.href = url;"],
  );
  const idx = lines.findIndex((l) =>
    l.includes("window.location.href = url;"),
  );
  const guardZone = lines.slice(Math.max(0, idx - 8), idx).join("\n");
  assert.ok(
    guardZone.includes('startsWith("https://checkout.stripe.com/")'),
    "garde préfixe absente avant la redirection",
  );
});
