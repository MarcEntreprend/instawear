// src/components/CartDrawer.tsx

import React from "react";
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "./ui/Button";
import type { CartItem } from "../types";
import { PLACEHOLDER_IMG } from "../constants/assets";

interface CartDrawerProps {
  cart: CartItem[];
  currencySymbol: string;
  shippingCost: number;
  freeShippingThreshold: number;
  onClose: () => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onCheckout: () => void;
  onSelectProduct?: (productId: string) => void;
}

function getVariantImage(
  product: CartItem["product"],
  selectedColor: string,
): string {
  if (product.variants?.length) {
    const v = product.variants.find((x) => x.color === selectedColor);
    if (v?.image) return v.image;
  }
  if (product.colorImages?.length && product.colors) {
    const idx = product.colors.indexOf(selectedColor);
    if (idx >= 0 && product.colorImages[idx]) return product.colorImages[idx];
  }
  return product.image || PLACEHOLDER_IMG;
}

export default function CartDrawer({
  cart,
  currencySymbol,
  shippingCost,
  freeShippingThreshold,
  onClose,
  onUpdateQty,
  onRemove,
  onCheckout,
  onSelectProduct,
}: CartDrawerProps) {
  const total = cart.reduce((a, item) => a + item.unitPrice * item.quantity, 0);
  const freeShipping = total >= freeShippingThreshold;
  const remaining = Math.max(0, freeShippingThreshold - total);
  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <>
      {/* Overlay — même style que le menu mobile */}
      <div
        className="fixed inset-0 z-40 animate-fade-in"
        style={{ background: "rgba(15,13,10,.5)" }}
        onClick={onClose}
      />

      {/* Panneau — même smooth que le menu mobile */}
      <div
        className="fixed inset-y-0 right-0 z-40 w-full max-w-105 flex flex-col animate-drawer-right"
        style={{
          background: "var(--color-bg)",
          borderLeft: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* Header — même padding responsive + X que le menu mobile */}
        <div
          className="flex items-center justify-between h-16 shrink-0"
          style={{
            borderBottom: "1px solid var(--color-border)",
            paddingLeft: "clamp(20px, 5vw, 64px)",
            paddingRight: "clamp(20px, 5vw, 64px)",
            paddingTop: "6px",
          }}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag size={19} style={{ color: "var(--color-accent)" }} />
            <span
              className="font-display font-black text-lg"
              style={{ color: "var(--color-ink)" }}
            >
              Your Cart
            </span>
            {cartCount > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                style={{ background: "var(--color-accent)" }}
              >
                {cartCount}
              </span>
            )}
          </div>
          {/* Même bouton X que le menu mobile */}
          <button
            onClick={onClose}
            className="btn-icon relative"
            aria-label="Fermer le panier"
          >
            <X size={20} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "var(--color-surface2)" }}
            >
              <ShoppingBag size={26} style={{ color: "var(--color-ink4)" }} />
            </div>
            <div>
              <p
                className="font-bold text-base mb-1"
                style={{ color: "var(--color-ink)" }}
              >
                Your cart is empty
              </p>
              <p className="text-sm" style={{ color: "var(--color-ink3)" }}>
                Browse our collections and add items you love.
              </p>
            </div>
            <Button
              variant="cta"
              onClick={onClose}
              iconRight={<ArrowRight size={15} />}
            >
              Continue Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div
              className="px-6 py-3.5"
              style={{
                background: freeShipping
                  ? "var(--color-success-bg)"
                  : "var(--color-accent-bg)",
              }}
            >
              {freeShipping ? (
                <p
                  className="text-xs font-black text-center"
                  style={{ color: "var(--color-success)" }}
                >
                  🎉 You've unlocked free shipping!
                </p>
              ) : (
                <>
                  <p
                    className="text-xs font-bold mb-2"
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
                    style={{ background: "rgba(255,90,31,.15)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((total / freeShippingThreshold) * 100, 100)}%`,
                        background: "var(--color-accent)",
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
              {cart.map((item, i) => (
                <div key={i} className="flex gap-3">
                  <button
                    onClick={() => onSelectProduct?.(item.product.id)}
                    className="w-20 h-24 rounded-2xl overflow-hidden shrink-0 border-none p-0"
                    style={{ background: "var(--color-surface2)" }}
                  >
                    <img
                      src={getVariantImage(item.product, item.selectedColor)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <button
                        onClick={() => onSelectProduct?.(item.product.id)}
                        className="text-left bg-transparent border-none p-0 w-full"
                      >
                        <p
                          className="text-sm font-bold leading-snug line-clamp-2"
                          style={{ color: "var(--color-ink)" }}
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
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: "var(--color-surface2)",
                            color: "var(--color-ink3)",
                          }}
                        >
                          {item.selectedSize}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <span
                        className="text-sm font-black"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {(item.unitPrice * item.quantity).toFixed(2)}{" "}
                        {currencySymbol}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateQty(i, -1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{
                            background: "var(--color-surface2)",
                            color: "var(--color-ink2)",
                          }}
                        >
                          <Minus size={12} strokeWidth={2.5} />
                        </button>
                        <span
                          className="w-6 text-center text-xs font-black"
                          style={{ color: "var(--color-ink)" }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQty(i, 1)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{
                            background: "var(--color-surface2)",
                            color: "var(--color-ink2)",
                          }}
                        >
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => onRemove(i)}
                          className="w-7 h-7 rounded-full flex items-center justify-center ml-1"
                          style={{ color: "var(--color-negative)" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div
              className="p-6 flex flex-col gap-4"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="flex flex-col gap-1.5 text-sm">
                <div
                  className="flex justify-between"
                  style={{ color: "var(--color-ink3)" }}
                >
                  <span>Subtotal</span>
                  <span>
                    {total.toFixed(2)} {currencySymbol}
                  </span>
                </div>
                <div
                  className="flex justify-between"
                  style={{
                    color: freeShipping
                      ? "var(--color-success)"
                      : "var(--color-ink3)",
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
                  className="flex justify-between pt-2.5 font-black text-base"
                  style={{
                    color: "var(--color-ink)",
                    borderTop: "1px solid var(--color-border)",
                  }}
                >
                  <span>Total</span>
                  <span>
                    {(total + (freeShipping ? 0 : shippingCost)).toFixed(2)}{" "}
                    {currencySymbol}
                  </span>
                </div>
              </div>

              <Button
                variant="accent"
                size="lg"
                onClick={onCheckout}
                iconRight={<ArrowRight size={15} />}
              >
                Checkout
              </Button>

              <p
                className="text-[11px] text-center"
                style={{ color: "var(--color-ink4)" }}
              >
                Secure payment powered by Stripe
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
