// src/admin/HeroPreviewFrame.tsx — page chargée DANS l'iframe d'aperçu du studio.
// Garde admin : rien ne s'affiche sans session admin ; les messages ne sont acceptés
// que du parent same-origin.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import HeroCarousel from "../components/HeroCarousel";
import { sanitizeHeroConfig } from "../lib/heroSchema";
import type { ResolvedHeroSlide } from "../lib/heroResolve";
import { HERO_FRAME_SOURCE, HERO_STUDIO_SOURCE } from "../lib/heroStudio";

export default function HeroPreviewFrame() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [slide, setSlide] = useState<ResolvedHeroSlide | null>(null);

  useEffect(() => {
    supabase.rpc("is_admin").then(
      ({ data }) => setOk(!!data),
      () => setOk(false),
    );
  }, []);

  useEffect(() => {
    if (!ok) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent)
        return;
      const m = e.data;
      if (!m || m.source !== HERO_STUDIO_SOURCE || m.type !== "set" || !m.slide)
        return;
      setSlide({ ...m.slide, config: sanitizeHeroConfig(m.slide.config) });
      const dark = m.theme === "dark";
      document.documentElement.setAttribute(
        "data-theme",
        dark ? "dark" : "light",
      );
      document.documentElement.style.background = dark ? "#121110" : "#fafaf8";
    };
    window.addEventListener("message", onMsg);
    window.parent.postMessage(
      { source: HERO_FRAME_SOURCE, type: "ready" },
      window.location.origin,
    );
    return () => window.removeEventListener("message", onMsg);
  }, [ok]);

  // Rapporte le rectangle réel du cadre hero (le studio y ancre ses poignées CTA).
  useEffect(() => {
    if (!ok || !slide) return;
    const el = document.querySelector(".hero-box");
    const report = () => {
      const box = document.querySelector(".hero-box");
      if (!box) return;
      const r = box.getBoundingClientRect();
      window.parent.postMessage(
        {
          source: HERO_FRAME_SOURCE,
          type: "rect",
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        },
        window.location.origin,
      );
    };
    report();
    const ro = new ResizeObserver(report);
    if (el) ro.observe(el);
    window.addEventListener("resize", report);
    const t = setTimeout(report, 300);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", report);
      clearTimeout(t);
    };
  }, [ok, slide]);

  if (!ok || !slide) return null;
  return (
    <div style={{ minHeight: "100vh", background: "var(--color-bg)" }}>
      <HeroCarousel slides={[slide]} loading={false} onSlideAction={() => {}} />
    </div>
  );
}
