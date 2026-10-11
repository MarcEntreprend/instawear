// src/lib/heroTracking.ts — événements du hero (impression, clic). Passe par track() :
// batch, keepalive et GARDE DE CONSENTEMENT inchangés (rien n'est envoyé sans acceptation).
import { track, getVariant } from "./engagement";

// 1 impression par slide ET par chargement de page (comme les impressions de sections).
const seen = new Set<string>();

export function trackHeroImpression(slideId: string, pos: number): void {
  if (slideId === "lead") return; // slide d'amorçage du prerender : jamais mesuré
  if (typeof document !== "undefined" && document.visibilityState !== "visible")
    return;
  if (seen.has(slideId)) return;
  seen.add(slideId);
  track("hero_impression", "hero_slide", slideId, { v: getVariant(), pos });
}

export function trackHeroClick(
  slideId: string,
  kind: "cta" | "tile" | "main" | "html",
  key?: string,
): void {
  if (slideId === "lead") return;
  track("hero_click", "hero_slide", slideId, {
    v: getVariant(),
    kind,
    cta: key ?? kind,
  });
}
