// src/components/HeroCarousel.tsx — coquille hero (lot 2) : autoplay, lead
// prerender, squelette suspendu, flèches/dots, montage paresseux actif+
// suivant. Le rendu de chaque slide vit dans HeroSlideView (unifié).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowDown } from "lucide-react";
import HeroSlideView, { heroVisibleIndices, heroTextDark } from "./HeroSlideView";
import { resolveHeroConfig } from "../lib/heroSchema";
import type { HeroSlideData } from "../lib/heroSelect";

// HERO_BG_FALLBACK vit dans heroSelect (zéro cycle d'import) ; ré-exporté
// ici pour ne rien changer aux importeurs (App, PromotionsPage).
export { HERO_BG_FALLBACK } from "../lib/heroSelect";

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
  return "linear-gradient(135deg, #1a1712 0%, #242019 60%, #1a1712 100%)";
}

/** Lit le slide d'amorçage embarqué par le prerender
 *  (`<script id="lead-hero-data" type="application/json">`). Données
 *  catalogue publiques, validation minimale, jamais d'exception. */
function readLeadHero(): HeroSlideData | null {
  try {
    if (typeof document === "undefined") return null;
    const node = document.getElementById("lead-hero-data");
    if (!node || !node.textContent) return null;
    const raw = JSON.parse(node.textContent) as Record<string, unknown>;
    if (typeof raw.image !== "string" || !raw.image) return null;
    if (typeof raw.headline !== "string" || !raw.headline) return null;
    const str = (v: unknown): string =>
      typeof v === "string" ? v : "";
    const legacy = {
      title: str(raw.title) || (raw.headline as string),
      headline: raw.headline as string,
      sub: str(raw.sub),
      cta: str(raw.cta) || "Discover",
      bgGradient: str(raw.bgGradient),
      image: raw.image as string,
      tag: str(raw.tag) || "⚡ PROMOTION",
      productId: str(raw.productId),
      showTag: raw.showTag !== false,
      showTitle: raw.showTitle !== false,
      layout: raw.layout === "split" ? "split" : "full",
      kind:
        raw.kind === "image" || raw.kind === "grid" ? raw.kind : "product",
      linkUrl:
        typeof raw.linkUrl === "string" &&
        raw.linkUrl.startsWith("/") &&
        !raw.linkUrl.startsWith("//")
          ? (raw.linkUrl as string)
          : null,
      tiles: Array.isArray(raw.tiles)
        ? (raw.tiles as Array<{ image: string; label?: string; link?: string }>)
            .filter(
              (t): t is { image: string; label?: string; link?: string } =>
                !!t && typeof (t as { image?: unknown }).image === "string",
            )
            .slice(0, 3)
        : null,
    };
    return {
      id: "lead",
      config: resolveHeroConfig(legacy),
      ...legacy,
      product: null,
    } as HeroSlideData;
  } catch {
    return null;
  }
}

/** Style de coquille depuis le sizing du slide ACTIF (pur, testé).
 *  `{}` = sizing historique (78vh pleine largeur) → classes d'origine,
 *  aucun pixel ne bouge pour les slides legacy. */
export function heroShellStyle(
  slide: HeroSlideData | undefined,
  isMobile: boolean,
): React.CSSProperties {
  const s = slide?.config.sizing;
  if (!s) return {};
  const style: React.CSSProperties = {};
  if (s.mode === "auto") {
    style.aspectRatio = String(isMobile ? s.ratio.mobile : s.ratio.desktop);
  } else {
    const h = isMobile && s.heightMobile ? s.heightMobile : s.height;
    if (!(h.unit === "vh" && h.value === 78)) {
      style.height = h.unit === "vh" ? `${h.value}vh` : `${h.value}px`;
    }
  }
  if (s.width === "contained") {
    style.maxWidth = "88rem";
    style.marginInline = "auto";
  }
  return style;
}

interface HeroCarouselProps {
  banners: HeroSlideData[];
  loading: boolean;
  onBannerAction: (banner: HeroSlideData) => void;
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
  const [lead] = useState<HeroSlideData | null>(() => readLeadHero());
  const [leadFailed, setLeadFailed] = useState(false);
  const [isMobileShell, setIsMobileShell] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const fn = (e: MediaQueryListEvent) => setIsMobileShell(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  const showLead = !suspended && loading && lead !== null && !leadFailed;
  const slides = showLead && lead !== null ? [lead] : banners;
  const isSingleBanner = slides.length <= 1;

  // Le swap lead → bannières (ou un filtrage) peut réduire la liste sous
  // l'index courant : on recadre (sinon slide vide).
  useEffect(() => {
    if (index >= slides.length) setIndex(0);
  }, [index, slides.length]);

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

  // Montage paresseux : seuls l'actif et le suivant portent du contenu
  // (le suivant est déjà chargé quand il devient visible : swap invisible).
  // Les autres gardent leur conteneur (fond + transition) sans <img>.
  const visible = useMemo(
    () => new Set(heroVisibleIndices(index, slides.length)),
    [index, slides.length],
  );

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
  // Encre des contrôles (dots/scroll) = celle du slide ACTIF.
  const darkControls = heroTextDark(banner);
  const dotsInk = darkControls ? "var(--color-ink)" : "#fff";
  // Dimensions = celles du slide ACTIF (vide = gabarit historique).
  const shellStyle = heroShellStyle(banner, isMobileShell);
  const shellCustom = Object.keys(shellStyle).length > 0;

  return (
    <section
      className="relative overflow-hidden rounded-b-4xl sm:rounded-b-[2.5rem]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={
          shellCustom
            ? "relative w-full"
            : "relative h-[78vh] min-h-105 max-h-190 w-full"
        }
        style={shellCustom ? { ...shellStyle, minHeight: 220 } : undefined}
      >
        {slides.map((b, i) => (
          <div
            key={b.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{
              opacity: i === index ? 1 : 0,
              pointerEvents: i === index ? "auto" : "none",
            }}
          >
            {visible.has(i) && (
              <HeroSlideView
                slide={b}
                eager={i === 0}
                onAction={onBannerAction}
                onLink={(link) => onBannerLink?.(link)}
                leadMode={showLead}
                onImageError={() => setLeadFailed(true)}
              />
            )}
          </div>
        ))}

        {/* Arrows (hidden if single) */}
        {!isSingleBanner && (
          <>
            <button
              onClick={() => {
                pauseAutoPlay();
                setIndex((p) => (p - 1 + slides.length) % slides.length);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/50 text-gray-900 hidden md:flex items-center justify-center z-20"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => {
                pauseAutoPlay();
                setIndex((p) => (p + 1) % slides.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/50 text-gray-900 hidden md:flex items-center justify-center z-20"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 z-20">
          <div className="max-w-350 mx-auto px-5 sm:px-8 pb-8 sm:pb-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isSingleBanner &&
                slides.map((s, i) => (
                  <button
                    key={s.id}
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
                        background:
                          i === index
                            ? dotsInk
                            : darkControls
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
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{
                border: darkControls
                  ? "1px solid rgba(0,0,0,.25)"
                  : "1px solid rgba(255,255,255,.4)",
                color: dotsInk,
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
