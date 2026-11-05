// tests/hero-lot9.test.ts — historique : logique pure + gardes statiques de la migration 41.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import {
  snapshotConfig,
  snapshotToDraftParts,
  diffHeroConfigs,
} from "../src/lib/heroHistory.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(
  join(root, "supabase/migrations/20261041_hero_history.sql"),
  "utf8",
);
const IMG = "https://cdn.example.com/a.webp";

const A = sanitizeHeroConfig({
  origin: "studio",
  sizing: { mode: "fixed", width: "full", height: { unit: "vh", value: 78 } },
  background: { gradient: "linear-gradient(135deg, #111 0%, #222 100%)" },
  layers: [
    { type: "image", src: IMG },
    { type: "text", headline: "Titre A\nligne 2" },
  ],
  ctas: [{ label: "Go" }],
});

test("snapshot : la config v1 est prioritaire, sinon dérivée des colonnes legacy", () => {
  const v1 = snapshotConfig({ config: A });
  assert.equal(v1.layers.length, 2);
  const legacy = snapshotConfig({
    config: { v: 1 },
    kind: "image",
    image: IMG,
    headline: "Hi",
    cta: "Voir",
  });
  assert.equal(legacy.layers[0].type, "image");
  assert.equal(legacy.ctas[0].label, "Voir");
});

test("snapshotToDraftParts : contenu seulement, origin studio, productId vide si null", () => {
  const p = snapshotToDraftParts({
    config: { ...A, origin: "legacy" },
    product_id: null,
    is_active: false,
  });
  assert.equal(p.productId, "");
  assert.equal(p.config.origin, "studio");
  assert.equal(
    snapshotToDraftParts({ config: A, product_id: "p1" }).productId,
    "p1",
  );
});

test("diff : identique → [] ; changements → lignes lisibles (actuel → version)", () => {
  assert.deepEqual(
    diffHeroConfigs(A, A, { currentProductId: "p1", versionProductId: "p1" }),
    [],
  );

  const B = sanitizeHeroConfig({
    origin: "studio",
    sizing: {
      mode: "auto",
      width: "contained",
      ratio: { desktop: 2.4, mobile: 0.9 },
    },
    background: { gradient: "linear-gradient(135deg, #fff 0%, #eee 100%)" },
    layers: [
      { type: "image", src: IMG },
      { type: "text", headline: "Titre B" },
      { type: "card", src: IMG },
    ],
    ctas: [{ label: "Acheter" }],
  });
  const d = diffHeroConfigs(A, B, {
    currentProductId: "p1",
    versionProductId: "",
  });
  const all = d.join("\n");
  assert.ok(/Produit principal/.test(all));
  assert.ok(
    /Dimensions : fixe 78vh \(pleine\) → auto 2\.4 \(contenue\)/.test(all),
  );
  assert.ok(/Fond modifié/.test(all));
  assert.ok(/Couche 2 \(Texte\) modifiée/.test(all));
  assert.ok(/Couche 3 ajoutée : Carte visuelle/.test(all));
  assert.ok(/Titre : « Titre A \/ ligne 2 » → « Titre B »/.test(all));
  assert.ok(/Boutons : « Go » → « Acheter »/.test(all));
});

test("diff : ordre des clés sans effet, position de bouton détectée", () => {
  const C1 = sanitizeHeroConfig({
    origin: "studio",
    ctas: [{ label: "Go", pos: { desktop: { x: 10, y: 20 } } }],
  });
  const C2 = sanitizeHeroConfig({
    origin: "studio",
    ctas: [{ pos: { desktop: { y: 20, x: 10 } }, label: "Go" }],
  });
  assert.deepEqual(diffHeroConfigs(C1, C2), []);
  const C3 = sanitizeHeroConfig({
    origin: "studio",
    ctas: [{ label: "Go", pos: { desktop: { x: 90, y: 20 } } }],
  });
  assert.deepEqual(diffHeroConfigs(C1, C3), [
    "Boutons modifiés (position, lien ou style).",
  ]);
});

test("SQL lot 9 : RLS partout, HTML = super_admin seul, jamais d'accès anon", () => {
  assert.equal((sql.match(/ENABLE ROW LEVEL SECURITY/g) || []).length, 2);
  assert.ok(
    sql.includes(
      "REVOKE ALL ON public.hero_html_versions FROM anon, authenticated",
    ),
  );
  assert.ok(
    sql.includes(
      "REVOKE ALL ON public.hero_slide_versions FROM anon, authenticated",
    ),
  );
  assert.ok(sql.includes("hero_html_versions_select_super"));
  const htmlPolicy = sql.slice(sql.indexOf("hero_html_versions_select_super"));
  assert.ok(htmlPolicy.slice(0, 220).includes("public.is_super_admin()"));
  assert.ok(!/USING\s*\(\s*true\s*\)/i.test(sql));
  assert.ok(!/TO\s+anon/i.test(sql.replace(/REVOKE[^;]*;/gi, "")));
});

test("SQL lot 9 : l'historique des slides ne contient jamais de HTML", () => {
  assert.ok(sql.includes("- 'html' - 'css'"));
  assert.ok(!/hero_slide_versions[^;]*\bhtml\b\s+text/i.test(sql));
});

test("SQL lot 9 : fonctions sensibles figées (search_path) et RPC admin vérifiées", () => {
  const definer = (sql.match(/SECURITY DEFINER/g) || []).length;
  const pinned = (sql.match(/SET search_path = public/g) || []).length;
  assert.equal(definer, pinned);
  assert.ok((sql.match(/IF NOT public\.is_admin\(\)/g) || []).length >= 2);
  assert.ok(sql.includes("is_active") && sql.includes("false,")); // la récupération est TOUJOURS un brouillon
});

test("SQL lot 9 : réordonner ne crée pas d'entrée (comparaison sans order)", () => {
  assert.ok(sql.includes("(prev - 'order') = (snap - 'order')"));
});
