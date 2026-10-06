// tests/product-slugs.test.ts — slugs SEO (miroir SQL + lookup + URL).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugifyTitle,
  findProductBySlugOrId,
  productPagePath,
  matchProductRoute,
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

test("productPagePath : /item/ canonique, variante, repli id", () => {
  assert.equal(productPagePath({ id: "u", slug: "tee-cook" }), "/item/tee-cook");
  assert.equal(productPagePath({ id: "u", slug: null }), "/item/u");
  assert.equal(productPagePath({ id: "u" }), "/item/u");
  assert.equal(
    productPagePath({ id: "u", slug: "tee" }, "#9b9b9b", "M"),
    "/item/tee?color=%239b9b9b&size=M",
  );
});

test("matchProductRoute : /item/ et alias /produit/, sinon null", () => {
  assert.equal(matchProductRoute("/item/tee-cook"), "tee-cook");
  assert.equal(matchProductRoute("/produit/tee-cook"), "tee-cook");
  assert.equal(matchProductRoute("/produit/uuid-1"), "uuid-1");
  assert.equal(matchProductRoute("/"), null);
  assert.equal(matchProductRoute("/item/"), null);
  assert.equal(matchProductRoute("/faq"), null);
});
