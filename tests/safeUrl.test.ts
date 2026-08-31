// tests/safeUrl.test.ts
// P-D: SSRF allowlist
import { test } from "node:test";
import assert from "node:assert/strict";

// safeUrl importe Deno, on ne peut pas l'executer dans node:test directement.
// On duplique la logique minimale ici, ou on mocke.
// Plus simple: on re-exporte assertSafeUrl via un wrapper testable.
// Comme safeUrl importe 'URL' (built-in) et ne depend pas vraiment de Deno ici,
// on l'importe directement.

import { assertSafeUrl, SSRFBlockedError } from "../supabase/functions/_shared/safeUrl.ts";

test("https printful.com OK", () => {
  assert.equal(assertSafeUrl("https://api.printful.com/orders"), "https://api.printful.com/orders");
});

test("https sous-domaine printful OK", () => {
  assert.equal(assertSafeUrl("https://files.cdn.printful.com/x.jpg"), "https://files.cdn.printful.com/x.jpg");
});

test("http (pas https) bloque", () => {
  assert.throws(() => assertSafeUrl("http://api.printful.com/orders"), SSRFBlockedError);
});

test("file:// bloque", () => {
  assert.throws(() => assertSafeUrl("file:///etc/passwd"), SSRFBlockedError);
});

test("gopher:// bloque", () => {
  assert.throws(() => assertSafeUrl("gopher://evil.com/"), SSRFBlockedError);
});

test("localhost bloque", () => {
  assert.throws(() => assertSafeUrl("https://localhost/admin"), SSRFBlockedError);
});

test("127.0.0.1 bloque", () => {
  assert.throws(() => assertSafeUrl("https://127.0.0.1/admin"), SSRFBlockedError);
});

test("IP privee 10.x bloque", () => {
  assert.throws(() => assertSafeUrl("https://10.0.0.1/internal"), SSRFBlockedError);
});

test("IP privee 192.168.x bloque", () => {
  assert.throws(() => assertSafeUrl("https://192.168.1.1/router"), SSRFBlockedError);
});

test("IP metadata cloud 169.254.169.254 bloque", () => {
  assert.throws(() => assertSafeUrl("https://169.254.169.254/latest/meta-data"), SSRFBlockedError);
});

test("hostname non whitelist bloque", () => {
  assert.throws(() => assertSafeUrl("https://evil.com/payload"), SSRFBlockedError);
});

test("URL invalide bloque", () => {
  assert.throws(() => assertSafeUrl("not-a-url"), SSRFBlockedError);
  assert.throws(() => assertSafeUrl(""), SSRFBlockedError);
});
