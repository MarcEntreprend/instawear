// src/utils/gallery.ts
// Règle de déduplication de la galerie produit (décision : jamais de
// déduplication auto des visuels AVEC design — chaque variante/doublon
// curaté s'affiche ; seuls les blanks (mockup_image, sans design) sont
// dédupliqués pour éviter le spam + le placeholder est jeté).
// Pur, testable en node (zéro dépendance).

/**
 * Filtre une liste d'images : jette non-chaînes/vides/placeholder,
 * déduplique les blanks (ensemble fourni par l'appelant), GARDE tous les
 * autres même en double (visuels avec design + choix curatés admin).
 */
export function dedupeGallery(
  images: Array<string | null | undefined>,
  blankUrls: Set<string>,
  placeholderUrl: string,
): string[] {
  const seenBlank = new Set<string>();
  const out: string[] = [];
  for (const u of images ?? []) {
    if (typeof u !== "string") continue;
    const t = u.trim();
    if (t.length === 0) continue;
    if (t === placeholderUrl) continue;
    if (blankUrls.has(t)) {
      if (seenBlank.has(t)) continue;
      seenBlank.add(t);
    }
    out.push(t);
  }
  return out;
}
