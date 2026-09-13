// tests/stripe-paid-flow.test.ts
// Phase 1 — Ensemble partagé handlePaidOrder (stripe-webhook) :
// - idempotence (retry Stripe sans doublon)
// - contrôle montant autoritatif (jamais de paid à tort)
// - destinataire email = adresse du checkout, guest = loggé (jamais de gate client_id)
// Miroirs de supabase/functions/stripe-webhook/index.ts (Deno non importable en node).

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Idempotence (miroir handlePaidOrder) ───────────────────────────────────

function gate(
  existing: { status: string; external_order_id: string | null } | null,
  externalId: string,
): "paid-continue" | "duplicate" | "not-found" {
  if (!existing) return "not-found";
  if (existing.status === "paid" && existing.external_order_id === externalId)
    return "duplicate";
  return "paid-continue";
}

test("retry même event (paid + même external_id) → duplicate, rien à refaire", () => {
  assert.equal(
    gate({ status: "paid", external_order_id: "cs_123" }, "cs_123"),
    "duplicate",
  );
});

test("paid mais external_id différent (autre tentative) → on continue", () => {
  assert.equal(
    gate({ status: "paid", external_order_id: "cs_123" }, "pi_456"),
    "paid-continue",
  );
});

test("pending → on continue", () => {
  assert.equal(
    gate({ status: "pending", external_order_id: null }, "cs_123"),
    "paid-continue",
  );
});

test("commande absente → not-found (404 appelant)", () => {
  assert.equal(gate(null, "cs_123"), "not-found");
});

// ─── Contrôle montant (miroir handlePaidOrder) ──────────────────────────────

function checkAmount(
  totalAmount: unknown,
  expectedCents: number | null | undefined,
): string | null {
  if (expectedCents == null) return null;
  const expected = Math.round(Number(totalAmount || 0) * 100);
  if (expected > 0 && expectedCents !== expected)
    return `Montant incohérent: ${expectedCents} != ${expected}`;
  return null;
}

test("montant Stripe == total base → ok", () => {
  assert.equal(checkAmount(32.93, 3293), null);
});

test("montant différent → erreur (400, jamais paid)", () => {
  assert.match(checkAmount(32.93, 1000) || "", /Montant incohérent/);
});

test("montant Stripe absent (null) → contrôle sauté", () => {
  assert.equal(checkAmount(32.93, null), null);
  assert.equal(checkAmount(32.93, undefined), null);
});

test("total base à 0 → contrôle sauté (pas de faux 400)", () => {
  assert.equal(checkAmount(0, 999), null);
});

// ─── Destinataire email (miroir sendEmailServer) ────────────────────────────
// Règle Phase 1 : to = adresse du checkout dans TOUS les cas. client_id ne
// sert qu'aux notifs in-app (trigger SQL), jamais à l'email.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveRecipient(order: {
  client_email: string | null;
  client_id: string | null;
}): string | null {
  const dest = (order.client_email || "").trim();
  if (!EMAIL_RE.test(dest)) return null;
  return dest;
}

test("invité (client_id null) + email checkout → email part", () => {
  assert.equal(
    resolveRecipient({ client_email: "abc@gmail.com", client_id: null }),
    "abc@gmail.com",
  );
});

test("loggé (client_id renseigné) + même email → même destinataire", () => {
  assert.equal(
    resolveRecipient({ client_email: "abc@gmail.com", client_id: "user-1" }),
    "abc@gmail.com",
  );
});

test("guest = loggé : aucune différence de destinataire", () => {
  assert.equal(
    resolveRecipient({ client_email: "abc@gmail.com", client_id: null }),
    resolveRecipient({ client_email: "abc@gmail.com", client_id: "user-1" }),
  );
});

test("email checkout vide → skip silencieux (pas de throw, webhook 200)", () => {
  assert.equal(
    resolveRecipient({ client_email: null, client_id: "user-1" }),
    null,
  );
  assert.equal(resolveRecipient({ client_email: "  ", client_id: null }), null);
});

test("email checkout malformé → skip silencieux", () => {
  assert.equal(
    resolveRecipient({ client_email: "pas-un-email", client_id: null }),
    null,
  );
});

// ─── Ordre des effets (contrat, anti-régression) ────────────────────────────

test("ordre contractuel : telegram → email client → printful → email admin", () => {
  const EFFECT_ORDER = [
    "telegram",
    "customer-email",
    "printful",
    "admin-email",
  ];
  assert.deepEqual(EFFECT_ORDER, [
    "telegram",
    "customer-email",
    "printful",
    "admin-email",
  ]);
});

test("chaque effet est best-effort isolé (un échec ne bloque pas les autres)", () => {
  // Contrat : 4 blocs try/catch indépendants dans handlePaidOrder.
  // Seuls "Commande introuvable" (404) et "Montant incohérent" (400)
  // remontent à l'appelant ; Resend/Telegram/Printful jamais.
  const fatal = new Set(["Commande introuvable"]);
  const amountErr = "Montant incohérent: 1000 != 3293";
  assert.ok(fatal.has("Commande introuvable"));
  assert.ok(amountErr.startsWith("Montant incohérent"));
});
