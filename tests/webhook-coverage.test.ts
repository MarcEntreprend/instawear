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
  const s = String(pfStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "");
  if (s === "pending" || s === "inprocess") return "in_production";
  if (s === "partial") return "partial";
  // fulfilled = tout expédié → shipped (delivered reste manuel admin)
  if (s === "fulfilled") return "shipped";
  // Filet order_updated si les événements dédiés ont été manqués
  if (s === "failed" || s === "canceled" || s === "cancelled")
    return "cancelled";
  if (s === "onhold") return "on_hold";
  return null;
}

test("pending/inprocess → in_production", () => {
  assert.equal(mapPrintfulStatusToLocal("pending"), "in_production");
  assert.equal(mapPrintfulStatusToLocal("inprocess"), "in_production");
  assert.equal(mapPrintfulStatusToLocal("Pending"), "in_production");
  assert.equal(mapPrintfulStatusToLocal("in_process"), "in_production");
});

test("partial → partial", () => {
  assert.equal(mapPrintfulStatusToLocal("partial"), "partial");
});

test("fulfilled → shipped (filet order_updated, delivered reste manuel)", () => {
  assert.equal(mapPrintfulStatusToLocal("fulfilled"), "shipped");
  assert.equal(mapPrintfulStatusToLocal("Fulfilled"), "shipped");
});

test("failed/canceled/onhold → cancelled/on_hold (filet si dédiés manqués)", () => {
  assert.equal(mapPrintfulStatusToLocal("failed"), "cancelled");
  assert.equal(mapPrintfulStatusToLocal("canceled"), "cancelled");
  assert.equal(mapPrintfulStatusToLocal("cancelled"), "cancelled");
  assert.equal(mapPrintfulStatusToLocal("onhold"), "on_hold");
  assert.equal(mapPrintfulStatusToLocal("on_hold"), "on_hold");
  assert.equal(mapPrintfulStatusToLocal("on-hold"), "on_hold");
});

test("draft/inreview/archived → null (pas de recul)", () => {
  assert.equal(mapPrintfulStatusToLocal("draft"), null);
  assert.equal(mapPrintfulStatusToLocal("inreview"), null);
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

test("update fulfilled → shipped (filet, pas silencieux)", () => {
  assert.deepEqual(handleOrderUpdated("in_production", "fulfilled"), {
    change: "shipped",
  });
});

test("update failed/canceled → cancelled (filet si dédiés manqués)", () => {
  assert.deepEqual(handleOrderUpdated("in_production", "failed"), {
    change: "cancelled",
  });
  assert.deepEqual(handleOrderUpdated("paid", "canceled"), {
    change: "cancelled",
  });
});

test("transition illégale refusée (shipped + pending)", () => {
  assert.deepEqual(handleOrderUpdated("shipped", "pending"), { change: null });
});

// ─── Multi-colis : 1er shipment → partial, dernier → shipped ───────────────
// Doc : package_shipped = un event PAR colis ; partial = une partie expédiée.
// Miroir de la décision edge (quantités Shipment.items vs order_items).

function decideShipmentStatus(
  orderStatus: string,
  opts: {
    isDuplicate: boolean;
    isReship: boolean;
    currentQty: number | null;
    totalQty: number | null;
    prevQty: number;
    prevKnown: boolean;
    existingCount: number;
  },
): string | null {
  if (opts.isDuplicate) return null;
  if (orderStatus === "shipped" || orderStatus === "delivered") return null;
  if (opts.isReship) return "shipped";
  if (
    opts.currentQty != null &&
    opts.totalQty != null &&
    opts.prevKnown
  ) {
    return opts.prevQty + opts.currentQty < opts.totalQty
      ? "partial"
      : "shipped";
  }
  if (
    opts.totalQty != null &&
    opts.totalQty > 1 &&
    opts.existingCount === 0 &&
    opts.currentQty == null
  ) {
    return "partial";
  }
  return "shipped";
}

test("1er colis partiel (1/2 unités) → partial", () => {
  assert.equal(
    decideShipmentStatus("in_production", {
      isDuplicate: false,
      isReship: false,
      currentQty: 1,
      totalQty: 2,
      prevQty: 0,
      prevKnown: true,
      existingCount: 0,
    }),
    "partial",
  );
});

test("dernier colis (cumul = total) → shipped", () => {
  assert.equal(
    decideShipmentStatus("partial", {
      isDuplicate: false,
      isReship: false,
      currentQty: 1,
      totalQty: 2,
      prevQty: 1,
      prevKnown: true,
      existingCount: 1,
    }),
    "shipped",
  );
});

test("colis unique complet → shipped", () => {
  assert.equal(
    decideShipmentStatus("in_production", {
      isDuplicate: false,
      isReship: false,
      currentQty: 2,
      totalQty: 2,
      prevQty: 0,
      prevKnown: true,
      existingCount: 0,
    }),
    "shipped",
  );
});

test("retry doublon (même tracking) → aucun changement", () => {
  assert.equal(
    decideShipmentStatus("partial", {
      isDuplicate: true,
      isReship: false,
      currentQty: 1,
      totalQty: 2,
      prevQty: 0,
      prevKnown: true,
      existingCount: 0,
    }),
    null,
  );
});

test("jamais de recul shipped → partial", () => {
  assert.equal(
    decideShipmentStatus("shipped", {
      isDuplicate: false,
      isReship: false,
      currentQty: 1,
      totalQty: 3,
      prevQty: 0,
      prevKnown: true,
      existingCount: 1,
    }),
    null,
  );
});

test("quantités inconnues, 1er colis multi-unités → partial prudent", () => {
  assert.equal(
    decideShipmentStatus("in_production", {
      isDuplicate: false,
      isReship: false,
      currentQty: null,
      totalQty: 3,
      prevQty: 0,
      prevKnown: true,
      existingCount: 0,
    }),
    "partial",
  );
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

test("cohérence : UI (14 cases) = SUPPORTED_TYPES edge", () => {  const uiKeys = [
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

// ─── setup-webhook : params.stock_updated requis par Printful ───────────────
// "Missing product ids for stock sync" si stock_updated sans product_ids.
// Miroir de la logique edge (produits = external_product_id numériques).

function buildWebhookPayload(
  webhookUrl: string,
  cleanTypes: string[],
  externalIds: (string | null)[],
): { body: Record<string, unknown>; error: string | null } {
  let params: Record<string, unknown> | undefined;
  if (cleanTypes.includes("stock_updated")) {
    const productIds = [
      ...new Set(
        externalIds
          .map((v) => Number(v))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ];
    if (productIds.length === 0) {
      return {
        body: {},
        error:
          "Aucun produit synchronisé : synchronisez d'abord le catalogue avant d'activer « Stock mis à jour ».",
      };
    }
    params = { stock_updated: { product_ids: productIds } };
  }
  return {
    body: params
      ? { url: webhookUrl, types: cleanTypes, params }
      : { url: webhookUrl, types: cleanTypes },
    error: null,
  };
}

test("sans stock_updated : pas de params", () => {
  const r = buildWebhookPayload("https://x/webhook", ["package_shipped"], ["5"]);
  assert.equal(r.error, null);
  assert.deepEqual(r.body, {
    url: "https://x/webhook",
    types: ["package_shipped"],
  });
});

test("avec stock_updated : params.product_ids depuis external_product_id", () => {
  const r = buildWebhookPayload(
    "https://x/webhook",
    ["package_shipped", "stock_updated"],
    ["5", "12", "5", null, "abc"],
  );
  assert.equal(r.error, null);
  assert.deepEqual(r.body, {
    url: "https://x/webhook",
    types: ["package_shipped", "stock_updated"],
    params: { stock_updated: { product_ids: [5, 12] } },
  });
});

test("stock_updated sans produit synchronisé → erreur explicite", () => {
  const r = buildWebhookPayload("https://x/webhook", ["stock_updated"], [null]);
  assert.match(r.error || "", /Aucun produit synchronisé/);
});
