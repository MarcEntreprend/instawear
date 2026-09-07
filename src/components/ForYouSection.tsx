// src/components/ForYouSection.tsx — Phase 6 : "Pour vous" (connectés uniquement)
// 100% client-side : favoris + récemment vus → mêmes catégories/events.
// Masquée s'il n'y a pas assez de signal (jamais de section vide).
import { useMemo } from "react";
import type { Product } from "../types";
import StoreProductCard from "./StoreProductCard";
import { isMerchEligible } from "../utils/merch";

interface Props {
  products: Product[];
  favoriteIds: string[];
  recentlyIds: string[];
  favorites: string[];
  dealExpired: boolean;
  dealFadingOut: boolean;
  countdownString: string;
  currencySymbol: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onSelectProduct: (product: Product) => void;
}

export default function ForYouSection({
  products,
  favoriteIds,
  recentlyIds,
  favorites,
  dealExpired,
  dealFadingOut,
  countdownString,
  currencySymbol,
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
}: Props) {
  const picks = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    // Signaux : catégories/events des favoris + vus récemment
    const likedCats = new Set<string>();
    const likedEvents = new Set<string>();
    for (const id of [...favoriteIds, ...recentlyIds]) {
      const p = byId.get(id);
      if (!p) continue;
      if (p.category) likedCats.add(p.category);
      if (p.eventType) likedEvents.add(p.eventType);
    }
    if (likedCats.size === 0 && likedEvents.size === 0) return [];
    const known = new Set([...favoriteIds, ...recentlyIds]);
    const scored = products
      .filter((p) => !known.has(p.id) && isMerchEligible(p))
      .map((p) => ({
        p,
        s:
          (likedCats.has(p.category) ? 2 : 0) +
          (likedEvents.has(p.eventType) ? 1 : 0),
      }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || b.p.boughtLastMonth - a.p.boughtLastMonth)
      .slice(0, 8)
      .map((x) => x.p);
    return scored;
  }, [products, favoriteIds, recentlyIds]);

  if (picks.length < 4) return null;

  return (
    <section className="max-w-350 mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <span className="eyebrow mb-2 block">Picked for you</span>
          <h2
            className="text-2xl sm:text-3xl font-extrabold"
            style={{ color: "var(--color-ink)" }}
          >
            For you
          </h2>
        </div>
      </div>
      <div className="flex sm:grid sm:grid-cols-4 gap-4 sm:gap-6 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {picks.map((product) => (
          <div key={product.id} className="w-[72vw] sm:w-auto shrink-0 sm:shrink">
            <StoreProductCard
              product={product}
              isFavorite={favorites.includes(product.id)}
              dealExpired={dealExpired}
              dealFadingOut={dealFadingOut}
              countdownStr={countdownString}
              currencySymbol={currencySymbol}
              onToggleFavorite={onToggleFavorite}
              onAddToCart={onAddToCart}
              onSelectProduct={onSelectProduct}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
