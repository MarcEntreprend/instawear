// tests/admin-badges.test.ts
// Vague B1 : un seul poller de compteurs (useAdminBadges) + définitions
// uniques. Vérifie le contrat réel (constantes, store) et l'absence de
// pollings parallèles (miroirs source, style repo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ORDER_PENDING_STATUSES,
  ORDER_TOSHIP_STATUSES,
  resetAdminBadgesForTests,
  __adminBadgesInternalsForTests,
} from "../src/admin/useAdminBadges.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

// ─── Définitions uniques ────────────────────────────────────────────────────

test("statuts à traiter / à expédier figés et documentés", () => {
  assert.deepEqual([...ORDER_PENDING_STATUSES], ["pending"]);
  assert.deepEqual([...ORDER_TOSHIP_STATUSES], ["in_production", "partial"]);
});

test("store : état initial zéro, sans abonné sans requête", () => {
  resetAdminBadgesForTests();
  assert.equal(__adminBadgesInternalsForTests().listenerCount, 0);
});

// ─── Un seul poller ─────────────────────────────────────────────────────────

test("getUnreadCount n'est appelé que depuis le store partagé", () => {
  const callers: string[] = [];
  for (const f of [
    "src/admin/AdminSidebar.tsx",
    "src/admin/NotificationsPage.tsx",
    "src/hooks/useTabBadge.ts",
    "src/admin/AdminDashboardNew.tsx",
    "src/admin/OrdersPage.tsx",
  ]) {
    if (read(f).includes("getUnreadCount()")) callers.push(f);
  }
  assert.deepEqual(callers, [], `pollers restants : ${callers.join(", ")}`);
});

test("aucun setInterval de polling dans sidebar / page notifs / tabBadge", () => {
  for (const f of [
    "src/admin/AdminSidebar.tsx",
    "src/admin/NotificationsPage.tsx",
    "src/hooks/useTabBadge.ts",
  ]) {
    assert.ok(!read(f).includes("setInterval"), `${f} garde un intervalle`);
  }
  assert.ok(
    read("src/admin/useAdminBadges.ts").includes("setInterval"),
    "le poller unique doit exister",
  );
});

// ─── Câblage ────────────────────────────────────────────────────────────────

test("sidebar : badges commandes + mockups + monitoring", () => {
  const src = read("src/admin/AdminSidebar.tsx");
  assert.ok(src.includes("useAdminBadges(true)"));
  assert.ok(src.includes("badges.ordersPending"));
  assert.ok(src.includes("badges.mockupsOpen"));
  assert.ok(src.includes("badges.criticalErrors"));
});

test("NotificationsPage : compteurs partagés + dots globaux", () => {
  const src = read("src/admin/NotificationsPage.tsx");
  assert.ok(src.includes("useAdminBadges(true)"));
  assert.ok(src.includes("getUnreadBreakdown()"));
});

test("dashboard : plus de refetch conditionnel orderApi.list", () => {
  const src = read("src/admin/AdminDashboardNew.tsx");
  assert.ok(!src.includes("orderApi.list()"), "hack refetch toujours là");
  assert.ok(src.includes("sharedBadges.ordersPending"));
});

test("OrdersPage : en attente partagé + affichées", () => {
  const src = read("src/admin/OrdersPage.tsx");
  assert.ok(src.includes("pendingShared"));
  assert.ok(src.includes("en attente"));
});

test("Shipped : partielles libellées double-visibilité", () => {
  const src = read("src/admin/ShippedDeliveredPage.tsx");
  assert.ok(src.includes("restent aussi visibles dans Commandes"));
});

// ─── API sources ────────────────────────────────────────────────────────────

test("API : getStatusCounts / getUnreadBreakdown / getUnresolvedCriticalCount", () => {
  const src = read("src/api/supabaseApi.ts");
  assert.ok(src.includes("async getStatusCounts()"));
  assert.ok(src.includes("async getUnreadBreakdown()"));
  assert.ok(src.includes("async getUnresolvedCriticalCount()"));
});

// ─── Dots d'attention lignes ────────────────────────────────────────────────

test("ProductsPage : dot vignette + badge Mockups X/Y + filtre", () => {
  const src = read("src/admin/ProductsPage.tsx");
  assert.ok(src.includes("mockupCoverage("), "couverture réutilisée");
  assert.ok(src.includes("missingMockups"), "dot + badge conditionnels");
  assert.ok(src.includes("Mockups ${cov.imaged}/${cov.total}"));
  assert.ok(src.includes("onlyMissingMockups"), "filtre attention");
  assert.ok(src.includes("Sans mockups complets"));
});

test("ErrorMonitoringPage : dot critiques non résolues", () => {
  const src = read("src/admin/ErrorMonitoringPage.tsx");
  assert.ok(src.includes("Critique non résolue"));
});
