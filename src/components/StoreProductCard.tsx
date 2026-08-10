// src/components/StoreProductCard.tsx

import { Heart, Star, Clock, Plus, CheckCircle } from "lucide-react";
import type { Product } from "../types";
import { PLACEHOLDER_IMG } from "../constants/assets";

interface StoreProductCardProps {
  product: Product;
  isFavorite: boolean;
  dealExpired: boolean;
  dealFadingOut: boolean;
  countdownStr: string;
  currencySymbol: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onSelectProduct: (product: Product) => void;
  showDeliveryInfo?: boolean;
  getDeliverEstimateString?: (days: number) => string;
}

export default function StoreProductCard({
  product,
  isFavorite,
  dealExpired,
  dealFadingOut,
  countdownStr,
  currencySymbol,
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
  showDeliveryInfo = false,
  getDeliverEstimateString,
}: StoreProductCardProps) {
  const variantColors = product.variants?.length
    ? product.variants.map((v) => v.color)
    : product.colors;
  const variantColorNames = product.variants?.length
    ? product.variants.map((v) => v.color_name)
    : product.colorNames;

  const truncateTitle = (title: string, maxLines: number = 2): string => {
    const charsPerLine = 20;
    const maxChars = maxLines * charsPerLine;
    if (title.length <= maxChars) return title;
    let truncated = title.slice(0, maxChars);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > 0) truncated = truncated.slice(0, lastSpace);
    return truncated + "...";
  };

  return (
    <div
      key={product.id}
      className="card-premium bg-white rounded-3xl flex flex-col h-full relative group overflow-hidden"
      id={`product-card-${product.id}`}
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {product.isBestSeller && (
          <span className="chip uppercase tracking-wide bg-black/85 text-white gap-1">
            <Star size={9} strokeWidth={0} className="fill-amber-300" />
            Best seller
          </span>
        )}
        {product.isLimitedTime && (!dealExpired || dealFadingOut) && (
          <span
            className={`chip uppercase tracking-wide bg-rose-500 text-white ${dealFadingOut ? "deal-fade-out" : "animate-pulse"}`}
          >
            Limited deal
          </span>
        )}
        {product.eventType === "discount" && (
          <span className="chip uppercase tracking-wide bg-white text-gray-900 shadow-sm gap-1">
            Deals
            <span className="inline-block w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
          </span>
        )}
      </div>

      {/* Image */}
      <div
        onClick={() => onSelectProduct(product)}
        className="aspect-4/5 bg-gray-50 overflow-hidden relative cursor-pointer"
      >
        <img
          src={product.image || PLACEHOLDER_IMG}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
          }}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        <div
          className="absolute inset-x-0 bottom-0 h-20 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,.32), transparent)",
          }}
        />

        {/* Pastilles de couleur */}
        <div className="absolute bottom-2.5 left-2.5 z-10 inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-1 border border-white/60 shadow-sm max-w-fit">
          {variantColors.length <= 3 ? (
            variantColors.map((c, idx) => (
              <span
                key={idx}
                className="w-3 h-3 rounded-full border border-gray-200 block"
                style={{ backgroundColor: c }}
                title={variantColorNames?.[idx] || c}
              />
            ))
          ) : (
            <>
              {variantColors.slice(0, 2).map((c, idx) => (
                <span
                  key={idx}
                  className="w-3 h-3 rounded-full border border-gray-200 block"
                  style={{ backgroundColor: c }}
                  title={variantColorNames?.[idx] || c}
                />
              ))}
              <span
                className="color-wheel"
                title={`+${variantColors.length - 2} colors`}
              />
            </>
          )}
        </div>

        {/* Bouton coeur */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          disabled={!product.isActive}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 hover:scale-110"
          style={{
            background: isFavorite
              ? "var(--color-accent)"
              : "rgba(255,255,255,0.92)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${isFavorite ? "transparent" : "rgba(255,255,255,.7)"}`,
            zIndex: 5,
            opacity: product.isActive ? 1 : 0.4,
            cursor: product.isActive ? "pointer" : "not-allowed",
          }}
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={15}
            strokeWidth={2}
            style={{
              color: isFavorite ? "white" : "var(--color-ink2)",
              fill: isFavorite ? "white" : "none",
            }}
          />
        </button>

        {/* Bouton d'ajout rapide flottant, revele au survol */}
        {product.isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product, product.colors?.[0] || "#000000", "M");
            }}
            className="absolute bottom-2.5 right-2.5 z-10 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ease-out scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
              boxShadow: "var(--shadow-accent)",
            }}
            aria-label="Quick add to cart"
          >
            <Plus size={17} strokeWidth={2.5} />
          </button>
        )}

        {product.isLimitedTime && (!dealExpired || dealFadingOut) && (
          <div
            className={`absolute left-2.5 bottom-2.5 z-10 bg-black/80 text-white rounded-full px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-mono font-bold ${dealFadingOut ? "deal-fade-out" : ""}`}
          >
            <Clock className="w-3 h-3 text-rose-400 shrink-0" />
            {countdownStr}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div className="px-3.5 pt-3 pb-4 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            {product.brand}
          </p>
          <h4
            onClick={() => onSelectProduct(product)}
            className="text-sm font-bold text-gray-900 leading-tight transition-colors duration-200 group-hover:text-(--color-accent) cursor-pointer"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              minHeight: "2.2rem",
            }}
            title={product.title}
          >
            {truncateTitle(product.title)}
          </h4>

          {product.showRatings && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              <div className="flex items-center text-amber-400">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                <span className="font-bold ml-0.5 text-gray-700">
                  {product.ratings.score.toFixed(1)}
                </span>
              </div>
              <span className="text-[10px] text-gray-400">
                ({product.ratings.count})
              </span>
              {product.showBought && (
                <span className="text-[10px] text-(--color-accent) font-semibold ml-auto">
                  {product.boughtLastMonth}+ sold
                </span>
              )}
            </div>
          )}

          <div className="flex items-baseline gap-2 mt-2.5">
            {product.dealActive && !dealExpired && product.dealPrice ? (
              <>
                <span className="text-lg font-black text-rose-500">
                  {product.dealPrice.toFixed(2)}{" "}
                  <span className="text-[11px] font-medium text-rose-400">
                    {currencySymbol}
                  </span>
                </span>
                <span className="text-xs text-gray-400 line-through">
                  {product.price.toFixed(2)} {currencySymbol}
                </span>
              </>
            ) : (
              <>
                <span className="text-lg font-black text-gray-900">
                  {product.price.toFixed(2)}{" "}
                  <span className="text-[11px] font-medium text-gray-400">
                    {currencySymbol}
                  </span>
                </span>
                {product.originalPrice && (
                  <span className="text-xs text-gray-400 line-through">
                    {product.originalPrice.toFixed(2)} {currencySymbol}
                  </span>
                )}
              </>
            )}
          </div>

          {showDeliveryInfo && getDeliverEstimateString && (
            <div className="text-[10px] text-gray-500 leading-normal flex flex-col gap-0.5 mt-3 border-t border-gray-100 pt-2">
              <p className="text-(--color-accent) font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Choice program
              </p>
              <p>
                Delivered by{" "}
                <span className="text-gray-900 font-semibold">
                  {getDeliverEstimateString(4)}
                </span>
              </p>
            </div>
          )}
        </div>

        {!product.isActive && (
          <div className="text-center mt-2">
            <p className="text-[10px] text-rose-500 font-medium mb-1">
              Currently unavailable
            </p>
            <button
              disabled
              className="w-full bg-gray-100 text-gray-400 font-bold py-2 px-3 rounded-full text-xs cursor-not-allowed"
            >
              Add to cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
