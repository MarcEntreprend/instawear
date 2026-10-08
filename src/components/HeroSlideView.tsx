// src/components/HeroSlideView.tsx — rendu UNIFIÉ d'un slide hero.
// Lit la composition (config, lot 1) avec replis legacy cuits : pour
// origin "legacy", chaque valeur affichée est identique au rendu historique
// (mêmes branches kind/layout, mêmes classes, mêmes fallbacks). Les chemins
// neufs (CTA positionnés, ancres non left-middle, <picture> mobile) ne
// s'activent que pour origin "studio" — inexistant tant que l'éditeur
// n'existe pas (lot 3). La couche "html" rend vide jusqu'au lot 4.
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import HeroHtml from "./HeroHtml";
import HeroCountdown from "./HeroCountdown";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { supabaseImageUrl } from "../lib/supabaseImage";
import { heroBackground, isLightHeroBg } from "./HeroCarousel";
import type {
  HeroConfig,
  HeroCta,
  HeroHidden,
  HeroMarqueeLayer,
  HeroTextLayer,
} from "../lib/heroSchema";
import { heroEffectiveFont, isHeroHidden } from "../lib/heroSchema";
import { heroFontStack } from "../lib/heroFonts";
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
    case "hotspot":
      return { className: "hero-hotspot" };
    case "accent":
    default:
      return { className: "btn btn-accent" };
  }
}

/** Styles typo fine (02) : appliqués seulement si définis (legacy intact). */
function typoTitleStyle(
  t: HeroTextLayer | undefined,
  base: React.CSSProperties,
  cfgFont: { fontFamily?: string },
): React.CSSProperties {
  if (!t) return base;
  const out: React.CSSProperties & { textWrap?: string } = { ...base };
  if (t.lineHeight !== undefined) out.lineHeight = t.lineHeight;
  if (t.letterSpacing !== undefined)
    out.letterSpacing = `${t.letterSpacing}em`;
  if (t.transform && t.transform !== "none")
    out.textTransform = t.transform;
  if (t.balance === true) out.textWrap = "balance";
  // Police effective (02) : bloc > globale sauf verrou > défaut navigateur.
  const eff = heroEffectiveFont(cfgFont, t);
  if (eff) out.fontFamily = heroFontStack(eff);
  if (t.fontWeight !== undefined) out.fontWeight = t.fontWeight;
  return out;
}

function typoWrapStyle(
  t: HeroTextLayer | undefined,
): React.CSSProperties | undefined {
  if (!t) return undefined;
  const out: React.CSSProperties = {};
  if (t.align) out.textAlign = t.align;
  if (t.maxWidth) out.maxWidth = t.maxWidth;
  return Object.keys(out).length > 0 ? out : undefined;
}
/** Pastille hotspot (lot 15) : point d'intérêt pulsant, label en
 *  aria-label + title (pas de texte visible). Même cible que le CTA. */
function HotspotDot({
  label,
  onClick,
  className,
  style,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`hero-hotspot${className ? ` ${className}` : ""}`}
      style={style}
    />
  );
}

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
  /** Aperçu studio mobile : force les coordonnées CTA mobiles. */
  mobilePreview?: boolean;
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export default function HeroSlideView({
  slide: b,
  eager,
  onAction,
  onLink,
  leadMode = false,
  mobilePreview,
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
    | {
        src: string | null;
        srcMobile?: string;
        dim: number;
        scrim: string;
        hidden?: HeroHidden;
      }
    | undefined;
  const cardLayer = cfg.layers.find((l) => l.type === "card") as
    | {
        side: "left" | "right";
        src: string | null;
        srcMobile?: string;
        productId: string | null;
        hidden?: HeroHidden;
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
        hidden?: HeroHidden;
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

  // Valeurs effectives. Legacy : replis historiques cuits (pixels
  // identiques à avant). Studio : WYSIWYG depuis config + produit, SANS
  // les fallbacks legacy (un tag vidé reste vidé dans l'aperçu).
  const headline = isStudio
    ? textLayer?.headline || product?.title || ""
    : textLayer?.headline || b.headline;
  const sub = isStudio
    ? textLayer?.sub || product?.description || ""
    : textLayer?.sub || b.sub;
  const showSub = !isStudio ? true : textLayer?.showSub !== false;
  const tag = isStudio ? textLayer?.tag || "" : textLayer?.tag || b.tag;
  const showTag = (textLayer ? textLayer.showTag !== false : true) && b.showTag;
  // Hide-on (02) : couche/CTA masqués sur le device courant (aperçu
  // mobile = device simulé, jamais la fenêtre).
  const devMobile = mobilePreview ?? isMobile;
  const hide = (h: HeroHidden | undefined) => isHeroHidden(h, devMobile);
  // Branche visuelle active : si sa couche est masquée, pas de visuel
  // (le texte et les CTA suivent leurs propres règles).
  const visualHidden = hide(
    kind === "grid"
      ? tilesLayer?.hidden
      : kind === "image"
        ? imageLayer?.hidden
        : split
          ? (cardLayer?.hidden ?? imageLayer?.hidden)
          : imageLayer?.hidden,
  );
  const inlineCtas = cfg.ctas.filter(
    (c) => (!isStudio || c.pos === null) && !hide(c.hidden),
  );
  const placedCtas = isStudio
    ? cfg.ctas.filter(
        (
          c,
        ): c is HeroCta & {
          pos: NonNullable<HeroCta["pos"]>;
          hidden?: HeroHidden;
        } => c.pos !== null && !hide(c.hidden),
      )
    : [];

  // Titre effectif kind image (historique : headline, sinon titre slide).
  const imageHeadline =
    kind === "image"
      ? headline || (isStudio ? "" : b.title) || ""
      : headline;

  return (
    <div
      className="absolute inset-0"
      style={{
        background: heroBackground(b.bgGradient),
      }}
      data-hero-slide={b.id}
    >
      {visualHidden
        ? null
        : kind === "grid" && tilesLayer ? (
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
              {(isStudio
                ? tilesLayer.main?.label ||
                  product?.title ||
                  tilesLayer.main?.ctaLabel ||
                  ""
                : b.headline || b.cta) && (
                <span className="absolute left-3 bottom-3 right-3 flex items-end justify-between gap-2">
                  <span className="text-white font-extrabold text-lg leading-tight drop-shadow">
                    {isStudio
                      ? tilesLayer.main?.label || product?.title || ""
                      : [b.headline.split("\n")[0], b.sub]
                          .filter(Boolean)
                          .join(" — ")
                          .slice(0, 60)}
                  </span>
                  {(isStudio
                    ? tilesLayer.main?.ctaLabel || ""
                    : b.cta) && (
                    <span className="btn btn-accent shrink-0 !py-2 !px-4 text-xs">
                      {isStudio ? tilesLayer.main?.ctaLabel || "" : b.cta}
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
                  <div
                    className="text-white font-extrabold text-xl sm:text-2xl leading-tight drop-shadow"
                    style={typoTitleStyle(textLayer, {}, cfg)}
                  >
                    {imageHeadline.split("\n")[0]}
                  </div>
                )}
              </div>
              {!isStudio &&
                b.cta &&
                (() => {
                  const first = inlineCtas[0];
                  const s = heroCtaClass(first?.style ?? "accent");
                  const go = () => onAction(b);
                  if (s.className === "hero-hotspot") {
                    return (
                      <HotspotDot
                        label={first?.label || b.cta}
                        onClick={go}
                      />
                    );
                  }
                  return (
                    <button
                      onClick={go}
                      className={`${s.className} shrink-0`}
                      style={s.extra}
                    >
                      {first?.label || b.cta} <ArrowRight size={16} />
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
        (!textLayer || textLayer.anchor === "left-middle") &&
        !hide(textLayer?.hidden) && (
          <div className="absolute inset-0 z-10">
            <div className="h-full max-w-350 mx-auto px-5 sm:px-8 flex flex-col justify-between py-8 sm:py-12">
              <div />
              <div
                className={split ? "max-w-[62%] sm:max-w-xl" : "max-w-xl"}
                style={typoWrapStyle(textLayer)}
              >
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
                style={typoTitleStyle(textLayer, {
                  color: ink,
                  fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                  animationDelay: "80ms",
                }, cfg)}
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
                  const go = () => {
                    if (!fireLink(c.link)) onAction(b);
                  };
                  if (s.className === "hero-hotspot") {
                    return (
                      <HotspotDot
                        label={c.label || b.cta}
                        onClick={go}
                      />
                    );
                  }
                  return (
                    <button
                      onClick={go}
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

      {/* HTML collé (lot 4) : overlay sandboxé au-dessus des couches, sous
       *  les CTA positionnés. Absent sans contenu (jamais de div vide). */}
      {cfg.layers.some((l) => l.type === "html") && (b.html || b.css) ? (
        <HeroHtml html={b.html || ""} css={b.css || ""} onLink={onLink} />
      ) : null}

      {/* Marquee (lot 13) : bandes bas de slide, CSS-only, jamais slide 1
       *  (garde éditeur + exclu du lead). Moitiés dupliquées = boucle -50 %
       *  sans couture ; prefers-reduced-motion neutralisé en CSS global. */}
      {cfg.layers.some((l) => l.type === "marquee") && (
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col">
          {cfg.layers.map((l, li) => {
            if (l.type !== "marquee" || hide(l.hidden)) return null;
            const m = l as HeroMarqueeLayer;
            const light = m.tone === "light";
            return (
              <div
                key={li}
                className="ticker-wrap"
                style={{
                  background: light ? "#fff" : "#111",
                  color: light ? "#111" : "#fff",
                }}
              >
                <div
                  className={`hero-marquee-inner${m.direction === "right" ? " hero-marquee-reverse" : ""}`}
                  style={
                    {
                      "--hero-marquee-duration": `${m.speed}s`,
                    } as React.CSSProperties
                  }
                >
                  {[0, 1].map((half) => (
                    <span
                      key={half}
                      aria-hidden={half === 1}
                      style={{
                        display: "inline-flex",
                        whiteSpace: "nowrap",
                        padding: "8px 0",
                        fontWeight: 800,
                        fontSize: 13,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        ...(cfg.fontFamily
                          ? { fontFamily: heroFontStack(cfg.fontFamily) }
                          : null),
                      }}
                    >
                      {Array.from({ length: 6 }).map((_, k) => (
                        <span key={k} style={{ padding: "0 24px" }}>
                          {m.text}
                        </span>
                      ))}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Countdown (lot 14) : hydratation cliente, centré, non cliquable.
       *  Jamais dans le lead prerender (placeholder statique côté build). */}
      {cfg.layers.some((l) => l.type === "countdown") && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          {cfg.layers.map((l, li) =>
            l.type !== "countdown" || hide(l.hidden) ? null : (
              <HeroCountdown
                key={li}
                targetAt={l.targetAt}
                label={l.label}
                tone={l.tone}
                expiredText={l.expiredText}
              />
            ),
          )}
        </div>
      )}

      {/* Ancre non left-middle (studio uniquement) : bloc texte en overlay. */}
      {isStudio &&
        textLayer &&
        textLayer.anchor !== "left-middle" &&
        !hide(textLayer.hidden) && (
        <div
          className={`absolute inset-0 z-10 flex p-5 sm:p-8 ${
            textLayer.anchor === "center"
              ? "items-center justify-center text-center"
              : textLayer.anchor === "right-middle"
                ? "items-center justify-end text-right"
                : "items-end justify-start"
          }`}
        >
          <div className="max-w-xl" style={typoWrapStyle(textLayer)}>
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
              style={typoTitleStyle(textLayer, {
                color: ink,
                fontSize: "clamp(2rem, 5vw, 3.5rem)",
              }, cfg)}
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
        const mobile = devMobile;
        const pt = (mobile ? c.pos.mobile : undefined) ?? c.pos.desktop;
        const go = () => {
          if (!fireLink(c.link)) onAction(b);
        };
        if (s.className === "hero-hotspot") {
          return (
            <HotspotDot
              key={c.id}
              label={c.label}
              onClick={go}
              className="absolute z-20"
              style={{
                left: `${pt.x}%`,
                top: `${pt.y}%`,
                transform: `translate(-${pt.x}%, -${pt.y}%)`,
              }}
            />
          );
        }
        return (
          <button
            key={c.id}
            onClick={go}
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
