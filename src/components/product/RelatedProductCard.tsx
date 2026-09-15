// src/components/product/RelatedProductCard.tsx — V2 port live
import { Plus, Star } from "lucide-react";
import type { Product } from "../../types";
import { imageKitUrl, imageKitSrcSet } from "../../lib/imagekit";
import { PLACEHOLDER_IMG } from "../../constants/assets";
import { formatAmount } from "../../data/currency";
export default function RelatedProductCard({
  product,
  currencySymbol,
  onSelect,
  onQuickAdd,
}: {
  product: Product;
  /** Symbole issu des settings boutique (via ProductPage) : jamais de devise en dur. */
  currencySymbol: string;
  onSelect: (p: Product) => void;
  onQuickAdd: (p: Product) => void;
}) {
  return (
    <div className="w-36 sm:w-40 shrink-0 snap-start group">
      <div
        onClick={() => onSelect(product)}
        className="block w-full text-left card-premium overflow-hidden cursor-pointer"
      >
        <div className="relative aspect-square overflow-hidden">
          <img
            src={
              imageKitUrl(product.image, {
                width: 320,
                quality: 80,
                format: "webp",
              }) || product.image
            }
            srcSet={
              imageKitUrl(product.image, { width: 320 }) !== product.image
                ? imageKitSrcSet(
                    product.image,
                    { quality: 80, format: "webp" },
                    [320, 480],
                  )
                : undefined
            }
            sizes="(max-width: 640px) 144px, 160px"
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const el = e.currentTarget;
              if (el.dataset.fbk) return;
              el.dataset.fbk = "1";
              el.src = PLACEHOLDER_IMG;
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickAdd(product);
            }}
            aria-label="Quick add"
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-90"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="p-2.5">
          <p
            className="text-xs font-bold leading-snug line-clamp-1"
            style={{ color: "var(--color-ink)" }}
          >
            {product.title}
          </p>
          <div className="flex items-center justify-between mt-1">
            <span
              className="text-xs font-extrabold"
              style={{ color: "var(--color-ink)" }}
            >
              {formatAmount(product.price, currencySymbol)}
            </span>
            {product.ratings.count > 0 && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-semibold"
                style={{ color: "var(--color-ink3)" }}
              >
                <Star
                  size={9}
                  fill="var(--color-gold)"
                  style={{ color: "var(--color-gold)" }}
                />{" "}
                {product.ratings.score.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
