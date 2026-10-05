// tests/product-slugs.test.ts — slugs SEO (miroir SQL + lookup + URL).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugifyTitle,
  findProductBySlugOrId,
  productPagePath,
} from "../src/utils/productSlugs.ts";

test("slugifyTitle : minuscules, accents, tirets, bornes", () => {
  assert.equal(
    slugifyTitle("Baby Short Sleeve One Piece - Cook"),
    "baby-short-sleeve-one-piece-cook",
  );
  assert.equal(slugifyTitle("Robe d'Été & Plage!"), "robe-d-ete-plage");
  assert.equal(slugifyTitle("  --Hoodie__Epais-- "), "hoodie-epais");
  assert.equal(slugifyTitle(""), "product");
  assert.equal(slugifyTitle("!!!"), "product");
});

test("findProductBySlugOrId : slug d'abord, id legacy OK", () => {
  const ps = [
    { id: "uuid-1", slug: "tee-cook" },
    { id: "uuid-2", slug: null },
  ];
  assert.equal(findProductBySlugOrId(ps, "tee-cook")?.id, "uuid-1");
  assert.equal(findProductBySlugOrId(ps, "uuid-1")?.id, "uuid-1");
  assert.equal(findProductBySlugOrId(ps, "uuid-2")?.id, "uuid-2");
  assert.equal(findProductBySlugOrId(ps, "nope"), undefined);
  assert.equal(findProductBySlugOrId(ps, null), undefined);
});

test("productPagePath : slug canonique, repli id", () => {
  assert.equal(productPagePath({ id: "u", slug: "tee-cook" }), "/produit/tee-cook");
  assert.equal(productPagePath({ id: "u", slug: null }), "/produit/u");
  assert.equal(productPagePath({ id: "u" }), "/produit/u");
});
