// src/components/CartDrawer.tsx

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
        className="fixed inset-0 z-40 animate-fade-in"
        style={{ background: "rgba(26,25,22,.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-40 w-full max-w-100 flex flex-col animate-slide-right"
        style={{
          background: "var(--color-bg)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5 pb-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={19} style={{ color: "var(--color-accent)" }} />
            <span
              className="font-black text-base"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Panier
            </span>
            {cartCount > 0 && (
              <span
                className="badge text-gray-900"
                style={{ background: "var(--color-accent)" }}
              >
                {cartCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-ink3)" }}
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
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--color-surface2)" }}
            >
              <ShoppingBag size={28} style={{ color: "var(--color-ink4)" }} />
            </div>
            <div>
              <p
                className="font-bold text-base mb-1"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Votre panier est vide
              </p>
              <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
                Parcourez nos collections pour ajouter des articles.
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-900"
              style={{
                background: "var(--color-accent)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Continuer mes achats
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            {!freeShipping && (
              <div
                className="px-5 py-3"
                style={{
                  background: "var(--color-accent-bg)",
                  borderBottom: "1px solid rgba(255,92,53,.1)",
                }}
              >
                <p
                  className="text-xs font-semibold mb-1.5"
                  style={{ color: "var(--color-accent)" }}
                >
                  Plus que{" "}
                  <span className="font-black">{remaining.toFixed(2)} €</span>{" "}
                  pour la livraison gratuite
                </p>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,92,53,.15)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((total / 35) * 100, 100)}%`,
                      background: "var(--color-accent)",
                    }}
                  />
                </div>
              </div>
            )}
            {freeShipping && (
              <div
                className="px-5 py-2 text-xs font-semibold text-center"
                style={{ background: "#D1FAE5", color: "#059669" }}
              >
                Livraison gratuite débloquée
              </div>
            )}

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {cart.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className="w-20 h-24 rounded-xl overflow-hidden shrink-0"
                    style={{ background: "var(--color-surface2)" }}
                  >
                    <img
                      src={item.product.image || IMG}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <p
                        className="text-sm font-semibold leading-snug line-clamp-2"
                        style={{
                          color: "var(--color-ink)",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {item.product.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="w-3.5 h-3.5 rounded-full border"
                          style={{
                            backgroundColor: item.selectedColor,
                            borderColor: "var(--color-border)",
                          }}
                        />
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={{
                            background: "var(--color-surface2)",
                            color: "var(--color-ink3)",
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          {item.selectedSize}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-base font-black"
                        style={{
                          color: "var(--color-ink)",
                          fontFamily: "var(--font-sans)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {(item.product.price * item.quantity).toFixed(2)} €
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateQty(i, -1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{
                            background: "var(--color-surface2)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-ink2)",
                          }}
                        >
                          <Minus size={12} strokeWidth={2.5} />
                        </button>
                        <span
                          className="w-7 text-center text-sm font-bold"
                          style={{
                            color: "var(--color-ink)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQty(i, 1)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{
                            background: "var(--color-surface2)",
                            border: "1px solid var(--color-border)",
                            color: "var(--color-ink2)",
                          }}
                        >
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => onRemove(i)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center ml-1 transition-colors"
                          style={{ color: "#EF4444" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = "#FEF2F2")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className="p-5 flex flex-col gap-4"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="flex flex-col gap-1.5 text-sm">
                <div
                  className="flex justify-between"
                  style={{ color: "var(--color-ink3)" }}
                >
                  <span>Sous-total</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {total.toFixed(2)} €
                  </span>
                </div>
                <div
                  className="flex justify-between"
                  style={{
                    color: freeShipping ? "#059669" : "var(--color-ink3)",
                  }}
                >
                  <span>Livraison</span>
                  <span>{freeShipping ? "Gratuite" : "4,99 €"}</span>
                </div>
                <div
                  className="flex justify-between pt-2 font-black text-base"
                  style={{
                    color: "var(--color-ink)",
                    borderTop: "1px solid var(--color-border)",
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
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base text-gray-900 transition-all duration-200"
                style={{
                  background: "var(--color-accent)",
                  boxShadow: "var(--shadow-accent)",
                  fontFamily: "var(--font-sans)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Commander
                <ArrowRight size={17} strokeWidth={2} />
              </button>

              <p
                className="text-xs text-center"
                style={{ color: "var(--color-ink4)" }}
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
