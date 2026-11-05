// src/components/HeroCarousel.tsx — cadre, autoplay et contrôles du hero.
// Le rendu d'un slide vit dans HeroSlideView (config v1 unifiée).
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  Pause,
  Play,
} from "lucide-react";
import HeroSlideView from "./HeroSlideView";
import { trackHeroClick, trackHeroImpression } from "../lib/heroTracking";
import { ensureHeroFonts, heroFontUrlsInUse, heroFontsInUse } from "../lib/heroFonts";
import type { HeroSizing } from "../lib/heroSchema";
import type { ResolvedHeroSlide } from "../lib/heroResolve";
import { readLeadSlide } from "../lib/heroLead";
import { heroFrameVars } from "../lib/heroFrame";
import { getVariant } from "../lib/engagement";

// Compat : PromotionsPage importe ces 4 helpers depuis ce fichier.
export {
  HERO_BG_FALLBACK,
  isLightHeroBg,
  normalizeHeroLink,
  heroBackground,
} from "../lib/heroStyle";

const frameVars = (s: HeroSizing): CSSProperties =>
  heroFrameVars(s) as CSSProperties;

interface HeroCarouselProps {
  slides: ResolvedHeroSlide[];
  loading: boolean;
  /** CTA / clic principal : `link` interne validé par l'appelant, sinon fiche produit. */
  onSlideAction: (slide: ResolvedHeroSlide, link: string | null) => void;
  /** Clic tuile : lien interne validé par l'appelant. */
  onSlideLink?: (link: string) => void;
  /** Suspendu (cold deep-route produit) : squelette au même gabarit, AUCUNE <img>. */
  suspended?: boolean;
  /** Preview admin / admin connecté : aucun événement de stats. */
  noTrack?: boolean;
}

export default function HeroCarousel({
  slides,
  loading,
  onSlideAction,
  onSlideLink,
  suspended = false,
  noTrack = false,
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [armed, setArmed] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  const autoPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slide d'amorçage : rendu pendant le chargement (image déjà en cache), swap invisible.
const [lead] = useState<ResolvedHeroSlide | null>(() =>
  readLeadSlide(getVariant()),
);
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
    if (suspended || isPaused || userPaused || reduced || count === 0) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
    return () => clearInterval(timer);
  }, [suspended, isPaused, userPaused, reduced, count]);

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

  // Stats : carrousel visible (≥ 50 %) + impression après 1 s de présence du slide actif.
  const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!rootEl || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.5,
    });
    io.observe(rootEl);
    return () => io.disconnect();
  }, [rootEl]);
  const trackedId = count > 0 ? list[index % count]?.id : undefined;
  // Polices (PORT-15B P3) : <link> uniques, display=swap. Legacy sans fonte = zéro requête.
  useEffect(() => {
    ensureHeroFonts(heroFontsInUse(list), heroFontUrlsInUse(list));
  }, [list]);
  useEffect(() => {
    if (noTrack || suspended || showLead || !inView || !trackedId) return;
    const t = setTimeout(
      () => trackHeroImpression(trackedId, index % count),
      1000,
    );
    return () => clearTimeout(t);
  }, [noTrack, suspended, showLead, inView, trackedId]);

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
  const ink = active.lightBg ? "#1a1916" : "#fff";
  const mounted = (i: number) =>
    i === cur ||
    (armed && (i === (cur + 1) % count || i === (cur - 1 + count) % count));

  return (
    <section
      ref={setRootEl}
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
        aria-roledescription="carousel"
        aria-label="Promotions"
        aria-live={isPaused || userPaused || reduced ? "polite" : "off"}
      >
        {list.map((s, i) =>
          mounted(i) ? (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-700"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
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
                onTrack={noTrack ? undefined : trackHeroClick}
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
              {
                !isSingle && !reduced && (
                  <button
                    type="button"
                    onClick={() => setUserPaused((p) => !p)}
                    aria-pressed={userPaused}
                    aria-label={
                      userPaused ? "Reprendre le défilement" : "Mettre le défilement en pause"
                    }
                    className="flex items-center justify-center min-w-[24px] min-h-[24px]"
                    style={{ color: ink }}
                  >
                    {userPaused ? <Play size={14} /> : <Pause size={14} />}
                  </button>
                )
              }
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
