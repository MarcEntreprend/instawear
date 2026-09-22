// tests/mobile-p2p3.test.ts
// Mobile P2 (safe-area) + P3 (cibles, langue, rupture) : miroirs source.
// Contraintes : desktop intact (valeurs 0 par défaut), backend intact.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

test("P2 : safe-area aux overlays (0 sur desktop)", () => {
  const cart = read("src/components/CartDrawer.tsx");
  assert.ok(
    cart.includes("calc(1.25rem + env(safe-area-inset-bottom))"),
    "panier : footer + home-indicator",
  );
  const co = read("src/components/CheckoutFlow.tsx");
  assert.ok(
    co.includes('paddingBottom: "env(safe-area-inset-bottom)"'),
    "checkout : contenu scrollé",
  );
  const auth = read("src/components/AuthModal.tsx");
  assert.ok(
    auth.includes('paddingBottom: "env(safe-area-inset-bottom)"'),
    "auth bottom-sheet",
  );
  const acc = read("src/components/AccountPage.tsx");
  assert.ok(
    acc.includes('paddingBottom: "env(safe-area-inset-bottom)"'),
    "bottom-nav compte",
  );
  const cat = read("src/components/CatalogSection.tsx");
  assert.ok(
    cat.includes('paddingBottom: "calc(10px + env(safe-area-inset-bottom))"'),
    "filtres : fusionné, plus écrasé",
  );
});

test("P2 : compensation bas de page >= tab bar, desktop inchangé", () => {
  const src = read("src/App.tsx");
  assert.ok(
    src.includes("pb-[calc(68px+env(safe-area-inset-bottom))] lg:pb-16"),
    "mobile 68px+safe, desktop pb-16",
  );
});

test("P3 : pastilles et pastilles-compteurs >= 24px", () => {
  const cat = read("src/components/CatalogSection.tsx");
  assert.ok(
    !cat.includes('font-bold transition-colors"'),
    "pills 24px (aucune sans min-h)",
  );
  assert.ok(cat.includes("min-h-[24px]"), "min-height pastilles");
  assert.ok(
    cat.includes("minHeight: 24"),
    "compteur +N bouton 24px + clavier",
  );
  const strip = read("src/components/product/ThumbStrip.tsx");
  assert.ok(strip.includes("min-h-[24px]"), "+N galerie 24px");
});

test("P3 : étoiles avis 24px sans changer le visuel", () => {
  const src = read("src/components/product/ProductReviews.tsx");
  assert.ok(src.includes("min-w-[28px] min-h-[28px]"), "zone tactile 28px");
});

test("P3 : dots hero tactiles, visuel inchangé", () => {
  const src = read("src/components/HeroCarousel.tsx");
  assert.ok(src.includes("min-w-[24px] min-h-[24px]"), "hit 24px");
  assert.ok(src.includes("h-1.5 rounded-full"), "barre visuelle gardée");
});

test("P3 : rupture lisible sans souris + aria complet", () => {
  const src = read("src/pages/ProductPage.tsx");
  assert.ok(src.includes("blockedReason"), "motif nommé");
  assert.ok(
    src.includes("Temporarily out of stock"),
    "motif visible en texte",
  );
  assert.ok(
    src.includes("`${label} — ${blockedReason}`") ||
      src.includes("${label} — ${blockedReason}"),
    "aria-label complet",
  );
});

test("P3 : storefront EN cohérent (lightbox + loupe)", () => {
  const lb = read("src/components/product/ImageLightbox.tsx");
  assert.ok(lb.includes('aria-label="Close"'), "Close");
  assert.ok(lb.includes('aria-label="Previous image"'), "Previous");
  assert.ok(lb.includes('aria-label="Next image"'), "Next");
  assert.ok(!lb.includes("Fermer"), "plus de FR");
  assert.ok(!lb.includes("précédente"), "plus de FR");
  const zoom = read("src/components/product/ZoomImage.tsx");
  assert.ok(zoom.includes('aria-label="Expand"'), "Expand");
});

test("P3 : pas de srcSet factice (protocole anti-401)", () => {
  const hero = read("src/components/HeroCarousel.tsx");
  assert.ok(!hero.includes("srcSet"), "hero sans srcSet factice");
});
