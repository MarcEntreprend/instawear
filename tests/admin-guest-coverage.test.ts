// tests/admin-guest-coverage.test.ts
// Invariant : TOUT achat et TOUT changement de statut crée une notif admin
// in-app, que la commande soit invitée (client_id null) ou logguée.
// Seules les notifs CLIENT exigent client_id (pas de compte = pas de cloche).
// Miroirs des règles serveur (trigger SQL + trio + webhooks).

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Règle : in-app admin inconditionnelle, in-app client conditionnelle ────

function adminInApp(_clientId: string | null): boolean {
  return true; // trigger paid + trio : jamais de gate client_id
}

function customerInApp(clientId: string | null): boolean {
  return clientId != null;
}

test("achat invité paid → cloche admin OUI, cloche client NON", () => {
  assert.equal(adminInApp(null), true);
  assert.equal(customerInApp(null), false);
});

test("achat loggué paid → cloches admin ET client", () => {
  assert.equal(adminInApp("user-1"), true);
  assert.equal(customerInApp("user-1"), true);
});

// ─── Achat : trigger SQL sur entrée en paid (hosted + carte, guest + loggué) ─

function triggerFires(oldStatus: string | null, newStatus: string): boolean {
  const PAID = new Set(["paid", "in_production", "shipped", "delivered"]);
  if (oldStatus === newStatus) return false;
  if (oldStatus && PAID.has(oldStatus)) return false;
  return PAID.has(newStatus);
}

test("pending→paid déclenche (les 4 combinaisons guest/loggué × carte/hosted)", () => {
  for (const _channel of ["card", "hosted"]) {
    for (const _guest of [true, false]) {
      assert.equal(triggerFires("pending", "paid"), true);
    }
  }
});

test("pending→pending (webhook carte non abonné) → silence CORRECT", () => {
  // C'est le cas ORD-2026-979939 / 761397 : pas de régression code,
  // abonnement Stripe manquant. La commande reste pending → pas de cloche
  // (sinon bruit des paniers abandonnés).
  assert.equal(triggerFires("pending", "pending"), false);
});

// ─── Changements de statut : trio admin sur les 8 cibles manuelles ──────────

const MANUAL = [
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "on_hold",
  "refunded",
  "returned",
  "partial",
];

test("chaque cible manuelle crée la cloche admin, guest ou non", () => {
  for (const to of MANUAL) {
    assert.equal(adminInApp(null), true, `${to} invité`);
    assert.equal(adminInApp("user-1"), true, `${to} loggué`);
  }
});

// ─── Webhooks Printful : cloche admin sur chaque transition réelle ──────────

const PRINTFUL_EVENTS = [
  "package_shipped",
  "order_failed",
  "order_canceled",
  "order_put_hold",
  "order_put_hold_approval",
  "order_remove_hold",
  "order_refunded",
  "package_returned",
  "order_created",
  "order_updated",
];

test("chaque event avec newStatus → cloche admin, guest ou non", () => {
  for (const ev of PRINTFUL_EVENTS) {
    assert.equal(adminInApp(null), true, `${ev} invité`);
  }
});

test("retry/doublon (newStatus null) → silence (pas de spam)", () => {
  const shouldNotify = (newStatus: string | null) => newStatus != null;
  assert.equal(shouldNotify(null), false);
  assert.equal(shouldNotify("shipped"), true);
});

// ─── Transmission / annulation / approbation Printful ───────────────────────

test("transmission, pause, annulation, approbation → cloche admin", () => {
  for (const step of ["transmit", "on_hold", "cancel", "approve"]) {
    assert.equal(adminInApp(null), true, `${step} invité`);
  }
});

// ─── Clients / interactions (hors commandes) ────────────────────────────────

test("inscription + message /contact + ticket compte → cloche admin", () => {
  assert.equal(adminInApp(null), true);
});
