// src/components/HeroSlideView.tsx — rendu UNIFIÉ d'un slide hero (config v1).
// Utilisé par la boutique (HeroCarousel) ET par la preview du studio.
import { Fragment, type CSSProperties, type SyntheticEvent } from "react";
import { ArrowRight } from "lucide-react";
import HeroHtmlBlock from "./HeroHtmlBlock";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { supabaseImageUrl } from "../lib/supabaseImage";
import type { HeroCta, HeroLayer } from "../lib/heroSchema";
import type { ResolvedHeroSlide } from "../lib/heroResolve";
import { tilesLayout } from "../lib/heroGrid";

type TextL = Extract<HeroLayer, { type: "text" }>;

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
  /** Stats : clic sur un bouton, une tuile ou un lien du HTML collé. */
  onTrack?: (slideId: string, kind: "cta" | "tile" | "main" | "html", key?: string) => void;
}

// URLs : identiques à l'ancien HeroCarousel pour que le slide 0 réutilise l'image du
// snapshot prerender (même URL = cache). Ne changer qu'avec prerender.ts (phase 2).
const U = {
  fill: (s: string) => supabaseImageUrl(s, { width: 1280, quality: 75 }),
  mobile: (s: string) => supabaseImageUrl(s, { width: 800, quality: 75 }),
  tile: (s: string) => supabaseImageUrl(s, { width: 400, quality: 70 }),
};

// Masquage par appareil : CSS pur (breakpoint 768 px), aucun JS, aucun layout shift.
const hideCls = (h?: "desktop" | "mobile") =>
  h === "mobile" ? "max-md:hidden" : h === "desktop" ? "md:hidden" : "";

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
      ? { background: "#fff", color: "#1a1916" }
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
  TextL["anchor"],
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
  onTrack,
}: HeroSlideViewProps) {
  const { config, product: p } = slide;
  const eager = index === 0;
  // Œil fermé : ni rendu, ni compté.
  const layers = config.layers.filter((l) => !l.off);
  const ctas = config.ctas.filter((c) => !c.off);
  const inline = ctas.filter((c) => !c.pos);
  const free = ctas.filter((c) => c.pos);
  const hasCard = layers.some((l) => l.type === "card");
  const textLayers = layers.filter((l): l is TextL => l.type === "text");
  // Un seul h1 par page : seul le slide actif porte le titre principal.
  const H = active ? "h1" : "p";
  const fire = (cta: HeroCta) => {
  onTrack?.(slide.id, "cta", cta.id);
  onAction(slide, cta.link);
};

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

  const renderText = (l: TextL, key: number, withCtas: boolean) => {
    const dark = l.tone === "dark" || (l.tone === "auto" && slide.lightBg);
    const ink = dark ? "#1a1916" : "#fff";
    const inkSoft = dark ? "#3d3b38" : "rgba(255,255,255,.8)";
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
        className={`absolute inset-0 z-10 flex pointer-events-none pt-8 sm:pt-12 pb-19 sm:pb-23 ${a.wrap} ${hideCls(l.hide)}`}
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
                    className={`animate-fade-up ${hideCls(c.hide)}`}
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
      {layers.map((layer, i) => {
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
                className={`absolute inset-0 w-full h-full ${hideCls(layer.hide)}`}
                style={{ objectFit: layer.fit, opacity: layer.dim }}
                eager={eager}
                onError={imgError}
              />
              {layer.scrim !== "none" && (
                <div
                  style={SCRIM[layer.scrim]}
                  className={hideCls(layer.hide)}
                />
              )}
            </Fragment>
          );
        }
        if (layer.type === "card") {
          // layer.productId (autre produit) et showMeta (prix) : pas encore rendus.
          const src = layer.src || p?.image || null;
          if (!src) return null;
          const side =
            layer.side === "left" ? "left-4 sm:left-8" : "right-4 sm:right-8";
          return (
            <div
              key={i}
              className={`absolute ${side} top-1/2 -translate-y-1/2 w-[34vw] sm:w-[38vw] max-w-105 ${hideCls(layer.hide)}`}
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
  const click = (link: string | null, key: string) => {
    onTrack?.(slide.id, key === "main" ? "main" : "tile", key);
    if (link && onLink) onLink(link);
    else onAction(slide, null);
  };
  const variant = layer.variant ?? "split";
  // null = disposition historique (code inchangé) ; sinon grille CSS à partir de 640 px.
  const L =
    variant === "split"
      ? null
      : tilesLayout(variant, layer.items.length, !!(main && mainSrc));
  const cellStyle = (c?: { col: string; row: string }): CSSProperties =>
    c ? { gridColumn: c.col, gridRow: c.row } : {};

  const mainBtn =
    main && mainSrc ? (
      <button
        type="button"
        onClick={() => click(main.link, "main")}
        className={`relative flex-1 min-h-0 ${L ? "min-w-0 " : ""}rounded-2xl overflow-hidden text-left`}
        style={{ boxShadow: "var(--shadow-xl)", ...cellStyle(L?.main) }}
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
    ) : null;

  const itemBtn = (
    t: { src: string; label: string; link: string | null },
    ti: number,
  ) => (
    <button
      key={ti}
      type="button"
      onClick={() => click(t.link || main?.link || null, `tile-${ti}`)}
      className="relative flex-1 min-w-[38vw] sm:min-w-0 sm:min-h-0 rounded-2xl overflow-hidden text-left"
      style={{ boxShadow: "var(--shadow-lg)", ...cellStyle(L?.items[ti]) }}
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
  );

  if (!L) {
    return (
      <div
        key={i}
        className={`absolute inset-0 flex flex-col sm:flex-row gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24 ${hideCls(layer.hide)}`}
      >
        {mainBtn}
        <div className="flex sm:flex-col gap-3 sm:w-[30%] shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar">
          {layer.items.map(itemBtn)}
        </div>
      </div>
    );
  }
  // Variantes : le masquage vit sur une enveloppe (aucun conflit avec sm:grid).
  // Mobile : colonne (principal + rangée de tuiles) ; ≥ 640 px : grille, la rangée devient `contents`.
  return (
    <div key={i} className={`absolute inset-0 ${hideCls(layer.hide)}`}>
      <div
        className="absolute inset-0 flex flex-col sm:grid gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24"
        style={{ gridTemplateColumns: L.cols, gridTemplateRows: L.rows }}
      >
        {mainBtn}
        <div className="flex gap-3 overflow-x-auto no-scrollbar shrink-0 max-sm:h-28 sm:contents">
          {layer.items.map(itemBtn)}
        </div>
      </div>
    </div>
  );
}
        if (layer.type === "html") {
          if (!slide.html) return null;
          const block = (
            <HeroHtmlBlock
              key={i}
              html={slide.html.html}
              css={slide.html.css}
              onLink={(l) => {
                onTrack?.(slide.id, "html", "html");
                onLink?.(l);
              }}
            />
          );
          return layer.hide ? (
            <div key={i} className={`absolute inset-0 ${hideCls(layer.hide)}`}>
              {block}
            </div>
          ) : (
            block
          );
        }
        return null; // "text" : rendu après les couches
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
                  ink={slide.lightBg ? "#1a1916" : "#fff"}
                  className={hideCls(c.hide)}
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
          <div
            key={c.id}
            className={`hero-cta-free ${hideCls(c.hide)}`}
            style={vars}
          >
            <CtaButton
              cta={c}
              ink={slide.lightBg ? "#1a1916" : "#fff"}
              onClick={() => fire(c)}
            />
          </div>
        );
      })}
    </div>
  );
}
