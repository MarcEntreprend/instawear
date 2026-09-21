// tests/admin-b2-coherence.test.ts
// Vague B2 (P1 items 6/7/8) : UNE source commandes, UNE devise, UN CA,
// UNE palette. Mélange contrat réel (helpers purs) + miroirs source
// (style repo : les pages/API lourdes ne s'importent pas en node).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ORDER_STATUS_LABEL,
  ORDER_PENDING_STATUSES,
  NON_REVENUE_STATUSES,
  SHIPPED_VIEW_STATUSES,
  isPendingOrder,
  isRevenueOrder,
  sumRevenue,
} from "../src/admin/orderStatusLabels.ts";
import { formatDateFR, formatDateTimeFR } from "../src/utils/dates.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

// ─── Item 6 : statuts canoniques ───────────────────────────────────────────

test("pending = status pending seul (badges + listes + dashboard)", () => {
  assert.deepEqual([...ORDER_PENDING_STATUSES], ["pending"]);
  assert.equal(isPendingOrder("pending"), true);
  assert.equal(isPendingOrder("paid"), false);
  assert.equal(isPendingOrder("on_hold"), false);
  assert.equal(isPendingOrder(null), false);
});

test("revenue : pending/cancelled/refunded/returned exclus, partial plein", () => {
  assert.deepEqual([...NON_REVENUE_STATUSES].sort(), [
    "cancelled",
    "pending",
    "refunded",
    "returned",
  ]);
  for (const s of ["paid", "in_production", "partial", "shipped", "delivered", "on_hold"])
    assert.equal(isRevenueOrder(s), true);
  for (const s of NON_REVENUE_STATUSES) assert.equal(isRevenueOrder(s), false);
  const orders = [
    { status: "paid", totalAmount: 100 },
    { status: "partial", totalAmount: 50 },
    { status: "pending", totalAmount: 1000 },
    { status: "refunded", totalAmount: 30 },
  ];
  assert.equal(sumRevenue(orders), 150);
  assert.equal(sumRevenue([]), 0);
});

test("vue expéditions : shipped + partial + delivered", () => {
  assert.deepEqual([...SHIPPED_VIEW_STATUSES].sort(), [
    "delivered",
    "partial",
    "shipped",
  ]);
});

test("API : cache commandes partagé + invalidation au changement de statut", () => {
  const src = read("src/api/supabaseApi.ts");
  assert.ok(src.includes("async listCached("), "listCached présent");
  assert.ok(src.includes("invalidateOrdersCache"), "invalidation présente");
  assert.ok(
    src.includes("orderApi.invalidateOrdersCache()"),
    "updateStatusViaEdge invalide",
  );
  assert.ok(src.includes("orderApi.listCached()"), "getStats partagé");
  assert.ok(
    src.includes("revenueEstimate: sumRevenue(orders)"),
    "CA dashboard = règle canonique",
  );
});

test("pages : plus aucun orderApi.list() direct (cache partagé)", () => {
  for (const f of [
    "src/admin/ShippedDeliveredPage.tsx",
    "src/admin/FinancesPage.tsx",
    "src/admin/ReportsPage.tsx",
  ]) {
    const src = read(f);
    assert.ok(!src.includes("orderApi.list()"), `${f} : list() direct banni`);
    assert.ok(src.includes("orderApi.listCached()"), `${f} : listCached`);
  }
  const dash = read("src/admin/AdminDashboardNew.tsx");
  assert.ok(dash.includes("isPendingOrder("), "dashboard : règle pending canonique");
  assert.ok(
    !dash.includes('(o) => o.status === "pending"'),
    "dashboard : plus de définition locale",
  );
});

// ─── Item 7 : devise + dates ───────────────────────────────────────────────

test("devise : fini le dollar en dur (Orders + Expéditions)", () => {
  for (const f of [
    "src/admin/OrdersPage.tsx",
    "src/admin/ShippedDeliveredPage.tsx",
  ]) {
    const src = read(f);
    assert.ok(!src.includes('+ " $"'), `${f} : "$" dur banni`);
    assert.ok(src.includes("useCurrencySymbol()"), `${f} : devise du store`);
  }
});

test("dates FR partagées : helpers purs + 5 pages migrées", () => {
  assert.equal(formatDateFR("2026-09-14T10:00:00"), "14/09/2026");
  assert.equal(formatDateTimeFR("2026-09-14T10:05:00").slice(0, 10), "14/09/2026");
  assert.equal(formatDateFR(""), "—");
  assert.equal(formatDateFR("nimporte-quoi"), "—");
  assert.equal(formatDateTimeFR(null), "—");
  for (const f of [
    "src/admin/CustomersPage.tsx",
    "src/admin/ShippedDeliveredPage.tsx",
    "src/admin/ErrorMonitoringPage.tsx",
    "src/admin/OrdersPage.tsx",
    "src/admin/FinancesPage.tsx",
  ]) {
    const src = read(f);
    assert.ok(
      src.includes("../utils/dates"),
      `${f} : helpers partagés`,
    );
  }
  for (const f of [
    "src/admin/CustomersPage.tsx",
    "src/admin/ShippedDeliveredPage.tsx",
  ]) {
    const src = read(f);
    assert.ok(
      !src.includes("toLocaleDateString(") && !src.includes("toLocaleString("),
      `${f} : plus de format local`,
    );
  }
});

// ─── Item 8 : CA unique + palette + badge ──────────────────────────────────

test("palette : verts et ambres dupliqués éliminés", () => {
  const bg = (s: string) => ORDER_STATUS_LABEL[s].bg;
  assert.notEqual(bg("paid"), bg("shipped"), "paid ≠ shipped");
  assert.notEqual(bg("shipped"), bg("delivered"), "shipped ≠ delivered");
  assert.notEqual(bg("paid"), bg("delivered"), "paid ≠ delivered");
  assert.notEqual(bg("pending"), bg("on_hold"), "pending ≠ on_hold");
  assert.notEqual(bg("pending"), bg("partial"), "pending ≠ partial");
  assert.notEqual(bg("on_hold"), bg("partial"), "on_hold ≠ partial");
});

test("Finances : badge canonique (fini le span recodé)", () => {
  const src = read("src/admin/FinancesPage.tsx");
  assert.ok(
    src.includes("<OrderStatusBadge status={selected.status}"),
    "badge canonique",
  );
  assert.ok(
    !src.includes("ORDER_STATUS_LABEL[selected.status]"),
    "plus de span manuel",
  );
});

test("dashboard : carte CA net libellée (même règle que Rapports)", () => {
  const src = read("src/admin/AdminDashboardNew.tsx");
  assert.ok(src.includes('label="CA net"'), "label CA net");
  assert.ok(
    !src.includes('label="CA estimé"'),
    "ancien label brut supprimé",
  );
  const rep = read("src/admin/ReportsPage.tsx");
  assert.ok(rep.includes("sumRevenue("), "rapports : règle partagée");
  assert.ok(
    !rep.includes("NON_REVENUE_STATUSES"),
    "rapports : plus de set local",
  );
});
