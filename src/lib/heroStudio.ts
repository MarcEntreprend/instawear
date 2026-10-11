// src/lib/heroStudio.ts — logique PURE du studio (modèles, miroir legacy, contrôles).
import {
  buildHeroConfigFromLegacy,
  sanitizeHeroConfig,
  HERO_DEFAULT_SIZING,
  HERO_MAX_CTAS,
  type HeroConfig,
  type HeroCta,
  type HeroLayer,
} from "./heroSchema.ts";
import { HERO_BG_FALLBACK } from "./heroStyle.ts";
import { heroQualityWarnings } from "./heroQuality.ts";

export const HERO_PREVIEW_PATH = "/admin/hero-preview";
export const HERO_STUDIO_SOURCE = "hero-studio";
export const HERO_FRAME_SOURCE = "hero-studio-frame";
export const HERO_CONFIG_CAP_BYTES = 20000; // = CHECK SQL hero_promotions_config_check

export const HERO_BG_PRESETS: { label: string; value: string }[] = [
  { label: "Sombre", value: HERO_BG_FALLBACK },
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

const studio = (c: HeroConfig): HeroConfig => ({ ...c, origin: "studio" });
const SAMPLE = {
  headline: "Votre titre\nen deux lignes",
  sub: "Un sous-titre court.",
  cta: "Découvrir",
  tag: "Nouveau",
};

export interface HeroTemplate {
  id: string;
  label: string;
  desc: string;
  build: () => HeroConfig;
}

export const HERO_TEMPLATES: HeroTemplate[] = [
  {
    id: "full",
    label: "Plein cadre",
    desc: "Image en fond, texte à gauche.",
    build: () =>
      studio(
        buildHeroConfigFromLegacy({
          kind: "product",
          layout: "full",
          ...SAMPLE,
        }),
      ),
  },
  {
    id: "split",
    label: "Visuel + carte",
    desc: "Fond de couleur, visuel cadré à droite.",
    build: () =>
      studio(
        buildHeroConfigFromLegacy({
          kind: "product",
          layout: "split",
          bgGradient: HERO_BG_PRESETS[1].value,
          ...SAMPLE,
        }),
      ),
  },
  {
    id: "banner",
    label: "Bannière image",
    desc: "Image seule, titre en bas, bouton à droite.",
    build: () =>
      studio(
        buildHeroConfigFromLegacy({ kind: "image", layout: "full", ...SAMPLE }),
      ),
  },
  {
    id: "grid",
    label: "Grille",
    desc: "Visuel principal + jusqu'à 3 tuiles liées.",
    build: () =>
      studio(
        buildHeroConfigFromLegacy({ kind: "grid", layout: "split", ...SAMPLE }),
      ),
  },
  {
    id: "blank",
    label: "Image seule",
    desc: "Juste une image (idéal pour le slide n°1 / LCP).",
    build: () =>
      sanitizeHeroConfig({
        origin: "studio",
        layers: [
          {
            type: "image",
            src: null,
            alt: "",
            fit: "cover",
            dim: 1,
            scrim: "none",
          },
        ],
        ctas: [],
      }),
  },
];

export function newLayer(type: "image" | "card" | "tiles" | "text"): HeroLayer {
  switch (type) {
    case "image":
      return {
        type: "image",
        src: null,
        alt: "",
        fit: "cover",
        dim: 1,
        scrim: "none",
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
          ctaLabel: "Découvrir",
          fromProduct: true,
        },
        items: [],
      };
    default:
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
        fromProduct: false,
      };
  }
}

export function newCta(): HeroCta {
  return {
    id: `cta-${Math.random().toString(36).slice(2, 7)}`,
    label: "Découvrir",
    link: null,
    style: "accent",
    pos: null,
  };
}

function layerOf<T extends HeroLayer["type"]>(c: HeroConfig, type: T) {
  return c.layers.find(
    (l): l is Extract<HeroLayer, { type: T }> => l.type === type,
  );
}

// ─── Miroir legacy (prerender du slide 0 + anciennes lectures) ───────────
export interface HeroLegacyMirror {
  kind: "product" | "image" | "grid";
  layout: "full" | "split";
  headline: string;
  sub: string;
  tag: string;
  showTag: boolean;
  cta: string;
  linkUrl: string | null;
  bgGradient: string;
  image: string;
  tiles: { image: string; label?: string; link?: string }[];
}

export function heroConfigToLegacy(c: HeroConfig): HeroLegacyMirror {
  const img = layerOf(c, "image");
  const card = layerOf(c, "card");
  const tiles = layerOf(c, "tiles");
  const text = layerOf(c, "text");
  const cta = c.ctas[0];
  let kind: HeroLegacyMirror["kind"] = "product";
  let layout: HeroLegacyMirror["layout"] = "full";
  if (tiles) {
    kind = "grid";
    layout = "split";
  } else if (card) {
    layout = "split";
  } else if (img && img.scrim === "bottom") {
    kind = "image";
  }
  return {
    kind,
    layout,
    headline: text?.headline ?? "",
    sub: text?.sub ?? "",
    tag: text?.tag ?? "",
    showTag: text?.showTag ?? true,
    cta: cta?.label ?? tiles?.main?.ctaLabel ?? "",
    linkUrl: cta?.link ?? tiles?.main?.link ?? null,
    bgGradient: c.background.gradient,
    image: tiles?.main?.src ?? img?.src ?? card?.src ?? "",
    tiles: (tiles?.items ?? []).map((t) => ({
      image: t.src,
      label: t.label || undefined,
      link: t.link || undefined,
    })),
  };
}

// ─── Contrôles qualité ───────────────────────────────────────────────────
export interface HeroWarning {
  level: "info" | "warn";
  text: string;
}

export function heroConfigBytes(c: HeroConfig): number {
  return new TextEncoder().encode(JSON.stringify(c)).length;
}

export function heroHasVisual(c: HeroConfig, hasProduct: boolean): boolean {
  if (
    hasProduct &&
    c.layers.some(
      (l) => l.type === "image" || l.type === "card" || l.type === "tiles",
    )
  ) {
    return true;
  }
  return c.layers.some(
    (l) =>
      (l.type === "image" && !!l.src) ||
      (l.type === "card" && !!l.src) ||
      (l.type === "tiles" && (!!l.main?.src || l.items.length > 0)),
  );
}

export function heroStudioWarnings(
  c: HeroConfig,
  ctx: { isFirst: boolean; hasProduct: boolean },
): HeroWarning[] {
  const w: HeroWarning[] = [];
  if (c.layers.length === 0)
    w.push({ level: "warn", text: "Slide vide : ajoute au moins une couche." });
  else if (!heroHasVisual(c, ctx.hasProduct)) {
    w.push({
      level: "warn",
      text: "Aucun visuel : ajoute une image ou choisis un produit.",
    });
  }
  if (ctx.isFirst) {
    w.push({
      level: "info",
      text: "Les dimensions du slide n°1 s'appliquent à tout le carrousel.",
    });
    if (c.ab) {
      w.push({
        level: "info",
        text: "Slide n°1 limité à une variante A/B : le slide d'amorçage du prerender peut apparaître un instant chez l'autre variante.",
      });
    }
    if (!c.layers.some((l) => l.type === "image")) {
      w.push({
        level: "info",
        text: "Slide n°1 sans image plein cadre : le LCP sera moins bon.",
      });
    }
  }
  for (const cta of c.ctas) {
    if (!cta.link && !ctx.hasProduct) {
      w.push({
        level: "warn",
        text: `« ${cta.label} » n'a pas de destination (lien vide, aucun produit).`,
      });
    }
    const y = Math.max(cta.pos?.desktop.y ?? 0, cta.pos?.mobile?.y ?? 0);
    if (y > 84) {
      w.push({
        level: "info",
        text: `« ${cta.label} » est proche des contrôles du carrousel.`,
      });
    }
  }
  const bytes = heroConfigBytes(c);
  if (bytes > HERO_CONFIG_CAP_BYTES) {
    w.push({
      level: "warn",
      text: `Configuration trop lourde (${bytes} / ${HERO_CONFIG_CAP_BYTES} octets) : enregistrement refusé.`,
    });
  } else if (bytes > HERO_CONFIG_CAP_BYTES * 0.75) {
    w.push({
      level: "info",
      text: `Configuration lourde (${bytes} / ${HERO_CONFIG_CAP_BYTES} octets).`,
    });
  }
  w.push(...heroQualityWarnings(c));
  return w;
}

export function canAddCta(c: HeroConfig): boolean {
  return c.ctas.length < HERO_MAX_CTAS;
}

// ─── Utilitaires ─────────────────────────────────────────────────────────
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function moveItem<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Arrondi 0,5 % + aimantation au centre (50 %) à ±1,5 %. */
export function snapHeroPoint(v: number): number {
  const c = Math.min(100, Math.max(0, v));
  if (Math.abs(c - 50) <= 1.5) return 50;
  return Math.round(c * 2) / 2;
}

/** Zone basse occupée par les contrôles du carrousel (px, miroir du CSS de HeroSlideView). */
export function heroReservedBottomPx(deviceWidth: number): number {
  return deviceWidth >= 640 ? 92 : 76;
}

export { HERO_DEFAULT_SIZING };
