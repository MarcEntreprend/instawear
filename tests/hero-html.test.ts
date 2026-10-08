// tests/hero-html.test.ts — Hero Studio lot 4 : HTML sandboxé.
// Nettoyeur (jamais de script/handler/iframe/URL dangereuse), classification
// des liens, traversée html/css dans la sélection, garde API getHtml.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyHeroHref,
  sanitizeHeroHtml,
} from "../src/lib/heroHtml.ts";
import { selectHeroSlides } from "../src/lib/heroSelect.ts";
import type { HeroPromotion } from "../src/admin/adminTypes.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

test("sanitize : scripts supprimés (toutes formes)", () => {
  assert.equal(
    sanitizeHeroHtml('<p>Hi</p><script>alert(1)</script>'),
    "<p>Hi</p>",
  );
  assert.equal(
    sanitizeHeroHtml('<SCRIPT SRC="x.js">\nvar a=1;\n</SCRIPT><b>ok</b>'),
    "<b>ok</b>",
  );
  assert.equal(sanitizeHeroHtml("<script>alert(1)"), "");
  assert.equal(sanitizeHeroHtml("</script><p>x</p>"), "<p>x</p>");
});

test("sanitize : handlers on* supprimés, contenu gardé", () => {
  assert.equal(
    sanitizeHeroHtml('<div onclick="alert(1)" ONLOAD=\'x\' data-n="1">T</div>'),
    '<div data-n="1">T</div>',
  );
  assert.equal(
    sanitizeHeroHtml("<a href=\"/x\" onmouseover=alert(1)>Go</a>"),
    '<a href="/x">Go</a>',
  );
});

test("sanitize : éléments actifs/hors-portée supprimés, style gardé", () => {
  assert.equal(
    sanitizeHeroHtml(
      '<iframe src="https://evil.com"></iframe><object></object><form><input></form><style>.a{color:red}</style><p>T</p>',
    ),
    "<style>.a{color:red}</style><p>T</p>",
  );
});

test("sanitize : javascript:/data: neutralisés, https gardés", () => {
  assert.equal(
    sanitizeHeroHtml('<a href="javascript:alert(1)">x</a>'),
    '<a href="#">x</a>',
  );
  assert.equal(
    sanitizeHeroHtml("<a HREF='  JaVaScRiPt:alert(1)'>x</a>"),
    '<a HREF="#">x</a>',
  );
  assert.equal(
    sanitizeHeroHtml('<img src="data:image/svg+xml;base64,PHNjcmlwdA==">'),
    '<img src="#">',
  );
  assert.equal(
    sanitizeHeroHtml('<a href="https://shop.com/a?b=1">x</a>'),
    '<a href="https://shop.com/a?b=1">x</a>',
  );
  assert.equal(
    sanitizeHeroHtml('<a href="/promotions">x</a>'),
    '<a href="/promotions">x</a>',
  );
});

test("sanitize : entrées non-string => vide, plafond appliqué", () => {
  assert.equal(sanitizeHeroHtml(null), "");
  assert.equal(sanitizeHeroHtml(42), "");
  assert.ok(sanitizeHeroHtml("a".repeat(70000)).length <= 60000);
});

test("classifyHeroHref : interne / externe / bloqué", () => {
  assert.equal(classifyHeroHref("/promotions"), "internal");
  assert.equal(classifyHeroHref("/a?b=1#c"), "internal");
  assert.equal(classifyHeroHref("//evil.com"), "blocked");
  assert.equal(classifyHeroHref("https://shop.com/x"), "external");
  assert.equal(classifyHeroHref("http://a.b"), "external");
  assert.equal(classifyHeroHref("javascript:alert(1)"), "blocked");
  assert.equal(classifyHeroHref("data:text/html,hi"), "blocked");
  assert.equal(classifyHeroHref("page.html"), "blocked");
  assert.equal(classifyHeroHref(""), "blocked");
  assert.equal(classifyHeroHref("#"), "blocked");
  assert.equal(classifyHeroHref(null), "blocked");
});

test("selectHeroSlides : html/css traversent (vides => absents)", () => {
  const base = {
    id: "x",
    productId: "p",
    order: 0,
    isActive: true,
  } as HeroPromotion;
  const prods = [
    { id: "p", isActive: true, title: "T", description: "D", image: "i" },
  ];
  const withHtml = selectHeroSlides(
    [{ ...base, html: "<b>Hi</b>", css: ".b{}" }],
    prods,
  )[0];
  assert.equal(withHtml.html, "<b>Hi</b>");
  assert.equal(withHtml.css, ".b{}");
  const without = selectHeroSlides([{ ...base, html: "", css: "" }], prods)[0];
  assert.equal(without.html, undefined);
  assert.equal(without.css, undefined);
});

test("couche html : API batch + rendu conditionné au contenu", () => {
  const api = read("src/api/supabaseApi.ts");
  assert.ok(api.includes("async getHtml("), "batch id,html,css");
  assert.ok(api.includes('select("id,html,css")'), "colonnes minimales");
  const view = read("src/components/HeroSlideView.tsx");
  assert.ok(view.includes("HeroHtml"), "rendu sandboxé");
  assert.ok(
    view.includes('l.type === "html"'),
    "conditionné à la couche",
  );
  const app = read("src/App.tsx");
  assert.ok(app.includes("getHtml"), "chargé après la liste");
  const m = api.match(/HERO_LIST_COLUMNS\s*=\s*"([^"]*)"/);
  assert.ok(
    m && !m[1].includes("html"),
    "liste publique sans html/css (jamais dans le chemin LCP)",
  );
});
