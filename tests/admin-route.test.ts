// tests/admin-route.test.ts — /admin + /account : pages à part entière.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isAdminPath,
  isAccountPath,
  isHeroStudioPath,
} from "../src/utils/routes.ts";import {
  cycleTabKey,
  swipeDir,
  parseAccountTab,
  extractOrderIds,
  isTrackableStatus,
} from "../src/utils/accountTabs.ts";

test("isAdminPath : strictement /admin, rien d'autre", () => {
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/"), false);
  assert.equal(isAdminPath("/admin/"), false);
  assert.equal(isAdminPath("/admin/users"), false);
  assert.equal(isAdminPath("/administrateur"), false);
  assert.equal(isAdminPath("/produit/abc"), false);
  assert.equal(isAdminPath(""), false);
});

test("isHeroStudioPath : strictement /admin/herostudio, rien d'autre", () => {
  assert.equal(isHeroStudioPath("/admin/herostudio"), true);
  assert.equal(isHeroStudioPath("/admin"), false);
  assert.equal(isHeroStudioPath("/"), false);
  assert.equal(isHeroStudioPath("/admin/herostudio/"), false);
  assert.equal(isHeroStudioPath("/admin/herostudio/extra"), false);
  assert.equal(isHeroStudioPath(""), false);
  // /admin reste strict : la page sœur ne le pollue pas.
  assert.equal(isAdminPath("/admin/herostudio"), false);
});

test("isAccountPath : /account (+ alias /compte), rien d'autre", () => {
  assert.equal(isAccountPath("/account"), true);
  assert.equal(isAccountPath("/compte"), true);
  assert.equal(isAccountPath("/"), false);
  assert.equal(isAccountPath("/account/"), false);
  assert.equal(isAccountPath("/admin"), false);
  assert.equal(isAccountPath(""), false);
});

test("cycleTabKey : cyclique, inconnu -> premier", () => {
  assert.equal(cycleTabKey(["a", "b", "c"], "b", 1), "c");
  assert.equal(cycleTabKey(["a", "b", "c"], "c", 1), "a");
  assert.equal(cycleTabKey(["a", "b", "c"], "a", -1), "c");
  assert.equal(cycleTabKey(["a", "b", "c"], "zzz", 1), "a");
  assert.equal(cycleTabKey([], "a", 1), "a");
});

test("swipeDir : horizontal dominant seulement", () => {
  assert.equal(swipeDir(-80, 10), 1);
  assert.equal(swipeDir(80, 10), -1);
  assert.equal(swipeDir(-30, 5), 0);
  assert.equal(swipeDir(-80, 70), 0);
  assert.equal(swipeDir(0, -100), 0);
});

test("parseAccountTab : ?tab= valide, sinon null", () => {
  const keys = ["orders", "cart", "profile"];
  assert.equal(parseAccountTab("?tab=cart", keys), "cart");
  assert.equal(parseAccountTab("?tab=nope", keys), null);
  assert.equal(parseAccountTab("", keys), null);
  assert.equal(parseAccountTab("?q=x&tab=profile", keys), "profile");
});

test("extractOrderIds : ORD-… uniques, insensible casse", () => {
  assert.deepEqual(extractOrderIds("Order ORD-2026-365346 confirmed"), [
    "ORD-2026-365346",
  ]);
  assert.deepEqual(extractOrderIds("nope"), []);
  assert.deepEqual(extractOrderIds(""), []);
  assert.deepEqual(
    extractOrderIds("ord-2026-12345 et ORD-2026-12345"),
    ["ORD-2026-12345"],
  );
});

test("isTrackableStatus : livré/annulé/remboursé/retourné exclus", () => {
  assert.equal(isTrackableStatus("shipped"), true);
  assert.equal(isTrackableStatus("pending"), true);
  assert.equal(isTrackableStatus("on_hold"), true);
  assert.equal(isTrackableStatus("delivered"), false);
  assert.equal(isTrackableStatus("cancelled"), false);
  assert.equal(isTrackableStatus("refunded"), false);
  assert.equal(isTrackableStatus("returned"), false);
  assert.equal(isTrackableStatus(null), true);
});
