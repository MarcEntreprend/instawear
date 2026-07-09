// src/components/CatalogSection.tsx

import { Sparkles, RefreshCw, X } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-(--color-accent) animate-pulse" />
            Collection
          </h2>
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
            <span>T-Shirts, Hoodies & Accessoires Événementiels</span>
            <span className="sm:hidden text-gray-400 font-medium ml-auto">
              ({filteredProducts.length})
            </span>
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-500 hidden sm:block">
          Affichage de{" "}
          <span className="text-gray-900 font-bold">
            {filteredProducts.length}
          </span>{" "}
          articles
        </div>
      </div>

      {/* Filtres actifs */}
      {(searchTerm || selectedCategory || selectedEventType) && (
        <div
          id="section-filters"
          className="scroll-mt-36 mb-4 bg-white/60 border border-gray-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500">Filtres actifs :</span>
            {searchTerm && (
              <span className="bg-gray-100 text-gray-900 font-bold px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1.5">
                Recherche : &quot;{searchTerm}&quot;
                <X
                  className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 cursor-pointer"
                  onClick={() => setSearchTerm("")}
                />
              </span>
            )}
            {selectedCategory && (
              <span className="bg-gray-100 text-gray-900 font-bold px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1.5 uppercase">
                Catégorie : {selectedCategory}
                <X
                  className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 cursor-pointer"
                  onClick={() => setSelectedCategory(null)}
                />
              </span>
            )}
            {selectedEventType && (
              <span className="bg-gray-100 text-gray-900 font-bold px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1.5 uppercase">
                Événement : {selectedEventType}
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
            Effacer tout
          </button>
        </div>
      )}

      {/* Loader */}
      {loadingProducts ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-(--color-accent) animate-spin" />
          <p className="text-gray-500 text-sm">
            Chargement des collections InstaWear...
          </p>
        </div>
      ) : networkError ? (
        <div className="py-16 text-center border border-dashed border-red-200 rounded-2xl bg-red-50/30 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <img
              src={NO_INTERNET}
              alt="Erreur réseau"
              className="w-6 h-6 opacity-50"
            />
          </div>
          <p className="font-bold text-gray-900 mb-1">
            Oups ! Une erreur inattendue s'est produite
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Veuillez réessayer plus tard
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: "var(--color-accent)",
              color: "white",
            }}
          >
            Réessayer
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-white/20 max-w-lg mx-auto">
          <img
            src={PLACEHOLDER_IMG}
            alt="Aucun résultat"
            className="w-12 h-12 mx-auto mb-2 opacity-50"
          />
          <p className="font-bold text-gray-900 mb-1">
            Aucun article ne correspond à votre recherche
          </p>
          <p className="text-gray-500 text-sm mb-4">
            Modifiez vos filtres ou lancez une autre recherche !
          </p>
          <button
            onClick={onClearFilters}
            className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
            style={{
              background: "transparent",
              color: "var(--color-accent)",
              border: "1.5px solid var(--color-accent)",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--color-accent)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-accent)";
            }}
          >
            Voir la collection
          </button>
        </div>
      ) : (
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
