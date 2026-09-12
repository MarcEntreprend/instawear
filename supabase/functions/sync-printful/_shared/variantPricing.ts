// supabase/functions/sync-printful/_shared/variantPricing.ts
// Résolution du prix unitaire d'une variante (logique pure, testée).
// Doc API Printful : le SYNC porte retail_price (string), le CATALOGUE porte
// price. Chaîne : retail sync → prix catalogue → null.
// Un prix null CONSERVE la taille (le frontstore retombe sur le prix produit) :
// on ne jette jamais une taille faute de prix.

/** Index prix catalogue : variant_id -> prix. */
export function buildCatalogPriceIndex(catalogVariants: any[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const cv of catalogVariants || []) {
    if (cv == null || cv.id == null) continue;
    const pr = parseFloat(cv.price);
    if (Number.isFinite(pr)) out.set(Number(cv.id), pr);
  }
  return out;
}

/** Id catalogue d'une variante sync (variant_id direct ou product.variant_id). */
export function syncCatalogId(v: any): number | null {
  const raw = v?.variant_id ?? v?.product?.variant_id;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function resolveUnitPrice(v: any, catalogPrices: Map<number, number>): number | null {
  const retail = v?.retail_price != null ? parseFloat(v.retail_price) : NaN;
  if (Number.isFinite(retail)) return retail as number;
  const cid = syncCatalogId(v);
  if (cid != null && catalogPrices.has(cid)) return catalogPrices.get(cid)!;
  return null;
}
