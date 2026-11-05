// tests/hero-lot16.test.ts — gabarits « grilles » : config valide, publiable sans produit, avertissement placeholder.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { resolveHeroSlides } from "../src/lib/heroResolve.ts";
import { heroQualityWarnings } from "../src/lib/heroQuality.ts";
import {
  HERO_TEMPLATES,
  HERO_TILES_TEMPLATES,
  heroConfigToLegacy,
  heroStudioWarnings,
} from "../src/lib/heroStudio.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const EXPECT: Record<string, { variant: string; n: number }> = {
  bento: { variant: "bento", n: 3 },
  asym: { variant: "asym", n: 3 },
  mosaic: { variant: "mosaic", n: 3 },
  tiles5: { variant: "bento", n: 5 },
};

test("gabarits grilles : config valide, idempotente, bon variant et bon nombre de tuiles", () => {
  assert.deepEqual(
    HERO_TILES_TEMPLATES.map((t) => t.id).sort(),
    Object.keys(EXPECT).sort(),
  );
  for (const t of HERO_TILES_TEMPLATES) {
    const c = t.build();
    assert.equal(c.origin, "studio");
    assert.deepEqual(sanitizeHeroConfig(c), c);
    const layer: any = c.layers[0];
    assert.equal(c.layers.length, 1);
    assert.equal(layer.type, "tiles");
    assert.equal(layer.variant, EXPECT[t.id].variant);
    assert.equal(layer.items.length, EXPECT[t.id].n);
    assert.deepEqual(c.ctas, []);
    assert.equal(heroConfigToLegacy(c).kind, "grid");
  }
});

test("gabarits grilles : identifiants uniques avec les gabarits existants", () => {
  const ids = [...HERO_TEMPLATES, ...HERO_TILES_TEMPLATES].map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("gabarits grilles : publiable sans produit (les tuiles portent le visuel)", () => {
  for (const t of HERO_TILES_TEMPLATES) {
    const slides = resolveHeroSlides(
      [{ id: "s", order: 0, isActive: true, productId: "", config: t.build() }],
      [],
    );
    assert.equal(slides.length, 1, t.id);
  }
});

test("gabarit 5 tuiles : hero assez haut, aucun avertissement de hauteur", () => {
  const c = HERO_TILES_TEMPLATES.find((t) => t.id === "tiles5")!.build();
  assert.equal((c.sizing as any).height.value, 85);
  assert.ok(!heroQualityWarnings(c).some((w) => /tuiles/.test(w.text)));
});

test("avertissement : image d'exemple placehold.co => warn ; image réelle => rien", () => {
  const sample = HERO_TILES_TEMPLATES[0].build();
  const w = heroStudioWarnings(sample, { isFirst: false, hasProduct: true });
  assert.ok(w.some((x) => x.level === "warn" && /placehold\.co/.test(x.text)));

  const real = sanitizeHeroConfig({
    origin: "studio",
    layers: [
      {
        type: "tiles",
        main: { src: "https://cdn.example.com/m.webp" },
        items: [{ src: "https://cdn.example.com/a.webp" }],
      },
    ],
  });
  assert.ok(
    !heroStudioWarnings(real, { isFirst: false, hasProduct: true }).some((x) =>
      /placehold\.co/.test(x.text),
    ),
  );

  const off = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ ...(sample.layers[0] as object), off: true }],
  });
  assert.ok(
    !heroStudioWarnings(off, { isFirst: false, hasProduct: true }).some((x) =>
      /placehold\.co/.test(x.text),
    ),
  );
});

test("garde : le panneau « Nouveau slide » affiche les deux listes de gabarits", () => {
  const p = read("src/admin/HeroStudioPage.tsx");
  assert.ok(p.includes("[...HERO_TEMPLATES, ...HERO_TILES_TEMPLATES].map"));
});
