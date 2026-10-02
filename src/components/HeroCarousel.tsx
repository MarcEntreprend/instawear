// src/components/HeroCarousel.tsx — V2 visuals + V1 data (heroPromotionsApi)
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowRight, ArrowDown } from "lucide-react";
import { PLACEHOLDER_IMG } from "../constants/assets";

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
}

/** Fond hero par défaut (P4) : l'ancien fallback "from-white via-…" était des
 *  classes Tailwind, invalide en CSS inline → transparent. Ce dégradé réel
 *  reprend l'esthétique de l'overlay. */
export const HERO_BG_FALLBACK =
  "linear-gradient(135deg, #1a1712 0%, #242019 60%, #1a1712 100%)";

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
    };
  } catch {
    return null;
  }
}

interface HeroCarouselProps {
  banners: HeroBanner[];
  loading: boolean;
  onBannerAction: (banner: HeroBanner) => void;
  /** Suspendu (cold deep-route /produit/:id) : squelette au même gabarit,
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

  return (
    <section
      className="relative overflow-hidden rounded-b-4xl sm:rounded-b-[2.5rem]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-[78vh] min-h-105 max-h-190 w-full">
        {slides.map((b, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: i === index ? 1 : 0,
              background: heroBackground(b.bgGradient),
              pointerEvents: i === index ? "auto" : "none",
            }}
          >
            <img
              src={b.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.55 }}
              onError={(e) => {
                // Slide d'amorçage HS → skeleton (état antérieur), sinon
                // placeholder comme avant.
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
          </div>
        ))}

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
          <div className="max-w-xl">
            {banner.showTag && banner.tag && (
              <span
                className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] animate-fade-up"
                style={{
                  background: "rgba(255,255,255,.14)",
                  color: "#fff",
                  backdropFilter: "blur(8px)",
                }}
              >
                {banner.tag}
              </span>
            )}
            <h1
              key={banner.headline}
              className="font-extrabold text-white leading-[0.95] tracking-tight mb-5 animate-fade-up"
              style={{
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
                color: "rgba(255,255,255,.8)",
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
                        background: i === index ? "#fff" : "rgba(255,255,255,.4)",
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
                border: "1px solid rgba(255,255,255,.4)",
                color: "#fff",
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
