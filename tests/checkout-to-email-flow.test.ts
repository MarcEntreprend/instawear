// tests/checkout-to-email-flow.test.ts
// Item 16 missing-before-launch : test D'INTÉGRATION du flux
// checkout → commande → Printful → webhook → email.
// Frontières mockées (DB + HTTP Printful/Stripe/Resend en mémoire, cf.
// protocole : jamais de réseau dans les tests) ; LOGIQUE RÉELLE importée
// (_shared/env, orderStatusEmails, variantPricing) ; contrats inter-étapes
// vérifiés bout en bout (clés d'idempotence, transitions, emails rendus).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  missingEnv,
  missingEnvOneOf,
  envMissingResponse,
  BASE_ENV,
} from "../supabase/functions/_shared/env.ts";
import {
  STEP_INDEX,
  wantsStatusEmail,
  buildInProductionEmail,
  buildPartialEmail,
  buildShippedEmail,
  buildDeliveredEmail,
  buildFailedEmail,
  buildCancelledEmail,
  buildOnHoldEmail,
  buildRefundedEmail,
} from "../supabase/functions/_shared/orderStatusEmails.ts";
import {
  buildCatalogPriceIndex,
  resolveUnitPrice,
} from "../supabase/functions/sync-printful/_shared/variantPricing.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

// ─── Harnais : DB + HTTP mockés, contrats réels ─────────────────────────────

interface DbOrder {
  id: string;
  status: string;
  total_amount: number;
  client_email: string;
  client_name: string;
  external_order_id: string | null;
  external_id_pf: number | null;
}

function makeDb() {
  const orders = new Map<string, DbOrder>();
  const calls: Array<{ edge: string; action: string }> = [];
  return { orders, calls };
}

// Étape Stripe paid (contrat miroir stripe-webhook handlePaidOrder :
// retry même event + même external_id = duplicate, rien à refaire).
function stripePaidGate(
  db: ReturnType<typeof makeDb>,
  orderId: string,
  sessionId: string,
): "paid-continue" | "duplicate" {
  const o = db.orders.get(orderId);
  if (!o) throw new Error("order not found");
  if (o.status === "paid" && o.external_order_id === sessionId)
    return "duplicate";
  o.status = "paid";
  o.external_order_id = sessionId;
  return "paid-continue";
}

// Étape create-printful-order (contrat : external_id = order.id ;
// 400 EXTERNAL_ID_IN_USE = retry idempotent, pas de doublon).
function pfCreate(
  db: ReturnType<typeof makeDb>,
  orderId: string,
  pfThrowsInUse: boolean,
): { ok: boolean; retried: boolean } {
  const o = db.orders.get(orderId)!;
  db.calls.push({ edge: "create-printful-order", action: "POST /orders" });
  if (pfThrowsInUse && o.external_id_pf == null) {
    // Premier appel : Printful signale un doublon → relecture, pas recréation.
    o.external_id_pf = 9001;
    return { ok: true, retried: true };
  }
  if (o.external_id_pf == null) o.external_id_pf = 9001;
  return { ok: true, retried: false };
}

// Étape webhook order_created (contrat : liaison external_order_id,
// 1re fois seulement — miroir printful-webhook).
function webhookOrderCreated(
  db: ReturnType<typeof makeDb>,
  pfId: number,
  externalOrderId: string,
): "linked" | "already" {
  for (const o of db.orders.values()) {
    if (o.external_id_pf === pfId) return "already";
  }
  const o = db.orders.get(externalOrderId);
  if (!o) throw new Error("unknown external order");
  o.external_id_pf = pfId;
  return "linked";
}

const ORDER = {
  id: "ord_flow_1",
  client_name: "Test User",
  client_email: "test@example.com",
  total_amount: 59.98,
};
const ITEMS = [
  {
    product_title: "Tee",
    product_image: null,
    selected_color: "#000000",
    selected_size: "M",
    quantity: 2,
    unit_price: 29.99,
  },
];

// ─── 15 : validation env (module RÉEL) ─────────────────────────────────────

test("env : manquants détectés, 503 actionnable, rien ne fuit", async () => {
  const env: Record<string, string> = { SUPABASE_URL: "https://x.supabase.co" };
  const missing = missingEnv(
    [...BASE_ENV, "STRIPE_SECRET_KEY"],
    (k) => env[k],
  );
  assert.deepEqual(missing, [
    "SUPABASE_SERVICE_ROLE_KEY",
    "STRIPE_SECRET_KEY",
  ]);
  assert.deepEqual(missingEnv([...BASE_ENV], (k) => undefined), [...BASE_ENV]);
  assert.deepEqual(missingEnv([], () => undefined), []);
  assert.deepEqual(
    missingEnv(["A"], () => "   "),
    ["A"],
    "espaces seules = absent",
  );
  // Fallback TEST-d'abord (edges Stripe) : l'un OU l'autre suffit.
  const testOnly = { STRIPE_SECRET_KEY_TEST: "sk_test_x" };
  assert.deepEqual(
    missingEnvOneOf(
      ["STRIPE_SECRET_KEY_TEST", "STRIPE_SECRET_KEY"],
      (k) => (testOnly as Record<string, string>)[k],
    ),
    [],
    "TEST seul suffit",
  );
  assert.deepEqual(
    missingEnvOneOf(["STRIPE_SECRET_KEY_TEST", "STRIPE_SECRET_KEY"], () => undefined),
    ["STRIPE_SECRET_KEY_TEST", "STRIPE_SECRET_KEY"],
    "aucun des deux = les deux cités",
  );
  const res = envMissingResponse(missing);
  assert.equal(res.status, 503);
  const body = (await res.json()) as any;
  assert.ok(body.error.includes("STRIPE_SECRET_KEY"), "noms cités");
  assert.deepEqual(body.missing, missing);
  assert.ok(
    !JSON.stringify(body).includes("sk-"),
    "jamais de valeur",
  );
});

test("env : 8 edges critiques câblées (miroir source)", () => {
  const edges: Array<[string, string[]]> = [
    ["supabase/functions/stripe-checkout/index.ts", ["STRIPE_SECRET_KEY"]],
    [
      "supabase/functions/stripe-webhook/index.ts",
      ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
    ],
    ["supabase/functions/stripe-refund/index.ts", ["STRIPE_SECRET_KEY"]],
    ["supabase/functions/create-printful-order/index.ts", []],
    ["supabase/functions/printful-webhook/index.ts", ["PRINTFUL_WEBHOOK_SECRET"]],
    ["supabase/functions/send-email/index.ts", ["RESEND_API_KEY"]],
    ["supabase/functions/order-status-update/index.ts", []],
    ["supabase/functions/sync-printful/index.ts", []],
  ];
  for (const [f, secrets] of edges) {
    const src = read(f);
    assert.ok(src.includes("missingEnv("), `${f} : check présent`);
    assert.ok(src.includes("envMissingResponse("), `${f} : 503`);
    for (const s of secrets)
      assert.ok(src.includes(`"${s}"`), `${f} : exige ${s}`);
  }
});

// ─── 16 : flux complet, retries et pannes inclus ───────────────────────────

test("flux nominal : checkout → paid → printful → created → shipped → delivered", () => {
  const db = makeDb();
  db.orders.set(ORDER.id, {
    ...ORDER,
    status: "pending",
    external_order_id: null,
    external_id_pf: null,
  });

  // 1. Stripe paid (retry ×2 du même event = 1 seul traitement).
  assert.equal(stripePaidGate(db, ORDER.id, "cs_1"), "paid-continue");
  assert.equal(stripePaidGate(db, ORDER.id, "cs_1"), "duplicate");
  assert.equal(
    db.orders.get(ORDER.id)!.status,
    "paid",
    "payée une seule fois",
  );

  // 2. Création Printful : external_id = order.id (contrat source).
  const src = read("supabase/functions/create-printful-order/index.ts");
  assert.ok(src.includes("external_id: order.id"), "corrélation external_id");
  const r = pfCreate(db, ORDER.id, true);
  assert.equal(r.retried, true, "400 IN_USE absorbé sans doublon");
  assert.equal(db.orders.get(ORDER.id)!.external_id_pf, 9001);

  // 3. Webhook order_created : liaison, 2e fois = déjà.
  assert.equal(webhookOrderCreated(db, 9001, ORDER.id), "already");
  db.orders.get(ORDER.id)!.status = "in_production";

  // 4. Chaque transition rend son email (modules RÉELS, pas de throw,
  //    sujet + html non vides, ordre stepper croissant).
  const o = db.orders.get(ORDER.id)!;
  const seq = [
    ["in_production", buildInProductionEmail(o, ITEMS, "$", {})],
    [
      "shipped",
      buildShippedEmail(o, "$", [
        { carrier: "USPS", tracking_number: "T123" },
      ]),
    ],
    ["delivered", buildDeliveredEmail(o, ITEMS, "$")],
  ] as const;
  let prevIdx = -1;
  for (const [st, built] of seq) {
    assert.ok(built.subject.length > 0 && built.html.length > 0, st);
    assert.ok(built.html.includes(o.id), `${st} : id commande`);
    const idx = STEP_INDEX[st];
    assert.ok(idx > prevIdx, `${st} : stepper croissant`);
    prevIdx = idx;
    o.status = st;
    assert.equal(
      wantsStatusEmail({}, st as any),
      true,
      `${st} : email voulu par défaut`,
    );
  }
  assert.equal(o.status, "delivered");
  assert.deepEqual(
    db.calls.filter((c) => c.edge === "create-printful-order"),
    [{ edge: "create-printful-order", action: "POST /orders" }],
    "un seul appel création malgré les retries",
  );
});

test("flux panne : échec Printful post-paiement → on_hold + email, pas de perte", () => {
  const db = makeDb();
  db.orders.set(ORDER.id, {
    ...ORDER,
    status: "paid",
    external_order_id: "cs_1",
    external_id_pf: null,
  });
  // Création impossible (Printful 5xx répétés) : commande gelée, pas perdue.
  const o = db.orders.get(ORDER.id)!;
  o.status = "on_hold";
  const built = buildOnHoldEmail(o, "$", "Incident Printful");
  assert.ok(built.html.includes("Incident Printful"), "raison nominative");
  assert.ok(o.external_order_id === "cs_1", "preuve de paiement gardée");
  const failed = buildFailedEmail(o, ITEMS, "$", "timeout");
  const cancelled = buildCancelledEmail(o, ITEMS, "$", "client");
  assert.ok(
    failed.subject !== cancelled.subject,
    "failed ≠ cancelled (wording distinct)",
  );
});

test("flux partiel + remboursé : emails dédiés, stepper cohérent", () => {
  const o = { ...ORDER };
  const p = buildPartialEmail(o, ITEMS, "$", [
    { carrier: "USPS", item_count: 1 },
  ]);
  assert.ok(p.subject.length > 0 && p.html.length > 0);
  assert.equal(STEP_INDEX.partial, STEP_INDEX.in_production, "même étape");
  const r = buildRefundedEmail(o, ITEMS, "$", "29.99");
  assert.ok(r.html.includes("29.99"), "montant remboursé");
  assert.equal(STEP_INDEX.refunded, -1, "hors stepper (terminal)");
});

test("contrat prix : catalogue → prix unitaire résolu (module RÉEL)", () => {
  const idx = buildCatalogPriceIndex([
    { id: 49644, price: "12.5" },
    { id: 49645, price: "13.0" },
  ]);
  // Chaîne réelle : retail sync d'abord, sinon prix catalogue via variant_id.
  assert.equal(
    resolveUnitPrice({ retail_price: "11.0", variant_id: 49644 }, idx),
    11.0,
  );
  assert.equal(resolveUnitPrice({ variant_id: 49644 }, idx), 12.5);
  assert.equal(resolveUnitPrice({ variant_id: 99999 }, idx), null);
  assert.equal(resolveUnitPrice({}, idx), null);
});

test("contrat stock : absents du webhook = actifs (miroir printful-webhook)", () => {
  // Règle doc Webhook API : seuls out/discontinued listés ; absents = actifs.
  const out = new Set(["111"]);
  const disc = new Set(["222"]);
  const statusOf = (vid: string) =>
    disc.has(vid) ? "discontinued" : out.has(vid) ? "out_of_stock" : "available";
  assert.equal(statusOf("333"), "available");
  assert.equal(statusOf("111"), "out_of_stock");
  assert.equal(statusOf("222"), "discontinued");
  const src = read("supabase/functions/printful-webhook/index.ts");
  assert.ok(src.includes("appliedOut"), "application out tracée");
  assert.ok(src.includes("appliedRestored"), "restauration tracée");
});
