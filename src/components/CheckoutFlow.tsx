// src/components/CheckoutFlow.tsx

/**
 * Unified checkout flow for InstaWear.
 * Replaces CheckoutModal.tsx + PaymentPage.tsx with a single 4-step
 * journey: Cart → Shipping → Payment → Confirmation.
 *
 * Stripe handles both the hosted Checkout and direct card payments.
 * Orders are saved to Supabase and forwarded to Printful via webhook.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Check,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Truck,
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Lock,
  AlertCircle,
  Loader2,
  Copy,
  Trash2,
  ShoppingBag,
} from "lucide-react";
import type { CartItem } from "../types";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { orderApi, podApi, storeSettingsApi } from "../api/supabaseApi";
import { supabase } from "../lib/supabaseClient";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

// ─── Props ──────────────────────────────────────────────────────────────

const stripePromise = loadStripe(
  import.meta.env.VITE_PUBLIC_STRIPE_PUBLISHABLE_KEY,
);
interface CheckoutFlowProps {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onSuccess: () => void;
  confirmModeOrderId?: string; // when set, display confirmation directly
}

type StepId = 1 | 2 | 3 | 4;

const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "Cart" },
  { id: 2, label: "Shipping" },
  { id: 3, label: "Payment" },
  { id: 4, label: "Confirmation" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATE_REQUIRED_COUNTRIES = ["US", "CA", "BR", "AU"];

// ─── Helpers ────────────────────────────────────────────────────────────

function formatCardNumber(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 16);
  return cleaned.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string): string {
  const cleaned = value.replace(/\D/g, "").slice(0, 4);
  if (cleaned.length >= 3) return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
  return cleaned;
}

function cardPreviewNumber(formatted: string): string {
  const digits = formatted.replace(/\D/g, "");
  const groups: string[] = [];
  for (let i = 0; i < 4; i++) {
    groups.push(digits.slice(i * 4, i * 4 + 4).padEnd(4, "\u2022"));
  }
  return groups.join("  ");
}

function isValidLuhn(rawDigits: string): boolean {
  const digits = rawDigits.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function isExpiryValid(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = 2000 + parseInt(match[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

function sendTelegramNotification(
  orderId: string,
  name: string,
  phone: string,
  email: string,
  reception: string,
  address: string,
  city: string,
  zip: string,
  country: string,
  cart: CartItem[],
  total: number,
  currencySymbol: string,
) {
  const telegramMsg =
    `\u{1F6D2} *INSTAWEAR ORDER*\n\n` +
    `\u{1F511} *Order #:* ${orderId}\n\n` +
    `*Customer:* ${name}\n` +
    `*Phone:* ${phone}\n` +
    `*Email:* ${email}\n` +
    `*Reception:* ${reception === "retrait" ? "Pickup" : "Delivery"}\n` +
    (reception === "livraison"
      ? `*Address:* ${address}, ${city} ${zip}, ${country}\n`
      : "") +
    `\n\u{1F4E6} *Items:*\n` +
    cart
      .map(
        (item) =>
          `- ${item.product.title} (${item.selectedSize}, ${item.selectedColor}) \u00D7${item.quantity} = ${(item.product.price * item.quantity).toFixed(2)} ${currencySymbol}`,
      )
      .join("\n") +
    `\n\n\u{1F4B0} *Total:* ${total.toFixed(2)} ${currencySymbol}`;

  const telegramUrl = `https://t.me/marcrubenmacean?text=${encodeURIComponent(telegramMsg)}`;
  window.open(telegramUrl, "_blank");
}

function sendOrderEmail(
  orderId: string,
  name: string,
  email: string,
  phone: string,
  address: string,
  city: string,
  zip: string,
  country: string,
  stateCode: string,
  cart: CartItem[],
  total: number,
  currencySymbol: string,
) {
  const itemsHtml = cart
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <table><tr>
          <td style="width: 60px; vertical-align: top;">
            <img src="${item.product.image || PLACEHOLDER_IMG}" style="width: 52px; height: 52px; border-radius: 8px; object-fit: cover;">
          </td>
          <td style="vertical-align: top; padding-left: 12px;">
            <p style="margin: 0; font-weight: 600; font-size: 14px;">${item.product.title}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #888;">
              Color: ${item.selectedColor} · Size: ${item.selectedSize} · Qty: ${item.quantity}
            </p>
          </td>
          <td style="vertical-align: top; text-align: right; font-weight: 700; font-size: 14px; white-space: nowrap;">
            ${(item.product.price * item.quantity).toFixed(2)} ${currencySymbol}
          </td>
        </tr></table>
      </td>
    </tr>
  `,
    )
    .join("");

  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#000;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#a3a3a3;margin:4px 0 0;font-size:14px;">We're getting your order ready!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Order confirmed 🎉</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${name}</strong>,<br><br>Thank you for shopping with us. Your order <strong>${orderId}</strong> has been confirmed. We'll let you know as soon as it ships.</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${itemsHtml}
<tr><td style="padding-top:16px;text-align:right;font-size:16px;font-weight:700;">Order total: ${total.toFixed(2)} ${currencySymbol}</td></tr></table>
<a href="https://instawear.vercel.app/?order=success&id=${orderId}" style="display:inline-block;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
<div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;">
<p style="margin:0 0 8px;font-weight:600;font-size:13px;">Ship to:</p>
<p style="margin:0;font-size:13px;color:#555;">${address}<br>${city}, ${stateCode ? stateCode + ", " : ""}${zip}<br>${country}<br>${phone ? phone + "<br>" : ""}${email}</p>
</div>
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;line-height:1.6;">
<p style="margin:0 0 8px;">This email was sent to <strong>${email}</strong> for your recent purchase at <a href="https://instawear.vercel.app" style="color:#FF5C35;text-decoration:none;">instawear.vercel.app</a></p>
<p style="margin:0;">InstaWear · 123 Main Street, Doral, FL 10001<br>© 2026 InstaWear Inc. All rights reserved.</p>
</div></div></body></html>`;

  fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      to: email,
      subject: `Order ${orderId} confirmed!`,
      html,
    }),
  }).catch(console.error);
}

function generateOrderId(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `ORD-${year}-${seq}`;
}

// ─── Reusable form field ────────────────────────────────────────────────
interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
  }>;
  onClearError?: () => void;
}

function TextField({
  label,
  required,
  error,
  icon: Icon,
  className,
  onClearError,
  ...inputProps
}: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wider text-(--color-ink3)">
        {label} {required && <span className="text-(--color-accent)">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={15}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-ink4) pointer-events-none"
          />
        )}
        <input
          {...inputProps}
          onChange={(e) => {
            inputProps.onChange?.(e);
            if (onClearError) onClearError();
          }}
          className={`w-full ${Icon ? "pl-10" : "pl-3.5"} pr-3.5 py-2.5 rounded-xl text-sm outline-none transition-colors duration-150 bg-(--color-surface) text-(--color-ink) placeholder:text-(--color-ink4) focus:ring-2 focus:ring-(--color-accent-soft) ${className || ""}`}
          style={{
            border: `1.5px solid ${error ? "#fca5a5" : "var(--color-border2)"}`,
          }}
        />
      </div>
      {error && (
        <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
          <AlertCircle size={11} strokeWidth={2.5} />
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Stepper ────────────────────────────────────────────────────────────

function Stepper({
  step,
  onJump,
}: {
  step: StepId;
  onJump: (s: StepId) => void;
}) {
  return (
    <div className="flex items-center w-full max-w-2xl mx-auto px-4">
      {STEPS.map((s, idx) => {
        const isDone = step > s.id;
        const isActive = step === s.id;
        const clickable = isDone;
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump(s.id)}
              className={`flex flex-col items-center gap-1.5 shrink-0 ${clickable ? "cursor-pointer" : "cursor-default"}`}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  border: `2px solid ${isDone || isActive ? "var(--color-accent)" : "var(--color-border2)"}`,
                  background: isDone
                    ? "var(--color-accent)"
                    : isActive
                      ? "var(--color-accent-bg)"
                      : "var(--color-surface)",
                  color: isDone
                    ? "#ffffff"
                    : isActive
                      ? "var(--color-accent)"
                      : "var(--color-ink4)",
                }}
              >
                {isDone ? <Check size={14} strokeWidth={2.5} /> : s.id}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-wider hidden sm:block transition-colors"
                style={{
                  color:
                    isActive || isDone
                      ? "var(--color-ink)"
                      : "var(--color-ink4)",
                }}
              >
                {s.label}
              </span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1.5 sm:mx-2 rounded-full bg-(--color-border) relative overflow-hidden -mt-4 sm:-mt-5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: step > s.id ? "100%" : "0%",
                    background: "var(--color-accent)",
                  }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Order summary (sticky on desktop, collapsible on mobile) ─────────────

function OrderSummaryPanel({
  cart,
  cartTotal,
  shippingCost,
  total,
  currencySymbol,
  reception,
  threshold,
}: {
  cart: CartItem[];
  cartTotal: number;
  shippingCost: number;
  total: number;
  currencySymbol: string;
  reception: "retrait" | "livraison";
  threshold: number;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const itemCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <div className="lg:sticky lg:top-6">
      <div className="bezel-outer">
        <div className="bezel-inner p-5">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="lg:hidden w-full flex items-center justify-between mb-1"
          >
            <span className="font-black text-sm text-(--color-ink) flex items-center gap-2">
              <ShoppingBag
                size={16}
                strokeWidth={2}
                className="text-(--color-accent)"
              />
              Summary ({itemCount})
            </span>
            <span className="font-black text-sm text-(--color-ink)">
              {total.toFixed(2)} {currencySymbol}
            </span>
          </button>

          <div className={collapsed ? "hidden lg:block" : "block"}>
            <h3 className="font-black text-sm text-(--color-ink) mb-4 hidden lg:flex items-center gap-2">
              <ShoppingBag
                size={16}
                strokeWidth={2}
                className="text-(--color-accent)"
              />
              Order Summary
            </h3>

            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1 mb-4">
              {cart.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-12 h-14 rounded-lg overflow-hidden shrink-0 relative"
                    style={{ background: "var(--color-surface2)" }}
                  >
                    <img
                      src={item.product.image || PLACEHOLDER_IMG}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                    <span
                      className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 rounded-full text-white text-[9px] font-black flex items-center justify-center"
                      style={{ background: "var(--color-accent)" }}
                    >
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-(--color-ink) line-clamp-1">
                      {item.product.title}
                    </p>
                    <p className="text-[10px] text-(--color-ink3)">
                      {item.selectedSize} \u00B7 {item.quantity} \u00D7{" "}
                      {item.product.price.toFixed(2)} {currencySymbol}
                    </p>
                  </div>
                  <span className="text-xs font-black text-(--color-ink) shrink-0">
                    {(item.product.price * item.quantity).toFixed(2)}{" "}
                    {currencySymbol}
                  </span>
                </div>
              ))}
            </div>

            <div
              className="flex flex-col gap-1.5 text-xs pt-3"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="flex justify-between text-(--color-ink3)">
                <span>Subtotal</span>
                <span>
                  {cartTotal.toFixed(2)} {currencySymbol}
                </span>
              </div>
              <div
                className="flex justify-between"
                style={{
                  color:
                    shippingCost === 0
                      ? "var(--color-success)"
                      : "var(--color-ink3)",
                }}
              >
                <span>
                  Shipping{reception === "retrait" ? " (pickup)" : ""}
                </span>
                <span>
                  {shippingCost === 0
                    ? "Free"
                    : `${shippingCost.toFixed(2)} ${currencySymbol}`}
                </span>
              </div>
              {shippingCost > 0 && reception === "livraison" && (
                <p className="text-[10px] text-(--color-accent) mt-0.5">
                  {(threshold - cartTotal).toFixed(2)} {currencySymbol} away
                  from free shipping
                </p>
              )}
              <div
                className="flex justify-between pt-2 mt-1 text-sm font-black text-(--color-ink)"
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <span>Total</span>
                <span>
                  {total.toFixed(2)} {currencySymbol}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1 : Cart ────────────────────────────────────────────────────

function CartReviewStep({
  cart,
  currencySymbol,
  onUpdateQty,
  onRemoveItem,
  onNext,
}: {
  cart: CartItem[];
  currencySymbol: string;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 animate-fade-up">
      <div>
        <h2 className="text-2xl font-black text-(--color-ink) font-serif">
          Your Cart
        </h2>
        <p className="text-sm text-(--color-ink3) mt-1">
          Review your items before continuing.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {cart.map((item, idx) => (
          <div
            key={idx}
            className="flex gap-4 p-3 rounded-2xl"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              className="w-20 h-24 rounded-xl overflow-hidden shrink-0"
              style={{ background: "var(--color-surface2)" }}
            >
              <img
                src={item.product.image || PLACEHOLDER_IMG}
                alt={item.product.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-(--color-ink4)">
                  {item.product.brand}
                </p>
                <h4 className="text-sm font-bold text-(--color-ink) line-clamp-1 mt-0.5">
                  {item.product.title}
                </h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full border block"
                    style={{
                      backgroundColor: item.selectedColor,
                      borderColor: "var(--color-border)",
                    }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
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
                <div
                  className="flex items-center gap-1 rounded-lg"
                  style={{ border: "1px solid var(--color-border)" }}
                >
                  <button
                    type="button"
                    onClick={() => onUpdateQty(idx, -1)}
                    className="w-7 h-7 flex items-center justify-center text-(--color-ink2) hover:text-(--color-ink) font-black transition-colors"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-(--color-ink)">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQty(idx, 1)}
                    className="w-7 h-7 flex items-center justify-center text-(--color-ink2) hover:text-(--color-ink) font-black transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm font-black text-(--color-ink)">
                  {(item.product.price * item.quantity).toFixed(2)}{" "}
                  {currencySymbol}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemoveItem(idx)}
              aria-label="Remove item"
              className="self-start text-(--color-ink4) hover:text-rose-500 transition-colors p-1"
            >
              <Trash2 size={15} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-2 w-full sm:w-auto sm:self-end flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        style={{
          background:
            "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
          boxShadow: "var(--shadow-accent)",
        }}
      >
        Continue to Shipping
        <ArrowRight size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ─── Step 2 : Shipping & Contact ──────────────────────────────────────

interface ContactStepProps {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  reception: "retrait" | "livraison";
  setReception: (v: "retrait" | "livraison") => void;
  address: string;
  setAddress: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  zip: string;
  setZip: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  stateCode: string;
  setStateCode: (v: string) => void;
  taxNumber: string;
  setTaxNumber: (v: string) => void;
  message: string;
  setMessage: (v: string) => void;
  errors: Record<string, string>;
  setErrors: (e: Record<string, string>) => void;
  onBack: () => void;
  onNext: () => void;
}

function ContactStep({
  name,
  setName,
  phone,
  setPhone,
  email,
  setEmail,
  reception,
  setReception,
  address,
  setAddress,
  city,
  setCity,
  zip,
  setZip,
  country,
  setCountry,
  stateCode,
  setStateCode,
  taxNumber,
  setTaxNumber,
  message,
  setMessage,
  errors,
  setErrors,
  onBack,
  onNext,
}: ContactStepProps) {
  const needsState = STATE_REQUIRED_COUNTRIES.includes(country);

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-black text-(--color-ink) font-serif">
          Shipping &amp; Contact
        </h2>
        <p className="text-sm text-(--color-ink3) mt-1">
          Where and how would you like to receive your order?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setReception("livraison")}
          className="flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-150"
          style={{
            border: `1.5px solid ${reception === "livraison" ? "var(--color-accent)" : "var(--color-border)"}`,
            background:
              reception === "livraison"
                ? "var(--color-accent-bg)"
                : "var(--color-surface)",
          }}
        >
          <Truck
            size={18}
            strokeWidth={2}
            style={{
              color:
                reception === "livraison"
                  ? "var(--color-accent)"
                  : "var(--color-ink3)",
            }}
          />
          <div>
            <p
              className="text-xs font-black"
              style={{
                color:
                  reception === "livraison"
                    ? "var(--color-accent)"
                    : "var(--color-ink)",
              }}
            >
              Delivery
            </p>
            <p className="text-[10px] text-(--color-ink4)">To your address</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setReception("retrait")}
          className="flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-150"
          style={{
            border: `1.5px solid ${reception === "retrait" ? "var(--color-accent)" : "var(--color-border)"}`,
            background:
              reception === "retrait"
                ? "var(--color-accent-bg)"
                : "var(--color-surface)",
          }}
        >
          <Store
            size={18}
            strokeWidth={2}
            style={{
              color:
                reception === "retrait"
                  ? "var(--color-accent)"
                  : "var(--color-ink3)",
            }}
          />
          <div>
            <p
              className="text-xs font-black"
              style={{
                color:
                  reception === "retrait"
                    ? "var(--color-accent)"
                    : "var(--color-ink)",
              }}
            >
              Pickup
            </p>
            <p className="text-[10px] text-(--color-ink4)">On site, free</p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Full Name"
          id="name"
          required
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          autoComplete="name"
          error={errors.name}
          onClearError={() => {
            if (errors.name) {
              const next = { ...errors };
              delete next.name;
              setErrors(next);
            }
          }}
        />
        <TextField
          label="Phone"
          id="phone"
          required
          icon={Phone}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (212) 555-1234"
          autoComplete="tel"
          error={errors.phone}
          onClearError={() => {
            if (errors.phone) {
              const next = { ...errors };
              delete next.phone;
              setErrors(next);
            }
          }}
        />
      </div>

      <TextField
        label="Email"
        id="email"
        required
        icon={Mail}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="john@example.com"
        autoComplete="email"
        error={errors.email}
        onClearError={() => {
          if (errors.email) {
            const next = { ...errors };
            delete next.email;
            setErrors(next);
          }
        }}
      />

      {reception === "livraison" && (
        <div className="flex flex-col gap-4 pt-1 animate-fade-up">
          <TextField
            label="Address"
            id="address"
            required
            icon={MapPin}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="132 Main Street"
            autoComplete="address-line1"
            error={errors.address}
            onClearError={() => {
              if (errors.address) {
                const next = { ...errors };
                delete next.address;
                setErrors(next);
              }
            }}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="City"
              id="city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New York"
              autoComplete="address-level2"
              error={errors.city}
              onClearError={() => {
                if (errors.city) {
                  const next = { ...errors };
                  delete next.city;
                  setErrors(next);
                }
              }}
            />
            <TextField
              label="ZIP Code"
              id="zip"
              required
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="10001"
              autoComplete="postal-code"
              error={errors.zip}
              onClearError={() => {
                if (errors.zip) {
                  const next = { ...errors };
                  delete next.zip;
                  setErrors(next);
                }
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-(--color-ink3)">
              Country <span className="text-(--color-accent)">*</span>
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none bg-(--color-surface) text-(--color-ink)"
              style={{ border: "1.5px solid var(--color-border2)" }}
            >
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="FR">France</option>
              <option value="CH">Switzerland</option>
              <option value="BE">Belgium</option>
              <option value="BR">Brazil</option>
              <option value="JP">Japan</option>
            </select>
          </div>

          {needsState && (
            <TextField
              label={country === "BR" ? "State (UF)" : "State / Province"}
              id="stateCode"
              required
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value.toUpperCase())}
              placeholder={country === "BR" ? "SP" : "NY"}
              maxLength={2}
              autoComplete="address-level1"
              error={errors.stateCode}
              onClearError={() => {
                if (errors.stateCode) {
                  const next = { ...errors };
                  delete next.stateCode;
                  setErrors(next);
                }
              }}
            />
          )}

          {country === "BR" && (
            <TextField
              label="CPF or CNPJ"
              id="taxNumber"
              required
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              placeholder="000.000.000-00"
              autoComplete="off"
              error={errors.taxNumber}
              onClearError={() => {
                if (errors.taxNumber) {
                  const next = { ...errors };
                  delete next.taxNumber;
                  setErrors(next);
                }
              }}
            />
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-(--color-ink3)">
          Message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none resize-none bg-(--color-surface) text-(--color-ink) placeholder:text-(--color-ink4)"
          style={{ border: "1.5px solid var(--color-border2)" }}
          placeholder="Delivery instructions, personalization..."
        />
      </div>

      <div className="flex items-center justify-between mt-1 gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-xs font-bold text-(--color-ink2) transition-colors hover:bg-(--color-surface2)"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <ArrowLeft size={14} strokeWidth={2.5} /> Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{
            background:
              "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          Continue to Payment <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 3 : Payment ──────────────────────────────────────────────────

interface PaymentStepProps {
  cardNumber: string;
  setCardNumber: (v: string) => void;
  cardHolder: string;
  setCardHolder: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  cardCvv: string;
  setCardCvv: (v: string) => void;
  saveCard: boolean;
  setSaveCard: (v: boolean) => void;
  errors: Record<string, string>;
  setErrors: (e: Record<string, string>) => void;
  paymentError: string | null;
  processing: boolean;
  total: number;
  currencySymbol: string;
  onBack: () => void;
  onPay: () => void;
  onStripePay: () => void;
  // Nouvelles props pour le formulaire carte direct
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  reception: "retrait" | "livraison";
  address: string;
  city: string;
  zip: string;
  country: string;
  stateCode: string;
  taxNumber: string;
  message: string;
  cart: CartItem[];
  shippingCost: number;
  currencyCode: string;
  onStripeCardSuccess: (orderId: string) => void;
  onStripeCardError: (msg: string) => void;
}

// ─── Stripe direct card form ───────────────────────────────────────────
function StripeCardForm({
  total,
  currencySymbol,
  currencyCode,
  onBack,
  onSuccess,
  onError,
  orderId,
  contactName,
  contactEmail,
  contactPhone,
  reception,
  address,
  city,
  zip,
  country,
  stateCode,
  taxNumber,
  message,
  cart,
  shippingCost,
}: {
  total: number;
  currencySymbol: string;
  currencyCode: string;
  onBack: () => void;
  onSuccess: (orderId: string) => void;
  onError: (msg: string) => void;
  orderId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  reception: "retrait" | "livraison";
  address: string;
  city: string;
  zip: string;
  country: string;
  stateCode: string;
  taxNumber: string;
  message: string;
  cart: CartItem[];
  shippingCost: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Style cohérent avec le thème (clair/sombre) via variables CSS
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  const elementOptions = {
    style: {
      base: {
        fontSize: "16px",
        color: isDark ? "#e5e5e5" : "#1a1a1a",
        "::placeholder": {
          color: isDark ? "#6b7280" : "#9ca3af",
        },
        iconColor: isDark ? "#6b7280" : "#9ca3af",
        fontWeight: "400",
      },
      invalid: {
        color: "#ef4444",
        iconColor: "#ef4444",
      },
    },
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrorMsg(null);

    // 1. Create PaymentIntent via Edge Function
    const piRes = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: "payment-intent",
          amount: total,
          currency: currencyCode,
          orderId,
        }),
      },
    );
    const piData = await piRes.json();
    if (!piRes.ok || !piData.clientSecret) {
      setProcessing(false);
      setErrorMsg(piData.error || "Payment creation failed.");
      onError(piData.error);
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      setProcessing(false);
      return;
    }

    // 2. Confirm payment with Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      piData.clientSecret,
      {
        payment_method: {
          card: cardNumberElement,
        },
      },
    );

    if (error) {
      setProcessing(false);
      setErrorMsg(error.message || "Payment failed.");
      onError(error.message || "");
      return;
    }

    if (paymentIntent && paymentIntent.status === "succeeded") {
      // 3. Save order in Supabase
      try {
        await orderApi.create({
          id: orderId,
          clientId: null,
          clientName: contactName,
          clientEmail: contactEmail || null,
          createdAt: new Date().toISOString(),
          status: "pending",
          totalAmount: total,
          shippingCost,
          shippingAddress: {
            fullName: contactName,
            address: reception === "livraison" ? address : "Pickup",
            city: reception === "livraison" ? city : "",
            zip: reception === "livraison" ? zip : "",
            country: reception === "livraison" ? country : "FR",
            state_code: reception === "livraison" ? stateCode : "",
            tax_number: reception === "livraison" ? taxNumber : "",
            phone: contactPhone,
          },
          notes: message,
          items: cart.map((item, idx) => ({
            id: `item-${orderId}-${idx}`,
            orderId,
            productId: item.product.id,
            productTitle: item.product.title,
            productImage: item.product.image || PLACEHOLDER_IMG,
            selectedColor: item.selectedColor || "#000000",
            selectedSize: item.selectedSize || "M",
            quantity: item.quantity,
            unitPrice: item.product.price,
          })),
        } as any);
        sendTelegramNotification(
          orderId,
          contactName,
          contactPhone,
          contactEmail,
          reception,
          address,
          city,
          zip,
          country,
          cart,
          total,
          currencySymbol,
        );

        // Email confirmation via Resend
        sendOrderEmail(
          orderId,
          contactName,
          contactEmail,
          contactPhone,
          address,
          city,
          zip,
          country,
          stateCode,
          cart,
          total,
          currencySymbol,
        );

        onSuccess(orderId);
      } catch (e: any) {
        setProcessing(false);
        setErrorMsg("Payment succeeded but order creation failed.");
        onError(e.message);
      }
    } else {
      setProcessing(false);
      setErrorMsg("Payment was not completed.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 animate-fade-up"
    >
      <div>
        <div className="flex items-center gap-3 mb-1">
          <button
            type="button"
            onClick={onBack}
            className="text-(--color-ink4) hover:text-(--color-ink) transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>
          <h2 className="text-2xl font-black text-(--color-ink) font-serif">
            Pay by Card
          </h2>
        </div>
        <p className="text-sm text-(--color-ink3) mt-1 flex items-center gap-1.5">
          <Lock
            size={12}
            strokeWidth={2.5}
            style={{ color: "var(--color-success)" }}
          />
          Secured by Stripe
        </p>
      </div>

      {/* Separate fields */}
      <div className="flex flex-col gap-4 max-w-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-(--color-ink3)">
            Card Number <span className="text-(--color-accent)">*</span>
          </label>
          <div className="p-3 rounded-xl border border-(--color-border) bg-(--color-surface)">
            <CardNumberElement options={elementOptions} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-(--color-ink3)">
              Expiry <span className="text-(--color-accent)">*</span>
            </label>
            <div className="p-3 rounded-xl border border-(--color-border) bg-(--color-surface)">
              <CardExpiryElement options={elementOptions} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-(--color-ink3)">
              CVV <span className="text-(--color-accent)">*</span>
            </label>
            <div className="p-3 rounded-xl border border-(--color-border) bg-(--color-surface)">
              <CardCvcElement options={elementOptions} />
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div
          className="flex items-start gap-2 p-3.5 rounded-xl text-xs font-medium max-w-sm"
          style={{
            background: "var(--notif-negative-bg)",
            color: "var(--notif-negative)",
            border: "1px solid var(--notif-negative)",
          }}
        >
          <AlertCircle size={15} strokeWidth={2} className="shrink-0 mt-0.5" />
          {errorMsg}
        </div>
      )}

      <div className="flex items-center justify-between mt-1 gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={processing}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-xs font-bold text-(--color-ink2) transition-colors hover:bg-(--color-surface2) disabled:opacity-40"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <ArrowLeft size={14} strokeWidth={2.5} /> Back
        </button>
        <button
          type="submit"
          disabled={processing || !stripe}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0"
          style={{
            background:
              "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          {processing ? (
            <>
              <Loader2 size={15} strokeWidth={2.5} className="animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Lock size={13} strokeWidth={2.5} />
              Pay {total.toFixed(2)} {currencySymbol}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function PaymentStep({
  cardNumber,
  setCardNumber,
  cardHolder,
  setCardHolder,
  cardExpiry,
  setCardExpiry,
  cardCvv,
  setCardCvv,
  saveCard,
  setSaveCard,
  errors,
  setErrors,
  paymentError,
  processing,
  total,
  currencySymbol,
  onBack,
  onPay,
  onStripePay,
  contactName,
  contactEmail,
  contactPhone,
  reception,
  address,
  city,
  zip,
  country,
  stateCode,
  taxNumber,
  message,
  cart,
  shippingCost,
  currencyCode,
  onStripeCardSuccess,
  onStripeCardError,
}: PaymentStepProps) {
  const [showCardForm, setShowCardForm] = useState(false);
  const [localOrderId] = useState(generateOrderId());

  // Step 1: payment method selection
  if (!showCardForm) {
    return (
      <div className="flex flex-col gap-6 animate-fade-up">
        <div>
          <h2 className="text-2xl font-black text-(--color-ink) font-serif">
            Payment
          </h2>
          <p className="text-sm text-(--color-ink3) mt-1">
            Choose your payment method.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Stripe Checkout option */}
          <button
            type="button"
            onClick={onStripePay}
            disabled={processing}
            className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0"
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border2)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {processing ? (
              <>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#635BFF" }}
                >
                  <Loader2 size={24} className="animate-spin text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-(--color-ink)">
                    Redirecting to Stripe…
                  </p>
                  <p className="text-[11px] text-(--color-ink4) mt-0.5">
                    You will be redirected to the secure payment page
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#635BFF" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l4.59-4.58L17 11l-6 6z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-(--color-ink)">
                    Stripe Checkout
                  </p>
                  <p className="text-[11px] text-(--color-ink4) mt-0.5">
                    Credit card, Apple Pay, Google Pay — secure
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-(--color-ink)">
                    {total.toFixed(2)} {currencySymbol}
                  </p>
                  <ArrowRight
                    size={15}
                    strokeWidth={2.5}
                    className="ml-auto mt-1 text-(--color-accent)"
                  />
                </div>
              </>
            )}
          </button>

          {/* Direct card option */}
          <button
            type="button"
            onClick={() => setShowCardForm(true)}
            className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: "var(--color-surface)",
              border: "1.5px solid var(--color-border2)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-ink), #2b211c)",
              }}
            >
              <CreditCard
                size={20}
                strokeWidth={1.75}
                style={{ color: "white" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-(--color-ink)">
                Pay by Card
              </p>
              <p className="text-[11px] text-(--color-ink4) mt-0.5">
                Enter your card details securely
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-black text-(--color-ink)">
                {total.toFixed(2)} {currencySymbol}
              </p>
              <ArrowRight
                size={15}
                strokeWidth={2.5}
                className="ml-auto mt-1 text-(--color-accent)"
              />
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onBack}
          disabled={processing}
          className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-xs font-bold text-(--color-ink2) transition-colors hover:bg-(--color-surface2) disabled:opacity-40"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <ArrowLeft size={14} strokeWidth={2.5} /> Back
        </button>
      </div>
    );
  }

  // Step 2: Stripe card form
  return (
    <Elements stripe={stripePromise}>
      <StripeCardForm
        orderId={localOrderId}
        total={total}
        currencySymbol={currencySymbol}
        currencyCode={currencyCode}
        contactName={contactName}
        contactEmail={contactEmail}
        contactPhone={contactPhone}
        reception={reception}
        address={address}
        city={city}
        zip={zip}
        country={country}
        stateCode={stateCode}
        taxNumber={taxNumber}
        message={message}
        cart={cart}
        shippingCost={shippingCost}
        onBack={() => setShowCardForm(false)}
        onSuccess={(orderId) => onStripeCardSuccess(orderId)}
        onError={(msg) => onStripeCardError(msg)}
      />
    </Elements>
  );
}

// ─── Step 4 : Confirmation ──────────────────────────────────────────────

function ConfirmationStep({
  orderId,
  email,
  copied,
  onCopy,
  onClose,
}: {
  orderId: string;
  email: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-6 sm:py-10 animate-scale-in">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "var(--color-success-bg)" }}
      >
        <CheckCircle2
          size={32}
          strokeWidth={2}
          style={{ color: "var(--color-success)" }}
        />
      </div>
      <div>
        <h2 className="text-2xl font-black text-(--color-ink) font-serif">
          Order Confirmed
        </h2>
        <p className="text-sm text-(--color-ink3) mt-2 leading-relaxed max-w-sm">
          Your payment has been accepted. The order is being sent to our print
          shop.
        </p>
      </div>

      <div
        className="w-full rounded-2xl p-5"
        style={{ background: "var(--color-surface2)" }}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-(--color-ink3) mb-2">
          Order Reference
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="font-mono font-black text-xl tracking-wider text-(--color-accent)">
            {orderId}
          </span>
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy reference"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: copied
                ? "var(--color-success)"
                : "var(--color-surface)",
              color: copied ? "#ffffff" : "var(--color-ink2)",
              border: "1px solid var(--color-border)",
            }}
          >
            {copied ? (
              <Check size={14} strokeWidth={2.5} />
            ) : (
              <Copy size={14} strokeWidth={2} />
            )}
          </button>
        </div>
        {copied && (
          <p
            className="text-[11px] mt-1.5 font-semibold"
            style={{ color: "var(--color-success)" }}
          >
            Reference copied
          </p>
        )}
      </div>

      <div className="w-full flex flex-col gap-2 text-left text-xs text-(--color-ink3) leading-relaxed">
        {email && (
          <p className="flex items-start gap-2">
            <Mail
              size={13}
              strokeWidth={2}
              className="shrink-0 mt-0.5 text-(--color-accent)"
            />
            A confirmation has been sent to{" "}
            <strong className="text-(--color-ink2)">{email}</strong>.
          </p>
        )}
        <p className="flex items-start gap-2">
          <CheckCircle2
            size={13}
            strokeWidth={2}
            className="shrink-0 mt-0.5 text-(--color-accent)"
          />
          Our team has been notified automatically of your order.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        style={{
          background:
            "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
          boxShadow: "var(--shadow-accent)",
        }}
      >
        Back to Shop
      </button>
    </div>
  );
}

// ─── Empty cart guard ───────────────────────────────────────────────────

function EmptyCartGuard({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="text-center max-w-xs">
        <ShoppingBag
          size={40}
          strokeWidth={1.75}
          className="mx-auto mb-3 text-(--color-ink4)"
        />
        <p className="font-bold text-(--color-ink) mb-1">Your cart is empty</p>
        <p className="text-xs text-(--color-ink3) mb-5">
          Add some items before checking out.
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white"
          style={{ background: "var(--color-accent)" }}
        >
          Back to Shop
        </button>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────

export default function CheckoutFlow({
  cart,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onSuccess,
  confirmModeOrderId,
}: CheckoutFlowProps) {
  const currencySymbol = useCurrencySymbol();
  const contentRef = useRef<HTMLDivElement>(null);

  // ── Stripe confirmation mode ─────────────────────────────────
  if (confirmModeOrderId) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
      navigator.clipboard.writeText(confirmModeOrderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    };

    return (
      <div
        className="fixed inset-0 z-60 flex items-center justify-center p-4"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="max-w-xl w-full mx-auto px-4 sm:px-6 py-10">
          <ConfirmationStep
            orderId={confirmModeOrderId}
            email=""
            copied={copied}
            onCopy={handleCopy}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  const [step, setStep] = useState<StepId>(1);

  // Contact & shipping
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reception, setReception] = useState<"retrait" | "livraison">(
    "livraison",
  );
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("FR");
  const [stateCode, setStateCode] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [message, setMessage] = useState("");

  // Payment
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [saveCard, setSaveCard] = useState(true);

  // Flow
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [copied, setCopied] = useState(false);
  const [shippingSettings, setShippingSettings] = useState({
    threshold: 35,
    cost: 4.99,
  });
  const [currencyCode, setCurrencyCode] = useState("usd");

  // Load default country + shipping thresholds from store_settings
  useEffect(() => {
    storeSettingsApi
      .get()
      .then((s) => {
        setCountry(s.country || "US");
        setShippingSettings({
          threshold: s.freeShippingThreshold ?? 35,
          cost: s.shippingCost ?? 4.99,
        });
        setCurrencyCode((s.currency || "usd").toLowerCase());
      })
      .catch(() => {});
  }, []);

  // Scroll to top on step change
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const cartTotal = useMemo(
    () =>
      cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0),
    [cart],
  );
  const shippingCost =
    reception === "retrait" || cartTotal >= shippingSettings.threshold
      ? 0
      : shippingSettings.cost;
  const total = cartTotal + shippingCost;

  const validateContact = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required.";
    if (!phone.trim()) e.phone = "Phone number is required.";
    if (!email.trim()) e.email = "Email is required for order confirmation.";
    else if (!EMAIL_REGEX.test(email)) e.email = "Invalid email format.";

    if (reception === "livraison") {
      if (!address.trim()) e.address = "Address is required.";
      if (!city.trim()) e.city = "City is required.";
      if (!zip.trim()) e.zip = "ZIP code is required.";
      if (STATE_REQUIRED_COUNTRIES.includes(country) && !stateCode.trim())
        e.stateCode = "This field is required.";
      if (country === "US" && !/^\d{5}(-\d{4})?$/.test(zip.trim()))
        e.zip = "US ZIP code must be 5 digits (e.g. 10001).";
      if (country === "BR" && !taxNumber.trim())
        e.taxNumber = "CPF/CNPJ is required.";
    }
    setErrors(e);

    // Auto-scroll to the first invalid field
    if (Object.keys(e).length > 0) {
      setTimeout(() => {
        const firstError = Object.keys(e)[0];
        const input = document.querySelector(
          `[name="${firstError}"], [id="${firstError}"]`,
        );
        if (input) {
          (input as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 50);
    }

    return Object.keys(e).length === 0;
  };

  const validatePayment = (): boolean => {
    const e: Record<string, string> = {};
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 16)
      e.cardNumber = "Invalid card number.";
    else if (!isValidLuhn(digits))
      e.cardNumber = "This card number is not valid.";
    if (!cardHolder.trim()) e.cardHolder = "Cardholder name is required.";
    if (!isExpiryValid(cardExpiry))
      e.cardExpiry = "Invalid or past expiration date.";
    if (!/^\d{3,4}$/.test(cardCvv)) e.cardCvv = "Invalid CVV.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goBack = () => {
    setErrors({});
    setPaymentError(null);
    setStep((s) => (s > 1 ? ((s - 1) as StepId) : s));
  };

  const jumpTo = (s: StepId) => {
    setErrors({});
    setPaymentError(null);
    setStep(s);
  };

  const handleStripePay = async () => {
    if (!validateContact()) return;
    setProcessing(true);
    setPaymentError(null);

    const newOrderId = generateOrderId();
    const createdAt = new Date().toISOString();

    try {
      let clientId: string | null = null;
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          const { data: existingCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("email", user.email)
            .single();
          if (existingCustomer) {
            clientId = existingCustomer.id;
          } else {
            const { data: newCustomer } = await supabase
              .from("customers")
              .insert({
                email: user.email,
                name: user.user_metadata?.full_name || name,
              })
              .select("id")
              .single();
            clientId = newCustomer?.id ?? null;
          }
        }
      } catch (e) {
        console.warn(e);
      }

      await orderApi.create({
        id: newOrderId,
        clientId,
        clientName: name,
        clientEmail: email || null,
        createdAt,
        status: "pending",
        totalAmount: total,
        shippingCost,
        shippingAddress: {
          fullName: name,
          address: reception === "livraison" ? address : "Pickup",
          city: reception === "livraison" ? city : "",
          zip: reception === "livraison" ? zip : "",
          country: reception === "livraison" ? country : "FR",
          state_code: reception === "livraison" ? stateCode : "",
          tax_number: reception === "livraison" ? taxNumber : "",
          phone,
        },
        notes: message,
        items: cart.map((item, idx) => ({
          id: `item-${newOrderId}-${idx}`,
          orderId: newOrderId,
          productId: item.product.id,
          productTitle: item.product.title,
          productImage: item.product.image || PLACEHOLDER_IMG,
          selectedColor: item.selectedColor || "#000000",
          selectedSize: item.selectedSize || "M",
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
      } as any);

      // Redirect to Stripe Checkout
      const stripeRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            orderId: newOrderId,
            lineItems: cart.map((item) => ({
              name: item.product.title,
              image: item.product.image || PLACEHOLDER_IMG,
              unitAmount: Math.round(item.product.price * 100),
              quantity: item.quantity,
              currency: "usd",
            })),
            customerEmail: email,
            successUrl: `${window.location.origin}/?order=success&id=${newOrderId}`,
            cancelUrl: `${window.location.origin}/?order=cancelled`,
          }),
        },
      );

      if (!stripeRes.ok) {
        const err = await stripeRes.json();
        throw new Error(err.error || "Stripe error");
      }

      const { url } = await stripeRes.json();
      window.location.href = url;
    } catch (err: any) {
      console.error(err);
      setPaymentError(
        err?.message || "An error occurred while creating the payment.",
      );
      setProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!validatePayment()) return;
    setProcessing(true);
    setPaymentError(null);

    const newOrderId = generateOrderId();
    const createdAt = new Date().toISOString();

    try {
      const work = (async () => {
        let clientId: string | null = null;
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user?.email) {
            const { data: existingCustomer } = await supabase
              .from("customers")
              .select("id")
              .eq("email", user.email)
              .single();
            if (existingCustomer) {
              clientId = existingCustomer.id;
            } else {
              const { data: newCustomer } = await supabase
                .from("customers")
                .insert({
                  email: user.email,
                  name: user.user_metadata?.full_name || name,
                })
                .select("id")
                .single();
              clientId = newCustomer?.id ?? null;
            }
          }
        } catch (e) {
          console.warn("Could not link user to order", e);
        }

        await orderApi.create({
          id: newOrderId,
          clientId,
          clientName: name,
          clientEmail: email || null,
          createdAt,
          status: "pending",
          totalAmount: total,
          shippingCost,
          shippingAddress: {
            fullName: name,
            address: reception === "livraison" ? address : "Pickup",
            city: reception === "livraison" ? city : "",
            zip: reception === "livraison" ? zip : "",
            country: reception === "livraison" ? country : "FR",
            state_code: reception === "livraison" ? stateCode : "",
            tax_number: reception === "livraison" ? taxNumber : "",
            phone,
          },
          notes: message,
          items: cart.map((item, idx) => ({
            id: `item-${newOrderId}-${idx}`,
            orderId: newOrderId,
            productId: item.product.id,
            productTitle: item.product.title,
            productImage: item.product.image || PLACEHOLDER_IMG,
            selectedColor: item.selectedColor || "#000000",
            selectedSize: item.selectedSize || "M",
            quantity: item.quantity,
            unitPrice: item.product.price,
          })),
        } as any);

        // Send to Printful (async)
        podApi
          .createOrder(newOrderId)
          .catch((e) => console.warn("[Printful] Error sending order:", e));

        // Send recap via Telegram
        sendTelegramNotification(
          newOrderId,
          name,
          phone,
          email,
          reception,
          address,
          city,
          zip,
          country,
          cart,
          total,
          currencySymbol,
        );

        // Email confirmation via Resend
        sendOrderEmail(
          newOrderId,
          name,
          email,
          phone,
          address,
          city,
          zip,
          country,
          stateCode,
          cart,
          total,
          currencySymbol,
        );
      })();

      // Délai minimum pour un retour visuel crédible, pendant que le
      // travail réel (Supabase + Printful) s'exécute en parallèle.
      const minDelay = new Promise((resolve) => setTimeout(resolve, 1100));
      await Promise.all([work, minDelay]);

      setOrderId(newOrderId);
      setStep(4);
      onSuccess();
    } catch (err: any) {
      console.error("Order creation error", err);
      setPaymentError(
        err?.message ||
          "An error occurred while processing the payment. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (cart.length === 0 && step !== 4) {
    return <EmptyCartGuard onClose={onClose} />;
  }

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="grain-overlay" />

      {/* Header */}
      <header
        className="glass shrink-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src={LOGO_URL}
            alt="InstaWear"
            className="h-7 w-7 rounded-lg object-cover"
          />
          <span className="font-black text-sm sm:text-base text-(--color-ink)">
            InstaWear
          </span>
          <span className="text-(--color-ink4) hidden sm:inline">/</span>
          <span className="text-xs sm:text-sm font-bold text-(--color-ink2) hidden sm:inline">
            Secure Checkout
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:bg-(--color-surface2) text-(--color-ink3) hover:text-(--color-ink)"
          style={{ border: "1px solid var(--color-border)" }}
        >
          <X size={17} strokeWidth={2} />
        </button>
      </header>

      {/* Stepper */}
      <div
        className="py-5 sm:py-6 shrink-0"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <Stepper step={step} onJump={jumpTo} />
      </div>

      {/* Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        {step === 4 ? (
          <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
            <ConfirmationStep
              orderId={orderId}
              email={email}
              copied={copied}
              onCopy={handleCopyOrderId}
              onClose={onClose}
            />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
            <div>
              {step === 1 && (
                <CartReviewStep
                  cart={cart}
                  currencySymbol={currencySymbol}
                  onUpdateQty={onUpdateQty}
                  onRemoveItem={onRemoveItem}
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && (
                <ContactStep
                  name={name}
                  setName={setName}
                  phone={phone}
                  setPhone={setPhone}
                  email={email}
                  setEmail={setEmail}
                  reception={reception}
                  setReception={setReception}
                  address={address}
                  setAddress={setAddress}
                  city={city}
                  setCity={setCity}
                  zip={zip}
                  setZip={setZip}
                  country={country}
                  setCountry={setCountry}
                  stateCode={stateCode}
                  setStateCode={setStateCode}
                  taxNumber={taxNumber}
                  setTaxNumber={setTaxNumber}
                  message={message}
                  setMessage={setMessage}
                  errors={errors}
                  setErrors={setErrors}
                  onBack={goBack}
                  onNext={() => {
                    if (validateContact()) setStep(3);
                  }}
                />
              )}
              {step === 3 && (
                <PaymentStep
                  cardNumber={cardNumber}
                  setCardNumber={setCardNumber}
                  cardHolder={cardHolder}
                  setCardHolder={setCardHolder}
                  cardExpiry={cardExpiry}
                  setCardExpiry={setCardExpiry}
                  cardCvv={cardCvv}
                  setCardCvv={setCardCvv}
                  saveCard={saveCard}
                  setSaveCard={setSaveCard}
                  errors={errors}
                  setErrors={setErrors}
                  paymentError={paymentError}
                  processing={processing}
                  total={total}
                  currencySymbol={currencySymbol}
                  onBack={goBack}
                  onPay={handlePay}
                  onStripePay={handleStripePay}
                  contactName={name}
                  contactEmail={email}
                  contactPhone={phone}
                  reception={reception}
                  address={address}
                  city={city}
                  zip={zip}
                  country={country}
                  stateCode={stateCode}
                  taxNumber={taxNumber}
                  message={message}
                  cart={cart}
                  shippingCost={shippingCost}
                  currencyCode={currencyCode}
                  onStripeCardSuccess={(newOrderId: string) => {
                    setOrderId(newOrderId);
                    setStep(4);
                    onSuccess();
                  }}
                  onStripeCardError={(msg: string) => {
                    setPaymentError(msg);
                  }}
                />
              )}
            </div>

            <OrderSummaryPanel
              cart={cart}
              cartTotal={cartTotal}
              shippingCost={shippingCost}
              total={total}
              currencySymbol={currencySymbol}
              reception={reception}
              threshold={shippingSettings.threshold}
            />
          </div>
        )}
      </div>
    </div>
  );
}
