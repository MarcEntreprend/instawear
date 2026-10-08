// src/components/HeroSlideView.tsx — rendu UNIFIÉ d'un slide hero.
// Lit la composition (config, lot 1) avec replis legacy cuits : pour
// origin "legacy", chaque valeur affichée est identique au rendu historique
// (mêmes branches kind/layout, mêmes classes, mêmes fallbacks). Les chemins
// neufs (CTA positionnés, ancres non left-middle, <picture> mobile) ne
// s'activent que pour origin "studio" — inexistant tant que l'éditeur
// n'existe pas (lot 3). La couche "html" rend vide jusqu'au lot 4.
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { supabaseImageUrl } from "../lib/supabaseImage";
import { heroBackground, isLightHeroBg } from "./HeroCarousel";
import type {
  HeroConfig,
  HeroCta,
  HeroTextLayer,
} from "../lib/heroSchema";
import type { HeroSlideData } from "../lib/heroSelect";

/** Classe + style par style de CTA (seul "accent" existe en legacy). */
export function heroCtaClass(style: HeroCta["style"]): {
  className: string;
  extra?: React.CSSProperties;
} {
  switch (style) {
    case "ghost":
      return { className: "btn btn-ghost" };
    case "light":
      return {
        className: "btn btn-ghost",
        extra: { background: "#fff", color: "#111", borderColor: "#fff" },
      };
    case "dark":
      return {
        className: "btn btn-ghost",
        extra: { background: "#111", color: "#fff", borderColor: "#111" },
      };
    case "accent":
    default:
      return { className: "btn btn-accent" };
  }
}

/** Encre sombre ? (texte sombre sur fond clair). Règle historique :
 *  split + fond clair => adaptatif, sauf tone explicite (studio). */
export function heroTextDark(slide: HeroSlideData): boolean {
  const tone =
    slide.config.layers.find((l) => l.type === "text") &&
    (slide.config.layers.find((l) => l.type === "text") as HeroTextLayer).tone;
  if (tone === "dark") return true;
  if (tone === "light") return false;
  return slide.layout === "split" && isLightHeroBg(slide.bgGradient);
}

/** Indices à monter : l'actif + le suivant (pré-chargement invisible).
 *  Les autres slides gardent leur conteneur (fond + transition) sans contenu. */
export function heroVisibleIndices(index: number, length: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  return [index % length, (index + 1) % length];
}

// ─── Image responsive (variantes = miroir des appels historiques) ────────
type HeroImgVariant = "visual" | "tile" | "raw";

function transformHeroSrc(
  src: string | null,
  variant: HeroImgVariant,
): string | null {
  if (!src) return null;
  if (variant === "raw") return src;
  if (src === PLACEHOLDER_IMG) return null;
  return variant === "tile"
    ? supabaseImageUrl(src, { width: 400, quality: 70 })
    : supabaseImageUrl(src, { width: 1280, quality: 75 });
}

function HeroImg({
  src,
  mobileSrc,
  alt,
  className,
  style,
  eager,
  variant,
  onError,
}: {
  src: string | null;
  mobileSrc?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  eager: boolean;
  variant: HeroImgVariant;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}) {
  const desktop = transformHeroSrc(src, variant);
  if (!desktop) return null;
  const mobile = mobileSrc ? transformHeroSrc(mobileSrc, variant) : null;
  const img = (
    <img
      src={desktop}
      alt={alt}
      className={className}
      style={style}
      onError={onError}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
    />
  );
  if (!mobile) return img;
  return (
    <picture>
      <source media="(max-width: 640px)" srcSet={mobile} />
      {img}
    </picture>
  );
}

// ─── Slide ───────────────────────────────────────────────────────────────
interface HeroSlideViewProps {
  slide: HeroSlideData;
  eager: boolean;
  onAction: (slide: HeroSlideData) => void;
  onLink: (link: string) => void;
  /** Slide d'amorçage lead : toute erreur image invalide le lead (swap). */
  leadMode?: boolean;
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export default function HeroSlideView({
  slide: b,
  eager,
  onAction,
  onLink,
  leadMode = false,
  onImageError,
}: HeroSlideViewProps) {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const fn = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const cfg: HeroConfig = b.config;
  const isStudio = cfg.origin === "studio";
  const kind = b.kind;
  const split = b.layout === "split";
  const product = b.product;

  const imageLayer = cfg.layers.find((l) => l.type === "image") as
    | { src: string | null; srcMobile?: string; dim: number; scrim: string }
    | undefined;
  const cardLayer = cfg.layers.find((l) => l.type === "card") as
    | {
        side: "left" | "right";
        src: string | null;
        srcMobile?: string;
        productId: string | null;
      }
    | undefined;
  const tilesLayer = cfg.layers.find((l) => l.type === "tiles") as
    | {
        main: {
          src: string | null;
          link: string | null;
          label: string;
          ctaLabel: string;
        } | null;
        items: Array<{ src: string; label: string; link: string | null }>;
      }
    | undefined;
  const textLayer = cfg.layers.find((l) => l.type === "text") as
    | HeroTextLayer
    | undefined;

  // Source visuelle principale (règle historique : image slide, sinon
  // produit, jamais de placeholder transformé).
  const mainSrc =
    imageLayer?.src || cardLayer?.src || product?.image || null;
  const fireLink = (link?: string | null): boolean => {
    if (link && onLink) {
      onLink(link);
      return true;
    }
    return false;
  };

  // Encre du bloc texte (règle historique + tone explicite, partagée
  // avec la coquille du carrousel via heroTextDark).
  const darkText = heroTextDark(b);
  const ink = darkText ? "var(--color-ink)" : "#fff";
  const inkSoft = darkText ? "var(--color-ink2)" : "rgba(255,255,255,.8)";
  const chipBg = darkText ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.14)";

  const headline = textLayer?.headline || b.headline;
  const sub = textLayer?.sub || b.sub;
  const showSub = !isStudio ? true : textLayer?.showSub !== false;
  const tag = textLayer?.tag || b.tag;
  const showTag = (textLayer ? textLayer.showTag !== false : true) && b.showTag;
  const inlineCtas = cfg.ctas.filter((c) => !isStudio || c.pos === null);
  const placedCtas = isStudio
    ? cfg.ctas.filter(
        (c): c is HeroCta & { pos: NonNullable<HeroCta["pos"]> } =>
          c.pos !== null,
      )
    : [];

  // Titre effectif kind image (historique : headline, sinon titre slide).
  const imageHeadline =
    kind === "image" ? headline || b.title || "" : headline;

  return (
    <div
      className="absolute inset-0"
      style={{
        background: heroBackground(b.bgGradient),
      }}
      data-hero-slide={b.id}
    >
      {kind === "grid" && tilesLayer ? (
        <div className="absolute inset-0 flex flex-col sm:flex-row gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24">
          {transformHeroSrc(
            tilesLayer.main?.src || product?.image || b.image,
            "visual",
          ) && (
            <button
              type="button"
              onClick={() => {
                if (!fireLink(tilesLayer.main?.link || b.linkUrl))
                  onAction(b);
              }}
              className="relative flex-1 min-h-0 rounded-2xl overflow-hidden text-left"
              style={{ boxShadow: "var(--shadow-xl)" }}
              aria-label={
                b.headline || b.cta ? undefined : b.title || "Voir"
              }
            >
              <HeroImg
                src={tilesLayer.main?.src || product?.image || b.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                eager={eager}
                variant="visual"
              />
              {(b.headline || b.cta) && (
                <span className="absolute left-3 bottom-3 right-3 flex items-end justify-between gap-2">
                  <span className="text-white font-extrabold text-lg leading-tight drop-shadow">
                    {[b.headline.split("\n")[0], b.sub]
                      .filter(Boolean)
                      .join(" — ")
                      .slice(0, 60)}
                  </span>
                  {b.cta && (
                    <span className="btn btn-accent shrink-0 !py-2 !px-4 text-xs">
                      {b.cta}
                    </span>
                  )}
                </span>
              )}
            </button>
          )}
          <div className="flex sm:flex-col gap-3 sm:w-[30%] shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar">
            {(tilesLayer.items ?? []).slice(0, 3).map((t, ti) => (
              <button
                key={ti}
                type="button"
                onClick={() => {
                  if (!fireLink(t.link || b.linkUrl)) onAction(b);
                }}
                className="relative flex-1 min-w-[38vw] sm:min-w-0 sm:min-h-0 rounded-2xl overflow-hidden text-left"
                style={{ boxShadow: "var(--shadow-lg)" }}
                aria-label={t.label || `Voir ${ti + 1}`}
              >
                <HeroImg
                  src={t.src}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  eager={false}
                  variant="tile"
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
      ) : kind === "image" ? (
        <>
          <HeroImg
            src={mainSrc || b.image}
            mobileSrc={imageLayer?.srcMobile}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            eager={eager}
            variant="visual"
          />
          <div
            className="absolute inset-x-0 bottom-0 pt-16 pb-8 px-5 sm:px-8"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(10,9,7,.55))",
            }}
          >
            <div className="max-w-350 mx-auto flex items-end justify-between gap-4">
              <div className="min-w-0">
                {showTag && tag && (
                  <span
                    className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.16em]"
                    style={{
                      background: "rgba(255,255,255,.14)",
                      color: "#fff",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    {tag}
                  </span>
                )}
                {!!imageHeadline && (
                  <div className="text-white font-extrabold text-xl sm:text-2xl leading-tight drop-shadow">
                    {imageHeadline.split("\n")[0]}
                  </div>
                )}
              </div>
              {!isStudio &&
                b.cta &&
                (() => {
                  const s = heroCtaClass(
                    inlineCtas[0]?.style ?? "accent",
                  );
                  return (
                    <button
                      onClick={() => onAction(b)}
                      className={`${s.className} shrink-0`}
                      style={s.extra}
                    >
                      {inlineCtas[0]?.label || b.cta} <ArrowRight size={16} />
                    </button>
                  );
                })()}
            </div>
          </div>
        </>
      ) : split ? (
        (transformHeroSrc(cardLayer?.src || product?.image || b.image, "visual") ||
          null) && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-[34vw] sm:w-[38vw] max-w-105 ${
              cardLayer?.side === "left"
                ? "left-4 sm:left-8"
                : "right-4 sm:right-8"
            }`}
          >
            <HeroImg
              src={cardLayer?.src || product?.image || b.image}
              mobileSrc={cardLayer?.srcMobile}
              alt=""
              className="w-full aspect-[4/5] max-h-[60vh] object-cover rounded-2xl"
              style={{ boxShadow: "var(--shadow-xl)" }}
              eager={eager}
              variant="visual"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
                if (leadMode) onImageError?.(e);
              }}
            />
          </div>
        )
      ) : (
        <>
          <HeroImg
            src={b.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: imageLayer && imageLayer.dim < 1 ? imageLayer.dim : 0.55 }}
            eager={eager}
            variant="raw"
            onError={(e) => {
              if (leadMode) onImageError?.(e);
              else
                (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(15,13,10,.68) 0%, rgba(15,13,10,.28) 55%, transparent 100%)",
            }}
          />
        </>
      )}

      {/* Bloc texte partagé (kinds product) + CTA inline historiques. */}
      {(kind === "product" || (isStudio && textLayer)) &&
        (!textLayer || textLayer.anchor === "left-middle") && (
          <div className="absolute inset-0 z-10">
            <div className="h-full max-w-350 mx-auto px-5 sm:px-8 flex flex-col justify-between py-8 sm:py-12">
              <div />
              <div className={split ? "max-w-[62%] sm:max-w-xl" : "max-w-xl"}>
              {showTag && tag && (
                <span
                  className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] animate-fade-up"
                  style={{
                    background: chipBg,
                    color: darkText
                      ? "var(--color-accent-strong, #c2452a)"
                      : "#fff",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {tag}
                </span>
              )}
              <h1
                key={headline}
                className="font-extrabold leading-[0.95] tracking-tight mb-5 animate-fade-up"
                style={{
                  color: ink,
                  fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                  animationDelay: "80ms",
                }}
              >
                {(textLayer && textLayer.headlineLines === "first"
                  ? [headline.split("\n")[0]]
                  : headline.split("\n")
                ).map((line, i) => (
                  <span key={i} className="block">
                    {i === 1 ? (
                      <em className="font-display not-italic sm:italic pb-1 inline-block">
                        {line}
                      </em>
                    ) : (
                      line
                    )}
                  </span>
                ))}
              </h1>
              {showSub && (
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
              {inlineCtas.length > 0 &&
                (() => {
                  const c = inlineCtas[0];
                  const s = heroCtaClass(c.style);
                  return (
                    <button
                      onClick={() => {
                        if (!fireLink(c.link)) onAction(b);
                      }}
                      className={`${s.className} animate-fade-up`}
                      style={{ animationDelay: "240ms", ...s.extra }}
                    >
                      {c.label || b.cta} <ArrowRight size={16} />
                    </button>
                  );
                })()}
              </div>
              {/* Réserve basse = hauteur du bouton scroll de la coquille
               *  (h-11) : même distribution justify-between qu'avant. */}
              <div className="h-11" aria-hidden="true" />
            </div>
          </div>
        )}

      {/* Ancre non left-middle (studio uniquement) : bloc texte en overlay. */}
      {isStudio && textLayer && textLayer.anchor !== "left-middle" && (
        <div
          className={`absolute inset-0 z-10 flex p-5 sm:p-8 ${
            textLayer.anchor === "center"
              ? "items-center justify-center text-center"
              : textLayer.anchor === "right-middle"
                ? "items-center justify-end text-right"
                : "items-end justify-start"
          }`}
        >
          <div className="max-w-xl">
            {showTag && tag && (
              <span
                className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.16em]"
                style={{ background: chipBg, color: ink }}
              >
                {tag}
              </span>
            )}
            <div
              className="font-extrabold leading-[0.95] tracking-tight mb-3"
              style={{ color: ink, fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              {textLayer.headlineLines === "first"
                ? headline.split("\n")[0]
                : headline}
            </div>
            {showSub && sub && (
              <p className="text-sm sm:text-base" style={{ color: inkSoft }}>
                {sub}
              </p>
            )}
          </div>
        </div>
      )}

      {/* CTA positionnés (studio uniquement) : jamais de débordement. */}
      {placedCtas.map((c) => {
        const s = heroCtaClass(c.style);
        const pt = (isMobile ? c.pos.mobile : undefined) ?? c.pos.desktop;
        return (
          <button
            key={c.id}
            onClick={() => {
              if (!fireLink(c.link)) onAction(b);
            }}
            className={`${s.className} absolute z-20`}
            style={{
              left: `${pt.x}%`,
              top: `${pt.y}%`,
              transform: `translate(-${pt.x}%, -${pt.y}%)`,
              ...s.extra,
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
