// tests/hero-lot14.test.ts — règle « raw » partagée, plafond/dégradation du prerender, pesée des images.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { resolveHeroSlides } from "../src/lib/heroResolve.ts";
import { heroImageIsRaw } from "../src/lib/heroImages.ts";
import {
  HERO_WEIGHT_WARN_FIRST,
  fmtKo,
  heroImageSources,
  weighImage,
  weightLevel,
  type WeightFetch,
} from "../src/lib/heroWeight.ts";
import {
  prepareLeadSlide,
  sanitizeHeroHtmlNode,
} from "../scripts/hero-lead.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const IMG = "https://cdn.example.com/a.webp";
const IMG2 = "https://cdn.example.com/b.webp";
const studio = (layers: unknown[]) =>
  sanitizeHeroConfig({ origin: "studio", layers });
const BIG = "<p>" + "a".repeat(52000) + "</p>";
const slideWith = (layers: unknown[], html: string) =>
  resolveHeroSlides(
    [
      {
        id: "s",
        order: 0,
        isActive: true,
        productId: "",
        config: studio(layers),
      },
    ],
    [],
    Date.now(),
    { s: { html, css: "" } },
    null,
  )[0];

test("règle raw : une seule définition, utilisée par la vue et le prerender", () => {
  assert.equal(heroImageIsRaw({ scrim: "left", dim: 0.55 }), true);
  assert.equal(heroImageIsRaw({ scrim: "left", dim: 1 }), false);
  assert.equal(heroImageIsRaw({ scrim: "none", dim: 0.5 }), false);
  assert.ok(
    read("src/components/HeroSlideView.tsx").includes("heroImageIsRaw(layer)"),
  );
  assert.ok(read("scripts/hero-lead.ts").includes("heroImageIsRaw(l)"));
  assert.ok(
    !read("scripts/hero-lead.ts").includes('l.scrim === "left" && l.dim < 1'),
  );
});

test("prerender : plafond aligné sur la base (plus de 60 000)", () => {
  const src = read("scripts/hero-lead.ts");
  assert.ok(src.includes("HERO_PAYLOAD_CAP_BYTES") && !src.includes("60_000"));
});

test("assainisseur Node : au-dessus du plafond => null (jamais de HTML trop lourd dans la page)", async () => {
  assert.equal(await sanitizeHeroHtmlNode(BIG, ""), null);
});

test("dégradation : HTML non assainissable => visuels seuls, sans couche html ni HTML ; sans visuel => null", async () => {
  const withImage = slideWith(
    [{ type: "image", src: IMG }, { type: "html" }],
    BIG,
  );
  const p = await prepareLeadSlide(withImage);
  assert.ok(p, "amorçage visuel conservé");
  assert.equal(p!.clean, null);
  assert.equal(p!.slide.html, null);
  assert.ok(!p!.slide.config.layers.some((l) => l.type === "html"));
  assert.ok(p!.slide.config.layers.some((l) => l.type === "image"));

  const htmlOnly = slideWith([{ type: "html" }], BIG);
  assert.equal(await prepareLeadSlide(htmlOnly), null);
});

test("pesée : HEAD, repli GET, échec => null", async () => {
  const head: WeightFetch = async (_u, init) =>
    init?.method === "HEAD"
      ? {
          ok: true,
          headers: { get: (n) => (n === "content-length" ? "123456" : null) },
        }
      : { ok: false, headers: { get: () => null } };
  assert.equal(await weighImage("u", head), 123456);

  const getOnly: WeightFetch = async (_u, init) =>
    init?.method === "HEAD"
      ? { ok: false, headers: { get: () => null } }
      : {
          ok: true,
          headers: { get: () => null },
          blob: async () => ({ size: 4321 }),
        };
  assert.equal(await weighImage("u", getOnly), 4321);

  const boom: WeightFetch = async () => {
    throw new Error("réseau");
  };
  assert.equal(await weighImage("u", boom), null);
});

test("pesée : seuils (n°1 strict) et formatage", () => {
  assert.equal(weightLevel(HERO_WEIGHT_WARN_FIRST, true), "ok");
  assert.equal(weightLevel(HERO_WEIGHT_WARN_FIRST + 1, true), "warn");
  assert.equal(weightLevel(HERO_WEIGHT_WARN_FIRST + 1, false), "ok");
  assert.equal(weightLevel(500 * 1024 + 1, false), "warn");
  assert.equal(fmtKo(256 * 1024), "256 Ko");
});

test("sources à peser : dédoublonnées, œil fermé ignoré, repli produit, raw pour le fond historique", () => {
  const c = studio([
    { type: "image", src: IMG, dim: 0.55, scrim: "left" },
    { type: "image", src: IMG, dim: 1, scrim: "none" },
    { type: "image", src: IMG2, off: true },
    { type: "card", src: null },
    { type: "tiles", main: { src: IMG2 }, items: [{ src: IMG }] },
  ]);
  const s = heroImageSources(c, "https://cdn.example.com/p.webp");
  assert.deepEqual(s, [
    { src: IMG, raw: true },
    { src: IMG, raw: false },
    { src: "https://cdn.example.com/p.webp", raw: false },
    { src: IMG2, raw: false },
  ]);
  assert.deepEqual(heroImageSources(studio([{ type: "text" }]), null), []);
});

test("garde : le studio branche le contrôle de poids", () => {
  const p = read("src/admin/HeroStudioPage.tsx");
  assert.ok(
    p.includes("<HeroWeightCheck") && p.includes('from "./HeroWeightCheck"'),
  );
});
