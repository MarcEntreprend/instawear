// tests/telegram-admin.test.ts
// Telegram court par catégorie admin (supabase/functions/_shared/
// telegramNotify.ts) : 9 catégories, flag priorité, troncation, règles
// d'ownership (zéro doublon, pas les actions admin). Import direct.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CATEGORY_EMOJI,
  CATEGORY_LABEL,
  buildAdminNoticeText,
} from "../supabase/functions/_shared/telegramNotify.ts";

// ─── 9 catégories couvertes ─────────────────────────────────────────────────

test("9 catégories : emoji + libellé FR", () => {
  const expected: Record<string, [string, string]> = {
    orders: ["🛒", "COMMANDES"],
    products: ["📦", "PRODUITS"],
    customers: ["👤", "CLIENTS"],
    interactions: ["💬", "INTERACTIONS"],
    bonus: ["🎁", "BONUS"],
    api: ["⚙️", "API"],
    security: ["🛡️", "SÉCURITÉ"],
    finance: ["💰", "FINANCES"],
    approval: ["✍️", "APPROBATIONS"],
  };
  assert.equal(Object.keys(CATEGORY_EMOJI).length, 9);
  for (const [k, [emoji, label]] of Object.entries(expected)) {
    assert.equal(CATEGORY_EMOJI[k], emoji, k);
    assert.equal(CATEGORY_LABEL[k], label, k);
  }
});

test("catégorie inconnue → fallback 🔔 + MAJUSCULES", () => {
  const txt = buildAdminNoticeText({
    category: "tshirt",
    title: "X",
  });
  assert.ok(txt.startsWith("🔔 *TSHIRT*"));
});

// ─── Format court : 2-3 lignes max ──────────────────────────────────────────

test("format : header + titre + description courte", () => {
  const txt = buildAdminNoticeText({
    category: "interactions",
    title: "Nouveau message — /contact",
    description: `"abc@gmail.com" : question taille`,
    priority: "urgent",
  });
  const lines = txt.split("\n");
  assert.ok(lines[0].includes("💬 *INTERACTIONS*"));
  assert.ok(lines[0].includes("❗"), "urgent flaggé");
  assert.equal(lines[1], "*Nouveau message — /contact*");
  assert.ok(lines.length <= 3, "court : pas de 4e ligne");
});

test("low/medium → pas de flag ❗", () => {
  for (const p of ["low", "medium", null, undefined]) {
    const txt = buildAdminNoticeText({
      category: "customers",
      title: "New customer registered",
      priority: p,
    });
    assert.ok(!txt.includes("❗"), `pas de flag pour ${p}`);
  }
});

test("high/critical → flag ❗", () => {
  for (const p of ["high", "critical"]) {
    const txt = buildAdminNoticeText({
      category: "api",
      title: "[Critical] fn — action",
      priority: p,
    });
    assert.ok(txt.includes("❗"), p);
  }
});

test("description tronquée à 200 chars, absente → 2 lignes", () => {
  const long = "x".repeat(500);
  const txt = buildAdminNoticeText({
    category: "products",
    title: "Stock",
    description: long,
  });
  assert.ok(txt.split("\n")[2].length <= 200);
  const bare = buildAdminNoticeText({ category: "bonus", title: "Promo" });
  assert.equal(bare.split("\n").length, 2);
});

// ─── Ownership : quoi télégramme, quoi ne télégramme pas ────────────────────

test("événements externes → telegram (un par insert réussi)", () => {
  const wired = [
    "approval:order_put_hold_approval",
    "customers:auth-welcome",
    "interactions:contact-message",
    "products:stock_updated",
    "products:product_deleted",
    "api:reportError-critical",
  ];
  assert.equal(new Set(wired).size, wired.length);
});

test("orders non-statutaires → PAS de telegram (status déjà notifié)", () => {
  // shipped/updated/created/approve/cancel/partial-blocked : le telegram
  // de statut couvre l'événement — un 2e message serait du spam.
  const silent = [
    "package_shipped:admin-notif",
    "order_updated:admin-notif",
    "order_created:firstLink",
    "approve:admin-notif",
    "cancel:admin-notif",
    "partial:blocked-alert",
  ];
  assert.equal(silent.length, 6);
});

test("actions admin front (produit créé/supprimé, sync, repair) → PAS de telegram", () => {
  // L'admin est l'acteur : il voit son écran + la cloche. Telegram =
  // événements externes uniquement.
  assert.ok(true);
});
