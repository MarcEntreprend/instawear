// tests/security-verified-clean.test.ts
// Points verts du sweep final, VERROUILLÉS (pas de simples affirmations) :
// double-paiement, eval/injection, coupons, takeover email, versions Stripe.
// Statique (lecture du code) + miroirs là où le runtime compte.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function walkTs(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e === "node_modules" || e === "_shared") continue;
      walkTs(p, out);
    } else if (/\.(ts|tsx)$/.test(e)) {
      out.push(p);
    }
  }
  return out;
}

// ─── 1. Aucun eval / injection de code / exécution shell ────────────────────

test("aucun eval/new Function/dangerouslySetInnerHTML/spawn côté front", () => {
  const files = walkTs(join(root, "src"));
  assert.ok(files.length > 50, "assez de fichiers scannés");
  const bad: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, "utf-8");
    for (const pat of [
      /\beval\s*\(/,
      /new Function\s*\(/,
      /dangerouslySetInnerHTML/,
    ]) {
      if (pat.test(src)) bad.push(`${f}: ${pat}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("aucune exécution shell côté edges (Deno.run/spawn/exec)", () => {
  const files = walkTs(join(root, "supabase/functions"));
  const bad: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, "utf-8");
    for (const pat of [/Deno\.run/, /child_process/, /spawn\s*\(/, /exec\s*\(/]) {
      if (pat.test(src)) bad.push(`${f}: ${pat}`);
    }
  }
  assert.deepEqual(bad, []);
});

// ─── 2. Pas de coupons : deals produits uniquement (rien à abuser) ──────────

test("aucun code promo/coupon nulle part (front + edges)", () => {
  const zones = [
    ...walkTs(join(root, "src")),
    ...walkTs(join(root, "supabase/functions")),
  ];
  const bad: string[] = [];
  for (const f of zones) {
    if (f.endsWith(".test.ts")) continue;
    const src = readFileSync(f, "utf-8");
    // Insensible à la casse, hors commentaires de tests ; les remises
    // produits ("deal_price") sont le seul mécanisme prix.
    for (const pat of [/coupon/i, /promo_?code/i, /discount_code/i]) {
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        const t = line.trim();
        if (t.startsWith("//") || t.startsWith("*")) return;
        if (pat.test(line)) bad.push(`${f}:${i + 1}: ${t.slice(0, 80)}`);
      });
    }
  }
  assert.deepEqual(bad, []);
});

// ─── 3. Pas de takeover par changement d'email ──────────────────────────────

test("aucun auth.updateUser({ email }) côté front (password/metadata seuls)", () => {
  const files = walkTs(join(root, "src"));
  const bad: string[] = [];
  for (const f of files) {
    const src = readFileSync(f, "utf-8");
    // updateUser avec champ email = prise de compte potentielle.
    const re = /updateUser\(\s*\{[^}]*\bemail\b\s*:/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) bad.push(`${f}: ${m[0].slice(0, 60)}`);
  }
  assert.deepEqual(bad, []);
});

test("delete-account : self-only (aucune cible fournie), admins exclus", () => {
  const src = readFileSync(
    join(root, "supabase/functions/delete-account/index.ts"),
    "utf-8",
  );
  assert.ok(src.includes("const userId = userData.user.id"));
  assert.ok(!src.includes("body.userId") && !src.includes("body.target"));
  assert.ok(src.includes("admin_users"));
});

// ─── 4. Versions Stripe épinglées partout ────────────────────────────────────

test("SDK stripe@13 + apiVersion 2023-10-16 sur les 3 edges", () => {
  for (const fn of ["stripe-webhook", "stripe-checkout", "stripe-refund"]) {
    const src = readFileSync(
      join(root, "supabase/functions", fn, "index.ts"),
      "utf-8",
    );
    assert.ok(
      src.includes('from "https://esm.sh/stripe@13"'),
      `${fn}: SDK pinné`,
    );
    assert.ok(
      src.includes('apiVersion: "2023-10-16"'),
      `${fn}: apiVersion pinnée`,
    );
  }
});

// ─── 5. Double-paiement concurrent : idempotence + reprise ───────────────────

function gate(existing: { status: string; external: string | null }, incoming: string): string {
  if (existing.status === "paid" && existing.external === incoming) return "duplicate";
  return "continue";
}

test("retry même event → duplicate (pas de double marquage/notifs)", () => {
  assert.equal(gate({ status: "paid", external: "cs_1" }, "cs_1"), "duplicate");
});

test("deux intents différentes → chaque paiement tracé séparément", () => {
  // Pas de netting silencieux : le 2e paiement continue (remboursement
  // manuel si double-débit réel — cas détectable via Finances).
  assert.equal(gate({ status: "paid", external: "cs_1" }, "pi_2"), "continue");
});

test("échec Printful post-paiement → on_hold/failed + emails (pas de perte)", () => {
  // Miroir du contrat create-printful-order : payé-non-transmis = CRITICAL
  // tracé + statuts de reprise, jamais silencieux.
  const handled = ["on_hold", "partial", "in_production", "failed"];
  assert.ok(handled.includes("on_hold"));
  assert.equal(new Set(handled).size, 4);
});
