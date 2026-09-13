// tests/reports-net-revenue.test.ts
// CA net (ReportsPage) : paniers en attente, annulées, remboursées et
// retournées exclus ; volumes bruts conservés ; panier moyen sur payantes.
// Miroirs des memos ReportsPage.

import { test } from "node:test";
import assert from "node:assert/strict";

const NON_REVENUE = new Set(["pending", "cancelled", "refunded", "returned"]);

type O = { status: string; totalAmount: number };

const net = (orders: O[]) => orders.filter((o) => !NON_REVENUE.has(o.status));
const revenue = (orders: O[]) =>
  orders.reduce((s, o) => s + o.totalAmount, 0);

test("exclus : pending/cancelled/refunded/returned", () => {
  const orders: O[] = [
    { status: "pending", totalAmount: 100 },
    { status: "cancelled", totalAmount: 50 },
    { status: "refunded", totalAmount: 30 },
    { status: "returned", totalAmount: 20 },
    { status: "paid", totalAmount: 10 },
  ];
  assert.equal(revenue(net(orders)), 10);
});

test("inclus : paid/in_production/partial/shipped/delivered/on_hold plein", () => {
  const orders: O[] = [
    { status: "paid", totalAmount: 10 },
    { status: "in_production", totalAmount: 10 },
    { status: "partial", totalAmount: 10 },
    { status: "shipped", totalAmount: 10 },
    { status: "delivered", totalAmount: 10 },
    { status: "on_hold", totalAmount: 10 },
  ];
  assert.equal(revenue(net(orders)), 60);
});

test("panier moyen = net ÷ net (pas ÷ brut)", () => {
  const orders: O[] = [
    { status: "pending", totalAmount: 1000 },
    { status: "paid", totalAmount: 50 },
    { status: "paid", totalAmount: 50 },
  ];
  const n = net(orders);
  assert.equal(revenue(n) / n.length, 50);
});

test("statut inconnu → compté (fail-open, pas de perte silencieuse)", () => {
  assert.equal(revenue(net([{ status: "weird", totalAmount: 7 }])), 7);
});

test("volumes bruts conservés pour Commandes", () => {
  const orders: O[] = [
    { status: "pending", totalAmount: 100 },
    { status: "paid", totalAmount: 50 },
  ];
  assert.equal(orders.length, 2);
  assert.equal(net(orders).length, 1);
});
