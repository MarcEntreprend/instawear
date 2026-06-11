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
import { Product } from "../types";

const IMG =
  "https://cdn.pixabay.com/photo/2026/01/26/22/44/cat-10089737_1280.png";

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

  const prevImg = () =>
    setGalleryIdx(
      (i) =>
        (i - 1 + (product.gallery?.length || 1)) %
        (product.gallery?.length || 1),
    );
  const nextImg = () =>
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-modal)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0",
        background: "rgba(26,20,10,0.6)",
        backdropFilter: "blur(6px)",
      }}
      className="animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--color-bg)",
          borderRadius: "24px 24px 0 0",
          width: "100%",
          maxWidth: 860,
          maxHeight: "94dvh",
          overflowY: "auto",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--color-border)",
          borderBottom: "none",
          position: "relative",
        }}
        className="animate-fade-up"
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--color-ink2)",
            boxShadow: "var(--shadow-sm)",
            transition: "transform 0.2s var(--ease-spring)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = "scale(1.08)")
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <X size={16} strokeWidth={2} />
        </button>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            minHeight: 480,
          }}
          className="modal-grid"
        >
          {/* Gallery */}
          <div
            style={{
              position: "relative",
              background: "var(--color-surface2)",
              borderRadius: "24px 0 0 0",
              overflow: "hidden",
              minHeight: 400,
            }}
          >
            <img
              src={product.gallery?.[galleryIdx] || product.image || IMG}
              alt={product.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
            {product.gallery && product.gallery.length > 1 && (
              <>
                <button onClick={prevImg} style={galleryNavStyle("left")}>
                  <ChevronLeft size={15} strokeWidth={2} />
                </button>
                <button onClick={nextImg} style={galleryNavStyle("right")}>
                  <ChevronRight size={15} strokeWidth={2} />
                </button>
                <div
                  style={{
                    position: "absolute",
                    bottom: 14,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 6,
                  }}
                >
                  {product.gallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      style={{
                        width: galleryIdx === i ? 20 : 6,
                        height: 6,
                        borderRadius: "var(--radius-pill)",
                        background:
                          galleryIdx === i ? "white" : "rgba(255,255,255,0.5)",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        transition: "all 0.25s var(--ease-smooth)",
                      }}
                    />
                  ))}
                </div>
              </>
            )}
            {/* Thumbnails */}
            {product.gallery && product.gallery.length > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "10px 12px",
                  background: "var(--color-surface)",
                }}
              >
                {product.gallery.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIdx(i)}
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "var(--radius-sm)",
                      overflow: "hidden",
                      border: `2px solid ${galleryIdx === i ? "var(--color-accent)" : "transparent"}`,
                      padding: 0,
                      cursor: "pointer",
                      transition: "border-color 0.18s",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={img || IMG}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info pane */}
          <div
            style={{
              padding: "28px 28px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
              overflowY: "auto",
            }}
          >
            {/* Brand + title */}
            <div>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "var(--color-ink4)",
                  marginBottom: 6,
                }}
              >
                {product.brand}
              </p>
              <h2
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.2,
                  color: "var(--color-ink)",
                }}
              >
                {product.title}
              </h2>
            </div>

            {/* Ratings */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={12}
                    strokeWidth={0}
                    fill={
                      i < Math.round(product.ratings.score)
                        ? "#f59e0b"
                        : "#e5e7eb"
                    }
                  />
                ))}
              </div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 12.5,
                  color: "var(--color-ink2)",
                }}
              >
                {product.ratings.score.toFixed(1)}/5
              </span>
              <span style={{ fontSize: 12, color: "var(--color-ink4)" }}>
                ({product.ratings.count} avis)
              </span>
            </div>

            {/* Price */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                padding: "14px 16px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontWeight: 800,
                  fontSize: 28,
                  letterSpacing: "-0.03em",
                  color: "var(--color-ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {dynPrice.toFixed(2)} €
              </span>
              {product.originalPrice && (
                <>
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--color-ink4)",
                      textDecoration: "line-through",
                    }}
                  >
                    {product.originalPrice.toFixed(2)} €
                  </span>
                  <span
                    style={{
                      background: "var(--color-accent)",
                      color: "#fff",
                      borderRadius: "var(--radius-pill)",
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    -{discount}%
                  </span>
                </>
              )}
              {SIZE_SURCHARGE[selectedSize] > 0 && (
                <span style={{ fontSize: 11, color: "var(--color-ink3)" }}>
                  (+{SIZE_SURCHARGE[selectedSize]} € taille {selectedSize})
                </span>
              )}
            </div>

            {/* Description */}
            {product.fullDescription && (
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--color-ink2)",
                  whiteSpace: "pre-line",
                  paddingBottom: 4,
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                {product.fullDescription}
              </div>
            )}

            {/* Color picker */}
            <div>
              <p style={labelStyle}>
                Couleur :{" "}
                <span style={{ color: "var(--color-ink)", fontWeight: 700 }}>
                  {product.colorNames?.[
                    product.colors.indexOf(selectedColor)
                  ] || selectedColor}
                </span>
              </p>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                {product.colors.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColor(c)}
                    title={product.colorNames?.[i]}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: c,
                      border: `2.5px solid ${selectedColor === c ? "var(--color-accent)" : "var(--color-border2)"}`,
                      boxShadow:
                        selectedColor === c
                          ? "0 0 0 2px rgba(232,76,30,0.25)"
                          : "none",
                      transform:
                        selectedColor === c ? "scale(1.1)" : "scale(1)",
                      cursor: "pointer",
                      transition: "all 0.2s var(--ease-spring)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Size picker */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <p style={labelStyle}>
                  Taille :{" "}
                  <span style={{ color: "var(--color-ink)", fontWeight: 700 }}>
                    {selectedSize}
                  </span>
                </p>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-accent)",
                    fontSize: 11,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Info size={10} strokeWidth={2} />
                  Guide des tailles
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 8,
                }}
              >
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    style={{
                      minWidth: 44,
                      height: 36,
                      padding: "0 12px",
                      borderRadius: "var(--radius-sm)",
                      border: `1.5px solid ${selectedSize === s ? "var(--color-accent)" : "var(--color-border2)"}`,
                      background:
                        selectedSize === s
                          ? "var(--color-accent)"
                          : "var(--color-surface)",
                      color: selectedSize === s ? "#fff" : "var(--color-ink2)",
                      fontFamily: "var(--font-body)",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.18s var(--ease-smooth)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {showGuide && SIZE_GUIDE[selectedSize] && (
                <div
                  className="animate-fade-up"
                  style={{
                    marginTop: 10,
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--color-ink)",
                      marginBottom: 8,
                    }}
                  >
                    Mesures pour {selectedSize} :
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {Object.entries(SIZE_GUIDE[selectedSize]).map(([k, v]) => (
                      <div key={k} style={{ textAlign: "center" }}>
                        <p
                          style={{
                            fontWeight: 800,
                            fontSize: 13,
                            color: "var(--color-ink)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {v}
                        </p>
                        <p
                          style={{
                            fontSize: 10,
                            color: "var(--color-ink3)",
                            textTransform: "capitalize",
                          }}
                        >
                          {k}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Shipping */}
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                display: "flex",
                flexDirection: "column",
                gap: 7,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--color-success)",
                }}
              >
                <Truck size={12} strokeWidth={2} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  Livraison gratuite dès 35 €
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--color-ink3)",
                }}
              >
                <ShieldCheck size={12} strokeWidth={2} />
                <span style={{ fontSize: 12 }}>
                  Imprimé sous 24h · Satisfait ou remboursé 14j
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => onToggleFavorite(product.id)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${isFavorite ? "#fecaca" : "var(--color-border2)"}`,
                  background: isFavorite ? "#fef2f2" : "var(--color-surface)",
                  color: isFavorite ? "#ef4444" : "var(--color-ink3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "all 0.2s",
                }}
              >
                <Heart
                  size={17}
                  strokeWidth={2}
                  fill={isFavorite ? "#ef4444" : "none"}
                />
              </button>

              <button
                onClick={handleAdd}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: added
                    ? "var(--color-success)"
                    : "var(--color-accent)",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  boxShadow: added
                    ? "0 6px 20px rgba(31,122,76,0.3)"
                    : "var(--shadow-accent)",
                  transition: "all 0.3s var(--ease-spring)",
                }}
              >
                {added ? (
                  <>
                    <Check size={15} strokeWidth={2.5} />
                    Ajouté !
                  </>
                ) : (
                  <>
                    <ShoppingCart size={15} strokeWidth={2} />
                    Ajouter — {dynPrice.toFixed(2)} €
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 20px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "#c9860a",
                  color: "#fff",
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(201,134,10,0.3)",
                  transition: "all 0.25s var(--ease-spring)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Acheter ⚡
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .modal-grid {
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 640px) {
          .modal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function galleryNavStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: "50%",
    [side]: 12,
    transform: "translateY(-50%)",
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(8px)",
    border: "1px solid var(--color-border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "var(--shadow-sm)",
    zIndex: 5,
    color: "var(--color-ink)",
  };
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--color-ink3)",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
};
