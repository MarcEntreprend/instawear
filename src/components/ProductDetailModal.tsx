// src/components/ProductDetailModal.tsx

import { useState } from "react";
import { X, Star, Info, Truck, Heart, ShieldCheck } from "lucide-react";
import type { Product } from "../types";
import { PLACEHOLDER_IMG } from "../constants/assets";

interface ProductDetailModalProps {
  product: Product;
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
}: ProductDetailModalProps) {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [pickedColor, setPickedColor] = useState<string>("");
  const [pickedSize, setPickedSize] = useState<string>("M");

  const allImages = [
    product.image || PLACEHOLDER_IMG,
    ...(product.gallery || []),
  ];

  return (
    <div className="fixed inset-0 z-55 overflow-y-auto bg-gray-50/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900 w-9 h-9 rounded-full flex items-center justify-center transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
          {/* Left: Gallery */}
          <div>
            <div className="aspect-4/5 bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 relative">
              {product.isBestSeller && (
                <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow">
                  BEST SELLER
                </span>
              )}
              {product.isLimitedTime && (!dealExpired || dealFadingOut) && (
                <span
                  className={`absolute top-3 right-3 bg-rose-500 text-gray-900 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow ${dealFadingOut ? "deal-fade-out" : "animate-pulse"}`}
                >
                  LIMITED time
                </span>
              )}
              <img
                src={allImages[activeGalleryIndex]}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2.5 mt-3 select-none">
                {allImages.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveGalleryIndex(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${activeGalleryIndex === idx ? "border-cyan-400 bg-(--color-accent-bg)" : "border-gray-200"}`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 p-3 bg-gray-50/40 border border-gray-200 rounded-xl flex items-center gap-2.5 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4 text-(--color-accent)" />
              <p>Toxic-free guarantee — OEKO-TEX® certified print</p>
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex flex-col justify-between">
            <div>
              <span className="text-[10px] bg-gray-100 px-3 py-1 rounded text-gray-500 uppercase tracking-widest font-bold">
                {product.brand} ORIGINAL
              </span>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 mt-2 leading-tight">
                {product.title}
              </h3>

              <div className="flex items-center gap-2 mt-3 text-xs">
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
                <span className="text-gray-500">
                  ({product.ratings.count} verified reviews)
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-4 p-4 bg-gray-50/60 rounded-xl border border-gray-200">
                <div>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                    Event price
                  </p>
                  <p className="text-2xl md:text-3xl font-black text-gray-900 font-sans mt-0.5">
                    {product.price.toFixed(2)} {currencySymbol}
                  </p>
                </div>
                {product.originalPrice && (
                  <div className="text-xs text-gray-500 leading-normal pl-2 border-l border-gray-200">
                    <p className="line-through">
                      {product.originalPrice.toFixed(2)} {currencySymbol}
                    </p>
                    <p className="text-rose-400 font-semibold">
                      -
                      {Math.round(
                        (1 - product.price / product.originalPrice) * 100,
                      )}
                      % off
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 text-xs text-gray-600 leading-relaxed space-y-2 font-sans border-b border-gray-200 pb-5">
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

              {/* Colors */}
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Color :{" "}
                  {pickedColor
                    ? product.colorNames?.[
                        product.colors.indexOf(pickedColor)
                      ] || pickedColor
                    : "Select"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((c, idx) => {
                    const isPicked =
                      pickedColor === c || (!pickedColor && idx === 0);
                    return (
                      <button
                        key={idx}
                        onClick={() => setPickedColor(c)}
                        className={`w-9 h-9 rounded-full border-2 transition-all p-0.5 ${isPicked ? "border-cyan-400 scale-105 shadow-md" : "border-gray-200"}`}
                        style={{ backgroundColor: c }}
                        title={product.colorNames?.[idx] || ""}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Sizes */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Size : {pickedSize}
                  </label>
                  <button
                    onClick={() => setSizeGuideOpen(!sizeGuideOpen)}
                    className="text-[10px] text-(--color-accent) hover:underline flex items-center gap-1"
                  >
                    <Info className="w-3 h-3" /> Size guide
                  </button>
                </div>
                {sizeGuideOpen && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-[10px] text-gray-500 mb-3">
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
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPickedSize(s)}
                      className={`min-w-10 h-8 rounded border text-xs font-bold transition-all uppercase px-2.5 ${pickedSize === s ? "border-cyan-400 bg-(--color-accent-bg)" : "border-gray-200 text-gray-600 bg-gray-50/60"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-3">
              <div className="p-3.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-600 font-sans">
                <p className="text-(--color-accent) font-black flex items-center gap-1 mb-1">
                  <Truck className="w-3.5 h-3.5" /> Prime Choice shipping
                </p>
                <p>
                  Shipping :{" "}
                  <span className="text-emerald-600 font-bold">
                    FREE on orders over $35 !
                  </span>
                </p>
                <p className="text-gray-500 mt-1">
                  Printed within 24h, delivered by{" "}
                  <strong>{getDeliverEstimateString(4)}</strong>
                </p>
              </div>

              <button
                onClick={() => onToggleFavorite(product.id)}
                className="p-3 rounded-xl transition-all duration-150 mb-2"
                style={{
                  background: favorites.includes(product.id)
                    ? "#FEF2F2"
                    : "var(--color-surface2)",
                  border: `1.5px solid ${favorites.includes(product.id) ? "#FECACA" : "var(--color-border)"}`,
                  color: favorites.includes(product.id)
                    ? "#EF4444"
                    : "var(--color-ink3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  width: "fit-content",
                }}
              >
                <Heart
                  size={18}
                  strokeWidth={2}
                  fill={favorites.includes(product.id) ? "#EF4444" : "none"}
                />
                {favorites.includes(product.id)
                  ? "Remove from wishlist"
                  : "Add to wishlist"}
              </button>

              {product.isActive ? (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      onAddToCart(
                        product,
                        pickedColor || product.colors[0] || "#000000",
                        pickedSize,
                      )
                    }
                    className="flex-1 bg-linear-to-r from-(--color-accent) to-(--color-accent2) text-white font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all shadow-lg"
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
                    className="flex-1 bg-linear-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all shadow-lg"
                  >
                    Buy now
                  </button>
                </div>
              ) : (
                <div className="text-center mt-2">
                  <p className="text-xs text-rose-500 font-medium mb-3">
                    This item is currently unavailable.
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled
                      className="flex-1 bg-gray-200 text-gray-400 font-black text-xs py-3.5 px-4 rounded-xl uppercase cursor-not-allowed"
                    >
                      Add to cart
                    </button>
                    <button
                      disabled
                      className="flex-1 bg-gray-200 text-gray-400 font-black text-xs py-3.5 px-4 rounded-xl uppercase cursor-not-allowed"
                    >
                      Buy now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
