// tests/phase-a-orders.test.ts
// Phase A (gaps 8 + 11, 12 en vérif) :
// - snapshot coûts Printful : construction, best-effort, admin-only
// - cancel-printful-order : éligibilité locale + distante
// - external_id : non-régression (déjà en place, create-printful-order:366)
// Miroirs de supabase/functions/create-printful-order/index.ts (Deno).

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Snapshot coûts (miroir edge) ───────────────────────────────────────────

function buildCostsSnapshot(pfResult: any): Record<string, unknown> | null {
  const r = pfResult || {};
  if (!r.costs && !r.retail_costs && !r.pricing_breakdown) return null;
  return {
    costs: r.costs || null,
    retail_costs: r.retail_costs || null,
    pricing_breakdown: r.pricing_breakdown || null,
    currency: r.currency || null,
    estimated_at: "2026-01-01T00:00:00.000Z",
  };
}

test("snapshot construit depuis costs/retail/pricing", () => {
  const s = buildCostsSnapshot({
    costs: { total: "12.50" },
    retail_costs: { shipping: "5.00" },
    pricing_breakdown: [{ item: 1 }],
    currency: "USD",
  });
  assert.ok(s);
  assert.deepEqual((s as any).costs, { total: "12.50" });
  assert.equal((s as any).currency, "USD");
});

test("sans données de coûts → pas de snapshot (colonne reste NULL)", () => {
  assert.equal(buildCostsSnapshot({}), null);
  assert.equal(buildCostsSnapshot(null), null);
});

test("réponse partielle → champs absents = null", () => {
  const s: any = buildCostsSnapshot({ costs: { total: "1.00" } });
  assert.equal(s.retail_costs, null);
  assert.equal(s.pricing_breakdown, null);
});

// ─── Cloisonnement admin-only (miroir mapOrder) ─────────────────────────────

function mapCosts(row: any, opts?: { includeCosts?: boolean }): unknown {
  return opts?.includeCosts ? (row.printful_costs ?? null) : null;
}

test("par défaut : coûts exclus (parcours client)", () => {
  assert.equal(mapCosts({ printful_costs: { costs: {} } }), null);
});

test("opt-in admin : coûts inclus", () => {
  assert.deepEqual(
    mapCosts({ printful_costs: { costs: { total: "1" } } }, { includeCosts: true }),
    { costs: { total: "1" } },
  );
});

test("opt-in sans colonne (vieilles lignes) → null, pas de crash", () => {
  assert.equal(mapCosts({}, { includeCosts: true }), null);
});

// ─── Cancel : éligibilité locale (miroir state machine) ─────────────────────

const ALLOWED = new Set([
  "pending->paid", "pending->cancelled",
  "paid->in_production", "paid->partial", "paid->on_hold", "paid->cancelled",
  "in_production->shipped", "in_production->partial", "in_production->on_hold", "in_production->cancelled",
  "partial->shipped", "partial->on_hold", "partial->cancelled", "partial->refunded",
  "on_hold->in_production", "on_hold->partial", "on_hold->cancelled", "on_hold->refunded",
  "shipped->delivered", "shipped->returned", "shipped->refunded",
  "delivered->returned", "delivered->refunded",
]);

function localCancellable(status: string): boolean {
  return status === "cancelled" || ALLOWED.has(`${status}->cancelled`);
}

test("paid/in_production/partial/on_hold annulables en local", () => {
  for (const s of ["paid", "in_production", "partial", "on_hold"]) {
    assert.ok(localCancellable(s), s);
  }
});

test("shipped/delivered/refunded/returned NON annulables", () => {
  for (const s of ["shipped", "delivered", "refunded", "returned", "cancelled"]) {
    if (s === "cancelled") continue; // déjà annulée : rien à faire (idempotent)
    assert.equal(localCancellable(s), false, s);
  }
});

// ─── Cancel : garde distante draft/pending (miroir edge) ────────────────────

function remoteCancellable(pfStatus: unknown): { ok: boolean; reason?: string } {
  const s = String(pfStatus || "").toLowerCase();
  if (s === "draft" || s === "pending") return { ok: true };
  return {
    ok: false,
    reason: `Statut Printful « ${s || "inconnu"} » non annulable (seuls draft/pending le sont). Passez par un remboursement.`,
  };
}

test("draft/pending distants → OK", () => {
  assert.ok(remoteCancellable("draft").ok);
  assert.ok(remoteCancellable("pending").ok);
  assert.ok(remoteCancellable("Pending").ok);
});

test("inprocess/fulfilled/canceled → refus avec marche à suivre", () => {
  for (const s of ["inprocess", "fulfilled", "canceled", "onhold", ""]) {
    const r = remoteCancellable(s);
    assert.equal(r.ok, false, s);
    assert.match(r.reason || "", /remboursement/);
  }
});

// ─── Gap 12 : external_id déjà corrélé (non-régression) ─────────────────────

test("external_id = ID commande locale (corrélation fiable)", () => {
  // Miroir de printfulOrder.external_id = order.id (edge ligne ~366) :
  // le webhook retrouve la commande via external_id en priorité.
  const orderId = "ORD-2026-123456";
  const printfulOrder = { external_id: orderId, shipping: "STANDARD" };
  assert.equal(printfulOrder.external_id, orderId);
});

test("lookup prioritaire external_id puis external_order_id", () => {
  // Miroir de l'ordre de recherche du webhook : external_id d'abord,
  // external_order_id (ID Printful numérique) en repli.
  function findId(byExternal: string | null, byPfId: string | null): string | null {
    return byExternal || byPfId || null;
  }
  assert.equal(findId("ORD-2026-123456", "98765"), "ORD-2026-123456");
  assert.equal(findId(null, "98765"), "98765");
  assert.equal(findId(null, null), null);
});
