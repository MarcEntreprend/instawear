// tests/hero-schema.test.ts — Hero Studio Phase 1 : schéma de composition v1.
// Miroir de la migration 20261034 : buildHeroConfigFromLegacy DOIT rester
// l'exact équivalent TS du backfill SQL (si l'un change, l'autre doit changer).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanHeroFont,
  cleanHeroHidden,
  cleanHeroLink,
  cleanHeroSrc,
  cleanHeroBackground,
  heroEffectiveFont,
  isHeroHidden,
  sanitizeHeroConfig,
  parseHeroConfig,
  buildHeroConfigFromLegacy,
  heroPayloadBudget,
  isHeroScheduledLive,
} from "../src/lib/heroSchema.ts";

const IMG = "https://cdn.example.com/a.webp";

test("cleanHeroLink : interne seulement", () => {
  assert.equal(cleanHeroLink("/promotions"), "/promotions");
  assert.equal(cleanHeroLink("//evil.com"), null);
  assert.equal(cleanHeroLink("https://evil.com/x"), null);
  assert.equal(cleanHeroLink("javascript:alert(1)"), null);
  assert.equal(
    cleanHeroLink("https://instawear.vercel.app/faq?x=1"),
    "/faq?x=1",
  );
});

test("cleanHeroSrc : http(s) ou chemin, jamais data:/javascript:/protocol-relative", () => {
  assert.equal(cleanHeroSrc(IMG), IMG);
  assert.equal(cleanHeroSrc("/a.png"), "/a.png");
  assert.equal(cleanHeroSrc("data:image/png;base64,AAAA"), null);
  assert.equal(cleanHeroSrc("javascript:alert(1)"), null);
  assert.equal(cleanHeroSrc("//cdn.x/a.png"), null);
});

test("cleanHeroBackground : dégradé/couleur uniquement", () => {
  assert.equal(
    cleanHeroBackground("linear-gradient(135deg, #fff 0%, #000 100%)"),
    "linear-gradient(135deg, #fff 0%, #000 100%)",
  );
  assert.equal(cleanHeroBackground("url(https://track.me/x.png)"), "");
  assert.equal(cleanHeroBackground("red; background:url(x)"), "");
});

test("sanitizeHeroConfig : entrées pourries => config valide par défaut", () => {
  for (const bad of [null, undefined, "x", 42, [], {}]) {
    const c = sanitizeHeroConfig(bad);
    assert.equal(c.v, 1);
    assert.equal(c.origin, "legacy");
    assert.equal(c.sizing.mode, "fixed");
    assert.deepEqual(c.layers, []);
    assert.deepEqual(c.ctas, []);
  }
});

test("sizing : auto et fixed sont mutuellement exclusifs", () => {
  const a = sanitizeHeroConfig({
    sizing: {
      mode: "auto",
      width: "contained",
      ratio: { desktop: 99, mobile: 0 },
      height: { unit: "px", value: 300 },
    },
  });
  assert.equal(a.sizing.mode, "auto");
  assert.equal("height" in a.sizing, false);
  assert.deepEqual((a.sizing as any).ratio, { desktop: 6, mobile: 0.3 });
  assert.equal(a.sizing.width, "contained");

  const f = sanitizeHeroConfig({
    sizing: {
      mode: "fixed",
      ratio: { desktop: 2, mobile: 1 },
      height: { unit: "vh", value: 5 },
    },
  });
  assert.equal(f.sizing.mode, "fixed");
  assert.equal("ratio" in f.sizing, false);
  assert.deepEqual((f.sizing as any).height, { unit: "vh", value: 30 });

  assert.equal(
    sanitizeHeroConfig({ sizing: { mode: "wat" } }).sizing.mode,
    "fixed",
  );
});

test("CTA : sans label écarté, positions bornées, ids uniques, max 4", () => {
  const c = sanitizeHeroConfig({
    ctas: [
      { id: "a", label: "Go", pos: { desktop: { x: -20, y: 250 } } },
      { id: "a", label: "Two", link: "https://evil.com" },
      { label: "" },
      { label: "Three" },
      { label: "Four" },
      { label: "Five" },
    ],
  });
  assert.equal(c.ctas.length, 4);
  assert.deepEqual(c.ctas[0].pos, { desktop: { x: 0, y: 100 } });
  assert.equal(c.ctas[1].link, null);
  assert.equal(new Set(c.ctas.map((x) => x.id)).size, 4);
});

test("tiles : 3 max, image invalide écartée, lien externe vidé", () => {
  const c = sanitizeHeroConfig({
    layers: [
      {
        type: "tiles",
        main: null,
        items: [
          { src: IMG, link: "/promotions" },
          { src: "javascript:x" },
          { src: IMG, link: "https://evil.com" },
          { src: IMG },
          { src: IMG },
        ],
      },
    ],
  });
  const t: any = c.layers[0];
  assert.equal(t.items.length, 3);
  assert.equal(t.items[1].link, null);
});

test("parseHeroConfig : non migré / mauvaise version => null", () => {
  assert.equal(parseHeroConfig({ v: 1 }), null);
  assert.equal(parseHeroConfig({ v: 2, layers: [] }), null);
  assert.equal(parseHeroConfig(null), null);
  assert.notEqual(parseHeroConfig({ v: 1, layers: [] }), null);
});

test("legacy product/full : image .55 + scrim gauche + texte + CTA inline", () => {
  const c = buildHeroConfigFromLegacy({
    kind: "product",
    layout: "full",
    headline: "Ligne 1\nligne 2",
    sub: "",
    cta: "",
    tag: "",
    showTag: true,
    image: IMG,
    bgGradient: "",
    linkUrl: null,
    tiles: null,
    productId: "p1",
  });
  assert.equal(c.origin, "legacy");
  assert.deepEqual(c.layers[0], {
    type: "image",
    src: IMG,
    alt: "",
    fit: "cover",
    dim: 0.55,
    scrim: "left",
  });
  const t: any = c.layers[1];
  assert.equal(t.type, "text");
  assert.equal(t.tone, "light");
  assert.equal(t.fromProduct, true);
  assert.equal(t.headline, "Ligne 1\nligne 2");
  assert.equal(c.ctas[0].label, "Discover");
  assert.equal(c.ctas[0].pos, null);
});

test("legacy product/split : card à droite, ton auto", () => {
  const c = buildHeroConfigFromLegacy({
    kind: "product",
    layout: "split",
    image: null,
    productId: "p1",
  });
  const card: any = c.layers[0];
  assert.equal(card.type, "card");
  assert.equal(card.side, "right");
  assert.equal(card.src, null);
  assert.equal(card.productId, "p1");
  assert.equal((c.layers[1] as any).tone, "auto");
});

test("legacy image : fond plein, 1re ligne seule, CTA positionné", () => {
  const c = buildHeroConfigFromLegacy({
    kind: "image",
    layout: "split",
    image: IMG,
    headline: "A\nB",
    cta: "Voir",
    linkUrl: "/promotions",
  });
  assert.equal((c.layers[0] as any).scrim, "bottom");
  const t: any = c.layers[1];
  assert.equal(t.headlineLines, "first");
  assert.equal(t.showSub, false);
  assert.deepEqual(c.ctas[0].pos, {
    desktop: { x: 96, y: 82 },
    mobile: { x: 96, y: 84 },
  });
  assert.equal(c.ctas[0].link, "/promotions");
});

test("legacy grid : tuiles valides seulement, label = 1re ligne — sous-texte", () => {
  const c = buildHeroConfigFromLegacy({
    kind: "grid",
    layout: "split",
    image: IMG,
    headline: "abcd\nefg",
    sub: "sub",
    tiles: [
      { image: IMG, label: "T1", link: "/faq" },
      { image: "" },
      { image: IMG, link: "https://evil.com" },
    ],
  });
  const g: any = c.layers[0];
  assert.equal(g.type, "tiles");
  assert.equal(g.main.label, "abcd — sub");
  assert.equal(g.items.length, 2);
  assert.equal(g.items[1].link, null);
  assert.deepEqual(c.ctas, []);
});

test("buildHeroConfigFromLegacy est idempotent via sanitizeHeroConfig", () => {
  for (const kind of ["product", "image", "grid"]) {
    for (const layout of ["full", "split"]) {
      const c = buildHeroConfigFromLegacy({
        kind,
        layout,
        image: IMG,
        headline: "x",
        tiles: [{ image: IMG }],
      });
      assert.deepEqual(sanitizeHeroConfig(c), c);
    }
  }
});

test("budget 50 Ko : mesure en OCTETS UTF-8, plafond inclusif", () => {
  assert.equal(heroPayloadBudget("a".repeat(35839), "").level, "ok");
  assert.equal(heroPayloadBudget("a".repeat(35840), "").level, "warn");
  assert.equal(heroPayloadBudget("a".repeat(51200), "").level, "warn");
  assert.equal(heroPayloadBudget("a".repeat(51201), "").level, "over");
  assert.equal(heroPayloadBudget("é", "").bytes, 2);
  assert.equal(
    heroPayloadBudget("a".repeat(30000), "b".repeat(21201)).level,
    "over",
  );
});

test("hidden (02) : que des true explicites, absent sinon", () => {
  assert.equal(cleanHeroHidden(undefined), undefined);
  assert.equal(cleanHeroHidden({}), undefined);
  assert.equal(cleanHeroHidden({ mobile: false }), undefined);
  assert.deepEqual(cleanHeroHidden({ mobile: true }), { mobile: true });
  assert.deepEqual(cleanHeroHidden({ mobile: 1 as never }), undefined);
  assert.equal(isHeroHidden(undefined, false), false);
  assert.equal(isHeroHidden({ mobile: true }, true), true);
  assert.equal(isHeroHidden({ mobile: true }, false), false);
  assert.equal(isHeroHidden({ desktop: true }, false), true);
  const c = sanitizeHeroConfig({
    layers: [{ type: "text", hidden: { mobile: true } }],
    ctas: [{ label: "Go", hidden: { desktop: true } }],
  });
  assert.deepEqual((c.layers[0] as { hidden?: unknown }).hidden, {
    mobile: true,
  });
  assert.deepEqual(c.ctas[0].hidden, { desktop: true });
  // Legacy inchangé : aucune clé hidden ajoutée.
  const legacy = buildHeroConfigFromLegacy({ kind: "product", image: null });
  assert.ok(
    !("hidden" in (legacy.layers[0] as object)),
    "pas de hidden sur le legacy",
  );
});

test("typo (02) : bornes, motifs, absente par défaut", () => {
  const c = sanitizeHeroConfig({
    layers: [
      {
        type: "text",
        lineHeight: 9,
        letterSpacing: -1,
        align: "middle" as never,
        transform: "blink" as never,
        maxWidth: "10;evil",
        balance: true,
        font: "Comic Sans",
        fontLocked: true,
        fontWeight: 333,
      },
    ],
    ctas: [],
    fontFamily: "javascript:alert(1)",
  });
  const t = c.layers[0] as unknown as Record<string, unknown>;
  assert.equal(t.lineHeight, 2);
  assert.equal(t.letterSpacing, -0.05);
  assert.equal(t.align, "left");
  assert.equal(t.transform, "none");
  assert.equal(t.maxWidth, undefined);
  assert.equal(t.balance, true);
  assert.equal(t.font, undefined);
  assert.equal(t.fontLocked, true);
  assert.equal(t.fontWeight, 300);
  assert.equal(c.fontFamily, undefined);
  const ok = sanitizeHeroConfig({
    fontFamily: "Sora",
    layers: [{ type: "text", font: "Inter", maxWidth: "34ch" }],
    ctas: [],
  });
  assert.equal(ok.fontFamily, "Sora");
  assert.equal(
    (ok.layers[0] as unknown as Record<string, unknown>).font,
    "Inter",
  );
  assert.equal(
    (ok.layers[0] as unknown as Record<string, unknown>).maxWidth,
    "34ch",
  );
  assert.equal(cleanHeroFont(" Inter "), "Inter");
  assert.equal(cleanHeroFont("Comic Sans"), undefined);
  assert.equal(cleanHeroFont(null), undefined);
});

test("heroEffectiveFont : bloc > globale sauf verrou", () => {
  assert.equal(
    heroEffectiveFont({ fontFamily: "Sora" }, { font: "Inter" }),
    "Inter",
  );
  assert.equal(
    heroEffectiveFont({ fontFamily: "Sora" }, {}),
    "Sora",
  );
  assert.equal(
    heroEffectiveFont({ fontFamily: "Sora" }, { fontLocked: true }),
    undefined,
  );
  assert.equal(heroEffectiveFont({}, {}), undefined);
});

test("planification : fenêtre [starts, ends[", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  assert.equal(isHeroScheduledLive(null, null, now), true);
  assert.equal(isHeroScheduledLive("2026-11-28T00:00:00Z", null, now), false);
  assert.equal(isHeroScheduledLive(null, "2026-11-27T12:00:00Z", now), false);
  assert.equal(
    isHeroScheduledLive("2026-11-27T00:00:00Z", "2026-11-28T00:00:00Z", now),
    true,
  );
});
