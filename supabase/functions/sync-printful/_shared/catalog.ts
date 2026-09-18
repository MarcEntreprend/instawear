// supabase/functions/sync-printful/_shared/catalog.ts
// Garde de forme réponse catalogue Printful (GET /products/{id}).
//
// Forme réelle vérifiée live : `{ result: { product: {...}, variants: [...] } }`
// où `product` NE contient JAMAIS `variants`. L'ancien pattern
// `data?.result?.product || data?.result` choisissait donc TOUJOURS `product`
// (truthy) puis lisait `.variants` -> undefined -> [] : TOUT enrichissement
// catalogue (hex, statuts, prix fallback, matières) était silencieusement
// mort, en échec gracieux invisible. Règle : préférer le niveau qui A des
// variants (réponse tierce validée comme entrée hostile : tableaux vérifiés).
export function extractCatalogVariants(catalogData: unknown): any[] {
  if (catalogData == null || typeof catalogData !== "object") return [];
  const r = (catalogData as Record<string, unknown>).result;
  const root = r != null && typeof r === "object" ? (r as Record<string, unknown>) : (catalogData as Record<string, unknown>);
  const fromProduct = (root.product as Record<string, unknown> | undefined)?.variants;
  if (Array.isArray(fromProduct) && fromProduct.length > 0) return fromProduct;
  const direct = root.variants;
  if (Array.isArray(direct)) return direct;
  return [];
}
