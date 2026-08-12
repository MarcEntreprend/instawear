// src/components/StoreProductCard.tsx

import React from "react";
import { Heart, Star, Plus } from "lucide-react";
import type { Product } from "../types";
import { PLACEHOLDER_IMG } from "../constants/assets";

interface StoreProductCardProps {
  product: Product;
  isFavorite: boolean;
  currencySymbol: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onSelectProduct: (product: Product) => void;
}

export default function StoreProductCard({
  product,
  isFavorite,
  currencySymbol,
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
}: StoreProductCardProps) {
  const variantColors = product.variants?.length
    ? product.variants.map((v) => v.color)
    : product.colors;
  const variantColorNames = product.variants?.length
    ? product.variants.map((v) => v.color_name)
    : product.colorNames;

  return (
    <div
      className="group flex flex-col rounded-[22px] overflow-hidden card-lift"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div
        onClick={() => onSelectProduct(product)}
        className="relative aspect-square cursor-pointer overflow-hidden"
        style={{ background: "var(--color-surface2)" }}
      >
        <img
          src={product.image || PLACEHOLDER_IMG}
          onError={(e) =>
            ((e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG)
          }
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
        />

        {product.isBestSeller && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase text-white"
            style={{ background: "var(--color-gold)" }}
          >
            Best Seller
          </span>
        )}
        {product.dealActive && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[9px] font-black uppercase text-white animate-soft-pulse"
            style={{ background: "var(--color-accent)" }}
          >
            Deal
          </span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-[0.90]"
          style={{
            background: isFavorite
              ? "var(--color-accent)"
              : "rgba(255,255,255,0.92)",
            color: isFavorite ? "#fff" : "var(--color-ink2)",
            border: "1px solid var(--color-border)",
          }}
          aria-label="Toggle favorite"
        >
          <Heart
            size={15}
            fill={isFavorite ? "#fff" : "none"}
            strokeWidth={2}
          />
        </button>

        {/* Color dots - règle : ≤3 affichage individuel, ≥4 → 3 premières + cercle multicolore */}
        {variantColors.length > 0 && (
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 px-1.5 py-1 rounded-full bg-white/85 backdrop-blur-sm border border-white/40 shadow-sm max-w-fit">
            {variantColors.length <= 3 ? (
              // Cas 1 : 3 couleurs ou moins → affichage individuel
              variantColors.map((c, idx) => (
                <span
                  key={idx}
                  className="w-3 h-3 rounded-full border border-white/60 block"
                  style={{ backgroundColor: c }}
                  title={variantColorNames?.[idx] || c}
                />
              ))
            ) : (
              // Cas 2 : 4 couleurs ou plus → 3 premières + cercle multicolore
              <>
                {variantColors.slice(0, 3).map((c, idx) => (
                  <span
                    key={idx}
                    className="w-3 h-3 rounded-full border border-white/60 block"
                    style={{ backgroundColor: c }}
                    title={variantColorNames?.[idx] || c}
                  />
                ))}
                <span
                  className="color-wheel"
                  title={`+${variantColors.length - 3} colors`}
                />
              </>
            )}
          </div>
        )}

        {/* Quick add */}
        {product.isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product, product.colors?.[0] || "#000", "M");
            }}
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center text-white opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 active:scale-[0.90]"
            style={{ background: "var(--color-cta-bg)" }}
            aria-label="Quick add to cart"
          >
            <Plus size={16} strokeWidth={2.5} color="var(--color-cta-ink)" />
          </button>
        )}
      </div>

      <div className="p-3.5 flex flex-col gap-1.5">
        <h4
          onClick={() => onSelectProduct(product)}
          className="text-sm font-bold line-clamp-1 cursor-pointer"
          style={{ color: "var(--color-ink)" }}
        >
          {product.title}
        </h4>
        {product.showRatings && (
          <div className="flex items-center gap-1 text-xs">
            <Star size={12} className="fill-amber-400 text-amber-400" />
            <span className="font-bold" style={{ color: "var(--color-ink2)" }}>
              {product.ratings.score.toFixed(1)}
            </span>
            <span style={{ color: "var(--color-ink4)" }}>
              ({product.ratings.count})
            </span>
          </div>
        )}
        <div className="flex items-baseline gap-2">
          <span
            className="text-base font-black"
            style={{ color: "var(--color-ink)" }}
          >
            {(product.dealActive
              ? (product.dealPrice ?? product.price)
              : product.price
            ).toFixed(2)}{" "}
            {currencySymbol}
          </span>
          {product.originalPrice && (
            <span
              className="text-xs line-through"
              style={{ color: "var(--color-ink4)" }}
            >
              {product.originalPrice.toFixed(2)} {currencySymbol}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
