import React from "react";
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Home,
  XCircle,
} from "lucide-react";
import { ORDER_STATUS, STATUS_STEPS } from "../constants/orderStatus";

// ─── StatusPill (badge coloré) ────────────────────────────────────
export function StatusPill({ status }: { status: string }) {
  const st = ORDER_STATUS[status] || ORDER_STATUS.pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
      style={{ background: st.bg, color: st.color }}
    >
      {st.icon}
      {st.label}
    </span>
  );
}

// ─── OrderStatusStepper ──────────────────────────────────────────
interface OrderStatusStepperProps {
  status: string;
  className?: string;
}

// Icônes pour chaque étape
const STEP_ICONS: Record<string, React.ReactNode> = {
  Pending: <Clock size={14} strokeWidth={2.5} />,
  Paid: <CheckCircle2 size={14} strokeWidth={2.5} />,
  "In Production": <Package size={14} strokeWidth={2.5} />,
  Shipped: <Truck size={14} strokeWidth={2.5} />,
  Delivered: <Home size={14} strokeWidth={2.5} />,
};

export default function OrderStatusStepper({
  status,
  className,
}: OrderStatusStepperProps) {
  // Annulé → on affiche un message explicite
  if (status === "cancelled") {
    return (
      <div
        className={`card-premium rounded-3xl p-5 ${className || ""}`}
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-3 text-rose-600">
          <XCircle size={20} strokeWidth={2} />
          <span className="text-sm font-bold">Order cancelled</span>
        </div>
      </div>
    );
  }

  const st = ORDER_STATUS[status] || ORDER_STATUS.pending;

  return (
    <div
      className={`card-premium rounded-3xl p-5 ${className || ""}`}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Entête */}
      <div className="mb-4 flex items-center justify-between">
        <p
          className="text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ color: "var(--color-ink4)" }}
        >
          Suivi de commande
        </p>
        <StatusPill status={status} />
      </div>

      {/* Barre de progression */}
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, i) => {
          const reached = st.step >= i;
          const current = st.step === i;
          const isLast = i === STATUS_STEPS.length - 1;

          return (
            <React.Fragment key={step}>
              {/* Étape */}
              <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                {/* Cercle */}
                <div
                  className="relative flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300"
                  style={{
                    background: current
                      ? "var(--color-accent)"
                      : reached
                        ? "var(--color-ink4)"
                        : "var(--color-surface2)",
                    border: current
                      ? "2px solid var(--color-accent)"
                      : `2px solid ${reached ? "var(--color-ink4)" : "var(--color-border)"}`,
                    boxShadow: current
                      ? "0 0 0 4px var(--color-accent-bg)"
                      : "none",
                    animation: current
                      ? "pulse-ring 1.8s ease-out infinite"
                      : "none",
                    transform: current ? "scale(1.05)" : "scale(1)",
                  }}
                >
                  {reached ? (
                    <span className="text-white">
                      {STEP_ICONS[step] || (
                        <CheckCircle2 size={14} strokeWidth={2.5} />
                      )}
                    </span>
                  ) : (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: "var(--color-border)" }}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  className="text-[9px] font-semibold text-center leading-tight truncate max-w-17.5"
                  style={{
                    color: current
                      ? "var(--color-ink)"
                      : reached
                        ? "var(--color-ink4)"
                        : "var(--color-ink3)",
                  }}
                >
                  {step}
                </span>
              </div>

              {/* Ligne de connexion (sauf après la dernière étape) */}
              {!isLast && (
                <div
                  className="h-0.5 flex-1 rounded-full transition-all duration-500"
                  style={{
                    background:
                      st.step > i + 1
                        ? "var(--color-ink4)"
                        : st.step > i
                          ? "var(--color-accent)"
                          : "var(--color-border)",
                    height: "3px",
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
