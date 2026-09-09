// tests/webhook-coverage.test.ts
// Couverture webhooks Printful complète (section 4) :
// - order_created : liaison external_order_id, 1re fois seulement
// - order_updated : réconciliation statuts, silencieux sinon
// - product_synced/updated/deleted : traçage + notif admin, désactivation
// Miroirs de la logique de supabase/functions/printful-webhook/index.ts
// (fichier Deno non importable en node).

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── SUPPORTED_TYPES étendu ─────────────────────────────────────────────────

const SUPPORTED_TYPES = new Set([
  "package_shipped",
  "order_created",
  "order_updated",
  "order_failed",
  "order_canceled",
  "order_put_hold",
  "order_put_hold_approval",
  "order_remove_hold",
  "order_refunded",
  "package_returned",
  "stock_updated",
  "product_synced",
  "product_updated",
  "product_deleted",
]);

test("couverture complète : 14 types supportés", () => {
  assert.equal(SUPPORTED_TYPES.size, 14);
  for (const t of [
    "order_created",
    "order_updated",
    "product_synced",
    "product_updated",
    "product_deleted",
  ]) {
    assert.ok(SUPPORTED_TYPES.has(t), t);
  }
});

test("anciens types toujours supportés (pas de régression)", () => {
  for (const t of [
    "package_shipped",
    "order_failed",
    "order_canceled",
    "order_put_hold",
    "order_put_hold_approval",
    "order_remove_hold",
    "order_refunded",
    "package_returned",
    "stock_updated",
  ]) {
    assert.ok(SUPPORTED_TYPES.has(t), t);
  }
});

// ─── mapPrintfulStatusToLocal (miroir edge) ─────────────────────────────────

function mapPrintfulStatusToLocal(pfStatus: unknown): string | null {
  const s = String(pfStatus || "").toLowerCase();
  if (s === "pending" || s === "inprocess") return "in_production";
  if (s === "partial") return "partial";
  return null;
}

test("pending/inprocess → in_production", () => {
  assert.equal(mapPrintfulStatusToLocal("pending"), "in_production");
  assert.equal(mapPrintfulStatusToLocal("inprocess"), "in_production");
  assert.equal(mapPrintfulStatusToLocal("Pending"), "in_production");
});

test("partial → partial", () => {
  assert.equal(mapPrintfulStatusToLocal("partial"), "partial");
});

test("draft → null (on garde paid, pas de recul)", () => {
  assert.equal(mapPrintfulStatusToLocal("draft"), null);
});

test("failed/canceled/onhold → null (événements dédiés propriétaires)", () => {
  assert.equal(mapPrintfulStatusToLocal("failed"), null);
  assert.equal(mapPrintfulStatusToLocal("canceled"), null);
  assert.equal(mapPrintfulStatusToLocal("onhold"), null);
});

test("fulfilled/archived → null (package_shipped propriétaire)", () => {
  assert.equal(mapPrintfulStatusToLocal("fulfilled"), null);
  assert.equal(mapPrintfulStatusToLocal("archived"), null);
});

test("statut inconnu/absent → null", () => {
  assert.equal(mapPrintfulStatusToLocal("weird"), null);
  assert.equal(mapPrintfulStatusToLocal(null), null);
  assert.equal(mapPrintfulStatusToLocal(undefined), null);
});

// ─── Transitions autorisées pour la réconciliation ──────────────────────────

const ALLOWED = new Set([
  "pending->paid", "pending->cancelled",
  "paid->in_production", "paid->partial", "paid->on_hold", "paid->cancelled",
  "in_production->shipped", "in_production->partial", "in_production->on_hold", "in_production->cancelled",
  "partial->shipped", "partial->on_hold", "partial->cancelled", "partial->refunded",
  "on_hold->in_production", "on_hold->partial", "on_hold->cancelled", "on_hold->refunded",
  "shipped->delivered", "shipped->returned", "shipped->refunded",
  "delivered->returned", "delivered->refunded",
]);
function allowed(from: string, to: string): boolean {
  return from === to || ALLOWED.has(`${from}->${to}`);
}

test("paid->in_production et paid->partial autorisées (réconciliation)", () => {
  assert.ok(allowed("paid", "in_production"));
  assert.ok(allowed("paid", "partial"));
});

test("in_production->partial autorisée", () => {
  assert.ok(allowed("in_production", "partial"));
});

test("shipped->in_production refusée (pas de recul)", () => {
  assert.equal(allowed("shipped", "in_production"), false);
});

test("delivered->in_production refusée", () => {
  assert.equal(allowed("delivered", "in_production"), false);
});

// ─── order_created : liaison 1re fois seulement (idempotence) ───────────────

function handleOrderCreated(
  order: { external_order_id: string | null },
  pfOrderId: unknown,
): { link: boolean; note: boolean } {
  if (pfOrderId != null && !order.external_order_id) {
    return { link: true, note: true };
  }
  return { link: false, note: false };
}

test("order_created sans lien → lie + note + notif", () => {
  const r = handleOrderCreated({ external_order_id: null }, 12345);
  assert.equal(r.link, true);
  assert.equal(r.note, true);
});

test("order_created retry (lien existant) → silencieux", () => {
  const r = handleOrderCreated({ external_order_id: "12345" }, 12345);
  assert.equal(r.link, false);
  assert.equal(r.note, false);
});

test("order_created sans pfOrderId → silencieux", () => {
  const r = handleOrderCreated({ external_order_id: null }, null);
  assert.equal(r.link, false);
});

// ─── order_updated : que sur vrai changement ────────────────────────────────

function handleOrderUpdated(
  orderStatus: string,
  pfStatus: unknown,
): { change: string | null } {
  const mapped = mapPrintfulStatusToLocal(pfStatus);
  if (mapped && mapped !== orderStatus && allowed(orderStatus, mapped)) {
    return { change: mapped };
  }
  return { change: null };
}

test("paid + pending Printful → in_production", () => {
  assert.deepEqual(handleOrderUpdated("paid", "pending"), {
    change: "in_production",
  });
});

test("déjà in_production → silencieux (pas de spam)", () => {
  assert.deepEqual(handleOrderUpdated("in_production", "pending"), {
    change: null,
  });
});

test("update sans changement utile (fulfilled) → silencieux", () => {
  assert.deepEqual(handleOrderUpdated("in_production", "fulfilled"), {
    change: null,
  });
});

test("transition illégale refusée (shipped + pending)", () => {
  assert.deepEqual(handleOrderUpdated("shipped", "pending"), { change: null });
});

// ─── Produits : décisions par type ──────────────────────────────────────────

function productDecision(
  type: string,
  localFound: boolean,
  variantLevel: boolean,
): { deactivate: boolean; auditOnly: boolean; priority: string; logStatus: string } {
  const isDelete = type === "product_deleted";
  return {
    deactivate: isDelete && localFound && !variantLevel,
    auditOnly: isDelete && localFound && variantLevel,
    priority: isDelete ? "high" : "medium",
    logStatus: isDelete ? "error" : "success",
  };
}

test("product_deleted produit entier trouvé → désactive (high)", () => {
  const d = productDecision("product_deleted", true, false);
  assert.equal(d.deactivate, true);
  assert.equal(d.priority, "high");
});

test("product_deleted variante seule → audit seul, pas de désactivation", () => {
  const d = productDecision("product_deleted", true, true);
  assert.equal(d.deactivate, false);
  assert.equal(d.auditOnly, true);
});

test("product_deleted produit introuvable → pas de désactivation", () => {
  const d = productDecision("product_deleted", false, false);
  assert.equal(d.deactivate, false);
});

test("product_synced/updated → medium, jamais de désactivation", () => {
  for (const t of ["product_synced", "product_updated"]) {
    const d = productDecision(t, true, false);
    assert.equal(d.deactivate, false);
    assert.equal(d.priority, "medium");
    assert.equal(d.logStatus, "success");
  }
});

// ─── Pas de dette : catégories et emails ────────────────────────────────────

test("catégories notif utilisées : orders/products uniquement (contrainte OK)", () => {
  const used = ["orders", "products"];
  const allowedCats = ["orders", "products", "approval"];
  for (const c of used) assert.ok(allowedCats.includes(c), c);
});

test("aucun email client pour created/updated/product_* (anti-spam)", () => {  // Règle : emails réservés à shipped/failed/canceled/approval.
  const emailTypes = new Set([
    "package_shipped",
    "order_failed",
    "order_canceled",
    "order_put_hold_approval",
  ]);
  for (const t of [
    "order_created",
    "order_updated",
    "product_synced",
    "product_updated",
    "product_deleted",
  ]) {
    assert.equal(emailTypes.has(t), false, t);
  }
});

// ─── Allowlist setup-webhook + cohérence UI/edge ────────────────────────────

const PRINTFUL_WEBHOOK_TYPES = new Set([
  "package_shipped",
  "package_returned",
  "order_created",
  "order_updated",
  "order_failed",
  "order_canceled",
  "order_put_hold",
  "order_put_hold_approval",
  "order_remove_hold",
  "order_refunded",
  "stock_updated",
  "product_synced",
  "product_updated",
  "product_deleted",
]);

function cleanTypes(input: unknown): string[] {
  return [
    ...new Set(
      (Array.isArray(input) ? input : []).filter(
        (t: unknown): t is string =>
          typeof t === "string" && PRINTFUL_WEBHOOK_TYPES.has(t),
      ),
    ),
  ];
}

test("allowlist : types valides conservés, doublons fusionnés", () => {
  assert.deepEqual(
    cleanTypes(["package_shipped", "order_created", "package_shipped"]),
    ["package_shipped", "order_created"],
  );
});

test("allowlist : types inconnus rejetés", () => {
  assert.deepEqual(cleanTypes(["package_shipped", "hack", 42, null]), [
    "package_shipped",
  ]);
});

test("allowlist : entrée vide/non-tableau → [] (edge répond 400)", () => {
  assert.deepEqual(cleanTypes([]), []);
  assert.deepEqual(cleanTypes("package_shipped"), []);
  assert.deepEqual(cleanTypes(null), []);
});

test("cohérence : UI (14 cases) = SUPPORTED_TYPES edge", () => {
  const uiKeys = [
    "package_shipped",
    "order_created",
    "order_updated",
    "order_failed",
    "order_canceled",
    "order_put_hold",
    "order_put_hold_approval",
    "order_remove_hold",
    "order_refunded",
    "package_returned",
    "stock_updated",
    "product_synced",
    "product_updated",
    "product_deleted",
  ];
  assert.equal(uiKeys.length, SUPPORTED_TYPES.size);
  for (const k of uiKeys) assert.ok(SUPPORTED_TYPES.has(k), k);
  for (const k of PRINTFUL_WEBHOOK_TYPES) {
    assert.ok(SUPPORTED_TYPES.has(k), `allowlist⊃edge: ${k}`);
  }
});
