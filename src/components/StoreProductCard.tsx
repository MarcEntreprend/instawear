// src/components/StoreProductCard.tsx — V2 ticket-card visuals + V1 logic (availability, deal, currency)
import { Heart, Star, Flame, Check, ShoppingBag } from "lucide-react";
import DealCountdown from "./DealCountdown";
import type { Product } from "../types";
import { useProductAvailability } from "../hooks/useProductAvailability";
import { useCurrency } from "../hooks/useCurrency";
import { formatPrice } from "../data/currency";
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
}: StoreProductCardProps) {
  const availability = useProductAvailability(product);
  const unavailable = availability !== "available";

  const swatches = product.variants?.length
    ? product.variants.map((v) => ({ hex: v.color, name: v.color_name }))
    : (product.colors ?? []).map((hex, i) => ({ hex, name: product.colorNames?.[i] ?? hex }));
  const visibleSwatches = swatches.slice(0, 4);
  const extraSwatches = swatches.length - visibleSwatches.length;

  const { currency } = useCurrency();
  const dealLive = product.dealActive && !dealExpired && product.dealPrice != null;

  const displayPrice = dealLive ? product.dealPrice! : product.price;
  const strikePrice = dealLive ? product.price : product.originalPrice && product.originalPrice > product.price ? product.originalPrice : null;

  return (
    <article className={`ticket-card animate-fade-up group ${unavailable ? "opacity-90" : ""}`}>
      <a
        href={`/produit/${product.id}`}
        onClick={(e) => { e.preventDefault(); onSelectProduct(product); }}
        className="block w-full text-left cursor-pointer"
        aria-label={`View ${product.title}`}
      >
        <div className="relative p-3 pb-0">
          <div className="bezel-outer">
            <div className="bezel-inner aspect-square">
              <img src={product.image || PLACEHOLDER_IMG} alt={product.title} loading="lazy" onError={(e) => ((e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG)} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
            </div>
          </div>
          <div className="absolute top-5 left-5 flex flex-col gap-1.5 z-10">
            {dealLive && <span className="badge badge-accent animate-pulse">Deal</span>}
            {!dealLive && product.isBestSeller && <span className="badge badge-ink">Best-seller</span>}
            {!dealLive && product.isLimitedTime && <span className={`badge badge-gold ${dealFadingOut ? "deal-fade-out" : ""}`}>Limited</span>}
            {product.eventType === "discount" && <span className="badge" style={{ background: "var(--color-surface)", color: "var(--color-ink)", border: "1px solid var(--color-border)" }}>Deals <span className="inline-block w-2 h-2 bg-rose-500 rounded-full animate-ping ml-1" /></span>}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (!unavailable) onToggleFavorite(product.id); }}
            aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
            aria-pressed={isFavorite}
            disabled={unavailable}
            className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: isFavorite ? "var(--color-accent)" : "var(--color-surface)", boxShadow: "var(--shadow-md)", border: `1px solid ${isFavorite ? "var(--color-accent)" : "var(--color-border)"}` }}
          >
            <Heart size={16} fill={isFavorite ? "#fff" : "none"} style={{ color: isFavorite ? "#fff" : "var(--color-ink3)" }} />
          </button>
        </div>

        <div className="ticket-perforation mx-3 mt-3" />

        <div className="p-5 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--color-ink3)" }}>{product.brand}</p>
          <h3 className="text-sm font-bold leading-snug mb-1.5 line-clamp-2 group-hover:text-(--color-accent) transition-colors" style={{ color: "var(--color-ink)" }} title={product.title}>
            {product.title}
          </h3>

          {(product.showRatings !== false && product.ratings?.count > 0 || product.showBought) && (
            <div className="flex items-center gap-1.5 mb-2.5 text-xs">
              {product.showRatings !== false && product.ratings?.count > 0 && (
                <>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star size={13} fill="var(--color-gold)" style={{ color: "var(--color-gold)" }} />
                    <span className="font-bold" style={{ color: "var(--color-ink2)" }}>{product.ratings.score.toFixed(1)}</span>
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--color-ink4)" }}>({product.ratings.count})</span>
                </>
              )}
              {product.showBought && (
                <span className="text-[11px] font-medium ml-1" style={{ color: "var(--color-accent)" }}>{product.boughtLastMonth}+ bought</span>
              )}
            </div>
          )}

          {visibleSwatches.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              {visibleSwatches.map((s, i) => (
                <span key={i} title={s.name} className="w-4 h-4 rounded-full" style={{ background: s.hex, border: "1px solid var(--color-border2)" }} />
              ))}
              {extraSwatches > 0 && <span className="color-wheel" title={`+${extraSwatches} colors`} />}
              {extraSwatches > 0 && <span className="text-[11px] font-semibold" style={{ color: "var(--color-ink4)" }}>+{extraSwatches}</span>}
            </div>
          )}

          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-extrabold" style={{ color: dealLive ? "var(--color-accent)" : "var(--color-ink)" }}>
                {formatPrice(displayPrice, currency)}
              </span>
              {strikePrice != null && <span className="text-xs line-through" style={{ color: "var(--color-ink4)" }}>{formatPrice(strikePrice, currency)}</span>}
            </div>
            {unavailable ? (
              <span className="text-xs font-semibold" style={{ color: "var(--color-negative)" }}>{availability === "out_of_stock" ? "Out of stock" : "Unavailable"}</span>
            ) : product.inStock === false ? (
              <span className="text-xs font-semibold" style={{ color: "var(--color-negative)" }}>Épuisé</span>
            ) : (product as any).stock_quantity !== undefined && (product as any).stock_quantity !== null && (product as any).stock_quantity <= 10 ? (
              <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--color-accent)" }}><Flame size={12} /> Plus que {(product as any).stock_quantity}</span>
            ) : (
              <span className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--color-success)" }}><Check size={12} /> En stock</span>
            )}
          </div>

          {dealLive && product.dealEndsAt && (
            <div className={`mt-3 ${dealFadingOut ? "deal-fade-out" : ""}`}>
              <DealCountdown endsAt={product.dealEndsAt} compact />
            </div>
          )}
        </div>
      </a>

      <div className="px-5 pb-5">
        {unavailable ? (
          <button disabled className="btn w-full bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200">
            <ShoppingBag size={15} /> Unavailable
          </button>
        ) : (
          <button
            onClick={() => onAddToCart(product, product.colors?.[0] || swatches[0]?.hex || "#000000", "M")}
            className="btn btn-primary w-full"
          >
            <img src={CART_PLUS_ICON} alt="" className="w-4 h-4" style={{ filter: "brightness(0) invert(1)" }} /> Add to cart
          </button>
        )}
      </div>
    </article>
  );
}
