// tests/admin-order-notify.test.ts
// Logique pure de l'edge admin-order-notify (pas d'accès réseau/DB).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateNotifyBody,
  buildAdminOrderHtml,
  escapeHtml,
} from "../supabase/functions/admin-order-notify/_shared/notify.ts";

function validBody() {
  return {
    orderId: "ORD-2026-123456",
    name: "Jane Doe",
    phone: "+1000000",
    email: "jane@example.com",
    reception: "livraison",
    address: "1 Main St",
    city: "Miami",
    zip: "33101",
    country: "US",
    items: [
      { title: "Tee", size: "M", color: "#fff", quantity: 2, price: 19.99 },
    ],
    total: 39.98,
    currency: "USD",
  };
}

test("validateNotifyBody: accepte un payload valide", () => {
  const r = validateNotifyBody(validBody());
  assert.ok("order" in r);
  if ("order" in r) {
    assert.equal(r.order.orderId, "ORD-2026-123456");
    assert.equal(r.order.items.length, 1);
    assert.equal(r.order.reception, "livraison");
  }
});

test("validateNotifyBody: rejette l'invalide", () => {
  assert.ok("error" in validateNotifyBody(null));
  assert.ok("error" in validateNotifyBody({}));
  assert.ok("error" in validateNotifyBody({ ...validBody(), orderId: "" }));
  assert.ok("error" in validateNotifyBody({ ...validBody(), items: [] }));
  assert.ok(
    "error" in
      validateNotifyBody({
        ...validBody(),
        items: [{ title: "x", size: "", color: "", quantity: 0, price: 1 }],
      }),
  );
  assert.ok(
    "error" in
      validateNotifyBody({
        ...validBody(),
        items: [{ title: "x", size: "", color: "", quantity: 1, price: -5 }],
      }),
  );
  assert.ok("error" in validateNotifyBody({ ...validBody(), total: NaN }));
  assert.ok(
    "error" in validateNotifyBody({ ...validBody(), email: "pas-un-email" }),
  );
  assert.ok(
    "error" in
      validateNotifyBody({
        ...validBody(),
        items: new Array(101).fill({
          title: "x",
          size: "",
          color: "",
          quantity: 1,
          price: 1,
        }),
      }),
  );
});

test("validateNotifyBody: normalise (retrait, défauts)", () => {
  const r = validateNotifyBody({ ...validBody(), reception: "retrait" });
  assert.ok("order" in r && r.order.reception === "retrait");
  const r2 = validateNotifyBody({ ...validBody(), reception: "nimporte-quoi" });
  assert.ok("order" in r2 && r2.order.reception === "livraison");
  const r3 = validateNotifyBody({ ...validBody(), currency: undefined });
  assert.ok("order" in r3 && r3.order.currency === "USD");
});

test("buildAdminOrderHtml: échappe le HTML injecté", () => {
  const r = validateNotifyBody({
    ...validBody(),
    name: '<script>alert("x")</script>',
  });
  assert.ok("order" in r);
  if ("order" in r) {
    const html = buildAdminOrderHtml(r.order);
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(html.includes("ORD-2026-123456"));
  }
});

test("escapeHtml: couvre les 5 caractères", () => {
  assert.equal(escapeHtml(`&<>"'`), "&amp;&lt;&gt;&quot;&#39;");
});
