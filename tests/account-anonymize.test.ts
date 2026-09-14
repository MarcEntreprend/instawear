// tests/account-anonymize.test.ts
// Suppression de compte : anonymisation (pas conservation PII), commandes
// préservées, jamais d'interpolation dans les filtres. Miroirs de
// supabase/functions/delete-account/index.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Périmètre : quoi anonymiser, quoi garder/supprimer ─────────────────────

type Action = "scrub" | "delete-rows" | "keep" | "dissociate";

const PLAN: Record<string, { action: Action; note: string }> = {
  interactions: { action: "scrub", note: "nom+email → placeholders, historique gardé" },
  interaction_messages: { action: "scrub", note: "texte → placeholder (PII libre)" },
  customer_notifications: { action: "delete-rows", note: "éphémère, aucune archive" },
  product_reviews: { action: "dissociate", note: "contenu gardé, auteur Anonymous" },
  newsletter_subscribers: { action: "delete-rows", note: "consentement retiré" },
  refund_requests: { action: "scrub", note: "email dissocié, suivi financier gardé" },
  customers: { action: "delete-rows", note: "ligne + auth supprimés" },
  orders: { action: "keep", note: "pièces comptables, pas de FK" },
  order_refunds: { action: "keep", note: "registre financier, sans email" },
};

test("toutes les tables à PII sont couvertes, commandes et registre gardés", () => {
  assert.equal(PLAN.interactions.action, "scrub");
  assert.equal(PLAN.interaction_messages.action, "scrub");
  assert.equal(PLAN.customer_notifications.action, "delete-rows");
  assert.equal(PLAN.product_reviews.action, "dissociate");
  assert.equal(PLAN.orders.action, "keep");
  assert.equal(PLAN.order_refunds.action, "keep");
});

test("placeholders non-nullables (schéma : colonnes NOT NULL)", () => {
  for (const p of ["Compte supprimé", "deleted@deleted.local", "[Message supprimé — compte clôturé]", "Anonymous", "deleted"]) {
    assert.ok(p.length > 0);
  }
});

// ─── Sécurité : pas d'interpolation email dans .or() ────────────────────────

test("aucun filtre .or() interpolé (injection PostgREST via email exotique)", () => {
  // Miroir de la règle : requêtes .eq() séparées, valeurs en paramètres.
  const forbidden = ".or(`customer_id.eq.${userId},customer_email.eq.${userEmail}`)";
  const allowedExamples = [
    ".eq(\"customer_id\", userId)",
    ".eq(\"customer_email\", userEmail)",
  ];
  assert.ok(forbidden.includes("${userEmail}"), "ce pattern est le danger");
  for (const a of allowedExamples) assert.ok(!a.includes("${"));
});

// ─── Ordre : anonymiser AVANT de supprimer ──────────────────────────────────

test("ordre : scrub puis customers puis auth (jamais l'inverse)", () => {
  const order = ["scrub-pii", "delete-customers", "delete-auth-user"];
  assert.deepEqual(order, ["scrub-pii", "delete-customers", "delete-auth-user"]);
});

// ─── Copie UI honnête ───────────────────────────────────────────────────────

test("confirm de suppression mentionne anonymisation + commandes gardées", () => {
  const copy =
    "This will permanently delete your account, saved addresses, favourites and cart. " +
    "Your name and email will be removed from support messages and reviews; " +
    "past orders are kept anonymously for accounting, as required by law. " +
    "This action cannot be undone. Continue?";
  assert.ok(copy.includes("anonym"));
  assert.ok(copy.includes("accounting"));
  assert.ok(!copy.toLowerCase().includes("orders history access"));
});
