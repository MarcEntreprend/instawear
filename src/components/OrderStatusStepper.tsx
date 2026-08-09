// src/components/OrderStatusStepper.tsx

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { ORDER_STATUS, STATUS_STEPS } from "../constants/orderStatus";

// StatusPill — petit badge coloré (utilisé dans les listes de commandes,
// à la fois dans AccountPage.tsx et potentiellement ailleurs). Extrait ici
// pour ne plus être dupliqué.
export function StatusPill({ status }: { status: string }) {
  const st = ORDER_STATUS[status] || ORDER_STATUS.pending;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold"
      style={{ background: st.bg, color: st.color }}
    >
      {st.icon} {st.label}
    </span>
  );
}

interface OrderStatusStepperProps {
  status: string;
  className?: string;
}

// OrderStatusStepper — barre de progression horizontale à 5 étapes
// (Paid → Pending → In Production → Shipped → Delivered), extraite telle
// quelle depuis AccountPage.tsx (OrderDetail) pour être réutilisée à
// l'identique dans OrderTrackingModal.tsx (suivi public par référence de
// commande). Ne rend rien si la commande est annulée, comme avant.
export default function OrderStatusStepper({
  status,
  className,
}: OrderStatusStepperProps) {
  if (status === "cancelled") return null;
  const st = ORDER_STATUS[status] || ORDER_STATUS.pending;

  return (
    <div
      className={`rounded-2xl p-4 ${className || ""}`}
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p
          className="text-[12px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--color-ink4)" }}
        >
          Order Status
        </p>
        <StatusPill status={status} />
      </div>
      <div className="flex items-center gap-0">
        {STATUS_STEPS.map((step, i) => {
          const reached = st.step >= i;
          const current = st.step === i;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300"
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
                      ? "0 0 0 3px var(--color-accent-bg)"
                      : "none",
                    animation: current
                      ? "pulse-ring 1.8s ease-out infinite"
                      : "none",
                  }}
                >
                  {reached ? (
                    <CheckCircle2
                      size={13}
                      strokeWidth={2.5}
                      style={{ color: "white" }}
                    />
                  ) : (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: "var(--color-border)" }}
                    />
                  )}
                </div>
                <span
                  className="text-[9px] font-semibold text-center leading-tight whitespace-nowrap"
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
              {i < STATUS_STEPS.length - 1 && (
                <div
                  className="mx-1 h-0.5 flex-1 rounded-full transition-all duration-500"
                  style={{
                    background:
                      st.step > i + 1
                        ? "var(--color-ink4)"
                        : st.step > i
                          ? "var(--color-accent)"
                          : "var(--color-border)",
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
