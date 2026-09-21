// tests/admin-c3-reduit.test.ts
// Vague C3 réduit (P2 item 15, SANS les variants) : 1 seul polling,
// styles formulaire/filtres/recherche canoniques. Miroirs source.
// Contrainte : matrices variantes, th/td denses PrintfulProductForm,
// payload galerie, notify, MainImageField, ProgressBar/StatCard/Toast
// INTACTS (voir test garde-variants).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

test("polling Interactions : un seul effet (fini les 2 requêtes/10s)", () => {
  const src = read("src/admin/InteractionsPage.tsx");
  assert.ok(src.includes("loadTicketMessages"), "source unique");
  const intervals = src.match(/setInterval\(/g) || [];
  assert.equal(intervals.length, 1, "un seul intervalle");
  assert.ok(!src.includes("Recharge les messages du ticket ouvert toutes les 10 secondes"));
});

test("formulaires : inputStyle/labelStyle canoniques", () => {
  const admin = read("src/admin/adminStyles.ts");
  assert.ok(admin.includes("formInputStyle"), "canonique input");
  assert.ok(admin.includes("formLabelStyle"), "canonique label");
  for (const f of [
    "src/admin/ProductFormPanel.tsx",
    "src/admin/PrintfulProductForm.tsx",
    "src/admin/PromotionsPage.tsx",
    "src/admin/EmailMarketingPage.tsx",
  ]) {
    const src = read(f);
    assert.ok(
      src.includes("formInputStyle") && src.includes("formLabelStyle"),
      `${f} : canoniques`,
    );
  }
  assert.ok(
    !read("src/admin/ProductFormPanel.tsx").includes("const inputStyle"),
    "PFP : copie supprimée",
  );
  assert.ok(
    !read("src/admin/PrintfulProductForm.tsx").includes("const inputStyle"),
    "PFF : copie supprimée",
  );
});

test("filtres : selectStyle canonique x4 + recherche partagée x2", () => {
  const admin = read("src/admin/adminStyles.ts");
  assert.ok(admin.includes("filterSelectStyle"), "canonique select");
  for (const f of [
    "src/admin/ProductsPage.tsx",
    "src/admin/InteractionsPage.tsx",
    "src/admin/NotificationsPage.tsx",
    "src/admin/ErrorMonitoringPage.tsx",
  ]) {
    assert.ok(
      read(f).includes("filterSelectStyle"),
      `${f} : select canonique`,
    );
  }
  for (const f of [
    "src/admin/OrdersPage.tsx",
    "src/admin/ProductsPage.tsx",
  ]) {
    const src = read(f);
    assert.ok(src.includes("style={inputStyle}"), `${f} : input recherche`);
    assert.ok(src.includes("style={clearBtnStyle}"), `${f} : clear`);
  }
});

test("garde-variants : matrices et logiques métier intactes", () => {
  // Grilles variantes : orientations et sources propres conservées.
  const pff = read("src/admin/PrintfulProductForm.tsx");
  assert.ok(
    pff.includes("tableau couleurs (lignes)"),
    "PFF : grille import intacte",
  );
  assert.ok(pff.includes("const thStyle"), "PFF : th dense intact");
  assert.ok(pff.includes("const tdStyle"), "PFF : td dense intact");
  const pfp = read("src/admin/ProductFormPanel.tsx");
  assert.ok(pfp.includes("Taille ↓ / Couleur →"), "PFP : grille intacte");
  const qv = read("src/admin/ProductQuickViewModal.tsx");
  assert.ok(
    qv.includes("Disponibilité POD par variante"),
    "QuickView : lecture intacte",
  );
  // Chaîne prix Printful intacte (catalog → sync → calculé).
  assert.ok(pff.includes("catalog_variants"), "chaîne prix intacte");
});
