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
