// src/components/ProductDetailModal.tsx

import React, { useState } from "react";
import {
  X,
  Star,
  Truck,
  ShieldCheck,
  Heart,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "./ui/Button";
import type { Product } from "../types";
import { PLACEHOLDER_IMG } from "../constants/assets";

interface ProductDetailModalProps {
  product: Product;
  initialColor?: string;
  initialSize?: string;
  currencySymbol: string;
  favorites: string[];
  onClose: () => void;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onBuyNow: (product: Product, color: string, size: string) => void;
  getDeliverEstimateString: (days: number) => string;
}

export default function ProductDetailModal({
  product,
  initialColor,
  initialSize,
  currencySymbol,
  favorites,
  onClose,
  onToggleFavorite,
  onAddToCart,
  onBuyNow,
  getDeliverEstimateString,
}: ProductDetailModalProps) {
  const hasVariants = !!product.variants?.length;
  const dispColors = hasVariants
    ? product.variants!.map((v) => v.color)
    : product.colors;
  const dispColorNames = hasVariants
    ? product.variants!.map((v) => v.color_name)
    : product.colorNames;
  const dispSizes = hasVariants
    ? [
        ...new Set(product.variants!.flatMap((v) => Object.keys(v.sizes))),
      ].sort()
    : product.sizes;

  const [pickedColor, setPickedColor] = useState(
    initialColor || dispColors[0] || "",
  );
  const [pickedSize, setPickedSize] = useState(
    initialSize || (dispSizes.includes("M") ? "M" : dispSizes[0] || "M"),
  );
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const colorIdx = dispColors.indexOf(pickedColor);
  const activeVariant =
    hasVariants && colorIdx >= 0 ? product.variants![colorIdx] : null;

  const cleanColorImages = (product.colorImages || []).filter((u) => u?.trim());
  const allImages = [product.image, ...(product.gallery || [])].filter(
    (u) => u?.trim() && u !== PLACEHOLDER_IMG,
  );

  const hasColorImage = activeVariant
    ? activeVariant.image?.trim()
    : cleanColorImages[colorIdx];
  const displayImage = hasColorImage
    ? activeVariant
      ? activeVariant.image
      : cleanColorImages[colorIdx]
    : allImages[galleryIdx] || PLACEHOLDER_IMG;

  const currentVariantPrice = activeVariant?.sizes?.[pickedSize]?.price;
  const displayPrice = currentVariantPrice ?? product.price;
  const isFav = favorites.includes(product.id);

  const thumbs = hasVariants
    ? product.variants!.filter((v) => v.image?.trim())
    : allImages.map((img, i) => ({ image: img, key: i }));

  const canPrev = allImages.length > 1;
  const goPrev = () =>
    setGalleryIdx((i) => (i - 1 + allImages.length) % allImages.length);
  const goNext = () => setGalleryIdx((i) => (i + 1) % allImages.length);

  return (
    <div
      className="fixed inset-0 z-70 flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in"
      style={{ background: "rgba(11,11,10,.55)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full sm:max-w-4xl max-h-[94vh] overflow-y-auto rounded-t-4xl sm:rounded-4xl animate-fade-up"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-ink2)",
          }}
          aria-label="Close"
        >
          <X size={17} strokeWidth={2} />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          {/* Gallery */}
          <div className="relative">
            <div
              className="relative aspect-4/5 overflow-hidden"
              style={{ background: "var(--color-surface2)" }}
            >
              <img
                src={displayImage}
                alt={product.title}
                className="w-full h-full object-cover"
              />
              {product.isBestSeller && (
                <span
                  className="absolute top-4 left-4 px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-white"
                  style={{ background: "var(--color-gold)" }}
                >
                  Best Seller
                </span>
              )}
              {canPrev && !hasColorImage && (
                <>
                  <button
                    onClick={goPrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,.9)" }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={goNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,.9)" }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {thumbs.length > 1 && (
              <div className="flex gap-2 p-4 overflow-x-auto scrollbar-none">
                {hasVariants
                  ? product
                      .variants!.filter((v) => v.image?.trim())
                      .map((v) => (
                        <button
                          key={v.color}
                          onClick={() => setPickedColor(v.color)}
                          className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-colors"
                          style={{
                            borderColor:
                              pickedColor === v.color
                                ? "var(--color-accent)"
                                : "var(--color-border)",
                          }}
                        >
                          <img
                            src={v.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))
                  : allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setGalleryIdx(idx)}
                        className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 transition-colors"
                        style={{
                          borderColor:
                            galleryIdx === idx
                              ? "var(--color-accent)"
                              : "var(--color-border)",
                        }}
                      >
                        <img
                          src={img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-6 sm:p-8 flex flex-col gap-5">
            <div>
              <span
                className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: "var(--color-ink4)" }}
              >
                {product.brand}
              </span>
              <h2
                className="font-display font-black text-2xl sm:text-3xl leading-tight mt-1"
                style={{ color: "var(--color-ink)" }}
              >
                {product.title}
              </h2>
            </div>

            {product.showRatings && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < Math.floor(product.ratings.score)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }
                    />
                  ))}
                </div>
                <span
                  className="font-bold"
                  style={{ color: "var(--color-ink2)" }}
                >
                  {product.ratings.score.toFixed(1)}
                </span>
                <span style={{ color: "var(--color-ink4)" }}>
                  ({product.ratings.count} reviews)
                </span>
              </div>
            )}

            {/* Price block */}
            <div
              className="flex items-baseline gap-3 p-4 rounded-2xl"
              style={{ background: "var(--color-surface2)" }}
            >
              <span
                className="text-2xl font-black"
                style={{ color: "var(--color-ink)" }}
              >
                {displayPrice.toFixed(2)} {currencySymbol}
              </span>
              {product.originalPrice && (
                <span
                  className="text-sm line-through"
                  style={{ color: "var(--color-ink4)" }}
                >
                  {product.originalPrice.toFixed(2)} {currencySymbol}
                </span>
              )}
            </div>

            {/* Colors */}
            <div>
              <label
                className="block text-xs font-black uppercase tracking-wider mb-2"
                style={{ color: "var(--color-ink3)" }}
              >
                Color — {dispColorNames?.[colorIdx] || pickedColor || "Select"}
              </label>
              <div className="flex flex-wrap gap-2">
                {dispColors.map((c, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPickedColor(c)}
                    className="w-9 h-9 rounded-full p-0.5 transition-transform"
                    style={{
                      border: `2px solid ${pickedColor === c ? "var(--color-accent)" : "var(--color-border2)"}`,
                      transform: pickedColor === c ? "scale(1.08)" : "scale(1)",
                    }}
                    title={dispColorNames?.[idx] || ""}
                  >
                    <span
                      className="block w-full h-full rounded-full"
                      style={{ backgroundColor: c }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Sizes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="text-xs font-black uppercase tracking-wider"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Size — {pickedSize}
                </label>
                <button
                  onClick={() => setSizeGuideOpen((s) => !s)}
                  className="text-[11px] font-bold flex items-center gap-1"
                  style={{ color: "var(--color-accent)" }}
                >
                  <Info size={12} /> Size Guide
                </button>
              </div>
              {sizeGuideOpen && (
                <div
                  className="p-3 rounded-xl text-xs mb-3 animate-fade-up"
                  style={{
                    background: "var(--color-surface2)",
                    color: "var(--color-ink3)",
                  }}
                >
                  Refer to our unisex measurements — chest, length and shoulders
                  vary by 2-3cm per size step.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {dispSizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPickedSize(s)}
                    className="min-w-11 h-10 px-3 rounded-xl text-xs font-black uppercase transition-all"
                    style={{
                      background:
                        pickedSize === s
                          ? "var(--color-cta-bg)"
                          : "var(--color-surface2)",
                      color:
                        pickedSize === s
                          ? "var(--color-cta-ink)"
                          : "var(--color-ink2)",
                      border: `1.5px solid ${pickedSize === s ? "var(--color-cta-bg)" : "var(--color-border)"}`,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            {(product.fullDescription || product.description) && (
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-ink3)" }}
              >
                {product.fullDescription || product.description}
              </p>
            )}

            {/* Actions */}
            {product.isActive ? (
              <div className="flex flex-col gap-2.5 pt-1">
                <Button
                  variant="accent"
                  size="lg"
                  onClick={() => onAddToCart(product, pickedColor, pickedSize)}
                >
                  Add to Cart
                </Button>
                <Button
                  variant="cta"
                  size="lg"
                  onClick={() => onBuyNow(product, pickedColor, pickedSize)}
                >
                  Buy Now
                </Button>
                <button
                  onClick={() => onToggleFavorite(product.id)}
                  className="flex items-center justify-center gap-2 py-3 rounded-full text-xs font-bold transition-colors"
                  style={{
                    background: isFav
                      ? "var(--color-negative-bg)"
                      : "var(--color-surface2)",
                    color: isFav
                      ? "var(--color-negative)"
                      : "var(--color-ink3)",
                  }}
                >
                  <Heart
                    size={15}
                    fill={isFav ? "var(--color-negative)" : "none"}
                  />
                  {isFav ? "Remove from wishlist" : "Add to wishlist"}
                </button>
              </div>
            ) : (
              <div className="text-center py-3">
                <p
                  className="text-xs font-bold mb-2"
                  style={{ color: "var(--color-negative)" }}
                >
                  Currently unavailable
                </p>
                <Button variant="ghost" size="lg" disabled>
                  Add to Cart
                </Button>
              </div>
            )}

            {/* Shipping info */}
            <div
              className="flex flex-col gap-2 pt-3 text-xs"
              style={{
                borderTop: "1px solid var(--color-border)",
                color: "var(--color-ink3)",
              }}
            >
              <p
                className="flex items-center gap-2 font-bold"
                style={{ color: "var(--color-accent)" }}
              >
                <Truck size={14} /> Free shipping over $35
              </p>
              <p>
                Printed within 24h, delivered by{" "}
                <strong style={{ color: "var(--color-ink2)" }}>
                  {getDeliverEstimateString(4)}
                </strong>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck
                  size={13}
                  style={{ color: "var(--color-accent)" }}
                />{" "}
                OEKO-TEX® certified materials
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
