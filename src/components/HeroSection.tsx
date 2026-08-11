// src/components/HeroSection.tsx

import React from "react";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { Button } from "./ui/Button";

interface HeroSectionProps {
  onShopNow: () => void;
  onWatchTrending?: () => void;
}

export default function HeroSection({
  onShopNow,
  onWatchTrending,
}: HeroSectionProps) {
  return (
    <section className="section-container pt-6 sm:pt-10">
      <div
        className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] grid grid-cols-1 lg:grid-cols-2 items-center gap-8 px-6 sm:px-12 py-12 sm:py-16"
        style={{
          background:
            "linear-gradient(120deg, var(--color-accent) 0%, #ff7a3d 45%, var(--color-indigo) 130%)",
        }}
      >
        {/* Decorative ring */}
        <div
          className="absolute -right-24 -top-24 w-96 h-96 rounded-full opacity-30 hidden sm:block"
          style={{ border: "2px solid rgba(255,255,255,0.6)" }}
        />
        <Sparkles
          className="absolute top-8 right-10 text-white/70 hidden sm:block"
          size={22}
        />

        <div className="relative z-10 flex flex-col gap-5 animate-fade-up">
          <span className="inline-flex w-fit items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest text-white/90 bg-white/15 backdrop-blur">
            🔥 Trendy Fashion Zone
          </span>
          <h1 className="font-display font-black text-white text-4xl sm:text-6xl leading-[1.02]">
            Wear the energy of every event
          </h1>
          <p className="text-white/85 text-sm sm:text-base max-w-md leading-relaxed">
            Curated print-on-demand fashion — hoodies, tees & accessories
            printed the moment culture happens.
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <Button
              variant="cta"
              size="lg"
              fullWidthOnMobile
              onClick={onShopNow}
              iconRight={<ArrowRight size={16} />}
            >
              Shop Now
            </Button>
            <button
              onClick={onWatchTrending}
              className="flex items-center gap-2.5 text-white font-bold text-xs uppercase tracking-wider px-2 py-2 group"
            >
              <span className="w-9 h-9 rounded-full flex items-center justify-center bg-white/20 group-hover:bg-white/30 transition-colors">
                <Play size={13} fill="white" />
              </span>
              Watch Trending
            </button>
          </div>
        </div>

        <div className="relative z-10 flex justify-center lg:justify-end animate-fade-up delay-2">
          <div className="relative w-56 sm:w-72 aspect-3/4 rounded-[28px] overflow-hidden shadow-2xl rotate-2">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80"
              alt="Featured look"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Marquee strip */}
      <div
        className="mt-6 overflow-hidden rounded-full"
        style={{
          background: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex animate-marquee whitespace-nowrap py-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 pr-8">
              {[
                "New Collection 2026",
                "Zero Waste Printing",
                "Free Shipping $35+",
                "Printed in 24h",
                "Made-to-order fashion",
              ].map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-ink3)" }}
                >
                  <span style={{ color: "var(--color-accent)" }}>✦</span> {t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
