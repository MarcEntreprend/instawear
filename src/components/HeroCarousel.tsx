// src/components/HeroCarousel.tsx — V2 visuals + V1 data (heroPromotionsApi)
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, ArrowDown } from "lucide-react";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { supabaseImageUrl } from "../lib/supabaseImage";

interface HeroBanner {
  title?: string;
  headline: string;
  sub: string;
  cta: string;
  bgGradient: string;
  image: string;
  tag?: string;
  productId?: string;
  showTag: boolean;
  showTitle: boolean;
  /** Mise en page : full-bleed historique (défaut) ou split. */
  layout?: "full" | "split";
  /** Phase 2 : product (défaut) | image (visuel custom) | grid (tuiles). */
  kind?: "product" | "image" | "grid";
  /** Lien interne (doit commencer par "/") : image/grid ou CTA custom. */
  linkUrl?: string | null;
  /** Tuiles kind grid : [{image, label?, link?}] (max 3 affichées). */
  tiles?: Array<{ image: string; label?: string; link?: string }> | null;
}

/** Fond hero par défaut (P4) : l'ancien fallback "from-white via-…" était des
 *  classes Tailwind, invalide en CSS inline → transparent. Ce dégradé réel
 *  reprend l'esthétique de l'overlay. */
export const HERO_BG_FALLBACK =
  "linear-gradient(135deg, #1a1712 0%, #242019 60%, #1a1712 100%)";

/** Fond clair ? (texte sombre). Réutilisé par l'aperçu admin. */
export function isLightHeroBg(g?: string): boolean {
  if (!g) return false;
  const lightMarkers = ["#faf7f0", "#f3ece0", "#f0b13d", "#f7d789", "#ffffff", "#fff"];
  const low = g.toLowerCase();
  return lightMarkers.some((m) => low.includes(m));
}

/** Hôtes acceptés pour les liens hero absolus (réduits au chemin). */
const HERO_LINK_HOSTS = ["instawear.vercel.app", "localhost", "127.0.0.1"];

/**
 * Normalise un lien hero saisi (miroir de sanitizeHeroPhase2 côté API) :
 * "/…" gardé, URL absolue same-origin réduite au chemin (l'admin colle
 * depuis la barre d'adresse), le reste vidé — jamais de perte silencieuse,
 * la conversion est visible dès le blur.
 */
export function normalizeHeroLink(v: unknown): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (t.startsWith("/") && !t.startsWith("//") && t.length <= 200) return t;
  const m = t.match(/^https?:\/\/([^/:?#]+)(?::\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i);
  if (m && HERO_LINK_HOSTS.includes(m[1].toLowerCase())) {
    const path = (m[2] || "/") + (m[3] || "") + (m[4] || "");
    return path.length <= 200 ? path : "";
  }
  return "";
}

/** Garde-fou : les lignes existantes en base peuvent contenir l'ancien
 *  libellé Tailwind ("from-white …", truthy mais invalide en CSS). On ne
 *  retient que ce qui ressemble à du CSS réel, sinon fallback (aucune
 *  écriture DB, rendu seul). */
export function heroBackground(g?: string): string {
  if (
    g &&
    (g.includes("(") || g.startsWith("#") || g.startsWith("var(--"))
  ) {
    return g;
  }
  return HERO_BG_FALLBACK;
}

/** Lit le slide d'amorçage embarqué par le prerender
 *  (`<script id="lead-hero-data" type="application/json">`). Données
 *  catalogue publiques, validation minimale, jamais d'exception. */
function readLeadHero(): HeroBanner | null {
  try {
    if (typeof document === "undefined") return null;
    const node = document.getElementById("lead-hero-data");
    if (!node || !node.textContent) return null;
    const raw = JSON.parse(node.textContent) as Partial<HeroBanner>;
    if (typeof raw.image !== "string" || !raw.image) return null;
    if (typeof raw.headline !== "string" || !raw.headline) return null;
    return {
      title:
        typeof raw.title === "string" && raw.title
          ? raw.title
          : raw.headline,
      headline: raw.headline,
      sub: typeof raw.sub === "string" ? raw.sub : "",
      cta: typeof raw.cta === "string" && raw.cta ? raw.cta : "Discover",
      bgGradient:
        typeof raw.bgGradient === "string" ? raw.bgGradient : "",
      image: raw.image,
      tag: typeof raw.tag === "string" ? raw.tag : "⚡ PROMOTION",
      productId: typeof raw.productId === "string" ? raw.productId : undefined,
      showTag: raw.showTag !== false,
      showTitle: raw.showTitle !== false,
      layout: raw.layout === "split" ? "split" : "full",
      kind: raw.kind === "image" || raw.kind === "grid" ? raw.kind : "product",
      linkUrl:
        typeof raw.linkUrl === "string" && raw.linkUrl.startsWith("/") &&
        !raw.linkUrl.startsWith("//")
          ? raw.linkUrl
          : null,
      tiles: Array.isArray(raw.tiles)
        ? raw.tiles
            .filter(
              (t): t is { image: string; label?: string; link?: string } =>
                !!t && typeof (t as any).image === "string",
            )
            .slice(0, 3)
        : null,
    };
  } catch {
    return null;
  }
}

interface HeroCarouselProps {
  banners: HeroBanner[];
  loading: boolean;
  onBannerAction: (banner: HeroBanner) => void;
  /** Clic tuile/link (kind grid/image) : lien interne validé par App. */
  onBannerLink?: (link: string) => void;
  /** Suspendu (cold deep-route /item/:slug-ou-id) : squelette au même gabarit,
   *  AUCUNE <img> — ni bannières, ni slide d'amorçage lead. Sans ça, le hero
   *  1536px part derrière l'overlay produit et vole le LCP (LCP ignore
   *  l'occlusion), avec ~1,4 s de retard de découverte. Le squelette garde
   *  h-[78vh]/min/max identiques → aucun layout shift à la levée. */
  suspended?: boolean;
}

export default function HeroCarousel({
  banners,
  loading,
  onBannerAction,
  onBannerLink,
  suspended = false,
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // P4b — slide d'amorçage : le prerender embarque la 1re bannière en JSON
  // (mêmes données que App.tsx). Pendant le chargement, on rend CE slide au
  // lieu du skeleton : l'image est déjà en cache (même URL que le snapshot
  // statique) et le swap vers les vraies bannières est invisible. Lecture
  // paresseuse unique, try/catch → null (données publiques catalogue).
  const [lead] = useState<HeroBanner | null>(() => readLeadHero());
  const [leadFailed, setLeadFailed] = useState(false);
  const showLead = !suspended && loading && lead !== null && !leadFailed;
  const slides = showLead && lead !== null ? [lead] : banners;
  const isSingleBanner = slides.length <= 1;

  const goTo = useCallback(
    (i: number) => setIndex((i + slides.length) % slides.length),
    [slides.length],
  );

  useEffect(() => {
    if (suspended || isPaused || slides.length === 0) return;
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      6000,
    );
    return () => clearInterval(timer);
  }, [suspended, isPaused, slides.length]);

  const pauseAutoPlay = (duration = 8000) => {
    setIsPaused(true);
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    autoPlayTimeoutRef.current = setTimeout(() => setIsPaused(false), duration);
  };

  if (suspended || (loading && !showLead) || (!loading && slides.length === 0)) {
    return (
      <section className="relative overflow-hidden rounded-b-4xl sm:rounded-b-[2.5rem]">
        <div
          className="relative h-[78vh] min-h-105 max-h-190 w-full animate-pulse"
          // P4 : même gabarit que le hero final, fond sombre assorti (le
          // surface2 clair produisait un flash avant l'arrivée de l'image).
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
  const banner = slides[index % slides.length];
  // Kinds image/grid portent leur propre habillage (overlay/tuiles) :
  // le bloc texte partagé ne sert qu'au kind product.
  const activeIsProduct = (banner.kind ?? "product") === "product";
  // Mise en page du slide ACTIF (choix par slide, défaut full = avant).
  const activeSplit = (banner.layout ?? "full") === "split";
  // Texte adaptatif en split (fonds clairs = encre sombre) ; en full,
  // blanc sur image comme avant (l'overlay assure le contraste).
  const lightBg = activeSplit && isLightHeroBg(banner.bgGradient);
  const ink = !activeSplit || !lightBg ? "#fff" : "var(--color-ink)";
  const inkSoft = !activeSplit || !lightBg ? "rgba(255,255,255,.8)" : "var(--color-ink2)";
  const chipBg = !activeSplit || !lightBg ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.06)";

  return (
    <section
      className="relative overflow-hidden rounded-b-4xl sm:rounded-b-[2.5rem]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-[78vh] min-h-105 max-h-190 w-full">
        {slides.map((b, i) => {
          // Kind image/grid : visuel custom / tuiles. Product : layout
          // split (fond + carte) ou full historique (plein cadre + voile).
          const kind = b.kind ?? "product";
          const split = (b.layout ?? "full") === "split";
          const visualSrc =
            b.image && b.image !== PLACEHOLDER_IMG
              ? supabaseImageUrl(b.image, { width: 1280, quality: 75 })
              : null;
          const fireLink = (link?: string | null): boolean => {
            if (link && onBannerLink) {
              onBannerLink(link);
              return true;
            }
            return false;
          };
          return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: i === index ? 1 : 0,
              background: heroBackground(b.bgGradient),
              pointerEvents: i === index ? "auto" : "none",
            }}
          >
            {kind === "grid" ? (
              <div className="absolute inset-0 flex flex-col sm:flex-row gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24">
                {visualSrc && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!fireLink(b.linkUrl)) onBannerAction(b);
                    }}
                    className="relative flex-1 min-h-0 rounded-2xl overflow-hidden text-left"
                    style={{ boxShadow: "var(--shadow-xl)" }}
                    // Nom accessible = contenu si texte visible (headline/CTA),
                    // sinon fallback (jamais de mismatch visible/nom).
                    aria-label={
                      b.headline || b.cta
                        ? undefined
                        : b.title || "Voir"
                    }
                  >
                    <img
                      src={visualSrc}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading={i === 0 ? "eager" : "lazy"}
                      fetchPriority={i === 0 ? "high" : "auto"}
                      decoding="async"
                    />
                    {(b.headline || b.cta) && (
                      <span className="absolute left-3 bottom-3 right-3 flex items-end justify-between gap-2">
                        <span className="text-white font-extrabold text-lg leading-tight drop-shadow">
                          {[b.headline.split("\n")[0], b.sub].filter(Boolean).join(" — ").slice(0, 60)}
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
                  {(b.tiles ?? []).slice(0, 3).map((t, ti) => (
                    <button
                      key={ti}
                      type="button"
                      onClick={() => {
                        if (!fireLink(t.link || b.linkUrl)) onBannerAction(b);
                      }}
                      className="relative flex-1 min-w-[38vw] sm:min-w-0 sm:min-h-0 rounded-2xl overflow-hidden text-left"
                      style={{ boxShadow: "var(--shadow-lg)" }}
                      aria-label={t.label || `Voir ${ti + 1}`}
                    >
                      <img
                        src={supabaseImageUrl(t.image, {
                          width: 400,
                          quality: 70,
                        })}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                      {t.label && (
                        <span className="absolute left-2 bottom-2 text-white text-xs font-bold drop-shadow px-2 py-1 rounded-lg" style={{ background: "rgba(0,0,0,.55)" }}>
                          {t.label}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : kind === "image" ? (
              <>
                {visualSrc && (
                  <img
                    src={visualSrc}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    decoding="async"
                  />
                )}
                <div
                  className="absolute inset-x-0 bottom-0 pt-16 pb-8 px-5 sm:px-8"
                  style={{ background: "linear-gradient(180deg, transparent, rgba(10,9,7,.55))" }}
                >
                  <div className="max-w-350 mx-auto flex items-end justify-between gap-4">
                    <div className="min-w-0">
                      {b.showTag && b.tag && (
                        <span className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.16em]" style={{ background: "rgba(255,255,255,.14)", color: "#fff", backdropFilter: "blur(8px)" }}>
                          {b.tag}
                        </span>
                      )}
                      {!!(b.headline || b.title) && (
                        <div className="text-white font-extrabold text-xl sm:text-2xl leading-tight drop-shadow">
                          {(b.headline || b.title || "").split("\n")[0]}
                        </div>
                      )}
                    </div>
                    {b.cta && (
                      <button
                        onClick={() => onBannerAction(b)}
                        className="btn btn-accent shrink-0"
                      >
                        {b.cta} <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : split ? (
              visualSrc && (
                <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-[34vw] sm:w-[38vw] max-w-105">
                  <img
                    src={visualSrc}
                    alt=""
                    className="w-full aspect-[4/5] max-h-[60vh] object-cover rounded-2xl"
                    style={{ boxShadow: "var(--shadow-xl)" }}
                    onError={(e) => {
                      ((e.currentTarget as HTMLImageElement).style.display = "none");
                      if (showLead) setLeadFailed(true);
                    }}
                    loading={i === 0 ? "eager" : "lazy"}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    decoding="async"
                  />
                </div>
              )
            ) : (
              <>
                <img
                  src={b.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: 0.55 }}
                  onError={(e) => {
                    if (showLead) setLeadFailed(true);
                    else
                      ((e.currentTarget as HTMLImageElement).src =
                        PLACEHOLDER_IMG);
                  }}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  decoding="async"
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
          </div>
          );
        })}

        {/* Arrows (hidden if single) */}
        {!isSingleBanner && (
          <>
            <button
              onClick={() => {
                pauseAutoPlay();
                setIndex((p) => (p - 1 + banners.length) % banners.length);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/50 text-gray-900 hidden md:flex items-center justify-center z-20"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => {
                pauseAutoPlay();
                setIndex((p) => (p + 1) % banners.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/50 text-gray-900 hidden md:flex items-center justify-center z-20"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <div className="relative z-10 h-full max-w-350 mx-auto px-5 sm:px-8 flex flex-col justify-between py-8 sm:py-12">
          <div />
          {/* Texte à gauche (product/split : contenu pour ne jamais
              passer sous la carte image ; full : pleine largeur comme
              avant). Masqué pour kinds image/grid (habillage intégré). */}
          {activeIsProduct && (
          <div className={activeSplit ? "max-w-[62%] sm:max-w-xl" : "max-w-xl"}>
            {banner.showTag && banner.tag && (
              <span
                className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] animate-fade-up"
                style={{
                  background: chipBg,
                  color: lightBg ? "var(--color-accent-strong, #c2452a)" : "#fff",
                  backdropFilter: "blur(8px)",
                }}
              >
                {banner.tag}
              </span>
            )}
            <h1
              key={banner.headline}
              className="font-extrabold leading-[0.95] tracking-tight mb-5 animate-fade-up"
              style={{
                color: ink,
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                animationDelay: "80ms",
              }}
            >
              {banner.headline.split("\n").map((line, i) => (
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
            <p
              className="text-sm sm:text-base mb-7 animate-fade-up"
              style={{
                color: inkSoft,
                animationDelay: "160ms",
                maxWidth: "34ch",
              }}
            >
              {banner.sub}
            </p>
            <button
              onClick={() => onBannerAction(banner)}
              className="btn btn-accent animate-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              {banner.cta} <ArrowRight size={16} />
            </button>
          </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isSingleBanner &&
                banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      pauseAutoPlay();
                      goTo(i);
                    }}
                    aria-label={`Go to slide ${i + 1}`}
                    aria-current={i === index}
                    className="flex items-center justify-center min-w-[24px] min-h-[24px]"
                  >
                    <span
                      className="block h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: i === index ? "28px" : "8px",
                        background: i === index ? ink : lightBg ? "rgba(0,0,0,.25)" : "rgba(255,255,255,.4)",
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
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                border: lightBg ? "1px solid rgba(0,0,0,.25)" : "1px solid rgba(255,255,255,.4)",
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
