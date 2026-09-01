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

interface HeroCarouselProps {
  banners: HeroBanner[];
  loading: boolean;
  onBannerAction: (banner: HeroBanner) => void;
}

export default function HeroCarousel({ banners, loading, onBannerAction }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSingleBanner = banners.length <= 1;

  const goTo = useCallback((i: number) => setIndex((i + banners.length) % banners.length), [banners.length]);

  useEffect(() => {
    if (isPaused || banners.length === 0) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % banners.length), 6000);
    return () => clearInterval(timer);
  }, [isPaused, banners.length]);

  const pauseAutoPlay = (duration = 8000) => {
    setIsPaused(true);
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    autoPlayTimeoutRef.current = setTimeout(() => setIsPaused(false), duration);
  };

  if (loading || banners.length === 0) return null;
  const banner = banners[index % banners.length];

  return (
    <section
      className="relative overflow-hidden rounded-b-4xl sm:rounded-b-[2.5rem]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-[78vh] min-h-105 max-h-190 w-full">
        {banners.map((b, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0, background: b.bgGradient, pointerEvents: i === index ? "auto" : "none" }}
          >
            <img
              src={b.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.55, mixBlendMode: "luminosity" }}
              onError={(e) => ((e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG)}
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(15,13,10,.68) 0%, rgba(15,13,10,.28) 55%, transparent 100%)" }} />
          </div>
        ))}

        {/* Arrows (hidden if single) */}
        {!isSingleBanner && (
          <>
            <button onClick={() => { pauseAutoPlay(); setIndex((p) => (p - 1 + banners.length) % banners.length); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/50 text-gray-900 hidden md:flex items-center justify-center z-20" aria-label="Previous">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => { pauseAutoPlay(); setIndex((p) => (p + 1) % banners.length); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 hover:bg-white border border-white/50 text-gray-900 hidden md:flex items-center justify-center z-20" aria-label="Next">
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <div className="relative z-10 h-full max-w-350 mx-auto px-5 sm:px-8 flex flex-col justify-between py-8 sm:py-12">
          <div />
          <div className="max-w-xl">
            {banner.showTag && banner.tag && (
              <span className="inline-flex items-center gap-2 mb-5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] animate-fade-up" style={{ background: "rgba(255,255,255,.14)", color: "#fff", backdropFilter: "blur(8px)" }}>
                {banner.tag}
              </span>
            )}
            <h1 key={banner.headline} className="font-extrabold text-white leading-[0.95] tracking-tight mb-5 animate-fade-up" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", animationDelay: "80ms" }}>
              {banner.headline.split("\n").map((line, i) => (
                <span key={i} className="block">{i === 1 ? <em className="font-display not-italic sm:italic pb-1 inline-block">{line}</em> : line}</span>
              ))}
            </h1>
            <p className="text-sm sm:text-base mb-7 animate-fade-up" style={{ color: "rgba(255,255,255,.8)", animationDelay: "160ms", maxWidth: "34ch" }}>{banner.sub}</p>
            <button onClick={() => onBannerAction(banner)} className="btn btn-accent animate-fade-up" style={{ animationDelay: "240ms" }}>
              {banner.cta} <ArrowRight size={16} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isSingleBanner && banners.map((_, i) => (
                <button key={i} onClick={() => { pauseAutoPlay(); goTo(i); }} aria-label={`Go to slide ${i + 1}`} aria-current={i === index} className="h-1.5 rounded-full transition-all duration-500" style={{ width: i === index ? "28px" : "8px", background: i === index ? "#fff" : "rgba(255,255,255,.4)" }} />
              ))}
            </div>
            <button onClick={() => document.getElementById("section-catalog")?.scrollIntoView({ behavior: "smooth" })} aria-label="Scroll to catalog" className="w-11 h-11 rounded-full flex items-center justify-center" style={{ border: "1px solid rgba(255,255,255,.4)", color: "#fff" }}>
              <ArrowDown size={17} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
