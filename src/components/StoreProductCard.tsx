// src/components/StoreProductCard.tsx

import { Heart, Star, Clock, Eye, Plus, CheckCircle } from "lucide-react";
import type { Product } from "../types";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { PLACEHOLDER_IMG, CART_PLUS_ICON } from "../constants/assets";

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

  // Fonction pour tronquer le titre à 2 lignes
  const truncateTitle = (title: string, maxLines: number = 2): string => {
    // Estimation approximative : ~20 caractères par ligne pour une police normale
    // Ajustez selon vos besoins
    const charsPerLine = 20;
    const maxChars = maxLines * charsPerLine;

    if (title.length <= maxChars) {
      return title;
    }

    // Trouver le dernier espace avant la limite pour couper proprement
    let truncated = title.slice(0, maxChars);
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSpace > 0) {
      truncated = truncated.slice(0, lastSpace);
    }

    return truncated + "...";
  };

  return (
    <div
      key={product.id}
      className="bg-white/60 border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 transition-all text-left flex flex-col justify-between h-full relative group"
      id={`product-card-${product.id}`}
    >
      {/* Badges */}
      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5">
        {product.isBestSeller && (
          <span className="bg-amber-500 text-slate-950 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow">
            Best Seller
          </span>
        )}
        {product.isLimitedTime && (!dealExpired || dealFadingOut) && (
          <span
            className={`bg-rose-500 text-gray-900 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow ${dealFadingOut ? "deal-fade-out" : "animate-pulse"}`}
          >
            Limited Deal
          </span>
        )}
        {product.eventType === "discount" && (
          <span className="bg-white text-gray-900 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow inline-flex items-center gap-1">
            Deals{" "}
            <span className="inline-block w-2 h-2 bg-rose-500 rounded-full animate-ping" />
          </span>
        )}
      </div>

      {/* Image */}
      <div
        onClick={() => onSelectProduct(product)}
        className="aspect-square rounded-t-xl bg-gray-50 overflow-hidden relative cursor-pointer group"
      >
        <img
          src={product.image || PLACEHOLDER_IMG}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
          }}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
        />
        {/* Color dots */}
        <div className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-1 py-0.5 border border-gray-200/60 shadow-sm max-w-fit">
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
        {/* Heart button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          disabled={!product.isActive}
          className="absolute top-3 right-3 w-8.5 h-8.5 rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 hover:scale-110"
          style={{
            background: isFavorite
              ? "var(--color-accent)"
              : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${isFavorite ? "transparent" : "var(--color-border)"}`,
            zIndex: 5,
            opacity: product.isActive ? 1 : 0.4,
            cursor: product.isActive ? "pointer" : "not-allowed",
          }}
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={14}
            strokeWidth={2}
            style={{
              color: isFavorite ? "white" : "var(--color-ink2)",
              fill: isFavorite ? "white" : "none",
            }}
          />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 pt-1 pb-3 flex-1 flex flex-col justify-between">
        <div>
          <h4
            onClick={() => onSelectProduct(product)}
            className="text-xs md:text-sm font-bold text-gray-900 mt-0.5 leading-tight transition-colors duration-200 group-hover:text-(--color-accent) cursor-pointer"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
              minHeight: "2rem",
              maxHeight: "2.5rem",
              wordBreak: "break-word",
            }}
            title={product.title} // Affiche le titre complet au survol
          >
            {truncateTitle(product.title)}
          </h4>

          <div className="flex items-center gap-1.5 mt-2 text-xs">
            <div className="flex items-center text-amber-400 text-[11px]">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
              <span className="font-bold ml-0.5 mt-0.5">
                {product.ratings.score.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-gray-500">
              ({product.ratings.count})
            </span>
            <span className="text-[10px] text-gray-600">|</span>
            <span className="text-[10px] text-(--color-accent) font-sans tracking-wide flex-1">
              {product.boughtLastMonth}+ bought
            </span>

            {/* Bouton Add to cart au survol */}
            {product.isActive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product, product.colors?.[0] || "#000000", "M");
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white shrink-0 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out max-w-9 group-hover:max-w-48"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
                  boxShadow: "var(--shadow-accent)",
                }}
              >
                <img
                  src={CART_PLUS_ICON}
                  alt="Add to cart"
                  className="w-4 h-4 shrink-0"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out whitespace-nowrap">
                  Add to cart
                </span>
              </button>
            )}
          </div>

          <div className="flex items-baseline gap-2 mt-2 mb-0.5">
            <span className="text-lg font-black text-gray-900 font-sans">
              {product.price.toFixed(2)}{" "}
              <span className="text-[11px] font-medium text-gray-500">
                {currencySymbol}
              </span>
            </span>
            {product.originalPrice && (
              <span className="text-xs text-gray-500 line-through">
                {product.originalPrice.toFixed(2)} {currencySymbol}
              </span>
            )}
          </div>

          {product.isLimitedTime && (!dealExpired || dealFadingOut) && (
            <div
              className={`bg-rose-900/30 border border-rose-800 rounded px-2 py-1 mt-2 flex items-center justify-between text-[10px] text-rose-600 ${dealFadingOut ? "deal-fade-out" : ""}`}
            >
              <span className="font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-400 shrink-0" /> Offer ends
              </span>
              <span className="font-mono font-bold text-rose-600">
                {countdownStr}
              </span>
            </div>
          )}

          {showDeliveryInfo && getDeliverEstimateString && (
            <div className="text-[10px] text-gray-500 leading-normal flex flex-col gap-0.5 mb-3 border-t border-gray-200/60 pt-2 font-sans">
              <p className="text-(--color-accent) font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Join the Choice program
              </p>
              <p>
                Estimated delivery by{" "}
                <span className="text-gray-900 font-semibold">
                  {getDeliverEstimateString(4)}
                </span>
              </p>
              <p className="text-gray-500">Tracked & secure shipping</p>
            </div>
          )}
        </div>

        {!product.isActive && (
          <div className="text-center mt-1">
            <p className="text-[10px] text-rose-500 font-medium mb-1">
              This item is currently unavailable.
            </p>
            <button
              disabled
              className="w-full bg-gray-200 text-gray-400 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              Add to cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
