// src/admin/HeroPreviewFrame.tsx — page chargée DANS l'iframe d'aperçu du studio.
// Garde admin : rien ne s'affiche sans session admin ; les messages ne sont acceptés
// que du parent same-origin.
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import HeroCarousel from "../components/HeroCarousel";
import { mountHeroHtml } from "../components/HeroHtmlBlock";
import { sanitizeHeroConfig } from "../lib/heroSchema";
import type { ResolvedHeroSlide } from "../lib/heroResolve";
import { HERO_FRAME_SOURCE, HERO_STUDIO_SOURCE } from "../lib/heroStudio";

/** Mesure la hauteur du HTML à une largeur donnée (dans un conteneur hors écran). */
async function measureHtml(m: {
  id: number;
  html: string;
  css: string;
  width: number;
}) {
  const reply = (height: number | null) =>
    window.parent.postMessage(
      { source: HERO_FRAME_SOURCE, type: "measured", id: m.id, height },
      window.location.origin,
    );
  const w = Math.max(200, Math.min(2400, Number(m.width) || 1280));
  const wrap = document.createElement("div");
  wrap.style.cssText = `position:fixed;left:-99999px;top:0;width:${w}px;visibility:hidden;pointer-events:none;`;
  const inner = document.createElement("div");
  // Les styles posés ici l'emportent sur les règles :host du shadow root.
  inner.style.cssText =
    "position:relative;inset:auto;overflow:visible;contain:none;width:100%;";
  wrap.appendChild(inner);
  document.body.appendChild(wrap);
  try {
    await mountHeroHtml(inner, String(m.html ?? ""), String(m.css ?? ""));
    const imgs = Array.from(inner.shadowRoot?.querySelectorAll("img") ?? []);
    imgs.forEach((im) => {
      im.loading = "eager"; // hors écran, un lazy ne se chargerait jamais
    });
    await Promise.race([
      Promise.all(
        imgs.map((im) =>
          im.complete
            ? null
            : new Promise<void>((r) => {
                im.addEventListener("load", () => r(), { once: true });
                im.addEventListener("error", () => r(), { once: true });
              }),
        ),
      ),
      new Promise((r) => setTimeout(r, 1500)),
    ]);
    const h = Math.round(inner.getBoundingClientRect().height);
    reply(h > 0 ? h : null);
  } catch {
    reply(null);
  } finally {
    wrap.remove();
  }
}

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
      if (!m || m.source !== HERO_STUDIO_SOURCE) return;
      if (m.type === "measure") {
        void measureHtml(m);
        return;
      }
      if (m.type !== "set" || !m.slide) return;
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
