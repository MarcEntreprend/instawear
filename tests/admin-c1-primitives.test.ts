// tests/admin-c1-primitives.test.ts
// Vague C1 (P2 item 14, Button → Modal) : primitifs uniques + migrations.
// Contrat réel (infoStyles pur) + miroirs source.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  infoSectionStyle,
  infoTitleStyle,
  infoTableStyle,
  infoThStyle,
  infoTdStyle,
  infoNoteStyle,
} from "../src/admin/ui/infoStyles.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

test("infoStyles : une seule copie des styles lexique", () => {
  assert.equal(infoSectionStyle.marginBottom, 24);
  assert.equal(infoTitleStyle.fontSize, 15);
  assert.equal(infoTableStyle.width, "100%");
  assert.equal(infoThStyle.textTransform, "uppercase");
  assert.equal(infoTdStyle.lineHeight, 1.5);
  assert.equal(infoNoteStyle.marginTop, 12);
  for (const f of [
    "src/admin/ReportInfoModal.tsx",
    "src/admin/MerchandisingInfoModal.tsx",
  ]) {
    const src = read(f);
    assert.ok(src.includes("from \"./ui/infoStyles\""), `${f} : partagés`);
    assert.ok(
      !src.includes("const sectionStyle"),
      `${f} : plus de copie locale`,
    );
    assert.ok(src.includes("<AdminModal"), `${f} : coquille unique`);
    assert.ok(
      !src.includes("position: \"fixed\""),
      `${f} : plus d'overlay manuel`,
    );
  }
});

test("AdminModal : z unique + Escape + scroll-lock + tailles", () => {
  const src = read("src/admin/ui/AdminModal.tsx");
  assert.ok(src.includes("zIndex = 300"), "z unique 300");
  assert.ok(src.includes('e.key === "Escape"'), "Escape");
  assert.ok(src.includes('overflow = "hidden"'), "scroll-lock");
  assert.ok(src.includes('role="dialog"'), "role dialog");
  assert.ok(src.includes("sm: 480"), "tailles sm/md/lg");
});

test("AdminButton : 4 variantes + disabled honnête", () => {
  const src = read("src/admin/ui/AdminButton.tsx");
  for (const v of ["primary", "secondary", "danger", "ghost"])
    assert.ok(src.includes(`${v}:`), `variante ${v}`);
  assert.ok(src.includes("#991b1b"), "danger canonique");
  assert.ok(src.includes('cursor: "not-allowed"'), "disabled");
});

test("migrations C1 : modales + boutons danger", () => {
  const settings = read("src/admin/SettingsPage.tsx");
  assert.ok(settings.includes("<AdminModal"), "ref modal : coquille");
  assert.ok(!settings.includes("zIndex: 200"), "ref modal : plus de z200");
  assert.ok(
    settings.includes('<AdminButton type="submit" variant="primary">'),
    "ref modal : primaire",
  );
  assert.ok(
    settings.includes('variant="secondary"'),
    "ref modal : secondaire",
  );
  const quick = read("src/admin/ProductQuickViewModal.tsx");
  assert.ok(quick.includes("<AdminModal"), "fallback archivé : coquille");
  for (const f of [
    "src/admin/FinancesPage.tsx",
    "src/admin/OrdersPage.tsx",
  ]) {
    const src = read(f);
    assert.ok(src.includes('variant="danger"'), `${f} : danger unique`);
    assert.ok(
      !src.includes('background: "#991b1b"'),
      `${f} : plus de fond danger en dur (textes/bordures alertes OK)`,
    );
  }
});
