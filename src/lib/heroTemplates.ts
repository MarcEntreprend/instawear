// src/lib/heroTemplates.ts — gabarits de slides studio (lot 7, 02 Templates).
// Un clic = config complète, toujours via sanitize (idempotents, testés).
// « Partir de… » remplace la config courante (annulable : historique).
import {
  sanitizeHeroConfig,
  type HeroConfig,
} from "./heroSchema";

export interface HeroTemplate {
  id: string;
  label: string;
  hint: string;
  build: () => HeroConfig;
}

function base(over: unknown): HeroConfig {
  return sanitizeHeroConfig({
    v: 1,
    origin: "studio",
    sizing: {
      mode: "fixed",
      width: "full",
      height: { unit: "vh", value: 78 },
    },
    background: {
      gradient:
        "linear-gradient(135deg, #1a1712 0%, #242019 60%, #1a1712 100%)",
    },
    layers: [],
    ctas: [],
    ...(over as Record<string, unknown>),
  });
}

export const HERO_TEMPLATES: HeroTemplate[] = [
  {
    id: "promo-produit",
    label: "Promo produit",
    hint: "Visuel plein cadre + texte à gauche (historique).",
    build: () =>
      base({
        layers: [
          {
            type: "image",
            src: null,
            alt: "",
            fit: "cover",
            dim: 0.55,
            scrim: "left",
          },
          {
            type: "text",
            anchor: "left-middle",
            tone: "light",
            tag: "⚡ PROMOTION",
            showTag: true,
            headline: "",
            headlineLines: "all",
            sub: "",
            showSub: true,
            fromProduct: true,
          },
        ],
        ctas: [
          { id: "cta-1", label: "Discover", link: null, style: "accent", pos: null },
        ],
      }),
  },
  {
    id: "annonce-image",
    label: "Annonce image",
    hint: "Visuel custom + titre bas-gauche + bouton positionné.",
    build: () =>
      base({
        layers: [
          {
            type: "image",
            src: null,
            alt: "",
            fit: "cover",
            dim: 1,
            scrim: "bottom",
          },
          {
            type: "text",
            anchor: "bottom-left",
            tone: "light",
            tag: "",
            showTag: false,
            headline: "",
            headlineLines: "first",
            sub: "",
            showSub: false,
            fromProduct: true,
          },
        ],
        ctas: [
          {
            id: "cta-1",
            label: "Discover",
            link: null,
            style: "accent",
            pos: { desktop: { x: 96, y: 82 }, mobile: { x: 96, y: 84 } },
          },
        ],
      }),
  },
  {
    id: "grille-tuiles",
    label: "Grille 3 tuiles",
    hint: "Visuel principal + jusqu'à 3 tuiles liées.",
    build: () =>
      base({
        layers: [
          {
            type: "tiles",
            main: {
              src: null,
              link: null,
              label: "",
              ctaLabel: "Discover",
              fromProduct: true,
            },
            items: [],
          },
        ],
        ctas: [],
      }),
  },
  {
    id: "autonome-texte",
    label: "Autonome texte",
    hint: "Sans image : titre centré sur fond (slide sans produit).",
    build: () =>
      base({
        layers: [
          {
            type: "text",
            anchor: "center",
            tone: "light",
            tag: "",
            showTag: false,
            headline: "Titre",
            headlineLines: "all",
            sub: "",
            showSub: false,
            fromProduct: false,
          },
        ],
        ctas: [
          { id: "cta-1", label: "Discover", link: null, style: "accent", pos: null },
        ],
      }),
  },
];
