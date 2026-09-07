// src/components/ConfirmationUpsell.tsx — Phase 6 : upsell post-achat
// Friction de paiement déjà tombée = meilleur moment pour compléter le kit.
// Compléments réels (affinité co-achats, hors déjà-achetés), silence si vide.
import { useEffect, useState } from "react";
import type { Product } from "../types";
import StoreProductCard from "./StoreProductCard";
import { merchApi } from "../api/supabaseApi";
import { isMerchEligible } from "../utils/merch";

interface Props {
  purchasedIds: string[];
  products: Product[];
  favorites: string[];
  currencySymbol: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onSelectProduct: (product: Product) => void;
}

export default function ConfirmationUpsell({
  purchasedIds,
  products,
  favorites,
  currencySymbol,
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
}: Props) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    if (purchasedIds.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = new Set(purchasedIds);
        const ranked: Product[] = [];
        // Affinité du premier article acheté (le plus représentatif du panier)
        const ids = await merchApi.affinity(purchasedIds[0], 12).catch(() => [] as string[]);
        const byId = new Map(products.map((p) => [p.id, p]));
        for (const id of ids) {
          const p = byId.get(id);
          if (p && !seen.has(id) && isMerchEligible(p)) {
            ranked.push(p);
            seen.add(id);
          }
          if (ranked.length >= 4) break;
        }
        // Remplissage : même catégorie qu'un article acheté, puis le reste
        if (ranked.length < 4) {
          const boughtCats = new Set(
            purchasedIds
              .map((id) => byId.get(id)?.category)
              .filter(Boolean),
          );
          for (const p of products) {
            if (ranked.length >= 4) break;
            if (seen.has(p.id) || !isMerchEligible(p)) continue;
            if (boughtCats.has(p.category)) {
              ranked.push(p);
              seen.add(p.id);
            }
          }
          for (const p of products) {
            if (ranked.length >= 4) break;
            if (seen.has(p.id) || !isMerchEligible(p)) continue;
            ranked.push(p);
            seen.add(p.id);
          }
        }
        if (!cancelled) setItems(ranked);
      } catch {
        // silence : pas d'upsell plutôt qu'un upsell cassé
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [purchasedIds, products]);

  if (items.length === 0) return null;

  return (
    <div className="w-full mt-8 text-left">
      <p className="eyebrow mb-1">Complete your kit</p>
      <h3
        className="text-lg font-black mb-4"
        style={{ color: "var(--color-ink)" }}
      >
        Frequently bought with your order
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {items.map((p) => (
          <StoreProductCard
            key={p.id}
            product={p}
            isFavorite={favorites.includes(p.id)}
            dealExpired={false}
            dealFadingOut={false}
            countdownStr=""
            currencySymbol={currencySymbol}
            onToggleFavorite={onToggleFavorite}
            onAddToCart={onAddToCart}
            onSelectProduct={onSelectProduct}
          />
        ))}
      </div>
    </div>
  );
}
