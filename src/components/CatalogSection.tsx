// src/components/CatalogSection.tsx — V2 visuals + V1 logic (filteredProducts via rankProducts)
import { useState, useEffect, useRef } from "react";
import { Sparkles, RefreshCw, X, LayoutGrid, List } from "lucide-react";
import StoreProductCard from "./StoreProductCard";
import ProductCardSkeleton from "./skeletons/ProductCardSkeleton";
import type { Product } from "../types";
import { PLACEHOLDER_IMG, NO_INTERNET } from "../constants/assets";

interface CatalogSectionProps {
  filteredProducts: Product[];
  loadingProducts: boolean;
  networkError?: boolean;
  favorites: string[];
  dealExpired: boolean;
  dealFadingOut: boolean;
  countdownString: string;
  currencySymbol: string;
  showDeliveryInfo?: boolean;
  getDeliverEstimateString?: (days: number) => string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onSelectProduct: (product: Product) => void;
  onClearFilters: () => void;
  searchTerm: string;
  selectedCategory: string | null;
  selectedEventType: string | null;
  setSearchTerm: (v: string) => void;
  setSelectedCategory: (v: string | null) => void;
  setSelectedEventType: (v: string | null) => void;
}

const PAGE_SIZE = 12;

export default function CatalogSection({
  filteredProducts,
  loadingProducts,
  networkError = false,
  favorites,
  dealExpired,
  dealFadingOut,
  countdownString,
  currencySymbol,
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
  onClearFilters,
  searchTerm,
  selectedCategory,
  selectedEventType,
  setSearchTerm,
  setSelectedCategory,
  setSelectedEventType,
}: CatalogSectionProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filteredProducts]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredProducts.length));
    }, { rootMargin: "400px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [filteredProducts.length, visibleCount]);

  const displayed = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

  return (
    <section id="section-catalog" className="section-container w-full px-4 scroll-mt-28">
      {/* Header V2 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6 border-b pb-4" style={{ borderColor: "var(--color-border)" }}>
        <div>
          <span className="eyebrow mb-2">Collection</span>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2" style={{ color: "var(--color-ink)" }}>
            <Sparkles className="w-6 h-6" style={{ color: "var(--color-accent)" }} />
            Boutique
          </h2>
          <p className="text-xs mt-1" style={{ color: "var(--color-ink3)" }}>
            T-Shirts, Hoodies & Event Accessories — <span className="font-bold" style={{ color: "var(--color-ink)" }}>{filteredProducts.length}</span> items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode("grid")} className="btn-icon w-9 h-9" data-active={viewMode === "grid"} style={{ background: viewMode === "grid" ? "var(--color-ink)" : "var(--color-surface)", color: viewMode === "grid" ? "var(--color-bg)" : "var(--color-ink2)", borderColor: viewMode === "grid" ? "var(--color-ink)" : "var(--color-border)" }} aria-label="Grid view">
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setViewMode("list")} className="btn-icon w-9 h-9" data-active={viewMode === "list"} style={{ background: viewMode === "list" ? "var(--color-ink)" : "var(--color-surface)", color: viewMode === "list" ? "var(--color-bg)" : "var(--color-ink2)", borderColor: viewMode === "list" ? "var(--color-ink)" : "var(--color-border)" }} aria-label="List view">
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Active filters — chip style V2 */}
      {(searchTerm || selectedCategory || selectedEventType) && (
        <div id="section-filters" className="scroll-mt-36 mb-6 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: "var(--color-ink3)" }}>Active filters:</span>
            {searchTerm && (
              <span className="chip" data-active="true" onClick={() => setSearchTerm("")} style={{ cursor: "pointer" }}>
                Search: "{searchTerm}" <X size={12} />
              </span>
            )}
            {selectedCategory && (
              <span className="chip" data-active="true" onClick={() => setSelectedCategory(null)} style={{ cursor: "pointer" }}>
                {selectedCategory} <X size={12} />
              </span>
            )}
            {selectedEventType && (
              <span className="chip" data-active="true" onClick={() => setSelectedEventType(null)} style={{ cursor: "pointer" }}>
                {selectedEventType} <X size={12} />
              </span>
            )}
          </div>
          <button onClick={onClearFilters} className="text-xs font-bold hover:underline" style={{ color: "var(--color-accent)" }}>Clear all</button>
        </div>
      )}

      {loadingProducts ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : networkError ? (
        <div className="py-16 text-center border border-dashed rounded-2xl max-w-lg mx-auto" style={{ borderColor: "var(--color-negative)", background: "var(--color-negative-bg)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: "var(--color-surface)" }}>
            <img src={NO_INTERNET} alt="" className="w-6 h-6 opacity-50" />
          </div>
          <p className="font-bold mb-1" style={{ color: "var(--color-ink)" }}>Oops! Something went wrong</p>
          <p className="text-sm mb-4" style={{ color: "var(--color-ink3)" }}>Please try again later</p>
          <button onClick={() => window.location.reload()} className="btn btn-accent text-sm">Try again</button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl max-w-lg mx-auto" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <img src={PLACEHOLDER_IMG} alt="" className="w-12 h-12 mx-auto mb-2 opacity-40 rounded-xl" />
          <p className="font-bold mb-1" style={{ color: "var(--color-ink)" }}>No items match your search</p>
          <p className="text-sm mb-4" style={{ color: "var(--color-ink3)" }}>Try adjusting your filters or search for something else!</p>
          <button onClick={onClearFilters} className="btn btn-accent">Browse collection</button>
        </div>
      ) : (
        <>
          <div className={viewMode === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5" : "flex flex-col gap-4"}>
            {displayed.map((product) => (
              <StoreProductCard key={product.id} product={product} isFavorite={favorites.includes(product.id)} dealExpired={dealExpired} dealFadingOut={dealFadingOut} countdownStr={countdownString} currencySymbol={currencySymbol} onToggleFavorite={onToggleFavorite} onAddToCart={onAddToCart} onSelectProduct={onSelectProduct} />
            ))}
          </div>
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-8">
              <button onClick={() => setVisibleCount((c) => Math.min(c + PAGE_SIZE, filteredProducts.length))} className="btn btn-secondary">
                Load more — {filteredProducts.length - visibleCount} remaining
              </button>
            </div>
          )}
          <div ref={hasMore ? undefined : sentinelRef} />
        </>
      )}
    </section>
  );
}
