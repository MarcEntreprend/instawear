// supabase/functions/sync-printful/_shared/productImages.ts
// Durabilité des mockups générés : un resync (complet ou repair) ne doit
// JAMAIS écraser un visuel généré (storage "product-mockups", design sur
// vêtement) par une valeur matrice (mockup vierge ou aperçu brut).
// Sans ça, chaque synchronisation annule le travail Mockup Studio et la
// boutique oscille indéfiniment entre mockups et visuels par défaut.
//
// Règles par FORME (aucun produit en dur), toutes pures et totales
// (jamais d'exception, entrées hostiles ignorées) :
// - variants : substitution par clé couleur (hex insensible à la casse,
//   repli color_name, comme la fusion P2c) quand le frais n'est pas storage
//   et l'ancien l'est ;
// - color_images : substitution alignée par index via colors[] (même ordre
//   que variants[], par construction de la matrice) ;
// - gallery : union frais + anciens storage absents, plafonnée (jamais vidée
//   par un frais vide) ;
// - image principale : storage existant conservé sauf si le frais en est un.

export function isStorageMockupUrl(u: unknown): boolean {
  return typeof u === "string" && u.includes("/product-mockups/");
}

function colorKey(c: unknown): string {
  return String(c ?? "").trim().toLowerCase();
}

/** Anciens visuels storage indexés par couleur (hex puis nom). */
export function oldImagesByColor(
  existingVariants: unknown,
): Map<string, string> {
  const m = new Map<string, string>();
  if (!Array.isArray(existingVariants)) return m;
  for (const v of existingVariants) {
    if (v == null || typeof v !== "object") continue;
    const rec = v as Record<string, unknown>;
    const img = rec.image;
    if (!isStorageMockupUrl(img)) continue;
    for (const k of [rec.color, rec.color_name]) {
      const key = colorKey(k);
      if (key && !m.has(key)) m.set(key, img as string);
    }
  }
  return m;
}

/** Substitue les visuels non-storage par l'ancien storage de même couleur. */
export function substituteVariantImages(
  freshVariants: unknown,
  oldByColor: Map<string, string>,
): unknown[] {
  if (!Array.isArray(freshVariants)) return [];
  return freshVariants.map((v) => {
    if (v == null || typeof v !== "object") return v;
    const rec = v as Record<string, unknown>;
    if (isStorageMockupUrl(rec.image)) return v;
    const old =
      oldByColor.get(colorKey(rec.color)) ??
      oldByColor.get(colorKey(rec.color_name));
    if (!old) return v;
    return { ...rec, image: old };
  });
}

/** Substitution alignée (color_images[i] <-> colors[i], ordre matrice). */
export function substituteAlignedImages(
  freshUrls: unknown,
  freshColors: unknown,
  oldByColor: Map<string, string>,
): string[] {
  if (!Array.isArray(freshUrls)) return [];
  const colors: unknown[] = Array.isArray(freshColors) ? freshColors : [];
  return freshUrls
    .map((u, i) => {
      if (isStorageMockupUrl(u)) return u as string;
      const old = oldByColor.get(colorKey(colors[i]));
      if (old) return old;
      return typeof u === "string" ? u : "";
    })
    .filter((u): u is string => typeof u === "string" && u.length > 0);
}

/** Union galerie : frais d'abord, anciens storage manquants ensuite,
 *  plafonnée. Frais vide -> null (l'appelant garde l'existant : on ne
 *  vide JAMAIS une galerie). */
export function mergeGalleries(
  fresh: unknown,
  existing: unknown,
  cap: number,
): string[] | null {
  const f = Array.isArray(fresh)
    ? fresh.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];
  if (f.length === 0) return null;
  const seen = new Set<string>(f);
  const out = [...f];
  if (Array.isArray(existing)) {
    for (const u of existing) {
      if (typeof u !== "string" || u.length === 0) continue;
      if (!isStorageMockupUrl(u)) continue;
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
  }
  return out.slice(0, Math.max(1, Math.floor(cap) || 20));
}

/** Image principale : storage (frais ou existant) gagne toujours. Retourne
 *  null si rien à changer (l'appelant garde sa valeur). */
export function preferStoredMain(
  fresh: unknown,
  existing: unknown,
): string | null {
  if (isStorageMockupUrl(fresh)) return fresh as string;
  if (
    typeof fresh === "string" &&
    fresh.length > 0 &&
    isStorageMockupUrl(existing)
  ) {
    return existing as string;
  }
  return null;
}
