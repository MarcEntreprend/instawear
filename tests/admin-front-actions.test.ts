// tests/admin-front-actions.test.ts
// Phase D — Recette : les notifs créées par les ACTIONS admin front
// (produit créé/supprimé, sync Printful, repair, échecs POD cliqués)
// restent cloche seule : ni email, ni telegram. L'admin est l'acteur,
// il voit son écran. Analyse statique du code front (pas un miroir).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const api = readFileSync(join(root, "src/api/supabaseApi.ts"), "utf-8");

test("front api : aucun appel send-email / telegram / resend SAUF réponse client", () => {
  // Règle : les notifs d'actions admin restent cloche seule (l'admin voit
  // son écran). Seule exception sanctionnée : sendReplyEmail, qui écrit AU
  // CLIENT (transactionnel, edge admin-gated + rate-limit), pas à l'admin.
  for (const needle of [
    "telegram",
    "Telegram",
    "resend",
    "Resend",
    "ADMIN_NOTIFY_EMAIL",
    "TELEGRAM_BOT_TOKEN",
  ]) {
    assert.ok(!api.includes(needle), `fuite front : ${needle}`);
  }
  const hits = [...api.matchAll(/functions\/v1\/send-email/g)];
  assert.equal(hits.length, 1, "un seul point d'appel autorisé");
  const idx = hits[0].index ?? -1;
  const fnStart = api.lastIndexOf("async sendReplyEmail", idx);
  assert.ok(fnStart > 0, "l'appel vit dans sendReplyEmail uniquement");
});

test("front api : les notifs d'actions restent notificationApi.create", () => {
  const count = (api.match(/notificationApi\.create\(/g) || []).length;
  assert.ok(count >= 5, `attendu >= 5 sites cloche, vu ${count}`);
});

test("emailTemplates front supprimé (voie Phase 3 : edge serveur)", () => {
  assert.equal(
    existsSync(join(root, "src/utils/emailTemplates.ts")),
    false,
  );
});

test("OrdersPage : plus d'envoi email front (annulation via edge)", () => {
  const page = readFileSync(
    join(root, "src/admin/OrdersPage.tsx"),
    "utf-8",
  );
  assert.ok(!page.includes("emailTemplates"), "import emailTemplates restant");
  assert.ok(!page.includes("sendCancelledEmail"), "envoi front restant");
});

test("secrets mail/telegram jamais exposés côté front", () => {
  const app = readFileSync(join(root, "src/App.tsx"), "utf-8");
  for (const needle of ["RESEND_API_KEY", "TELEGRAM_BOT_TOKEN"]) {
    assert.ok(!app.includes(needle), needle);
    assert.ok(!api.includes(needle), needle);
  }
});
