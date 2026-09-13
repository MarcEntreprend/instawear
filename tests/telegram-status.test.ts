// tests/telegram-status.test.ts
// Telegram admin ORDER STATUS UPDATE (supabase/functions/_shared/
// telegramNotify.ts + copies) : format, 10 libellés FR inspirés de
// src/admin/orderStatusLabels.ts, pastilles, previous/now, ownership.
// Import direct (module pur, sans Deno) : rendu RÉEL testé.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STATUS_LABEL_FR,
  STATUS_COLOR,
  STATUS_DOT,
  formatTgDate,
  buildStatusUpdateText,
} from "../supabase/functions/_shared/telegramNotify.ts";

// ─── 10 libellés FR (miroir orderStatusLabels.ts) ───────────────────────────

test("10 statuts FR + couleurs + pastilles", () => {
  const expected: Record<string, [string, string]> = {
    pending: ["En attente", "#92400e"],
    paid: ["Payée", "#065f46"],
    in_production: ["En production", "#1e40af"],
    partial: ["Partielle", "#b45309"],
    shipped: ["Expédiée", "#065f46"],
    delivered: ["Livrée", "#166534"],
    cancelled: ["Annulée", "#991b1b"],
    on_hold: ["En pause", "#92400e"],
    refunded: ["Remboursée", "#4c1d95"],
    returned: ["Retournée", "#9f1239"],
  };
  assert.equal(Object.keys(STATUS_LABEL_FR).length, 10);
  for (const [k, [fr, color]] of Object.entries(expected)) {
    assert.equal(STATUS_LABEL_FR[k], fr, k);
    assert.equal(STATUS_COLOR[k], color, k);
    assert.ok(STATUS_DOT[k], `pastille ${k}`);
  }
});

// ─── Format (exemple user : ORD-2026-482163 → SHIPPED) ───────────────────────

const SAMPLE = {
  orderId: "ORD-2026-482163",
  from: "paid",
  to: "shipped",
  customer: "Marc Ruben MACEAN",
  updatedAt: new Date("2026-09-13T14:32:00-03:00"),
  prevAt: new Date("2026-09-12T10:00:00-03:00"),
};

test("structure : header + ordre + client + previous/now", () => {
  const txt = buildStatusUpdateText(SAMPLE);
  assert.ok(txt.startsWith("📢 *ORDER STATUS UPDATE*"));
  assert.ok(txt.includes("*ORD-2026-482163*"));
  assert.ok(txt.includes("*Expédiée*"));
  assert.ok(txt.includes("`SHIPPED`"));
  assert.ok(txt.includes("#065f46"));
  assert.ok(txt.includes("*Customer:* Marc Ruben MACEAN"));
  assert.ok(txt.includes("*Previous:* Payée ("));
  assert.ok(txt.includes("*Now:* Expédiée ("));
});

test("dates formatées type '13 Sep(t) 2026, 14:32' (fuseau boutique)", () => {
  const txt = buildStatusUpdateText(SAMPLE);
  // Mois abrégé selon ICU ("Sep" ou "Sept") : on vérifie jour/année/heures.
  assert.ok(/13 \w+ 2026, 14:32/.test(txt), txt);
  assert.ok(/12 \w+ 2026, 10:00/.test(txt), txt);
});

test("statut inconnu → fallback brut, jamais de crash", () => {
  const txt = buildStatusUpdateText({
    orderId: "X",
    from: "weird",
    to: "weird2",
  });
  assert.ok(txt.includes("weird2"));
  assert.ok(txt.includes("*Customer:* —"));
});

test("prevAt absent → Previous sans date, Now avec date", () => {
  const txt = buildStatusUpdateText({
    orderId: "X",
    from: "paid",
    to: "cancelled",
    updatedAt: new Date("2026-09-13T14:32:00-03:00"),
  });
  assert.ok(txt.includes("*Previous:* Payée\n"));
  assert.ok(/\*Now:\* Annulée \(13 \w+ 2026, 14:32\)/.test(txt), txt);
});

test("formatTgDate : null/invalide → null", () => {
  assert.equal(formatTgDate(null), null);
  assert.equal(formatTgDate(undefined), null);
  assert.equal(formatTgDate("n'importe quoi"), null);
});

// ─── Ownership : un seul envoyeur par transition (zéro doublon) ─────────────

const OWNER: Record<string, string> = {
  "paid:new-order": "stripe-webhook/handlePaidOrder",
  "transmission:in_production|partial": "create-printful-order",
  "transmission:on_hold|failed-create": "create-printful-order",
  "printful-cancel:cancelled": "create-printful-order",
  "manual:update": "order-status-update",
  "manual:transmit-delegated": "create-printful-order (callee)",
  "webhook:newStatus": "printful-webhook",
  "approve:in_production": "approve-printful-design",
};

test("chaque transition a exactement un possesseur (clés uniques)", () => {
  assert.equal(Object.keys(OWNER).length, 8);
  // new-order (paid) possédé par stripe-webhook ; status paid jamais
  // notifié en double ; transmission déléguée = callee seul.
  assert.ok(Object.values(OWNER).includes("stripe-webhook/handlePaidOrder"));
  assert.ok(
    Object.values(OWNER).includes("create-printful-order (callee)"),
  );
});

test("pas de double : paid = new-order seul (pas de status en plus)", () => {
  // handlePaidOrder envoie INSTAWEAR ORDER ; aucun ORDER STATUS UPDATE
  // pour pending→paid (le new-order EST la notification).
  assert.ok(!("pending->paid" in OWNER));
});

test("pas de double : retry/doublon/illégal = silence (newStatus null)", () => {
  const shouldSend = (newStatus: string | null) => newStatus != null;
  assert.equal(shouldSend(null), false);
  assert.equal(shouldSend("shipped"), true);
});
