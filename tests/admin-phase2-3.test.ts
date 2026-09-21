// tests/admin-phase2-3.test.ts
// Vague A phases 2+3 : notifs produits vivantes, email réponse, last_login,
// vrai sync. escapeHtml testé en vrai (pur) ; le reste en miroir source
// (supabaseApi non importable en node : client supabase au chargement).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "../src/utils/format.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

// ─── escapeHtml ─────────────────────────────────────────────────────────────

test("escapeHtml neutralise les 4 caractères + non-string", () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script> & co'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co",
  );
  assert.equal(escapeHtml("plain"), "plain");
  assert.equal(escapeHtml(null as any), "");
  assert.equal(escapeHtml(undefined as any), "");
});

// ─── A2 : notif création AVANT le return (le mort historique) ───────────────

test("create émet la notif avant de retourner (code mort réparé)", () => {
  const src = read("src/api/supabaseApi.ts");
  const createStart = src.indexOf('product: Omit<AdminProduct, "id"');
  assert.ok(createStart > 0, "productApi.create trouvé");
  const createBody = src.slice(createStart, src.indexOf("async update(", createStart));
  const notifIdx = createBody.indexOf('title: "Nouveau produit créé"');
  const returnIdx = createBody.indexOf("return mapProduct(data)");
  assert.ok(notifIdx > 0 && returnIdx > 0 && notifIdx < returnIdx);
});

// ─── A2 : update notifie seulement sur changement significatif ──────────────

test("update : gate champs significatifs + best-effort", () => {
  const src = read("src/api/supabaseApi.ts");
  for (const k of ["updates.title", "updates.price", "updates.isActive", "updates.inStock"]) {
    assert.ok(src.includes(k), `gate ${k}`);
  }
  assert.ok(src.includes('title: "Produit modifié"'));
});

// ─── A3 : email réponse via edge admin-gated + échappé ──────────────────────

test("sendReplyEmail : edge send-email + escapeHtml + garde destinataire", () => {
  const src = read("src/api/supabaseApi.ts");
  assert.ok(src.includes("functions/v1/send-email"));
  assert.ok(src.includes("escapeHtml(ticket.replyText)"));
  assert.ok(src.includes("Aucun email client sur ce ticket"));
  assert.ok(src.includes("getPodAuthHeaders()"));
});

test("InteractionsPage : anti-double-clic + statut email affiché + retry", () => {
  const src = read("src/admin/InteractionsPage.tsx");
  assert.ok(src.includes("sendingReply"));
  assert.ok(src.includes("emailStatus"));
  assert.ok(src.includes("✉ envoyé"));
  assert.ok(src.includes("email non parti"));
  assert.ok(src.includes("onRetryEmail"), "pastille cliquable qui relance");
  assert.ok(src.includes("retryingEmailId"), "retry anti-double-clic");
});

// ─── last_login_date admin ──────────────────────────────────────────────────

test("App : last_login_date posé à la connexion admin (best-effort)", () => {
  const src = read("src/App.tsx");
  const hits = src.split("last_login_date").length - 1;
  assert.ok(hits >= 2, `2 écritures admin attendues, trouvé ${hits}`);
});

// ─── A4 : vrai sync ─────────────────────────────────────────────────────────

test("IntegrationsPage : Sync = podApi.sync + busy + erreur visible", () => {
  const src = read("src/admin/IntegrationsPage.tsx");
  assert.ok(src.includes("await podApi.sync()"), "vrai sync appelé");
  assert.ok(src.includes("syncingApiId"), "anti-double-clic");
  assert.ok(src.includes("syncApiError"), "erreur visible");
  assert.ok(src.includes("lastSyncAt: new Date().toISOString()"), "tampon après succès");
});

test("SettingsPage : plus de faux handleSyncApi", () => {
  const src = read("src/admin/SettingsPage.tsx");
  assert.ok(!src.includes("const handleSyncApi"), "faux sync supprimé");
  assert.ok(
    src.includes("ne pas le réintroduire") || !src.includes("lastSyncAt: new Date().toISOString()"),
    "garde anti-régression ou tampon supprimé",
  );
});
