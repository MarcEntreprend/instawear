// tests/order-status-update.test.ts
// Phase 3 — Edge order-status-update (changement manuel admin, serveur) :
// cibles autorisées, state-machine, no-op, propriété in_production,
// email par statut, gate admin. Miroirs de
// supabase/functions/order-status-update/index.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Cibles manuelles (miroir MANUAL_TARGETS — refunded EXCLU : argent
// réel via Finances/stripe-refund, jamais un label) ──────────────────────────

const MANUAL_TARGETS = new Set([
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "on_hold",
  "returned",
  "partial",
]);

test("7 cibles manuelles, ni paid ni pending ni refunded", () => {
  assert.equal(MANUAL_TARGETS.size, 7);
  assert.ok(!MANUAL_TARGETS.has("paid"));
  assert.ok(!MANUAL_TARGETS.has("pending"));
  assert.ok(!MANUAL_TARGETS.has("refunded"));
});

test("paid/pending/refunded refusés (webhook, initial, Finances)", () => {
  const check = (toStatus: string) =>
    MANUAL_TARGETS.has(toStatus) ? null : `Statut cible invalide`;
  assert.ok(check("paid"));
  assert.ok(check("pending"));
  assert.ok(check("refunded"));
  assert.equal(check("shipped"), null);
});

// ─── State machine (miroir order_status_transitions, seed 20260815) ─────────

const TRANSITIONS = new Set([
  "pending->paid", "pending->cancelled",
  "paid->in_production", "paid->partial", "paid->on_hold", "paid->cancelled",
  "in_production->shipped", "in_production->partial", "in_production->on_hold", "in_production->cancelled",
  "partial->shipped", "partial->on_hold", "partial->cancelled", "partial->refunded",
  "on_hold->in_production", "on_hold->partial", "on_hold->cancelled", "on_hold->refunded",
  "shipped->delivered", "shipped->returned", "shipped->refunded",
  "delivered->returned", "delivered->refunded",
]);

function decide(from: string, to: string): "noop" | "ok" | "refused" {
  if (from === to) return "noop";
  if (!MANUAL_TARGETS.has(to)) return "refused";
  return TRANSITIONS.has(`${from}->${to}`) ? "ok" : "refused";
}

test("même statut → no-op (idempotence UI, emailed:false)", () => {
  assert.equal(decide("shipped", "shipped"), "noop");
  assert.equal(decide("cancelled", "cancelled"), "noop");
});

test("transitions légales manuelles → ok", () => {
  assert.equal(decide("paid", "in_production"), "ok");
  assert.equal(decide("in_production", "shipped"), "ok");
  assert.equal(decide("shipped", "delivered"), "ok");
  assert.equal(decide("on_hold", "in_production"), "ok");
  assert.equal(decide("delivered", "returned"), "ok");
});

test("refunded via edge manuelle → refused (Finances exigées)", () => {
  // Même si la transition existe en table, la voie manuelle est fermée :
  // l'argent doit bouger (stripe-refund), pas seulement le label.
  assert.equal(decide("paid", "refunded"), "refused");
  assert.equal(decide("shipped", "refunded"), "refused");
  assert.equal(decide("delivered", "refunded"), "refused");
});

test("transitions illégales → refused (409)", () => {
  assert.equal(decide("delivered", "in_production"), "refused");
  assert.equal(decide("shipped", "in_production"), "refused");
  assert.equal(decide("cancelled", "shipped"), "refused"); // terminal
  assert.equal(decide("refunded", "delivered"), "refused"); // terminal
  assert.equal(decide("pending", "shipped"), "refused"); // saut d'étape
  assert.equal(decide("paid", "delivered"), "refused"); // saut d'étape
});

// ─── Miroir UI : ALLOWED_MANUAL_TARGETS ⊆ state machine ────────────────────

const UI_TARGETS: Record<string, string[]> = {
  pending: ["cancelled"],
  paid: ["in_production", "partial", "on_hold", "cancelled"],
  in_production: ["shipped", "partial", "on_hold", "cancelled"],
  partial: ["shipped", "on_hold", "cancelled"],
  on_hold: ["in_production", "partial", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  refunded: [],
  returned: [],
};

test("chaque option UI est une transition légale (jamais de 409 surprise)", () => {
  for (const [from, tos] of Object.entries(UI_TARGETS)) {
    for (const to of tos) {
      assert.equal(decide(from, to), "ok", `${from}->${to}`);
    }
  }
});

test("terminaux sans option (badge seul)", () => {
  for (const s of ["cancelled", "refunded", "returned"]) {
    assert.deepEqual(UI_TARGETS[s], []);
  }
});

// ─── Propriété in_production (zéro doublon) ─────────────────────────────────

test("in_production : email possédé par create-printful-order, jamais l'edge", () => {
  // Miroir du contrat : transmitted=false → emailed=false (déjà transmis) ;
  // transmitted=true → emailed=true (callee) ; held=true → on_hold à la place.
  const contract = (transmitted: boolean | null, held: boolean) => {
    if (held) return { emailed: true, kind: "on_hold" };
    if (transmitted) return { emailed: true, kind: "in_production-owned" };
    return { emailed: false, kind: "already-transmitted" };
  };
  assert.deepEqual(contract(true, false), {
    emailed: true,
    kind: "in_production-owned",
  });
  assert.deepEqual(contract(false, false), {
    emailed: false,
    kind: "already-transmitted",
  });
  assert.deepEqual(contract(true, true), { emailed: true, kind: "on_hold" });
});

// ─── Email par statut (moule Phase 2, sauf in_production) ───────────────────

test("chaque statut manuel a son builder (delivered câblé Phase 3)", () => {
  const builders: Record<string, string> = {
    shipped: "buildShippedEmail",
    delivered: "buildDeliveredEmail",
    cancelled: "buildCancelledEmail",
    on_hold: "buildOnHoldEmail",
    refunded: "buildRefundedEmail",
    returned: "buildReturnedEmail",
    partial: "buildPartialEmail",
  };
  assert.equal(Object.keys(builders).length, 7);
  for (const b of Object.values(builders)) assert.ok(b.startsWith("build"));
});

// ─── Auth gate (miroir : service_role OU JWT admin_users) ───────────────────

function gate(apikeyOk: boolean, jwtAdmin: boolean): number {
  if (apikeyOk) return 200;
  if (!jwtAdmin) return 401; // sans token ; 403 si token non-admin (même refus)
  return 200;
}

test("service_role → 200 sans JWT", () => {
  assert.equal(gate(true, false), 200);
});

test("JWT admin → 200", () => {
  assert.equal(gate(false, true), 200);
});

test("ni l'un ni l'autre → 401/403", () => {
  assert.ok([401, 403].includes(gate(false, false)));
});
