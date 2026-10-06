// src/utils/productSlugs.ts — slugs produit SEO (pur, testable en node).
//
// Source de vérité = trigger Postgres (migration 20261030, remplit au sync
// comme à la saisie admin, slugs manuels préservés). `slugifyTitle` est le
// MIROIR documenté des mêmes règles (preview, fallback) — toute divergence
// avec le SQL doit être corrigée ici ET là-bas.
//
// Routes : /item/<slug> canonique (public anglophone) ; /produit/<slug|id>
// gardé en alias (anciens liens, index existants). Les URLs UUID restent
// valides et sont canonicalisées vers /item/<slug>.

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

/** Préfixe canonique (anglophone) + alias legacy. */
export const ITEM_ROUTE = "item";
export const LEGACY_ITEM_ROUTE = "produit";

/** Clé (slug ou id) depuis un pathname /item/… ou /produit/… ; null sinon. */
export function matchProductRoute(pathname: string): string | null {
  const m =
    pathname.match(/^\/item\/([^/]+)/) || pathname.match(/^\/produit\/([^/]+)/);
  return m ? m[1] : null;
}

/** Lookup par slug OU id legacy (les URLs UUID restent valides). */
export interface SlugProduct {
  id: string;
  slug?: string | null;
}

export function findProductBySlugOrId<T extends SlugProduct>(
  products: T[],
  key: string | null | undefined,
): T | undefined {
  if (!key) return undefined;
  return products.find((p) => p.id === key || (p.slug || undefined) === key);
}

/** URL canonique fiche produit (slug, repli id), variante ?color=&size=. */
export function productPagePath(
  product: SlugProduct,
  color?: string | null,
  size?: string | null,
): string {
  const params = new URLSearchParams();
  if (color) params.set("color", color);
  if (size) params.set("size", size);
  const qs = params.toString();
  return `/${ITEM_ROUTE}/${product.slug || product.id}${qs ? `?${qs}` : ""}`;
}
