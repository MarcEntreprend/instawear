// tests/interaction-notify.test.ts
// Edge interaction-notify (ticket compte → notif + telegram + email admin)
// + fallback guest contact-message : ownership, dedupe, codes.
// Miroirs des edges (Deno non importable en node).

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Ownership (serveur : id OU email du caller) ────────────────────────────

function owns(
  inter: { customer_id: unknown; customer_email: unknown },
  caller: { id: string; email: string } | null,
  internal: boolean,
): "ok" | "unauth" | "missing" | "forbidden" {
  if (!inter) return "missing";
  if (internal) return "ok";
  if (!caller) return "unauth";
  const ownerId = inter.customer_id ? String(inter.customer_id) : null;
  const ownerEmail = String(inter.customer_email || "").toLowerCase() || null;
  if (ownerId !== caller.id && ownerEmail !== caller.email.toLowerCase())
    return "forbidden";
  return "ok";
}

test("propriétaire par id → ok", () => {
  assert.equal(
    owns(
      { customer_id: "user-1", customer_email: "a@x.com" },
      { id: "user-1", email: "other@x.com" },
      false,
    ),
    "ok",
  );
});

test("propriétaire par email (guest-linked) → ok", () => {
  assert.equal(
    owns(
      { customer_id: null, customer_email: "a@x.com" },
      { id: "user-9", email: "A@X.com" },
      false,
    ),
    "ok",
  );
});

test("ticket d'autrui → 403 (pas de leak, pas de notif)", () => {
  assert.equal(
    owns(
      { customer_id: "user-2", customer_email: "b@x.com" },
      { id: "user-1", email: "a@x.com" },
      false,
    ),
    "forbidden",
  );
});

test("sans JWT → 401 ; interne service_role → ok", () => {
  assert.equal(
    owns({ customer_id: "u", customer_email: "a@x.com" }, null, false),
    "unauth",
  );
  assert.equal(
    owns({ customer_id: "u", customer_email: "a@x.com" }, null, true),
    "ok",
  );
});

// ─── Dedupe 30 min par interactionId ────────────────────────────────────────

function deduped(recent: { interactionId?: string }[], id: string): boolean {
  return recent.some((n) => n?.interactionId === id);
}

test("2e appel < 30 min → notified:false (pas de double telegram)", () => {
  assert.equal(deduped([{ interactionId: "T1" }], "T1"), true);
  assert.equal(deduped([{ interactionId: "T2" }], "T1"), false);
  assert.equal(deduped([], "T1"), false);
});

// ─── Fallback guest contact-message (email-string puis NULL) ────────────────

type InsertResult = { ok: boolean; code?: string };

function guestInsert(
  attempt: (customerId: string | null) => InsertResult,
  hasCustomerRow: boolean,
): { saved: boolean; withNull: boolean } {
  if (hasCustomerRow) {
    const r = attempt("uuid-1");
    return { saved: r.ok, withNull: false };
  }
  const first = attempt("guest@x.com");
  if (first.ok) return { saved: true, withNull: false };
  const second = attempt(null);
  return { saved: second.ok, withNull: second.ok };
}

test("guest : email-string accepté → sauvé (comportement actuel)", () => {
  assert.deepEqual(
    guestInsert(() => ({ ok: true }), false),
    { saved: true, withNull: false },
  );
});

test("guest : email refusé (FK/uuid) → repli NULL sauve le ticket", () => {
  let calls: (string | null)[] = [];
  const r = guestInsert(
    (cid) => {
      calls.push(cid);
      return cid === null ? { ok: true } : { ok: false, code: "22P02" };
    },
    false,
  );
  assert.deepEqual(r, { saved: true, withNull: true });
  assert.deepEqual(calls, ["guest@x.com", null]);
});

test("guest : double refus → TICKET_FAILED (message actionnable front)", () => {
  const r = guestInsert(() => ({ ok: false, code: "23503" }), false);
  assert.deepEqual(r, { saved: false, withNull: false });
});

test("loggé avec ligne customer → une seule tentative (uuid)", () => {
  let calls = 0;
  guestInsert(() => {
    calls++;
    return { ok: true };
  }, true);
  assert.equal(calls, 1);
});

// ─── Front guest : code → message ───────────────────────────────────────────

function guestError(code: string | undefined, fallback: string): string {
  if (code === "TICKET_FAILED") {
    return "We couldn't save your message just now. Please email us directly at bonjour@instawear.com — we'll reply within 24 business hours.";
  }
  return fallback;
}

test("TICKET_FAILED → message actionnable (pas de détail interne)", () => {
  const msg = guestError("TICKET_FAILED", "x");
  assert.ok(msg.includes("bonjour@instawear.com"));
  assert.ok(!msg.includes("FK") && !msg.includes("22P02"));
});

test("autres erreurs → message edge tel quel", () => {
  assert.equal(guestError(undefined, "Trop de requêtes."), "Trop de requêtes.");
});
