// tests/hero-schema.test.ts — Hero Studio Phase 1 : schéma de composition v1.
// Miroir de la migration 20261034 : buildHeroConfigFromLegacy DOIT rester
// l'exact équivalent TS du backfill SQL (si l'un change, l'autre doit changer).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { newLayer } from "../src/lib/heroStudio.ts";
import {
  cleanHeroFont,
  cleanHeroFontUrl,
  cleanHeroLink,
  cleanHeroSrc,
  cleanHeroBackground,
  heroEffectiveFont,
  parseHeroFontUrlFamilies,
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

test("tiles : image invalide écartée, lien externe vidé (plafond testé au lot 15)", () => {
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
  assert.equal(t.items.length, 4); // 5 saisies, 1 image invalide écartée
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

test("typo fine (PORT-15B) : bornes, motifs, absente par défaut", () => {
  const c = sanitizeHeroConfig({
    layers: [
      {
        type: "text",
        lineHeight: 9,
        letterSpacing: -1,
        align: "middle",
        transform: "blink",
        maxWidth: "10;evil",
        balance: true,
      },
    ],
    ctas: [],
  });
  const t = c.layers[0] as unknown as Record<string, unknown>;
  assert.equal(t.lineHeight, 2);
  assert.equal(t.letterSpacing, -0.05);
  assert.equal(t.align, "left");
  assert.equal(t.transform, "none");
  assert.equal(t.maxWidth, undefined);
  assert.equal(t.balance, true);
  const ok = sanitizeHeroConfig({
    layers: [
      {
        type: "text",
        lineHeight: 1.5,
        letterSpacing: 0.02,
        align: "center",
        transform: "uppercase",
        maxWidth: "34ch",
      },
    ],
    ctas: [],
  });
  const o = ok.layers[0] as unknown as Record<string, unknown>;
  assert.equal(o.lineHeight, 1.5);
  assert.equal(o.letterSpacing, 0.02);
  assert.equal(o.align, "center");
  assert.equal(o.transform, "uppercase");
  assert.equal(o.maxWidth, "34ch");
  assert.equal(o.balance, undefined);
  // Legacy byte-clean : aucune clé typo sans saisie.
  const legacy = buildHeroConfigFromLegacy({ kind: "product", image: null });
  for (const l of legacy.layers) {
    assert.ok(!("lineHeight" in (l as object)));
    assert.ok(!("align" in (l as object)));
  }
  assert.deepEqual(sanitizeHeroConfig(legacy), legacy);
});

test("fonts (PORT-15B P3) : liste fermée, URL css2, effective", () => {
  assert.equal(cleanHeroFont(" Inter "), "Inter");
  assert.equal(cleanHeroFont("Comic Sans"), undefined);
  assert.equal(cleanHeroFont(null), undefined);
  const good =
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;700";
  const clean = cleanHeroFontUrl(good)!;
  assert.ok(clean.includes("display=swap"));
  assert.deepEqual(parseHeroFontUrlFamilies(good), ["Fraunces", "Inter"]);
  for (const bad of [
    "https://evil.com/css2?family=Inter",
    "http://fonts.googleapis.com/css2?family=Inter",
    "javascript:alert(1)",
    "https://fonts.googleapis.com/css?family=Inter",
    "https://fonts.googleapis.com/css2?foo=bar",
    "",
    null,
  ]) {
    assert.equal(cleanHeroFontUrl(bad), undefined);
  }
  assert.equal(
    heroEffectiveFont({ fontFamily: "Sora" }, { font: "Inter" }),
    "Inter",
  );
  assert.equal(heroEffectiveFont({ fontFamily: "Sora" }, {}), "Sora");
  assert.equal(
    heroEffectiveFont({ fontFamily: "Sora" }, { fontLocked: true }),
    undefined,
  );
  assert.equal(
    heroEffectiveFont({ fontUrl: good }, {}),
    "Fraunces",
  );
  const c = sanitizeHeroConfig({
    fontFamily: "Sora",
    fontUrl: good,
    layers: [{ type: "text", font: "Inter", fontLocked: true, fontWeight: 333 }],
    ctas: [],
  });
  assert.equal(c.fontFamily, "Sora");
  assert.equal(c.fontUrl, clean);
  const t = c.layers[0] as unknown as Record<string, unknown>;
  assert.equal(t.font, "Inter");
  assert.equal(t.fontLocked, true);
  assert.equal(t.fontWeight, 300);
  const bad = sanitizeHeroConfig({
    fontFamily: "Comic Sans",
    layers: [{ type: "text", fontWeight: 400 }],
    ctas: [],
  });
  assert.equal(bad.fontFamily, undefined);
  assert.equal(
    (bad.layers[0] as unknown as Record<string, unknown>).fontWeight,
    undefined,
  );
});

test("heroFonts (PORT-15B P3) : href fermé, usage, zéro legacy", async () => {
  const { heroFontHref, heroFontsInUse, heroFontUrlsInUse } = await import(
    "../src/lib/heroFonts.ts"
  );
  assert.equal(heroFontHref([]), null);
  assert.equal(heroFontHref(["Comic Sans"]), null);
  const href = heroFontHref(["Inter", "Sora", "Inter"])!;
  assert.ok(href.includes("family=Inter:"));
  assert.ok(href.includes("display=swap"));
  assert.deepEqual(heroFontsInUse([{ config: null }]), []);
  assert.deepEqual(
    heroFontUrlsInUse([{ config: { fontUrl: "https://evil.com/x" } }]),
    [],
  );
});

test("marquee (PORT-15B P4) : sanitize borné, vide écarté", () => {
  const c = sanitizeHeroConfig({
    layers: [
      { type: "marquee", text: "  Soldes  ", speed: 500, direction: "up", tone: "pink" },
      { type: "marquee", text: "   " },
    ],
    ctas: [],
  });
  assert.equal(c.layers.length, 1);
  assert.deepEqual(c.layers[0], {
    type: "marquee",
    text: "Soldes",
    speed: 120,
    direction: "left",
    tone: "dark",
  });
  assert.notEqual(newLayer("marquee"), null);
  assert.equal(newLayer("marquee").type, "marquee");
});

test("marquee (PORT-15B P4) : rendu CSS-only, jamais de JS, exclu du lead", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const view = read("src/components/HeroSlideView.tsx");
  assert.ok(view.includes("hero-marquee-inner"), "piste CSS");
  assert.ok(view.includes("aria-hidden"), "moitié fantôme a11y");
  const css = read("src/index.css");
  assert.ok(css.includes(".hero-marquee-inner"), "animation déclarée");
  assert.ok(css.includes("--hero-marquee-duration"), "durée variable");
  const lead = read("scripts/hero-lead.ts");
  assert.ok(lead.includes('"marquee"'), "lead jamais animé");
  const ed = read("src/admin/HeroStudioPage.tsx");
  assert.ok(ed.includes("Bandeau"), "éditeur : couche ajoutable");
  assert.ok(ed.includes("position 1"), "avertissement LCP");
});

test("PORT-15B P0-P3 : anti-effacement (typo, fonts, theme, header)", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const schema = read("src/lib/heroSchema.ts");
  assert.ok(schema.includes("cleanHeroFont"), "P3 validateurs fonts");
  assert.ok(schema.includes("heroEffectiveFont"), "P3 effectif");
  assert.ok(schema.includes("withTypo"), "P1-P2 typo fine");
  assert.ok(schema.includes("HeroMarqueeLayer"), "P4 marquee");
  const view = read("src/components/HeroSlideView.tsx");
  assert.ok(view.includes("heroFontStack"), "P3 rendu fonts");
  assert.ok(view.includes("hero-marquee-inner"), "P4 rendu marquee");
  const page = read("src/admin/HeroStudioPage.tsx");
  assert.ok(page.includes("fontUrlDraft"), "P3 import URL");
  assert.ok(page.includes("studioTheme"), "P0 theme studio");
  const header = read("src/components/Header.tsx");
  assert.ok(header.includes("musicfestival"), "P0 clé header");
});

test("countdown (PORT-15B P5) : ISO normalisé, invalide écarté", () => {
  const c = sanitizeHeroConfig({
    layers: [
      {
        type: "countdown",
        targetAt: "2026-12-31T23:59:00",
        label: "  Go  ",
        tone: "pink",
        expiredText: "",
      },
      { type: "countdown", targetAt: "n'importe quoi" },
      { type: "countdown" },
    ],
    ctas: [],
  });
  assert.equal(c.layers.length, 1);
  assert.deepEqual(c.layers[0], {
    type: "countdown",
    targetAt: new Date("2026-12-31T23:59:00").toISOString(),
    label: "Go",
    tone: "dark",
    expiredText: "C'est parti !",
  });
  const f = newLayer("countdown") as { targetAt: string };
  assert.ok(Number.isFinite(Date.parse(f.targetAt)), "factory valide");
});

test("countdown (PORT-15B P5) : parties exactes + rendu client-only + exclu du lead", async () => {
  const { heroCountdownParts } = await import(
    "../src/components/HeroCountdown.tsx"
  );
  assert.deepEqual(heroCountdownParts(100000, 1000), {
    d: 0,
    h: 0,
    m: 1,
    s: 39,
    expired: false,
  });
  assert.deepEqual(heroCountdownParts(90061000, 0), {
    d: 1,
    h: 1,
    m: 1,
    s: 1,
    expired: false,
  });
  assert.equal(heroCountdownParts(1000, 1000).expired, true);
  assert.equal(heroCountdownParts(NaN, 0).expired, true);
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (p: string) => readFileSync(join(root, p), "utf8");
  const view = read("src/components/HeroSlideView.tsx");
  assert.ok(view.includes("HeroCountdown"), "rendu dédié");
  const cd = read("src/components/HeroCountdown.tsx");
  assert.ok(cd.includes("setInterval"), "tick 1 s");
  assert.ok(cd.includes("clearInterval"), "nettoyé");
  assert.ok(cd.includes('role="timer"'), "a11y timer");
  const lead = read("scripts/hero-lead.ts");
  assert.ok(lead.includes('"countdown"'), "lead jamais daté");
  const ed = read("src/admin/HeroStudioPage.tsx");
  assert.ok(ed.includes("Compte à rebours"), "éditeur : couche ajoutable");
});
