// src/lib/heroStudio.ts — helpers PURS de l'éditeur studio (lot 3).
// Factories de couches/CTA, presets de positions, listes d'options,
// config vierge. Tout est normalisé via sanitizeHeroConfig (jamais
// d'exception, jamais d'état invalide persisté). Testé : hero-studio.
import {
  HERO_DEFAULT_SIZING,
  HERO_MAX_CTAS,
  HERO_MAX_LAYERS,
  buildHeroConfigFromLegacy,
  sanitizeHeroConfig,
  type HeroConfig,
  type HeroCta,
  type HeroLayer,
} from "./heroSchema";

/** Mêmes presets que l'ancien formulaire (noms humains, valeurs testées). */
export const HERO_BG_PRESETS: Array<{ label: string; value: string }> = [
  {
    label: "Sombre",
    value: "linear-gradient(135deg, #1a1712 0%, #242019 60%, #1a1712 100%)",
  },
  {
    label: "Crème",
    value: "linear-gradient(135deg, #faf7f0 0%, #f3ece0 60%, #faf7f0 100%)",
  },
  {
    label: "Terracotta",
    value: "linear-gradient(135deg, #c2452a 0%, #e07a4e 60%, #c2452a 100%)",
  },
  {
    label: "Sauge",
    value: "linear-gradient(135deg, #5b6b4f 0%, #8a9b7a 60%, #5b6b4f 100%)",
  },
  {
    label: "Nuit bleue",
    value: "linear-gradient(135deg, #1c2340 0%, #3a4a7a 60%, #1c2340 100%)",
  },
  {
    label: "Sable doré",
    value: "linear-gradient(135deg, #f0b13d 0%, #f7d789 60%, #f0b13d 100%)",
  },
];

export const HERO_ANCHORS = [
  { value: "left-middle", label: "Gauche · milieu" },
  { value: "right-middle", label: "Droite · milieu" },
  { value: "center", label: "Centre" },
  { value: "bottom-left", label: "Bas · gauche" },
] as const;

export const HERO_TONES = [
  { value: "auto", label: "Auto (fond clair → encre sombre)" },
  { value: "light", label: "Clair (texte blanc)" },
  { value: "dark", label: "Sombre (texte encre)" },
] as const;

export const HERO_CTA_STYLES = [
  { value: "accent", label: "Accent" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
  { value: "ghost", label: "Fantôme" },
] as const;

/** Positions CTA : null = en ligne (flux texte, historique). Les % sont
 *  bornés 0..100 par sanitizeHeroConfig ; le rendu translate(-x%,-y%)
 *  garantit zéro débordement, même à 0 % ou 100 %. */
export const HERO_CTA_POSITIONS: Array<{
  id: string;
  label: string;
  pos: HeroCta["pos"];
}> = [
  { id: "inline", label: "En ligne (dans le texte)", pos: null },
  {
    id: "bottom-right",
    label: "Bas · droite",
    pos: { desktop: { x: 96, y: 82 }, mobile: { x: 96, y: 84 } },
  },
  {
    id: "bottom-left",
    label: "Bas · gauche",
    pos: { desktop: { x: 4, y: 84 }, mobile: { x: 4, y: 86 } },
  },
  {
    id: "center",
    label: "Centre",
    pos: { desktop: { x: 50, y: 50 } },
  },
  {
    id: "top-right",
    label: "Haut · droite",
    pos: { desktop: { x: 96, y: 16 } },
  },
  { id: "custom", label: "Personnalisée…", pos: "custom" as unknown as null },
];

export function createHeroLayer(type: HeroLayer["type"]): HeroLayer | null {
  switch (type) {
    case "image":
      return {
        type: "image",
        src: null,
        alt: "",
        fit: "cover",
        dim: 1,
        scrim: "bottom",
      };
    case "card":
      return {
        type: "card",
        side: "right",
        src: null,
        alt: "",
        productId: null,
        showMeta: false,
      };
    case "tiles":
      return {
        type: "tiles",
        main: {
          src: null,
          link: null,
          label: "",
          ctaLabel: "Discover",
          fromProduct: true,
        },
        items: [],
      };
    case "text":
      return {
        type: "text",
        anchor: "left-middle",
        tone: "auto",
        tag: "",
        showTag: true,
        headline: "",
        headlineLines: "all",
        sub: "",
        showSub: true,
        fromProduct: true,
      };
    case "html":
    default:
      // Couche HTML : réservée au lot 4 (super_admin + sandbox).
      return null;
  }
}

export function createHeroCta(index: number): HeroCta {
  return {
    id: `cta-${index + 1}`,
    label: "Discover",
    link: null,
    style: "accent",
    pos: null,
  };
}

/** Déplace un élément (up/down/drag) : nouveau tableau, index bornés. */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  if (from < 0 || from >= next.length) return next;
  const clamped = Math.max(0, Math.min(next.length - 1, to));
  if (clamped === from) return next;
  const [item] = next.splice(from, 1);
  next.splice(clamped, 0, item);
  return next;
}

/** Duplique (clone profond JSON, sûr pour config). */
export function duplicateItem<T>(arr: T[], index: number): T[] {
  if (index < 0 || index >= arr.length) return [...arr];
  const next = [...arr];
  next.splice(
    index + 1,
    0,
    JSON.parse(JSON.stringify(arr[index])) as T,
  );
  return next;
}

/** Toile vierge : le slide historique régénéré, basculé en mode studio.
 *  L'utilisateur part d'un état qui marche, jamais d'une page blanche. */
export function blankStudioConfig(): HeroConfig {
  const c = buildHeroConfigFromLegacy({});
  return sanitizeHeroConfig({ ...c, origin: "studio" });
}

/** Capacités restantes (compteurs pour l'UI, mêmes plafonds que le schéma). */
export function heroStudioCaps(config: HeroConfig): {
  layersLeft: number;
  ctasLeft: number;
} {
  return {
    layersLeft: Math.max(0, HERO_MAX_LAYERS - config.layers.length),
    ctasLeft: Math.max(0, HERO_MAX_CTAS - config.ctas.length),
  };
}

export { HERO_DEFAULT_SIZING };
