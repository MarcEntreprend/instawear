// src/admin/ProductQuickViewModal.tsx

import React from "react";
import { X, Star, ShieldCheck, Tag } from "lucide-react";
import type { AdminProduct } from "./adminTypes";
import { PLACEHOLDER_IMG } from "../constants/assets";

interface ProductQuickViewModalProps {
  product: AdminProduct | null;
  onClose: () => void;
}

export default function ProductQuickViewModal({
  product,
  onClose,
}: ProductQuickViewModalProps) {
  if (!product) return null;

  // state pour suivre l'image active, et rendre les miniatures cliquables.
  const [activeImage, setActiveImage] = React.useState(0);

  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(26,20,10,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 20,
          width: "90%",
          maxWidth: 800,
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 22px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <h3
            style={{ fontWeight: 700, fontSize: 16, color: "var(--color-ink)" }}
          >
            Aperçu produit
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "4px 8px",
              cursor: "pointer",
              color: "var(--color-ink2)",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenu */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            padding: 20,
          }}
        >
          {/* Colonne gauche - Image */}
          <div>
            <div
              style={{
                aspectRatio: "4/5",
                borderRadius: 14,
                overflow: "hidden",
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                position: "relative",
              }}
            >
              <img
                src={
                  activeImage === 0
                    ? product.image || PLACEHOLDER_IMG
                    : product.gallery?.[activeImage - 1] || PLACEHOLDER_IMG
                }
                alt={product.title}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
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
                {!product.isActive && (
                  <span
                    className="badge"
                    style={{
                      background: "var(--color-surface)",
                      color: "var(--color-ink3)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    Inactif
                  </span>
                )}
              </div>
            </div>
            {product.gallery && product.gallery.length > 1 && (
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {/* Miniature de l'image principale */}
                <button
                  onClick={() => setActiveImage(0)}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 8,
                    overflow: "hidden",
                    border:
                      activeImage === 0
                        ? "2px solid var(--color-accent)"
                        : "1px solid var(--color-border)",
                    padding: 0,
                    cursor: "pointer",
                    background: "none",
                  }}
                >
                  <img
                    src={product.image || PLACEHOLDER_IMG}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </button>
                {/* Miniatures de la galerie */}
                {product.gallery.slice(0, 6).map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i + 1)}
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: 8,
                      overflow: "hidden",
                      border:
                        activeImage === i + 1
                          ? "2px solid var(--color-accent)"
                          : "1px solid var(--color-border)",
                      padding: 0,
                      cursor: "pointer",
                      background: "none",
                    }}
                  >
                    <img
                      src={url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colonne droite - Infos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--color-ink4)",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {product.brand}
              </span>
              <h3
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  marginTop: 4,
                }}
              >
                {product.title}
              </h3>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--color-ink3)",
              }}
            >
              <Star size={12} fill="#f59e0b" stroke="#f59e0b" />
              <span style={{ fontWeight: 600 }}>
                {product.ratings.score.toFixed(1)}
              </span>
              <span>({product.ratings.count} avis)</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--color-surface2)",
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: 800,
                  color: "var(--color-ink)",
                }}
              >
                {product.price.toFixed(2)} $
              </span>
              {product.originalPrice && (
                <span
                  style={{
                    fontSize: 14,
                    textDecoration: "line-through",
                    color: "var(--color-ink4)",
                  }}
                >
                  {product.originalPrice.toFixed(2)} $
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
            <div
              style={{
                display: "flex",
                gap: 16,
                fontSize: 12,
                color: "var(--color-ink3)",
              }}
            >
              <span>
                Stock :{" "}
                <strong
                  style={{
                    color: product.inStock ? "var(--color-success)" : "#ef4444",
                  }}
                >
                  {product.inStock
                    ? `${product.stockQuantity ?? "—"} unités`
                    : "Sur commande"}
                </strong>
              </span>
              <span>
                Visibilité :{" "}
                <strong
                  style={{
                    color: product.isActive
                      ? "var(--color-success)"
                      : "var(--color-ink4)",
                  }}
                >
                  {product.isActive ? "Actif" : "Inactif"}
                </strong>
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                className="badge"
                style={{
                  background: "var(--color-surface2)",
                  color: "var(--color-ink3)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <Tag size={10} /> {product.category}
              </span>
              <span
                className="badge"
                style={{
                  background: "var(--color-surface2)",
                  color: "var(--color-ink3)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {product.eventType}
              </span>
              <span
                className="badge"
                style={{
                  background: "var(--color-surface2)",
                  color: "var(--color-ink3)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {product.style}
              </span>
            </div>
            {/* Description courte */}
            {product.description && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-ink2)",
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}
              >
                {product.description}
              </p>
            )}
            {/* Fiche technique (description longue) */}
            {product.fullDescription && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--color-ink)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-line",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 11,
                    color: "var(--color-ink3)",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Fiche technique
                </p>
                {product.fullDescription}
              </div>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "var(--color-ink4)",
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--color-surface2)",
              }}
            >
              <ShieldCheck size={14} style={{ color: "var(--color-accent)" }} />{" "}
              Impression certifiée OEKO-TEX®
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
