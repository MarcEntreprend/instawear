// src/components/StoreProductCard.tsx

import { Heart, Star, Clock, Eye, Plus, CheckCircle } from "lucide-react";
import type { Product } from "../types";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
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
  return (
    <div
      key={product.id}
      className="bg-white/60 border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 transition-all text-left flex flex-col justify-between h-full relative"
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
            Promotions{" "}
            <span className="inline-block w-2 h-2 bg-rose-500 rounded-full animate-ping" />
          </span>
        )}
      </div>

      {/* Image */}
      <div
        onClick={() => onSelectProduct(product)}
        className="aspect-square rounded-t-xl bg-gray-50 overflow-hidden relative cursor-pointer"
      >
        <img
          src={product.image || PLACEHOLDER_IMG}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
          }}
          alt={product.title}
          className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
        />
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
          <span className="bg-white/95 dark:bg-gray-900/90 dark:text-gray-100 text-gray-900 font-bold text-xs px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-xl flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-(--color-accent)" />
            Aperçu rapide
          </span>
        </div>
        {/* Pilule couleurs */}
        <div className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-1 py-0.5 border border-gray-200/60 shadow-sm max-w-fit">
          {product.colors.length <= 3 ? (
            product.colors.map((c, idx) => (
              <span
                key={idx}
                className="w-3 h-3 rounded-full border border-gray-200 block"
                style={{ backgroundColor: c }}
                title={product.colorNames?.[idx] || c}
              />
            ))
          ) : (
            <>
              {product.colors.slice(0, 2).map((c, idx) => (
                <span
                  key={idx}
                  className="w-3 h-3 rounded-full border border-gray-200 block"
                  style={{ backgroundColor: c }}
                  title={product.colorNames?.[idx] || c}
                />
              ))}
              <span
                className="color-wheel"
                title={`+${product.colors.length - 2} couleurs`}
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
          aria-label={
            isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
          }
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
      <div className="px-3 pt-2 pb-3 flex-1 flex flex-col justify-between">
        <div>
          <h4
            onClick={() => onSelectProduct(product)}
            className="text-xs md:text-sm font-bold text-gray-900 mt-0.5 leading-tight hover:text-(--color-accent) cursor-pointer line-clamp-2 min-h-8 md:min-h-10"
          >
            {product.title}
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
            <span className="text-[10px] text-(--color-accent) font-sans tracking-wide">
              {product.boughtLastMonth}+ achetés
            </span>
          </div>

          {product.isLimitedTime && (!dealExpired || dealFadingOut) && (
            <div
              className={`bg-rose-900/30 border border-rose-800 rounded px-2 py-1 mt-2 flex items-center justify-between text-[10px] text-rose-600 ${dealFadingOut ? "deal-fade-out" : ""}`}
            >
              <span className="font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-rose-400 shrink-0" /> Fin de
                l'offre
              </span>
              <span className="font-mono font-bold text-rose-600">
                {countdownStr}
              </span>
            </div>
          )}

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

          {showDeliveryInfo && getDeliverEstimateString && (
            <div className="text-[10px] text-gray-500 leading-normal flex flex-col gap-0.5 mb-3 border-t border-gray-200/60 pt-2 font-sans">
              <p className="text-(--color-accent) font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Rejoindre Choice
              </p>
              <p>
                Livraison estimée pour{" "}
                <span className="text-gray-900 font-semibold">
                  {getDeliverEstimateString(4)}
                </span>
              </p>
              <p className="text-gray-500">
                Livraison suivie et sécurisée depuis l'UE
              </p>
            </div>
          )}
        </div>

        {product.isActive ? (
          <button
            onClick={() =>
              onAddToCart(product, product.colors?.[0] || "#000000", "M")
            }
            className="w-full bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-cyan-400/40"
            id={`btn-add-cart-list-${product.id}`}
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            Ajouter au panier
          </button>
        ) : (
          <div className="text-center mt-1">
            <p className="text-[10px] text-rose-500 font-medium mb-1">
              Cet article n'est pas disponible pour le moment.
            </p>
            <button
              disabled
              className="w-full bg-gray-200 text-gray-400 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter au panier
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
