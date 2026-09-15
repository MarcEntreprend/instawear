// src/data/materials.ts — miroir frontend de la classification matière.
// Source de vérité : slugs canoniques produits par
// `supabase/functions/sync-printful/_shared/materials.ts` (remplissage
// auto) + lignes `reference_lists` type=material (contrôle admin).
// Rôles ici UNIQUEMENT : libellés EN (langue du storefront), normalisation
// des anciens libellés FR saisis libre, construction des facettes.
// AUCUNE requête : les facettes se calculent depuis les produits déjà
// chargés (perf, cf. PROTOCOL-QUALITE-FRONTEND.md).

/** Slug -> libellé EN. Miroir des labels de la migration
 *  `20261023_reference_materials.sql` (garder synchronisé). */
export const MATERIAL_LABELS: Record<string, string> = {
  cotton: "Cotton",
  "cotton-organic": "Organic Cotton",
  "cotton-combed": "Combed Cotton",
  polyester: "Polyester",
  "polyester-recycled": "Recycled Polyester",
  fleece: "Fleece",
  "fleece-organic": "Organic Fleece",
  ceramic: "Ceramic",
  wool: "Wool",
  linen: "Linen",
  nylon: "Nylon",
  acrylic: "Acrylic",
  viscose: "Viscose",
  elastane: "Elastane",
  hemp: "Hemp",
  bamboo: "Bamboo",
};

/** Anciens libellés FR (saisie libre admin) -> slug. Miroir de LEGACY_FR
 *  côté `_shared/materials.ts` (garder synchronisé). */
const LEGACY_FR: Record<string, string> = {
  "coton bio": "cotton-organic",
  coton: "cotton",
  "coton peigne": "cotton-combed",
  "polyester recycle": "polyester-recycled",
  polyester: "polyester",
  "molleton bio": "fleece-organic",
  molleton: "fleece",
  ceramique: "ceramic",
};

function normKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Valeur stockée (slug, legacy FR, casse mixte) -> slug canonique ou null. */
export function normalizeMaterialKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (!t) return null;
  if (MATERIAL_LABELS[t]) return t;
  return LEGACY_FR[normKey(t)] ?? null;
}

/** Libellé d'affichage EN ; inconnu -> valeur brute (fail-open, jamais vide). */
export function materialLabel(value: unknown): string {
  const key = normalizeMaterialKey(value);
  if (key && MATERIAL_LABELS[key]) return MATERIAL_LABELS[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return "Other";
}

export interface MaterialFacet {
  value: string;
  label: string;
  count: number;
}

/** Facettes matière RÉELLES du catalogue (valeurs présentes, triées par
 *  popularité). Même pattern que buildColorFacets (CatalogSection). */
export function buildMaterialFacets(
  products: { material?: string | null }[],
): MaterialFacet[] {
  const map = new Map<string, MaterialFacet>();
  for (const p of products) {
    const key = normalizeMaterialKey(p.material);
    if (!key) continue;
    const cur = map.get(key);
    if (cur) cur.count += 1;
    else map.set(key, { value: key, label: materialLabel(key), count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}
