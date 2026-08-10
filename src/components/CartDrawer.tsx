// src/components/CartDrawer.tsx

import React from "react";
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { useShippingSettings } from "../hooks/useShippingSettings";
import {
  PLACEHOLDER_IMG,
  CART_X_ICON,
  CART_CHECK_ICON,
} from "../constants/assets";
import { CartItem } from "../types";

interface CartDrawerProps {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
  onSelectProduct?: (productId: string) => void;
}

export default function CartDrawer({
  cart,
  onClose,
  onUpdateQty,
  onRemove,
  onCheckout,
  onSelectProduct,
}: CartDrawerProps) {
  const total = cart.reduce((a, item) => a + item.unitPrice * item.quantity, 0);
  const { cost: shippingCost, threshold } = useShippingSettings();
  const freeShipping = total >= threshold;
  const remaining = Math.max(0, threshold - total);
  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);
  const currencySymbol = useCurrencySymbol();

  function getVariantImage(
    product: CartItem["product"],
    selectedColor: string,
  ): string {
    if (product.variants?.length) {
      const variant = product.variants.find((v) => v.color === selectedColor);
      if (variant?.image) return variant.image;
    }
    if (product.colorImages?.length && product.colors) {
      const idx = product.colors.indexOf(selectedColor);
      if (idx >= 0 && product.colorImages[idx]) return product.colorImages[idx];
    }
    return product.image || PLACEHOLDER_IMG;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 animate-fade-in"
        style={{ background: "rgba(26,25,22,.5)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      <div
        className="fixed inset-y-0 right-0 z-40 w-full max-w-100 flex flex-col animate-slide-right"
        style={{
          background: "var(--color-bg)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div
          className="flex items-center justify-between p-5 pb-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-accent-bg)" }}
            >
              <ShoppingBag
                size={16}
                strokeWidth={2}
                style={{ color: "var(--color-accent)" }}
              />
            </div>
            <span
              className="font-black text-base"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Your cart
            </span>
            {cartCount > 0 && (
              <span
                className="badge text-white"
                style={{ background: "var(--color-accent)" }}
              >
                {cartCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors"
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
              className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: "var(--color-surface2)" }}
            >
              <img
                src={CART_X_ICON}
                alt="Empty cart"
                className="w-7 h-7"
                style={{
                  opacity: 0.5,
                  filter:
                    document.documentElement.getAttribute("data-theme") ===
                    "dark"
                      ? "invert(1)"
                      : "none",
                }}
              />
            </div>
            <div>
              <p
                className="font-bold text-base mb-1"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                Your cart is empty
              </p>
              <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
                Browse our collections and add items you love.
              </p>
            </div>
            <button onClick={onClose} className="pill-btn pill-btn-accent">
              Continue shopping
              <ArrowRight size={15} strokeWidth={2} />
            </button>
          </div>
        ) : (
          <>
            {!freeShipping && (
              <div
                className="px-5 py-3.5"
                style={{
                  background: "var(--color-accent-bg)",
                  borderBottom: "1px solid rgba(255,92,53,.1)",
                }}
              >
                <p
                  className="text-xs font-semibold mb-2"
                  style={{ color: "var(--color-accent)" }}
                >
                  Only{" "}
                  <span className="font-black">
                    {remaining.toFixed(2)} {currencySymbol}
                  </span>{" "}
                  away from free shipping
                </p>
                <div
                  className="h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,92,53,.15)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((total / threshold) * 100, 100)}%`,
                      background: "var(--color-accent)",
                    }}
                  />
                </div>
              </div>
            )}
            {freeShipping && (
              <div
                className="px-5 py-2.5 text-xs font-semibold text-center"
                style={{ background: "#D1FAE5", color: "#059669" }}
              >
                You've unlocked free shipping
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {cart.map((item, i) => (
                <div
                  key={i}
                  className="card-premium flex gap-3 p-2.5 rounded-2xl"
                >
                  <button
                    onClick={() => onSelectProduct?.(item.product.id)}
                    className="w-20 h-24 rounded-xl overflow-hidden shrink-0 border-none p-0 cursor-pointer"
                    style={{ background: "var(--color-surface2)" }}
                  >
                    <img
                      src={getVariantImage(item.product, item.selectedColor)}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          PLACEHOLDER_IMG;
                      }}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                      <button
                        onClick={() => onSelectProduct?.(item.product.id)}
                        className="text-left bg-transparent border-none p-0 cursor-pointer hover:underline w-full"
                        style={{ color: "var(--color-ink)" }}
                      >
                        <p
                          className="text-sm font-semibold leading-snug line-clamp-2"
                          style={{
                            color: "var(--color-ink)",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          {item.product.title}
                        </p>
                      </button>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full border"
                          style={{
                            backgroundColor: item.selectedColor,
                            borderColor: "var(--color-border)",
                          }}
                        />
                        <span className="chip bg-gray-100 text-gray-500">
                          Size: {item.selectedSize}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="text-base font-black"
                        style={{
                          color: "var(--color-ink)",
                          fontFamily: "var(--font-sans)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {" "}
                        {(item.unitPrice * item.quantity).toFixed(2)}{" "}
                        {currencySymbol}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateQty(i, -1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
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
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
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
                          className="w-7 h-7 rounded-full flex items-center justify-center ml-1 transition-colors"
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

            <div
              className="p-5 flex flex-col gap-4"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="flex flex-col gap-1.5 text-sm">
                <div
                  className="flex justify-between"
                  style={{ color: "var(--color-ink3)" }}
                >
                  <span>Subtotal</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>
                    {total.toFixed(2)} {currencySymbol}
                  </span>
                </div>
                <div
                  className="flex justify-between"
                  style={{
                    color: freeShipping ? "#059669" : "var(--color-ink3)",
                  }}
                >
                  <span>Shipping</span>
                  <span>
                    {freeShipping
                      ? "Free"
                      : `${shippingCost.toFixed(2)} ${currencySymbol}`}
                  </span>
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
                    {(total + (freeShipping ? 0 : shippingCost)).toFixed(2)}{" "}
                    {currencySymbol}
                  </span>
                </div>
              </div>

              <button
                onClick={onCheckout}
                className="pill-btn pill-btn-accent w-full justify-center"
              >
                Checkout
                <ArrowRight size={15} strokeWidth={2.5} />
              </button>

              <p
                className="text-xs text-center"
                style={{ color: "var(--color-ink4)" }}
              >
                Secure payment powered by Stripe, free shipping over $
                {threshold}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
