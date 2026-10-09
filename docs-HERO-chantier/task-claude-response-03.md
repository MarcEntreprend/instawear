# Hero Studio : lot 2 (rendu unifié) + lot 3 (studio)

Je livre les deux ensemble, parce que le studio **réutilise le même composant de rendu que la boutique** (aperçu fidèle, zéro duplication). Aucun HTML collé dans ce lot : c'est le lot 4. La propagation live vers la boutique est le lot 5. Pour l'instant une modif apparaît au rechargement, comme avant.

Choix à connaître :

1. **Le cadre du carrousel suit le slide n°1.** Un cadre qui change de taille à chaque rotation provoquerait du CLS. Les autres slides remplissent le cadre. Le studio affiche cet avertissement.
2. **Slide 0 : URLs d'images identiques à l'ancien code.** Le snapshot prerender réutilise le cache de la même URL. Le srcset responsive viendra avec `prerender.ts` en phase 2, pour que le LCP reste inchangé.
3. **Brouillon = slide inactif.** Pas de table de brouillons. "Visible en boutique" est un interrupteur dans le studio.
4. **Un slide hérité (`legacy`) devient `studio` à son premier enregistrement.** La config devient alors la source de vérité. Le studio écrit aussi les colonnes legacy en miroir (`image`, `headline`, `cta`…) pour que le prerender du slide n°1 continue de fonctionner.
5. **Un slide legacy sans produit reste caché** (comportement actuel). Seuls les slides créés au studio peuvent être sans produit.

---

# Partie A. Lot 2 : rendu unifié (frontend)

## A1. `src/lib/heroStyle.ts` (nouveau)

```ts
// src/lib/heroStyle.ts — helpers de style hero PURS (carrousel, admin, tests).
// Les imports internes portent l'extension .ts : ce fichier est importé par les tests node.
import { cleanHeroLink } from "./heroSchema.ts";

/** Fond hero par défaut. */
export const HERO_BG_FALLBACK =
  "linear-gradient(135deg, #1a1712 0%, #242019 60%, #1a1712 100%)";

/** Fond clair ? (texte sombre). */
export function isLightHeroBg(g?: string): boolean {
  if (!g) return false;
  const lightMarkers = [
    "#faf7f0",
    "#f3ece0",
    "#f0b13d",
    "#f7d789",
    "#ffffff",
    "#fff",
  ];
  const low = g.toLowerCase();
  return lightMarkers.some((m) => low.includes(m));
}

/** Lien hero saisi → chemin interne, ou "" (miroir de cleanHeroLink). */
export function normalizeHeroLink(v: unknown): string {
  return cleanHeroLink(v) ?? "";
}

/** Ne retient que ce qui ressemble à du CSS réel, sinon fallback. */
export function heroBackground(g?: string): string {
  if (g && (g.includes("(") || g.startsWith("#") || g.startsWith("var(--"))) {
    return g;
  }
  return HERO_BG_FALLBACK;
}
```

## A2. `src/lib/heroResolve.ts` (nouveau)

```ts
// src/lib/heroResolve.ts — PUR. Promos + produits → slides prêts à rendre.
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
}

function make(
  id: string,
  productId: string | null,
  product: HeroProductLite | null,
  config: HeroConfig,
): ResolvedHeroSlide {
  const bg = heroBackground(config.background.gradient);
  const hasFill = config.layers.some((l) => l.type === "image");
  return {
    id,
    productId,
    product,
    config,
    bg,
    lightBg: !hasFill && isLightHeroBg(bg),
  };
}

/** Un slide SANS produit doit porter son propre visuel, sinon il est vide. */
function hasStandaloneContent(c: HeroConfig): boolean {
  return c.layers.some(
    (l) =>
      l.type === "html" ||
      (l.type === "image" && !!l.src) ||
      (l.type === "card" && !!l.src) ||
      (l.type === "tiles" && (!!l.main?.src || l.items.length > 0)),
  );
}

/**
 * Règles (boutique) :
 *  - slide actif et dans sa fenêtre de planification ;
 *  - avec produit : le produit doit exister ET être actif (règle historique) ;
 *  - sans produit : seulement si origin "studio" ET un visuel propre ;
 *  - tri par order puis id (déterministe).
 */
export function resolveHeroSlides(
  promos: HeroPromoLike[],
  products: HeroProductLite[],
  now: number = Date.now(),
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
      if (!pid && (config.origin === "legacy" || !hasStandaloneContent(config)))
        return [];
      return [make(p.id, pid, product, config)];
    });
}

/** Preview studio : aucun filtre (on veut voir le brouillon tel quel). */
export function resolveHeroSlideForPreview(
  p: HeroPromoLike,
  product: HeroProductLite | null,
): ResolvedHeroSlide {
  return make(
    p.id || "preview",
    p.productId || null,
    product,
    resolveHeroConfig(p),
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
```

## A3. `src/components/HeroSlideView.tsx` (nouveau)

```tsx
// src/components/HeroSlideView.tsx — rendu UNIFIÉ d'un slide hero (config v1).
// Utilisé par la boutique (HeroCarousel) ET par la preview du studio.
import { Fragment, type CSSProperties, type SyntheticEvent } from "react";
import { ArrowRight } from "lucide-react";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { supabaseImageUrl } from "../lib/supabaseImage";
import type { HeroCta, HeroTextLayer } from "../lib/heroSchema";
import type { ResolvedHeroSlide } from "../lib/heroResolve";

export interface HeroSlideViewProps {
  slide: ResolvedHeroSlide;
  /** Position dans le carrousel : 0 = candidat LCP (eager + fetchpriority high). */
  index: number;
  active: boolean;
  /** Slide d'amorçage (JSON prerender) : une image cassée le signale au carrousel. */
  isLead?: boolean;
  onLeadImageError?: () => void;
  onAction: (slide: ResolvedHeroSlide, link: string | null) => void;
  onLink?: (link: string) => void;
}

// URLs : identiques à l'ancien HeroCarousel pour que le slide 0 réutilise l'image du
// snapshot prerender (même URL = cache). Ne changer qu'avec prerender.ts (phase 2).
const U = {
  fill: (s: string) => supabaseImageUrl(s, { width: 1280, quality: 75 }),
  mobile: (s: string) => supabaseImageUrl(s, { width: 800, quality: 75 }),
  tile: (s: string) => supabaseImageUrl(s, { width: 400, quality: 70 }),
};

const SCRIM: Record<"left" | "bottom", CSSProperties> = {
  left: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(15,13,10,.68) 0%, rgba(15,13,10,.28) 55%, transparent 100%)",
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
    background: "linear-gradient(180deg, transparent, rgba(10,9,7,.55))",
  },
};

function Pic({
  src,
  srcMobile,
  alt,
  className,
  style,
  eager,
  onError,
}: {
  src: string;
  srcMobile?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  eager: boolean;
  onError: (e: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const img = (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onError={onError}
    />
  );
  if (!srcMobile) return img;
  return (
    <picture style={{ display: "contents" }}>
      <source media="(max-width: 767px)" srcSet={srcMobile} />
      {img}
    </picture>
  );
}

function CtaButton({
  cta,
  ink,
  onClick,
  className = "",
  style,
}: {
  cta: HeroCta;
  ink: string;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const base =
    cta.style === "dark"
      ? "btn btn-primary"
      : cta.style === "accent"
        ? "btn btn-accent"
        : "btn";
  const look: CSSProperties =
    cta.style === "light"
      ? { background: "#fff", color: "var(--color-ink)" }
      : cta.style === "ghost"
        ? {
            background: "transparent",
            color: ink,
            border: `1.5px solid ${ink}`,
          }
        : {};
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${className}`}
      style={{ ...look, ...style }}
    >
      {cta.label} <ArrowRight size={16} />
    </button>
  );
}

const ANCHOR: Record<
  HeroTextLayer["anchor"],
  { wrap: string; align?: "right" | "center" }
> = {
  "left-middle": { wrap: "items-center" },
  "right-middle": { wrap: "items-center", align: "right" },
  center: { wrap: "items-center", align: "center" },
  "bottom-left": { wrap: "items-end" },
};

export default function HeroSlideView({
  slide,
  index,
  active,
  isLead,
  onLeadImageError,
  onAction,
  onLink,
}: HeroSlideViewProps) {
  const { config, product: p } = slide;
  const eager = index === 0;
  const inline = config.ctas.filter((c) => !c.pos);
  const free = config.ctas.filter((c) => c.pos);
  const hasCard = config.layers.some((l) => l.type === "card");
  const textLayers = config.layers.filter(
    (l): l is HeroTextLayer => l.type === "text",
  );
  // Un seul h1 par page : seul le slide actif porte le titre principal.
  const H = active ? "h1" : "p";
  const fire = (cta: HeroCta) => onAction(slide, cta.link);

  const imgError = (e: SyntheticEvent<HTMLImageElement>) => {
    if (isLead && onLeadImageError) {
      onLeadImageError();
      return;
    }
    const el = e.currentTarget;
    if (el.dataset.fbk) return;
    el.dataset.fbk = "1";
    el.src = PLACEHOLDER_IMG;
  };

  const renderText = (l: HeroTextLayer, key: number, withCtas: boolean) => {
    const dark = l.tone === "dark" || (l.tone === "auto" && slide.lightBg);
    const ink = dark ? "var(--color-ink)" : "#fff";
    const inkSoft = dark ? "var(--color-ink2)" : "rgba(255,255,255,.8)";
    const chipBg = dark ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.14)";
    const chipFg = dark ? "var(--color-accent-strong, #c2452a)" : "#fff";
    // Replis produit (comportement historique) : seulement si fromProduct.
    const tag = l.tag || (l.fromProduct ? "⚡ PROMOTION" : "");
    const headline = l.headline || (l.fromProduct && p ? p.title : "");
    const sub = l.showSub
      ? l.sub || (l.fromProduct && p ? p.description || "" : "")
      : "";
    const all = headline ? headline.split("\n") : [];
    const lines = l.headlineLines === "first" ? all.slice(0, 1) : all;
    const compact = l.anchor === "bottom-left";
    const a = ANCHOR[l.anchor];
    const maxW = compact
      ? "max-w-[60%]"
      : hasCard
        ? "max-w-[62%] sm:max-w-xl"
        : "max-w-xl";
    const side =
      a.align === "right" ? "ml-auto" : a.align === "center" ? "mx-auto" : "";
    return (
      <div
        key={key}
        className={`absolute inset-0 z-10 flex pointer-events-none pt-8 sm:pt-12 pb-19 sm:pb-23 ${a.wrap}`}
      >
        <div className="w-full max-w-350 mx-auto px-5 sm:px-8">
          <div
            key={active ? "on" : "off"}
            className={`pointer-events-auto ${maxW} ${side}`}
            style={{ textAlign: a.align }}
          >
            {l.showTag && tag && (
              <span
                className={`inline-flex items-center gap-2 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] ${
                  compact
                    ? "mb-2 px-3 py-1"
                    : "mb-5 px-3.5 py-1.5 animate-fade-up"
                }`}
                style={{
                  background: chipBg,
                  color: chipFg,
                  backdropFilter: "blur(8px)",
                }}
              >
                {tag}
              </span>
            )}
            {lines.length > 0 &&
              (compact ? (
                <H
                  className="font-extrabold text-xl sm:text-2xl leading-tight drop-shadow"
                  style={{ color: ink }}
                >
                  {lines.join(" ")}
                </H>
              ) : (
                <H
                  className="font-extrabold leading-[0.95] tracking-tight mb-5 animate-fade-up"
                  style={{
                    color: ink,
                    fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                    animationDelay: "80ms",
                  }}
                >
                  {lines.map((line, li) => (
                    <span key={li} className="block">
                      {li === 1 ? (
                        <em className="font-display not-italic sm:italic pb-1 inline-block">
                          {line}
                        </em>
                      ) : (
                        line
                      )}
                    </span>
                  ))}
                </H>
              ))}
            {sub && (
              <p
                className="text-sm sm:text-base mb-7 animate-fade-up"
                style={{
                  color: inkSoft,
                  animationDelay: "160ms",
                  maxWidth: "34ch",
                }}
              >
                {sub}
              </p>
            )}
            {withCtas && inline.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {inline.map((c) => (
                  <CtaButton
                    key={c.id}
                    cta={c}
                    ink={ink}
                    className="animate-fade-up"
                    style={{ animationDelay: "240ms" }}
                    onClick={() => fire(c)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: slide.bg }}
      aria-hidden={!active}
      {...({ inert: !active } as object)}
    >
      {config.layers.map((layer, i) => {
        if (layer.type === "image") {
          const src = layer.src || p?.image || null;
          if (!src) return null;
          // Fond "full" historique (image + voile gauche) : URL brute (cache prerender).
          const raw = layer.scrim === "left" && layer.dim < 1;
          return (
            <Fragment key={i}>
              <Pic
                src={raw ? src : U.fill(src)}
                srcMobile={
                  layer.srcMobile ? U.mobile(layer.srcMobile) : undefined
                }
                alt={layer.alt}
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: layer.fit, opacity: layer.dim }}
                eager={eager}
                onError={imgError}
              />
              {layer.scrim !== "none" && <div style={SCRIM[layer.scrim]} />}
            </Fragment>
          );
        }
        if (layer.type === "card") {
          // Lot studio : layer.productId (autre produit) et showMeta (prix) ne sont pas encore rendus.
          const src = layer.src || p?.image || null;
          if (!src) return null;
          const side =
            layer.side === "left" ? "left-4 sm:left-8" : "right-4 sm:right-8";
          return (
            <div
              key={i}
              className={`absolute ${side} top-1/2 -translate-y-1/2 w-[34vw] sm:w-[38vw] max-w-105`}
            >
              <Pic
                src={U.fill(src)}
                srcMobile={
                  layer.srcMobile ? U.mobile(layer.srcMobile) : undefined
                }
                alt={layer.alt}
                className="w-full aspect-[4/5] max-h-[60vh] object-cover rounded-2xl"
                style={{ boxShadow: "var(--shadow-xl)" }}
                eager={eager}
                onError={imgError}
              />
            </div>
          );
        }
        if (layer.type === "tiles") {
          const main = layer.main;
          const mainSrc = main ? main.src || p?.image || null : null;
          const label = main
            ? main.label || (main.fromProduct && p ? p.title : "")
            : "";
          const click = (link: string | null) => {
            if (link && onLink) onLink(link);
            else onAction(slide, null);
          };
          return (
            <div
              key={i}
              className="absolute inset-0 flex flex-col sm:flex-row gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24"
            >
              {main && mainSrc && (
                <button
                  type="button"
                  onClick={() => click(main.link)}
                  className="relative flex-1 min-h-0 rounded-2xl overflow-hidden text-left"
                  style={{ boxShadow: "var(--shadow-xl)" }}
                  aria-label={label || main.ctaLabel ? undefined : "Voir"}
                >
                  <img
                    src={U.fill(mainSrc)}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading={eager ? "eager" : "lazy"}
                    fetchPriority={eager ? "high" : "auto"}
                    decoding="async"
                    onError={imgError}
                  />
                  {(label || main.ctaLabel) && (
                    <span className="absolute left-3 bottom-3 right-3 flex items-end justify-between gap-2">
                      <span className="text-white font-extrabold text-lg leading-tight drop-shadow">
                        {label}
                      </span>
                      {main.ctaLabel && (
                        <span className="btn btn-accent shrink-0 !py-2 !px-4 text-xs">
                          {main.ctaLabel}
                        </span>
                      )}
                    </span>
                  )}
                </button>
              )}
              <div className="flex sm:flex-col gap-3 sm:w-[30%] shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar">
                {layer.items.map((t, ti) => (
                  <button
                    key={ti}
                    type="button"
                    onClick={() => click(t.link || main?.link || null)}
                    className="relative flex-1 min-w-[38vw] sm:min-w-0 sm:min-h-0 rounded-2xl overflow-hidden text-left"
                    style={{ boxShadow: "var(--shadow-lg)" }}
                    aria-label={t.label || `Voir ${ti + 1}`}
                  >
                    <img
                      src={U.tile(t.src)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    {t.label && (
                      <span
                        className="absolute left-2 bottom-2 text-white text-xs font-bold drop-shadow px-2 py-1 rounded-lg"
                        style={{ background: "rgba(0,0,0,.55)" }}
                      >
                        {t.label}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        return null; // "text" rendu après ; "html" = lot 4
      })}

      {textLayers.map((l, i) => renderText(l, i, i === 0))}

      {textLayers.length === 0 && inline.length > 0 && (
        <div className="absolute inset-0 z-10 flex items-end pointer-events-none pt-8 sm:pt-12 pb-19 sm:pb-23">
          <div className="w-full max-w-350 mx-auto px-5 sm:px-8">
            <div className="pointer-events-auto flex flex-wrap gap-3">
              {inline.map((c) => (
                <CtaButton
                  key={c.id}
                  cta={c}
                  ink={slide.lightBg ? "var(--color-ink)" : "#fff"}
                  onClick={() => fire(c)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {free.map((c) => {
        const d = c.pos!.desktop;
        const m = c.pos!.mobile;
        const vars = {
          "--hx": `${d.x}%`,
          "--hy": `${d.y}%`,
          ...(m ? { "--hxm": `${m.x}%`, "--hym": `${m.y}%` } : {}),
        } as CSSProperties;
        return (
          <div key={c.id} className="hero-cta-free" style={vars}>
            <CtaButton
              cta={c}
              ink={slide.lightBg ? "var(--color-ink)" : "#fff"}
              onClick={() => fire(c)}
            />
          </div>
        );
      })}
    </div>
  );
}
```

## A4. `src/components/HeroCarousel.tsx` : remplacement complet

Il change presque entièrement : plus de `HeroBanner`, rendu délégué à `HeroSlideView`, montage lazy, cadre piloté par la config. Les 4 exports utilisés par `PromotionsPage` sont conservés.

```tsx
// src/components/HeroCarousel.tsx — cadre, autoplay et contrôles du hero.
// Le rendu d'un slide vit dans HeroSlideView (config v1 unifiée).
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { ChevronLeft, ChevronRight, ArrowDown } from "lucide-react";
import HeroSlideView from "./HeroSlideView";
import type { HeroSizing } from "../lib/heroSchema";
import { parseLeadHero, type ResolvedHeroSlide } from "../lib/heroResolve";

// Compat : PromotionsPage importe ces 4 helpers depuis ce fichier.
export {
  HERO_BG_FALLBACK,
  isLightHeroBg,
  normalizeHeroLink,
  heroBackground,
} from "../lib/heroStyle";

/** Lit le slide d'amorçage embarqué par le prerender. Jamais d'exception. */
function readLeadHero(): ResolvedHeroSlide | null {
  try {
    if (typeof document === "undefined") return null;
    const node = document.getElementById("lead-hero-data");
    if (!node || !node.textContent) return null;
    return parseLeadHero(JSON.parse(node.textContent));
  } catch {
    return null;
  }
}

function heightCss(h: { unit: "vh" | "px"; value: number }): string {
  // vh : mêmes bornes que l'ancien h-[78vh] min-h-105 max-h-190 (420px / 760px).
  return h.unit === "vh" ? `clamp(420px, ${h.value}vh, 760px)` : `${h.value}px`;
}

function frameVars(s: HeroSizing): CSSProperties {
  if (s.mode === "auto") {
    return {
      "--hero-r": s.ratio.desktop,
      "--hero-rm": s.ratio.mobile,
    } as CSSProperties;
  }
  return {
    "--hero-h": heightCss(s.height),
    "--hero-hm": heightCss(s.heightMobile ?? s.height),
  } as CSSProperties;
}

interface HeroCarouselProps {
  slides: ResolvedHeroSlide[];
  loading: boolean;
  /** CTA / clic principal : `link` interne validé par l'appelant, sinon fiche produit. */
  onSlideAction: (slide: ResolvedHeroSlide, link: string | null) => void;
  /** Clic tuile : lien interne validé par l'appelant. */
  onSlideLink?: (link: string) => void;
  /** Suspendu (cold deep-route produit) : squelette au même gabarit, AUCUNE <img>. */
  suspended?: boolean;
}

export default function HeroCarousel({
  slides,
  loading,
  onSlideAction,
  onSlideLink,
  suspended = false,
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [armed, setArmed] = useState(false);
  const autoPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide d'amorçage : rendu pendant le chargement (image déjà en cache), swap invisible.
  const [lead] = useState<ResolvedHeroSlide | null>(() => readLeadHero());
  const [leadFailed, setLeadFailed] = useState(false);
  const showLead = !suspended && loading && lead !== null && !leadFailed;
  const list = showLead && lead !== null ? [lead] : slides;
  const count = list.length;
  const isSingle = count <= 1;

  const goTo = useCallback(
    (i: number) => {
      if (count > 0) setIndex(((i % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (suspended || isPaused || count === 0) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(timer);
  }, [suspended, isPaused, count]);

  // Les voisins ne se montent qu'après le LCP (pas de concurrence de bande passante).
  useEffect(() => {
    if (suspended || count <= 1) return;
    const t = setTimeout(() => setArmed(true), 1200);
    return () => clearTimeout(t);
  }, [suspended, count]);

  useEffect(
    () => () => {
      if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    },
    [],
  );

  const pauseAutoPlay = (duration = 8000) => {
    setIsPaused(true);
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    autoPlayTimeoutRef.current = setTimeout(() => setIsPaused(false), duration);
  };

  if (suspended || (loading && !showLead) || (!loading && count === 0)) {
    return (
      <section className="relative overflow-hidden rounded-b-4xl sm:rounded-b-[2.5rem]">
        <div
          className="hero-box animate-pulse"
          style={{
            background:
              "linear-gradient(135deg, #171511 0%, #232019 55%, #171511 100%)",
          }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-(--color-border) border-t-(--color-accent) animate-spin" />
            </div>
          )}
        </div>
      </section>
    );
  }

  const cur = index % count;
  const active = list[cur];
  // Le cadre suit le slide n°1 (évite le CLS entre slides de tailles différentes).
  const sizing = list[0].config.sizing;
  const contained = sizing.width === "contained";
  const ink = active.lightBg ? "var(--color-ink)" : "#fff";
  const mounted = (i: number) =>
    i === cur ||
    (armed && (i === (cur + 1) % count || i === (cur - 1 + count) % count));

  return (
    <section
      className={
        contained
          ? "relative max-w-350 mx-auto px-4 sm:px-6 pt-4"
          : "relative overflow-hidden rounded-b-4xl sm:rounded-b-[2.5rem]"
      }
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={`hero-box ${sizing.mode === "auto" ? "hero-box--auto" : ""} ${
          contained ? "overflow-hidden rounded-3xl" : ""
        }`}
        style={frameVars(sizing)}
      >
        {list.map((s, i) =>
          mounted(i) ? (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700"
              style={{
                opacity: i === cur ? 1 : 0,
                pointerEvents: i === cur ? "auto" : "none",
              }}
            >
              <HeroSlideView
                slide={s}
                index={i}
                active={i === cur}
                isLead={showLead}
                onLeadImageError={() => setLeadFailed(true)}
                onAction={onSlideAction}
                onLink={onSlideLink}
              />
            </div>
          ) : null,
        )}

        {!isSingle && (
          <>
            <button
              onClick={() => {
                pauseAutoPlay();
                goTo(cur - 1);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/50 text-gray-900 hidden md:flex items-center justify-center z-20"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => {
                pauseAutoPlay();
                goTo(cur + 1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/50 text-gray-900 hidden md:flex items-center justify-center z-20"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none">
          <div className="max-w-350 mx-auto px-5 sm:px-8 pb-8 sm:pb-12 flex items-center justify-between">
            <div className="flex items-center gap-2 pointer-events-auto">
              {!isSingle &&
                list.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      pauseAutoPlay();
                      goTo(i);
                    }}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === cur}
                    className="flex items-center justify-center min-w-[24px] min-h-[24px]"
                  >
                    <span
                      className="block h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: i === cur ? "28px" : "8px",
                        background:
                          i === cur
                            ? ink
                            : active.lightBg
                              ? "rgba(0,0,0,.25)"
                              : "rgba(255,255,255,.4)",
                      }}
                    />
                  </button>
                ))}
            </div>
            <button
              onClick={() =>
                document
                  .getElementById("section-catalog")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              aria-label="Scroll to catalog"
              className="w-11 h-11 rounded-full flex items-center justify-center pointer-events-auto"
              style={{
                border: active.lightBg
                  ? "1px solid rgba(0,0,0,.25)"
                  : "1px solid rgba(255,255,255,.4)",
                color: ink,
              }}
            >
              <ArrowDown size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
```

## A5. `src/index.css` : à ajouter tout à la fin du fichier

Après le dernier bloc de commentaire qui commence par `/* Diagnostic : bordures rouges sur tous les éléments`.

```css
/* ── Hero Studio : cadre du carrousel + CTA positionnés ─────────────────
   Dimensions pilotées par la config du slide n°1 (variables posées inline).
   Valeurs par défaut = ancien h-[78vh] min-h-105 max-h-190 (LCP/CLS inchangés). */
.hero-box {
  position: relative;
  width: 100%;
  height: var(--hero-h, clamp(420px, 78vh, 760px));
}
.hero-box--auto {
  height: auto;
  aspect-ratio: var(--hero-r, 2.4);
}
.hero-cta-free {
  position: absolute;
  z-index: 15;
  left: var(--hx);
  top: var(--hy);
  /* translate(-x%, -y%) : le bouton ne déborde JAMAIS, même à 0 % ou 100 %. */
  transform: translate(calc(var(--hx) * -1), calc(var(--hy) * -1));
}
@media (max-width: 767px) {
  .hero-box {
    height: var(--hero-hm, var(--hero-h, clamp(420px, 78vh, 760px)));
  }
  .hero-box--auto {
    height: auto;
    aspect-ratio: var(--hero-rm, var(--hero-r, 0.9));
  }
  .hero-cta-free {
    left: var(--hxm, var(--hx));
    top: var(--hym, var(--hy));
    transform: translate(
      calc(var(--hxm, var(--hx)) * -1),
      calc(var(--hym, var(--hy)) * -1)
    );
  }
}
```

## A6. `src/App.tsx` : 3 modifications

**1) Imports.** Remplace la ligne `import HeroCarousel, { HERO_BG_FALLBACK } from "./components/HeroCarousel";` par :

```tsx
import HeroCarousel from "./components/HeroCarousel";
import { resolveHeroSlides, nextHeroScheduleChange } from "./lib/heroResolve";
```

Puis supprime la ligne `import { PLACEHOLDER_IMG } from "./constants/assets";` (elle n'a plus d'usage dans `App.tsx`).

**2) Remplace le bloc** qui commence par `// Hero Carousel banners content` et se termine par `}, [heroPromotions, products]);` :

```tsx
// Hero : slides résolus (config v1 + replis legacy/produit + planification).
// `heroNow` n'est qu'un déclencheur de recalcul aux bornes starts_at / ends_at.
const [heroNow, setHeroNow] = useState(() => Date.now());
useEffect(() => {
  const next = nextHeroScheduleChange(heroPromotions, Date.now());
  if (next == null) return;
  const delay = Math.min(Math.max(next - Date.now() + 50, 50), 2_000_000_000);
  const t = setTimeout(() => setHeroNow(Date.now()), delay);
  return () => clearTimeout(t);
}, [heroPromotions, heroNow]);
const heroSlides = useMemo(
  () => resolveHeroSlides(heroPromotions, products, heroNow),
  [heroPromotions, products, heroNow],
);
```

**3) Remplace le bloc** qui commence par `<HeroCarousel` et se termine par `/>` juste avant `<ReassuranceBar />` :

```tsx
<HeroCarousel
  slides={heroSlides}
  loading={promotionsLoading}
  suspended={suspendHeroForBootProduct}
  onSlideAction={(slide, link) => {
    if (link && openHeroLink(link)) return;
    if (slide.productId) {
      const target = products.find((p) => p.id === slide.productId);
      if (target) openProduct(target);
    }
  }}
  onSlideLink={(link) => {
    openHeroLink(link);
  }}
/>
```

## A7. `src/admin/PromotionsPage.tsx` : 2 corrections

**1) `refresh` désactivait tous les slides sans produit.** Remplace le bloc qui commence par `const refresh = async () => {` et se termine par le `};` situé juste avant `const handleSave = async (e: React.FormEvent) => {` :

```tsx
const refresh = async () => {
  try {
    const promos = await heroPromotionsApi.list();
    for (const promo of promos) {
      // Slide SANS produit (créé au Hero Studio) : jamais désactivé ici.
      if (!promo.productId) continue;
      const product = allProducts.find((p) => p.id === promo.productId);
      if (
        (!product || product.isActive === false) &&
        promo.isActive !== false
      ) {
        await heroPromotionsApi.update(promo.id, { isActive: false } as any);
        promo.isActive = false;
      }
    }
    setPromotions(promos);
  } catch (e) {
    console.error(e);
  }
};
```

**2) Créer un slide activait toujours un deal**, même avec "Deal actif = Non". Cela posait `dealActive` et le badge "Offre limitée" sans prix. Remplace les lignes qui commencent par `// Activer dealActive sur le produit` et se terminent par `(form as any).dealEndsAt,` suivi de `);` (dans la branche `else` de `handleSave`, juste après le `import("../api/supabaseApi").then(({ notificationApi })`) :

```tsx
// Deal : seulement si coché (créer un slide ne doit plus activer un deal
// sans prix, ni le badge "Offre limitée" fantôme).
if ((form as any).dealActive) {
  await syncProductDeal(
    created.productId,
    true,
    (form as any).dealPrice,
    (form as any).dealEndsAt,
  );
}
```

---

# Partie B. Lot 3 : le studio

## B1. `src/lib/heroStudio.ts` (nouveau, logique pure)

```ts
// src/lib/heroStudio.ts — logique PURE du studio (modèles, miroir legacy, contrôles).
import {
  buildHeroConfigFromLegacy,
  sanitizeHeroConfig,
  HERO_DEFAULT_SIZING,
  HERO_MAX_CTAS,
  type HeroConfig,
  type HeroCta,
  type HeroLayer,
} from "./heroSchema.ts";
import { HERO_BG_FALLBACK } from "./heroStyle.ts";

export const HERO_PREVIEW_PATH = "/admin/hero-preview";
export const HERO_STUDIO_SOURCE = "hero-studio";
export const HERO_FRAME_SOURCE = "hero-studio-frame";
export const HERO_CONFIG_CAP_BYTES = 20000; // = CHECK SQL hero_promotions_config_check

export const HERO_BG_PRESETS: { label: string; value: string }[] = [
  { label: "Sombre", value: HERO_BG_FALLBACK },
  {
    label: "Crème",
    value: "linear-gradient(135deg, #faf7f0 0%, #f3ece0 60%, #faf7f0 100%)",
  },
  {
    label: "Terracotta",
    value: "linear-gradient(135deg, #c2452a 0%, #e07a4e 60%, #c2452a 100%)",
  },
  {
    label: "Sauge",
    value: "linear-gradient(135deg, #5b6b4f 0%, #8a9b7a 60%, #5b6b4f 100%)",
  },
  {
    label: "Nuit bleue",
    value: "linear-gradient(135deg, #1c2340 0%, #3a4a7a 60%, #1c2340 100%)",
  },
  {
    label: "Sable doré",
    value: "linear-gradient(135deg, #f0b13d 0%, #f7d789 60%, #f0b13d 100%)",
  },
];

const studio = (c: HeroConfig): HeroConfig => ({ ...c, origin: "studio" });
const SAMPLE = {
  headline: "Votre titre\nen deux lignes",
  sub: "Un sous-titre court.",
  cta: "Découvrir",
  tag: "Nouveau",
};

export interface HeroTemplate {
  id: string;
  label: string;
  desc: string;
  build: () => HeroConfig;
}

export const HERO_TEMPLATES: HeroTemplate[] = [
  {
    id: "full",
    label: "Plein cadre",
    desc: "Image en fond, texte à gauche.",
    build: () =>
      studio(
        buildHeroConfigFromLegacy({
          kind: "product",
          layout: "full",
          ...SAMPLE,
        }),
      ),
  },
  {
    id: "split",
    label: "Visuel + carte",
    desc: "Fond de couleur, visuel cadré à droite.",
    build: () =>
      studio(
        buildHeroConfigFromLegacy({
          kind: "product",
          layout: "split",
          bgGradient: HERO_BG_PRESETS[1].value,
          ...SAMPLE,
        }),
      ),
  },
  {
    id: "banner",
    label: "Bannière image",
    desc: "Image seule, titre en bas, bouton à droite.",
    build: () =>
      studio(
        buildHeroConfigFromLegacy({ kind: "image", layout: "full", ...SAMPLE }),
      ),
  },
  {
    id: "grid",
    label: "Grille",
    desc: "Visuel principal + jusqu'à 3 tuiles liées.",
    build: () =>
      studio(
        buildHeroConfigFromLegacy({ kind: "grid", layout: "split", ...SAMPLE }),
      ),
  },
  {
    id: "blank",
    label: "Image seule",
    desc: "Juste une image (idéal pour le slide n°1 / LCP).",
    build: () =>
      sanitizeHeroConfig({
        origin: "studio",
        layers: [
          {
            type: "image",
            src: null,
            alt: "",
            fit: "cover",
            dim: 1,
            scrim: "none",
          },
        ],
        ctas: [],
      }),
  },
];

export function newLayer(type: "image" | "card" | "tiles" | "text"): HeroLayer {
  switch (type) {
    case "image":
      return {
        type: "image",
        src: null,
        alt: "",
        fit: "cover",
        dim: 1,
        scrim: "none",
      };
    case "card":
      return {
        type: "card",
        side: "right",
        src: null,
        alt: "",
        productId: null,
        showMeta: false,
      };
    case "tiles":
      return {
        type: "tiles",
        main: {
          src: null,
          link: null,
          label: "",
          ctaLabel: "Découvrir",
          fromProduct: true,
        },
        items: [],
      };
    default:
      return {
        type: "text",
        anchor: "left-middle",
        tone: "auto",
        tag: "",
        showTag: true,
        headline: "",
        headlineLines: "all",
        sub: "",
        showSub: true,
        fromProduct: false,
      };
  }
}

export function newCta(): HeroCta {
  return {
    id: `cta-${Math.random().toString(36).slice(2, 7)}`,
    label: "Découvrir",
    link: null,
    style: "accent",
    pos: null,
  };
}

function layerOf<T extends HeroLayer["type"]>(c: HeroConfig, type: T) {
  return c.layers.find(
    (l): l is Extract<HeroLayer, { type: T }> => l.type === type,
  );
}

// ─── Miroir legacy (prerender du slide 0 + anciennes lectures) ───────────
export interface HeroLegacyMirror {
  kind: "product" | "image" | "grid";
  layout: "full" | "split";
  headline: string;
  sub: string;
  tag: string;
  showTag: boolean;
  cta: string;
  linkUrl: string | null;
  bgGradient: string;
  image: string;
  tiles: { image: string; label?: string; link?: string }[];
}

export function heroConfigToLegacy(c: HeroConfig): HeroLegacyMirror {
  const img = layerOf(c, "image");
  const card = layerOf(c, "card");
  const tiles = layerOf(c, "tiles");
  const text = layerOf(c, "text");
  const cta = c.ctas[0];
  let kind: HeroLegacyMirror["kind"] = "product";
  let layout: HeroLegacyMirror["layout"] = "full";
  if (tiles) {
    kind = "grid";
    layout = "split";
  } else if (card) {
    layout = "split";
  } else if (img && img.scrim === "bottom") {
    kind = "image";
  }
  return {
    kind,
    layout,
    headline: text?.headline ?? "",
    sub: text?.sub ?? "",
    tag: text?.tag ?? "",
    showTag: text?.showTag ?? true,
    cta: cta?.label ?? tiles?.main?.ctaLabel ?? "",
    linkUrl: cta?.link ?? tiles?.main?.link ?? null,
    bgGradient: c.background.gradient,
    image: tiles?.main?.src ?? img?.src ?? card?.src ?? "",
    tiles: (tiles?.items ?? []).map((t) => ({
      image: t.src,
      label: t.label || undefined,
      link: t.link || undefined,
    })),
  };
}

// ─── Contrôles qualité ───────────────────────────────────────────────────
export interface HeroWarning {
  level: "info" | "warn";
  text: string;
}

export function heroConfigBytes(c: HeroConfig): number {
  return new TextEncoder().encode(JSON.stringify(c)).length;
}

export function heroHasVisual(c: HeroConfig, hasProduct: boolean): boolean {
  if (
    hasProduct &&
    c.layers.some(
      (l) => l.type === "image" || l.type === "card" || l.type === "tiles",
    )
  ) {
    return true;
  }
  return c.layers.some(
    (l) =>
      (l.type === "image" && !!l.src) ||
      (l.type === "card" && !!l.src) ||
      (l.type === "tiles" && (!!l.main?.src || l.items.length > 0)),
  );
}

export function heroStudioWarnings(
  c: HeroConfig,
  ctx: { isFirst: boolean; hasProduct: boolean },
): HeroWarning[] {
  const w: HeroWarning[] = [];
  if (c.layers.length === 0)
    w.push({ level: "warn", text: "Slide vide : ajoute au moins une couche." });
  else if (!heroHasVisual(c, ctx.hasProduct)) {
    w.push({
      level: "warn",
      text: "Aucun visuel : ajoute une image ou choisis un produit.",
    });
  }
  if (ctx.isFirst) {
    w.push({
      level: "info",
      text: "Les dimensions du slide n°1 s'appliquent à tout le carrousel.",
    });
    if (!c.layers.some((l) => l.type === "image")) {
      w.push({
        level: "info",
        text: "Slide n°1 sans image plein cadre : le LCP sera moins bon.",
      });
    }
  }
  for (const cta of c.ctas) {
    if (!cta.link && !ctx.hasProduct) {
      w.push({
        level: "warn",
        text: `« ${cta.label} » n'a pas de destination (lien vide, aucun produit).`,
      });
    }
    const y = Math.max(cta.pos?.desktop.y ?? 0, cta.pos?.mobile?.y ?? 0);
    if (y > 84) {
      w.push({
        level: "info",
        text: `« ${cta.label} » est proche des contrôles du carrousel.`,
      });
    }
  }
  const bytes = heroConfigBytes(c);
  if (bytes > HERO_CONFIG_CAP_BYTES) {
    w.push({
      level: "warn",
      text: `Configuration trop lourde (${bytes} / ${HERO_CONFIG_CAP_BYTES} octets) : enregistrement refusé.`,
    });
  } else if (bytes > HERO_CONFIG_CAP_BYTES * 0.75) {
    w.push({
      level: "info",
      text: `Configuration lourde (${bytes} / ${HERO_CONFIG_CAP_BYTES} octets).`,
    });
  }
  return w;
}

export function canAddCta(c: HeroConfig): boolean {
  return c.ctas.length < HERO_MAX_CTAS;
}

// ─── Utilitaires ─────────────────────────────────────────────────────────
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function moveItem<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Arrondi 0,5 % + aimantation au centre (50 %) à ±1,5 %. */
export function snapHeroPoint(v: number): number {
  const c = Math.min(100, Math.max(0, v));
  if (Math.abs(c - 50) <= 1.5) return 50;
  return Math.round(c * 2) / 2;
}

/** Zone basse occupée par les contrôles du carrousel (px, miroir du CSS de HeroSlideView). */
export function heroReservedBottomPx(deviceWidth: number): number {
  return deviceWidth >= 640 ? 92 : 76;
}

export { HERO_DEFAULT_SIZING };
```

## B2. `src/admin/HeroPreviewFrame.tsx` (nouveau, admin uniquement)

```tsx
// src/admin/HeroPreviewFrame.tsx — page chargée DANS l'iframe d'aperçu du studio.
// Garde admin : rien ne s'affiche sans session admin ; les messages ne sont acceptés
// que du parent same-origin.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import HeroCarousel from "../components/HeroCarousel";
import { sanitizeHeroConfig } from "../lib/heroSchema";
import type { ResolvedHeroSlide } from "../lib/heroResolve";
import { HERO_FRAME_SOURCE, HERO_STUDIO_SOURCE } from "../lib/heroStudio";

export default function HeroPreviewFrame() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [slide, setSlide] = useState<ResolvedHeroSlide | null>(null);

  useEffect(() => {
    supabase.rpc("is_admin").then(
      ({ data }) => setOk(!!data),
      () => setOk(false),
    );
  }, []);

  useEffect(() => {
    if (!ok) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent)
        return;
      const m = e.data;
      if (!m || m.source !== HERO_STUDIO_SOURCE || m.type !== "set" || !m.slide)
        return;
      setSlide({ ...m.slide, config: sanitizeHeroConfig(m.slide.config) });
      const dark = m.theme === "dark";
      document.documentElement.setAttribute(
        "data-theme",
        dark ? "dark" : "light",
      );
      document.documentElement.style.background = dark ? "#121110" : "#fafaf8";
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage(
      { source: HERO_FRAME_SOURCE, type: "ready" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", onMsg);
  }, [ok]);

  // Rapporte le rectangle réel du cadre hero (le studio y ancre ses poignées CTA).
  useEffect(() => {
    if (!ok || !slide) return;
    const el = document.querySelector(".hero-box");
    const report = () => {
      const box = document.querySelector(".hero-box");
      if (!box) return;
      const r = box.getBoundingClientRect();
      window.parent.postMessage(
        {
          source: HERO_FRAME_SOURCE,
          type: "rect",
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        },
        window.location.origin,
      );
    };
    report();
    const ro = new ResizeObserver(report);
    if (el) ro.observe(el);
    window.addEventListener("resize", report);
    const t = setTimeout(report, 300);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", report);
      clearTimeout(t);
    };
  }, [ok, slide]);

  if (!ok || !slide) return null;
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <HeroCarousel slides={[slide]} loading={false} onSlideAction={() => {}} />
    </div>
  );
}
```

## B3. `src/admin/HeroStudioPage.tsx` (nouveau)

```tsx
// src/admin/HeroStudioPage.tsx — Hero Studio : liste des slides · preview fidèle · inspecteur.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Eye,
  EyeOff,
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon,
  AlertTriangle,
  Info,
  Ruler,
} from "lucide-react";
import { heroPromotionsApi, productApi } from "../api/supabaseApi";
import type { AdminProduct, HeroPromotion } from "./adminTypes";
import AdminImageInput from "./ui/AdminImageInput";
import {
  formInputStyle as inputStyle,
  formLabelStyle as labelStyle,
} from "./adminStyles";
import {
  sanitizeHeroConfig,
  resolveHeroConfig,
  HERO_MAX_CTAS,
  HERO_MAX_LAYERS,
  HERO_MAX_TILES,
  type HeroConfig,
  type HeroCta,
  type HeroLayer,
  type HeroSizing,
} from "../lib/heroSchema";
import { normalizeHeroLink } from "../lib/heroStyle";
import { resolveHeroSlideForPreview } from "../lib/heroResolve";
import {
  HERO_BG_PRESETS,
  HERO_CONFIG_CAP_BYTES,
  HERO_FRAME_SOURCE,
  HERO_PREVIEW_PATH,
  HERO_STUDIO_SOURCE,
  HERO_TEMPLATES,
  heroConfigBytes,
  heroConfigToLegacy,
  heroReservedBottomPx,
  heroStudioWarnings,
  isoToLocalInput,
  localInputToIso,
  moveItem,
  newCta,
  newLayer,
  snapHeroPoint,
} from "../lib/heroStudio";

type DeviceKey = "desktop" | "tablet" | "mobile";
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Draft {
  id: string | null;
  productId: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  config: HeroConfig;
}

const DEVICES: Record<
  DeviceKey,
  { label: string; w: number; h: number; Icon: typeof Monitor }
> = {
  desktop: { label: "Desktop", w: 1280, h: 800, Icon: Monitor },
  tablet: { label: "Tablette", w: 820, h: 1000, Icon: Tablet },
  mobile: { label: "Mobile", w: 390, h: 760, Icon: Smartphone },
};

const panel: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
};
const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};
const btnAccent: React.CSSProperties = {
  ...btn,
  background: "var(--color-accent)",
  color: "#fff",
  border: "none",
};

const toDraft = (p: HeroPromotion): Draft => ({
  id: p.id,
  productId: p.productId || "",
  isActive: p.isActive !== false,
  startsAt: p.startsAt ?? null,
  endsAt: p.endsAt ?? null,
  config: resolveHeroConfig(p),
});
const serialize = (d: Draft) =>
  JSON.stringify({
    p: d.productId,
    a: d.isActive,
    s: d.startsAt,
    e: d.endsAt,
    c: d.config,
  });

// ─── Petits composants ──────────────────────────────────────────────────
function Section({
  title,
  children,
  open = true,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details
      open={open}
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <summary
        style={{
          cursor: "pointer",
          padding: "12px 16px",
          fontWeight: 700,
          fontSize: 13,
          color: "var(--color-ink)",
        }}
      >
        {title}
      </summary>
      <div
        style={{
          padding: "0 16px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {children}
      </div>
    </details>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}
function Seg({
  value,
  options,
  onChange,
}: {
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 3,
        borderRadius: 10,
        background: "var(--color-surface2)",
        border: "1px solid var(--color-border)",
      }}
    >
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          style={{
            flex: 1,
            padding: "6px 8px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
            background: value === v ? "var(--color-accent)" : "transparent",
            color: value === v ? "#fff" : "var(--color-ink2)",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
function Num({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={inputStyle}
    />
  );
}

function measureRatio(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () =>
      resolve(
        im.naturalHeight
          ? Math.round((im.naturalWidth / im.naturalHeight) * 100) / 100
          : null,
      );
    im.onerror = () => resolve(null);
    im.src = src;
  });
}

// ─── Éditeur d'une couche ───────────────────────────────────────────────
function LayerEditor({
  layer,
  onChange,
}: {
  layer: HeroLayer;
  onChange: (l: HeroLayer) => void;
}) {
  if (layer.type === "image") {
    return (
      <>
        <AdminImageInput
          label="Image (vide = image du produit)"
          value={layer.src ?? ""}
          onChange={(u) => onChange({ ...layer, src: u || null })}
          folder="hero"
          placeholder="https://… (lien, import, dépôt, Ctrl+V)"
        />
        <AdminImageInput
          label="Image mobile (optionnel)"
          value={layer.srcMobile ?? ""}
          onChange={(u) => {
            const { srcMobile, ...rest } = layer;
            onChange(u ? { ...rest, srcMobile: u } : rest);
          }}
          folder="hero"
          placeholder="Cadrage différent sur mobile"
        />
        <Field label="Texte alternatif">
          <input
            style={inputStyle}
            value={layer.alt}
            onChange={(e) => onChange({ ...layer, alt: e.target.value })}
          />
        </Field>
        <Field label="Cadrage">
          <Seg
            value={layer.fit}
            options={[
              ["cover", "Remplir"],
              ["contain", "Contenir"],
            ]}
            onChange={(v) =>
              onChange({ ...layer, fit: v as "cover" | "contain" })
            }
          />
        </Field>
        <Field label={`Opacité de l'image : ${Math.round(layer.dim * 100)} %`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={layer.dim}
            onChange={(e) =>
              onChange({ ...layer, dim: Number(e.target.value) })
            }
          />
        </Field>
        <Field label="Voile de lisibilité">
          <Seg
            value={layer.scrim}
            options={[
              ["none", "Aucun"],
              ["left", "Gauche"],
              ["bottom", "Bas"],
            ]}
            onChange={(v) =>
              onChange({ ...layer, scrim: v as "none" | "left" | "bottom" })
            }
          />
        </Field>
      </>
    );
  }
  if (layer.type === "card") {
    return (
      <>
        <AdminImageInput
          label="Visuel (vide = image du produit)"
          value={layer.src ?? ""}
          onChange={(u) => onChange({ ...layer, src: u || null })}
          folder="hero"
          placeholder="https://…"
        />
        <Field label="Côté">
          <Seg
            value={layer.side}
            options={[
              ["left", "Gauche"],
              ["right", "Droite"],
            ]}
            onChange={(v) =>
              onChange({ ...layer, side: v as "left" | "right" })
            }
          />
        </Field>
        <Field label="Texte alternatif">
          <input
            style={inputStyle}
            value={layer.alt}
            onChange={(e) => onChange({ ...layer, alt: e.target.value })}
          />
        </Field>
      </>
    );
  }
  if (layer.type === "tiles") {
    const main = layer.main ?? {
      src: null,
      link: null,
      label: "",
      ctaLabel: "",
      fromProduct: true,
    };
    const setItem = (
      i: number,
      patch: Partial<{ src: string; label: string; link: string | null }>,
    ) =>
      onChange({
        ...layer,
        items: layer.items.map((t, ti) => (ti === i ? { ...t, ...patch } : t)),
      });
    return (
      <>
        <AdminImageInput
          label="Visuel principal (vide = produit)"
          value={main.src ?? ""}
          onChange={(u) =>
            onChange({ ...layer, main: { ...main, src: u || null } })
          }
          folder="hero"
          placeholder="https://…"
        />
        <Field label="Libellé (vide = titre du produit)">
          <input
            style={inputStyle}
            value={main.label}
            onChange={(e) =>
              onChange({ ...layer, main: { ...main, label: e.target.value } })
            }
          />
        </Field>
        <Field label="Bouton">
          <input
            style={inputStyle}
            value={main.ctaLabel}
            onChange={(e) =>
              onChange({
                ...layer,
                main: { ...main, ctaLabel: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Lien (/…, vide = produit)">
          <input
            style={inputStyle}
            value={main.link ?? ""}
            onChange={(e) =>
              onChange({
                ...layer,
                main: { ...main, link: e.target.value || null },
              })
            }
            onBlur={(e) =>
              onChange({
                ...layer,
                main: {
                  ...main,
                  link: normalizeHeroLink(e.target.value) || null,
                },
              })
            }
            placeholder="/promotions"
          />
        </Field>
        <label style={labelStyle}>
          Tuiles ({layer.items.length}/{HERO_MAX_TILES})
        </label>
        {layer.items.map((t, i) => (
          <div
            key={i}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <AdminImageInput
              value={t.src}
              onChange={(u) => setItem(i, { src: u })}
              folder="hero"
              placeholder="Image https://…"
            />
            <input
              style={inputStyle}
              value={t.label}
              placeholder="Libellé"
              onChange={(e) => setItem(i, { label: e.target.value })}
            />
            <input
              style={inputStyle}
              value={t.link ?? ""}
              placeholder="Lien /…"
              onChange={(e) => setItem(i, { link: e.target.value || null })}
              onBlur={(e) =>
                setItem(i, { link: normalizeHeroLink(e.target.value) || null })
              }
            />
            <button
              type="button"
              style={{ ...btn, color: "#ef4444", alignSelf: "flex-start" }}
              onClick={() =>
                onChange({
                  ...layer,
                  items: layer.items.filter((_, ti) => ti !== i),
                })
              }
            >
              <Trash2 size={13} /> Retirer
            </button>
          </div>
        ))}
        {layer.items.length < HERO_MAX_TILES && (
          <button
            type="button"
            style={btn}
            onClick={() =>
              onChange({
                ...layer,
                items: [
                  ...layer.items,
                  {
                    src: "https://placehold.co/400x400",
                    label: "",
                    link: null,
                  },
                ],
              })
            }
          >
            <Plus size={13} /> Ajouter une tuile
          </button>
        )}
      </>
    );
  }
  if (layer.type === "text") {
    return (
      <>
        <Field label="Position">
          <select
            style={inputStyle}
            value={layer.anchor}
            onChange={(e) =>
              onChange({
                ...layer,
                anchor: e.target.value as typeof layer.anchor,
              })
            }
          >
            <option value="left-middle">Gauche, centré</option>
            <option value="center">Centre</option>
            <option value="right-middle">Droite, centré</option>
            <option value="bottom-left">Bas gauche (compact)</option>
          </select>
        </Field>
        <Field label="Couleur du texte">
          <Seg
            value={layer.tone}
            options={[
              ["auto", "Auto"],
              ["light", "Clair"],
              ["dark", "Sombre"],
            ]}
            onChange={(v) =>
              onChange({ ...layer, tone: v as "auto" | "light" | "dark" })
            }
          />
        </Field>
        <Field label="Badge">
          <input
            style={inputStyle}
            value={layer.tag}
            onChange={(e) => onChange({ ...layer, tag: e.target.value })}
            placeholder="Nouveau"
          />
        </Field>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={layer.showTag}
            onChange={(e) => onChange({ ...layer, showTag: e.target.checked })}
          />{" "}
          Afficher le badge
        </label>
        <Field label="Titre (2e ligne = italique)">
          <textarea
            style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
            value={layer.headline}
            onChange={(e) => onChange({ ...layer, headline: e.target.value })}
          />
        </Field>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={layer.headlineLines === "first"}
            onChange={(e) =>
              onChange({
                ...layer,
                headlineLines: e.target.checked ? "first" : "all",
              })
            }
          />{" "}
          Première ligne seulement
        </label>
        <Field label="Sous-titre">
          <input
            style={inputStyle}
            value={layer.sub}
            onChange={(e) => onChange({ ...layer, sub: e.target.value })}
          />
        </Field>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={layer.showSub}
            onChange={(e) => onChange({ ...layer, showSub: e.target.checked })}
          />{" "}
          Afficher le sous-titre
        </label>
        <label
          style={{
            ...labelStyle,
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <input
            type="checkbox"
            checked={layer.fromProduct}
            onChange={(e) =>
              onChange({ ...layer, fromProduct: e.target.checked })
            }
          />{" "}
          Reprendre le produit si vide
        </label>
      </>
    );
  }
  return null;
}

const LAYER_LABEL: Record<string, string> = {
  image: "Image de fond",
  card: "Carte visuelle",
  tiles: "Tuiles",
  text: "Texte",
  html: "HTML",
};

// ─── Page ───────────────────────────────────────────────────────────────
export default function HeroStudioPage() {
  const [slides, setSlides] = useState<HeroPromotion[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState("");
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    document.documentElement.getAttribute("data-theme") === "dark"
      ? "dark"
      : "light",
  );
  const [guides, setGuides] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [layerSel, setLayerSel] = useState(0);
  const [selCta, setSelCta] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [readyTick, setReadyTick] = useState(0);
  const [avail, setAvail] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragId = useRef<string | null>(null);

  const dirty = !!draft && serialize(draft) !== baseline;
  const dev = DEVICES[device];
  const scale = avail ? Math.min(1, (avail - 4) / dev.w) : 1;

  const load = useCallback(async (selectId?: string | null) => {
    const [list, prods] = await Promise.all([
      heroPromotionsApi.list(),
      productApi.list(),
    ]);
    setSlides(list);
    setProducts(prods);
    const target =
      (selectId && list.find((s) => s.id === selectId)) || list[0] || null;
    if (target) {
      const d = toDraft(target);
      setDraft(d);
      setBaseline(serialize(d));
    }
  }, []);

  useEffect(() => {
    load()
      .catch((e) =>
        setMsg({ ok: false, text: e?.message || "Chargement impossible." }),
      )
      .finally(() => setLoading(false));
  }, [load]);

  // Largeur disponible pour l'aperçu.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    setAvail(el.clientWidth);
    return () => ro.disconnect();
  }, [loading]);

  // Garde "modifications non enregistrées" + Ctrl/Cmd+S.
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  });

  // Messages de l'iframe (ready / rect).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (
        e.origin !== window.location.origin ||
        e.source !== frameRef.current?.contentWindow
      )
        return;
      const m = e.data;
      if (!m || m.source !== HERO_FRAME_SOURCE) return;
      if (m.type === "ready") setReadyTick((t) => t + 1);
      if (m.type === "rect" && m.rect) setRect(m.rect as Rect);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  const product = useMemo(
    () => products.find((p) => p.id === draft?.productId) ?? null,
    [products, draft?.productId],
  );
  const resolved = useMemo(
    () =>
      draft
        ? resolveHeroSlideForPreview(
            {
              id: draft.id ?? "preview",
              order: 0,
              productId: draft.productId,
              config: draft.config,
            },
            product,
          )
        : null,
    [draft, product],
  );

  // Envoi de l'état courant à l'aperçu (live, sans passer par la base).
  useEffect(() => {
    if (!resolved) return;
    frameRef.current?.contentWindow?.postMessage(
      { source: HERO_STUDIO_SOURCE, type: "set", slide: resolved, theme },
      window.location.origin,
    );
  }, [resolved, theme, readyTick, device]);

  const patchConfig = (fn: (c: HeroConfig) => HeroConfig) =>
    setDraft((d) => (d ? { ...d, config: fn(d.config) } : d));
  const patchDraft = (p: Partial<Draft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const confirmLeave = () =>
    !dirty || window.confirm("Modifications non enregistrées. Continuer ?");

  const openSlide = (s: HeroPromotion) => {
    if (!confirmLeave()) return;
    const d = toDraft(s);
    setDraft(d);
    setBaseline(serialize(d));
    setLayerSel(0);
    setSelCta(null);
    setMsg(null);
  };

  const startNew = (build: () => HeroConfig) => {
    if (!confirmLeave()) return;
    const d: Draft = {
      id: null,
      productId: "",
      isActive: false,
      startsAt: null,
      endsAt: null,
      config: build(),
    };
    setDraft(d);
    setBaseline("");
    setLayerSel(0);
    setSelCta(null);
    setShowTemplates(false);
    setMsg(null);
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const config = sanitizeHeroConfig({ ...draft.config, origin: "studio" });
      if (heroConfigBytes(config) > HERO_CONFIG_CAP_BYTES)
        throw new Error("Configuration trop lourde (> 20 000 octets).");
      const m = heroConfigToLegacy(config);
      const payload = {
        productId: draft.productId,
        isActive: draft.isActive,
        startsAt: draft.startsAt,
        endsAt: draft.endsAt,
        config,
        // Miroir legacy : le prerender du slide n°1 et les anciennes lectures continuent de marcher.
        kind: m.kind,
        layout: m.layout,
        headline: m.headline,
        sub: m.sub,
        tag: m.tag,
        showTag: m.showTag,
        cta: m.cta,
        linkUrl: m.linkUrl,
        bgGradient: m.bgGradient,
        image: m.image,
        tiles: m.tiles,
      };
      const saved = draft.id
        ? await heroPromotionsApi.update(draft.id, payload)
        : await heroPromotionsApi.create({
            ...payload,
            order: slides.length,
          } as Omit<HeroPromotion, "id">);
      window.dispatchEvent(new Event("storefront:invalidate"));
      await load(saved.id);
      setMsg({
        ok: true,
        text: draft.isActive
          ? "Enregistré — visible en boutique après rechargement."
          : "Brouillon enregistré (non visible en boutique).",
      });
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Enregistrement impossible." });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const remove = async () => {
    if (!draft?.id || !window.confirm("Supprimer ce slide définitivement ?"))
      return;
    try {
      await heroPromotionsApi.delete(draft.id);
      window.dispatchEvent(new Event("storefront:invalidate"));
      setDraft(null);
      setBaseline("");
      await load();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Suppression impossible." });
    }
  };

  const moveSlide = async (i: number, dir: -1 | 1) => {
    const next = moveItem(slides, i, dir);
    if (next === slides) return;
    setSlides(next);
    try {
      await heroPromotionsApi.reorder(next.map((s) => s.id));
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Réordonnancement impossible." });
      await load(draft?.id);
    }
  };

  // ─── CTA : poignées déplaçables sur l'aperçu ───────────────────────────
  const setCtaPoint = (id: string, x: number, y: number) =>
    patchConfig((c) => ({
      ...c,
      ctas: c.ctas.map((cta) =>
        cta.id !== id
          ? cta
          : {
              ...cta,
              pos:
                device === "mobile"
                  ? { desktop: cta.pos?.desktop ?? { x, y }, mobile: { x, y } }
                  : {
                      desktop: { x, y },
                      ...(cta.pos?.mobile ? { mobile: cta.pos.mobile } : {}),
                    },
            },
      ),
    }));
  const onHandleDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    id: string,
  ) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragId.current = id;
    setSelCta(id);
  };
  const onHandleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const id = dragId.current;
    const box = overlayRef.current?.getBoundingClientRect();
    if (!id || !box || !box.width || !box.height) return;
    const x = snapHeroPoint(((e.clientX - box.left) / box.width) * 100);
    const y = snapHeroPoint(((e.clientY - box.top) / box.height) * 100);
    setDrag({ x, y });
    setCtaPoint(id, x, y);
  };
  const onHandleUp = () => {
    dragId.current = null;
    setDrag(null);
  };
  const onHandleKey = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    cta: HeroCta,
  ) => {
    const step = e.shiftKey ? 5 : 1;
    const p =
      device === "mobile"
        ? (cta.pos?.mobile ?? cta.pos?.desktop)
        : cta.pos?.desktop;
    if (!p) return;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const v = d[e.key];
    if (!v) return;
    e.preventDefault();
    setCtaPoint(cta.id, snapHeroPoint(p.x + v[0]), snapHeroPoint(p.y + v[1]));
  };

  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}
      >
        <div
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-accent)",
          }}
        />
      </div>
    );
  }

  const config = draft?.config;
  const warnings =
    draft && config
      ? heroStudioWarnings(config, {
          isFirst:
            slides.findIndex((s) => s.id === draft.id) === 0 ||
            (draft.id === null && slides.length === 0),
          hasProduct: !!draft.productId,
        })
      : [];
  const bytes = config ? heroConfigBytes(config) : 0;
  const layer = config?.layers[layerSel] ?? null;
  const reserved = heroReservedBottomPx(dev.w);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        .hs-grid{display:grid;grid-template-columns:250px minmax(0,1fr) 350px;gap:16px;align-items:start}
        .hs-panel{max-height:calc(100dvh - 170px);overflow-y:auto}
        @media(max-width:1180px){.hs-grid{grid-template-columns:1fr}.hs-panel{max-height:none}}
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)" }}
          >
            Hero Studio
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            Compose le hero de la boutique : couches, dimensions, boutons,
            aperçu desktop et mobile.
          </p>
        </div>
        {draft && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {dirty && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--color-accent)",
                }}
              >
                ● Non enregistré
              </span>
            )}
            <button
              type="button"
              onClick={() => patchDraft({ isActive: !draft.isActive })}
              style={btn}
              title="Visibilité en boutique"
            >
              {draft.isActive ? <Eye size={14} /> : <EyeOff size={14} />}{" "}
              {draft.isActive ? "Visible en boutique" : "Brouillon"}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{ ...btnAccent, opacity: saving ? 0.6 : 1 }}
            >
              <Save size={14} /> {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background: msg.ok ? "var(--color-success-bg)" : "#fee2e2",
            color: msg.ok ? "var(--color-success)" : "#991b1b",
            border: `1px solid ${msg.ok ? "var(--color-border)" : "#fecaca"}`,
          }}
        >
          {msg.text}
        </div>
      )}

      <div className="hs-grid">
        {/* ── Gauche : slides ─────────────────────────────────────────── */}
        <div
          className="hs-panel"
          style={{
            ...panel,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            type="button"
            style={btnAccent}
            onClick={() => setShowTemplates((v) => !v)}
          >
            <Plus size={14} /> Nouveau slide
          </button>
          {showTemplates && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {HERO_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => startNew(t.build)}
                  style={{
                    ...btn,
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                  }}
                >
                  <strong style={{ color: "var(--color-ink)" }}>
                    {t.label}
                  </strong>
                  <span style={{ fontWeight: 400, fontSize: 11 }}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
          )}
          {draft && draft.id === null && (
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1.5px dashed var(--color-accent)",
                fontSize: 12,
                color: "var(--color-ink2)",
              }}
            >
              Nouveau slide (non enregistré)
            </div>
          )}
          {slides.map((s, i) => {
            const sel = draft?.id === s.id;
            const first =
              (s.headline || "").split("\n")[0] || "Slide sans titre";
            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: 8,
                  borderRadius: 12,
                  border: sel
                    ? "2px solid var(--color-accent)"
                    : "1px solid var(--color-border)",
                  background: sel
                    ? "var(--color-accent-bg)"
                    : "var(--color-surface2)",
                  opacity: s.isActive === false ? 0.6 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => openSlide(s)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-ink4)",
                      fontWeight: 700,
                    }}
                  >
                    #{i + 1} ·{" "}
                    {s.isActive === false
                      ? "Brouillon"
                      : s.startsAt || s.endsAt
                        ? "Planifié"
                        : "En ligne"}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--color-ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {first}
                  </div>
                </button>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 2 }}
                >
                  <button
                    type="button"
                    aria-label="Monter"
                    disabled={i === 0}
                    onClick={() => moveSlide(i, -1)}
                    style={{ ...btn, padding: 3 }}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="Descendre"
                    disabled={i === slides.length - 1}
                    onClick={() => moveSlide(i, 1)}
                    style={{ ...btn, padding: 3 }}
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          {slides.length === 0 && !draft && (
            <p style={{ fontSize: 12, color: "var(--color-ink4)" }}>
              Aucun slide. Crée le premier avec un modèle.
            </p>
          )}
        </div>

        {/* ── Centre : aperçu ─────────────────────────────────────────── */}
        <div
          style={{
            ...panel,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {(Object.keys(DEVICES) as DeviceKey[]).map((k) => {
              const { Icon, label } = DEVICES[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDevice(k)}
                  style={{
                    ...btn,
                    background:
                      device === k
                        ? "var(--color-accent)"
                        : "var(--color-surface2)",
                    color: device === k ? "#fff" : "var(--color-ink2)",
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              );
            })}
            <span style={{ flex: 1 }} />
            <button
              type="button"
              style={btn}
              onClick={() =>
                setTheme((t) => (t === "light" ? "dark" : "light"))
              }
              title="Thème de l'aperçu"
            >
              {theme === "light" ? <Sun size={14} /> : <Moon size={14} />}{" "}
              {theme === "light" ? "Clair" : "Sombre"}
            </button>
            <label style={{ ...btn, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={guides}
                onChange={(e) => setGuides(e.target.checked)}
              />{" "}
              Zones réservées
            </label>
          </div>

          <div
            ref={canvasRef}
            style={{
              width: "100%",
              overflow: "hidden",
              background:
                "repeating-conic-gradient(var(--color-surface2) 0% 25%, var(--color-surface) 0% 50%) 0 0 / 20px 20px",
              borderRadius: 12,
              padding: 2,
            }}
          >
            {draft ? (
              <div
                style={{
                  position: "relative",
                  width: dev.w * scale,
                  height: dev.h * scale,
                  margin: "0 auto",
                }}
              >
                <iframe
                  ref={frameRef}
                  src={HERO_PREVIEW_PATH}
                  title="Aperçu du hero"
                  style={{
                    width: dev.w,
                    height: dev.h,
                    transform: `scale(${scale})`,
                    transformOrigin: "0 0",
                    border: 0,
                    background: "var(--color-bg)",
                    pointerEvents: "none",
                  }}
                />
                {rect && (
                  <div
                    ref={overlayRef}
                    style={{
                      position: "absolute",
                      left: rect.x * scale,
                      top: rect.y * scale,
                      width: rect.w * scale,
                      height: rect.h * scale,
                    }}
                  >
                    {guides && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: reserved * scale,
                          background:
                            "repeating-linear-gradient(45deg, rgba(255,92,53,.18) 0 6px, transparent 6px 12px)",
                          borderTop: "1px dashed var(--color-accent)",
                          pointerEvents: "none",
                          fontSize: 10,
                          color: "var(--color-accent)",
                          fontWeight: 700,
                          padding: 2,
                        }}
                      >
                        Contrôles du carrousel
                      </div>
                    )}
                    {drag && drag.x === 50 && (
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: 0,
                          bottom: 0,
                          width: 1,
                          background: "var(--color-accent)",
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    {config?.ctas.map((cta) => {
                      if (!cta.pos) return null;
                      const p =
                        device === "mobile"
                          ? (cta.pos.mobile ?? cta.pos.desktop)
                          : cta.pos.desktop;
                      return (
                        <button
                          key={cta.id}
                          type="button"
                          aria-label={`Déplacer le bouton ${cta.label}`}
                          onPointerDown={(e) => onHandleDown(e, cta.id)}
                          onPointerMove={onHandleMove}
                          onPointerUp={onHandleUp}
                          onKeyDown={(e) => onHandleKey(e, cta)}
                          style={{
                            position: "absolute",
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            transform: "translate(-50%, -50%)",
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            border: "2px solid #fff",
                            background:
                              selCta === cta.id
                                ? "var(--color-accent)"
                                : "rgba(255,92,53,.75)",
                            boxShadow: "0 0 0 2px var(--color-accent)",
                            cursor: "grab",
                            touchAction: "none",
                            zIndex: 5,
                          }}
                        />
                      );
                    })}
                    {drag && (
                      <div
                        style={{
                          position: "absolute",
                          left: 6,
                          top: 6,
                          background: "rgba(0,0,0,.75)",
                          color: "#fff",
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 6,
                          pointerEvents: "none",
                        }}
                      >
                        x {drag.x}% · y {drag.y}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  padding: 60,
                  textAlign: "center",
                  color: "var(--color-ink3)",
                  fontSize: 13,
                }}
              >
                Choisis un slide ou crée-en un avec un modèle.
              </div>
            )}
          </div>

          {warnings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {warnings.map((w, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "flex-start",
                    fontSize: 12,
                    color: w.level === "warn" ? "#92400e" : "var(--color-ink3)",
                  }}
                >
                  {w.level === "warn" ? (
                    <AlertTriangle
                      size={13}
                      style={{ flexShrink: 0, marginTop: 1 }}
                    />
                  ) : (
                    <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  )}
                  {w.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Droite : inspecteur ─────────────────────────────────────── */}
        <div className="hs-panel" style={{ ...panel, padding: 0 }}>
          {!draft || !config ? (
            <p
              style={{ padding: 16, fontSize: 13, color: "var(--color-ink3)" }}
            >
              Sélectionne un slide pour l'éditer.
            </p>
          ) : (
            <>
              {config.origin === "legacy" && (
                <div
                  style={{
                    padding: "10px 16px",
                    fontSize: 12,
                    background: "var(--color-accent-bg)",
                    color: "var(--color-ink2)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  Slide hérité : il sera converti au nouveau format à
                  l'enregistrement.
                </div>
              )}

              <Section title="Slide">
                <Field label="Produit principal">
                  <select
                    style={inputStyle}
                    value={draft.productId}
                    onChange={(e) => patchDraft({ productId: e.target.value })}
                  >
                    <option value="">— Aucun (slide libre) —</option>
                    {products
                      .filter((p) => p.isActive)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Début (optionnel)">
                  <input
                    type="datetime-local"
                    style={inputStyle}
                    value={isoToLocalInput(draft.startsAt)}
                    onChange={(e) =>
                      patchDraft({ startsAt: localInputToIso(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Fin (optionnel)">
                  <input
                    type="datetime-local"
                    style={inputStyle}
                    value={isoToLocalInput(draft.endsAt)}
                    onChange={(e) =>
                      patchDraft({ endsAt: localInputToIso(e.target.value) })
                    }
                  />
                </Field>
              </Section>

              <Section title="Dimensions">
                <Seg
                  value={config.sizing.mode}
                  options={[
                    ["fixed", "Fixe"],
                    ["auto", "Auto"],
                  ]}
                  onChange={(m) =>
                    patchConfig((c) => ({
                      ...c,
                      sizing:
                        m === "auto"
                          ? {
                              mode: "auto",
                              width: c.sizing.width,
                              ratio: { desktop: 2.4, mobile: 0.9 },
                            }
                          : {
                              mode: "fixed",
                              width: c.sizing.width,
                              height: { unit: "vh", value: 78 },
                            },
                    }))
                  }
                />
                <Field label="Largeur">
                  <Seg
                    value={config.sizing.width}
                    options={[
                      ["full", "Pleine"],
                      ["contained", "Contenue"],
                    ]}
                    onChange={(w) =>
                      patchConfig((c) => ({
                        ...c,
                        sizing: {
                          ...c.sizing,
                          width: w as "full" | "contained",
                        } as HeroSizing,
                      }))
                    }
                  />
                </Field>
                {config.sizing.mode === "fixed" ? (
                  <>
                    <Field label="Hauteur desktop">
                      <div style={{ display: "flex", gap: 6 }}>
                        <Num
                          value={config.sizing.height.value}
                          min={config.sizing.height.unit === "vh" ? 30 : 200}
                          max={config.sizing.height.unit === "vh" ? 100 : 1200}
                          onChange={(n) =>
                            patchConfig((c) =>
                              c.sizing.mode === "fixed"
                                ? {
                                    ...c,
                                    sizing: {
                                      ...c.sizing,
                                      height: { ...c.sizing.height, value: n },
                                    },
                                  }
                                : c,
                            )
                          }
                        />
                        <select
                          style={{ ...inputStyle, width: 80 }}
                          value={config.sizing.height.unit}
                          onChange={(e) =>
                            patchConfig((c) =>
                              c.sizing.mode === "fixed"
                                ? {
                                    ...c,
                                    sizing: {
                                      ...c.sizing,
                                      height: {
                                        unit: e.target.value as "vh" | "px",
                                        value:
                                          e.target.value === "vh" ? 78 : 520,
                                      },
                                    },
                                  }
                                : c,
                            )
                          }
                        >
                          <option value="vh">vh</option>
                          <option value="px">px</option>
                        </select>
                      </div>
                    </Field>
                    <label
                      style={{
                        ...labelStyle,
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!config.sizing.heightMobile}
                        onChange={(e) =>
                          patchConfig((c) => {
                            if (c.sizing.mode !== "fixed") return c;
                            const { heightMobile, ...rest } = c.sizing;
                            return {
                              ...c,
                              sizing: e.target.checked
                                ? {
                                    ...rest,
                                    heightMobile: { ...c.sizing.height },
                                  }
                                : rest,
                            };
                          })
                        }
                      />{" "}
                      Hauteur mobile différente
                    </label>
                    {config.sizing.heightMobile && (
                      <Field label="Hauteur mobile">
                        <Num
                          value={config.sizing.heightMobile.value}
                          onChange={(n) =>
                            patchConfig((c) =>
                              c.sizing.mode === "fixed" && c.sizing.heightMobile
                                ? {
                                    ...c,
                                    sizing: {
                                      ...c.sizing,
                                      heightMobile: {
                                        ...c.sizing.heightMobile,
                                        value: n,
                                      },
                                    },
                                  }
                                : c,
                            )
                          }
                        />
                      </Field>
                    )}
                  </>
                ) : (
                  <>
                    <Field label="Ratio desktop (largeur / hauteur)">
                      <Num
                        value={config.sizing.ratio.desktop}
                        min={0.3}
                        max={6}
                        step={0.05}
                        onChange={(n) =>
                          patchConfig((c) =>
                            c.sizing.mode === "auto"
                              ? {
                                  ...c,
                                  sizing: {
                                    ...c.sizing,
                                    ratio: { ...c.sizing.ratio, desktop: n },
                                  },
                                }
                              : c,
                          )
                        }
                      />
                    </Field>
                    <Field label="Ratio mobile">
                      <Num
                        value={config.sizing.ratio.mobile}
                        min={0.3}
                        max={6}
                        step={0.05}
                        onChange={(n) =>
                          patchConfig((c) =>
                            c.sizing.mode === "auto"
                              ? {
                                  ...c,
                                  sizing: {
                                    ...c.sizing,
                                    ratio: { ...c.sizing.ratio, mobile: n },
                                  },
                                }
                              : c,
                          )
                        }
                      />
                    </Field>
                    <button
                      type="button"
                      style={btn}
                      onClick={async () => {
                        const img = config.layers.find(
                          (l) => l.type === "image",
                        ) as Extract<HeroLayer, { type: "image" }> | undefined;
                        const src = img?.src || product?.image || "";
                        const sm = img?.srcMobile || "";
                        if (!src)
                          return setMsg({
                            ok: false,
                            text: "Aucune image à mesurer.",
                          });
                        const [rd, rm] = await Promise.all([
                          measureRatio(src),
                          sm ? measureRatio(sm) : Promise.resolve(null),
                        ]);
                        if (rd == null)
                          return setMsg({
                            ok: false,
                            text: "Mesure impossible (image inaccessible).",
                          });
                        patchConfig((c) =>
                          c.sizing.mode === "auto"
                            ? {
                                ...c,
                                sizing: {
                                  ...c.sizing,
                                  ratio: {
                                    desktop: rd,
                                    mobile: rm ?? c.sizing.ratio.mobile,
                                  },
                                },
                              }
                            : c,
                        );
                      }}
                    >
                      <Ruler size={13} /> Mesurer depuis l'image
                    </button>
                  </>
                )}
              </Section>

              <Section title="Fond">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {HERO_BG_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      title={p.label}
                      onClick={() =>
                        patchConfig((c) => ({
                          ...c,
                          background: { gradient: p.value },
                        }))
                      }
                      style={{
                        width: 40,
                        height: 28,
                        borderRadius: 8,
                        background: p.value,
                        border:
                          config.background.gradient === p.value
                            ? "2px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
                <input
                  style={inputStyle}
                  value={config.background.gradient}
                  onChange={(e) =>
                    patchConfig((c) => ({
                      ...c,
                      background: { gradient: e.target.value },
                    }))
                  }
                  placeholder="Dégradé CSS (avancé)"
                />
              </Section>

              <Section
                title={`Couches (${config.layers.length}/${HERO_MAX_LAYERS})`}
              >
                {config.layers.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 8px",
                      borderRadius: 10,
                      border:
                        layerSel === i
                          ? "2px solid var(--color-accent)"
                          : "1px solid var(--color-border)",
                      background: "var(--color-surface2)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setLayerSel(i)}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "var(--color-ink)",
                      }}
                    >
                      {i + 1}. {LAYER_LABEL[l.type] ?? l.type}
                    </button>
                    <button
                      type="button"
                      aria-label="Monter"
                      style={{ ...btn, padding: 3 }}
                      onClick={() => {
                        patchConfig((c) => ({
                          ...c,
                          layers: moveItem(c.layers, i, -1),
                        }));
                        setLayerSel(Math.max(0, i - 1));
                      }}
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Descendre"
                      style={{ ...btn, padding: 3 }}
                      onClick={() => {
                        patchConfig((c) => ({
                          ...c,
                          layers: moveItem(c.layers, i, 1),
                        }));
                        setLayerSel(Math.min(config.layers.length - 1, i + 1));
                      }}
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      aria-label="Supprimer"
                      style={{ ...btn, padding: 3, color: "#ef4444" }}
                      onClick={() => {
                        patchConfig((c) => ({
                          ...c,
                          layers: c.layers.filter((_, li) => li !== i),
                        }));
                        setLayerSel(0);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {config.layers.length < HERO_MAX_LAYERS && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(["image", "card", "tiles", "text"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        style={btn}
                        onClick={() => {
                          patchConfig((c) => ({
                            ...c,
                            layers: [...c.layers, newLayer(t)],
                          }));
                          setLayerSel(config.layers.length);
                        }}
                      >
                        <Plus size={12} /> {LAYER_LABEL[t]}
                      </button>
                    ))}
                  </div>
                )}
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-ink4)",
                    margin: 0,
                  }}
                >
                  Ordre : la 1re couche est tout au fond. Le texte et les
                  boutons passent toujours au-dessus.
                </p>
                {layer && (
                  <div
                    style={{
                      paddingTop: 8,
                      borderTop: "1px solid var(--color-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <strong
                      style={{ fontSize: 12, color: "var(--color-ink2)" }}
                    >
                      {LAYER_LABEL[layer.type]}
                    </strong>
                    <LayerEditor
                      layer={layer}
                      onChange={(nl) =>
                        patchConfig((c) => ({
                          ...c,
                          layers: c.layers.map((x, i) =>
                            i === layerSel ? nl : x,
                          ),
                        }))
                      }
                    />
                  </div>
                )}
              </Section>

              <Section
                title={`Boutons (${config.ctas.length}/${HERO_MAX_CTAS})`}
              >
                {config.ctas.map((cta) => {
                  const setCta = (p: Partial<HeroCta>) =>
                    patchConfig((c) => ({
                      ...c,
                      ctas: c.ctas.map((x) =>
                        x.id === cta.id ? { ...x, ...p } : x,
                      ),
                    }));
                  return (
                    <div
                      key={cta.id}
                      onClick={() => setSelCta(cta.id)}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border:
                          selCta === cta.id
                            ? "2px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <input
                        style={inputStyle}
                        value={cta.label}
                        onChange={(e) => setCta({ label: e.target.value })}
                        placeholder="Texte du bouton"
                      />
                      <input
                        style={inputStyle}
                        value={cta.link ?? ""}
                        onChange={(e) =>
                          setCta({ link: e.target.value || null })
                        }
                        onBlur={(e) =>
                          setCta({
                            link: normalizeHeroLink(e.target.value) || null,
                          })
                        }
                        placeholder="/promotions (vide = fiche produit)"
                      />
                      <Seg
                        value={cta.style}
                        options={[
                          ["accent", "Accent"],
                          ["light", "Clair"],
                          ["dark", "Sombre"],
                          ["ghost", "Contour"],
                        ]}
                        onChange={(v) =>
                          setCta({ style: v as HeroCta["style"] })
                        }
                      />
                      <Seg
                        value={cta.pos ? "free" : "inline"}
                        options={[
                          ["inline", "Sous le texte"],
                          ["free", "Position libre"],
                        ]}
                        onChange={(v) =>
                          setCta({
                            pos:
                              v === "free"
                                ? { desktop: { x: 50, y: 70 } }
                                : null,
                          })
                        }
                      />
                      {cta.pos && (
                        <>
                          <p
                            style={{
                              fontSize: 11,
                              color: "var(--color-ink4)",
                              margin: 0,
                            }}
                          >
                            Glisse la pastille orange sur l'aperçu (flèches
                            clavier : 1 %, Maj : 5 %). En mode Mobile, tu règles
                            la position mobile.
                          </p>
                          <label
                            style={{
                              ...labelStyle,
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={!!cta.pos.mobile}
                              onChange={(e) =>
                                setCta({
                                  pos: e.target.checked
                                    ? {
                                        desktop: cta.pos!.desktop,
                                        mobile: { ...cta.pos!.desktop },
                                      }
                                    : { desktop: cta.pos!.desktop },
                                })
                              }
                            />{" "}
                            Position mobile différente
                          </label>
                        </>
                      )}
                      <button
                        type="button"
                        style={{
                          ...btn,
                          color: "#ef4444",
                          alignSelf: "flex-start",
                        }}
                        onClick={() =>
                          patchConfig((c) => ({
                            ...c,
                            ctas: c.ctas.filter((x) => x.id !== cta.id),
                          }))
                        }
                      >
                        <Trash2 size={13} /> Retirer
                      </button>
                    </div>
                  );
                })}
                {config.ctas.length < HERO_MAX_CTAS && (
                  <button
                    type="button"
                    style={btn}
                    onClick={() =>
                      patchConfig((c) => ({
                        ...c,
                        ctas: [...c.ctas, newCta()],
                      }))
                    }
                  >
                    <Plus size={13} /> Ajouter un bouton
                  </button>
                )}
              </Section>

              <Section title="Contrôle qualité" open={false}>
                <div style={{ fontSize: 12, color: "var(--color-ink2)" }}>
                  Configuration : <strong>{bytes}</strong> /{" "}
                  {HERO_CONFIG_CAP_BYTES} octets
                  <div
                    style={{
                      height: 6,
                      borderRadius: 99,
                      background: "var(--color-surface2)",
                      marginTop: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, (bytes / HERO_CONFIG_CAP_BYTES) * 100)}%`,
                        height: "100%",
                        background:
                          bytes > HERO_CONFIG_CAP_BYTES
                            ? "#ef4444"
                            : bytes > HERO_CONFIG_CAP_BYTES * 0.75
                              ? "#d97706"
                              : "var(--color-success)",
                      }}
                    />
                  </div>
                </div>
              </Section>

              {draft.id && (
                <div style={{ padding: 16 }}>
                  <button
                    type="button"
                    style={{ ...btn, color: "#ef4444" }}
                    onClick={remove}
                  >
                    <Trash2 size={13} /> Supprimer ce slide
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

## B4. `src/main.tsx` : remplacement complet (fichier court)

```tsx
// src\main.tsx
try {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
} catch {}

import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Page d'aperçu du Hero Studio (iframe admin) : monte UNIQUEMENT ce composant,
// jamais l'App complète. La garde admin est dans le composant lui-même.
const HeroPreviewFrame = lazy(() => import("./admin/HeroPreviewFrame.tsx"));
const isHeroPreview = window.location.pathname === "/admin/hero-preview";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isHeroPreview ? (
      <Suspense fallback={null}>
        <HeroPreviewFrame />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
```

## B5. Entrée de menu : 2 fichiers

**`src/admin/AdminSidebar.tsx`** (frontend), 3 petites modifications :

1. Dans l'import `lucide-react`, juste après la ligne `  Wallet,` (suivie de `} from "lucide-react";`), ajoute :

```tsx
  LayoutTemplate,
```

2. Dans le type `AdminSection`, remplace les deux lignes `  | "reviews"` puis `  | "help";` par :

```tsx
  | "reviews"
  | "hero-studio"
  | "help";
```

3. Dans le groupe `marketing`, juste après la ligne `{ id: "promotions", label: "Promotions & Deals", icon: Tag },`, ajoute :

```tsx
      { id: "hero-studio", label: "Hero Studio", icon: LayoutTemplate },
```

**`src/admin/AdminDashboardNew.tsx`** (frontend), 2 petites modifications :

1. Juste après la ligne `import MerchandisingPage from "./MerchandisingPage";`, ajoute :

```tsx
import HeroStudioPage from "./HeroStudioPage";
```

2. Juste après la ligne `{section === "merchandising" && <MerchandisingPage />}`, ajoute :

```tsx
{
  section === "hero-studio" && <HeroStudioPage />;
}
```

Les titres du fil d'Ariane suivent automatiquement (`NAV_LABELS` dérive de `NAV_GROUPS`).

---

# Partie C. Tests : nouveau fichier

```ts
// tests/hero-lot2.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveHeroSlides,
  parseLeadHero,
  nextHeroScheduleChange,
} from "../src/lib/heroResolve.ts";
import {
  isLightHeroBg,
  heroBackground,
  normalizeHeroLink,
} from "../src/lib/heroStyle.ts";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import {
  HERO_TEMPLATES,
  heroConfigToLegacy,
  heroStudioWarnings,
  snapHeroPoint,
  moveItem,
  isoToLocalInput,
  localInputToIso,
} from "../src/lib/heroStudio.ts";

const IMG = "https://cdn.example.com/a.webp";
const P = [
  { id: "p1", title: "Tee", description: "d", image: IMG, isActive: true },
  { id: "p2", title: "Off", image: IMG, isActive: false },
];
const promo = (o: Record<string, unknown>) =>
  ({
    id: "s1",
    order: 0,
    isActive: true,
    productId: "p1",
    kind: "product",
    layout: "full",
    headline: "",
    ...o,
  }) as any;

test("resolve : tri order puis id, produit actif requis", () => {
  const r = resolveHeroSlides(
    [
      promo({ id: "b", order: 1 }),
      promo({ id: "a", order: 1 }),
      promo({ id: "c", order: 0 }),
    ],
    P,
  );
  assert.deepEqual(
    r.map((s) => s.id),
    ["c", "a", "b"],
  );
  assert.equal(resolveHeroSlides([promo({ productId: "p2" })], P).length, 0);
  assert.equal(resolveHeroSlides([promo({ productId: "nope" })], P).length, 0);
  assert.equal(resolveHeroSlides([promo({ isActive: false })], P).length, 0);
});

test("resolve : sans produit = studio + visuel propre uniquement", () => {
  const legacyNoProduct = promo({ productId: "", image: IMG });
  assert.equal(resolveHeroSlides([legacyNoProduct], P).length, 0);
  const studio = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ type: "image", src: IMG }],
  });
  const empty = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ type: "text" }],
  });
  assert.equal(
    resolveHeroSlides([promo({ productId: "", config: studio })], P).length,
    1,
  );
  assert.equal(
    resolveHeroSlides([promo({ productId: "", config: empty })], P).length,
    0,
  );
});

test("resolve : planification [starts, ends[", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  const f = (s: string | null, e: string | null) =>
    resolveHeroSlides([promo({ startsAt: s, endsAt: e })], P, now).length;
  assert.equal(f(null, null), 1);
  assert.equal(f("2026-11-28T00:00:00Z", null), 0);
  assert.equal(f(null, "2026-11-27T12:00:00Z"), 0);
  assert.equal(
    nextHeroScheduleChange([promo({ startsAt: "2026-11-28T00:00:00Z" })], now),
    Date.parse("2026-11-28T00:00:00Z"),
  );
  assert.equal(nextHeroScheduleChange([promo({})], now), null);
});

test("resolve : lightBg seulement sans image plein cadre + fond clair", () => {
  const light =
    "linear-gradient(135deg, #faf7f0 0%, #f3ece0 60%, #faf7f0 100%)";
  const split = resolveHeroSlides(
    [promo({ layout: "split", bgGradient: light })],
    P,
  )[0];
  const full = resolveHeroSlides(
    [promo({ layout: "full", bgGradient: light })],
    P,
  )[0];
  assert.equal(split.lightBg, true);
  assert.equal(full.lightBg, false);
});

test("lead : format legacy résolu → slide ; invalide → null", () => {
  const s = parseLeadHero({
    image: IMG,
    headline: "Hi",
    sub: "s",
    cta: "Go",
    productId: "p1",
    kind: "product",
    layout: "full",
  });
  assert.ok(s);
  assert.equal(s!.productId, "p1");
  assert.equal(s!.config.layers[0].type, "image");
  assert.equal(parseLeadHero({ headline: "x" }), null);
  assert.equal(parseLeadHero(null), null);
});

test("heroStyle : compat des 4 helpers historiques", () => {
  assert.equal(isLightHeroBg("#FAF7F0"), true);
  assert.equal(isLightHeroBg(undefined), false);
  assert.match(heroBackground("from-white via-x"), /linear-gradient/);
  assert.equal(heroBackground("#fff"), "#fff");
  assert.equal(
    normalizeHeroLink("https://instawear.vercel.app/faq?x=1"),
    "/faq?x=1",
  );
  assert.equal(normalizeHeroLink("https://evil.com"), "");
});

test("studio : chaque modèle donne une config valide, origin studio, miroir legacy cohérent", () => {
  for (const t of HERO_TEMPLATES) {
    const c = t.build();
    assert.equal(c.origin, "studio");
    assert.deepEqual(sanitizeHeroConfig(c), c);
  }
  const grid = HERO_TEMPLATES.find((t) => t.id === "grid")!.build();
  assert.equal(heroConfigToLegacy(grid).kind, "grid");
  const split = HERO_TEMPLATES.find((t) => t.id === "split")!.build();
  const m = heroConfigToLegacy(split);
  assert.equal(m.kind, "product");
  assert.equal(m.layout, "split");
  assert.equal(
    heroConfigToLegacy(HERO_TEMPLATES.find((t) => t.id === "banner")!.build())
      .kind,
    "image",
  );
});

test("studio : avertissements", () => {
  const blank = HERO_TEMPLATES.find((t) => t.id === "blank")!.build();
  const w = heroStudioWarnings(blank, { isFirst: true, hasProduct: false });
  assert.ok(w.some((x) => x.level === "warn" && /visuel/i.test(x.text)));
  assert.ok(w.some((x) => /n°1/.test(x.text)));
  assert.equal(
    heroStudioWarnings(sanitizeHeroConfig({}), {
      isFirst: false,
      hasProduct: false,
    })[0].level,
    "warn",
  );
});

test("studio : utilitaires", () => {
  assert.equal(snapHeroPoint(49.2), 50);
  assert.equal(snapHeroPoint(12.34), 12.5);
  assert.equal(snapHeroPoint(-5), 0);
  assert.equal(snapHeroPoint(140), 100);
  assert.deepEqual(moveItem([1, 2, 3], 0, 1), [2, 1, 3]);
  const same = [1, 2];
  assert.equal(moveItem(same, 0, -1), same);
  assert.equal(localInputToIso(""), null);
  assert.equal(isoToLocalInput(null), "");
  const iso = "2026-11-27T10:30:00.000Z";
  assert.equal(localInputToIso(isoToLocalInput(iso)), iso);
});
```

---

# Vérifications à faire

1. `npm run lint` puis `npm test`. Si un test garde cherche des chaînes dans l'ancien `HeroCarousel.tsx` (`fetchPriority="high"`, par exemple), elles vivent désormais dans `HeroSlideView.tsx` : colle-moi l'échec et j'adapte le test.
2. **Boutique** : avant et après, tes 5 slides doivent être visuellement équivalents. Les écarts connus sont :
   - le libellé du slide « grille » reprend le titre du produit seul (avant : titre + description) ;
   - le bouton du slide « image » est positionné en `x:96 / y:82` au lieu d'être dans le flux.
3. **LCP** : compare la même page d'accueil avant et après sur Lighthouse mobile. Les URLs d'images du slide n°1 sont identiques, donc le résultat devrait être inchangé.
4. **Studio** : menu Marketing → Hero Studio. Ouvre un slide, bascule en Mobile, déplace un bouton « Position libre », enregistre, recharge la boutique.
5. Préviens-moi si l'iframe d'aperçu reste vide. Ce serait le rewrite Vercel / `server.ts` qui ne couvre pas `/admin/hero-preview`.

---

# Ce que je retiens de tes maquettes

Je les ai lues en structure et en texte (je ne peux pas les rendre en pixels ici) et je m'en suis inspiré pour :

- la **mise en page 3 zones** (slides / aperçu / inspecteur) ;
- le **sélecteur Desktop · Tablette · Mobile** ;
- le **toggle thème** de l'aperçu ;
- les **poignées de bouton déplaçables**, avec lecture `x / y` et aimantation au centre ;
- le panneau **Couches** avec réordonnancement ;
- l'interrupteur **Fixe / Auto** ;
- la **jauge de poids**.

Le style reste celui de ton admin (variables CSS, donc clair ou sombre automatiquement). Ton orange `#FF6B21` est très proche de ton accent `#ff5c35`.

Ce que je n'ai pas repris, volontairement :

| Maquette                                         | Décision                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| Image Shopify                                    | Tes produits viennent de Supabase/Printful                                      |
| Détourage IA, marquee, hotspots, preuve sociale  | Hors périmètre                                                                  |
| Templates Bento / Masonry / Asym                 | Ce seraient des préréglages de la couche « Tuiles », à ajouter plus tard        |
| Google Fonts en `@import`                        | Mauvais pour le LCP                                                             |
| Onglets Tablet distincts                         | La tablette est un simple aperçu à 820 px, avec les règles desktop              |
| Verrou / œil / « masquer sur mobile » par couche | Demande d'ajouter des champs au schéma                                          |
| Timeline (durée par slide, transition)           | Demande d'ajouter `durationMs` et `transition` au schéma, en changement additif |

**Question :** veux-tu la durée et la transition par slide (comme la timeline de la maquette) ? C'est un petit ajout au schéma, sans migration SQL, puisque tout est dans le jsonb `config`.

Ensuite : lot 4 (HTML collé, Shadow DOM, plafond 50 Ko, `super_admin`), puis lot 5 (propagation live + Deploy Hook).
