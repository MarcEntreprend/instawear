// tests/email-send.test.ts
// Helper postEmail (emailTemplates.ts) : destinataire vérifié AVANT l'appel
// (une adresse fictive = refus Resend garanti → message clair au lieu d'un
// 400 obscur), raison exacte remontée en cas d'échec edge.
// Miroirs (le module importe le client Supabase navigateur).

import { test } from "node:test";
import assert from "node:assert/strict";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function shouldSend(to: unknown): { ok: boolean; reason?: string } {
  if (typeof to !== "string" || !EMAIL_RE.test(to.trim())) {
    return { ok: false, reason: `destinataire invalide : ${JSON.stringify(to)}` };
  }
  return { ok: true };
}

test("adresse fictive sans TLD → ignoré avec explication", () => {
  const r = shouldSend("test@test");
  assert.equal(r.ok, false);
  assert.match(r.reason || "", /destinataire invalide/);
});

test("vide/null/non-string → ignoré", () => {
  assert.equal(shouldSend("").ok, false);
  assert.equal(shouldSend(null).ok, false);
  assert.equal(shouldSend(123).ok, false);
  assert.equal(shouldSend("   ").ok, false);
});

test("adresse valide → envoi tenté", () => {
  assert.equal(shouldSend("client@example.com").ok, true);
  assert.equal(shouldSend("  client@example.com  ").ok, true);
});

function edgeErrorMessage(status: number, body: string): string {
  return `[email] send-email HTTP ${status} : ${body.slice(0, 300) || "(sans détail)"}`;
}

test("corps d'erreur edge remonté (diagnostic Resend visible)", () => {
  const msg = edgeErrorMessage(400, '{"error":{"message":"Invalid `to`"}}');
  assert.match(msg, /HTTP 400/);
  assert.match(msg, /Invalid `to`/);
});
