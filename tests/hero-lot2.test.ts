// tests/hero-lot2.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveHeroSlides,
  parseLeadHero,
  nextHeroScheduleChange,
} from "../src/lib/heroResolve.ts";
import {
  isLightHeroBg,
  heroBackground,
  normalizeHeroLink,
} from "../src/lib/heroStyle.ts";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import {
  HERO_TEMPLATES,
  heroConfigToLegacy,
  heroStudioWarnings,
  snapHeroPoint,
  moveItem,
  isoToLocalInput,
  localInputToIso,
} from "../src/lib/heroStudio.ts";

const IMG = "https://cdn.example.com/a.webp";
const P = [
  { id: "p1", title: "Tee", description: "d", image: IMG, isActive: true },
  { id: "p2", title: "Off", image: IMG, isActive: false },
];
const promo = (o: Record<string, unknown>) =>
  ({
    id: "s1",
    order: 0,
    isActive: true,
    productId: "p1",
    kind: "product",
    layout: "full",
    headline: "",
    ...o,
  }) as any;

test("resolve : tri order puis id, produit actif requis", () => {
  const r = resolveHeroSlides(
    [
      promo({ id: "b", order: 1 }),
      promo({ id: "a", order: 1 }),
      promo({ id: "c", order: 0 }),
    ],
    P,
  );
  assert.deepEqual(
    r.map((s) => s.id),
    ["c", "a", "b"],
  );
  assert.equal(resolveHeroSlides([promo({ productId: "p2" })], P).length, 0);
  assert.equal(resolveHeroSlides([promo({ productId: "nope" })], P).length, 0);
  assert.equal(resolveHeroSlides([promo({ isActive: false })], P).length, 0);
});

test("resolve : sans produit = studio + visuel propre uniquement", () => {
  const legacyNoProduct = promo({ productId: "", image: IMG });
  assert.equal(resolveHeroSlides([legacyNoProduct], P).length, 0);
  const studio = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ type: "image", src: IMG }],
  });
  const empty = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ type: "text" }],
  });
  assert.equal(
    resolveHeroSlides([promo({ productId: "", config: studio })], P).length,
    1,
  );
  assert.equal(
    resolveHeroSlides([promo({ productId: "", config: empty })], P).length,
    0,
  );
});

test("resolve : planification [starts, ends[", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  const f = (s: string | null, e: string | null) =>
    resolveHeroSlides([promo({ startsAt: s, endsAt: e })], P, now).length;
  assert.equal(f(null, null), 1);
  assert.equal(f("2026-11-28T00:00:00Z", null), 0);
  assert.equal(f(null, "2026-11-27T12:00:00Z"), 0);
  assert.equal(
    nextHeroScheduleChange([promo({ startsAt: "2026-11-28T00:00:00Z" })], now),
    Date.parse("2026-11-28T00:00:00Z"),
  );
  assert.equal(nextHeroScheduleChange([promo({})], now), null);
});

test("resolve : lightBg seulement sans image plein cadre + fond clair", () => {
  const light =
    "linear-gradient(135deg, #faf7f0 0%, #f3ece0 60%, #faf7f0 100%)";
  const split = resolveHeroSlides(
    [promo({ layout: "split", bgGradient: light })],
    P,
  )[0];
  const full = resolveHeroSlides(
    [promo({ layout: "full", bgGradient: light })],
    P,
  )[0];
  assert.equal(split.lightBg, true);
  assert.equal(full.lightBg, false);
});

test("lead : format legacy résolu → slide ; invalide → null", () => {
  const s = parseLeadHero({
    image: IMG,
    headline: "Hi",
    sub: "s",
    cta: "Go",
    productId: "p1",
    kind: "product",
    layout: "full",
  });
  assert.ok(s);
  assert.equal(s!.productId, "p1");
  assert.equal(s!.config.layers[0].type, "image");
  assert.equal(parseLeadHero({ headline: "x" }), null);
  assert.equal(parseLeadHero(null), null);
});

test("heroStyle : compat des 4 helpers historiques", () => {
  assert.equal(isLightHeroBg("#FAF7F0"), true);
  assert.equal(isLightHeroBg(undefined), false);
  assert.match(heroBackground("from-white via-x"), /linear-gradient/);
  assert.equal(heroBackground("#fff"), "#fff");
  assert.equal(
    normalizeHeroLink("https://instawear.vercel.app/faq?x=1"),
    "/faq?x=1",
  );
  assert.equal(normalizeHeroLink("https://evil.com"), "");
});

test("studio : chaque modèle donne une config valide, origin studio, miroir legacy cohérent", () => {
  for (const t of HERO_TEMPLATES) {
    const c = t.build();
    assert.equal(c.origin, "studio");
    assert.deepEqual(sanitizeHeroConfig(c), c);
  }
  const grid = HERO_TEMPLATES.find((t) => t.id === "grid")!.build();
  assert.equal(heroConfigToLegacy(grid).kind, "grid");
  const split = HERO_TEMPLATES.find((t) => t.id === "split")!.build();
  const m = heroConfigToLegacy(split);
  assert.equal(m.kind, "product");
  assert.equal(m.layout, "split");
  assert.equal(
    heroConfigToLegacy(HERO_TEMPLATES.find((t) => t.id === "banner")!.build())
      .kind,
    "image",
  );
});

test("studio : avertissements", () => {
  const blank = HERO_TEMPLATES.find((t) => t.id === "blank")!.build();
  const w = heroStudioWarnings(blank, { isFirst: true, hasProduct: false });
  assert.ok(w.some((x) => x.level === "warn" && /visuel/i.test(x.text)));
  assert.ok(w.some((x) => /n°1/.test(x.text)));
  assert.equal(
    heroStudioWarnings(sanitizeHeroConfig({}), {
      isFirst: false,
      hasProduct: false,
    })[0].level,
    "warn",
  );
});

test("studio : utilitaires", () => {
  assert.equal(snapHeroPoint(49.2), 50);
  assert.equal(snapHeroPoint(12.34), 12.5);
  assert.equal(snapHeroPoint(-5), 0);
  assert.equal(snapHeroPoint(140), 100);
  assert.deepEqual(moveItem([1, 2, 3], 0, 1), [2, 1, 3]);
  const same = [1, 2];
  assert.equal(moveItem(same, 0, -1), same);
  assert.equal(localInputToIso(""), null);
  assert.equal(isoToLocalInput(null), "");
  const iso = "2026-11-27T10:30:00.000Z";
  assert.equal(localInputToIso(isoToLocalInput(iso)), iso);
});
