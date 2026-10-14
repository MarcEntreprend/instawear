// tests/hero-lot15.test.ts — Tuiles jusqu'à 5 : plafond, miroir legacy, tracés 1-3 figés, 4-5 distincts, avertissement.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HERO_MAX_TILES,
  HERO_MAX_TILES_LEGACY,
  buildHeroConfigFromLegacy,
  sanitizeHeroConfig,
} from "../src/lib/heroSchema.ts";
import { TILES_VARIANTS, tilesLayout } from "../src/lib/heroGrid.ts";
import { heroQualityWarnings } from "../src/lib/heroQuality.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const IMG = "https://cdn.example.com/a.webp";

const tilesCfg = (n: number, extra: Record<string, unknown> = {}) =>
  sanitizeHeroConfig({
    origin: "studio",
    ...extra,
    layers: [
      {
        type: "tiles",
        main: { src: IMG },
        items: Array.from({ length: n }, () => ({ src: IMG })),
      },
    ],
  });

test("schéma : plafond 5 tuiles, idempotent ; le miroir legacy reste à 3 (comme le backfill SQL)", () => {
  assert.equal(HERO_MAX_TILES, 5);
  assert.equal(HERO_MAX_TILES_LEGACY, 3);
  const c = tilesCfg(9);
  assert.equal((c.layers[0] as any).items.length, 5);
  assert.deepEqual(sanitizeHeroConfig(c), c);
  const g = buildHeroConfigFromLegacy({
    kind: "grid",
    layout: "split",
    image: IMG,
    headline: "x",
    tiles: Array.from({ length: 5 }, () => ({ image: IMG })),
  }).layers[0] as any;
  assert.equal(g.items.length, 3);
});

test("tracés 1 à 3 : valeurs historiques figées (aucun slide existant ne bouge)", () => {
  assert.deepEqual(tilesLayout("bento", 3, true), {
    cols: "repeat(4, 1fr)",
    rows: "repeat(2, 1fr)",
    main: { col: "1 / span 2", row: "1 / span 2" },
    items: [
      { col: "3 / span 2", row: "1" },
      { col: "3", row: "2" },
      { col: "4", row: "2" },
    ],
  });
  assert.deepEqual(tilesLayout("asym", 3, true), {
    cols: "1.6fr 1fr",
    rows: "1fr 2fr 1fr",
    main: { col: "1", row: "1 / span 3" },
    items: [
      { col: "2", row: "1" },
      { col: "2", row: "2" },
      { col: "2", row: "3" },
    ],
  });
  assert.deepEqual(tilesLayout("mosaic", 2, true).items, [
    { col: "4 / span 3", row: "1" },
    { col: "4 / span 3", row: "2" },
  ]);
  const strip = tilesLayout("strip", 3, true);
  assert.equal(strip.cols, "repeat(3, 1fr)");
  assert.equal(strip.rows, "2fr 1fr");
});

test("tracés 4 et 5 : bon nombre de tuiles et dispositions toutes différentes", () => {
  for (const n of [4, 5]) {
    for (const v of TILES_VARIANTS) {
      assert.equal(
        tilesLayout(v.value, n, true).items.length,
        n,
        `${v.value}/${n}`,
      );
    }
    const sigs = new Set(
      TILES_VARIANTS.map((v) => JSON.stringify(tilesLayout(v.value, n, true))),
    );
    assert.equal(
      sigs.size,
      TILES_VARIANTS.length,
      `dispositions distinctes à ${n} tuiles`,
    );
  }
  // Sans visuel principal, 5 tuiles se partagent la largeur.
  const L = tilesLayout("bento", 5, false);
  assert.equal(L.cols, "repeat(5, 1fr)");
  assert.equal(L.items.length, 5);
});

test("qualité : 4 tuiles ou plus + hero bas => info ; hero assez haut ou 3 tuiles => rien", () => {
  const fixed = (value: number, unit: "vh" | "px" = "vh") => ({
    sizing: { mode: "fixed", width: "full", height: { unit, value } },
  });
  const has = (c: ReturnType<typeof tilesCfg>) =>
    heroQualityWarnings(c).some(
      (w) => w.level === "info" && /tuiles/.test(w.text),
    );
  assert.equal(has(tilesCfg(4, fixed(60))), true);
  assert.equal(has(tilesCfg(5, fixed(500, "px"))), true);
  assert.equal(has(tilesCfg(4, fixed(78))), false);
  assert.equal(has(tilesCfg(4, fixed(700, "px"))), false);
  assert.equal(has(tilesCfg(3, fixed(60))), false);
  assert.equal(
    has(
      tilesCfg(4, {
        sizing: {
          mode: "auto",
          width: "full",
          ratio: { desktop: 2.6, mobile: 0.9 },
        },
      }),
    ),
    true,
  );
});

test("garde : le sélecteur reçoit le nombre réel de tuiles", () => {
  assert.ok(
    read("src/admin/HeroGridPicker.tsx").includes(
      "tilesLayout(v.value, count, true)",
    ),
  );
  assert.ok(
    read("src/admin/HeroStudioPage.tsx").includes(
      "count={Math.min(5, Math.max(1, layer.items.length))}",
    ),
  );
});
