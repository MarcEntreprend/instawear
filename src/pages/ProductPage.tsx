// src/pages/ProductPage.tsx — V2 page layout + V1 logic (variant pricing, availability)
import { useState } from "react";
import { X, Star, Info, Truck, Heart, ShieldCheck, ArrowLeft } from "lucide-react";
import DOMPurify from "dompurify";
import type { Product } from "../types";
import ImageZoom from "../components/ImageZoom";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { getVariantAvailability } from "../hooks/useProductAvailability";
import StoreProductCard from "../components/StoreProductCard";

interface ProductPageProps {
  product: Product;
  products: Product[];
  initialColor?: string;
  initialSize?: string;
  currencySymbol: string;
  favorites: string[];
  dealExpired?: boolean;
  dealFadingOut?: boolean;
  countdownString?: string;
  onClose: () => void;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onBuyNow: (product: Product, color: string, size: string) => void;
  getDeliverEstimateString: (days: number) => string;
}

function SizeGuideDisplay({ sizeGuide }: { sizeGuide: any }) {
  const tables = sizeGuide.size_tables || [];
  const availableSizes: string[] = sizeGuide.available_sizes || [];
  const mainTable = tables.find((t: any) => t.type === "measure_yourself") || tables.find((t: any) => t.type === "product_measure") || tables[0];
  if (!mainTable) return <p className="italic text-gray-400">No size data available.</p>;
  const measurements = mainTable.measurements || [];
  const unit = mainTable.unit || "inches";
  return (
    <div>
      {mainTable.description && <div className="mb-2 text-[10px] leading-relaxed" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mainTable.description) }} />}
      {mainTable.image_url && <img src={mainTable.image_url} alt="Size guide" className="w-full max-w-50 mb-2 rounded-lg border" />}
      <table className="w-full text-left mt-1 text-[10px]"><thead><tr className="border-b"><th className="py-1 font-semibold">Size</th>{measurements.map((m: any) => <th key={m.type_label} className="py-1 font-semibold">{m.type_label}</th>)}</tr></thead>
        <tbody>{availableSizes.map((size: string) => <tr key={size} className="border-b"><td className="py-0.5 font-medium">{size}</td>{measurements.map((m: any) => { const val = m.values?.find((v: any) => v.size === size); if (!val) return <td key={m.type_label}>—</td>; const display = val.min_value && val.max_value ? `${val.min_value}-${val.max_value}` : val.value || "—"; return <td key={m.type_label}>{display} {unit !== "none" ? unit : ""}</td>; })}</tr>)}</tbody></table>
    </div>
  );
}

export default function ProductPage({ product, products, currencySymbol, favorites, onClose, onToggleFavorite, onAddToCart, onBuyNow, dealExpired = false, dealFadingOut = false, getDeliverEstimateString, initialColor, initialSize, countdownString }: ProductPageProps) {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [pickedColor, setPickedColor] = useState<string>(initialColor || (product.variants?.length ? product.variants[0].color : product.colors[0] || ""));
  const [pickedSize, setPickedSize] = useState<string>(initialSize || (product.variants?.length ? (Object.keys(product.variants[0].sizes).includes("M") ? "M" : Object.keys(product.variants[0].sizes)[0] || "M") : product.sizes.includes("M") ? "M" : product.sizes[0] || "M"));
  const hasVariants = product.variants && product.variants.length > 0;
  const dispColors = hasVariants ? product.variants!.map((v) => v.color) : product.colors;
  const dispColorNames = hasVariants ? product.variants!.map((v) => v.color_name) : product.colorNames;
  const dispSizes = hasVariants ? [...new Set(product.variants!.flatMap((v) => Object.keys(v.sizes)))].sort() : product.sizes;
  const colorIdx = pickedColor ? dispColors.indexOf(pickedColor) : 0;
  const activeVariant = hasVariants && colorIdx >= 0 ? product.variants![colorIdx] : null;
  const cleanColorImages = (product.colorImages || []).filter((url) => url && url.trim().length > 0);
  const allImages = [product.image, ...(product.gallery || [])].filter((url) => url && url.trim().length > 0 && url !== PLACEHOLDER_IMG);
  const hasColorImage = activeVariant ? activeVariant.image && activeVariant.image.trim().length > 0 : !!cleanColorImages[colorIdx];
  const displayImage = hasColorImage ? (activeVariant ? activeVariant.image : cleanColorImages[colorIdx]) : allImages[activeGalleryIndex] || PLACEHOLDER_IMG;
  const currentVariantPrice = activeVariant?.sizes?.[pickedSize]?.price;
  const displayPrice = currentVariantPrice != null ? currentVariantPrice : product.price;
  const variantImages = hasVariants ? product.variants!.filter((v) => v.image && v.image.trim().length > 0) : [];
  const related = products.filter((p) => p.id !== product.id && p.category === product.category && p.isActive).slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-16">
        <button onClick={onClose} className="inline-flex items-center gap-2 text-sm font-semibold mb-4 hover:underline" style={{ color: "var(--color-ink2)" }}>
          <ArrowLeft size={16} /> Back to collection
        </button>

        <div className="bg-white border rounded-2xl overflow-hidden shadow-xl" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex flex-col lg:flex-row gap-8 p-6 md:p-8">
            <div className="lg:w-[45%] flex flex-col sm:flex-row gap-4">
              {variantImages.length > 1 ? (
                <div className="flex sm:flex-col gap-2 order-2 sm:order-first sm:w-16 shrink-0">
                  {variantImages.map((v) => (
                    <button key={v.color} onClick={() => setPickedColor(v.color)} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 ${pickedColor === v.color ? "border-[var(--color-accent)]" : "border-gray-200"}`}>
                      <img src={v.image} alt={v.color_name || v.color} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : allImages.length > 1 ? (
                <div className="flex sm:flex-col gap-2 order-2 sm:order-first sm:w-16 shrink-0">
                  {allImages.map((img, idx) => (
                    <button key={idx} onClick={() => setActiveGalleryIndex(idx)} className={`w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden border-2 ${activeGalleryIndex === idx ? "border-[var(--color-accent)]" : "border-gray-200"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="w-full aspect-[3/4]">
                <ImageZoom src={displayImage} alt={product.title}>
                  {product.isBestSeller && <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow z-10">BEST SELLER</span>}
                  {product.isLimitedTime && (!dealExpired || dealFadingOut) && <span className={`absolute top-3 right-3 bg-rose-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow z-10 ${dealFadingOut ? "deal-fade-out" : "animate-pulse"}`}>LIMITED</span>}
                </ImageZoom>
              </div>
            </div>

            <div className="lg:w-[25%]">
              <span className="text-[10px] bg-gray-100 px-3 py-1 rounded text-gray-500 uppercase tracking-widest font-bold">{product.brand} ORIGINAL</span>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 mt-2 leading-tight">{product.title}</h1>
              {(product.showRatings || product.showBought) && (
                <div className="flex items-center gap-2 mt-3 text-xs">
                  {product.showRatings && <div className="flex items-center text-amber-400">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(product.ratings.score) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />)}<span className="font-extrabold ml-1">{product.ratings.score.toFixed(1)}/5.0</span></div>}
                  {product.showBought && <span className="text-gray-500">({product.boughtLastMonth}+ bought)</span>}
                </div>
              )}
              <div className="mt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Color : {pickedColor ? dispColorNames?.[dispColors.indexOf(pickedColor)] || pickedColor : "Select"}</label>
                <div className="flex flex-wrap gap-2">
                  {dispColors.map((c, idx) => {
                    const isPicked = pickedColor === c || (!pickedColor && idx === 0);
                    const avail = pickedSize ? getVariantAvailability(product as any, c, pickedSize) : "available";
                    const blocked = avail === "discontinued" || avail === "out_of_stock";
                    return <button key={idx} onClick={() => !blocked && setPickedColor(c)} disabled={blocked} className={`w-9 h-9 rounded-full border-2 p-0.5 ${isPicked ? "border-cyan-400 scale-105 shadow-md" : "border-gray-200"} ${blocked ? "opacity-40 cursor-not-allowed grayscale" : ""}`} style={{ backgroundColor: c }} title={dispColorNames?.[idx] || c} />;
                  })}
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Size : {pickedSize}</label>
                  <button onClick={() => setSizeGuideOpen(!sizeGuideOpen)} className="text-[10px] text-[var(--color-accent)] hover:underline flex items-center gap-1"><Info size={12} /> Size guide</button>
                </div>
                {sizeGuideOpen && <div className="p-3 bg-gray-50 border rounded-lg text-[10px] text-gray-500 mb-3 max-h-60 overflow-y-auto">{product.sizeGuide && (product.sizeGuide.size_tables || product.sizeGuide.measurements) ? <SizeGuideDisplay sizeGuide={product.sizeGuide} /> : <p>Unisex fit: S(48cm) M(51cm) L(54cm) XL(57cm)</p>}</div>}
                <div className="flex flex-wrap gap-1.5">
                  {dispSizes.map((s) => {
                    const avail = getVariantAvailability(product as any, pickedColor, s);
                    const blocked = avail === "discontinued" || avail === "out_of_stock";
                    return <button key={s} onClick={() => !blocked && setPickedSize(s)} disabled={blocked} className={`min-w-10 h-8 rounded border text-xs font-bold uppercase px-2.5 ${pickedSize === s ? "border-cyan-400 bg-[var(--color-accent-bg)]" : "border-gray-200 bg-gray-50/60"} ${blocked ? "opacity-40 line-through cursor-not-allowed" : ""}`}>{s}</button>;
                  })}
                </div>
              </div>
              <div className="mt-5 text-xs text-gray-600 leading-relaxed border-b pb-5" style={{ borderColor: "var(--color-border)" }}>
                <p className="font-bold text-gray-500 uppercase tracking-wider mb-1">Product details :</p>
                {product.fullDescription ? <div className="whitespace-pre-line">{product.fullDescription}</div> : <p className="italic">{product.description}</p>}
              </div>
            </div>

            <div className="lg:w-[25%] flex flex-col gap-4">
              <div className="bezel-outer">
                <div className="bezel-inner p-5 flex flex-col gap-4">
                  {product.dealActive && !dealExpired && product.dealPrice ? (
                    <div><span className="text-2xl font-black text-rose-500">{product.dealPrice.toFixed(2)} {currencySymbol}</span><span className="text-sm line-through ml-2" style={{ color: "var(--color-ink4)" }}>{product.price.toFixed(2)} {currencySymbol}</span><p className="text-xs font-semibold text-rose-500">-{Math.round((1 - product.dealPrice / product.price) * 100)}% Limited deal {countdownString && <span className="font-mono">({countdownString})</span>}</p></div>
                  ) : (
                    <div><span className="text-2xl font-black" style={{ color: "var(--color-ink)" }}>{displayPrice.toFixed(2)} {currencySymbol}</span>{product.originalPrice && <span className="text-sm line-through ml-2" style={{ color: "var(--color-ink4)" }}>{product.originalPrice.toFixed(2)} {currencySymbol}</span>}</div>
                  )}
                  <div className="text-xs" style={{ color: "var(--color-ink3)" }}>Color: <strong style={{ color: "var(--color-ink)" }}>{pickedColor ? dispColorNames?.[dispColors.indexOf(pickedColor)] || pickedColor : "—"}</strong> · Size: <strong style={{ color: "var(--color-ink)" }}>{pickedSize}</strong></div>
                  {(() => {
                    const curAvail = getVariantAvailability(product as any, pickedColor, pickedSize);
                    const blocked = !product.isActive || curAvail !== "available";
                    if (blocked) {
                      const msg = !product.isActive ? "This item is currently unavailable." : curAvail === "discontinued" ? "Variant removed by supplier." : "Temporarily out of stock.";
                      return <div className="text-center"><p className="text-xs text-rose-500 mb-3">{msg}</p><button disabled className="w-full bg-gray-200 text-gray-400 font-black text-xs py-3.5 rounded-xl uppercase cursor-not-allowed">Add to cart</button></div>;
                    }
                    return <div className="flex flex-col gap-2"><button onClick={() => onAddToCart(product, pickedColor || product.colors[0] || "#000000", pickedSize)} className="w-full btn btn-accent">Add to cart</button><button onClick={() => onBuyNow(product, pickedColor || product.colors[0] || "#000000", pickedSize)} className="w-full btn" style={{ background: "#f59e0b", color: "#1a1916" }}>Buy now</button><button onClick={() => onToggleFavorite(product.id)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold" style={{ background: favorites.includes(product.id) ? "#FEF2F2" : "var(--color-surface2)", border: `1.5px solid ${favorites.includes(product.id) ? "#FECACA" : "var(--color-border)"}`, color: favorites.includes(product.id) ? "#EF4444" : "var(--color-ink3)" }}><Heart size={16} fill={favorites.includes(product.id) ? "#EF4444" : "none"} />{favorites.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}</button></div>;
                  })()}
                  <div className="text-xs space-y-1" style={{ color: "var(--color-ink3)" }}><p className="flex items-center gap-1 font-semibold" style={{ color: "var(--color-accent)" }}><Truck size={14} /> FREE on orders over $35</p><p>Printed within 24h, delivered by <strong style={{ color: "var(--color-ink2)" }}>{getDeliverEstimateString(4)}</strong></p></div>
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--color-ink4)" }}><ShieldCheck size={14} style={{ color: "var(--color-accent)" }} /> OEKO-TEX® certified</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-black mb-4" style={{ color: "var(--color-ink)" }}>You may also like</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {related.map((p) => (
                <StoreProductCard key={p.id} product={p} isFavorite={favorites.includes(p.id)} dealExpired={!!dealExpired} dealFadingOut={!!dealFadingOut} countdownStr={countdownString || ""} currencySymbol={currencySymbol} onToggleFavorite={onToggleFavorite} onAddToCart={onAddToCart} onSelectProduct={(prod) => { onClose(); setTimeout(() => { const el = document.getElementById(`product-card-${prod.id}`); if (el) el.scrollIntoView({ behavior: "smooth" }); }, 100); }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
