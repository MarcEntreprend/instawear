// tests/promo-hero-p1.test.ts
// Fix LIMITED (deal par produit, fini le latch global) + Hero Phase 1
// (image custom, presets, preview live). Réel (isDealLive) + miroirs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isDealLive } from "../src/utils/deals.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");
const NOW = Date.now();

test("isDealLive : actif + prix + fin future (ou absente)", () => {
  const future = new Date(NOW + 3600_000).toISOString();
  const past = new Date(NOW - 1000).toISOString();
  assert.equal(isDealLive({ dealActive: true, dealPrice: 10, dealEndsAt: future }, NOW), true);
  assert.equal(isDealLive({ dealActive: true, dealPrice: 10 }, NOW), true);
  assert.equal(isDealLive({ dealActive: true, dealPrice: 10, dealEndsAt: past }, NOW), false);
  assert.equal(isDealLive({ dealActive: false, dealPrice: 10, dealEndsAt: future }, NOW), false);
  assert.equal(isDealLive({ dealActive: true, dealPrice: 0, dealEndsAt: future }, NOW), false);
  assert.equal(isDealLive({ dealActive: true }, NOW), false);
  assert.equal(isDealLive(null), false);
  // Chaque deal meurt à SA date : pas de latch global.
  assert.equal(
    isDealLive({ dealActive: true, dealPrice: 5, dealEndsAt: past }, NOW) ||
      isDealLive({ dealActive: true, dealPrice: 5, dealEndsAt: future }, NOW),
    true,
  );
});

test("latch global supprimé (fini le flicker + la contagion)", () => {
  const app = read("src/App.tsx");
  assert.ok(!app.includes("setDealExpired"), "plus de latch");
  assert.ok(!app.includes("setDealFadingOut"), "plus de fade global");
  assert.ok(app.includes("isDealLive(product)"), "gating par produit");
  const card = read("src/components/StoreProductCard.tsx");
  assert.ok(card.includes("isDealLive(product)"), "carte par produit");
  assert.ok(!card.includes("deal-fade-out"), "plus de classe fade");
  assert.ok(!card.includes("dealExpired"), "plus de prop globale");
});

test("Hero layout au choix (défaut full = avant)", () => {
  const hero = read("src/components/HeroCarousel.tsx");
  assert.ok(hero.includes('(b.layout ?? "full") === "split"'), "branche par slide");
  assert.ok(hero.includes("linear-gradient(90deg, rgba(15,13,10,.68)"), "full restauré");
  const api = read("src/api/supabaseApi.ts");
  assert.ok(api.includes('layout === "split" ? "split" : "full"'), "normalisé API");
  const admin = read("src/admin/PromotionsPage.tsx");
  assert.ok(admin.includes("Plein écran (image de fond)"), "choix full");
  assert.ok(admin.includes("Partagé (fond + visuel cadré)"), "choix split");
  assert.ok(
    admin.includes('((form as any).layout ?? "full") === "full"'),
    "preview fidèle",
  );
  assert.ok(hero.includes("aspect-[4/5]"), "split : visuel cadré");
  assert.ok(hero.includes("max-w-[62%] sm:max-w-xl"), "split : texte hors image");
});

test("Hero Phase 1 : image custom + presets + preview", () => {
  const admin = read("src/admin/PromotionsPage.tsx");
  assert.ok(admin.includes("HERO_BG_PRESETS"), "presets");
  assert.ok(admin.includes("Personnalisé (CSS avancé)"), "champ libre gardé");
  assert.ok(admin.includes('uploadImage(file, "hero")'), "upload dédié");
  assert.ok(admin.includes("Aperçu live du slide") || admin.includes("Aperçu live"), "preview");
  assert.ok(admin.includes("heroBackground(form.bgGradient)"), "fond réel");
  // Le champ image traverse jusqu'au rendu (zéro backend : colonne déjà là).
  const api = read("src/api/supabaseApi.ts");
  assert.ok(api.includes("image: promo.image"), "persisté create/update");
  const app = read("src/App.tsx");
  assert.ok(app.includes("promo.image || product?.image"), "prioritaire au rendu");
});
