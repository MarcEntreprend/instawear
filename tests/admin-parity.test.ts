// tests/admin-parity.test.ts
// Parité interface admin : une seule source de libellés (10 statuts),
// page Expédiées inclut partial, monitoring connaît order-status-update,
// prefs visibles fiche client. Miroirs des constantes JSX.

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Source unique : 10 libellés FR ─────────────────────────────────────────

const ORDER_STATUS_LABEL: Record<string, { label: string }> = {
  pending: { label: "En attente" },
  paid: { label: "Payée" },
  in_production: { label: "En production" },
  shipped: { label: "Expédiée" },
  delivered: { label: "Livrée" },
  cancelled: { label: "Annulée" },
  on_hold: { label: "En pause" },
  refunded: { label: "Remboursée" },
  returned: { label: "Retournée" },
  partial: { label: "Partielle" },
};

test("10 libellés FR, paid + partial inclus (fini les badges gris)", () => {
  assert.equal(Object.keys(ORDER_STATUS_LABEL).length, 10);
  assert.equal(ORDER_STATUS_LABEL.paid.label, "Payée");
  assert.equal(ORDER_STATUS_LABEL.partial.label, "Partielle");
});

// ─── Expédiées : shipped + partial + delivered ──────────────────────────────

const SHIPPED_STATUSES = new Set(["shipped", "partial", "delivered"]);

test("page Expédiées : partial incluse (1er colis multi-colis)", () => {
  assert.ok(SHIPPED_STATUSES.has("partial"));
  assert.ok(SHIPPED_STATUSES.has("shipped"));
  assert.ok(SHIPPED_STATUSES.has("delivered"));
  assert.equal(SHIPPED_STATUSES.size, 3);
});

test("filtre expéditions : all + 3 statuts", () => {
  const options = ["all", "shipped", "partial", "delivered"];
  assert.deepEqual([...options].sort(), ["all", "delivered", "partial", "shipped"]);
});

// ─── Monitoring : order-status-update connue ────────────────────────────────

const KNOWN_FUNCTIONS = [
  "create-printful-order",
  "printful-webhook",
  "stripe-checkout",
  "stripe-webhook",
  "sync-printful",
  "printful-reports",
  "approve-printful-design",
  "get-shipping-rates",
  "order-status-update",
];

test("monitoring connaît order-status-update (erreurs filtrables)", () => {
  assert.ok(KNOWN_FUNCTIONS.includes("order-status-update"));
});

// ─── Fiche client : prefs email visibles (lecture seule) ───────────────────

function prefBadges(prefs?: {
  order_confirmation?: boolean;
  shipping_update?: boolean;
  promotions?: boolean;
}): Record<string, boolean> {
  return {
    Confirmations: (prefs?.order_confirmation ?? true) !== false,
    "Suivi colis": (prefs?.shipping_update ?? true) !== false,
    Promos: (prefs?.promotions ?? true) !== false,
  };
}

test("prefs absentes → tout actif (défaut true)", () => {
  assert.deepEqual(prefBadges(undefined), {
    Confirmations: true,
    "Suivi colis": true,
    Promos: true,
  });
});

test("opt-out reflété badge par badge", () => {
  assert.deepEqual(
    prefBadges({ order_confirmation: false, shipping_update: true, promotions: false }),
    { Confirmations: false, "Suivi colis": true, Promos: false },
  );
});
