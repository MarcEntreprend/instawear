// src/utils/productRanking.ts
/**
 * Algorithme de tri et scoring des produits pour le storefront InstaWear.
 *
 * Principe : chaque produit reçoit un score basé sur plusieurs signaux
 * (popularité, note, promo, nouveauté, etc.). Le tri par défaut utilise
 * ce score ; les filtres (catégorie, event, recherche) priment toujours.
 *
 * Les poids sont configurables via RANKING_WEIGHTS.
 */

import type { Product } from "../types";

// ────────────────────────────────────────────────────────────────────────
// Configuration des poids — modifier ici pour ajuster le tri
// ────────────────────────────────────────────────────────────────────────
export interface RankingWeights {
  /** Popularité récente (boughtLastMonth) — poids par unité */
  boughtLastMonth: number;
  /** Note moyenne — multiplicateur */
  ratingsScore: number;
  /** Nombre de notes — atténuation (log) */
  ratingsCount: number;
  /** Promotion active — bonus fixe */
  dealActive: number;
  /** Best seller — bonus fixe */
  isBestSeller: number;
  /** Limited time — bonus fixe (urgence) */
  isLimitedTime: number;
  /** Nouveauté — bonus max (décroissance sur 30 jours) */
  novelty: number;
  /** En stock — multiplicateur (0 = masquer, 1 = normal, >1 = boost) */
  inStockMultiplier: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  boughtLastMonth: 0.4,
  ratingsScore: 1.5,
  ratingsCount: 0.8,
  dealActive: 12,
  isBestSeller: 10,
  isLimitedTime: 8,
  novelty: 15,
  inStockMultiplier: 1.0,
};

// ────────────────────────────────────────────────────────────────────────
// Helper : vérifier si une promo est expirée
// ────────────────────────────────────────────────────────────────────────
function isDealExpired(dealEndsAt?: string): boolean {
  if (!dealEndsAt) return false;
  return new Date(dealEndsAt) < new Date();
}

// ────────────────────────────────────────────────────────────────────────
// Helper : calculer l'ancienneté en jours
// ────────────────────────────────────────────────────────────────────────
function daysSince(dateStr?: string): number {
  if (!dateStr) return 999;
  const created = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ────────────────────────────────────────────────────────────────────────
// Calcul du score de nouveauté (décroissance exponentielle sur 30 jours)
// Nouveau = 15 pts, 15 jours = 7.5 pts, 30 jours = ~2 pts, 60+ jours = 0
// ────────────────────────────────────────────────────────────────────────
function noveltyScore(days: number, maxBonus: number): number {
  const halfLife = 15; // jours pour perdre la moitié du bonus
  return maxBonus * Math.pow(0.5, days / halfLife);
}

// ────────────────────────────────────────────────────────────────────────
// Calcul du score pour un produit
// ────────────────────────────────────────────────────────────────────────
export function computeProductScore(
  product: Product,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): number {
  // Filtre de base : produits inactifs = score 0 (ne doivent jamais apparaître)
  if (!product.isActive) return 0;

  // 1. Popularité récente
  const boughtScore = (product.boughtLastMonth ?? 0) * weights.boughtLastMonth;

  // 2. Note moyenne pondérée par le nombre de notes (log pour éviter les outliers)
  const rating = product.ratings?.score ?? 0;
  const count = product.ratings?.count ?? 0;
  const ratingScore =
    rating > 0
      ? rating * weights.ratingsScore * Math.log1p(count) * weights.ratingsCount
      : 0;

  // 3. Promotion active (vérifier la date d'expiration)
  const dealBonus =
    product.dealActive && !isDealExpired(product.dealEndsAt)
      ? weights.dealActive
      : 0;

  // 4. Badges
  const bestSellerBonus = product.isBestSeller ? weights.isBestSeller : 0;
  const limitedTimeBonus = product.isLimitedTime ? weights.isLimitedTime : 0;

  // 5. Nouveauté
  const days = daysSince((product as any).createdAt);
  const novelty = noveltyScore(days, weights.novelty);

  // 6. Disponibilité
  const inStock = product.inStock ?? true;
  const stockMultiplier = inStock ? weights.inStockMultiplier : 0;

  // Score final
  const baseScore =
    boughtScore +
    ratingScore +
    dealBonus +
    bestSellerBonus +
    limitedTimeBonus +
    novelty;

  return stockMultiplier > 0 ? baseScore * stockMultiplier : 0;
}

// ────────────────────────────────────────────────────────────────────────
// Tri intelligent : filtre d'abord, puis trie par score décroissant
// ────────────────────────────────────────────────────────────────────────
export interface FilterState {
  search: string;
  category: string | null;
  eventType: string | null;
  style: string | null;
  inStockOnly: boolean;
  /** true = garder les produits inactifs dans le résultat (vue favoris : grisé). */
  keepInactive?: boolean;
}

export function rankProducts(
  products: Product[],
  filters: FilterState,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): Product[] {
  // 1. Filtrer (y compris isActive)
  const filtered = products.filter((p) => {
    if (!p.isActive && !filters.keepInactive) return false;

    // Filtre stock
    if (filters.inStockOnly && !(p.inStock ?? true)) return false;

    // Filtre catégorie
    if (filters.category && p.category !== filters.category) return false;

    // Filtre événement
    if (filters.eventType && p.eventType !== filters.eventType) return false;

    // Filtre style
    if (filters.style && p.style !== filters.style) return false;

    // Filtre recherche
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchesSearch =
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.style.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    return true;
  });

  // 2. Trier par score décroissant
  const ranked = filtered
    .map((p) => ({ product: p, score: computeProductScore(p, weights) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.product);

  return ranked;
}

// ────────────────────────────────────────────────────────────────────────
// Hook React optionnel (si tu veux déléguer le tri dans un composant)
// ────────────────────────────────────────────────────────────────────────
import { useMemo } from "react";

export function useRankedProducts(
  products: Product[],
  filters: FilterState,
  weights?: RankingWeights,
): Product[] {
  return useMemo(() => {
    return rankProducts(products, filters, weights);
  }, [products, filters, weights]);
}
