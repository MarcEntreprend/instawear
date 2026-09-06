// src/pages/PromotionsPage.tsx — V2 visuals, V1 products
import { ChevronLeft } from "lucide-react";
import type { Product } from "../types";
import StoreProductCard from "../components/StoreProductCard";
import { usePageMeta } from "../hooks/usePageMeta";

export default function PromotionsPage({ products, favorites, dealExpired, dealFadingOut, countdownString, currencySymbol, onToggleFavorite, onAddToCart, onSelectProduct, onBack }: {
  products: Product[]; favorites: string[]; dealExpired: boolean; dealFadingOut: boolean; countdownString: string; currencySymbol: string;
  onToggleFavorite: (id: string) => void; onAddToCart: (p: Product, c: string, s: string) => void; onSelectProduct: (p: Product) => void; onBack: () => void;
}) {
  const deals = products.filter((p) => p.dealActive && p.isActive);
  usePageMeta({
    title: "Promotions en cours",
    description: "Offres et deals print-on-demand InstaWear : t-shirts, hoodies et accessoires événementiels en promotion.",
    url: "https://instawear.vercel.app/promotions",
  });
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center gap-2">
        <button onClick={onBack} aria-label="Retour" className="btn-icon w-8 h-8"><ChevronLeft size={15} /></button>
        <span className="text-xs" style={{ color: "var(--color-ink3)" }}>InstaWear / Promotions</span>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <span className="eyebrow">Offres</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 mb-2" style={{ color: "var(--color-ink)" }}>Promotions en cours</h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-ink3)" }}>{deals.length} articles en promotion</p>
        {deals.length === 0 ? (
          <div className="card-premium p-8 text-center"><p className="text-sm" style={{ color: "var(--color-ink3)" }}>Aucune promotion active pour le moment.</p></div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {deals.map((p) => (
              <StoreProductCard key={p.id} product={p} isFavorite={favorites.includes(p.id)} dealExpired={dealExpired} dealFadingOut={dealFadingOut} countdownStr={countdownString} currencySymbol={currencySymbol} onToggleFavorite={onToggleFavorite} onAddToCart={onAddToCart} onSelectProduct={onSelectProduct} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
