// tests/hero-lot11.test.ts — grilles (pavage sans trou ni chevauchement), schéma, qualité, gardes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { TILES_VARIANTS, tilesLayout } from "../src/lib/heroGrid.ts";
import {
  contrastRatio,
  gradientColors,
  heroQualityWarnings,
} from "../src/lib/heroQuality.ts";
import { heroStudioWarnings } from "../src/lib/heroStudio.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const IMG = "https://cdn.example.com/a.webp";

const tracks = (t: string): number => {
  const m = t.match(/^repeat\((\d+),\s*1fr\)$/);
  return m ? Number(m[1]) : t.trim().split(/\s+/).length;
};
const span = (v: string, total: number): [number, number] => {
  if (v === "1 / -1") return [1, total];
  const m = v.match(/^(\d+)\s*\/\s*span\s*(\d+)$/);
  return m
    ? [Number(m[1]), Number(m[1]) + Number(m[2]) - 1]
    : [Number(v), Number(v)];
};

test("grilles : chaque disposition pave la grille (aucune case vide ni chevauchement)", () => {
  for (const v of TILES_VARIANTS) {
    for (let n = 0; n <= 3; n++) {
      const L = tilesLayout(v.value, n, true);
      const C = tracks(L.cols);
      const R = tracks(L.rows);
      const seen = new Map<string, number>();
      for (const c of [L.main, ...L.items]) {
        const [c1, c2] = span(c.col, C);
        const [r1, r2] = span(c.row, R);
        assert.ok(
          c1 >= 1 && c2 <= C && r1 >= 1 && r2 <= R,
          `${v.value}/${n} hors grille`,
        );
        for (let x = c1; x <= c2; x++)
          for (let y = r1; y <= r2; y++) {
            const k = `${x},${y}`;
            seen.set(k, (seen.get(k) ?? 0) + 1);
          }
      }
      assert.equal(L.items.length, n, `${v.value}/${n} nombre de tuiles`);
      assert.equal(seen.size, C * R, `${v.value}/${n} cases vides`);
      assert.ok(
        [...seen.values()].every((k) => k === 1),
        `${v.value}/${n} chevauchement`,
      );
    }
  }
});

test("grilles : sans visuel principal, les tuiles se partagent la largeur", () => {
  const L = tilesLayout("bento", 3, false);
  assert.equal(L.cols, "repeat(3, 1fr)");
  assert.equal(L.items.length, 3);
});

test("schéma : variant écrit seulement s'il est posé et valide ; idempotent ; split jamais stocké", () => {
  const mk = (variant?: unknown) =>
    sanitizeHeroConfig({
      layers: [
        {
          type: "tiles",
          main: null,
          items: [{ src: IMG }],
          ...(variant === undefined ? {} : { variant }),
        },
      ],
    }).layers[0] as any;
  assert.equal("variant" in mk(), false);
  assert.equal("variant" in mk("split"), false);
  assert.equal("variant" in mk("masonry"), false);
  assert.equal(mk("bento").variant, "bento");
  const c = sanitizeHeroConfig({
    layers: [{ type: "tiles", main: null, items: [], variant: "mosaic" }],
  });
  assert.deepEqual(sanitizeHeroConfig(c), c);
});

test("contraste : valeurs de référence et lecture des dégradés", () => {
  assert.ok(Math.abs(contrastRatio([255, 255, 255], [0, 0, 0]) - 21) < 0.01);
  assert.equal(
    gradientColors("linear-gradient(135deg, #fff 0%, #000 100%)").length,
    2,
  );
  assert.deepEqual(gradientColors("#abc")[0], [170, 187, 204]);
  assert.equal(gradientColors("rgba(0,0,0,.5)").length, 0);
});

const SABLE = "linear-gradient(135deg, #f0b13d 0%, #f7d789 60%, #f0b13d 100%)";
const CREME = "linear-gradient(135deg, #faf7f0 0%, #f3ece0 60%, #faf7f0 100%)";
const cfg = (o: Record<string, unknown>) =>
  sanitizeHeroConfig({ origin: "studio", ...o });

test("qualité : texte clair forcé sur fond clair → avertissement ; auto → encre sombre, rien", () => {
  const bad = cfg({
    background: { gradient: SABLE },
    layers: [{ type: "text", headline: "Hello", tone: "light" }],
  });
  assert.ok(
    heroQualityWarnings(bad).some(
      (w) => w.level === "warn" && /peu lisible/.test(w.text),
    ),
  );
  const ok = cfg({
    background: { gradient: CREME },
    layers: [{ type: "text", headline: "Hello", tone: "auto" }],
  });
  assert.deepEqual(
    heroQualityWarnings(ok).filter((w) => /lisible|contraste/i.test(w.text)),
    [],
  );
});

test("qualité : image sans voile + texte clair, alt manquant, libellé long", () => {
  const veil = cfg({
    layers: [
      { type: "image", src: IMG, dim: 1, scrim: "none" },
      { type: "text", headline: "x", tone: "light" },
    ],
  });
  assert.ok(heroQualityWarnings(veil).some((w) => /sans voile/.test(w.text)));

  const noAlt = cfg({ layers: [{ type: "image", src: IMG, alt: "" }] });
  assert.ok(
    heroQualityWarnings(noAlt).some(
      (w) => w.level === "warn" && /alternatif/.test(w.text),
    ),
  );
  const withTitle = cfg({
    layers: [
      { type: "image", src: IMG, alt: "" },
      { type: "text", headline: "Soldes" },
    ],
  });
  assert.ok(
    !heroQualityWarnings(withTitle).some((w) => /alternatif/.test(w.text)),
  );

  const long = cfg({
    layers: [],
    ctas: [{ label: "Découvrir toute la collection printemps" }],
  });
  assert.ok(heroQualityWarnings(long).some((w) => /long/.test(w.text)));
  const off = cfg({
    layers: [{ type: "image", src: IMG, alt: "", off: true }],
  });
  assert.ok(
    !heroQualityWarnings(off).some((w) => /alternatif/.test(w.text)),
    "couche œil fermé ignorée",
  );
});

test("studio : les avertissements qualité remontent dans heroStudioWarnings", () => {
  const bad = cfg({
    background: { gradient: SABLE },
    layers: [
      { type: "image", src: null },
      { type: "text", headline: "x", tone: "light" },
    ],
  });
  const none = heroStudioWarnings(bad, { isFirst: false, hasProduct: true });
  assert.ok(
    !none.some((w) => /peu lisible/.test(w.text)),
    "image plein cadre : pas de calcul de contraste",
  );
  const flat = cfg({
    background: { gradient: SABLE },
    layers: [{ type: "text", headline: "x", tone: "light" }],
  });
  assert.ok(
    heroStudioWarnings(flat, { isFirst: false, hasProduct: true }).some((w) =>
      /peu lisible/.test(w.text),
    ),
  );
});

test("garde : le rendu historique des tuiles reste intact et le thème sombre ne casse plus le texte", () => {
  const v = read("src/components/HeroSlideView.tsx");
  assert.ok(
    v.includes(
      "flex flex-col sm:flex-row gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24",
    ),
  );
  assert.ok(
    v.includes(
      "sm:w-[30%] shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar",
    ),
  );
  assert.ok(v.includes("tilesLayout"));
  assert.ok(
    !v.includes('dark ? "var(--color-ink)"'),
    "encre sombre fixe, pas la variable de thème",
  );
  assert.ok(
    !read("src/components/HeroCarousel.tsx").includes(
      'active.lightBg ? "var(--color-ink)"',
    ),
  );
});
