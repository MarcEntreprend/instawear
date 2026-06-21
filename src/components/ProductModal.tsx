// src/components/ProductModal.tsx

import React, { useState } from "react";
import {
  X,
  Star,
  Truck,
  ShieldCheck,
  Heart,
  ShoppingCart,
  Info,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";
import { Product } from "../types";

interface ProductModalProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onClose: () => void;
  countdownStr: string;
}

const SIZE_GUIDE: Record<
  string,
  { buste: string; longueur: string; épaules: string }
> = {
  S: { buste: "48 cm", longueur: "69 cm", épaules: "43 cm" },
  M: { buste: "51 cm", longueur: "72 cm", épaules: "45 cm" },
  L: { buste: "54 cm", longueur: "74 cm", épaules: "47 cm" },
  XL: { buste: "57 cm", longueur: "76 cm", épaules: "49 cm" },
  XXL: { buste: "60 cm", longueur: "78 cm", épaules: "51 cm" },
};

const SIZE_SURCHARGE: Record<string, number> = { XXL: 2 };

export default function ProductModal({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onClose,
  countdownStr,
}: ProductModalProps) {
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(
    product.sizes.includes("M") ? "M" : product.sizes[0],
  );
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [added, setAdded] = useState(false);

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  const dynPrice = product.price + (SIZE_SURCHARGE[selectedSize] || 0);

  const prevImage = () =>
    setGalleryIdx(
      (i) =>
        (i - 1 + (product.gallery?.length || 1)) %
        (product.gallery?.length || 1),
    );
  const nextImage = () =>
    setGalleryIdx((i) => (i + 1) % (product.gallery?.length || 1));

  const handleAdd = () => {
    onAddToCart(product, selectedColor, selectedSize);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    onAddToCart(product, selectedColor, selectedSize);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in"
      style={{ background: "rgba(26,25,22,.6)", backdropFilter: "blur(6px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full md:max-w-3xl max-h-[95vh] overflow-y-auto rounded-t-3xl md:rounded-2xl animate-fade-up relative"
        style={{
          background: "var(--color-bg)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full transition-transform hover:scale-110"
          style={{
            background: "rgba(255,255,255,.8)",
            backdropFilter: "blur(8px)",
            color: "var(--color-ink2)",
          }}
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Gallery */}
          <div
            className="relative aspect-square md:aspect-auto md:min-h-100"
            style={{ background: "var(--color-surface2)" }}
          >
            <img
              src={
                product.gallery?.[galleryIdx] ||
                product.image ||
                PLACEHOLDER_IMG
              }
              alt={product.title}
              className="w-full h-full object-cover md:rounded-tl-2xl"
            />
            {product.gallery && product.gallery.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full"
                  style={{
                    background: "rgba(255,255,255,.85)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <ChevronLeft size={16} strokeWidth={2} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full"
                  style={{
                    background: "rgba(255,255,255,.85)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {product.gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      className="rounded-full transition-all"
                      style={{
                        width: galleryIdx === i ? 20 : 6,
                        height: 6,
                        background:
                          galleryIdx === i ? "white" : "rgba(255,255,255,.5)",
                      }}
                    />
                  ))}
                </div>
                {/* Thumbnails */}
                <div
                  className="flex gap-2 p-3"
                  style={{ background: "var(--color-surface)" }}
                >
                  {product.gallery.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      className="w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors"
                      style={{
                        borderColor:
                          galleryIdx === i
                            ? "var(--color-accent)"
                            : "transparent",
                      }}
                    >
                      <img
                        src={img || PLACEHOLDER_IMG}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Info */}
          <div className="p-5 md:p-6 flex flex-col gap-4 overflow-y-auto">
            {/* Brand + title */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "var(--color-ink4)" }}
              >
                {product.brand}
              </p>
              <h2
                className="text-xl font-black leading-tight"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {product.title}
              </h2>
            </div>

            {/* Ratings */}
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    strokeWidth={0}
                    fill={
                      i < Math.round(product.ratings.score)
                        ? "#F59E0B"
                        : "#E5E7EB"
                    }
                  />
                ))}
              </div>
              <span
                className="font-semibold"
                style={{ color: "var(--color-ink2)" }}
              >
                {product.ratings.score.toFixed(1)}
              </span>
              <span style={{ color: "var(--color-ink4)" }}>
                ({product.ratings.count} avis)
              </span>
            </div>

            {/* Price */}
            <div
              className="flex items-baseline gap-3 p-3 rounded-xl"
              style={{ background: "var(--color-surface2)" }}
            >
              <span
                className="text-2xl font-black"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-sans)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {dynPrice.toFixed(2)} $
              </span>
              {product.originalPrice && (
                <>
                  <span
                    className="text-sm line-through"
                    style={{ color: "var(--color-ink4)" }}
                  >
                    {product.originalPrice.toFixed(2)} $
                  </span>
                  <span
                    className="badge text-gray-900"
                    style={{ background: "var(--color-accent)" }}
                  >
                    -{discount}%
                  </span>
                </>
              )}
              {SIZE_SURCHARGE[selectedSize] > 0 && (
                <span
                  className="text-xs"
                  style={{ color: "var(--color-ink3)" }}
                >
                  (+{SIZE_SURCHARGE[selectedSize]} $ taille {selectedSize})
                </span>
              )}
            </div>

            {/* Description */}
            {product.fullDescription && (
              <div
                className="text-sm leading-relaxed whitespace-pre-line"
                style={{ color: "var(--color-ink2)" }}
              >
                {product.fullDescription}
              </div>
            )}

            {/* Color picker */}
            <div>
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "var(--color-ink3)" }}
              >
                Couleur :{" "}
                <span style={{ color: "var(--color-ink)" }}>
                  {product.colorNames?.[
                    product.colors.indexOf(selectedColor)
                  ] || selectedColor}
                </span>
              </p>
              <div className="flex gap-2 flex-wrap">
                {product.colors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColor(c)}
                    className="rounded-full transition-all duration-150"
                    style={{
                      width: 32,
                      height: 32,
                      backgroundColor: c,
                      border: `2.5px solid ${selectedColor === c ? "var(--color-accent)" : "var(--color-border)"}`,
                      boxShadow:
                        selectedColor === c
                          ? "0 0 0 2px rgba(255,92,53,.25)"
                          : "none",
                      transform:
                        selectedColor === c ? "scale(1.1)" : "scale(1)",
                    }}
                    title={product.colorNames?.[i]}
                  />
                ))}
              </div>
            </div>

            {/* Size picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Taille :{" "}
                  <span style={{ color: "var(--color-ink)" }}>
                    {selectedSize}
                  </span>
                </p>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: "var(--color-accent)" }}
                >
                  <Info size={11} strokeWidth={2} />
                  Guide des tailles
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className="min-w-12 h-9 px-3 rounded-lg text-sm font-semibold transition-all duration-150"
                    style={{
                      background:
                        selectedSize === s
                          ? "var(--color-accent)"
                          : "var(--color-surface2)",
                      color: selectedSize === s ? "white" : "var(--color-ink2)",
                      border: `1.5px solid ${selectedSize === s ? "var(--color-accent)" : "var(--color-border)"}`,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {showGuide && SIZE_GUIDE[selectedSize] && (
                <div
                  className="mt-3 p-3 rounded-xl text-xs animate-fade-up"
                  style={{
                    background: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    className="font-bold mb-2"
                    style={{ color: "var(--color-ink)" }}
                  >
                    Mesures pour {selectedSize} :
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(SIZE_GUIDE[selectedSize]).map(([k, v]) => (
                      <div key={k} className="text-center">
                        <p
                          className="font-bold"
                          style={{
                            color: "var(--color-ink)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {v}
                        </p>
                        <p style={{ color: "var(--color-ink3)" }}>{k}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Shipping info */}
            <div
              className="flex flex-col gap-2 p-3 rounded-xl text-xs"
              style={{ background: "var(--color-surface2)" }}
            >
              <div
                className="flex items-center gap-2"
                style={{ color: "var(--color-emerald)" }}
              >
                <Truck size={13} strokeWidth={2} />
                <span className="font-semibold">
                  Livraison gratuite dès 35 $
                </span>
              </div>
              <div
                className="flex items-center gap-2"
                style={{ color: "var(--color-ink3)" }}
              >
                <ShieldCheck size={13} strokeWidth={2} />
                <span>Imprimé sous 24h · Satisfait ou remboursé 14j</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-2 pb-1">
              {/* Favorite */}
              <button
                onClick={() => onToggleFavorite(product.id)}
                className="p-3 rounded-xl transition-all duration-150"
                style={{
                  background: isFavorite ? "#FEF2F2" : "var(--color-surface2)",
                  border: `1.5px solid ${isFavorite ? "#FECACA" : "var(--color-border)"}`,
                  color: isFavorite ? "#EF4444" : "var(--color-ink3)",
                }}
              >
                <Heart
                  size={18}
                  strokeWidth={2}
                  fill={isFavorite ? "#EF4444" : "none"}
                />
              </button>

              {/* Add to cart */}
              <button
                onClick={handleAdd}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm transition-all duration-200"
                style={{
                  background: added
                    ? "var(--color-emerald)"
                    : "var(--color-accent)",
                  boxShadow: added
                    ? "0 6px 20px rgba(31,122,76,0.3)"
                    : "var(--shadow-accent)",
                  color: "white",
                  fontFamily: "var(--font-sans)",
                }}
                onMouseEnter={(e) => {
                  if (!added) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 12px 40px rgba(255,92,53,.32)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!added) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--shadow-accent)";
                  }
                }}
              >
                {added ? (
                  <>
                    <Check size={15} strokeWidth={2.5} />
                    Ajouté !
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} strokeWidth={2} />
                    Ajouter — {dynPrice.toFixed(2)} $
                  </>
                )}
              </button>

              {/* Buy now */}
              <button
                onClick={handleBuyNow}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm text-white transition-all duration-200"
                style={{
                  background: "var(--color-gold)",
                  boxShadow: "0 6px 20px rgba(201,134,10,0.3)",
                  fontFamily: "var(--font-sans)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 30px rgba(201,134,10,0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 20px rgba(201,134,10,0.3)";
                }}
              >
                Acheter maintenant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
