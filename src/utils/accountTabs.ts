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
