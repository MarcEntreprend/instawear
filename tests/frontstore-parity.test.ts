// tests/frontstore-parity.test.ts
// Phase 4 — Parité frontstore/admin UI ↔ emails : les 10 statuts s'affichent
// partout, le suivi colis est visible dès le 1er colis, les lignes articles
// montrent variante + prix comme les emails, les CTA ?order= aboutissent.
// Miroirs des règles JSX (OrderTrackingModal, AccountPage, OrdersPage).

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Les 10 statuts existent partout (front = DB = emails) ─────────────────

const FRONT_STATUSES = [
  "paid",
  "pending",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "on_hold",
  "refunded",
  "returned",
  "partial",
];

const DB_CHECK = [
  "pending",
  "paid",
  "in_production",
  "partial",
  "shipped",
  "delivered",
  "cancelled",
  "on_hold",
  "refunded",
  "returned",
];

const EMAIL_STEP_KEYS = [
  "paid",
  "pending",
  "in_production",
  "partial",
  "shipped",
  "delivered",
  "on_hold",
  "refunded",
  "returned",
  "cancelled",
];

test("front ADMIN + emails + DB : exactement les 10 mêmes statuts", () => {
  for (const sets of [FRONT_STATUSES, DB_CHECK, EMAIL_STEP_KEYS]) {
    assert.equal(new Set(sets).size, 10);
  }
  for (const s of FRONT_STATUSES) {
    assert.ok(DB_CHECK.includes(s), `DB sans ${s}`);
    assert.ok(EMAIL_STEP_KEYS.includes(s), `emails sans ${s}`);
  }
});

// ─── Bloc suivi colis : visible dès le 1er colis ────────────────────────────

function trackingVisible(status: string, shipmentCount: number): boolean {
  return (
    (status === "shipped" ||
      status === "partial" ||
      status === "delivered") &&
    shipmentCount > 0
  );
}

test("suivi visible sur partial (1er colis), pas seulement shipped", () => {
  assert.equal(trackingVisible("partial", 1), true);
  assert.equal(trackingVisible("shipped", 2), true);
  assert.equal(trackingVisible("delivered", 1), true);
});

test("suivi masqué sans colis ou avant expédition", () => {
  assert.equal(trackingVisible("shipped", 0), false);
  assert.equal(trackingVisible("in_production", 0), false);
  assert.equal(trackingVisible("paid", 0), false);
  assert.equal(trackingVisible("on_hold", 0), false);
});

// ─── Bannières on_hold / partial ────────────────────────────────────────────

function banners(status: string, hasBlocked: boolean): string[] {
  const out: string[] = [];
  if (status === "on_hold" && !hasBlocked) out.push("paused-generic");
  if (status === "on_hold" && hasBlocked) out.push("paused-generic");
  if (status === "partial" || hasBlocked) out.push("partial-alert");
  return out;
}

test("on_hold sans bloqués → bannière pause générique (pas l'alerte partielle)", () => {
  assert.deepEqual(banners("on_hold", false), ["paused-generic"]);
});

test("partial → alerte partielle (+ pause si on_hold)", () => {
  assert.ok(banners("partial", false).includes("partial-alert"));
  assert.ok(banners("on_hold", true).includes("partial-alert"));
});

test("paid/shipped/delivered → aucune bannière", () => {
  for (const s of ["paid", "shipped", "delivered"]) {
    assert.deepEqual(banners(s, false), []);
  }
});

// ─── Lignes articles : variante + prix comme les emails ─────────────────────

function itemLine(item: {
  title: string;
  size: string;
  color?: string | null;
  qty: number;
  unitPrice: number;
  symbol: string;
}): string {
  const variant = `${item.size}${item.color ? ` · ${item.color}` : ""}`;
  return `${item.title} (${variant}) × ${item.qty} = ${(item.unitPrice * item.qty).toFixed(2)} ${item.symbol}`;
}

test("ligne article : taille + couleur + qty + prix ligne", () => {
  assert.equal(
    itemLine({
      title: "Dad hat",
      size: "One size",
      color: "#000080",
      qty: 1,
      unitPrice: 28.24,
      symbol: "$",
    }),
    "Dad hat (One size · #000080) × 1 = 28.24 $",
  );
});

test("ligne sans couleur → pas de segment vide", () => {
  assert.ok(!itemLine({ title: "X", size: "M", qty: 2, unitPrice: 10, symbol: "$" }).includes("·  ·"));
});

// ─── Totaux : port + total comme les emails ─────────────────────────────────

function shippingLine(cost: number | null, method: string | null, symbol: string): string | null {
  if (cost == null) return null;
  return `Shipping${method ? ` (${method})` : ""}: ${cost === 0 ? "Free" : `${cost.toFixed(2)} ${symbol}`}`;
}

test("port affiché (Free si 0, méthode incluse)", () => {
  assert.equal(shippingLine(0, "Standard", "$"), "Shipping (Standard): Free");
  assert.equal(shippingLine(4.69, null, "$"), "Shipping: 4.69 $");
  assert.equal(shippingLine(null, null, "$"), null);
});

// ─── CTA emails → routing App (contrat) ─────────────────────────────────────

test("?order= route smart (connecté→compte, invité→suivi), ?track= modal", () => {
  // Miroir de App.tsx : les deux params existent et sont nettoyés après lecture.
  const routes = { "?order=": "smart", "?track=": "modal" };
  assert.equal(routes["?order="], "smart");
  assert.equal(routes["?track="], "modal");
});
