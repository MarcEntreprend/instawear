// src/lib/heroQuality.ts — PUR : contrôles de lisibilité et d'accessibilité d'un slide (avertissements du studio).
import type { HeroConfig, HeroLayer } from "./heroSchema.ts";
import { heroBackground, isLightHeroBg } from "./heroStyle.ts";

export interface QualityWarning {
  level: "info" | "warn";
  text: string;
}

type RGB = [number, number, number];
/** Encre sombre FIXE (indépendante du thème) : les dégradés du hero ne changent pas avec le thème. */
const DARK_INK: RGB = [26, 25, 22]; // #1a1916
const WHITE: RGB = [255, 255, 255];

/** Couleurs #hex (3 ou 6 chiffres) d'un dégradé. rgba()/hsl() sont ignorés. */
export function gradientColors(g: string): RGB[] {
  const out: RGB[] = [];
  for (const m of String(g ?? "").matchAll(
    /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
  )) {
    let h = m[1];
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    out.push([
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ]);
  }
  return out;
}

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
export function luminance([r, g, b]: RGB): number {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
/** Rapport de contraste WCAG (1 à 21). */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
/** Pire contraste de l'encre sur toutes les couleurs du dégradé (null = aucune couleur #hex). */
export function worstContrast(gradient: string, ink: RGB): number | null {
  const cs = gradientColors(gradient);
  return cs.length ? Math.min(...cs.map((c) => contrastRatio(c, ink))) : null;
}

type TextLayer = Extract<HeroLayer, { type: "text" }>;
type ImageLayer = Extract<HeroLayer, { type: "image" }>;

export function heroQualityWarnings(c: HeroConfig): QualityWarning[] {
  const w: QualityWarning[] = [];
  const layers = c.layers.filter((l) => !l.off);
  const fill = layers.find((l): l is ImageLayer => l.type === "image");
  const bg = heroBackground(c.background.gradient);
  const lightBg = !fill && isLightHeroBg(bg);
  const texts = layers.filter((l): l is TextLayer => l.type === "text");

  for (const t of texts) {
    const dark = t.tone === "dark" || (t.tone === "auto" && lightBg);
    if (!fill) {
      const ratio = worstContrast(bg, dark ? DARK_INK : WHITE);
      const hasSub = t.showSub && (t.sub.trim() !== "" || t.fromProduct);
      if (ratio !== null && ratio < 3) {
        w.push({
          level: "warn",
          text: `Texte ${dark ? "sombre" : "clair"} peu lisible sur ce fond (contraste ${ratio.toFixed(1)}:1, minimum 3:1 pour un grand titre). Passe le texte en ${dark ? "clair" : "sombre"} ou change le fond.`,
        });
      } else if (ratio !== null && ratio < 4.5 && hasSub) {
        w.push({
          level: "info",
          text: `Sous-titre sous 4,5:1 sur ce fond (${ratio.toFixed(1)}:1) : assombris ou éclaircis le fond, ou retire le sous-titre.`,
        });
      }
    } else if (!dark && fill.dim >= 0.9 && fill.scrim === "none") {
      w.push({
        level: "info",
        text: "Texte clair sur une image sans voile : vérifie la lisibilité (ajoute un voile gauche ou bas).",
      });
    }
  }

  const hasTitle = texts.some((t) => t.headline.trim() !== "" || t.fromProduct);
  if (
    !hasTitle &&
    layers.some(
      (l) => (l.type === "image" || l.type === "card") && !l.alt.trim(),
    )
  ) {
    w.push({
      level: "warn",
      text: "Image sans texte alternatif et sans titre visible : un lecteur d'écran n'aura rien à lire. Renseigne le texte alternatif.",
    });
  }

  for (const cta of c.ctas.filter((x) => !x.off)) {
    if (cta.label.length > 28) {
      w.push({
        level: "info",
        text: `Le libellé « ${cta.label.slice(0, 20)}… » est long : sur mobile il risque de passer sur deux lignes.`,
      });
    }
  }
  return w;
}
