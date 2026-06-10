import React from "react";
import { Heart, Star, ShoppingCart, Clock } from "lucide-react";
import { Product } from "../types";

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
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <article
      itemScope
      itemType="https://schema.org/Product"
      className="card-lift rounded-2xl overflow-hidden flex flex-col h-full"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Schema.org hidden */}
      <meta itemProp="name" content={product.title} />
      <meta itemProp="brand" content={product.brand} />
      <meta itemProp="image" content={product.image} />
      <div
        itemProp="offers"
        itemScope
        itemType="https://schema.org/Offer"
        style={{ display: "none" }}
      >
        <meta itemProp="price" content={String(product.price)} />
        <meta itemProp="priceCurrency" content="EUR" />
        <meta
          itemProp="availability"
          content={
            product.inStock !== false
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock"
          }
        />
      </div>

      {/* Image */}
      <div
        className="relative aspect-4/5 overflow-hidden cursor-pointer"
        style={{ background: "var(--color-surface2)" }}
        onClick={() => onViewDetails(product)}
      >
        <img
          src={product.image}
          alt={`${product.title} — InstaWear`}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          loading="lazy"
        />

        {/* Overlaid badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isBestSeller && (
            <span
              className="badge text-white"
              style={{ background: "var(--color-gold)" }}
            >
              ★ Best seller
            </span>
          )}
          {product.isLimitedTime && (
            <span
              className="badge text-white"
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
              className="badge text-white"
              style={{ background: "var(--color-accent)" }}
            >
              -{discount}%
            </span>
          )}
        </div>

        {/* Heart button */}
        <button
          className={`btn-heart ${isFavorite ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          aria-label={
            isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"
          }
        >
          <Heart
            size={15}
            strokeWidth={2}
            style={{
              color: isFavorite ? "white" : "var(--color-ink2)",
              fill: isFavorite ? "white" : "none",
            }}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {product.colors.slice(0, 5).map((c, i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full border"
              style={{ backgroundColor: c, borderColor: "var(--color-border)" }}
              title={product.colorNames?.[i] || c}
            />
          ))}
          {product.colors.length > 5 && (
            <span style={{ fontSize: "10px", color: "var(--color-ink4)" }}>
              +{product.colors.length - 5}
            </span>
          )}
        </div>

        {/* Brand + Title */}
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-0.5"
            style={{ color: "var(--color-ink4)" }}
          >
            {product.brand}
          </p>
          <h3
            onClick={() => onViewDetails(product)}
            className="text-sm font-semibold leading-snug cursor-pointer transition-colors duration-150 line-clamp-2"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
              minHeight: "2.5em",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--color-accent)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--color-ink)")
            }
          >
            {product.title}
          </h3>
        </div>

        {/* Ratings */}
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ color: "var(--color-ink3)" }}
        >
          <div
            className="flex items-center gap-0.5"
            style={{ color: "#F59E0B" }}
          >
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
          <span
            className="font-semibold"
            style={{ color: "var(--color-ink2)" }}
          >
            {product.ratings.score.toFixed(1)}
          </span>
          <span>({product.ratings.count})</span>
          <span>·</span>
          <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
            {product.boughtLastMonth}+ ce mois
          </span>
        </div>

        {/* Countdown for limited */}
        {product.isLimitedTime && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold"
            style={{ background: "#FEF2F2", color: "#DC2626" }}
          >
            <Clock size={11} strokeWidth={2.5} />
            <span>Fin dans {countdownStr}</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span
            className="text-lg font-black"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {product.price.toFixed(2)} €
          </span>
          {product.originalPrice && (
            <span
              className="text-sm line-through"
              style={{ color: "var(--color-ink4)" }}
            >
              {product.originalPrice.toFixed(2)} €
            </span>
          )}
        </div>

        {/* Add to cart */}
        <button
          onClick={() => onAddToCart(product)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
          style={{
            background: "var(--color-accent-bg)",
            color: "var(--color-accent)",
            border: "1.5px solid rgba(255,92,53,.2)",
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
