// tests/order-status-emails.test.ts
// Phase 2 — Moule unique des emails client (supabase/functions/_shared/
// orderStatusEmails.ts + copies printful-webhook / create-printful-order).
// Miroirs des fonctions pures (fichiers Deno non importables en node) +
// règles de câblage (quels events envoient quoi, anti-spam).

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Miroirs ────────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STEP_INDEX: Record<string, number> = {
  paid: 0,
  pending: 1,
  in_production: 2,
  partial: 2,
  shipped: 3,
  delivered: 4,
  on_hold: 2,
  refunded: -1,
  returned: -1,
  cancelled: -1,
};

const SUBJECTS: Record<string, (id: string) => string> = {
  in_production: (id) => `Your order ${id} is now in production!`,
  partial: (id) => `Your order ${id} is partially shipped!`,
  shipped: (id) => `Your order ${id} has shipped!`,
  delivered: (id) => `Your order ${id} has been delivered!`,
  failed: (id) => `Your order ${id} could not be processed`,
  cancelled: (id) => `Your order ${id} has been cancelled`,
  on_hold: (id) => `Your order ${id} is on hold`,
  approval: (id) => `Your order ${id} is being reviewed`,
  refunded: (id) => `Your order ${id} has been refunded`,
  returned: (id) => `Your order ${id} was returned`,
};

const CTA = (id: string) =>
  `https://instawear.vercel.app/?order=${encodeURIComponent(id)}`;

// ─── Échappement (XSS, doc 10-Security #7) ──────────────────────────────────

test("titres/noms/adresses/raisons échappés", () => {
  assert.equal(esc(`<script>alert(1)</script>`), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(esc(`A&B "C"`), "A&amp;B &quot;C&quot;");
  assert.equal(esc(null), "");
  assert.equal(esc(undefined), "");
});

test("titre produit injecté dans items → échappé", () => {
  const evil = `Dad hat <img src=x onerror=alert(1)>`;
  assert.ok(!esc(evil).includes("<img"));
  assert.ok(esc(evil).includes("&lt;img"));
});

// ─── Sujets : un par statut+cause, stables ──────────────────────────────────

test("chaque statut a son sujet (contrat anti-régression)", () => {
  const id = "ORD-2026-512042";
  for (const [k, fn] of Object.entries(SUBJECTS)) {
    assert.ok(fn(id).includes(id), k);
  }
  assert.equal(Object.keys(SUBJECTS).length, 10);
});

test("failed ≠ cancelled : wording distinct (technique vs volontaire)", () => {
  assert.match(SUBJECTS.failed("X"), /could not be processed/);
  assert.match(SUBJECTS.cancelled("X"), /has been cancelled/);
  assert.notEqual(SUBJECTS.failed("X"), SUBJECTS.cancelled("X"));
});

test("on_hold générique ≠ approval design", () => {
  assert.match(SUBJECTS.on_hold("X"), /on hold/);
  assert.match(SUBJECTS.approval("X"), /being reviewed/);
});

// ─── CTA unique ?order= ────────────────────────────────────────────────────

test("CTA pointe ?order= (smart compte/invité), jamais ?track=", () => {
  const url = CTA("ORD-2026-512042");
  assert.ok(url.includes("?order=ORD-2026-512042"));
  assert.ok(!url.includes("?track="));
});

// ─── Stepper cohérent front/back ────────────────────────────────────────────

test("STEP_INDEX aligné sur ORDER_STATUS front (partial/on_hold = 2)", () => {
  assert.equal(STEP_INDEX.partial, 2);
  assert.equal(STEP_INDEX.on_hold, 2);
  assert.equal(STEP_INDEX.in_production, 2);
  assert.equal(STEP_INDEX.shipped, 3);
  assert.equal(STEP_INDEX.delivered, 4);
  assert.equal(STEP_INDEX.refunded, -1);
  assert.equal(STEP_INDEX.returned, -1);
  assert.equal(STEP_INDEX.cancelled, -1);
});

// ─── Règles de câblage (anti-spam, anti-doublon) ────────────────────────────

const EMAIL_ON_EVENT: Record<string, string | null> = {
  package_shipped: "shipped|partial",
  order_failed: "failed",
  order_canceled: "cancelled",
  order_put_hold: "on_hold",
  order_put_hold_approval: "approval",
  order_remove_hold: "in_production",
  order_refunded: "refunded",
  package_returned: "returned",
  order_created: null,
  order_updated: null,
  product_synced: null,
  product_updated: null,
  product_deleted: null,
  stock_updated: null,
};

test("created/updated/produits/stock → jamais d'email client", () => {
  for (const t of [
    "order_created",
    "order_updated",
    "product_synced",
    "product_updated",
    "product_deleted",
    "stock_updated",
  ]) {
    assert.equal(EMAIL_ON_EVENT[t], null, t);
  }
});

test("chaque event commande a son email dédié (pas de doublon)", () => {
  const seen = new Set<string>();
  for (const [ev, mail] of Object.entries(EMAIL_ON_EVENT)) {
    if (!mail) continue;
    for (const m of mail.split("|")) {
      assert.ok(!seen.has(m), `doublon: ${m} (${ev})`);
      seen.add(m);
    }
  }
});

test("envoi seulement sur transition réelle (retry = silence)", () => {
  // Miroir de la garde newStatus : pas de transition → pas d'email.
  const shouldSend = (newStatus: string | null) => newStatus != null;
  assert.equal(shouldSend("refunded"), true);
  assert.equal(shouldSend(null), false);
});

test("destinataire = checkout dans tous les cas (guest = loggé)", () => {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const resolve = (checkout: unknown) =>
    typeof checkout === "string" && EMAIL_RE.test(checkout.trim())
      ? checkout.trim()
      : null;
  assert.equal(resolve("abc@gmail.com"), "abc@gmail.com");
  assert.equal(resolve(""), null);
  assert.equal(resolve(null), null);
});
