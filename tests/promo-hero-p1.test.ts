// tests/promo-hero-p1.test.ts
// Fix LIMITED (deal par produit, fini le latch global) + Hero Phase 1
// (image custom, presets, preview live). Réel (isDealLive) + miroirs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isDealLive } from "../src/utils/deals.ts";
import { normalizeHeroLink } from "../src/components/HeroCarousel.tsx";

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
  const admin = read("src/admin/PromotionsPage.tsx");
  assert.ok(admin.includes("Plein écran (image de fond)"), "choix full");
  assert.ok(admin.includes("Partagé (fond + visuel cadré)"), "choix split");
});

test("AdminImageInput standard : lien + import + DnD + paste + aperçu", () => {
  const ui = read("src/admin/ui/AdminImageInput.tsx");
  assert.ok(ui.includes("onDrop"), "drag & drop");
  assert.ok(ui.includes("clipboardData"), "Ctrl+V");
  assert.ok(ui.includes("uploadImage(file, folder)"), "import");
  assert.ok(ui.includes("5 * 1024 * 1024"), "garde 5 Mo");
  const admin = read("src/admin/PromotionsPage.tsx");
  const uses = admin.match(/<AdminImageInput/g) || [];
  assert.ok(uses.length >= 2, "visuel slide + images tuiles standardisés");
  assert.ok(!admin.includes("setUploadingHero"), "plus d'upload ad hoc");
  for (const f of [
    "src/admin/ProductFormPanel.tsx",
    "src/admin/PrintfulProductForm.tsx",
  ]) {
    const src = read(f);
    assert.ok(src.includes("<AdminImageInput"), `${f} : image standardisée`);
    assert.ok(
      !src.includes('title="Uploader une image"'),
      `${f} : plus d'upload ad hoc`,
    );
  }
});

test("normalizeHeroLink : absolue same-origin -> chemin, jamais de perte silencieuse", () => {
  assert.equal(
    normalizeHeroLink("https://instawear.vercel.app/produit/abc-123"),
    "/produit/abc-123",
  );
  assert.equal(
    normalizeHeroLink("https://instawear.vercel.app/recherche?q=robe#top"),
    "/recherche?q=robe#top",
  );
  assert.equal(normalizeHeroLink("/promotions"), "/promotions");
  assert.equal(normalizeHeroLink("https://evil.com/produit/x"), "");
  assert.equal(normalizeHeroLink("javascript:alert(1)"), "");
  assert.equal(normalizeHeroLink("//evil.com/x"), "");
  assert.equal(normalizeHeroLink(""), "");
  assert.equal(normalizeHeroLink(null), "");
});

test("Hero Phase 2 : kinds image/grid + liens internes + tuiles", () => {
  const hero = read("src/components/HeroCarousel.tsx");
  assert.ok(hero.includes('b.kind ?? "product"'), "kind par défaut");
  assert.ok(hero.includes("activeIsProduct"), "texte partagé = product seul");
  assert.ok(hero.includes("b.tiles ?? []"), "tuiles");
  assert.ok(hero.includes("onBannerLink"), "clics liés");
  const app = read("src/App.tsx");
  assert.ok(app.includes("openHeroLink"), "dispatcher");
  assert.ok(app.includes('startsWith("//")'), "anti open-redirect");
  assert.ok(app.includes('"/promotions"'), "routes connues");
  const api = read("src/api/supabaseApi.ts");
  assert.ok(api.includes("sanitizeHeroPhase2"), "assainit");
  assert.ok(api.includes(".slice(0, 3)"), "tuiles capées");
  const admin = read("src/admin/PromotionsPage.tsx");
  assert.ok(admin.includes('"Produit"'), "choix produit expliqué");
  assert.ok(admin.includes('"Visuel"'), "choix image expliqué");
  assert.ok(admin.includes('"Grille"'), "choix grid");
  assert.ok(admin.includes("Ajouter une tuile"), "éditeur tuiles");
  assert.ok(admin.includes("Lien au clic (vide = fiche produit)"), "lien pour tous");
});

test("Hero Phase 1 : image custom + presets + preview", () => {
  const admin = read("src/admin/PromotionsPage.tsx");
  assert.ok(admin.includes("HERO_BG_PRESETS"), "presets");
  assert.ok(admin.includes("Personnalisé (CSS avancé)"), "champ libre gardé");
  const ui = read("src/admin/ui/AdminImageInput.tsx");
  assert.ok(ui.includes("uploadImage(file, folder)"), "upload mutualisé");
  assert.ok(admin.includes('folder="hero"'), "dossier hero");
  assert.ok(admin.includes("Aperçu live du slide") || admin.includes("Aperçu live"), "preview");
  assert.ok(admin.includes("heroBackground(form.bgGradient)"), "fond réel");
  // Le champ image traverse jusqu'au rendu (zéro backend : colonne déjà là).
  const api = read("src/api/supabaseApi.ts");
  assert.ok(api.includes("image: promo.image"), "persisté create/update");
  const app = read("src/App.tsx");
  assert.ok(app.includes("promo.image || product?.image"), "prioritaire au rendu");
});
