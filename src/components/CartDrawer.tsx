import React from "react";
import { X, Trash2, ShoppingBag, Plus, Minus, ArrowRight } from "lucide-react";
import { CartItem } from "../types";

const IMG =
  "https://cdn.pixabay.com/photo/2026/01/26/22/44/cat-10089737_1280.png";

interface CartDrawerProps {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
}

export default function CartDrawer({
  cart,
  onClose,
  onUpdateQty,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  const total = cart.reduce(
    (a, item) => a + item.product.price * item.quantity,
    0,
  );
  const freeShipping = total >= 35;
  const remaining = Math.max(0, 35 - total);
  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="animate-fade-in"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: "var(--z-overlay)",
          background: "rgba(26,20,10,0.48)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="animate-slide-right"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: "var(--z-modal)",
          width: "100%",
          maxWidth: 420,
          background: "var(--color-bg)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-xl)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 22px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShoppingBag
              size={18}
              style={{ color: "var(--color-accent)" }}
              strokeWidth={2}
            />
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 800,
                fontSize: 17,
                letterSpacing: "-0.03em",
                color: "var(--color-ink)",
              }}
            >
              Panier
            </span>
            {cartCount > 0 && (
              <span
                style={{
                  background: "var(--color-accent)",
                  color: "#fff",
                  borderRadius: "var(--radius-pill)",
                  padding: "2px 9px",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {cartCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: 7,
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink3)",
              display: "flex",
              alignItems: "center",
              transition: "background 0.18s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--color-surface2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--radius-xl)",
                background: "var(--color-surface2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingBag
                size={28}
                style={{ color: "var(--color-ink4)" }}
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: "var(--color-ink)",
                  marginBottom: 6,
                }}
              >
                Votre panier est vide
              </p>
              <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
                Parcourez nos collections pour ajouter des articles.
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "10px 22px",
                borderRadius: "var(--radius-pill)",
                border: "none",
                background: "var(--color-accent)",
                color: "#fff",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "var(--shadow-accent)",
              }}
            >
              Continuer mes achats
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <>
            {/* Free shipping banner */}
            {!freeShipping ? (
              <div
                style={{
                  padding: "10px 20px",
                  background: "var(--color-accent-soft2)",
                  borderBottom: "1px solid rgba(232,76,30,0.1)",
                  flexShrink: 0,
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-accent)",
                    marginBottom: 6,
                  }}
                >
                  Plus que <strong>{remaining.toFixed(2)} €</strong> pour la
                  livraison gratuite
                </p>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(232,76,30,0.12)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 2,
                      background: "var(--color-accent)",
                      width: `${Math.min((total / 35) * 100, 100)}%`,
                      transition: "width 0.4s var(--ease-smooth)",
                    }}
                  />
                </div>
              </div>
            ) : (
              <div
                style={{
                  padding: "8px 20px",
                  background: "var(--color-success-bg)",
                  borderBottom: "1px solid rgba(31,122,76,0.12)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-success)",
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                Livraison gratuite débloquée
              </div>
            )}

            {/* Items */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {cart.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      width: 76,
                      height: 90,
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      background: "var(--color-surface2)",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={item.product.image || IMG}
                      alt={item.product.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-ink)",
                          lineHeight: 1.3,
                          marginBottom: 5,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {item.product.title}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        <span
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: item.selectedColor,
                            border: "1px solid var(--color-border2)",
                            display: "block",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--color-ink3)",
                            padding: "2px 7px",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--color-surface2)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          {item.selectedSize}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-body)",
                          fontWeight: 800,
                          fontSize: 15,
                          color: "var(--color-ink)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {(item.product.price * item.quantity).toFixed(2)} €
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <button
                          onClick={() => onUpdateQty(i, -1)}
                          style={qtyBtnStyle}
                        >
                          <Minus size={11} strokeWidth={2.5} />
                        </button>
                        <span
                          style={{
                            width: 26,
                            textAlign: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--color-ink)",
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQty(i, 1)}
                          style={qtyBtnStyle}
                        >
                          <Plus size={11} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => onRemove(i)}
                          style={{
                            ...qtyBtnStyle,
                            marginLeft: 4,
                            color: "#ef4444",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#fef2f2")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              "var(--color-surface2)")
                          }
                        >
                          <Trash2 size={12} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "16px 20px 20px",
                borderTop: "1px solid var(--color-border)",
                flexShrink: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--color-ink3)",
                  }}
                >
                  <span>Sous-total</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {total.toFixed(2)} €
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: freeShipping
                      ? "var(--color-success)"
                      : "var(--color-ink3)",
                  }}
                >
                  <span>Livraison</span>
                  <span>{freeShipping ? "Gratuite" : "4,99 €"}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 17,
                    fontWeight: 800,
                    color: "var(--color-ink)",
                    paddingTop: 8,
                    borderTop: "1px solid var(--color-border)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  <span>Total</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {(total + (freeShipping ? 0 : 4.99)).toFixed(2)} €
                  </span>
                </div>
              </div>

              <button
                onClick={onCheckout}
                className="btn-primary"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 20px",
                  fontSize: 14,
                }}
              >
                Passer la commande
                <ArrowRight size={15} strokeWidth={2} />
              </button>

              <p
                style={{
                  fontSize: 11,
                  color: "var(--color-ink4)",
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                Via WhatsApp, Telegram ou Email — Aucun paiement en ligne requis
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

const qtyBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: "var(--radius-sm)",
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "var(--color-ink2)",
  transition: "background 0.18s",
};
