// tests/security-bloc1.test.ts
// Bloc 1 (audit Phases 3-5) : G1/G2 (rate-limit + taille), L1/L2 (logs),
// S1 (validation synchrone), F1 (plus de PII dans les URL). Miroirs +
// un test statique qui lit le front (fort : empêche toute réintroduction).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const edge = (fn: string) =>
  readFileSync(join(root, "supabase/functions", fn, "index.ts"), "utf-8");

// ─── G1 : delete-account rate-limitée ───────────────────────────────────────

test("G1 : delete-account branchée sur isRateLimited", () => {
  const src = edge("delete-account");
  assert.ok(src.includes("isRateLimited(req, rateLimitKey(req"));
  assert.ok(src.includes("429"), "429 sur dépassement");
});

// ─── G2 : order-status-update capte les payloads énormes ────────────────────

test("G2 : order-status-update rejette >100KB avant parsing", () => {
  const src = edge("order-status-update");
  assert.ok(src.includes("isPayloadTooLarge(raw)"));
  assert.ok(src.includes("413"));
});

// ─── L1/L2 : erreurs expurgées ──────────────────────────────────────────────

test("L1 : send-email répond générique (destinataire jamais renvoyé)", () => {
  const src = edge("send-email");
  assert.ok(src.includes("Resend refused the email"));
  assert.ok(!src.includes("JSON.stringify({ error })"), "objet brut renvoyé");
});

test("L2 : stripe-webhook ne loggue plus le corps Telegram", () => {
  const src = edge("stripe-webhook");
  assert.ok(!src.includes("await tgRes.text()"), "corps avec PII loggué");
  assert.ok(src.includes("Telegram send error:"));
});

// ─── S1 : validation synchrone des fichiers d'approbation ──────────────────

test("S1 : approve utilise assertSafeUrl synchrone (pas de fetch fantôme)", () => {
  const src = edge("approve-printful-design");
  assert.ok(src.includes("assertSafeUrl(f.url)"));
  const block = src.slice(
    src.indexOf("for (const f of files)"),
    src.indexOf("validFiles.push"),
  );
  // Aucun appel réseau dans la boucle de validation (regex : safeFetch()
  // suivi d'une parenthèse ouvrante = vrai appel, pas un commentaire).
  assert.ok(!/^\s*safeFetch\(/m.test(block), "fetch non attendu restant");
});

// ─── F1 : plus de PII client dans les URL (test statique fort) ──────────────

test("F1 : CheckoutFlow sans lien profond Telegram ni popup", () => {
  const front = readFileSync(
    join(root, "src/components/CheckoutFlow.tsx"),
    "utf-8",
  );
  // Littéraux de code (pas les commentaires) : aucun appel window.open(,
  // aucune URL t.me interpolée, fonctions supprimées.
  assert.ok(!/window\.open\(/.test(front), "popup restante");
  assert.ok(!front.includes("t.me/${"), "lien profond restant");
  assert.ok(!front.includes("function sendTelegramNotification"), "fonction restante");
  assert.ok(!front.includes("function shouldSendTelegram"), "gate restant");
});

// ─── Copies _shared requises par ces edges ──────────────────────────────────

test("_shared présents : rateLimit (delete-account), logSafe (send-email)", () => {
  assert.ok(
    existsSync(
      join(root, "supabase/functions/delete-account/_shared/rateLimit.ts"),
    ),
  );
  assert.ok(
    existsSync(
      join(root, "supabase/functions/send-email/_shared/logSafe.ts"),
    ),
  );
});
