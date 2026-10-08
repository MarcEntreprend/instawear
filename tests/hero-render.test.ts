// tests/hero-render.test.ts — Hero Studio lot 2 (rendu unifié) :
// sélection pure, fenêtre de planification, slides sans produit,
// montage paresseux actif+suivant, encre adaptative, classes CTA.
import { test } from "node:test";
import assert from "node:assert/strict";
import { selectHeroSlides } from "../src/lib/heroSelect.ts";
import {
  heroVisibleIndices,
  heroTextDark,
  heroCtaClass,
} from "../src/components/HeroSlideView.tsx";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import type { HeroPromotion } from "../src/admin/adminTypes.ts";

const NOW = Date.parse("2026-11-27T12:00:00Z");

function promo(over: Partial<HeroPromotion> = {}): HeroPromotion {
  return {
    id: "p",
    productId: "prod-1",
    order: 0,
    isActive: true,
    ...over,
  } as HeroPromotion;
}

const PRODS = [
  {
    id: "prod-1",
    isActive: true,
    title: "Tee Champions",
    description: "Coton bio",
    image: "https://cdn.example.com/tee.webp",
  },
];

test("selectHeroSlides : exclu inactif / produit manquant ou inactif", () => {
  const promos = [
    promo({ id: "ok", order: 1 }),
    promo({ id: "off", order: 0, isActive: false }),
    promo({ id: "noprod", order: 2, productId: "ghost" }),
    promo({ id: "deadprod", order: 3, productId: "prod-x" }),
  ];
  const prods = [
    ...PRODS,
    { ...PRODS[0], id: "prod-x", isActive: false },
  ];
  const out = selectHeroSlides(promos, prods, NOW);
  assert.deepEqual(
    out.map((s) => s.id),
    ["ok"],
  );
});

test("selectHeroSlides : slide sans produit conservé + tri order", () => {
  const promos = [
    promo({ id: "b", order: 2 }),
    promo({ id: "free", order: 0, productId: "" }),
    promo({ id: "a", order: 1 }),
  ];
  const out = selectHeroSlides(promos, PRODS, NOW);
  assert.deepEqual(
    out.map((s) => s.id),
    ["free", "a", "b"],
  );
  assert.equal(out[0].product, null);
  assert.equal(out[0].productId, "");
});

test("selectHeroSlides : fenêtre de planification [starts, ends[", () => {
  const promos = [
    promo({ id: "future", startsAt: "2026-11-28T00:00:00Z" }),
    promo({ id: "past", endsAt: "2026-11-27T12:00:00Z" }),
    promo({
      id: "live",
      startsAt: "2026-11-27T00:00:00Z",
      endsAt: "2026-11-28T00:00:00Z",
    }),
    promo({ id: "open" }),
  ];
  const out = selectHeroSlides(promos, PRODS, NOW);
  assert.deepEqual(
    out.map((s) => s.id).sort(),
    ["live", "open"],
  );
});

test("selectHeroSlides : fallbacks cuits identiques à l'historique", () => {
  const out = selectHeroSlides([promo({ id: "x" })], PRODS, NOW);
  const s = out[0];
  assert.equal(s.title, "Tee Champions");
  assert.equal(s.headline, "Tee Champions");
  assert.equal(s.sub, "Coton bio");
  assert.equal(s.cta, "Discover");
  assert.equal(s.tag, "⚡ PROMOTION");
  assert.equal(s.image, "https://cdn.example.com/tee.webp");
  assert.equal(s.layout, "full");
  assert.equal(s.kind, "product");
  assert.equal(s.config.origin, "legacy");
  assert.ok(s.config.layers.length > 0);
});

test("selectHeroSlides : config stockée conservée (pas re-dérivée)", () => {
  const stored = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ type: "html" }],
    ctas: [],
  });
  const out = selectHeroSlides(
    [promo({ id: "x", config: stored })],
    PRODS,
    NOW,
  );
  assert.equal(out[0].config.origin, "studio");
  assert.deepEqual(out[0].config.layers, [{ type: "html" }]);
});

test("heroVisibleIndices : actif + suivant, bouclage, cas limites", () => {
  assert.deepEqual(heroVisibleIndices(0, 3), [0, 1]);
  assert.deepEqual(heroVisibleIndices(2, 3), [2, 0]);
  assert.deepEqual(heroVisibleIndices(0, 1), [0]);
  assert.deepEqual(heroVisibleIndices(0, 0), []);
});

test("heroTextDark : adaptatif split/fond clair, tones explicites", () => {
  const light = "linear-gradient(135deg, #faf7f0 0%, #fff 100%)";
  const dark = "linear-gradient(135deg, #111 0%, #222 100%)";
  const base = selectHeroSlides(
    [promo({ id: "x", layout: "split" })],
    PRODS,
    NOW,
  )[0];
  assert.equal(
    heroTextDark({ ...base, layout: "split", bgGradient: light }),
    true,
    "split fond clair => encre sombre",
  );
  assert.equal(
    heroTextDark({ ...base, layout: "split", bgGradient: dark }),
    false,
  );
  assert.equal(heroTextDark({ ...base, layout: "full" }), false);
  const darkCfg = sanitizeHeroConfig({
    layers: [
      {
        type: "text",
        anchor: "center",
        tone: "dark",
        tag: "",
        showTag: false,
        headline: "Hi",
        headlineLines: "all",
        sub: "",
        showSub: false,
        fromProduct: false,
      },
    ],
    ctas: [],
  });
  assert.equal(
    heroTextDark({ ...base, layout: "full", config: darkCfg }),
    true,
    "tone dark => encre sombre même en full",
  );
});

test("heroCtaClass : accent défaut, ghost, light/dark mappés", () => {
  assert.equal(heroCtaClass("accent").className, "btn btn-accent");
  assert.equal(heroCtaClass("ghost").className, "btn btn-ghost");
  assert.equal(heroCtaClass("light").extra?.background, "#fff");
  assert.equal(heroCtaClass("dark").extra?.background, "#111");
});
