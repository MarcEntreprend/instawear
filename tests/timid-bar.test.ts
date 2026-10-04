// tests/timid-bar.test.ts — barre timide : logique pure de visibilité.
import { test } from "node:test";
import assert from "node:assert/strict";
import { timidNext } from "../src/hooks/useTimidBar.ts";

test("timidNext : haut toujours visible, down masque, up remontre", () => {
  assert.equal(timidNext(false, 0, 200), true);
  assert.equal(timidNext(false, 5, 200), true);
  assert.equal(timidNext(true, 300, 100), false);
  assert.equal(timidNext(false, 100, 300), true);
});

test("timidNext : zone morte anti-jitter, état conservé", () => {
  assert.equal(timidNext(true, 105, 100), true);
  assert.equal(timidNext(false, 100, 105), false);
  assert.equal(timidNext(true, 100, 100), true);
});

test("timidNext : seuils custom", () => {
  assert.equal(timidNext(true, 30, 0, 12, 40), true);
  assert.equal(timidNext(true, 100, 0, 200), true);
});
