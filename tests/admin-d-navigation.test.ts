// tests/admin-d-navigation.test.ts
// Vague D (P3 items 16/17) : ordre unique + groupes + FR + help intégrée,
// fil d'Ariane honnête, CTA unique sans reload, drawer accessible.
// Miroirs source (style repo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

test("ordre unique : NAV_GROUPS seul, titres dérivés, zéro doublon", () => {
  const side = read("src/admin/AdminSidebar.tsx");
  assert.ok(side.includes("export const NAV_GROUPS"), "groupes exportés");
  assert.ok(side.includes("export const NAV_LABELS"), "labels dérivés");
  assert.ok(!side.includes("NAV_ITEMS"), "plus de liste plate");
  assert.ok(!side.includes("onMouseEnter"), "plus de hover JS");
  const dash = read("src/admin/AdminDashboardNew.tsx");
  assert.ok(dash.includes("NAV_LABELS"), "titres = labels nav");
  assert.ok(
    !dash.includes("Interactions clients"),
    "plus de libellé divergent",
  );
});

test("regroupement + ordre logique + francisation", () => {
  const side = read("src/admin/AdminSidebar.tsx");
  for (const g of [
    "Pilotage",
    "Catalogue & Clients",
    "Marketing",
    "Système",
  ])
    assert.ok(side.includes(`label: "${g}"`), `groupe ${g}`);
  // Commandes → Expédiées → Finances → Notifications (ordre métier).
  const order = ["orders", "shipped", "finances", "notifications"].map((id) =>
    side.indexOf(`id: "${id}"`),
  );
  assert.deepEqual([...order].sort((a, b) => a - b), order, "ordre métier");
  assert.ok(side.includes('label: "Emails"'), "Emails FR");
  assert.ok(side.includes('label: "Supervision"'), "Supervision FR");
  assert.ok(!side.includes("Email Marketing"), "plus de EN");
  assert.ok(!side.includes('"Monitoring"'), "plus de Monitoring EN");
  // Help intégrée au groupe Système (avec état actif), pas de bouton footer.
  assert.ok(side.includes('{ id: "help"'), "help dans la nav");
  assert.ok(!side.includes('onNavigate("help")'), "plus de bouton footer");
});

test("aucune route supprimée : AdminSection intact", () => {
  const side = read("src/admin/AdminSidebar.tsx");
  for (const s of [
    "dashboard",
    "orders",
    "notifications",
    "shipped",
    "products",
    "customers",
    "interactions",
    "promotions",
    "email-marketing",
    "reports",
    "monitoring",
    "integrations",
    "settings",
    "admin-users",
    "merchandising",
    "finances",
    "help",
  ])
    assert.ok(side.includes(`"${s}"`), `route ${s} conservée`);
});

test("a11y nav : aria-current + liste + focus CSS", () => {
  const side = read("src/admin/AdminSidebar.tsx");
  assert.ok(side.includes('aria-label="Navigation principale"'), "nav nommée");
  assert.ok(side.includes('aria-current={isActive ? "page" : undefined}'));
  assert.ok(side.includes("<ul"), "liste sémantique");
  const css = read("src/index.css");
  assert.ok(
    css.includes(".admin-nav-btn:not(.active):hover"),
    "hover CSS",
  );
  assert.ok(css.includes(".admin-nav-btn:focus-visible"), "focus-visible");
  assert.ok(
    css.includes("@media (prefers-reduced-motion: reduce)"),
    "reduced-motion global (bell-shake couvert)",
  );
});

test("fil d'Ariane honnête : nav + ol + page courante", () => {
  const dash = read("src/admin/AdminDashboardNew.tsx");
  assert.ok(dash.includes('aria-label="Fil d\'Ariane"'), "nav nommée");
  assert.ok(dash.includes("<ol"), "liste ordonnée");
  assert.ok(dash.includes('aria-current="page"'), "page marquée");
  assert.ok(dash.includes('aria-label="Retour à la page précédente"'));
  assert.ok(dash.includes('aria-label="Ouvrir la navigation"'), "hamburger");
});

test("CTA boutique unique, sans reload", () => {
  const side = read("src/admin/AdminSidebar.tsx");
  assert.ok(!side.includes("Boutique en ligne"), "CTA sidebar supprimé");
  assert.ok(!side.includes("onReturnToStore"), "prop CTA supprimée");
  const dash = read("src/admin/AdminDashboardNew.tsx");
  assert.ok(!dash.includes("window.location.reload()"), "plus de reload");
  assert.ok(dash.includes("Voir la boutique"), "CTA unique conservé");
});

test("tiroir mobile : Escape + scroll-lock + focus-trap + dialog", () => {
  const dash = read("src/admin/AdminDashboardNew.tsx");
  assert.ok(dash.includes("admin-mobile-drawer"), "id tiroir");
  assert.ok(dash.includes('e.key === "Escape"'), "Escape ferme");
  assert.ok(dash.includes('overflow = "hidden"'), "scroll-lock");
  assert.ok(dash.includes('e.key !== "Tab"'), "focus-trap Tab");
  assert.ok(dash.includes('role="dialog"'), "role dialog");
  assert.ok(dash.includes('aria-modal="true"'), "modal marqué");
});
