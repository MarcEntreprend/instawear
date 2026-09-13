// tests/card-order-first.test.ts
// Flux carte : commande persistée AVANT le PaymentIntent pour que le
// montant soit 100% serveur (produits + port). Sans ça, PI sans port vs
// total front avec port → 400 définitif → pending muet sans notifications.
// Miroirs de CheckoutFlow (front) + stripe-checkout (edge).

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Ordre strict : persist → PI → confirm → webhook ────────────────────────

function orderFirstFlow(steps: string[]): boolean {
  const persist = steps.indexOf("persist-pending");
  const pi = steps.indexOf("create-pi");
  const confirm = steps.indexOf("confirm");
  const webhook = steps.indexOf("webhook-paid");
  return persist < pi && pi < confirm && confirm < webhook;
}

test("ordre : pending d'abord, PI ensuite (comme le hosted)", () => {
  assert.equal(
    orderFirstFlow(["persist-pending", "create-pi", "confirm", "webhook-paid"]),
    true,
  );
});

test("ancien ordre (PI avant persist) → webhook 404/400 possible", () => {
  assert.equal(
    orderFirstFlow(["create-pi", "confirm", "persist-pending", "webhook-paid"]),
    false,
  );
});

// ─── PI exige une commande existante (sinon 400 immédiat) ───────────────────

function piRequiresOrder(touchedRows: number): string | null {
  if (touchedRows === 0) return "Commande introuvable pour ce paiement";
  return null;
}

test("commande absente (0 lignes touchées) → 400, pas de PI orphelin", () => {
  assert.ok(piRequiresOrder(0));
  assert.equal(piRequiresOrder(1), null);
});

// ─── Total autoritatif : PI == base (même arrondi, port inclus) ─────────────

function cents(total: number): number {
  return Math.round(total * 100);
}

test("webhook matche toujours (deux valeurs serveur, même arrondi)", () => {
  const serverTotal = 28.24 + 4.69; // items + port serveur
  const piAmount = cents(serverTotal);
  const dbAmount = cents(serverTotal);
  assert.equal(piAmount, dbAmount);
});

test("ancien flux : PI sans port vs total avec port → 400 garanti", () => {
  const piOld = cents(28.24);
  const dbOld = cents(28.24 + 4.69);
  assert.notEqual(piOld, dbOld);
});

// ─── Nettoyage : delete pending uniquement (jamais paid) ────────────────────

function cleanupTargets(status: string): boolean {
  return status === "pending";
}

test("échec paiement → pending supprimée (retry propre)", () => {
  assert.equal(cleanupTargets("pending"), true);
});

test("jamais de delete sur paid (double-submit safety)", () => {
  assert.equal(cleanupTargets("paid"), false);
  assert.equal(cleanupTargets("in_production"), false);
});
