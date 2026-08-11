// src/components/CatalogSection.tsx

import React from "react";
import { Sparkles, RefreshCw, SlidersHorizontal } from "lucide-react";
import StoreProductCard from "./StoreProductCard";
import { Chip } from "./ui/Button";
import type { Product } from "../types";
import { PLACEHOLDER_IMG } from "../constants/assets";

interface CatalogSectionProps {
  filteredProducts: Product[];
  loadingProducts: boolean;
  favorites: string[];
  currencySymbol: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onSelectProduct: (product: Product) => void;
  searchTerm: string;
  selectedCategory: string | null;
  setSearchTerm: (v: string) => void;
  setSelectedCategory: (v: string | null) => void;
}

const CATEGORIES = [
  { label: "All", value: null },
  { label: "T-Shirts", value: "tshirt" },
  { label: "Hoodies", value: "hoodie" },
  { label: "Accessories", value: "accessory" },
  { label: "Mugs", value: "mug" },
];

export default function CatalogSection({
  filteredProducts,
  loadingProducts,
  favorites,
  currencySymbol,
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
  searchTerm,
  selectedCategory,
  setSearchTerm,
  setSelectedCategory,
}: CatalogSectionProps) {
  return (
    <section id="section-catalog" className="section-container scroll-mt-28">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest"
            style={{ color: "var(--color-accent)" }}
          >
            <Sparkles size={13} /> New Arrivals
          </span>
          <h2
            className="font-display font-black text-2xl sm:text-4xl mt-1"
            style={{ color: "var(--color-ink)" }}
          >
            2026 Collection
          </h2>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.label}
              active={selectedCategory === c.value}
              onClick={() => setSelectedCategory(c.value)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      {searchTerm && (
        <div className="flex items-center gap-2 mb-4">
          <span
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full"
            style={{
              background: "var(--color-surface2)",
              color: "var(--color-ink2)",
            }}
          >
            <SlidersHorizontal size={12} /> "{searchTerm}"
            <button
              onClick={() => setSearchTerm("")}
              style={{ color: "var(--color-ink4)" }}
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {loadingProducts ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-[22px] overflow-hidden">
              <div className="skeleton aspect-4/5" />
              <div className="p-3.5 flex flex-col gap-2">
                <div className="skeleton h-3 w-3/4 rounded-full" />
                <div className="skeleton h-3 w-1/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div
          className="py-20 text-center rounded-[28px] border border-dashed"
          style={{ borderColor: "var(--color-border2)" }}
        >
          <img
            src={PLACEHOLDER_IMG}
            alt=""
            className="w-14 h-14 mx-auto mb-3 opacity-40"
          />
          <p className="font-bold" style={{ color: "var(--color-ink)" }}>
            No items match your search
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-ink3)" }}>
            Try a different filter or search term.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredProducts.map((p) => (
            <StoreProductCard
              key={p.id}
              product={p}
              isFavorite={favorites.includes(p.id)}
              currencySymbol={currencySymbol}
              onToggleFavorite={onToggleFavorite}
              onAddToCart={onAddToCart}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}

      {loadingProducts && (
        <div
          className="flex items-center justify-center gap-2 mt-6 text-sm"
          style={{ color: "var(--color-ink3)" }}
        >
          <RefreshCw size={14} className="animate-spin" /> Loading collections…
        </div>
      )}
    </section>
  );
}
