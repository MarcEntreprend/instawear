// src/components/ProductCard.tsx

import React from "react";
import { Heart, Star, ShoppingCart, Clock } from "lucide-react";
import { Product } from "../types";

const IMG =
  "https://i5.walmartimages.com/seo/Haiti-Haitian-Flag-Coat-of-Arms-Red-Men-Zipper-T-shirt-Summer-Casual-Short-Sleeve-T-shirt-Top_4abff044-fb73-40b5-b666-b1d93754eb3b.c531c430d04c42d5dc091756c19ffccc.jpeg?odnHeight=573&odnWidth=573&odnBg=FFFFFF";

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  countdownStr: string;
}

export default function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
  onViewDetails,
  countdownStr,
}: ProductCardProps) {
  const [hovered, setHovered] = React.useState(false);

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <article
      className="rounded-2xl overflow-hidden flex flex-col h-full cursor-pointer"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        transition:
          "transform 0.35s var(--ease-out-expo), box-shadow 0.35s var(--ease-out-expo)",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hovered ? "var(--shadow-xl)" : "var(--shadow-xs)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div
        className="relative aspect-4/5 overflow-hidden bg-(--color-surface2) shrink-0"
        onClick={() => onViewDetails(product)}
      >
        <img
          src={product.image || IMG}
          alt={`${product.title} — InstaWear`}
          className="w-full h-full object-cover transition-transform duration-500 ease-(--ease-out-expo)"
          style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
          loading="lazy"
        />

        {/* Overlay aperçu rapide (logique V3) */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-300"
          style={{
            background: "rgba(26,20,10,0.45)",
            opacity: hovered ? 1 : 0,
          }}
        >
          <span className="bg-white/95 text-(--color-ink) font-bold text-xs px-4 py-2 rounded-full shadow-md tracking-wider">
            Aperçu rapide
          </span>
        </div>

        {/* Badges (visuel V2) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isBestSeller && (
            <span
              className="badge text-gray-900"
              style={{ background: "var(--color-gold)" }}
            >
              ★ Best seller
            </span>
          )}
          {product.isLimitedTime && (
            <span
              className="badge text-gray-900"
              style={{ background: "#EF4444" }}
            >
              Offre limitée
            </span>
          )}
          {product.inStock === false && (
            <span
              className="badge"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-ink3)",
                border: "1px solid var(--color-border)",
              }}
            >
              Sur commande
            </span>
          )}
          {discount > 0 && (
            <span
              className="badge text-gray-900"
              style={{ background: "var(--color-accent)" }}
            >
              -{discount}%
            </span>
          )}
        </div>

        {/* Heart button (mix V2/V3, dynamique) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          className="absolute top-3 right-3 w-8.5 h-8.5 rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 ease-(--ease-spring) hover:scale-110"
          style={{
            background: isFavorite
              ? "var(--color-accent)"
              : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${isFavorite ? "transparent" : "var(--color-border)"}`,
          }}
          aria-label={
            isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
          }
        >
          <Heart
            size={14}
            strokeWidth={2}
            style={{
              color: isFavorite ? "white" : "var(--color-ink2)",
              fill: isFavorite ? "white" : "none",
            }}
          />
        </button>
      </div>

      {/* Content (visuel V2 avec classes Tailwind) */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {product.colors.slice(0, 5).map((c, i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full border border-(--color-border)"
              style={{ backgroundColor: c }}
              title={product.colorNames?.[i] || c}
            />
          ))}
          {product.colors.length > 5 && (
            <span className="text-[10px] text-(--color-ink4) font-bold">
              +{product.colors.length - 5}
            </span>
          )}
        </div>

        {/* Brand + Title */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-ink4) mb-0.5">
            {product.brand}
          </p>
          <h3
            onClick={() => onViewDetails(product)}
            className="text-sm font-semibold leading-snug cursor-pointer transition-colors duration-150 line-clamp-2 text-(--color-ink) hover:text-(--color-accent)"
            style={{ fontFamily: "var(--font-sans)", minHeight: "2.5em" }}
          >
            {product.title}
          </h3>
        </div>

        {/* Ratings */}
        <div className="flex items-center gap-1.5 text-xs text-(--color-ink3)">
          <div className="flex items-center gap-0.5 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={10}
                strokeWidth={0}
                fill={
                  i < Math.round(product.ratings.score) ? "#F59E0B" : "#E5E7EB"
                }
              />
            ))}
          </div>
          <span className="font-semibold text-(--color-ink2)">
            {product.ratings.score.toFixed(1)}
          </span>
          <span>({product.ratings.count})</span>
          <span>·</span>
          <span className="text-(--color-accent) font-semibold">
            {product.boughtLastMonth}+ ce mois
          </span>
        </div>

        {/* Countdown (visuel V2) */}
        {product.isLimitedTime && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
            <Clock size={11} strokeWidth={2.5} />
            <span>Fin dans {countdownStr}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span
            className="text-lg font-black text-(--color-ink) tabular-nums"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {product.price.toFixed(2)} $
          </span>
          {product.originalPrice && (
            <span className="text-sm line-through text-(--color-ink4) tabular-nums">
              {product.originalPrice.toFixed(2)} $
            </span>
          )}
        </div>

        {/* Add to cart (style V2, transitions dynamiques) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
          style={{
            background: "var(--color-accent-bg)",
            color: "var(--color-accent)",
            border: "1.5px solid rgba(255,92,53,0.2)",
            fontFamily: "var(--font-sans)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent)";
            e.currentTarget.style.color = "white";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent-bg)";
            e.currentTarget.style.color = "var(--color-accent)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <ShoppingCart size={14} strokeWidth={2} />
          Ajouter au panier
        </button>
      </div>
    </article>
  );
}
