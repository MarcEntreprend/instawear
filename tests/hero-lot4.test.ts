// tests/hero-lot4.test.ts — filtre CSS, résolution des slides HTML, gardes SQL (lot 4).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroCss, isSafeStyleAttr } from "../src/lib/heroCss.ts";
import { resolveHeroSlides, heroHasHtml } from "../src/lib/heroResolve.ts";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql4 = readFileSync(
  join(root, "supabase/migrations/20261035_hero_html_table.sql"),
  "utf8",
);

test("css : refus (jamais de réparation silencieuse)", () => {
  const bad = [
    '@import url("https://x/y.css");',
    "a{background:url(data:image/png;base64,AAA)}",
    "a{background:url(http://x/y.png)}",
    "a{background:u\\72l(//x/y)}", // échappement : u\72l( = url(
    "a{width:expression(alert(1))}",
    "a{behavior:url(x.htc)}",
    "@font-face{font-family:x;src:url(https://x/f.woff2)}",
    'a{background:image-set("x.png" 1x)}',
    "a{color:red",
    "a{}</style><script>",
  ];
  for (const b of bad) {
    const r = sanitizeHeroCss(b);
    assert.ok(r.errors.length > 0, b);
    assert.equal(r.css, "", b);
  }
});

test("css : autorisé (media, keyframes, url https, échappement dans une chaîne)", () => {
  const r = sanitizeHeroCss(
    "@media (max-width:767px){.a{color:red}} @keyframes k{from{opacity:0}to{opacity:1}} " +
      '.b{background:url(https://cdn.example.com/a.webp)} .c{content:"\\201C"}',
  );
  assert.deepEqual(r.errors, []);
  assert.ok(r.css.includes("@keyframes k"));
});

test("css : html/body/:root → :host (+ avertissement)", () => {
  const r = sanitizeHeroCss("body{margin:0} html,:root{--x:1}");
  assert.equal(r.errors.length, 0);
  assert.ok(r.css.startsWith(":host{margin:0}"));
  assert.ok(r.css.includes(":host,:host{--x:1}"));
  assert.ok(r.warnings.length > 0);
});

test("attribut style : valeurs sûres seulement", () => {
  assert.equal(isSafeStyleAttr("color:red;margin:0"), true);
  assert.equal(isSafeStyleAttr("background:url(javascript:alert(1))"), false);
  assert.equal(isSafeStyleAttr("a:b}x{c:d"), false);
});

const P = [
  {
    id: "p1",
    title: "Tee",
    description: "d",
    image: "https://cdn.example.com/a.webp",
    isActive: true,
  },
];
const studioHtml = sanitizeHeroConfig({
  origin: "studio",
  layers: [{ type: "html" }],
});
const promo = (o: Record<string, unknown>) =>
  ({
    id: "h1",
    order: 0,
    isActive: true,
    productId: "",
    config: studioHtml,
    ...o,
  }) as any;

test("resolve : un slide HTML n'apparaît qu'une fois son HTML chargé", () => {
  assert.equal(heroHasHtml({ config: studioHtml }), true);
  assert.equal(heroHasHtml({}), false);
  assert.equal(resolveHeroSlides([promo({})], P).length, 0);
  const r = resolveHeroSlides([promo({})], P, Date.now(), {
    h1: { html: "<p>x</p>", css: "" },
  });
  assert.equal(r.length, 1);
  assert.equal(r[0].html?.html, "<p>x</p>");
});

test("SQL lot 4 : écriture super_admin, lecture publique = publiés, jamais USING (true)", () => {
  assert.ok(sql4.includes("ENABLE ROW LEVEL SECURITY"));
  for (const op of ["INSERT", "UPDATE", "DELETE"]) {
    assert.ok(sql4.includes(`FOR ${op} TO authenticated`), op);
  }
  assert.ok(sql4.includes("WITH CHECK (public.is_super_admin())"));
  assert.ok(
    sql4.includes("h.is_active = true"),
    "lecture publique = slides publiés",
  );
  assert.ok(!/USING\s*\(\s*true\s*\)/i.test(sql4), "plus de lecture large");
  assert.ok(sql4.includes("<= 51200"), "plafond 50 Ko en base");
});
