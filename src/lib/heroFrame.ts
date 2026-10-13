// src/lib/heroFrame.ts — PUR : variables CSS du cadre du hero (.hero-box). Partagé React / prerender.
import type { HeroSizing } from "./heroSchema.ts";

export function heroHeightCss(h: { unit: "vh" | "px"; value: number }): string {
  // vh : mêmes bornes que l'ancien h-[78vh] min-h-105 max-h-190 (420px / 760px).
  return h.unit === "vh" ? `clamp(420px, ${h.value}vh, 760px)` : `${h.value}px`;
}

export function heroFrameVars(s: HeroSizing): Record<string, string | number> {
  if (s.mode === "auto")
    return { "--hero-r": s.ratio.desktop, "--hero-rm": s.ratio.mobile };
  return {
    "--hero-h": heroHeightCss(s.height),
    "--hero-hm": heroHeightCss(s.heightMobile ?? s.height),
  };
}
