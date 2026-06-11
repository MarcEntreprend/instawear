import React from "react";
import { Heart, Star, ShoppingCart, Clock } from "lucide-react";
import { Product } from "../types";

const IMG =
  "https://cdn.pixabay.com/photo/2026/01/26/22/44/cat-10089737_1280.png";

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
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        transition:
          "transform 0.35s var(--ease-out-expo), box-shadow 0.35s var(--ease-out-expo)",
        transform: hovered ? "translateY(-5px)" : "translateY(0)",
        boxShadow: hovered ? "var(--shadow-xl)" : "var(--shadow-xs)",
        cursor: "pointer",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          aspectRatio: "4/5",
          overflow: "hidden",
          background: "var(--color-surface2)",
          flexShrink: 0,
        }}
        onClick={() => onViewDetails(product)}
      >
        <img
          src={product.image || IMG}
          alt={`${product.title} — InstaWear`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.5s var(--ease-out-expo)",
            transform: hovered ? "scale(1.06)" : "scale(1)",
          }}
          loading="lazy"
        />

        {/* Quick-view overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(26,20,10,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.3s",
          }}
        >
          <span
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "var(--color-ink)",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 12,
              padding: "8px 18px",
              borderRadius: "var(--radius-pill)",
              boxShadow: "var(--shadow-md)",
              letterSpacing: "0.04em",
            }}
          >
            Aperçu rapide
          </span>
        </div>

        {/* Badges top-left */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          {product.isBestSeller && (
            <span
              style={{
                background: "var(--color-gold-bg)",
                color: "var(--color-gold)",
                border: "1px solid rgba(201,134,10,0.2)",
                borderRadius: "var(--radius-pill)",
                padding: "3px 9px",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              ★ Best seller
            </span>
          )}
          {product.isLimitedTime && (
            <span
              style={{
                background: "#fef2f2",
                color: "#dc2626",
                border: "1px solid rgba(220,38,38,0.18)",
                borderRadius: "var(--radius-pill)",
                padding: "3px 9px",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Offre limitée
            </span>
          )}
          {discount > 0 && !product.isLimitedTime && (
            <span
              style={{
                background: "var(--color-accent)",
                color: "#fff",
                borderRadius: "var(--radius-pill)",
                padding: "3px 9px",
                fontSize: 9,
                fontWeight: 800,
              }}
            >
              -{discount}%
            </span>
          )}
          {product.inStock === false && (
            <span
              style={{
                background: "var(--color-surface)",
                color: "var(--color-ink3)",
                border: "1px solid var(--color-border2)",
                borderRadius: "var(--radius-pill)",
                padding: "3px 9px",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Sur commande
            </span>
          )}
        </div>

        {/* Heart button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product.id);
          }}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: isFavorite
              ? "var(--color-accent)"
              : "rgba(255,255,255,0.9)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${isFavorite ? "transparent" : "var(--color-border)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
            transition: "transform 0.25s var(--ease-spring), background 0.2s",
            zIndex: 2,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.12)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
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

      {/* Content */}
      <div
        style={{
          padding: "16px 16px 18px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          gap: 10,
        }}
      >
        {/* Color swatches */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {product.colors.slice(0, 5).map((c, i) => (
            <span
              key={i}
              title={product.colorNames?.[i] || c}
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: c,
                border: "1px solid var(--color-border2)",
                display: "block",
                flexShrink: 0,
              }}
            />
          ))}
          {product.colors.length > 5 && (
            <span
              style={{
                fontSize: 9,
                color: "var(--color-ink4)",
                fontWeight: 700,
              }}
            >
              +{product.colors.length - 5}
            </span>
          )}
        </div>

        {/* Brand + Title */}
        <div>
          <p
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: "var(--color-ink4)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 4,
            }}
          >
            {product.brand}
          </p>
          <h3
            onClick={() => onViewDetails(product)}
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 13.5,
              color: "var(--color-ink)",
              lineHeight: 1.35,
              letterSpacing: "-0.01em",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              minHeight: "2.7em",
              cursor: "pointer",
              transition: "color 0.18s",
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
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", gap: 1 }}>
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={10}
                strokeWidth={0}
                fill={
                  i < Math.round(product.ratings.score) ? "#f59e0b" : "#e5e7eb"
                }
              />
            ))}
          </div>
          <span
            style={{
              fontWeight: 700,
              color: "var(--color-ink2)",
              fontSize: 11.5,
            }}
          >
            {product.ratings.score.toFixed(1)}
          </span>
          <span style={{ color: "var(--color-ink4)", fontSize: 11 }}>
            ({product.ratings.count})
          </span>
          <span
            style={{
              color: "var(--color-accent)",
              fontWeight: 600,
              fontSize: 11,
            }}
          >
            · {product.boughtLastMonth}+ ce mois
          </span>
        </div>

        {/* Countdown for limited */}
        {product.isLimitedTime && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px",
              borderRadius: "var(--radius-sm)",
              background: "#fef2f2",
              border: "1px solid rgba(220,38,38,0.12)",
            }}
          >
            <Clock
              size={10}
              strokeWidth={2.5}
              style={{ color: "#dc2626", flexShrink: 0 }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626" }}>
              Fin dans {countdownStr}
            </span>
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 800,
              fontSize: 19,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {product.price.toFixed(2)} €
          </span>
          {product.originalPrice && (
            <span
              style={{
                fontSize: 12,
                color: "var(--color-ink4)",
                textDecoration: "line-through",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {product.originalPrice.toFixed(2)} €
            </span>
          )}
        </div>

        {/* Add to cart */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            padding: "10px 16px",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid rgba(232,76,30,0.2)",
            background: "var(--color-accent-soft2)",
            color: "var(--color-accent)",
            fontFamily: "var(--font-body)",
            fontWeight: 700,
            fontSize: 12.5,
            cursor: "pointer",
            transition:
              "background 0.2s, color 0.2s, transform 0.2s var(--ease-spring)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent)";
            e.currentTarget.style.color = "#fff";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent-soft2)";
            e.currentTarget.style.color = "var(--color-accent)";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <ShoppingCart size={13} strokeWidth={2} />
          Ajouter au panier
        </button>
      </div>
    </article>
  );
}
