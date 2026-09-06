// src/utils/merch.ts — Phase 1 Merchandising : garde-fous partagés
// Filtres durs + pins/excludes + anti-répétition. Aucun appel réseau ici.
import { getVariantAvailability } from "../hooks/useProductAvailability";

export interface MerchSectionConfig {
  enabled: boolean;
  pins: string[];
  excludes: string[];
}

/** Éligible au merchandising : actif, en stock, non affilié, ≥1 variante dispo. */
export function isMerchEligible(p: any): boolean {
  if (!p || p.isActive === false || p.inStock === false || p.affiliate_mode) {
    return false;
  }
  try {
    const variants = p.variants;
    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        const sizes = (v && v.sizes) || {};
        for (const sz of Object.keys(sizes)) {
          if (getVariantAvailability(p, v.color, sz) === "available") return true;
        }
      }
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Applique pins (en tête, dans l'ordre) + excludes + dédup anti-répétition,
 * puis complète avec les candidats jusqu'à `limit`.
 */
export function applyMerchList<T extends { id: string }>(
  candidates: T[],
  opts: {
    pins?: string[];
    excludes?: string[];
    excludeIds?: Set<string> | string[];
    limit?: number;
    byId?: (id: string) => T | undefined;
  } = {},
): T[] {
  const { pins = [], excludes = [], limit = 8 } = opts;
  const seen = new Set<string>(
    Array.isArray(opts.excludeIds) ? opts.excludeIds : opts.excludeIds || [],
  );
  const excluded = new Set(excludes);
  const out: T[] = [];

  if (opts.byId) {
    for (const id of pins) {
      if (out.length >= limit) break;
      if (seen.has(id) || excluded.has(id)) continue;
      const found = opts.byId(id);
      if (found) {
        out.push(found);
        seen.add(id);
      }
    }
  }
  for (const c of candidates) {
    if (out.length >= limit) break;
    if (seen.has(c.id) || excluded.has(c.id)) continue;
    out.push(c);
    seen.add(c.id);
  }
  return out;
}

/**
 * Filet anti-vide : si la dédup/excludes a trop réduit la liste, remplit
 * depuis le pool éligible (jamais d'inéligible réintroduit).
 */
export function ensureMin<T extends { id: string }>(
  list: T[],
  pool: T[],
  min: number,
): T[] {
  if (list.length >= min) return list;
  const have = new Set(list.map((x) => x.id));
  for (const c of pool) {
    if (list.length >= min) break;
    if (have.has(c.id)) continue;
    list.push(c);
    have.add(c.id);
  }
  return list;
}
