// tests/hero-lot6.test.ts — drapeaux œil/verrou/masquage + politique du sanitizer HTML.
import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeHeroConfig,
  cleanHeroLink,
  cleanHeroSrc,
} from "../src/lib/heroSchema.ts";
import { resolveHeroSlides, heroHasHtml } from "../src/lib/heroResolve.ts";
import {
  tagAction,
  renameTag,
  urlOk,
  cleanSrcset,
  decideAttr,
} from "../src/lib/heroHtmlPolicy.ts";

const IMG = "https://cdn.example.com/a.webp";

test("drapeaux : posés seulement s'ils sont valides, absents sinon (backfill intact)", () => {
  const c = sanitizeHeroConfig({
    layers: [
      { type: "image", src: IMG, off: true, lock: true, hide: "mobile" },
      { type: "text", hide: "tablet", off: "yes" },
    ],
    ctas: [{ label: "Go", hide: "desktop", lock: true }],
  });
  assert.equal(c.layers[0].off, true);
  assert.equal(c.layers[0].lock, true);
  assert.equal(c.layers[0].hide, "mobile");
  assert.equal("off" in c.layers[1], false);
  assert.equal("hide" in c.layers[1], false);
  assert.equal(c.ctas[0].hide, "desktop");
  assert.deepEqual(sanitizeHeroConfig(c), c); // idempotent
  const plain = sanitizeHeroConfig({ layers: [{ type: "image", src: IMG }] });
  assert.equal("off" in plain.layers[0], false);
});

test("resolve : une couche œil fermé ne compte ni comme visuel ni comme HTML", () => {
  const offImg = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ type: "image", src: IMG, off: true }],
  });
  const p = {
    id: "s",
    order: 0,
    isActive: true,
    productId: "",
    config: offImg,
  } as any;
  assert.equal(resolveHeroSlides([p], []).length, 0);
  const offHtml = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ type: "html", off: true }],
  });
  assert.equal(heroHasHtml({ config: offHtml }), false);
});

test("liens / sources : l'antislash est refusé", () => {
  assert.equal(cleanHeroLink("/\\evil.com"), null);
  assert.equal(cleanHeroSrc("/\\evil.com/a.png"), null);
  assert.equal(cleanHeroLink("/promotions"), "/promotions");
  assert.equal(urlOk("/\\evil.com"), false);
  assert.equal(urlOk("//evil.com"), false);
  assert.equal(urlOk("https://cdn.example.com/a.webp"), true);
  assert.equal(urlOk("javascript:alert(1)"), false);
  assert.equal(urlOk("https://x.com/a b.png"), false);
});

test("policy : balises (liste blanche, drop avec contenu, unwrap)", () => {
  assert.equal(tagAction("div"), "keep");
  assert.equal(tagAction("IMG"), "keep");
  for (const t of [
    "script",
    "style",
    "iframe",
    "svg",
    "math",
    "form",
    "input",
    "template",
  ]) {
    assert.equal(tagAction(t), "drop", t);
  }
  for (const t of ["font", "center", "button", "details", "foo-bar"]) {
    assert.equal(tagAction(t), "unwrap", t);
  }
  assert.equal(renameTag("H1"), "h2");
  assert.equal(renameTag("p"), "p");
});

test("policy : attributs", () => {
  assert.equal(decideAttr("div", "onclick", "alert(1)").keep, false);
  assert.equal(decideAttr("div", "style", "color:red").keep, true);
  assert.equal(
    decideAttr("div", "style", "background:url(javascript:alert(1))").keep,
    false,
  );
  assert.equal(decideAttr("a", "href", "https://evil.com").keep, false);
  assert.deepEqual(decideAttr("a", "href", "/promotions"), {
    keep: true,
    value: "/promotions",
  });
  assert.equal(decideAttr("a", "href", "#top").keep, true);
  assert.equal(
    decideAttr("img", "src", "data:image/png;base64,AAA").keep,
    false,
  );
  assert.equal(
    decideAttr("img", "src", "https://cdn.example.com/a.webp").keep,
    true,
  );
  assert.equal(
    decideAttr("img", "srcset", "https://a.com/1.png 1x, /b.png 2x").keep,
    true,
  );
  assert.equal(decideAttr("img", "srcset", "javascript:x 1x").keep, false);
  assert.equal(decideAttr("div", "src", "https://a.com/x").keep, false); // pas d'src sur un div
  assert.equal(decideAttr("div", "id", "x").keep, false);
  assert.equal(decideAttr("td", "colspan", "2").keep, true);
  assert.equal(decideAttr("div", "aria-label", "x").keep, true);
  assert.equal(
    cleanSrcset("https://a.com/1.png 1x, https://a.com/2.png 2x"),
    "https://a.com/1.png 1x, https://a.com/2.png 2x",
  );
  assert.equal(cleanSrcset("https://a.com/1.png 5y"), null);
});
