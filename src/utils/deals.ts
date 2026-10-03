// src/utils/deals.ts
// État "deal en cours" PAR PRODUIT (pur, testable en node).
// Remplace l'ancien latch global `dealExpired` qui tuait TOUS les deals
// quand UNE promo expirait + faisait flicker la pastille LIMITED (intervalle
// relançant des fades à chaque seconde via closure périmée).
// Règle : deal actif + prix promo > 0 + (pas de fin OU fin dans le futur).
// Fonction monotone du temps : aucune transition reversible, donc aucun
// flicker possible. Le tick 1s existant (App) fournit le re-render.
export interface DealLike {
  dealActive?: boolean | null;
  dealPrice?: number | null;
  dealEndsAt?: string | null;
}

export function isDealLive(p: DealLike | null | undefined, now?: number): boolean {
  if (!p || p.dealActive !== true) return false;
  if (typeof p.dealPrice !== "number" || !(p.dealPrice > 0)) return false;
  if (p.dealEndsAt == null || p.dealEndsAt === "") return true;
  const end = new Date(p.dealEndsAt).getTime();
  if (!Number.isFinite(end)) return false;
  return end > (now ?? Date.now());
}
