// tests/mobile-nav-p0p1.test.ts
// Mobile P0 (indicateur d'onglet) + P1 (retour = fermer) : miroirs source
// (App.tsx non importable en node). Contraintes : desktop intact (lg:hidden
// côté composant), backend intact, jamais de PII dans l'historique.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

test("P0 : MobileTabBar reçoit active dérivé de la vue réelle", () => {
  const src = read("src/App.tsx");
  assert.ok(src.includes("active={"), "prop active câblée");
  assert.ok(
    src.includes("showAccountPage || showProfileModal || showAuthModal"),
    "compte prime (3 modales)",
  );
  assert.ok(src.includes("trackingOpen"), "suivi prime");
  assert.ok(src.includes("mobileTabHint"), "dernier onglet intentionnel");
  assert.ok(src.includes("setMobileTabHint"), "hint posée aux taps");
  assert.ok(src.includes("onOrderClick={"), "clic order dédié");
});

test("P0 : indicateur jamais figé sur home", () => {
  const bar = read("src/components/MobileTabBar.tsx");
  assert.ok(bar.includes('active = "home"'), "défaut repli conservé");
  const app = read("src/App.tsx");
  const idx = app.indexOf("<MobileTabBar");
  const end = app.indexOf("/>", idx);
  const usage = app.slice(idx, end);
  assert.ok(usage.includes("active="), "défaut écrasé à l'usage");
});

test("P1 : helpers overlays (push/replace/close, hash neutres)", () => {
  const src = read("src/App.tsx");
  assert.ok(src.includes("const pushOverlay"), "push");
  assert.ok(src.includes("const replaceOverlay"), "replace");
  assert.ok(src.includes("const closeOverlay"), "close");
  assert.ok(src.includes("history.back()"), "fermeture via historique");
  for (const h of ["cart", "checkout", "tracking", "auth", "profile", "account"]) {
    assert.ok(src.includes(`"${h}"`), `marqueur #${h}`);
  }
  assert.ok(!src.includes("pushOverlay(order"), "jamais d'id en hash");
  assert.ok(!src.includes("unit_price"), "jamais de montant en hash");
});

test("P1 : popstate referme les overlays sans toucher au reste", () => {
  const src = read("src/App.tsx");
  for (const h of ["#cart", "#checkout", "#tracking", "#auth", "#profile", "#account"]) {
    assert.ok(src.includes(`h !== "${h}"`), `fermeture ${h}`);
  }
});

test("P1 : BuyNow ne détruit plus la PDP", () => {
  const src = read("src/App.tsx");
  const i = src.indexOf("onBuyNow={(p: Product");
  const block = src.slice(i, src.indexOf("}}", i));
  assert.ok(block.includes('pushOverlay("checkout")'), "entrée checkout");
  assert.ok(!block.includes("setSelectedProduct(null)"), "PDP conservée");
  assert.ok(!block.includes('pushState({}, "", "/")'), "plus de reset /");
});

test("P1 : panier -> checkout remplace (pas de réouverture fantôme)", () => {
  const src = read("src/App.tsx");
  assert.ok(src.includes('replaceOverlay("checkout")'), "replace");
});

test("P1 : tiroir filtres + lightbox historisés, hash préservé", () => {
  const cat = read("src/components/CatalogSection.tsx");
  assert.ok(cat.includes('pushState({ overlay: "filters" }'), "push filtres");
  assert.ok(cat.includes("requestCloseFilters"), "close filtres");
  assert.ok(cat.includes('"#filters"'), "popstate filtres");
  assert.ok(
    cat.includes(") + window.location.hash"),
    "replaceState filtres préserve le hash",
  );
  const pdp = read("src/pages/ProductPage.tsx");
  assert.ok(pdp.includes('pushState({ overlay: "lightbox" }'), "push lightbox");
  assert.ok(pdp.includes("requestCloseLightbox"), "close lightbox");
});
