// src/utils/productSlugs.ts — slugs produit SEO (pur, testable en node).
//
// Source de vérité = trigger Postgres (migration 20261030, remplit au sync
// comme à la saisie admin, slugs manuels préservés). `slugifyTitle` est le
// MIROIR documenté des mêmes règles (preview, fallback) — toute divergence
// avec le SQL doit être corrigée ici ET là-bas.

/** Titre -> slug (miroir exact des regexp_replace SQL). */
export function slugifyTitle(title: string): string {
  let base = (title || "product").toLowerCase();
  base = base
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ýÿ]/g, "y")
    .replace(/ç/g, "c")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "product";
}

export interface SlugProduct {
  id: string;
  slug?: string | null;
}

/** Lookup par slug OU id legacy (les URLs UUID restent valides). */
export function findProductBySlugOrId<T extends SlugProduct>(
  products: T[],
  key: string | null | undefined,
): T | undefined {
  if (!key) return undefined;
  return products.find((p) => p.id === key || (p.slug || undefined) === key);
}

/** URL canonique fiche produit (slug, repli id). */
export function productPagePath(product: SlugProduct): string {
  return `/produit/${product.slug || product.id}`;
}
