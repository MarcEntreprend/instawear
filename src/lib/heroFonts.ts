// src/lib/heroFonts.ts — fontes du hero (lot 10, 02 Font Library).
// Liste fermée (HERO_FONT_FAMILIES), display=swap, chargement à la demande
// avec déduplication. Partie pure testée en node, injection DOM isolée.
import {
  HERO_FONT_FAMILIES,
  cleanHeroFontUrl,
  parseHeroFontUrlFamilies,
} from "./heroSchema";

const STACKS: Record<string, string> = {
  Inter: "'Inter',system-ui,sans-serif",
  Sora: "'Sora',system-ui,sans-serif",
  "Instrument Serif": "'Instrument Serif',Georgia,serif",
  "General Sans": "'General Sans',system-ui,sans-serif",
  "Space Grotesk": "'Space Grotesk',system-ui,sans-serif",
  "JetBrains Mono": "'JetBrains Mono',ui-monospace,monospace",
};

/** Pile CSS pour une famille (fallback système, jamais d'injection). */
export function heroFontStack(family: string): string {
  return STACKS[family] ?? "inherit";
}

/** URL Google Fonts pour N familles (poids usuels, display=swap). */
export function heroFontHref(families: string[]): string | null {
  const known = [...new Set(families)].filter((f) =>
    (HERO_FONT_FAMILIES as readonly string[]).includes(f),
  );
  if (known.length === 0) return null;
  const qs = known
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700;800`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${qs}&display=swap`;
}

/** Injecte le <link> une seule fois (no-op sans DOM / déjà présent).
 *  Échec de chargement => élément retiré, piles système en repli (le
 *  display=swap + fallback évitent le texte invisible dans l'intervalle). */
export function ensureHeroFonts(
  families: string[],
  urls: string[] = [],
): void {
  if (typeof document === "undefined") return;
  const href = heroFontHref(families);
  if (href) injectHeroFontLink("hero-fonts", href);
  const seen = new Set<string>();
  urls
    .map((u) => cleanHeroFontUrl(u))
    .filter((u): u is string => !!u && !seen.has(u) && !!seen.add(u))
    .slice(0, 3) // plafond : pas d'avalanche de <link>
    .forEach((u, i) => injectHeroFontLink(`hero-fonts-custom-${i}`, u));
}

function injectHeroFontLink(id: string, href: string): void {
  if (document.getElementById(id)) return;
  const pre = document.createElement("link");
  pre.rel = "preconnect";
  pre.href = "https://fonts.gstatic.com";
  pre.crossOrigin = "anonymous";
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = href;
  link.onerror = () => link.remove();
  document.head.appendChild(pre);
  document.head.appendChild(link);
}

/** Familles utilisées par des slides (globale + blocs + URLs custom). */
export function heroFontsInUse(
  slides: Array<{
    config?: {
      fontFamily?: string;
      fontUrl?: string;
      layers?: Array<{ type?: string; font?: string }>;
    } | null;
  }>,
): string[] {
  const out = new Set<string>();
  for (const s of slides) {
    const c = s.config;
    if (!c) continue;
    if (c.fontFamily) out.add(c.fontFamily);
    if (c.fontUrl) parseHeroFontUrlFamilies(c.fontUrl).forEach((f) => out.add(f));
    for (const l of c.layers ?? []) {
      if (l.type === "text" && l.font) out.add(l.font);
    }
  }
  return [...out];
}

/** URLs custom utilisées (validées, dédupliquées, max 3). */
export function heroFontUrlsInUse(
  slides: Array<{ config?: { fontUrl?: string } | null }>,
): string[] {
  const out = new Set<string>();
  for (const s of slides) {
    const clean = s.config?.fontUrl
      ? cleanHeroFontUrl(s.config.fontUrl)
      : undefined;
    if (clean) out.add(clean);
    if (out.size >= 3) break;
  }
  return [...out];
}
