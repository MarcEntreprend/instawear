// src/lib/heroStyle.ts — helpers de style hero PURS (carrousel, admin, tests).
// Les imports internes portent l'extension .ts : ce fichier est importé par les tests node.
import { cleanHeroLink } from "./heroSchema.ts";

/** Fond hero par défaut. */
export const HERO_BG_FALLBACK =
  "linear-gradient(135deg, #1a1712 0%, #242019 60%, #1a1712 100%)";

/** Fond clair ? (texte sombre). */
export function isLightHeroBg(g?: string): boolean {
  if (!g) return false;
  const lightMarkers = [
    "#faf7f0",
    "#f3ece0",
    "#f0b13d",
    "#f7d789",
    "#ffffff",
    "#fff",
  ];
  const low = g.toLowerCase();
  return lightMarkers.some((m) => low.includes(m));
}

/** Lien hero saisi → chemin interne, ou "" (miroir de cleanHeroLink). */
export function normalizeHeroLink(v: unknown): string {
  return cleanHeroLink(v) ?? "";
}

/** Ne retient que ce qui ressemble à du CSS réel, sinon fallback. */
export function heroBackground(g?: string): string {
  if (g && (g.includes("(") || g.startsWith("#") || g.startsWith("var(--"))) {
    return g;
  }
  return HERO_BG_FALLBACK;
}
