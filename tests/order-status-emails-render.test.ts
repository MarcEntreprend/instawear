// tests/order-status-emails-render.test.ts
// Rendu RÉEL des 10 builders canoniques (import direct — module pur, sans
// Deno) avec données réalistes + cas limites (XSS, montants, CTA, footer).
// Si ce test passe, chaque email qui part est bien formé.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  esc,
  STEP_INDEX,
  prefKeyFor,
  wantsStatusEmail,
  buildInProductionEmail,
  buildPartialEmail,
  buildShippedEmail,
  buildDeliveredEmail,
  buildFailedEmail,
  buildCancelledEmail,
  buildOnHoldEmail,
  buildApprovalEmail,
  buildRefundedEmail,
  buildReturnedEmail,
} from "../supabase/functions/_shared/orderStatusEmails.ts";

const ORDER: any = {
  id: "ORD-2026-512042",
  client_name: "Winnie Daniel",
  client_email: "abc@gmail.com",
  shipping_address_phone: "17329521775",
  shipping_address_address: "8298 NW 21st St #007-000489",
  shipping_address_city: "Miami",
  shipping_address_zip: "33122",
  shipping_address_country: "US",
  shipping_address_state_code: "FL",
  shipping_cost: 4.69,
  shipping_method_name: "Standard",
  shipping_delivery_estimate: "3-5 days",
  total_amount: 32.93,
};

const ITEMS: any[] = [
  {
    product_title: "Dad hat Golf, RV, Fishing Retirement",
    product_image: "https://img.test/hat.png",
    selected_color: "#000080",
    selected_size: "One size",
    quantity: 1,
    unit_price: 28.24,
  },
];

const SHIPMENTS: any[] = [
  {
    carrier: "FEDEX",
    tracking_number: "0000000000",
    tracking_url: "https://fedex.test/0000000000",
    item_count: 1,
  },
];

const ALL = [
  ["in_production", buildInProductionEmail(ORDER, ITEMS, "$", {})],
  ["partial", buildPartialEmail(ORDER, ITEMS, "$", SHIPMENTS)],
  ["shipped", buildShippedEmail(ORDER, "$", SHIPMENTS)],
  ["delivered", buildDeliveredEmail(ORDER, ITEMS, "$")],
  ["failed", buildFailedEmail(ORDER, ITEMS, "$", "Printfile invalid")],
  ["cancelled", buildCancelledEmail(ORDER, ITEMS, "$", "Supplier cancel")],
  ["on_hold", buildOnHoldEmail(ORDER, "$", "Cost review")],
  ["approval", buildApprovalEmail(ORDER, "$", "Design review")],
  ["refunded", buildRefundedEmail(ORDER, ITEMS, "$", "13.50")],
  ["returned", buildReturnedEmail(ORDER, ITEMS, "$", "Moved")],
] as const;

test("10 builders rendent sujet + html non vides", () => {
  assert.equal(ALL.length, 10);
  for (const [kind, built] of ALL) {
    assert.ok(built.subject.length > 5, kind);
    assert.ok(built.html.includes("<!DOCTYPE html>"), kind);
    assert.ok(built.html.includes(ORDER.id), `${kind}: order id`);
  }
});

test("aucun undefined/NaN/[object Object] dans aucun rendu", () => {
  for (const [kind, built] of ALL) {
    for (const bad of ["undefined", "NaN", "[object Object]"]) {
      assert.ok(!built.html.includes(bad), `${kind} contient ${bad}`);
    }
  }
});

test("CTA ?order= + lien prefs + montants corrects partout", () => {
  for (const [kind, built] of ALL) {
    assert.ok(
      built.html.includes(`?order=${encodeURIComponent(ORDER.id)}`),
      `${kind}: CTA`,
    );
    assert.ok(
      built.html.includes("/unsubscribe?email=abc%40gmail.com"),
      `${kind}: lien prefs`,
    );
  }
  const [, partial] = ALL.find(([k]) => k === "partial")!;
  assert.ok(partial.html.includes("0000000000"), "partial: tracking");
  const [, refunded] = ALL.find(([k]) => k === "refunded")!;
  assert.ok(refunded.html.includes("13.50"), "refunded: montant");
  const [, prod] = ALL.find(([k]) => k === "in_production")!;
  assert.ok(prod.html.includes("28.24 $"), "production: prix ligne");
  assert.ok(prod.html.includes("32.93 $"), "production: total");
  assert.ok(prod.html.includes("4.69 $"), "production: port");
});

test("XSS neutralisée dans titres/noms/raisons", () => {
  const evil = {
    ...ORDER,
    client_name: `<img src=x onerror=alert(1)>`,
  };
  const evilItems = [
    { ...ITEMS[0], product_title: `<script>alert(2)</script>` },
  ];
  const built = buildCancelledEmail(evil, evilItems, "$", "<b>br</b>");
  assert.ok(!built.html.includes("<script>"));
  assert.ok(!built.html.includes("<img src=x"));
  assert.ok(built.html.includes("&lt;script&gt;"));
  assert.equal(esc("<a>&\"'"), "&lt;a&gt;&amp;&quot;&#39;");
});

test("STEP_INDEX couvre les 10 statuts (front/back alignés)", () => {
  for (const s of [
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
  ]) {
    assert.ok(typeof STEP_INDEX[s] === "number", s);
  }
});

test("prefs : confirmed/shipping filtrés, essentiels toujours", () => {
  assert.equal(prefKeyFor("confirmed"), "order_confirmation");
  assert.equal(prefKeyFor("shipped"), "shipping_update");
  assert.equal(prefKeyFor("partial"), "shipping_update");
  assert.equal(prefKeyFor("delivered"), "shipping_update");
  assert.equal(prefKeyFor("in_production"), "shipping_update");
  for (const k of ["failed", "cancelled", "on_hold", "refunded", "returned"] as const) {
    assert.equal(prefKeyFor(k), null, k);
  }
  assert.equal(
    wantsStatusEmail({ order_confirmation: false }, "confirmed"),
    false,
  );
  assert.equal(
    wantsStatusEmail({ shipping_update: false }, "shipped"),
    false,
  );
  assert.equal(wantsStatusEmail({ shipping_update: false }, "cancelled"), true);
  assert.equal(wantsStatusEmail(null, "shipped"), true);
  assert.equal(wantsStatusEmail(undefined, "confirmed"), true);
});
