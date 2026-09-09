// src/pages/OrderSuccessPage.tsx — dedicated confirmation page after Stripe
// Always shows confirmation with order code and clears cart, never depends on fragile RPC
import { useEffect, useState, useRef } from "react";
import { CheckCircle2, Copy, Check, Mail } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { customerApi } from "../api/supabaseApi";

export default function OrderSuccessPage({
  orderId,
  onClose,
  onClearCart,
}: {
  orderId: string;
  onClose: () => void;
  onClearCart?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const hasRun = useRef(false);
  const clearCartRef = useRef(onClearCart);

  // Keep ref in sync with latest prop (but we only call it once)
  useEffect(() => {
    clearCartRef.current = onClearCart;
  }, [onClearCart]);

  // Always clear cart and fetch email on mount — best effort, never blocks UI
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // 1. Clear local cart immediately (via ref)
    if (clearCartRef.current) {
      try {
        clearCartRef.current();
      } catch {}
    }

    // 2. Clear server cart best-effort
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
          const { data: customerData } = await supabase
            .from("customers")
            .select("id")
            .eq("email", user.email)
            .maybeSingle();
          if (customerData) {
            await customerApi.clearCart(customerData.id);
          }
        }
      } catch (e) {
        console.warn("OrderSuccess: clear cart failed", e);
      }
    })();

    // Also try to get email from supabase session for display
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setEmail(session.user.email);
    });
  }, [orderId]); // only depends on orderId, not on onClearCart

  const handleCopy = () => {
    navigator.clipboard.writeText(orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="grain-overlay" />
      <header
        className="glass shrink-0 z-10 px-4 sm:px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/InstaWear-logo.png"
            alt="InstaWear"
            className="h-7 w-7 rounded-lg object-cover"
          />
          <span
            className="font-black text-sm sm:text-base"
            style={{ color: "var(--color-ink)" }}
          >
            InstaWear
          </span>
          <span className="text-(--color-ink4) hidden sm:inline">/</span>
          <span
            className="text-xs sm:text-sm font-bold hidden sm:inline"
            style={{ color: "var(--color-ink2)" }}
          >
            Order Confirmed
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
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
              <h2
                className="text-2xl font-black"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-serif)",
                }}
              >
                Order Confirmed
              </h2>
              <p
                className="text-sm mt-2 leading-relaxed max-w-sm"
                style={{ color: "var(--color-ink3)" }}
              >
                Your payment has been accepted. The order is being sent to our
                print shop.
              </p>
            </div>

            <div
              className="w-full rounded-2xl p-5"
              style={{ background: "var(--color-surface2)" }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-widest mb-2"
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
                  type="button"
                  onClick={handleCopy}
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

            <div
              className="w-full flex flex-col gap-2 text-left text-xs leading-relaxed"
              style={{ color: "var(--color-ink3)" }}
            >
              {email && (
                <p className="flex items-start gap-2">
                  <Mail
                    size={13}
                    strokeWidth={2}
                    className="shrink-0 mt-0.5"
                    style={{ color: "var(--color-accent)" }}
                  />
                  A confirmation has been sent to{" "}
                  <strong style={{ color: "var(--color-ink2)" }}>
                    {email}
                  </strong>
                  .
                </p>
              )}
              <p className="flex items-start gap-2">
                <CheckCircle2
                  size={13}
                  strokeWidth={2}
                  className="shrink-0 mt-0.5"
                  style={{ color: "var(--color-accent)" }}
                />
                Our team has been notified automatically of your order.
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2
                  size={13}
                  strokeWidth={2}
                  className="shrink-0 mt-0.5"
                  style={{ color: "var(--color-accent)" }}
                />
                You can track your order with the reference above.
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
        </div>
      </div>
    </div>
  );
}
