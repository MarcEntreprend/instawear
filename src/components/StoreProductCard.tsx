// src/components/StoreProductCard.tsx — V2 ticket-card visuals + V1 logic (availability, deal, currency)
import { useEffect, useState } from "react";
import { Heart, Star, Flame, Check, ShoppingBag } from "lucide-react";
import DealCountdown from "./DealCountdown";
import type { Product } from "../types";
import { variantImageForColor, filterAddCandidate } from "../utils/colors";
import {
  useProductAvailability,
  getVariantAvailability,
  pickAvailableVariant,
} from "../hooks/useProductAvailability";
import { formatAmount } from "../data/currency";
import { DISCOUNT_EVENT_TYPE } from "../data/categories";
import { PLACEHOLDER_IMG, CART_PLUS_ICON } from "../constants/assets";
import { imageKitUrl, imageKitSrcSet } from "../lib/imagekit";
import { isDealLive } from "../utils/deals";

interface StoreProductCardProps {
  product: Product;
  isFavorite: boolean;
  currencySymbol: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onSelectProduct: (product: Product) => void;
  showDeliveryInfo?: boolean;
  getDeliverEstimateString?: (days: number) => string;
  /** Couleur active du filtre : la carte montre le visuel de cette variante. */
  activeColor?: string | null;
  /** Taille active du filtre : l'ajout rapide la préfère (si dispo). */
  activeSize?: string | null;
}

export default function StoreProductCard({
  product,
  isFavorite,
  currencySymbol,
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
  activeColor = null,
  activeSize = null,
}: StoreProductCardProps) {
  const fallbackSrc = product.image || PLACEHOLDER_IMG;
  // Progressif : on affiche l'image par défaut TEL QUEL, puis on bascule sur
  // le visuel de la variante dès qu'il est chargé (jamais de trou ni de flash).
  const [variantSrc, setVariantSrc] = useState<string | null>(null);
  useEffect(() => {
    setVariantSrc(null);
    const found = variantImageForColor(
      product.variants,
      (product as any).colors,
      (product as any).colorNames,
      activeColor,
    );
    if (!found || found === fallbackSrc) return;
    let cancelled = false;
    const preloader = new Image();
    preloader.onload = () => {
      if (!cancelled) setVariantSrc(found);
    };
    preloader.src = found;
    return () => {
      cancelled = true;
    };
  }, [product.id, activeColor]);
  const shownSrc = variantSrc || fallbackSrc;
  // Images responsives (P3 perf) : srcSet ImageKit quand la source y est
  // éligible (sinon src unique, jamais de srcSet factice). Tailles réelles :
  // 72vw en carrousel mobile, ~300px en grille.
  const cardSrcSet = (() => {
    const probe = imageKitUrl(shownSrc, {
      width: 320,
      quality: 80,
      format: "webp",
    });
    if (probe === shownSrc) return undefined;
    return imageKitSrcSet(
      shownSrc,
      { quality: 80, format: "webp" },
      [320, 480, 768],
    );
  })();
  const availability = useProductAvailability(product);
  const unavailable = availability !== "available";
  // Première variante réellement achetable (couleur × taille dispo).
  // Aucune → carte non achetable, même si une taille est présélectionnée
  // par défaut (zéro toast d'erreur, zéro commande impossible).
  const firstAvailable = pickAvailableVariant(product);
  const purchasable = !unavailable && firstAvailable != null;
  // Ajout rapide sous filtre : couleur/taille du filtre si la variante est
  // dispo, sinon repli première dispo (jamais de toast bloquant surprise :
  // ce qu'on voit partir en panier = ce que la carte montrait).
  const quickAddTarget = (() => {
    if (!firstAvailable) return null;
    const cand = filterAddCandidate(
      product.colors,
      product.sizes,
      activeColor,
      activeSize,
      { color: firstAvailable.color, size: firstAvailable.size },
    );
    if (!cand) return null;
    return getVariantAvailability(product as any, cand.color, cand.size) ===
      "available"
      ? cand
      : firstAvailable;
  })();

  const swatches = product.variants?.length
    ? product.variants.map((v) => ({ hex: v.color, name: v.color_name }))
    : (product.colors ?? []).map((hex, i) => ({
        hex,
        name: product.colorNames?.[i] ?? hex,
      }));
  const visibleSwatches = swatches.slice(0, 3);
  const extraSwatches = swatches.length - visibleSwatches.length;
  // Deal PAR PRODUIT (pur, monotone) : fini le latch global qui tuait tous
  // les deals à la première promo expirée + faisait flicker LIMITED.
  const dealLive = isDealLive(product);

  const displayPrice = dealLive ? product.dealPrice! : product.price;
  const strikePrice = dealLive
    ? product.price
    : product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : null;

  return (
    <article
      className={`ticket-card animate-fade-up group ${unavailable ? "opacity-90" : ""}`}
    >
      <div className="relative p-2 pb-0">
        <a
          href={`/produit/${product.id}`}
          onClick={(e) => {
            e.preventDefault();
            onSelectProduct(product);
          }}
          className="block cursor-pointer"
        >
          {/* Cadre unique (fini le double carré bezel + wrapper) : l'image
              y gagne ~12px de côté. */}
          <div className="bezel-outer overflow-hidden">
            <div
              className="aspect-square overflow-hidden"
              style={{ borderRadius: 15 }}
            >
              <img
                src={shownSrc}
                srcSet={cardSrcSet}
                sizes="(max-width: 640px) 72vw, 300px"
                alt={product.title}
                loading="lazy"
                decoding="async"
                onError={() => {
                  // Visuel variante KO → retour image par défaut (jamais de trou).
                  if (shownSrc !== fallbackSrc) setVariantSrc(null);
                  else if (fallbackSrc !== PLACEHOLDER_IMG) {
                    setVariantSrc(PLACEHOLDER_IMG);
                  }
                }}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
            </div>
          </div>
        </a>
        <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
          {dealLive && (
            <span className="badge badge-accent animate-pulse">Deal</span>
          )}
          {!dealLive && product.isBestSeller && (
            <span className="badge badge-ink">Best-seller</span>
          )}
          {!dealLive && product.isLimitedTime && (
            <span className="badge badge-gold">Limited</span>
          )}
          {product.eventType === DISCOUNT_EVENT_TYPE && (
            <span
              className="badge"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-ink)",
                border: "1px solid var(--color-border)",
              }}
            >
              Deals{" "}
              <span className="inline-block w-2 h-2 bg-rose-500 rounded-full animate-ping ml-1" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            // Hors du lien produit : plus de preventDefault nécessaire,
            // stopPropagation conservé (garde contre un futur handler carte).
            e.stopPropagation();
            if (!unavailable) onToggleFavorite(product.id);
          }}
          aria-label={isFavorite ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isFavorite}
          disabled={unavailable}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isFavorite
              ? "var(--color-accent)"
              : "var(--color-surface)",
            boxShadow: "var(--shadow-md)",
            border: `1px solid ${isFavorite ? "var(--color-accent)" : "var(--color-border)"}`,
          }}
        >
          <Heart
            size={16}
            fill={isFavorite ? "#fff" : "none"}
            style={{ color: isFavorite ? "#fff" : "var(--color-ink3)" }}
          />
        </button>
      </div>

      <div className="p-4 pt-3">
        <h3
          className="text-sm font-bold leading-snug mb-1.5 line-clamp-2 transition-colors"
          style={{ color: "var(--color-ink)" }}
          title={product.title}
        >
          <a
            href={`/produit/${product.id}`}
            onClick={(e) => {
              e.preventDefault();
              onSelectProduct(product);
            }}
            className="group-hover:text-(--color-accent)"
          >
            {product.title}
          </a>
        </h3>

        {((product.showRatings !== false && product.ratings?.count > 0) ||
          product.showBought) && (
          <div className="flex items-center gap-1.5 mb-2.5 text-xs">
            {product.showRatings !== false && product.ratings?.count > 0 && (
              <>
                <span className="flex items-center gap-1 text-amber-400">
                  <Star
                    size={13}
                    fill="var(--color-gold)"
                    style={{ color: "var(--color-gold)" }}
                  />
                  <span
                    className="font-bold"
                    style={{ color: "var(--color-ink2)" }}
                  >
                    {product.ratings.score.toFixed(1)}
                  </span>
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "var(--color-ink4)" }}
                >
                  ({product.ratings.count})
                </span>
              </>
            )}
            {product.showBought && (
              <span
                className="text-[11px] font-medium ml-1"
                style={{ color: "var(--color-accent-ink)" }}
              >
                {product.boughtLastMonth}+ bought
              </span>
            )}
          </div>
        )}

        {visibleSwatches.length > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            {visibleSwatches.map((s, i) => (
              <span
                key={i}
                title={s.name}
                className="w-4 h-4 rounded-full"
                style={{
                  background: s.hex,
                  border: "1px solid var(--color-border2)",
                }}
              />
            ))}
            {extraSwatches > 0 && (
              <span
                className="text-[11px] font-semibold"
                style={{ color: "var(--color-ink4)" }}
                title={`+${extraSwatches} colors`}
              >
                +{extraSwatches}
              </span>
            )}
          </div>
        )}

        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span
              className="text-base font-extrabold"
              style={{
                color: dealLive ? "var(--color-accent-ink)" : "var(--color-ink)",
              }}
            >
              {formatAmount(displayPrice, currencySymbol)}
            </span>
            {strikePrice != null && (
              <span
                className="text-xs line-through"
                style={{ color: "var(--color-ink4)" }}
              >
                {formatAmount(strikePrice, currencySymbol)}
              </span>
            )}
          </div>
          {unavailable ? (
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--color-negative)" }}
            >
              {availability === "out_of_stock"
                ? "Out of stock"
                : "Unavailable"}
            </span>
          ) : product.inStock === false ? (
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--color-negative)" }}
            >
              Sold out
            </span>
          ) : (product as any).stock_quantity !== undefined &&
            (product as any).stock_quantity !== null &&
            (product as any).stock_quantity <= 10 ? (
            <span
              className="text-xs font-semibold flex items-center gap-1"
                style={{ color: "var(--color-accent-ink)" }}
              >
                <Flame size={12} /> Only {(product as any).stock_quantity} left
            </span>
          ) : (
            // État positif masqué en mobile (fini la confusion Limited /
            // In stock) : seuls les avertissements s'affichent (< lg).
            <span
              className="text-xs font-semibold items-center gap-1 hidden lg:inline-flex"
              style={{ color: "var(--color-success)" }}
            >
              <Check size={12} /> In stock
            </span>
          )}
        </div>

        {dealLive && product.dealEndsAt && (
          <div className="mt-3">
            <DealCountdown endsAt={product.dealEndsAt} compact />
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {!purchasable ? (
          <button
            disabled
            className="btn w-full bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
          >
            <ShoppingBag size={15} /> Unavailable
          </button>
        ) : (
          <button
            onClick={() => {
              if (quickAddTarget)
                onAddToCart(
                  product,
                  quickAddTarget.color,
                  quickAddTarget.size,
                );
            }}
            className="btn btn-primary w-full"
          >
            <img
              src={CART_PLUS_ICON}
              alt=""
              className="w-4 h-4"
              loading="lazy"
              decoding="async"
              style={{ filter: "brightness(0) invert(1)" }}
            />{" "}
            Add to cart
          </button>
        )}
      </div>
    </article>
  );
}
