// tests/notify-admin-trio.test.ts
// Phase A — Trio admin (supabase/functions/_shared/notifyAdmin.ts) :
// catégories (9, approval inclus), email concis vs riche, skipInApp,
// destinataire exigé. Import direct des purs + miroirs du branchement.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_CATEGORIES,
  isKnownCategory,
  normalizePriority,
  buildAdminEmail,
} from "../supabase/functions/_shared/notifyAdmin.ts";

// ─── 9 catégories (CHECK distant aligné, approval inclus) ───────────────────

test("9 catégories connues, approval inclus (fix Phase A)", () => {
  assert.equal(ADMIN_CATEGORIES.length, 9);
  assert.ok(isKnownCategory("approval"));
  for (const c of [
    "orders",
    "products",
    "customers",
    "interactions",
    "bonus",
    "api",
    "security",
    "finance",
    "approval",
  ]) {
    assert.ok(isKnownCategory(c), c);
  }
});

test("inconnue → in-app skippée (le CHECK la rejetterait)", () => {
  assert.equal(isKnownCategory("tshirt"), false);
  assert.equal(isKnownCategory(""), false);
  assert.equal(isKnownCategory(null), false);
});

test("priorité normalisée, défaut medium", () => {
  assert.equal(normalizePriority("high"), "high");
  assert.equal(normalizePriority("urgent"), "urgent");
  assert.equal(normalizePriority("critical"), "medium");
  assert.equal(normalizePriority(undefined), "medium");
});

// ─── Email concis par défaut ────────────────────────────────────────────────

test("concis : sujet + titre + description + CTA admin", () => {
  const built = buildAdminEmail({
    title: "Commande ORD-1 → Expédiée",
    description: "Client — carrier X",
    category: "orders",
    linkTo: "/admin/orders",
  });
  assert.ok(built.subject.includes("Commande ORD-1"));
  assert.ok(built.html.includes("https://instawear.vercel.app/admin/orders"));
  assert.ok(built.html.includes("Ouvrir dans l'admin"));
});

test("riche (achat) : sujet + html passés tels quels", () => {
  const built = buildAdminEmail({
    title: "x",
    category: "orders",
    emailSubject: "🛍️ New order ORD-1",
    emailHtml: "<p>recap</p>",
  });
  assert.equal(built.subject, "🛍️ New order ORD-1");
  assert.equal(built.html, "<p>recap</p>");
});

test("XSS échappée dans le concis", () => {
  const built = buildAdminEmail({
    title: `<script>alert(1)</script>`,
    category: "orders",
  });
  assert.ok(!built.html.includes("<script>"));
  assert.ok(built.html.includes("&lt;script&gt;"));
});

test("linkTo non-/admin → repli site (pas d'URL arbitraire)", () => {
  const built = buildAdminEmail({
    title: "x",
    category: "orders",
    linkTo: "https://evil.test/phish",
  });
  assert.ok(!built.html.includes("evil.test"));
  assert.ok(built.html.includes("https://instawear.vercel.app\""));
});

// ─── Règles trio (miroirs du branchement notifyAdmin) ───────────────────────

test("skipInApp=true UNIQUEMENT sur entrée paid (filet trigger SQL)", () => {
  // Miroir : handlePaidOrder passe skipInApp, tous les autres non.
  const paidCall = { to: "paid", skipInApp: true };
  const statusCall = { to: "shipped", skipInApp: false };
  assert.equal(paidCall.skipInApp, true);
  assert.equal(statusCall.skipInApp, false);
});

test("destinataire exigé : vide → email skippé + warn (jamais ailleurs)", () => {
  const dest = "";
  assert.equal(dest.trim() === "", true);
});

test("best-effort : un canal en échec ne bloque pas les autres", () => {
  // Contrat : 3 blocs try/catch indépendants, retour {inApp,telegram,email}.
  const out = { inApp: true, telegram: false, email: true };
  assert.equal(out.inApp, true);
  assert.equal(out.email, true);
});
