// tests/logSafe.test.ts
// P-E: validation du helper logSafe - redaction secrets
import { test } from "node:test";
import assert from "node:assert/strict";
import { logSafe, safeTruncate } from "../supabase/functions/_shared/logSafe.ts";

test("logSafe masque Bearer tokens", () => {
  const s = logSafe("Authorization: Bearer abcDEF123.token");
  assert.ok(!s.includes("abcDEF123"), "token doit etre masque");
  assert.ok(s.includes("***"), "placeholder ***");
});

test("logSafe masque api_key", () => {
  const s = logSafe("api_key=PRF-LIVE-xyz123 dans url");
  assert.ok(!s.includes("xyz123"));
  assert.ok(s.includes("***"));
});

test("logSafe masque password", () => {
  const s = logSafe("password=superSecret123");
  assert.ok(!s.includes("superSecret123"));
});

test("logSafe tronque a 300 chars par defaut", () => {
  const long = "x".repeat(5000);
  const s = logSafe(long, 300);
  assert.ok(s.length <= 320, `longueur ${s.length} doit etre <= 320`);
  assert.ok(s.includes("truncated"), "indicateur truncated");
});

test("logSafe preserve le contenu safe", () => {
  const s = logSafe("hello world");
  assert.equal(s, "hello world");
});

test("safeTruncate laisse intact si <= max", () => {
  assert.equal(safeTruncate("short", 100), "short");
});
