// src/utils/colors.ts — helpers couleur partagés (frontstore).
// Évite les imports circulaires (CatalogSection <-> StoreProductCard).

/** Normalise un hex (casse, #rgb → #rrggbb). "" si invalide. */
export function normHex(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let h = raw.trim().toLowerCase();
  if (!h) return "";
  if (!h.startsWith("#")) h = `#${h}`;
  const short = /^#([0-9a-f]{3})$/i.exec(h);
  if (short) {
    h = `#${short[1].split("").map((c) => `${c}${c}`).join("")}`;
  }
  return /^#[0-9a-f]{6}$/.test(h) ? h : "";
}

/** "rgb(r, g, b)" depuis un hex (normalisé d'abord). "" si invalide. */
export function hexToRgb(raw: unknown): string {
  const hex = normHex(raw);
  if (!hex) return "";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// ── Familles de couleurs (filtre groupé, façon Zara/H&M/Shopify) ───────────
// Le groupement se fait sur le HEX RÉEL (Printful color_code), jamais sur le
// nom ("Stone", "Athletic Heather"...) : aucun dictionnaire de noms à
// maintenir, les futurs produits sont classés automatiquement.

export interface ColorFamily {
  slug: string;
  label: string;
  /** Pastille de repli (la vraie pastille = hex le plus fréquent). */
  swatch: string;
}

/** 12 familles façon stores (libellés EN : frontstore anglophone). */
export const COLOR_FAMILIES: ColorFamily[] = [
  { slug: "black", label: "Black", swatch: "#1a1a1a" },
  { slug: "white", label: "White", swatch: "#ffffff" },
  { slug: "grey", label: "Grey", swatch: "#8a8d91" },
  { slug: "beige", label: "Beige", swatch: "#d8c49a" },
  { slug: "brown", label: "Brown", swatch: "#6b4a2f" },
  { slug: "red", label: "Red", swatch: "#c0392b" },
  { slug: "orange", label: "Orange", swatch: "#e67e22" },
  { slug: "yellow", label: "Yellow", swatch: "#f1c40f" },
  { slug: "green", label: "Green", swatch: "#2e7d46" },
  { slug: "blue", label: "Blue", swatch: "#2c5fa8" },
  { slug: "purple", label: "Purple", swatch: "#7d3c98" },
  { slug: "pink", label: "Pink", swatch: "#e78fb3" },
];

export function isColorFamilySlug(v: unknown): v is string {
  return (
    typeof v === "string" &&
    COLOR_FAMILIES.some((f) => f.slug === v.trim().toLowerCase())
  );
}

export function familyBySlug(slug: string): ColorFamily | null {
  return COLOR_FAMILIES.find((f) => f.slug === slug) || null;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

/** Hex → HSL (h 0-360, s/l 0-1). null si invalide. */
export function hexToHsl(raw: unknown): Hsl | null {
  const hex = normHex(raw);
  if (!hex) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

/**
 * Famille d'un hex (slug) ou null si invalide. Pure + déterministe :
 * - quasi-noir / quasi-blanc d'abord ;
 * - désaturés (heather, stone, chinés) → black/grey/white par lightness ;
 * - saturés sombres : la teinte prime (navy → blue), sauf noir franc ;
 * - zone terre (orange-jaune) : beige vs marron vs vifs (jaune/orange) ;
 * - olive/kaki ternes → green, bordeaux → red.
 */
export function classifyColorFamily(raw: unknown): string | null {
  const hsl = hexToHsl(raw);
  if (!hsl) return null;
  const { h, s, l } = hsl;
  if (l < 0.07) return "black";
  if (l > 0.94 && s < 0.3) return "white";
  // Désaturés : heather, stone, gris chinés → échelle de gris.
  if (s < 0.12) {
    if (l < 0.16) return "black";
    if (l > 0.9) return "white";
    return "grey";
  }
  if (l < 0.1) return "black";
  // Zone terre 18-58° : beige / marron / vifs.
  if (h >= 18 && h < 58) {
    if (l >= 0.55 && s < 0.6) return "beige";
    if (l < 0.38) return "brown";
    if (s >= 0.55) return h < 42 ? "orange" : "yellow";
    return l >= 0.45 ? "beige" : "brown";
  }
  if (h < 12 || h >= 345) return "red";
  if (h < 42) return "orange";
  // Jaunes ternes (olive/kaki) → green, jaunes francs → yellow.
  // Olives sombres (hue ~60, clairs) → green ; jaune pur (clair) → yellow.
  if (h < 70) {
    if (h >= 58 && l < 0.4) return "green";
    return s < 0.55 ? "green" : "yellow";
  }
  if (h < 168) return "green";
  if (h < 258) return "blue";
  if (h < 292) return "purple";
  return "pink";
}

/**
 * Valeur du param URL `color` : hex exact (rétro-compat) ou slug de famille.
 * null si ni l'un ni l'autre (lien pourri → pas de filtre, jamais de crash).
 */
export function parseColorParam(raw: string | null): string | null {
  if (!raw) return null;
  const hex = normHex(raw);
  if (hex) return hex;
  const slug = raw.trim().toLowerCase();
  return isColorFamilySlug(slug) ? slug : null;
}

/**
 * Un produit (ses hex) matche-t-il le filtre couleur (hex exact ou famille) ?
 * Filtre vide → true (l'appelant a déjà testé sa présence, comme avant).
 */
export function colorFilterMatches(
  colors: string[] | null | undefined,
  filter: string | null | undefined,
): boolean {
  if (!filter) return true;
  const list = Array.isArray(colors) ? colors : [];
  const hex = normHex(filter);
  if (hex) return list.some((c) => normHex(c) === hex);
  if (isColorFamilySlug(filter))
    return list.some((c) => classifyColorFamily(c) === filter);
  return false;
}

interface VariantLike {
  color?: string;
  color_name?: string;
  image?: string;
}

/**
 * Image de la variante correspondant à une couleur active (filtre).
 * Match hex normalisé d'abord, nom insensible à la casse ensuite.
 * null si introuvable ou sans image → l'appelant garde l'image par défaut.
 */
export function variantImageForColor(
  variants: VariantLike[] | undefined | null,
  colors: string[] | undefined | null,
  colorNames: string[] | undefined | null,
  targetHex: string | null | undefined,
): string | null {
  const target = normHex(targetHex);
  if (!target) return null;
  const list = Array.isArray(variants) ? variants : [];
  const byHex = list.find((v) => normHex(v.color) === target);
  if (byHex?.image) return byHex.image;
  // Fallback nom : la variante dont le nom matche (ex: données sans hex fiable)
  const allNames: string[] = Array.isArray(colorNames) ? colorNames : [];
  const nameIdx = (Array.isArray(colors) ? colors : []).findIndex(
    (c) => normHex(c) === target,
  );
  const wantedName =
    nameIdx >= 0 && typeof allNames[nameIdx] === "string"
      ? allNames[nameIdx].trim().toLowerCase()
      : "";
  if (wantedName) {
    const byName = list.find(
      (v) =>
        typeof v.color_name === "string" &&
        v.color_name.trim().toLowerCase() === wantedName &&
        v.image,
    );
    if (byName?.image) return byName.image;
  }
  // Dernier recours : image alignée à l'index couleur (parallèle colors[])
  if (nameIdx >= 0 && list[nameIdx]?.image) return list[nameIdx].image as string;
  return null;
}
