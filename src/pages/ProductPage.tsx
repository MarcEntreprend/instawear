// src/pages/ProductPage.tsx — V2 full + live Supabase
import { useEffect, useState, useMemo } from "react";
import {
  ArrowLeft,
  Star,
  Info,
  Truck,
  Heart,
  ShieldCheck,
  Minus,
  Plus,
  ShoppingBag,
  Check,
} from "lucide-react";
import type { Product } from "../types";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { getVariantAvailability } from "../hooks/useProductAvailability";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import ZoomImage from "../components/product/ZoomImage";
import ImageLightbox from "../components/product/ImageLightbox";
import SizeGuideModal from "../components/product/SizeGuideModal";
import RelatedProductCard from "../components/product/RelatedProductCard";
import FrequentlyBoughtTogether from "../components/product/FrequentlyBoughtTogether";
import RecentlyViewedSection from "../components/product/RecentlyViewedSection";
import ProductReviews from "../components/product/ProductReviews";
import DealCountdown from "../components/DealCountdown";
import StoreProductCard from "../components/StoreProductCard";

export default function ProductPage({
  product,
  products,
  currencySymbol,
  favorites,
  onClose,
  onToggleFavorite,
  onAddToCart,
  onBuyNow,
  onSelectProduct,
  dealExpired = false,
  dealFadingOut = false,
  getDeliverEstimateString,
  initialColor,
  initialSize,
  countdownString,
}: any) {
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
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
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const { ids: recentlyIds, addViewed } = useRecentlyViewed();

  useEffect(() => {
    addViewed(product.id);
  }, [product.id, addViewed]);

  const hasVariants = product.variants && product.variants.length > 0;
  const dispColors = hasVariants
    ? product.variants!.map((v: any) => v.color)
    : product.colors;
  const dispColorNames = hasVariants
    ? product.variants!.map((v: any) => v.color_name)
    : product.colorNames;
  const dispSizes = hasVariants
    ? [
        ...new Set(product.variants!.flatMap((v: any) => Object.keys(v.sizes))),
      ].sort()
    : product.sizes;
  const colorIdx = pickedColor ? dispColors.indexOf(pickedColor) : 0;
  const activeVariant =
    hasVariants && colorIdx >= 0 ? product.variants![colorIdx] : null;
  const allImages = [product.image, ...(product.gallery || [])].filter(
    (u: string) => u && u.trim().length > 0 && u !== PLACEHOLDER_IMG,
  );
  const displayImage =
    allImages[activeGalleryIndex] || activeVariant?.image || PLACEHOLDER_IMG;
  const gallery = allImages.length ? allImages : [displayImage];
  const currentVariantPrice = activeVariant?.sizes?.[pickedSize]?.price;
  const displayPrice =
    currentVariantPrice != null ? currentVariantPrice : product.price;
  const dealLive =
    product.dealActive && !dealExpired && product.dealPrice != null;
  const unitPrice = dealLive ? product.dealPrice! : displayPrice;

  const related = useMemo(
    () =>
      products
        .filter((p: Product) => p.id !== product.id && p.isActive)
        .slice(0, 8),
    [products, product.id],
  );
  const frequentlyAddOns = useMemo(
    () =>
      products
        .filter(
          (p: Product) =>
            p.id !== product.id &&
            p.category !== product.category &&
            p.isActive,
        )
        .slice(0, 3),
    [products, product.category, product.id],
  );
  const recentlyProducts = useMemo(
    () =>
      recentlyIds
        .map((id) => products.find((p: Product) => p.id === id))
        .filter(Boolean)
        .filter((p: any) => p.id !== product.id)
        .slice(0, 8) as Product[],
    [recentlyIds, products, product.id],
  );

  const canAdd =
    pickedSize &&
    product.inStock !== false &&
    getVariantAvailability(product, pickedColor, pickedSize) === "available";
  const handleAdd = () => {
    if (!canAdd || !pickedSize) return;
    onAddToCart(product, pickedColor || dispColors[0] || "#000000", pickedSize);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };
  const handleBuyNow = () => {
    if (!canAdd || !pickedSize) return;
    onBuyNow(product, pickedColor || dispColors[0] || "#000000", pickedSize);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-350 mx-auto px-4 sm:px-6 pt-4 pb-24 lg:pb-16">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm font-semibold mb-4 hover:underline"
          style={{ color: "var(--color-ink2)" }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_320px] gap-8 xl:gap-10">
          {/* Gallery */}
          <div className="flex gap-3">
            <div className="hidden sm:flex flex-col gap-2.5 w-16 shrink-0">
              {gallery.map((img: string, i: number) => (
                <button
                  key={img + i}
                  onClick={() => setActiveGalleryIndex(i)}
                  className="w-16 h-16 rounded-xl overflow-hidden shrink-0"
                  style={{
                    border:
                      activeGalleryIndex === i
                        ? "2px solid var(--color-accent)"
                        : "1px solid var(--color-border)",
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
            <div className="flex-1">
              <ZoomImage
                src={displayImage}
                alt={product.title}
                onRequestLightbox={() => setIsLightboxOpen(true)}
              />
              <div className="flex sm:hidden gap-2.5 mt-3 overflow-x-auto no-scrollbar">
                {gallery.map((img: string, i: number) => (
                  <button
                    key={img + i}
                    onClick={() => setActiveGalleryIndex(i)}
                    className="w-16 h-16 rounded-xl overflow-hidden shrink-0"
                    style={{
                      border:
                        activeGalleryIndex === i
                          ? "2px solid var(--color-accent)"
                          : "1px solid var(--color-border)",
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
            </div>
          </div>

          {/* Infos */}
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--color-ink3)" }}
            >
              {product.brand}
            </p>
            <h1
              className="text-xl sm:text-2xl font-extrabold mt-1"
              style={{ color: "var(--color-ink)" }}
            >
              {product.title}
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    fill={
                      i < Math.round(product.ratings.score)
                        ? "var(--color-gold)"
                        : "none"
                    }
                    style={{ color: "var(--color-gold)" }}
                  />
                ))}
              </div>
              <span
                className="text-xs font-semibold"
                style={{ color: "var(--color-ink2)" }}
              >
                {product.ratings.score.toFixed(1)}
              </span>
              <span className="text-xs" style={{ color: "var(--color-ink4)" }}>
                ({product.ratings.count})
              </span>
            </div>

            <div className="flex items-baseline gap-2.5 mt-4">
              <span
                className="text-2xl font-extrabold"
                style={{
                  color: dealLive ? "var(--color-accent)" : "var(--color-ink)",
                }}
              >
                {unitPrice.toFixed(2)} {currencySymbol}
              </span>
              {dealLive && (
                <span
                  className="text-sm line-through"
                  style={{ color: "var(--color-ink4)" }}
                >
                  {(currentVariantPrice ?? product.price).toFixed(2)}{" "}
                  {currencySymbol}
                </span>
              )}
            </div>
            {dealLive && product.dealEndsAt && (
              <div className="mt-2">
                <DealCountdown endsAt={product.dealEndsAt} />
              </div>
            )}

            <div className="mt-6">
              <p
                className="text-xs font-bold uppercase tracking-wider mb-2.5"
                style={{ color: "var(--color-ink3)" }}
              >
                Coloris — {dispColorNames?.[colorIdx] || pickedColor}
              </p>
              <div className="flex items-center gap-2.5">
                {dispColors.map((c: string, i: number) => {
                  const avail = getVariantAvailability(product, c, pickedSize);
                  const blocked =
                    avail === "discontinued" || avail === "out_of_stock";
                  return (
                    <button
                      key={c + i}
                      onClick={() => {
                        if (!blocked) {
                          setPickedColor(c);
                          setActiveGalleryIndex(0);
                        }
                      }}
                      disabled={blocked}
                      aria-label={dispColorNames?.[i]}
                      title={dispColorNames?.[i]}
                      className="w-9 h-9 rounded-full"
                      style={{
                        background: c,
                        border:
                          pickedColor === c
                            ? "2px solid var(--color-accent)"
                            : "1px solid var(--color-border2)",
                        opacity: blocked ? 0.4 : 1,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <p
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Taille {pickedSize && `— ${pickedSize}`}
                </p>
                <button
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: "var(--color-accent)" }}
                >
                  <Info size={12} /> Guide des tailles
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {dispSizes.map((s: string) => {
                  const avail = getVariantAvailability(product, pickedColor, s);
                  const blocked =
                    avail === "discontinued" || avail === "out_of_stock";
                  return (
                    <button
                      key={s}
                      onClick={() => !blocked && setPickedSize(s)}
                      disabled={blocked}
                      className="chip"
                      data-active={pickedSize === s}
                      style={{ opacity: blocked ? 0.4 : 1 }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="mt-8 p-4 rounded-2xl"
              style={{
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: "var(--color-ink3)" }}
              >
                Description
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--color-ink2)" }}
              >
                {product.fullDescription ?? product.description}
              </p>
            </div>
          </div>

          {/* Sticky buy card */}
          <div>
            <div className="card-premium p-5 sticky top-24">
              <div className="flex items-baseline gap-2 mb-4">
                <span
                  className="text-xl font-extrabold"
                  style={{ color: "var(--color-ink)" }}
                >
                  {unitPrice.toFixed(2)} {currencySymbol}
                </span>
                {dealLive && (
                  <span
                    className="text-xs line-through"
                    style={{ color: "var(--color-ink4)" }}
                  >
                    {product.price.toFixed(2)} {currencySymbol}
                  </span>
                )}
              </div>
              {!canAdd && (
                <p
                  className="text-xs mb-3"
                  style={{ color: "var(--color-negative)" }}
                >
                  Choisissez une taille disponible
                </p>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex items-center rounded-full"
                  style={{ border: "1px solid var(--color-border)" }}
                >
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-10 h-11 flex items-center justify-center"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-bold font-mono-num">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-10 h-11 flex items-center justify-center"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Qté
                </span>
              </div>
              <button
                onClick={handleAdd}
                disabled={!canAdd}
                className="btn btn-accent w-full disabled:opacity-40"
              >
                <ShoppingBag size={16} />{" "}
                {justAdded ? "Ajouté" : "Ajouter au panier"}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!canAdd}
                className="btn btn-primary w-full mt-3 disabled:opacity-40"
              >
                Acheter maintenant
              </button>
              <button
                onClick={() => onToggleFavorite(product.id)}
                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold"
                style={{
                  background: favorites.includes(product.id)
                    ? "#FEF2F2"
                    : "var(--color-surface2)",
                  border: `1px solid ${favorites.includes(product.id) ? "#FECACA" : "var(--color-border)"}`,
                  color: favorites.includes(product.id)
                    ? "#EF4444"
                    : "var(--color-ink3)",
                }}
              >
                <Heart
                  size={14}
                  fill={favorites.includes(product.id) ? "#EF4444" : "none"}
                />{" "}
                {favorites.includes(product.id)
                  ? "Retirer des favoris"
                  : "Favoris"}
              </button>
              <div
                className="flex items-center gap-4 text-xs mt-6"
                style={{ color: "var(--color-ink3)" }}
              >
                <span className="flex items-center gap-1.5">
                  <Truck size={13} /> Livraison rapide
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={13} /> Paiement sécurisé
                </span>
              </div>
            </div>
          </div>
        </div>

        <FrequentlyBoughtTogether
          mainProduct={product}
          mainImage={displayImage}
          mainUnitPrice={unitPrice}
          mainCanAdd={!!canAdd}
          addOns={frequentlyAddOns}
          onAddMain={handleAdd}
          onQuickAddProduct={(p: Product) =>
            onAddToCart(p, p.colors?.[0] || "#000", "M")
          }
        />
        <RecentlyViewedSection
          products={recentlyProducts}
          onSelect={(p: Product) => {
            onClose();
            setTimeout(() => onSelectProduct?.(p), 100);
          }}
          onQuickAdd={(p: Product) =>
            onAddToCart(p, p.colors?.[0] || "#000", "M")
          }
        />
        <ProductReviews productId={product.id} />

        <div className="mt-14">
          <p className="eyebrow mb-4">Vous aimerez aussi</p>
          <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x pb-1">
            {related.map((p: Product) => (
              <RelatedProductCard
                key={p.id}
                product={p}
                onSelect={(prod) => {
                  onClose();
                  setTimeout(() => onSelectProduct?.(prod), 100);
                }}
                onQuickAdd={(prod) =>
                  onAddToCart(prod, prod.colors?.[0] || "#000", "M")
                }
              />
            ))}
          </div>
        </div>
      </div>

      {isLightboxOpen && (
        <ImageLightbox
          images={gallery}
          initialIndex={activeGalleryIndex}
          alt={product.title}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
      <SizeGuideModal
        isOpen={isSizeGuideOpen}
        sizeGuide={product.sizeGuide}
        onClose={() => setIsSizeGuideOpen(false)}
      />

      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-16 safe-bottom"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <span
          className="text-sm font-extrabold"
          style={{ color: "var(--color-ink)" }}
        >
          {unitPrice.toFixed(2)} {currencySymbol}
        </span>
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="btn btn-accent flex-1 disabled:opacity-40"
        >
          <ShoppingBag size={15} /> Ajouter
        </button>
      </div>
    </div>
  );
}
