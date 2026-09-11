// tests/email-preferences.test.ts
// Logique pure de l'edge email-preferences (pas d'accès réseau/DB).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEmail,
  validateSaveBody,
  displayPrefs,
  mergePrefs,
  describeChanges,
} from "../supabase/functions/email-preferences/_shared/prefs.ts";

test("normalizeEmail: trim + minuscules, rejette l'invalide", () => {
  assert.equal(normalizeEmail("  Marc@Example.COM "), "marc@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(normalizeEmail("a@b"), null);
  assert.equal(normalizeEmail(42), null);
  assert.equal(normalizeEmail(""), null);
});

test("validateSaveBody: booléens stricts, clés connues uniquement", () => {
  const ok = validateSaveBody({ newsletter: true, promotions: false });
  assert.ok("prefs" in ok);
  if ("prefs" in ok) {
    assert.deepEqual(ok.prefs, { newsletter: true, promotions: false });
  }
  assert.ok("error" in validateSaveBody({ newsletter: "yes" }));
  assert.ok("error" in validateSaveBody({ newsletter: 1 }));
  assert.ok("error" in validateSaveBody({ unknown_key: true }));
  assert.ok("error" in validateSaveBody({}));
  assert.ok("error" in validateSaveBody(null));
});

test("displayPrefs: défauts tout-coché quand absents", () => {
  assert.deepEqual(displayPrefs(null), {
    order_confirmation: true,
    shipping_update: true,
    promotions: true,
  });
  assert.deepEqual(
    displayPrefs({ order_confirmation: false, shipping_update: true } as any),
    { order_confirmation: false, shipping_update: true, promotions: true },
  );
});

test("mergePrefs: fusion sans suppression de clé", () => {
  const merged = mergePrefs(
    { order_confirmation: false, shipping_update: true, promotions: true } as any,
    { promotions: false },
  );
  assert.deepEqual(merged, {
    order_confirmation: false,
    shipping_update: true,
    promotions: false,
  });
});

test("describeChanges: ne liste que les vrais changements", () => {
  const before = {
    newsletter: true,
    prefs: { order_confirmation: true, shipping_update: true, promotions: true },
    isCustomer: true,
  };
  const changes = describeChanges(before, {
    newsletter: false,
    prefs: { order_confirmation: true, shipping_update: false, promotions: true },
  });
  assert.deepEqual(changes, {
    newsletter: { from: true, to: false },
    shipping_update: { from: true, to: false },
  });
  const none = describeChanges(before, {
    newsletter: true,
    prefs: { ...before.prefs },
  });
  assert.deepEqual(none, {});
});
