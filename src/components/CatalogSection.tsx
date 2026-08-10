// src/components/CatalogSection.tsx

import { Sparkles, X, SlidersHorizontal } from "lucide-react";
import StoreProductCard from "./StoreProductCard";
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

export default function CatalogSection({
  filteredProducts,
  loadingProducts,
  networkError = false,
  favorites,
  dealExpired,
  dealFadingOut,
  countdownString,
  currencySymbol,
  showDeliveryInfo = false,
  getDeliverEstimateString,
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
  return (
    <section
      id="section-catalog"
      className="section-container w-full px-4 scroll-mt-28"
    >
      {/* En-tete de section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-5 border-b border-gray-200">
        <div>
          <span className="eyebrow mb-2">
            <Sparkles className="w-3 h-3" /> New season
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl leading-none text-gray-900">
            The Collection
          </h2>
          <p className="text-xs text-gray-500 mt-2">
            T-Shirts, Hoodies &amp; Event Accessories
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>
            <span className="text-gray-900 font-black">
              {filteredProducts.length}
            </span>{" "}
            items
          </span>
        </div>
      </div>

      {/* Filtres actifs */}
      {(searchTerm || selectedCategory || selectedEventType) && (
        <div
          id="section-filters"
          className="scroll-mt-36 mb-6 bg-white border border-gray-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400 font-medium">Active filters:</span>
            {searchTerm && (
              <span className="chip bg-gray-100 text-gray-900 gap-1.5">
                &quot;{searchTerm}&quot;
                <X
                  className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 cursor-pointer"
                  onClick={() => setSearchTerm("")}
                />
              </span>
            )}
            {selectedCategory && (
              <span className="chip uppercase bg-gray-100 text-gray-900 gap-1.5">
                {selectedCategory}
                <X
                  className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 cursor-pointer"
                  onClick={() => setSelectedCategory(null)}
                />
              </span>
            )}
            {selectedEventType && (
              <span className="chip uppercase bg-gray-100 text-gray-900 gap-1.5">
                {selectedEventType}
                <X
                  className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 cursor-pointer"
                  onClick={() => setSelectedEventType(null)}
                />
              </span>
            )}
          </div>
          <button
            onClick={onClearFilters}
            className="text-xs text-rose-400 hover:text-rose-600 font-extrabold hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Chargement */}
      {loadingProducts ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl overflow-hidden border border-gray-200/70"
            >
              <div className="aspect-4/5 skeleton" />
              <div className="p-3.5 space-y-2">
                <div className="h-2.5 w-1/3 rounded-full skeleton" />
                <div className="h-3 w-4/5 rounded-full skeleton" />
                <div className="h-4 w-1/2 rounded-full skeleton" />
              </div>
            </div>
          ))}
        </div>
      ) : networkError ? (
        /* Etat erreur reseau */
        <div className="py-16 text-center border border-dashed border-red-200 rounded-3xl bg-red-50/30 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <img
              src={NO_INTERNET}
              alt="Network error"
              className="w-6 h-6 opacity-50"
            />
          </div>
          <p className="font-bold text-gray-900 mb-1">
            Oops. Something went wrong
          </p>
          <p className="text-gray-500 text-sm mb-4">Please try again later</p>
          <button
            onClick={() => window.location.reload()}
            className="pill-btn pill-btn-accent"
          >
            Try again
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Etat vide */
        <div className="py-16 text-center border border-dashed border-gray-200 rounded-3xl bg-white/40 max-w-lg mx-auto">
          <img
            src={PLACEHOLDER_IMG}
            alt="No results"
            className="w-12 h-12 mx-auto mb-2 opacity-50"
          />
          <p className="font-bold text-gray-900 mb-1">
            No items match your search
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Try adjusting your filters or search for something else.
          </p>
          <button
            onClick={onClearFilters}
            className="pill-btn pill-btn-outline"
          >
            Browse collection
          </button>
        </div>
      ) : (
        /* Grille produits */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.map((product) => (
            <StoreProductCard
              key={product.id}
              product={product}
              isFavorite={favorites.includes(product.id)}
              dealExpired={dealExpired}
              dealFadingOut={dealFadingOut}
              countdownStr={countdownString}
              currencySymbol={currencySymbol}
              onToggleFavorite={onToggleFavorite}
              onAddToCart={onAddToCart}
              onSelectProduct={onSelectProduct}
              showDeliveryInfo={showDeliveryInfo}
              getDeliverEstimateString={getDeliverEstimateString}
            />
          ))}
        </div>
      )}
    </section>
  );
}
