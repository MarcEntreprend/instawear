// src/lib/heroSelect.ts — sélection PURE des slides hero (sans React).
// Règles (miroir du useMemo heroBanners historique + Phase 1) :
// - is_active = false => exclu ;
// - fenêtre de planification [starts_at, ends_at[ (filtre runtime) ;
// - slide studio sans produit (product_id NULL => "") => conservé tel quel ;
// - slide legacy : produit introuvable ou inactif => exclu (silencieux, assumé) ;
// - tri order croissant ; fallbacks titre/prix/image/CTA identiques à avant.
// Testé dans tests/hero-render.test.ts (zéro backend).

import {
  resolveHeroConfig,
  isHeroScheduledLive,
  type HeroConfig,
} from "./heroSchema";
import type { HeroPromotion } from "../admin/adminTypes";
import { PLACEHOLDER_IMG } from "../constants/assets";

/** Fond hero par défaut (ex-HeroCarousel) : repris ici pour casser tout
 *  cycle d'import (HeroCarousel le ré-exporte, App inchangé). */
export const HERO_BG_FALLBACK =
  "linear-gradient(135deg, #1a1712 0%, #242019 60%, #1a1712 100%)";

export const HERO_PLACEHOLDER_TAG = "⚡ PROMOTION";

export interface HeroSlideProduct {
  title: string;
  description: string;
  image: string;
}

export interface HeroProductLite {
  id: string;
  isActive?: boolean;
  title: string;
  description: string;
  image: string;
}

/** Slide prêt à rendre : composition résolue + fallbacks legacy cuits
 *  (fin d'incertitude produit → mêmes pixels qu'avant pour origin legacy). */
export interface HeroSlideData {
  id: string;
  config: HeroConfig;
  title: string;
  headline: string;
  sub: string;
  cta: string;
  bgGradient: string;
  image: string;
  tag: string;
  /** "" = slide studio sans produit (jamais auto-désactivé, jamais de fiche). */
  productId: string;
  showTag: boolean;
  showTitle: boolean;
  layout: "full" | "split";
  kind: "product" | "image" | "grid";
  linkUrl: string | null;
  tiles: Array<{ image: string; label?: string; link?: string }> | null;
  product: HeroSlideProduct | null;
}

export function selectHeroSlides(
  promos: HeroPromotion[],
  products: HeroProductLite[],
  now: number = Date.now(),
): HeroSlideData[] {
  return [...promos]
    .filter((promo) => {
      if (promo.isActive === false) return false;
      if (
        !isHeroScheduledLive(promo.startsAt ?? null, promo.endsAt ?? null, now)
      )
        return false;
      // Slide studio sans produit : aucune dépendance catalogue.
      if (!promo.productId) return true;
      const product = products.find((p) => p.id === promo.productId);
      if (!product || product.isActive === false) return false;
      return true;
    })
    .sort((a, b) => a.order - b.order)
    .map((promo) => {
      const product =
        products.find((p) => p.id === promo.productId) ?? null;
      return {
        id: promo.id,
        config: resolveHeroConfig(promo),
        title: promo.title || product?.title || promo.headline || "Promotion",
        headline: promo.headline || product?.title || "",
        sub: promo.sub || product?.description || "",
        cta: promo.cta || "Discover",
        bgGradient: promo.bgGradient || HERO_BG_FALLBACK,
        image: promo.image || product?.image || PLACEHOLDER_IMG,
        tag: promo.tag || HERO_PLACEHOLDER_TAG,
        productId: promo.productId || "",
        showTag: promo.showTag !== false,
        showTitle: promo.showTitle !== false,
        layout: (promo.layout === "split" ? "split" : "full") as
          | "full"
          | "split",
        kind: (promo.kind === "image" || promo.kind === "grid"
          ? promo.kind
          : "product") as "product" | "image" | "grid",
        linkUrl: typeof promo.linkUrl === "string" ? promo.linkUrl : null,
        tiles: Array.isArray(promo.tiles) ? promo.tiles : null,
        product: product
          ? {
              title: product.title,
              description: product.description,
              image: product.image,
            }
          : null,
      };
    });
}
