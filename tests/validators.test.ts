// tests/validators.test.ts
// P-A: validation des regex whitelist
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidOrderId,
  isValidHexColor,
  isValidSize,
  isValidQuantity,
  isValidEmail,
  normalizeQuantity,
  isPayloadTooLarge,
} from "../supabase/functions/_shared/validators.ts";

test("isValidOrderId accepte ORD-yyyy-xxxxxx", () => {
  assert.ok(isValidOrderId("ORD-2026-123456"));
});
test("isValidOrderId rejette tout le reste", () => {
  assert.equal(isValidOrderId(""), false);
  assert.equal(isValidOrderId("ord-2026-123456"), false);
  assert.equal(isValidOrderId("ORD-26-123456"), false);
  assert.equal(isValidOrderId("ORD-2026-12345"), false);
  assert.equal(isValidOrderId("ORD-2026-1234567"), false);
  assert.equal(isValidOrderId(null), false);
});

test("isValidHexColor #RRGGBB lowercase + uppercase", () => {
  assert.ok(isValidHexColor("#ffffff"));
  assert.ok(isValidHexColor("#FFFFFF"));
  assert.ok(isValidHexColor("#1a2b3c"));
  assert.equal(isValidHexColor("ffffff"), false);
  assert.equal(isValidHexColor("#fff"), false);
  assert.equal(isValidHexColor("#zzzzzz"), false);
});

test("isValidSize whitelist XS..3XL", () => {
  ["XS","S","M","L","XL","XXL","2XL","3XL"].forEach((s) => assert.ok(isValidSize(s), s));
  assert.equal(isValidSize("4XL"), false);
  assert.equal(isValidSize("M "), true, "espace tolere (trim)");
  assert.equal(isValidSize(""), false);
  assert.equal(isValidSize(123 as unknown as string), false);
});

test("isValidQuantity 1..100", () => {
  assert.equal(isValidQuantity(1), true);
  assert.equal(isValidQuantity(100), true);
  assert.equal(isValidQuantity(0), false);
  assert.equal(isValidQuantity(101), false);
  assert.equal(isValidQuantity(-1), false);
  assert.equal(isValidQuantity(1.5), false);
});

test("normalizeQuantity parse string -> int", () => {
  assert.equal(normalizeQuantity("3"), 3);
  assert.equal(normalizeQuantity(5), 5);
  assert.equal(normalizeQuantity("0"), null);
  assert.equal(normalizeQuantity("abc"), null);
  assert.equal(normalizeQuantity(0), null);
});

test("isValidEmail RFC basique", () => {
  assert.ok(isValidEmail("a@b.co"));
  assert.ok(isValidEmail("user.name+tag@example.com"));
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail(""), false);
});

test("isPayloadTooLarge bloque > 100KB", () => {
  assert.equal(isPayloadTooLarge("x".repeat(100 * 1024)), false);
  assert.equal(isPayloadTooLarge("x".repeat(100 * 1024 + 1)), true);
});
