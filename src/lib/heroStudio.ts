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
  {
    label: "Verre (glass)",
    value:
      "linear-gradient(135deg, rgba(255,255,255,.16) 0%, rgba(255,255,255,.04) 40%, rgba(20,18,14,.6) 100%)",
  },
  {
    label: "Maille (mesh)",
    value:
      "linear-gradient(135deg, #2b1a3a 0%, transparent 60%), linear-gradient(45deg, #c2452a 0%, transparent 55%), linear-gradient(200deg, #1c2340 0%, #0f0d0a 85%)",
  },
  {
    label: "Grain (noise SVG, ~350 o)",
    value:
      "linear-gradient(135deg, #211d16 0%, #171411 100%), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
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
  { value: "hotspot", label: "Pastille (hotspot)" },
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
    case "marquee":
      return {
        type: "marquee",
        text: "",
        speed: 20,
        direction: "left",
        tone: "dark",
      };
    case "countdown":
      return {
        type: "countdown",
        targetAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        label: "",
        tone: "dark",
        expiredText: "C'est parti !",
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

// ─── Historique undo/redo (pur, l'éditeur ne garde que l'état courant) ──
export interface HeroHistory {
  past: HeroConfig[];
  present: HeroConfig;
  future: HeroConfig[];
  /** Dernier push (ms) : coalescence de la frappe rapide. */
  lastPush: number;
}

export const HERO_HISTORY_MAX = 20;
export const HERO_HISTORY_COALESCE_MS = 800;

export function heroHistoryInit(config: HeroConfig): HeroHistory {
  return { past: [], present: config, future: [], lastPush: 0 };
}

/** Pousse un état (coalescé si < 800 ms : la frappe reste 1 entrée). */
export function heroHistoryPush(
  h: HeroHistory,
  next: HeroConfig,
  now: number = Date.now(),
): HeroHistory {
  const coalesce =
    h.past.length > 0 && now - h.lastPush < HERO_HISTORY_COALESCE_MS;
  const past = coalesce ? h.past : [...h.past, h.present];
  return {
    past: past.slice(-HERO_HISTORY_MAX),
    present: next,
    future: [],
    lastPush: now,
  };
}

export function heroHistoryUndo(h: HeroHistory): HeroHistory {
  if (h.past.length === 0) return h;
  const prev = h.past[h.past.length - 1];
  return {
    past: h.past.slice(0, -1),
    present: prev,
    future: [h.present, ...h.future].slice(0, HERO_HISTORY_MAX),
    lastPush: 0,
  };
}

export function heroHistoryRedo(h: HeroHistory): HeroHistory {
  if (h.future.length === 0) return h;
  const [next, ...rest] = h.future;
  return {
    past: [...h.past, h.present].slice(-HERO_HISTORY_MAX),
    present: next,
    future: rest,
    lastPush: 0,
  };
}

export { HERO_DEFAULT_SIZING };
