// src/utils/accountTabs.ts — navigation onglets compte (pur, testable).
//
// Swipe horizontal = onglet suivant/précédent (cyclique) ; reclic sur
// l'onglet actif = retour en haut + reset (event "account:tab-reset").

/** Onglet suivant/précédent, cyclique. Inconnu -> premier. */
export function cycleTabKey(
  keys: string[],
  current: string,
  dir: 1 | -1,
): string {
  if (keys.length === 0) return current;
  const i = keys.indexOf(current);
  if (i < 0) return keys[0];
  return keys[(i + dir + keys.length) % keys.length];
}

/** Direction d'un swipe horizontal dominant (0 = pas un swipe). */
export function swipeDir(dx: number, dy: number, minX = 60): 1 | -1 | 0 {
  if (Math.abs(dx) < minX || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

/** Onglet depuis ?tab= (partageable, bouton retour). null si absent/invalide. */
export function parseAccountTab(
  search: string,
  validKeys: string[],
): string | null {
  let v: string | null = null;
  try {
    v = new URLSearchParams(search).get("tab");
  } catch {
    return null;
  }
  return v && validKeys.includes(v) ? v : null;
}

/** IDs de commande (ORD-…) trouvés dans un texte, majuscules, uniques. */
export function extractOrderIds(text: string): string[] {
  if (!text) return [];
  const out: string[] = [];
  const re =
    /\b(ord-(?:\d{4}-\d{4,6}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const id = m[1].toUpperCase();
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Commande traçable (suivi public pertinent) ? Exclus : livrée, annulée,
 * remboursée, retournée. Inconnu -> traçable (la modale dégrade gracieusement).
 */
const UNTRACKABLE = new Set([
  "delivered",
  "cancelled",
  "refunded",
  "returned",
]);

export function isTrackableStatus(status: unknown): boolean {
  if (status == null || status === "") return true;
  return !UNTRACKABLE.has(String(status).toLowerCase());
}
