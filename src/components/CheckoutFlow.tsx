// src/components/CheckoutFlow.tsx

import React, { useMemo, useRef, useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "./ui/Button";
import type { CartItem } from "../types";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";

interface CheckoutFlowProps {
  cart: CartItem[];
  currencySymbol: string;
  shippingCost: number;
  freeShippingThreshold: number;
  onClose: () => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onSubmitOrder: (payload: {
    name: string;
    phone: string;
    email: string;
    reception: "pickup" | "delivery";
    address: string;
    city: string;
    zip: string;
    country: string;
    message: string;
  }) => Promise<{ orderId: string }>;
  confirmModeOrderId?: string;
}

type StepId = 1 | 2 | 3 | 4;
const STEPS: { id: StepId; label: string }[] = [
  { id: 1, label: "Cart" },
  { id: 2, label: "Shipping" },
  { id: 3, label: "Payment" },
  { id: 4, label: "Done" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function isValidLuhn(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0,
    alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function isExpiryValid(v: string): boolean {
  const m = v.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return false;
  const month = parseInt(m[1], 10),
    year = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  if (year < now.getFullYear()) return false;
  if (year === now.getFullYear() && month < now.getMonth() + 1) return false;
  return true;
}

function formatCardNumber(v: string) {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatExpiry(v: string) {
  const c = v.replace(/\D/g, "").slice(0, 4);
  return c.length >= 3 ? c.slice(0, 2) + "/" + c.slice(2) : c;
}

/* ── Stepper ─────────────────────────────────────────────────────── */
function Stepper({
  step,
  onJump,
}: {
  step: StepId;
  onJump: (s: StepId) => void;
}) {
  return (
    <div className="flex items-center w-full max-w-xl mx-auto px-4">
      {STEPS.map((s, idx) => {
        const isDone = step > s.id;
        const isActive = step === s.id;
        return (
          <React.Fragment key={s.id}>
            <button
              type="button"
              disabled={!isDone}
              onClick={() => isDone && onJump(s.id)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all"
                style={{
                  background: isDone
                    ? "var(--color-cta-bg)"
                    : isActive
                      ? "var(--color-accent-bg)"
                      : "var(--color-surface2)",
                  color: isDone
                    ? "var(--color-cta-ink)"
                    : isActive
                      ? "var(--color-accent)"
                      : "var(--color-ink4)",
                  border: `2px solid ${isDone || isActive ? "var(--color-accent)" : "var(--color-border2)"}`,
                }}
              >
                {isDone ? <Check size={14} /> : s.id}
              </span>
              <span
                className="text-[10px] font-black uppercase tracking-wider hidden sm:block"
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
              <div
                className="flex-1 h-0.5 mx-2 rounded-full relative overflow-hidden -mt-4"
                style={{ background: "var(--color-border)" }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
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

/* ── Order summary panel ────────────────────────────────────────── */
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
  reception: "pickup" | "delivery";
  threshold: number;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const itemCount = cart.reduce((a, b) => a + b.quantity, 0);

  return (
    <div className="lg:sticky lg:top-6">
      <div
        className="rounded-3xl p-5"
        style={{
          background: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="lg:hidden w-full flex items-center justify-between mb-1"
        >
          <span
            className="font-black text-sm"
            style={{ color: "var(--color-ink)" }}
          >
            Summary ({itemCount})
          </span>
          <span
            className="font-black text-sm"
            style={{ color: "var(--color-ink)" }}
          >
            {total.toFixed(2)} {currencySymbol}
          </span>
        </button>

        <div className={collapsed ? "hidden lg:block" : "block"}>
          <h3
            className="font-display font-black text-sm mb-4 hidden lg:block"
            style={{ color: "var(--color-ink)" }}
          >
            Order Summary
          </h3>

          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1 mb-4">
            {cart.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className="relative w-12 h-14 rounded-xl overflow-hidden shrink-0"
                  style={{ background: "var(--color-surface)" }}
                >
                  <img
                    src={getVariantImage(item.product, item.selectedColor)}
                    alt=""
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
                  <p
                    className="text-xs font-bold line-clamp-1"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {item.product.title}
                  </p>
                  <p
                    className="text-[10px]"
                    style={{ color: "var(--color-ink3)" }}
                  >
                    {item.selectedSize} · {item.quantity} ×{" "}
                    {item.unitPrice.toFixed(2)} {currencySymbol}
                  </p>
                </div>
                <span
                  className="text-xs font-black shrink-0"
                  style={{ color: "var(--color-ink)" }}
                >
                  {(item.unitPrice * item.quantity).toFixed(2)} {currencySymbol}
                </span>
              </div>
            ))}
          </div>

          <div
            className="flex flex-col gap-1.5 text-xs pt-3"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <div
              className="flex justify-between"
              style={{ color: "var(--color-ink3)" }}
            >
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
              <span>Shipping{reception === "pickup" ? " (pickup)" : ""}</span>
              <span>
                {shippingCost === 0
                  ? "Free"
                  : `${shippingCost.toFixed(2)} ${currencySymbol}`}
              </span>
            </div>
            {shippingCost > 0 && reception === "delivery" && (
              <p
                className="text-[10px] mt-0.5"
                style={{ color: "var(--color-accent)" }}
              >
                {(threshold - cartTotal).toFixed(2)} {currencySymbol} away from
                free shipping
              </p>
            )}
            <div
              className="flex justify-between pt-2 mt-1 text-sm font-black"
              style={{
                color: "var(--color-ink)",
                borderTop: "1px solid var(--color-border)",
              }}
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
  );
}

/* ── Reusable text field ────────────────────────────────────────── */
interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  onClearError?: () => void;
}
function TextField({
  label,
  required,
  error,
  icon: Icon,
  className,
  onClearError,
  ...rest
}: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[11px] font-black uppercase tracking-wider"
        style={{ color: "var(--color-ink3)" }}
      >
        {label}{" "}
        {required && <span style={{ color: "var(--color-accent)" }}>*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon size={15} strokeWidth={2} />}
        {Icon && (
          <span
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-ink4)" }}
          >
            <Icon size={15} strokeWidth={2} />
          </span>
        )}
        <input
          {...rest}
          onChange={(e) => {
            rest.onChange?.(e);
            onClearError?.();
          }}
          className={`w-full ${Icon ? "pl-10" : "pl-4"} pr-4 py-3 rounded-2xl text-sm outline-none transition-colors ${className || ""}`}
          style={{
            background: "var(--color-surface)",
            color: "var(--color-ink)",
            border: `1.5px solid ${error ? "var(--color-negative)" : "var(--color-border2)"}`,
          }}
        />
      </div>
      {error && (
        <p
          className="text-[11px] font-bold flex items-center gap-1"
          style={{ color: "var(--color-negative)" }}
        >
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

/* ── Step 1: Cart review ────────────────────────────────────────── */
function CartReviewStep({
  cart,
  currencySymbol,
  onUpdateQty,
  onRemoveItem,
  onNext,
}: {
  cart: CartItem[];
  currencySymbol: string;
  onUpdateQty: (i: number, d: number) => void;
  onRemoveItem: (i: number) => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-5 animate-fade-up">
      <div>
        <h2
          className="font-display font-black text-2xl sm:text-3xl"
          style={{ color: "var(--color-ink)" }}
        >
          Your Cart
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-ink3)" }}>
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
                src={getVariantImage(item.product, item.selectedColor)}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <p
                  className="text-[10px] font-black uppercase tracking-wider"
                  style={{ color: "var(--color-ink4)" }}
                >
                  {item.product.brand}
                </p>
                <h4
                  className="text-sm font-bold line-clamp-1 mt-0.5"
                  style={{ color: "var(--color-ink)" }}
                >
                  {item.product.title}
                </h4>
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
                <div
                  className="flex items-center gap-1 rounded-full"
                  style={{ border: "1px solid var(--color-border)" }}
                >
                  <button
                    onClick={() => onUpdateQty(idx, -1)}
                    className="w-7 h-7 flex items-center justify-center font-black"
                    style={{ color: "var(--color-ink2)" }}
                  >
                    −
                  </button>
                  <span
                    className="w-6 text-center text-xs font-bold"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQty(idx, 1)}
                    className="w-7 h-7 flex items-center justify-center font-black"
                    style={{ color: "var(--color-ink2)" }}
                  >
                    +
                  </button>
                </div>
                <span
                  className="text-sm font-black"
                  style={{ color: "var(--color-ink)" }}
                >
                  {(item.unitPrice * item.quantity).toFixed(2)} {currencySymbol}
                </span>
              </div>
            </div>
            <button
              onClick={() => onRemoveItem(idx)}
              className="self-start p-1"
              style={{ color: "var(--color-ink4)" }}
              aria-label="Remove"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <Button
        variant="accent"
        size="lg"
        fullWidthOnMobile
        className="sm:self-end"
        onClick={onNext}
        iconRight={<ArrowRight size={15} />}
      >
        Continue to Shipping
      </Button>
    </div>
  );
}

/* ── Step 2: Shipping & Contact ─────────────────────────────────── */
interface ContactStepProps {
  name: string;
  setName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  reception: "pickup" | "delivery";
  setReception: (v: "pickup" | "delivery") => void;
  address: string;
  setAddress: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  zip: string;
  setZip: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
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
  message,
  setMessage,
  errors,
  setErrors,
  onBack,
  onNext,
}: ContactStepProps) {
  const clear = (k: string) => {
    if (errors[k]) {
      const n = { ...errors };
      delete n[k];
      setErrors(n);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h2
          className="font-display font-black text-2xl sm:text-3xl"
          style={{ color: "var(--color-ink)" }}
        >
          Shipping &amp; Contact
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--color-ink3)" }}>
          Where and how would you like to receive your order?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setReception("delivery")}
          className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
          style={{
            border: `1.5px solid ${reception === "delivery" ? "var(--color-accent)" : "var(--color-border)"}`,
            background:
              reception === "delivery"
                ? "var(--color-accent-bg)"
                : "var(--color-surface)",
          }}
        >
          <Truck
            size={18}
            style={{
              color:
                reception === "delivery"
                  ? "var(--color-accent)"
                  : "var(--color-ink3)",
            }}
          />
          <div>
            <p
              className="text-xs font-black"
              style={{
                color:
                  reception === "delivery"
                    ? "var(--color-accent)"
                    : "var(--color-ink)",
              }}
            >
              Delivery
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-ink4)" }}>
              To your address
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setReception("pickup")}
          className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
          style={{
            border: `1.5px solid ${reception === "pickup" ? "var(--color-accent)" : "var(--color-border)"}`,
            background:
              reception === "pickup"
                ? "var(--color-accent-bg)"
                : "var(--color-surface)",
          }}
        >
          <Store
            size={18}
            style={{
              color:
                reception === "pickup"
                  ? "var(--color-accent)"
                  : "var(--color-ink3)",
            }}
          />
          <div>
            <p
              className="text-xs font-black"
              style={{
                color:
                  reception === "pickup"
                    ? "var(--color-accent)"
                    : "var(--color-ink)",
              }}
            >
              Pickup
            </p>
            <p className="text-[10px]" style={{ color: "var(--color-ink4)" }}>
              On site, free
            </p>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          label="Full Name"
          required
          icon={User}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          error={errors.name}
          onClearError={() => clear("name")}
        />
        <TextField
          label="Phone"
          required
          icon={Phone}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (212) 555-1234"
          error={errors.phone}
          onClearError={() => clear("phone")}
        />
      </div>

      <TextField
        label="Email"
        required
        icon={Mail}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="john@example.com"
        error={errors.email}
        onClearError={() => clear("email")}
      />

      {reception === "delivery" && (
        <div className="flex flex-col gap-4 pt-1 animate-fade-up">
          <TextField
            label="Address"
            required
            icon={MapPin}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="132 Main Street"
            error={errors.address}
            onClearError={() => clear("address")}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="City"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="New York"
              error={errors.city}
              onClearError={() => clear("city")}
            />
            <TextField
              label="ZIP Code"
              required
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="10001"
              error={errors.zip}
              onClearError={() => clear("zip")}
            />
          </div>
          <TextField
            label="Country"
            required
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="US"
            error={errors.country}
            onClearError={() => clear("country")}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          className="text-[11px] font-black uppercase tracking-wider"
          style={{ color: "var(--color-ink3)" }}
        >
          Message (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-ink)",
            border: "1.5px solid var(--color-border2)",
          }}
          placeholder="Delivery instructions, personalization…"
        />
      </div>

      <div className="flex items-center justify-between mt-1 gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          icon={<ArrowLeft size={14} />}
        >
          Back
        </Button>
        <Button
          variant="accent"
          size="lg"
          onClick={onNext}
          iconRight={<ArrowRight size={15} />}
        >
          Continue to Payment
        </Button>
      </div>
    </div>
  );
}

/* ── Step 3: Payment ────────────────────────────────────────────── */
interface PaymentStepProps {
  cardNumber: string;
  setCardNumber: (v: string) => void;
  cardHolder: string;
  setCardHolder: (v: string) => void;
  cardExpiry: string;
  setCardExpiry: (v: string) => void;
  cardCvv: string;
  setCardCvv: (v: string) => void;
  errors: Record<string, string>;
  setErrors: (e: Record<string, string>) => void;
  paymentError: string | null;
  processing: boolean;
  total: number;
  currencySymbol: string;
  onBack: () => void;
  onPay: () => void;
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
  errors,
  setErrors,
  paymentError,
  processing,
  total,
  currencySymbol,
  onBack,
  onPay,
}: PaymentStepProps) {
  const clear = (k: string) => {
    if (errors[k]) {
      const n = { ...errors };
      delete n[k];
      setErrors(n);
    }
  };
  const previewDigits = cardNumber.replace(/\D/g, "").padEnd(16, "•");
  const previewGroups = [0, 1, 2, 3].map((i) =>
    previewDigits.slice(i * 4, i * 4 + 4),
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-up">
      <div>
        <h2
          className="font-display font-black text-2xl sm:text-3xl"
          style={{ color: "var(--color-ink)" }}
        >
          Payment
        </h2>
        <p
          className="text-sm mt-1 flex items-center gap-1.5"
          style={{ color: "var(--color-ink3)" }}
        >
          <Lock size={12} style={{ color: "var(--color-success)" }} /> Secured
          checkout
        </p>
      </div>

      {/* Live card preview */}
      <div
        className="relative w-full max-w-sm aspect-[1.6/1] rounded-[22px] p-5 flex flex-col justify-between text-white overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--color-ink), #2b211c)",
        }}
      >
        <div
          className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-20"
          style={{ background: "var(--color-accent)" }}
        />
        <div className="flex items-center justify-between relative z-10">
          <span className="font-display font-black text-sm">InstaWear</span>
          <CreditCard size={20} />
        </div>
        <div className="font-mono text-lg tracking-widest relative z-10">
          {previewGroups.join(" ")}
        </div>
        <div className="flex items-center justify-between text-xs relative z-10">
          <span className="uppercase opacity-80">
            {cardHolder || "CARD HOLDER"}
          </span>
          <span className="opacity-80">{cardExpiry || "MM/YY"}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 max-w-sm">
        <TextField
          label="Card Number"
          required
          icon={CreditCard}
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          placeholder="4242 4242 4242 4242"
          inputMode="numeric"
          error={errors.cardNumber}
          onClearError={() => clear("cardNumber")}
        />
        <TextField
          label="Cardholder Name"
          required
          icon={User}
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
          placeholder="John Doe"
          error={errors.cardHolder}
          onClearError={() => clear("cardHolder")}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Expiry"
            required
            value={cardExpiry}
            onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
            placeholder="MM/YY"
            inputMode="numeric"
            error={errors.cardExpiry}
            onClearError={() => clear("cardExpiry")}
          />
          <TextField
            label="CVV"
            required
            value={cardCvv}
            onChange={(e) =>
              setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="123"
            inputMode="numeric"
            error={errors.cardCvv}
            onClearError={() => clear("cardCvv")}
          />
        </div>
      </div>

      {paymentError && (
        <div
          className="flex items-start gap-2 p-3.5 rounded-2xl text-xs font-medium max-w-sm"
          style={{
            background: "var(--color-negative-bg)",
            color: "var(--color-negative)",
            border: "1px solid var(--color-negative)",
          }}
        >
          <AlertCircle size={15} className="shrink-0 mt-0.5" /> {paymentError}
        </div>
      )}

      <div className="flex items-center justify-between mt-1 gap-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={processing}
          icon={<ArrowLeft size={14} />}
        >
          Back
        </Button>
        <Button
          variant="accent"
          size="lg"
          onClick={onPay}
          loading={processing}
          icon={!processing ? <Lock size={13} /> : undefined}
        >
          {processing
            ? "Processing…"
            : `Pay ${total.toFixed(2)} ${currencySymbol}`}
        </Button>
      </div>
    </div>
  );
}

/* ── Step 4: Confirmation ───────────────────────────────────────── */
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
    <div className="flex flex-col items-center text-center gap-5 py-8 sm:py-12 animate-scale-in">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "var(--color-success-bg)" }}
      >
        <CheckCircle2 size={32} style={{ color: "var(--color-success)" }} />
      </div>
      <div>
        <h2
          className="font-display font-black text-2xl sm:text-3xl"
          style={{ color: "var(--color-ink)" }}
        >
          Order Confirmed
        </h2>
        <p
          className="text-sm mt-2 leading-relaxed max-w-sm"
          style={{ color: "var(--color-ink3)" }}
        >
          Your payment has been accepted. Your order is being sent to our print
          shop.
        </p>
      </div>

      <div
        className="w-full rounded-3xl p-5"
        style={{ background: "var(--color-surface2)" }}
      >
        <p
          className="text-[10px] font-black uppercase tracking-widest mb-2"
          style={{ color: "var(--color-ink3)" }}
        >
          Order Reference
        </p>
        <div className="flex items-center justify-center gap-3">
          <span
            className="font-mono font-black text-xl tracking-wider"
            style={{ color: "var(--color-accent)" }}
          >
            {orderId}
          </span>
          <button
            onClick={onCopy}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: copied
                ? "var(--color-success)"
                : "var(--color-surface)",
              color: copied ? "#fff" : "var(--color-ink2)",
              border: "1px solid var(--color-border)",
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        {copied && (
          <p
            className="text-[11px] mt-1.5 font-bold"
            style={{ color: "var(--color-success)" }}
          >
            Reference copied
          </p>
        )}
      </div>

      {email && (
        <p
          className="text-xs flex items-start gap-2 text-left"
          style={{ color: "var(--color-ink3)" }}
        >
          <Mail
            size={13}
            className="shrink-0 mt-0.5"
            style={{ color: "var(--color-accent)" }}
          />
          A confirmation has been sent to{" "}
          <strong style={{ color: "var(--color-ink2)" }}>{email}</strong>.
        </p>
      )}

      <Button variant="cta" size="lg" onClick={onClose} className="w-full mt-2">
        Back to Shop
      </Button>
    </div>
  );
}

/* ── Empty cart guard ───────────────────────────────────────────── */
function EmptyCartGuard({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-6"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="text-center max-w-xs">
        <p className="font-bold mb-1" style={{ color: "var(--color-ink)" }}>
          Your cart is empty
        </p>
        <p className="text-xs mb-5" style={{ color: "var(--color-ink3)" }}>
          Add some items before checking out.
        </p>
        <Button variant="cta" onClick={onClose}>
          Back to Shop
        </Button>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────── */
export default function CheckoutFlow({
  cart,
  currencySymbol,
  shippingCost: baseShippingCost,
  freeShippingThreshold,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onSubmitOrder,
  confirmModeOrderId,
}: CheckoutFlowProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (confirmModeOrderId) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
      navigator.clipboard.writeText(confirmModeOrderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    };
    return (
      <div
        className="fixed inset-0 z-70 flex items-center justify-center p-4"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="max-w-xl w-full mx-auto px-4 sm:px-6 py-10">
          <ConfirmationStep
            orderId={confirmModeOrderId}
            email=""
            copied={copied}
            onCopy={copy}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  const [step, setStep] = useState<StepId>(1);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reception, setReception] = useState<"pickup" | "delivery">("delivery");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("US");
  const [message, setMessage] = useState("");

  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0),
    [cart],
  );
  const shippingCost =
    reception === "pickup" || cartTotal >= freeShippingThreshold
      ? 0
      : baseShippingCost;
  const total = cartTotal + shippingCost;

  const validateContact = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required.";
    if (!phone.trim()) e.phone = "Phone number is required.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!EMAIL_REGEX.test(email)) e.email = "Invalid email format.";
    if (reception === "delivery") {
      if (!address.trim()) e.address = "Address is required.";
      if (!city.trim()) e.city = "City is required.";
      if (!zip.trim()) e.zip = "ZIP code is required.";
      if (!country.trim()) e.country = "Country is required.";
    }
    setErrors(e);
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

  const handlePay = async () => {
    if (!validatePayment()) return;
    setProcessing(true);
    setPaymentError(null);
    try {
      const result = await onSubmitOrder({
        name,
        phone,
        email,
        reception,
        address,
        city,
        zip,
        country,
        message,
      });
      setOrderId(result.orderId);
      setStep(4);
    } catch (err: any) {
      setPaymentError(
        err?.message ||
          "An error occurred while processing the payment. Please try again.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  if (cart.length === 0 && step !== 4)
    return <EmptyCartGuard onClose={onClose} />;

  return (
    <div
      className="fixed inset-0 z-70 flex flex-col"
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
            className="h-7 w-7 rounded-xl object-cover"
          />
          <span
            className="font-display font-black text-sm sm:text-base"
            style={{ color: "var(--color-ink)" }}
          >
            InstaWear
          </span>
          <span
            className="hidden sm:inline"
            style={{ color: "var(--color-ink4)" }}
          >
            /
          </span>
          <span
            className="text-xs sm:text-sm font-bold hidden sm:inline"
            style={{ color: "var(--color-ink2)" }}
          >
            Secure Checkout
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{
            border: "1px solid var(--color-border)",
            color: "var(--color-ink3)",
          }}
        >
          <X size={17} />
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
              onCopy={handleCopy}
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
                  errors={errors}
                  setErrors={setErrors}
                  paymentError={paymentError}
                  processing={processing}
                  total={total}
                  currencySymbol={currencySymbol}
                  onBack={goBack}
                  onPay={handlePay}
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
              threshold={freeShippingThreshold}
            />
          </div>
        )}
      </div>
    </div>
  );
}
