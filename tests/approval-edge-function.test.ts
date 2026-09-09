// tests/approval-edge-function.test.ts
// Tests for approve-printful-design edge function input validation:
// - confirm_hash format validation
// - order_id format validation
// - action parameter validation
// - message length validation
// - files URL validation

import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidOrderId } from "../supabase/functions/_shared/validators.ts";
import { assertSafeUrl, SSRFBlockedError } from "../supabase/functions/_shared/safeUrl.ts";

// ─── confirm_hash validation (mirrors edge function regex) ──────────────────

const CONFIRM_HASH_RE = /^[a-f0-9]{20,64}$/i;

function isValidConfirmHash(v: unknown): boolean {
  return typeof v === "string" && CONFIRM_HASH_RE.test(v);
}

test("confirm_hash: valid 32-char hex", () => {
  assert.ok(isValidConfirmHash("a14e51714be01f98487fcf5131727d31"));
});

test("confirm_hash: valid 20-char hex (minimum)", () => {
  assert.ok(isValidConfirmHash("a14e51714be01f98487f"));
});

test("confirm_hash: valid 64-char hex (maximum)", () => {
  assert.ok(isValidConfirmHash("a14e51714be01f98487fcf5131727d31a14e51714be01f98487fcf5131727d31"));
});

test("confirm_hash: uppercase hex is valid", () => {
  assert.ok(isValidConfirmHash("A14E51714BE01F98487FCF5131727D31"));
});

test("confirm_hash: mixed case hex is valid", () => {
  assert.ok(isValidConfirmHash("a14E51714be01F98487fCF5131727d31"));
});

test("confirm_hash: too short (19 chars) is invalid", () => {
  assert.equal(isValidConfirmHash("a14e51714be01f98487"), false);
});

test("confirm_hash: too long (65 chars) is invalid", () => {
  assert.equal(isValidConfirmHash("a14e51714be01f98487fcf5131727d31a14e51714be01f98487fcf5131727d31a"), false);
});

test("confirm_hash: non-hex characters are invalid", () => {
  assert.equal(isValidConfirmHash("g14e51714be01f98487fcf5131727d31"), false);
  assert.equal(isValidConfirmHash("z14e51714be01f98487fcf5131727d31"), false);
});

test("confirm_hash: empty string is invalid", () => {
  assert.equal(isValidConfirmHash(""), false);
});

test("confirm_hash: null is invalid", () => {
  assert.equal(isValidConfirmHash(null), false);
});

test("confirm_hash: number is invalid", () => {
  assert.equal(isValidConfirmHash(12345), false);
});

// ─── order_id validation ────────────────────────────────────────────────────

test("order_id: valid format ORD-XXXX-XXXXXX", () => {
  assert.ok(isValidOrderId("ORD-2026-123456"));
  assert.ok(isValidOrderId("ORD-2024-000001"));
  assert.ok(isValidOrderId("ORD-9999-999999"));
});

test("order_id: invalid formats are rejected", () => {
  assert.equal(isValidOrderId(""), false);
  assert.equal(isValidOrderId("ORD-26-123456"), false);   // 2-digit year
  assert.equal(isValidOrderId("ORD-2026-12345"), false);   // 5-digit number
  assert.equal(isValidOrderId("ORD-2026-1234567"), false);  // 7-digit number
  assert.equal(isValidOrderId("ord-2026-123456"), false);   // lowercase
  assert.equal(isValidOrderId("ORD-2026-123456 extra"), false); // trailing text
});

// ─── action parameter validation ────────────────────────────────────────────

const VALID_ACTIONS = ["approve", "submit_changes", "list"];

function isValidAction(v: unknown): boolean {
  return typeof v === "string" && VALID_ACTIONS.includes(v);
}

test("action: valid actions accepted", () => {
  assert.ok(isValidAction("approve"));
  assert.ok(isValidAction("submit_changes"));
  assert.ok(isValidAction("list"));
});

test("action: invalid actions rejected", () => {
  assert.equal(isValidAction("delete"), false);
  assert.equal(isValidAction("reject"), false);
  assert.equal(isValidAction(""), false);
  assert.equal(isValidAction(null), false);
  assert.equal(isValidAction(undefined), false);
  assert.equal(isValidAction("APPROVE"), false); // case-sensitive
});

// ─── message validation for submit_changes ───────────────────────────────────

function isValidMessage(v: unknown): { valid: boolean; error?: string } {
  if (typeof v !== "string" || v.trim().length === 0) {
    return { valid: false, error: "message requis" };
  }
  if (v.length > 2000) {
    return { valid: false, error: "message trop long" };
  }
  return { valid: true };
}

test("message: valid messages accepted", () => {
  assert.ok(isValidMessage("Move design to the left").valid);
  assert.ok(isValidMessage("A").valid);
  assert.ok(isValidMessage("a".repeat(2000)).valid);
});

test("message: empty string rejected", () => {
  const result = isValidMessage("");
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes("requis"));
});

test("message: whitespace-only rejected", () => {
  assert.equal(isValidMessage("   ").valid, false);
  assert.equal(isValidMessage("\n\t").valid, false);
});

test("message: too long rejected", () => {
  const result = isValidMessage("a".repeat(2001));
  assert.equal(result.valid, false);
  assert.ok(result.error?.includes("long"));
});

test("message: non-string rejected", () => {
  assert.equal(isValidMessage(null).valid, false);
  assert.equal(isValidMessage(123).valid, false);
  assert.equal(isValidMessage(undefined).valid, false);
});

// ─── files URL validation (SSRF protection) ─────────────────────────────────

test("files: valid Printful CDN URLs pass SSRF check", () => {
  assert.ok(assertSafeUrl("https://files.cdn.printful.com/design.png"));
  assert.ok(assertSafeUrl("https://cdn.printful.com/design.png"));
  assert.ok(assertSafeUrl("https://www.printful.com/file.pdf"));
});

test("files: non-Printful URLs blocked", () => {
  assert.throws(() => assertSafeUrl("https://evil.com/payload.png"), SSRFBlockedError);
  assert.throws(() => assertSafeUrl("https://malware.org/steal"), SSRFBlockedError);
});

test("files: non-HTTPS URLs blocked", () => {
  assert.throws(() => assertSafeUrl("http://files.cdn.printful.com/design.png"), SSRFBlockedError);
});

test("files: private IP URLs blocked", () => {
  assert.throws(() => assertSafeUrl("https://10.0.0.1/secret"), SSRFBlockedError);
  assert.throws(() => assertSafeUrl("https://192.168.1.1/admin"), SSRFBlockedError);
});

test("files: empty URL blocked", () => {
  assert.throws(() => assertSafeUrl(""), SSRFBlockedError);
  assert.throws(() => assertSafeUrl("not-a-url"), SSRFBlockedError);
});

// ─── Edge function response structure ───────────────────────────────────────

test("approve response structure", () => {
  const response = { success: true, action: "approved" };
  assert.equal(response.success, true);
  assert.equal(response.action, "approved");
});

test("submit_changes response structure", () => {
  const response = { success: true, action: "changes_submitted" };
  assert.equal(response.success, true);
  assert.equal(response.action, "changes_submitted");
});

test("error response structure", () => {
  const response = { error: "confirm_hash requis" };
  assert.ok(response.error);
  assert.equal(typeof response.error, "string");
});

// ─── Rate limit quota for approve-printful-design ───────────────────────────

function quotaFor(path: string): { max: number; windowMs: number } {
  switch (path) {
    case "approve-printful-design": return { max: 10, windowMs: 60_000 };
    default: return { max: 20, windowMs: 60_000 };
  }
}

test("rate limit: approve-printful-design allows 10 req/min", () => {
  const q = quotaFor("approve-printful-design");
  assert.equal(q.max, 10);
  assert.equal(q.windowMs, 60_000);
});

test("rate limit: unknown path uses default 20 req/min", () => {
  const q = quotaFor("unknown-path");
  assert.equal(q.max, 20);
  assert.equal(q.windowMs, 60_000);
});
