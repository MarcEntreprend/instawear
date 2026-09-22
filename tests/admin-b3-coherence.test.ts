// tests/admin-b3-coherence.test.ts
// Vague B3 (P1 items 9-13) : QuickView snapshot, slugs normalisés, deals
// véridiques, listes triées/gardées, Help câblée, monitoring étendu,
// emails honnêtes. Contrat réel (helpers purs) + miroirs source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  referenceLabel,
  normalizeRefKey,
  EMPTY_MATERIAL_LABEL,
} from "../src/admin/referenceUtils.ts";
import { DISCOUNT_EVENT_TYPE } from "../src/data/categories.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

// ─── Item 9 : QuickView snapshot ───────────────────────────────────────────

test("QuickView : snapshot payé vs actuel + fallback archivé", () => {
  const src = read("src/admin/ProductQuickViewModal.tsx");
  assert.ok(src.includes("orderSnapshot"), "prop snapshot");
  assert.ok(src.includes("Prix actuel"), "mention prix actuel");
  assert.ok(src.includes("archivé ou supprimé"), "fallback archivé");
  assert.ok(src.includes("Payé"), "prix payé affiché");
  const orders = read("src/admin/OrdersPage.tsx");
  assert.ok(orders.includes("quickViewSnapshot"), "snapshot en état");
  assert.ok(
    orders.includes("quickViewProduct || quickViewSnapshot"),
    "fallback rendu si live absent",
  );
  assert.ok(orders.includes("unitPrice: item.unitPrice"), "snapshot ligne");
});

// ─── Item 10 : slugs normalisés ────────────────────────────────────────────

test("helpers : referenceLabel + normalizeRefKey + libellé vide unique", () => {
  const items = [{ value: "cotton", label: "Coton" }];
  assert.equal(referenceLabel(items, "cotton"), "Coton");
  assert.equal(referenceLabel(items, "COTTON"), "Coton");
  assert.equal(referenceLabel(items, "inconnu"), "inconnu");
  assert.equal(referenceLabel(items, ""), "—");
  assert.equal(normalizeRefKey("Street"), "street");
  assert.equal(normalizeRefKey("  Casual   Chic "), "casual chic");
  assert.equal(normalizeRefKey(null), "");
  assert.ok(EMPTY_MATERIAL_LABEL.includes("Non renseigné"));
});

test("eventType discount centralisé (fini le en-dur dispersé)", () => {
  assert.equal(DISCOUNT_EVENT_TYPE, "discount");
  for (const f of [
    "src/admin/ProductsPage.tsx",
    "src/components/StoreProductCard.tsx",
  ]) {
    const src = read(f);
    assert.ok(src.includes("DISCOUNT_EVENT_TYPE"), `${f} : constante`);
    assert.ok(!src.includes('=== "discount"'), `${f} : plus de dur`);
  }
});

test("facettes admin : comptage + filtre normalisés", () => {
  const src = read("src/admin/ProductsPage.tsx");
  assert.ok(src.includes("normalizeMaterialKey(p.material)"), "matière normalisée");
  assert.ok(src.includes("normalizeRefKey(p.style)"), "style normalisé");
  assert.ok(src.includes("normalizeRefKey(filters.material)"), "filtre matière");
});

test("formulaires : même libellé vide matière", () => {
  for (const f of [
    "src/admin/ProductFormPanel.tsx",
    "src/admin/PrintfulProductForm.tsx",
  ]) {
    assert.ok(read(f).includes("EMPTY_MATERIAL_LABEL"), `${f} : libellé unique`);
  }
});

// ─── Item 11 : deals véridiques ────────────────────────────────────────────

test("promo : isLimitedTime suit active + null explicites", () => {
  const src = read("src/admin/PromotionsPage.tsx");
  assert.ok(src.includes("isLimitedTime: active,"), "false réel");
  assert.ok(!src.includes("active || undefined"), "plus de undefined");
  assert.ok(src.includes("dealPrice: active ? (dealPrice ?? null) : null"));
});

test("promo : activation œil bloquée sans prix valide", () => {
  const src = read("src/admin/PromotionsPage.tsx");
  assert.ok(src.includes("Activation annulée"), "blocage + message");
  assert.ok(src.includes("Prix promo invalide"), "garde sauvegarde");
});

test("produit : dealPrice/dealEndsAt éditables + validés", () => {
  for (const f of [
    "src/admin/ProductFormPanel.tsx",
    "src/admin/PrintfulProductForm.tsx",
  ]) {
    const src = read(f);
    assert.ok(src.includes("dealPrice"), `${f} : champ prix`);
    assert.ok(src.includes("dealEndsAt"), `${f} : champ fin`);
    assert.ok(src.includes("Deal invalide"), `${f} : garde`);
  }
});

test("admin FR : fini les défauts EN", () => {
  const src = read("src/admin/PromotionsPage.tsx");
  assert.ok(!src.includes("Shop Now"), "plus de Shop Now");
  assert.ok(!src.includes("PROMOTION"), "plus de PROMOTION");
});

// ─── Item 12 : listes triées/gardées ───────────────────────────────────────

test("listes : tri (fin de liste + ↑/↓) + garde usage + keywords", () => {
  const api = read("src/api/supabaseApi.ts");
  assert.ok(api.includes("maxOrder + 1"), "création en fin");
  assert.ok(!api.includes("sort_order: 0,"), "plus de 0 forcé");
  const settings = read("src/admin/SettingsPage.tsx");
  assert.ok(settings.includes("handleMoveRef"), "boutons ↑/↓");
  assert.ok(settings.includes("Suppression bloquée"), "garde usage");
  assert.ok(settings.includes("countRefUsage"), "comptage produits");
  assert.ok(
    settings.includes("toLowerCase())"),
    "keywords normalisés",
  );
});

// ─── Item 13 : help + monitoring + emails ──────────────────────────────────

test("help : boutons câblés (reprises footer, rien d'inventé)", () => {
  const src = read("src/admin/HelpPage.tsx");
  assert.ok(src.includes("https://aide.instawear.com"));
  assert.ok(src.includes("mailto:bonjour@instawear.com"));
  assert.ok(src.includes("/#section-faq"));
  assert.ok(!src.includes("<button style={btnStyle}>"), "plus de bouton mort");
  assert.ok(!src.includes("WhatsApp"), "pas de canal inexistant");
});

test("monitoring : fonctions réelles + liens sources sœurs", () => {
  const src = read("src/admin/ErrorMonitoringPage.tsx");
  for (const fn of ["send-email", "stripe-refund", "mockup-worker", "health"])
    assert.ok(src.includes(`"${fn}"`), `fonction ${fn}`);
  assert.ok(src.includes("File mockups (Produits)"), "lien mockups");
  assert.ok(src.includes("Sync logs (Paramètres)"), "lien syncs");
  assert.ok(src.includes("Campagnes email"), "lien emails");
});

test("emails : envois vérifiés + taux marqués estimés", () => {
  const src = read("src/admin/EmailMarketingPage.tsx");
  assert.ok(src.includes("if (res.ok) sent++"), "res.ok vérifié");
  assert.ok(src.includes("failed++"), "compteur échecs");
  assert.ok(src.includes("estimated: true"), "flag estimé persisté");
  assert.ok(src.includes("(estimé)"), "affichage estimé");
});
