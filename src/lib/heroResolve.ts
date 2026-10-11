// src/lib/heroResolve.ts — PUR. Promos + produits (+ HTML publié) → slides prêts à rendre.
import {
  buildHeroConfigFromLegacy,
  isHeroScheduledLive,
  resolveHeroConfig,
  type HeroConfig,
  type LegacyHeroFields,
} from "./heroSchema.ts";
import { heroBackground, isLightHeroBg } from "./heroStyle.ts";

export interface HeroProductLite {
  id: string;
  title: string;
  description?: string | null;
  image?: string | null;
  isActive?: boolean | null;
}

export interface HeroHtmlPayload {
  html: string;
  css: string;
}

export interface HeroPromoLike extends LegacyHeroFields {
  id: string;
  order: number;
  isActive?: boolean | null;
  startsAt?: string | null;
  endsAt?: string | null;
  config?: HeroConfig | null;
}

export interface ResolvedHeroSlide {
  id: string;
  /** Produit principal (cible par défaut des CTA). null = slide sans produit. */
  productId: string | null;
  product: HeroProductLite | null;
  config: HeroConfig;
  /** Fond CSS final (fallback appliqué). */
  bg: string;
  /** true = encre sombre pour les contrôles (fond clair, aucune image plein cadre). */
  lightBg: boolean;
  /** HTML/CSS de la couche "html" (chargés à part, jamais dans la liste publique). */
  html?: HeroHtmlPayload | null;
}

function make(
  id: string,
  productId: string | null,
  product: HeroProductLite | null,
  config: HeroConfig,
  html: HeroHtmlPayload | null = null,
): ResolvedHeroSlide {
  const bg = heroBackground(config.background.gradient);
  const hasFill = config.layers.some((l) => l.type === "image" && !l.off);
  return {
    id,
    productId,
    product,
    config,
    bg,
    lightBg: !hasFill && isLightHeroBg(bg),
    html,
  };
}

/** Le slide porte-t-il une couche HTML ? (décide s'il faut aller chercher son HTML) */
export function heroHasHtml(p: { config?: HeroConfig | null }): boolean {
  return !!p.config && p.config.layers.some((l) => l.type === "html" && !l.off);
}

/** Un slide SANS produit doit porter son propre visuel, sinon il est vide. */
function hasStandaloneContent(c: HeroConfig): boolean {
  return c.layers.some(
    (l) =>
      !l.off &&
      (l.type === "html" ||
        (l.type === "image" && !!l.src) ||
        (l.type === "card" && !!l.src) ||
        (l.type === "tiles" && (!!l.main?.src || l.items.length > 0))),
  );
}

/**
 * Règles (boutique) :
 *  - slide actif et dans sa fenêtre de planification ;
 *  - avec produit : le produit doit exister ET être actif (règle historique) ;
 *  - sans produit : seulement si origin "studio" ET un visuel propre ;
 *  - couche HTML : le slide n'apparaît qu'une fois son HTML chargé (htmlById) ;
 *  - tri par order puis id (déterministe).
 */
export function resolveHeroSlides(
  promos: HeroPromoLike[],
  products: HeroProductLite[],
  now: number = Date.now(),
  htmlById: Record<string, HeroHtmlPayload> = {},
  variant: "A" | "B" | null = null,
): ResolvedHeroSlide[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return [...promos]
    .filter(
      (p) =>
        p.isActive !== false && isHeroScheduledLive(p.startsAt, p.endsAt, now),
    )
    .sort(
      (a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    )
    .flatMap((p) => {
      const pid = p.productId || null;
      const product = pid ? (byId.get(pid) ?? null) : null;
      if (pid && (!product || product.isActive === false)) return [];
      const config = resolveHeroConfig(p);
      if (variant && config.ab && config.ab !== variant) return [];
      if (!pid && (config.origin === "legacy" || !hasStandaloneContent(config)))
        return [];
      const wantsHtml = config.layers.some((l) => l.type === "html" && !l.off);
      const html = wantsHtml ? (htmlById[p.id] ?? null) : null;
      if (wantsHtml && !html) return [];
      return [make(p.id, pid, product, config, html)];
    });
}

/** Preview studio : aucun filtre (on veut voir le brouillon tel quel). */
export function resolveHeroSlideForPreview(
  p: HeroPromoLike,
  product: HeroProductLite | null,
  html: HeroHtmlPayload | null = null,
): ResolvedHeroSlide {
  return make(
    p.id || "preview",
    p.productId || null,
    product,
    resolveHeroConfig(p),
    html,
  );
}

/** Prochain instant (ms) où la planification change l'ensemble des slides visibles. */
export function nextHeroScheduleChange(
  promos: {
    isActive?: boolean | null;
    startsAt?: string | null;
    endsAt?: string | null;
  }[],
  now: number = Date.now(),
): number | null {
  let next: number | null = null;
  for (const p of promos) {
    if (p.isActive === false) continue;
    for (const iso of [p.startsAt, p.endsAt]) {
      const t = iso ? Date.parse(iso) : NaN;
      if (!Number.isNaN(t) && t > now && (next === null || t < next)) next = t;
    }
  }
  return next;
}

/**
 * Slide d'amorçage embarqué par le prerender (<script id="lead-hero-data">), format
 * legacy déjà résolu. Validation minimale, jamais d'exception.
 */
export function parseLeadHero(raw: unknown): ResolvedHeroSlide | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.image !== "string" || !r.image) return null;
  if (typeof r.headline !== "string" || !r.headline) return null;
  const sub = typeof r.sub === "string" ? r.sub : "";
  const productId =
    typeof r.productId === "string" && r.productId ? r.productId : null;
  const tiles = Array.isArray(r.tiles)
    ? r.tiles
        .filter(
          (t) => !!t && typeof (t as { image?: unknown }).image === "string",
        )
        .slice(0, 3)
    : null;
  const config = buildHeroConfigFromLegacy({
    kind: r.kind === "image" || r.kind === "grid" ? r.kind : "product",
    layout: r.layout === "split" ? "split" : "full",
    headline: r.headline,
    sub,
    cta: typeof r.cta === "string" && r.cta ? r.cta : "Discover",
    tag: typeof r.tag === "string" ? r.tag : "⚡ PROMOTION",
    showTag: r.showTag !== false,
    image: r.image,
    bgGradient: typeof r.bgGradient === "string" ? r.bgGradient : "",
    linkUrl: typeof r.linkUrl === "string" ? r.linkUrl : null,
    tiles,
    productId,
  });
  return make(
    "lead",
    productId,
    {
      id: productId ?? "lead",
      title: r.headline,
      description: sub,
      image: r.image,
    },
    config,
  );
}
