// tests/catalog-scroll.test.ts — offset de scroll catalogue (pur).
import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogScrollTop } from "../src/utils/scroll.ts";

test("catalogScrollTop : ancre sous le header + marge, jamais négatif", () => {
  // Section à 1200px du viewport, scrollé à 500, header 64 -> 1628.
  assert.equal(catalogScrollTop(1200, 500, 64), 1628);
  // Déjà visible au-dessus du header -> clampé à 0.
  assert.equal(catalogScrollTop(-100, 50, 64), 0);
  // Gap custom.
  assert.equal(catalogScrollTop(1000, 0, 64, 16), 920);
});
