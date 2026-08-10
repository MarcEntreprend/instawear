// src/components/ProductDetailModal.tsx

import { useState } from "react";
import { X, Star, Info, Truck, Heart, ShieldCheck } from "lucide-react";
import DOMPurify from "dompurify";
import type { Product } from "../types";
import ImageZoom from "./ImageZoom";
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
  dealExpired?: boolean;
  dealFadingOut?: boolean;
  getDeliverEstimateString: (days: number) => string;
}

// ─── Dynamic size guide (Printful) ──────────────────────────────────────
function SizeGuideDisplay({ sizeGuide }: { sizeGuide: any }) {
  const tables = sizeGuide.size_tables || [];
  const availableSizes: string[] = sizeGuide.available_sizes || [];
  const mainTable =
    tables.find((t: any) => t.type === "measure_yourself") ||
    tables.find((t: any) => t.type === "product_measure") ||
    tables[0];
  if (!mainTable)
    return <p className="italic text-gray-400">No size data available.</p>;
  const measurements = mainTable.measurements || [];
  const unit = mainTable.unit || "inches";
  return (
    <div>
      {mainTable.description && (
        <div
          className="mb-2 text-[10px] leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(mainTable.description),
          }}
        />
      )}
      {mainTable.image_url && (
        <img
          src={mainTable.image_url}
          alt="Size guide"
          className="w-full max-w-50 mb-2 rounded-xl border border-gray-200"
        />
      )}
      <table className="w-full text-left mt-1 text-[10px]">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-1 font-semibold">Size</th>
            {measurements.map((m: any) => (
              <th key={m.type_label} className="py-1 font-semibold">
                {m.type_label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {availableSizes.map((size: string) => (
            <tr key={size} className="border-b border-gray-100">
              <td className="py-0.5 font-medium">{size}</td>
              {measurements.map((m: any) => {
                const val = m.values?.find((v: any) => v.size === size);
                if (!val) return <td key={m.type_label}>-</td>;
                const display =
                  val.min_value && val.max_value
                    ? `${val.min_value}-${val.max_value}`
                    : val.value || "-";
                return (
                  <td key={m.type_label}>
                    {display} {unit !== "none" ? unit : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {tables
        .filter((t: any) => t !== mainTable)
        .map((table: any) => (
          <details key={table.type} className="mt-3">
            <summary className="text-[10px] font-semibold cursor-pointer capitalize">
              {table.type.replace("_", " ")} sizes
            </summary>
            <table className="w-full text-left mt-1 text-[10px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-1 font-semibold">Size</th>
                  {(table.measurements || []).map((m: any) => (
                    <th key={m.type_label} className="py-1 font-semibold">
                      {m.type_label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {availableSizes.map((size: string) => (
                  <tr key={size} className="border-b border-gray-100">
                    <td className="py-0.5 font-medium">{size}</td>
                    {(table.measurements || []).map((m: any) => {
                      const val = m.values?.find((v: any) => v.size === size);
                      if (!val) return <td key={m.type_label}>-</td>;
                      const display =
                        val.min_value && val.max_value
                          ? `${val.min_value}-${val.max_value}`
                          : val.value || "-";
                      return <td key={m.type_label}>{display}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
    </div>
  );
}

export default function ProductDetailModal({
  product,
  currencySymbol,
  favorites,
  onClose,
  onToggleFavorite,
  onAddToCart,
  onBuyNow,
  dealExpired = false,
  dealFadingOut = false,
  getDeliverEstimateString,
  initialColor,
  initialSize,
}: ProductDetailModalProps) {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const [pickedColor, setPickedColor] = useState<string>(
    initialColor ||
      (product.variants?.length
        ? product.variants[0].color
        : product.colors[0] || ""),
  );
  const [pickedSize, setPickedSize] = useState<string>(
    initialSize ||
      (product.variants?.length
        ? Object.keys(product.variants[0].sizes).includes("M")
          ? "M"
          : Object.keys(product.variants[0].sizes)[0] || "M"
        : product.sizes.includes("M")
          ? "M"
          : product.sizes[0] || "M"),
  );

  const hasVariants = product.variants && product.variants.length > 0;
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

  const colorIdx = pickedColor ? dispColors.indexOf(pickedColor) : 0;
  const activeVariant =
    hasVariants && colorIdx >= 0 ? product.variants![colorIdx] : null;

  const cleanColorImages = (product.colorImages || []).filter(
    (url) => url && url.trim().length > 0,
  );
  const allImages = [product.image, ...(product.gallery || [])].filter(
    (url) => url && url.trim().length > 0 && url !== PLACEHOLDER_IMG,
  );

  const hasColorImage = activeVariant
    ? activeVariant.image && activeVariant.image.trim().length > 0
    : cleanColorImages[colorIdx];

  const displayImage = hasColorImage
    ? activeVariant
      ? activeVariant.image
      : cleanColorImages[colorIdx]
    : allImages[activeGalleryIndex] || PLACEHOLDER_IMG;

  const currentVariantPrice = activeVariant?.sizes?.[pickedSize]?.price;
  const displayPrice =
    currentVariantPrice != null ? currentVariantPrice : product.price;

  const variantImages = hasVariants
    ? product.variants!.filter((v) => v.image && v.image.trim().length > 0)
    : [];

  return (
    <div className="fixed inset-0 z-55 overflow-y-auto bg-gray-50/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-400 max-h-[95vh] overflow-y-auto shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:text-gray-900 shadow-md transition-transform duration-200 hover:scale-105 z-10"
        >
          <X className="w-4.5 h-4.5" strokeWidth={1.75} />
        </button>

        {/* ── 3-COLUMN LAYOUT ────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-8 p-8 md:p-10">
          {/* ── COLONNE GAUCHE : Images ──────────────────────────── */}
          <div className="lg:w-[45%] flex flex-col sm:flex-row gap-6">
            {/* Miniatures verticales (desktop) ou horizontales (mobile) */}
            {variantImages.length > 1 ? (
              <div className="flex sm:flex-col gap-2 order-2 sm:order-first sm:w-16 shrink-0">
                {variantImages.map((v) => (
                  <button
                    key={v.color}
                    onClick={() => setPickedColor(v.color)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-colors ${
                      pickedColor === v.color
                        ? "border-(--color-accent)"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={v.image}
                      alt={v.color_name || v.color}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : allImages.length > 1 ? (
              <div className="flex sm:flex-col gap-2 order-2 sm:order-first sm:w-16 shrink-0">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveGalleryIndex(idx)}
                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-colors ${
                      activeGalleryIndex === idx
                        ? "border-(--color-accent)"
                        : "border-gray-200"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}

            {/* Image principale avec zoom */}
            <div className="w-full aspect-3/4 rounded-3xl overflow-hidden shadow-lg">
              <ImageZoom src={displayImage} alt={product.title}>
                {product.isBestSeller && (
                  <span className="chip uppercase tracking-wide bg-black/85 text-white gap-1 absolute top-3 left-3 z-10">
                    <Star size={9} strokeWidth={0} className="fill-amber-300" />
                    Best seller
                  </span>
                )}
                {product.isLimitedTime && (!dealExpired || dealFadingOut) && (
                  <span
                    className={`chip uppercase tracking-wide bg-rose-500 text-white absolute top-3 right-3 z-10 ${dealFadingOut ? "deal-fade-out" : "animate-pulse"}`}
                  >
                    Limited time
                  </span>
                )}
              </ImageZoom>
            </div>
          </div>

          {/* ── COLONNE CENTRALE : Infos produit ─────────────────── */}
          <div className="lg:w-[25%]">
            <span className="chip uppercase tracking-widest bg-gray-100 text-gray-500">
              {product.brand}
            </span>
            <h3 className="text-2xl md:text-3xl font-black text-gray-900 mt-3 leading-tight tracking-tight">
              {product.title}
            </h3>

            {(product.showRatings || product.showBought) && (
              <div className="flex items-center gap-2 mt-3 text-xs">
                {product.showRatings && (
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < Math.floor(product.ratings.score) ? "fill-amber-400 text-amber-400" : "text-gray-600"}`}
                      />
                    ))}
                    <span className="font-extrabold ml-1 pt-0.5">
                      {product.ratings.score.toFixed(1)}/5.0
                    </span>
                  </div>
                )}
                {product.showBought && (
                  <span className="text-gray-500">
                    ({product.boughtLastMonth}+ bought)
                  </span>
                )}
              </div>
            )}

            {/* Colors */}
            <div className="mt-5" id="variantColors">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                Color :{" "}
                <span className="text-gray-900 normal-case font-semibold">
                  {pickedColor
                    ? dispColorNames?.[dispColors.indexOf(pickedColor)] ||
                      pickedColor
                    : "Select"}
                </span>
              </label>
              <div className="flex flex-wrap gap-2.5">
                {dispColors.map((c, idx) => {
                  const isPicked =
                    pickedColor === c || (!pickedColor && idx === 0);
                  return (
                    <button
                      key={idx}
                      onClick={() => setPickedColor(c)}
                      className={`w-9 h-9 rounded-full border-2 transition-all p-0.5 ${isPicked ? "border-(--color-accent) scale-110 shadow-md" : "border-gray-200"}`}
                      style={{ backgroundColor: c }}
                      title={dispColorNames?.[idx] || ""}
                    />
                  );
                })}
              </div>
            </div>

            {/* Sizes */}
            <div className="mt-5">
              <div className="flex justify-between items-center mb-2.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Size :{" "}
                  <span className="text-gray-900 normal-case font-semibold">
                    {pickedSize}
                  </span>
                </label>
                <button
                  onClick={() => setSizeGuideOpen(!sizeGuideOpen)}
                  className="text-[10px] font-bold text-(--color-accent) hover:underline flex items-center gap-1"
                >
                  <Info className="w-3 h-3" strokeWidth={2} /> Size guide
                  {(!product.sizeGuide ||
                    (!product.sizeGuide.size_tables &&
                      !product.sizeGuide.measurements)) && (
                    <span className="text-gray-400 ml-0.5 normal-case font-normal">
                      (approx.)
                    </span>
                  )}
                </button>
              </div>
              {sizeGuideOpen && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[10px] text-gray-500 mb-3 max-h-60 overflow-y-auto">
                  {product.sizeGuide &&
                  (product.sizeGuide.size_tables ||
                    product.sizeGuide.measurements) ? (
                    <SizeGuideDisplay sizeGuide={product.sizeGuide} />
                  ) : (
                    <>
                      <p className="font-bold text-gray-900">
                        Unisex fit measurements (cm) :
                      </p>
                      <table className="w-full text-left mt-1">
                        <thead>
                          <tr>
                            <th>Size</th>
                            <th>Chest</th>
                            <th>Length</th>
                          </tr>
                        </thead>
                        <tbody>
                          {["S", "M", "L", "XL"].map((s) => (
                            <tr key={s}>
                              <td>{s}</td>
                              <td>
                                {s === "S"
                                  ? 48
                                  : s === "M"
                                    ? 51
                                    : s === "L"
                                      ? 54
                                      : 57}{" "}
                                cm
                              </td>
                              <td>
                                {s === "S"
                                  ? 69
                                  : s === "M"
                                    ? 72
                                    : s === "L"
                                      ? 74
                                      : 76}{" "}
                                cm
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {dispSizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPickedSize(s)}
                    className={`min-w-11 h-9 rounded-full border text-xs font-bold transition-all uppercase px-3.5 ${pickedSize === s ? "border-(--color-accent) bg-(--color-accent-bg) text-(--color-accent)" : "border-gray-200 text-gray-600 bg-gray-50/60"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Product details */}
            <div className="mt-6 text-xs text-gray-600 leading-relaxed space-y-2 font-sans border-t border-gray-100 pt-5">
              <p className="font-bold text-gray-500 uppercase tracking-wider">
                Product details :
              </p>
              {product.fullDescription ? (
                <div className="whitespace-pre-line text-gray-600 font-sans space-y-1">
                  {product.fullDescription}
                </div>
              ) : (
                <p className="italic text-gray-500">{product.description}</p>
              )}
            </div>
          </div>

          {/* ── COLONNE DROITE : Achat / Actions ─────────────────── */}
          <div className="lg:w-[25%] flex flex-col gap-4">
            <div className="bezel-outer">
              <div className="bezel-inner p-5 flex flex-col gap-4">
                {/* Prix */}
                {product.dealActive && !dealExpired && product.dealPrice ? (
                  <div>
                    <span className="text-3xl font-black text-rose-500">
                      {product.dealPrice.toFixed(2)} {currencySymbol}
                    </span>
                    <span className="text-sm text-gray-400 line-through ml-2">
                      {product.price.toFixed(2)} {currencySymbol}
                    </span>
                    <p className="text-xs text-rose-500 font-semibold mt-1.5">
                      -
                      {Math.round(
                        (1 - product.dealPrice / product.price) * 100,
                      )}
                      % limited deal
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl font-black text-gray-900">
                      {displayPrice.toFixed(2)} {currencySymbol}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-400 line-through ml-2">
                        {product.originalPrice.toFixed(2)} {currencySymbol}
                      </span>
                    )}
                    {product.dealActive && !dealExpired && !dealFadingOut && (
                      <p className="text-xs text-(--color-accent) font-semibold mt-1.5">
                        Limited deal
                      </p>
                    )}
                  </div>
                )}

                {/* Résumé sélection */}
                <div className="chip bg-gray-50 border border-gray-200 text-gray-600 normal-case tracking-normal font-medium justify-between">
                  <span>
                    {pickedColor
                      ? dispColorNames?.[dispColors.indexOf(pickedColor)] ||
                        pickedColor
                      : "-"}{" "}
                    / {pickedSize}
                  </span>
                  <button
                    onClick={() =>
                      document
                        .getElementById("variantColors")
                        ?.scrollIntoView({ behavior: "smooth", block: "center" })
                    }
                    className="text-(--color-accent) hover:underline font-bold"
                  >
                    Edit
                  </button>
                </div>

                {/* Boutons d'action */}
                {product.isActive ? (
                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={() =>
                        onAddToCart(
                          product,
                          pickedColor || product.colors[0] || "#000000",
                          pickedSize,
                        )
                      }
                      className="pill-btn pill-btn-accent w-full"
                    >
                      Add to cart
                    </button>
                    <button
                      onClick={() =>
                        onBuyNow(
                          product,
                          pickedColor || product.colors[0] || "#000000",
                          pickedSize,
                        )
                      }
                      className="pill-btn w-full text-slate-950"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--color-gold), #f0c060)",
                        boxShadow: "0 6px 20px rgba(201,134,10,0.3)",
                        padding: "13px 26px",
                      }}
                    >
                      Buy now
                    </button>
                    <button
                      onClick={() => onToggleFavorite(product.id)}
                      className="pill-btn w-full font-semibold"
                      style={{
                        background: favorites.includes(product.id)
                          ? "#FEF2F2"
                          : "var(--color-surface2)",
                        border: `1.5px solid ${favorites.includes(product.id) ? "#FECACA" : "var(--color-border)"}`,
                        color: favorites.includes(product.id)
                          ? "#EF4444"
                          : "var(--color-ink3)",
                        padding: "13px 26px",
                      }}
                    >
                      <Heart
                        size={16}
                        strokeWidth={2}
                        fill={
                          favorites.includes(product.id) ? "#EF4444" : "none"
                        }
                      />
                      {favorites.includes(product.id)
                        ? "Remove from wishlist"
                        : "Add to wishlist"}
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-rose-500 font-medium mb-3">
                      This item is currently unavailable.
                    </p>
                    <button
                      disabled
                      className="w-full bg-gray-200 text-gray-400 font-black text-xs py-3.5 px-4 rounded-full uppercase cursor-not-allowed"
                    >
                      Add to cart
                    </button>
                  </div>
                )}

                {/* Livraison */}
                <div className="text-xs text-gray-500 space-y-1 border-t border-gray-100 pt-4">
                  <p className="flex items-center gap-1.5 font-semibold text-(--color-accent)">
                    <Truck size={14} strokeWidth={2} /> Shipping
                  </p>
                  <p>Free on orders over $35</p>
                  <p className="text-gray-400">
                    Printed within 24h, delivered by{" "}
                    <strong className="text-gray-600">
                      {getDeliverEstimateString(4)}
                    </strong>
                  </p>
                </div>

                {/* Garantie */}
                <div className="flex items-center gap-2 text-[11px] text-gray-400">
                  <ShieldCheck size={14} strokeWidth={1.75} className="text-(--color-accent)" />
                  OEKO-TEX certified
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}