// src\components\HeroCarousel.tsx

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

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

export default function HeroCarousel({
  banners,
  loading,
  onBannerAction,
}: HeroCarouselProps) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSingleBanner = banners.length <= 1;

  useEffect(() => {
    if (autoPlayPaused || banners.length === 0) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length, autoPlayPaused]);

  const pauseAutoPlay = (duration = 8000) => {
    setAutoPlayPaused(true);
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    autoPlayTimeoutRef.current = setTimeout(
      () => setAutoPlayPaused(false),
      duration,
    );
  };

  if (loading || banners.length === 0) return null;

  const banner = banners[bannerIndex % banners.length];

  return (
    <section
      className="relative section-container mt-6 px-4"
      onMouseEnter={() => setAutoPlayPaused(true)}
      onMouseLeave={() => setAutoPlayPaused(false)}
    >
      <div
        className={`w-full rounded-2xl bg-linear-to-r ${banner.bgGradient} overflow-hidden border border-gray-200 relative min-h-90 md:min-h-105 transition-all duration-700`}
      >
        {/* Boutons de navigation (masqués si un seul élément) */}
        {!isSingleBanner && (
          <>
            <button
              onClick={() => {
                pauseAutoPlay();
                setBannerIndex(
                  (prev) => (prev - 1 + banners.length) % banners.length,
                );
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/60 hover:bg-white border border-gray-200 text-gray-900 flex items-center justify-center transition-all z-20 hover:text-(--color-accent)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                pauseAutoPlay();
                setBannerIndex((prev) => (prev + 1) % banners.length);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/60 hover:bg-white border border-gray-200 text-gray-900 flex items-center justify-center transition-all z-20 hover:text-(--color-accent)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            {/* Zones tactiles */}
            <button
              onClick={() => {
                pauseAutoPlay();
                setBannerIndex(
                  (prev) => (prev - 1 + banners.length) % banners.length,
                );
              }}
              className="absolute inset-y-0 left-0 w-[12%] md:w-[8%] min-w-11 z-10 bg-transparent cursor-pointer"
              aria-label="Diapositive précédente"
            />
            <button
              onClick={() => {
                pauseAutoPlay();
                setBannerIndex((prev) => (prev + 1) % banners.length);
              }}
              className="absolute inset-y-0 right-0 w-[12%] md:w-[8%] min-w-11 z-10 bg-transparent cursor-pointer"
              aria-label="Diapositive suivante"
            />
          </>
        )}

        {/* Desktop : layout côte à côte */}
        <div className="hidden md:flex items-center min-h-90 md:min-h-105">
          <div className="p-8 md:p-12 lg:p-16 flex-1 text-left flex flex-col items-start justify-center">
            {banner.showTag && banner.tag && (
              <span className="bg-indigo-600/30 border border-indigo-500/50 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                {banner.tag}
              </span>
            )}
            {banner.showTitle && banner.title && (
              <p className="text-xs uppercase tracking-widest font-black text-(--color-accent) mb-1.5">
                {banner.title}
              </p>
            )}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-gray-900 font-sans max-w-lg text-glow-white-strong">
              {banner.headline}
            </h1>
            <p className="text-sm text-gray-600 mt-3 max-w-md leading-relaxed font-sans text-glow-white">
              {banner.sub}
            </p>
            <button
              onClick={() => onBannerAction(banner)}
              className="mt-6 bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-white font-sans font-black text-xs px-6 py-3.5 rounded-full btn-glow-white transition-all text-center uppercase tracking-wider flex items-center gap-2 group"
            >
              <span>{banner.cta}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="relative flex-1 h-full flex items-center justify-center p-8 overflow-hidden select-none">
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950 opacity-40"></div>
            <div className="relative z-1 w-52 h-52 md:w-72 md:h-72 rounded-full bg-indigo-500/10 border border-indigo-500/20 blur-xl animate-pulse"></div>
            <img
              src={banner.image}
              alt={banner.headline}
              className="absolute inset-0 z-2 w-full h-full object-cover rounded-2xl shadow-2xl border border-gray-200 rotate-2 hover:rotate-0 transition-transform duration-500"
            />
          </div>
        </div>

        {/* Mobile : image en arrière-plan, texte superposé */}
        <div className="flex md:hidden relative min-h-90">
          <div className="absolute inset-y-0 right-0 w-3/5 overflow-hidden">
            <img
              src={banner.image}
              alt={banner.headline}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-l from-transparent via-white/70 to-white"></div>
          </div>
          <div className="relative z-10 pt-4 px-6 flex flex-col min-h-90 w-full">
            {banner.showTag && banner.tag && (
              <span className="bg-indigo-600/30 border border-indigo-500/50 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3 self-start">
                {banner.tag}
              </span>
            )}
            {banner.showTitle && banner.title && (
              <p className="text-xs uppercase tracking-widest font-black text-(--color-accent) mb-1.5">
                {banner.title}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-black leading-tight text-gray-900 font-sans max-w-[70%] text-glow-white-strong">
              {banner.headline}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-auto mb-20 leading-snug font-sans max-w-[75%] text-glow-white">
              {banner.sub}
            </p>
            <button
              onClick={() => onBannerAction(banner)}
              className="mt-6 bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-white font-sans font-black text-xs px-6 py-3.5 rounded-full btn-glow-white transition-all text-center uppercase tracking-wider flex items-center gap-2 group"
            >
              <span>{banner.cta}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Slider index (masqué si un seul élément) */}
        {!isSingleBanner && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  pauseAutoPlay();
                  setBannerIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${bannerIndex === i ? "w-6 bg-white" : "w-1.5 bg-slate-600"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
