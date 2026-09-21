// tests/admin-c2-shared.test.ts
// Vague C2 (P2 item 14, Table → Badge → Search/State) : pastille, vide et
// table uniques + migrations. Miroirs source (style repo).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

test("AdminBadge : pastille unique (2 tailles, uppercase opt)", () => {
  const src = read("src/admin/ui/AdminBadge.tsx");
  assert.ok(src.includes("borderRadius: 999"), "géométrie pastille");
  assert.ok(src.includes('"sm" | "md"'), "2 tailles");
  assert.ok(src.includes("uppercase"), "variante uppercase");
});

test("badges locaux migrés (maps conservées, rendu unique)", () => {
  const order = read("src/admin/orderStatusLabels.ts");
  assert.ok(order.includes("AdminBadge"), "OrderStatusBadge");
  assert.ok(!order.includes('"span"'), "plus de span manuel");
  for (const [f, marker] of [
    ["src/admin/InteractionsPage.tsx", "function StatusBadge"],
    ["src/admin/AdminUsersPage.tsx", "function RoleBadge"],
    ["src/admin/ProductsPage.tsx", "function Badge"],
    ["src/admin/MockupStudio.tsx", "STATUS_STYLE[job.status]"],
  ] as const) {
    const src = read(f);
    assert.ok(src.includes("<AdminBadge"), `${f} : AdminBadge`);
  }
  for (const f of [
    "src/admin/InteractionsPage.tsx",
    "src/admin/AdminUsersPage.tsx",
  ]) {
    assert.ok(
      !read(f).includes("borderRadius: 999"),
      `${f} : plus de pastille manuelle`,
    );
  }
  // MockupStudio : pastilles statut/coverage migrées ; seule la barre de
  // progression (height 8, pas une pastille) garde son radius.
  {
    const src = read("src/admin/MockupStudio.tsx");
    assert.ok(!src.includes('padding: "2px 8px"'), "studio : plus de pastille");
    assert.ok(src.includes("<AdminBadge"), "studio : AdminBadge");
  }
});

test("AdminEmpty : vide unique + 9 migrations", () => {
  const ui = read("src/admin/ui/AdminEmpty.tsx");
  assert.ok(ui.includes('border: "1px dashed'), "carte pointillée");
  assert.ok(ui.includes("action?:"), "action optionnelle");
  for (const f of [
    "src/admin/CustomersPage.tsx",
    "src/admin/NotificationsPage.tsx",
    "src/admin/EmailMarketingPage.tsx",
    "src/admin/ReportsPage.tsx",
    "src/admin/OrdersPage.tsx",
    "src/admin/ProductsPage.tsx",
    "src/admin/AdminDashboardNew.tsx",
    "src/admin/MockupStudio.tsx",
    "src/admin/AdminUsersPage.tsx",
  ]) {
    assert.ok(read(f).includes("<AdminEmpty"), `${f} : AdminEmpty`);
  }
  for (const dead of [
    "function EmptyState(",
    "function EmptyPlaceholder(",
    "function EmptySection(",
  ]) {
    let found = false;
    for (const f of [
      "src/admin/CustomersPage.tsx",
      "src/admin/NotificationsPage.tsx",
      "src/admin/EmailMarketingPage.tsx",
      "src/admin/ReportsPage.tsx",
    ]) {
      if (read(f).includes(dead)) found = true;
    }
    assert.ok(!found, `${dead} : supprimé partout`);
  }
});

test("table AdminUsers : objets canoniques + dates partagées", () => {
  const src = read("src/admin/AdminUsersPage.tsx");
  assert.ok(src.includes("style={tableWrapperStyle}"), "wrapper");
  assert.ok(src.includes("style={theadStyle}"), "thead");
  assert.ok(src.includes("...thStyle"), "th");
  assert.ok(src.includes("...tdStyle"), "td");
  assert.ok(!src.includes('padding: "12px 14px"'), "plus de th maison");
  assert.ok(!src.includes('padding: "8px 10px"'), "plus de td journal maison");
  assert.ok(src.includes("formatDateFR(user.createdAt)"), "date partagée");
  assert.ok(
    src.includes("formatDateTimeFR(user.lastLoginDate)"),
    "datetime partagé",
  );
});
