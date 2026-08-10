import { Heart, Star, Clock, Plus, CheckCircle } from "lucide-react";
import type { Product } from "../types";
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

  const hasDeal =
    product.dealActive && !dealExpired && product.dealPrice != null;
  const displayPrice = hasDeal
    ? (product.dealPrice ?? product.price)
    : product.price;
  const originalPrice = hasDeal ? product.price : product.originalPrice;
  const cardCategory = product.category || "Apparel";

  return (
    <article
      className="group bg-white border border-gray-200 rounded-[28px] overflow-hidden shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-200/20 flex flex-col h-full"
      id={`product-card-${product.id}`}
    >
      <div className="relative overflow-hidden">
        <button
          type="button"
          onClick={() => onSelectProduct(product)}
          className="block w-full aspect-4/5 overflow-hidden"
        >
          <img
            src={product.image || PLACEHOLDER_IMG}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = PLACEHOLDER_IMG;
            }}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </button>

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/35 to-transparent px-4 py-3 text-white">
          <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.24em] font-semibold text-white/85">
            <span>{cardCategory}</span>
            {product.isBestSeller && (
              <span className="rounded-full bg-amber-400 px-2 py-1 text-[10px] font-black text-slate-950">
                Best seller
              </span>
            )}
          </div>
        </div>

        <div className="absolute top-4 left-4 flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-sm border border-gray-200/70 px-2 py-1 shadow-sm">
          {variantColors.length <= 3 ? (
            variantColors.map((c, idx) => (
              <span
                key={idx}
                className="w-3 h-3 rounded-full border border-gray-200"
                style={{ backgroundColor: c }}
                title={variantColorNames?.[idx] || c}
              />
            ))
          ) : (
            <>
              {variantColors.slice(0, 2).map((c, idx) => (
                <span
                  key={idx}
                  className="w-3 h-3 rounded-full border border-gray-200"
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

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          disabled={!product.isActive}
          className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-full border transition duration-200 hover:scale-110"
          style={{
            background: isFavorite
              ? "var(--color-accent)"
              : "rgba(255,255,255,0.92)",
            borderColor: isFavorite ? "transparent" : "rgba(229,231,235,1)",
            boxShadow: "var(--shadow-sm)",
          }}
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={16}
            strokeWidth={2}
            style={{
              color: isFavorite ? "white" : "var(--color-ink2)",
              fill: isFavorite ? "white" : "none",
            }}
          />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-gray-400 font-semibold mb-2">
              {product.brand || "InstaWear"}
            </p>
            <h3
              onClick={() => onSelectProduct(product)}
              className="text-sm md:text-base font-black text-gray-900 leading-tight transition-colors duration-200 cursor-pointer"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={product.title}
            >
              {product.title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
            {product.showRatings && (
              <span className="inline-flex items-center gap-1 text-amber-500">
                <Star className="w-3 h-3 fill-amber-400" />
                {product.ratings.score.toFixed(1)}
              </span>
            )}
            {product.showRatings && (
              <span className="text-[11px] text-gray-400">
                ({product.ratings.count})
              </span>
            )}
            {product.showBought && (
              <span className="text-[11px] text-(--color-accent) font-semibold">
                {product.boughtLastMonth}+ bought
              </span>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <div>
                <span className="text-xl font-black text-gray-900">
                  {displayPrice.toFixed(2)}
                </span>
                <span className="text-xs text-gray-500 ml-1">
                  {currencySymbol}
                </span>
              </div>
              {originalPrice != null && (
                <span className="text-[11px] text-gray-400 line-through">
                  {originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {product.isLimitedTime && (!dealExpired || dealFadingOut) && (
              <div
                className={`rounded-2xl border px-3 py-2 text-[10px] font-semibold ${dealFadingOut ? "border-rose-200 bg-rose-50 text-rose-700 deal-fade-out" : "border-rose-200 bg-rose-50 text-rose-700"}`}
              >
                Limited deal — ends in {countdownStr}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(product, product.colors?.[0] || "#000000", "M");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-white transition duration-300"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
              boxShadow: "var(--shadow-accent)",
              minWidth: "120px",
            }}
          >
            <img
              src={CART_PLUS_ICON}
              alt="Cart"
              className="w-4 h-4"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            Add
          </button>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-[0.24em] text-gray-400">
              Category
            </span>
            <p className="text-xs font-semibold text-gray-900 capitalize">
              {cardCategory}
            </p>
          </div>
        </div>

        {showDeliveryInfo && getDeliverEstimateString && (
          <div className="mt-4 rounded-3xl border border-gray-200/70 bg-gray-50 px-4 py-3 text-[11px] text-gray-600">
            <p className="font-semibold text-gray-900 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Tracked delivery
            </p>
            <p className="mt-1">
              Estimated by{" "}
              <span className="font-semibold text-gray-900">
                {getDeliverEstimateString(4)}
              </span>
            </p>
          </div>
        )}

        {!product.isActive && (
          <div className="mt-4 rounded-3xl bg-gray-100 px-4 py-4 text-center text-[11px] text-gray-500">
            This item is currently unavailable.
          </div>
        )}
      </div>
    </article>
  );
}
