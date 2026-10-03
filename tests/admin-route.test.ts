// tests/admin-route.test.ts — /admin : page à part entière, refresh-safe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { isAdminPath } from "../src/utils/routes.ts";

test("isAdminPath : strictement /admin, rien d'autre", () => {
  assert.equal(isAdminPath("/admin"), true);
  assert.equal(isAdminPath("/"), false);
  assert.equal(isAdminPath("/admin/"), false);
  assert.equal(isAdminPath("/admin/users"), false);
  assert.equal(isAdminPath("/administrateur"), false);
  assert.equal(isAdminPath("/produit/abc"), false);
  assert.equal(isAdminPath(""), false);
});
