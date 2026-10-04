// tests/admin-route.test.ts — /admin + /account : pages à part entière.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdminPath, isAccountPath } from "../src/utils/routes.ts";
import { cycleTabKey, swipeDir } from "../src/utils/accountTabs.ts";

test("isAdminPath : strictement /admin, rien d'autre", () => {
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/"), false);
  assert.equal(isAdminPath("/admin/"), false);
  assert.equal(isAdminPath("/admin/users"), false);
  assert.equal(isAdminPath("/administrateur"), false);
  assert.equal(isAdminPath("/produit/abc"), false);
  assert.equal(isAdminPath(""), false);
});

test("isAccountPath : strictement /account, rien d'autre", () => {
  assert.equal(isAccountPath("/account"), true);
  assert.equal(isAccountPath("/"), false);
  assert.equal(isAccountPath("/account/"), false);
  assert.equal(isAccountPath("/compte"), false);
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
