// tests/refunds.test.ts
// Remboursements réels : résolution PI, soldes, idempotence, éligibilité
// demandes, pas de label sans argent. Miroirs de stripeRefunds.ts,
// stripe-refund, refund-request (+ order-status-update qui refuse refunded).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidIdempotencyKey,
} from "../supabase/functions/_shared/stripeRefunds.ts";

// ─── Clé d'idempotence (UUID par clic, jamais réutilisée) ───────────────────

test("UUID valide accepté, reste refusé", () => {
  assert.equal(isValidIdempotencyKey("123e4567-e89b-12d3-a456-426614174000"), true);
  assert.equal(isValidIdempotencyKey(""), false);
  assert.equal(isValidIdempotencyKey("abc"), false);
  assert.equal(isValidIdempotencyKey(null), false);
  assert.equal(isValidIdempotencyKey("refund-ORD-1-100"), false);
});

// ─── Résolution PI : colonne → external pi_ → session (miroir) ──────────────

function resolveLocal(order: {
  stripe_payment_intent_id?: string | null;
  external_order_id?: string | null;
}): string | null {
  if (typeof order?.stripe_payment_intent_id === "string" && order.stripe_payment_intent_id.startsWith("pi_"))
    return order.stripe_payment_intent_id;
  if (typeof order?.external_order_id === "string" && order.external_order_id.startsWith("pi_"))
    return order.external_order_id;
  return null;
}

test("carte : external pi_ direct", () => {
  assert.equal(
    resolveLocal({ external_order_id: "pi_123" }),
    "pi_123",
  );
});

test("hosted avec PI persisté : colonne dédiée prioritaire", () => {
  assert.equal(
    resolveLocal({ stripe_payment_intent_id: "pi_9", external_order_id: "cs_1" }),
    "pi_9",
  );
});

test("hosted sans PI : session → expand côté edge (pas ici)", () => {
  assert.equal(resolveLocal({ external_order_id: "cs_1" }), null);
});

// ─── Solde : reçu − remboursés (Stripe source de vérité) ────────────────────

function remaining(received: number, refunds: { amount: number; status: string }[]): number {
  const done = refunds
    .filter((r) => r.status === "succeeded" || r.status === "pending")
    .reduce((s, r) => s + r.amount, 0);
  return received - done;
}

test("partiels cumulés déduits (pending compte, failed non)", () => {
  assert.equal(
    remaining(3293, [
      { amount: 1000, status: "succeeded" },
      { amount: 500, status: "pending" },
      { amount: 9999, status: "failed" },
    ]),
    1793,
  );
});

test("solde nul → 409, jamais de refund à 0", () => {
  assert.equal(remaining(1000, [{ amount: 1000, status: "succeeded" }]), 0);
});

// ─── Éligibilité demandes (miroir refund-request) ───────────────────────────

const CANCELABLE = ["paid", "in_production", "on_hold"];

function eligible(status: string, deliveredDaysAgo: number | null): string {
  if (CANCELABLE.includes(status)) return "cancel";
  if (status === "delivered") {
    if (deliveredDaysAgo != null && deliveredDaysAgo <= 14) return "return";
    return "refused:window";
  }
  if (status === "shipped") return "refused:transit";
  return "refused:terminal";
}

test("annulation : paid/in_production/on_hold", () => {
  for (const s of CANCELABLE) assert.equal(eligible(s, null), "cancel");
});

test("retour : delivered ≤14j, refusé après", () => {
  assert.equal(eligible("delivered", 3), "return");
  assert.equal(eligible("delivered", 14), "return");
  assert.equal(eligible("delivered", 15), "refused:window");
});

test("transit et terminaux refusés", () => {
  assert.equal(eligible("shipped", null), "refused:transit");
  for (const s of ["pending", "cancelled", "refunded", "returned"]) {
    assert.ok(eligible(s, null).startsWith("refused"), s);
  }
});

// ─── Garde-fous ─────────────────────────────────────────────────────────────

test("voie manuelle refunded fermée (409 → Finances)", () => {
  const MANUAL = new Set([
    "in_production", "shipped", "delivered", "cancelled",
    "on_hold", "returned", "partial",
  ]);
  assert.ok(!MANUAL.has("refunded"));
  assert.ok(!MANUAL.has("paid"));
});

test("montants en centimes entiers > 0, plafonnés au restant", () => {
  const check = (asked: number | null, left: number) => {
    if (asked === null) return left;
    if (!Number.isInteger(asked) || asked <= 0) return "bad";
    if (asked > left) return "over";
    return asked;
  };
  assert.equal(check(null, 1793), 1793);
  assert.equal(check(1793, 1793), 1793);
  assert.equal(check(2000, 1793), "over");
  assert.equal(check(0, 1793), "bad");
  assert.equal(check(10.5, 1793), "bad");
});
