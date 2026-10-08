// tests/hero-studio.test.ts — Hero Studio lot 3 : factories, presets,
// dimensions de coquille, aperçu via la vraie sélection.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HERO_CTA_POSITIONS,
  blankStudioConfig,
  createHeroCta,
  createHeroLayer,
  duplicateItem,
  heroHistoryInit,
  heroHistoryPush,
  heroHistoryRedo,
  heroHistoryUndo,
  heroStudioCaps,
  moveItem,
} from "../src/lib/heroStudio.ts";
import { HERO_TEMPLATES } from "../src/lib/heroTemplates.ts";
import {
  heroFontHref,
  heroFontUrlsInUse,
  heroFontsInUse,
} from "../src/lib/heroFonts.ts";
import {
  cleanHeroFontUrl,
  parseHeroFontUrlFamilies,
} from "../src/lib/heroSchema.ts";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { selectHeroSlides } from "../src/lib/heroSelect.ts";
import { heroShellStyle } from "../src/components/HeroCarousel.tsx";
import type { HeroPromotion } from "../src/admin/adminTypes.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

test("factories : couches valides, CTA numérotés", () => {
  for (const t of ["image", "card", "tiles", "text", "marquee"] as const) {
    const l = createHeroLayer(t);
    assert.ok(l && l.type === t, t);
  }
  assert.equal(createHeroLayer("html"), null, "html réservé lot 4");
  assert.deepEqual(createHeroCta(0).id, "cta-1");
  assert.deepEqual(createHeroCta(2).id, "cta-3");
  // Round-trip : les factories survivent à sanitize sans changer de forme.
  const cfg = sanitizeHeroConfig({
    origin: "studio",
    layers: (["image", "card", "tiles", "text"] as const).map((t) =>
      createHeroLayer(t),
    ),
    ctas: [createHeroCta(0)],
  });
  assert.equal(cfg.layers.length, 4);
});

test("moveItem / duplicateItem : purs, bornés", () => {
  assert.deepEqual(moveItem(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
  assert.deepEqual(moveItem(["a", "b"], 1, 9), ["a", "b"]);
  assert.deepEqual(moveItem(["a"], 5, 0), ["a"]);
  const src = [{ x: 1 }];
  const dup = duplicateItem(src, 0);
  assert.equal(dup.length, 2);
  (dup[1] as { x: number }).x = 2;
  assert.equal((src[0] as { x: number }).x, 1, "clone profond");
});

test("presets CTA : inline null, positions bornées, bas-droite = legacy", () => {
  const inline = HERO_CTA_POSITIONS.find((p) => p.id === "inline")!;
  assert.equal(inline.pos, null);
  for (const p of HERO_CTA_POSITIONS) {
    if (!p.pos || typeof p.pos === "string") continue;
    for (const pt of [p.pos.desktop, p.pos.mobile].filter(Boolean)) {
      assert.ok(pt!.x >= 0 && pt!.x <= 100, `${p.id}.x`);
      assert.ok(pt!.y >= 0 && pt!.y <= 100, `${p.id}.y`);
    }
  }
  const br = HERO_CTA_POSITIONS.find((p) => p.id === "bottom-right")!;
  assert.deepEqual(br.pos, {
    desktop: { x: 96, y: 82 },
    mobile: { x: 96, y: 84 },
  });
});

test("blankStudioConfig : toile studio valide qui marche d'emblée", () => {
  const c = blankStudioConfig();
  assert.equal(c.origin, "studio");
  assert.ok(c.layers.length >= 2);
  assert.equal(c.ctas.length, 1);
  assert.deepEqual(sanitizeHeroConfig(c), c, "idempotent");
});

test("historique : push/undo/redo, coalescence frappe, cap 20", () => {
  const a = blankStudioConfig();
  const b = { ...a, layers: [] };
  let h = heroHistoryInit(a);
  assert.equal(heroHistoryUndo(h), h, "undo vide = inchangé");
  h = heroHistoryPush(h, b, 1000);
  assert.equal(h.past.length, 1);
  assert.equal(h.present.layers.length, 0);
  // Frappe rapide (< 800 ms) : 1 seule entrée.
  const c = { ...b };
  h = heroHistoryPush(h, c, 1500);
  assert.equal(h.past.length, 1, "coalescé");
  // Après 800 ms : nouvelle entrée.
  h = heroHistoryPush(h, a, 5000);
  assert.equal(h.past.length, 2);
  h = heroHistoryUndo(h);
  assert.deepEqual(h.present, c);
  assert.equal(h.future.length, 1);
  h = heroHistoryRedo(h);
  assert.deepEqual(h.present, a);
  assert.equal(h.future.length, 0);
  // Nouveau commit vide le futur.
  h = heroHistoryUndo(h);
  h = heroHistoryPush(h, b, 9000);
  assert.equal(h.future.length, 0);
});

test("templates : 4 gabarits valides et idempotents", () => {
  assert.equal(HERO_TEMPLATES.length, 4);
  const ids = new Set(HERO_TEMPLATES.map((t) => t.id));
  assert.equal(ids.size, 4);
  for (const t of HERO_TEMPLATES) {
    const c = t.build();
    assert.equal(c.origin, "studio", t.id);
    assert.ok(c.layers.length > 0, t.id);
    assert.deepEqual(sanitizeHeroConfig(c), c, `${t.id} idempotent`);
  }
});

test("fonts : href fermé, usage collecté, legacy sans requête", () => {
  assert.equal(heroFontHref([]), null);
  assert.equal(heroFontHref(["Comic Sans"]), null);
  const href = heroFontHref(["Inter", "Sora", "Inter"])!;
  assert.ok(href.includes("family=Inter:"), "dédupliqué");
  assert.ok(href.includes("family=Sora:"), "multi");
  assert.ok(href.includes("display=swap"), "swap forcé");
  assert.ok(!href.includes("Comic"), "inconnu exclu");
  const legacy = selectHeroSlides(
    [
      {
        id: "x",
        productId: "p",
        order: 0,
        isActive: true,
      } as HeroPromotion,
    ],
    [{ id: "p", isActive: true, title: "T", description: "D", image: "i" }],
  );
  assert.deepEqual(heroFontsInUse(legacy), [], "legacy = zéro requête");
  const styled = selectHeroSlides(
    [
      {
        id: "y",
        productId: "",
        order: 0,
        isActive: true,
        config: sanitizeHeroConfig({
          origin: "studio",
          fontFamily: "Sora",
          layers: [{ type: "text", font: "Inter" }],
          ctas: [],
        }),
      } as HeroPromotion,
    ],
    [],
  );
  assert.deepEqual(heroFontsInUse(styled).sort(), ["Inter", "Sora"]);
});

test("fonts URL (lot 12) : css2 seul, swap forcé, familles parsées", () => {
  const good =
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;700";
  const clean = cleanHeroFontUrl(good)!;
  assert.ok(clean.includes("display=swap"), "swap forcé");
  assert.deepEqual(parseHeroFontUrlFamilies(good), ["Fraunces", "Inter"]);
  assert.equal(
    cleanHeroFontUrl("https://fonts.googleapis.com/css2?family=Inter"),
    "https://fonts.googleapis.com/css2?family=Inter&display=swap",
  );
  for (const bad of [
    "https://evil.com/css2?family=Inter",
    "http://fonts.googleapis.com/css2?family=Inter",
    "javascript:alert(1)",
    "https://fonts.googleapis.com/css?family=Inter",
    "https://fonts.googleapis.com/css2?foo=bar",
    "https://fonts.googleapis.com/css2?family=<img>",
    "",
    null,
    "a".repeat(600),
  ]) {
    assert.equal(cleanHeroFontUrl(bad), undefined, String(bad)?.slice(0, 40));
  }
  // Traverse sanitize + usage.
  const c = sanitizeHeroConfig({
    origin: "studio",
    fontUrl: good,
    layers: [],
    ctas: [],
  });
  assert.equal(c.fontUrl, clean);
  const slides = selectHeroSlides(
    [
      {
        id: "u",
        productId: "",
        order: 0,
        isActive: true,
        config: c,
      } as HeroPromotion,
    ],
    [],
  );
  assert.deepEqual(heroFontUrlsInUse(slides), [clean]);
  assert.ok(heroFontsInUse(slides).includes("Fraunces"));
});

test("marquee (lot 13) : sanitize borné, vide écarté", () => {
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
  assert.notEqual(createHeroLayer("marquee"), null);
});

test("marquee : rendu CSS-only, jamais de JS, exclu du lead", () => {
  const view = read("src/components/HeroSlideView.tsx");
  assert.ok(view.includes("hero-marquee-inner"), "piste CSS");
  assert.ok(view.includes("aria-hidden"), "moitié fantôme a11y");
  const css = read("src/index.css");
  assert.ok(css.includes(".hero-marquee-inner"), "animation déclarée");
  assert.ok(
    css.includes("--hero-marquee-duration"),
    "durée variable",
  );
  const pre = read("scripts/prerender.ts");
  assert.ok(pre.includes('"marquee"'), "lead jamais animé");
  const ed = read("src/admin/HeroStudioEditor.tsx");
  assert.ok(ed.includes("Bandeau"), "éditeur : couche ajoutable");
  assert.ok(ed.includes("position 1"), "avertissement LCP");
});

test("caps : plafonds schéma respectés", () => {
  const c = blankStudioConfig();
  const caps = heroStudioCaps(c);
  assert.equal(caps.layersLeft, 8 - c.layers.length);
  assert.equal(caps.ctasLeft, 4 - c.ctas.length);
});

test("heroShellStyle : legacy => {} (classes d'origine), studio => style", () => {
  const legacy = selectHeroSlides(
    [
      {
        id: "x",
        productId: "p",
        order: 0,
        isActive: true,
      } as HeroPromotion,
    ],
    [
      {
        id: "p",
        isActive: true,
        title: "T",
        description: "D",
        image: "i",
      },
    ],
  )[0];
  assert.deepEqual(heroShellStyle(legacy, false), {});
  assert.deepEqual(heroShellStyle(undefined, false), {});

  const custom = {
    ...legacy,
    config: sanitizeHeroConfig({
      origin: "studio",
      sizing: {
        mode: "fixed",
        width: "contained",
        height: { unit: "px", value: 520 },
      },
      layers: [],
      ctas: [],
    }),
  };
  assert.deepEqual(heroShellStyle(custom, false), {
    height: "520px",
    maxWidth: "88rem",
    marginInline: "auto",
  });

  const auto = {
    ...legacy,
    config: sanitizeHeroConfig({
      origin: "studio",
      sizing: {
        mode: "auto",
        width: "full",
        ratio: { desktop: 2.4, mobile: 0.9 },
      },
      layers: [],
      ctas: [],
    }),
  };
  assert.equal(heroShellStyle(auto, false).aspectRatio, "2.4");
  assert.equal(heroShellStyle(auto, true).aspectRatio, "0.9");
});
