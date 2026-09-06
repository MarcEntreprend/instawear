// src/components/ToastContainer.tsx

/**
 * ToastContainer – Notification queue system
 * Supports types: success, error, info, warning
 * Icons, progress bar, close button.
 * - Auto-dismiss après `duration` (défaut 4500ms, erreurs 6000ms).
 * - Action optionnelle : toast cliquable (ex. "View cart" → ouvre le panier),
 *   avec indice visuel ; le X ferme sans déclencher l'action.
 */
import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X, ArrowRight } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  text: string;
  type: ToastType;
  duration?: number; // ms — défaut 4500 (6000 pour error/warning)
  action?: ToastAction;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

const ICON_MAP: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} strokeWidth={2.5} />,
  error: <XCircle size={18} strokeWidth={2.5} />,
  warning: <AlertCircle size={18} strokeWidth={2.5} />,
  info: <Info size={18} strokeWidth={2.5} />,
};

const COLOR_MAP: Record<ToastType, string> = {
  success: "var(--color-success)",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "var(--color-accent)",
};

const BG_MAP: Record<ToastType, string> = {
  success: "var(--color-success-bg)",
  error: "#fef2f2",
  warning: "#fffbeb",
  info: "var(--color-accent-bg)",
};

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4500,
  info: 4500,
  warning: 6000,
  error: 6000,
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const onRemoveRef = useRef(onRemove);
  onRemoveRef.current = onRemove;

  // Auto-dismiss garanti : un seul timer, cleanup stricte, pas de dépendance
  // à des callbacks recréés (cause d'annulations silencieuses en StrictMode).
  useEffect(() => {
    const ms = toast.duration ?? DEFAULT_DURATION[toast.type];
    const t = window.setTimeout(() => {
      setExiting(true);
      window.setTimeout(() => onRemoveRef.current(toast.id), 300);
    }, ms);
    return () => window.clearTimeout(t);
  }, [toast.id, toast.type, toast.duration]);

  const handleAction = () => {
    toast.action?.onClick();
    setExiting(true);
    window.setTimeout(() => onRemoveRef.current(toast.id), 250);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExiting(true);
    window.setTimeout(() => onRemoveRef.current(toast.id), 250);
  };

  const clickable = !!toast.action;

  return (
    <div
      onClick={clickable ? handleAction : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleAction();
              }
            }
          : undefined
      }
      title={clickable ? toast.action!.label : undefined}
      className={`animate-fade-up flex items-start gap-3 p-4 rounded-xl shadow-lg border max-w-sm w-full transition-all duration-300 ${
        exiting ? "opacity-0 translate-x-4" : "opacity-100"
      } ${clickable ? "cursor-pointer hover:-translate-y-0.5" : ""}`}
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <span
        style={{ color: COLOR_MAP[toast.type], flexShrink: 0, marginTop: 1 }}
      >
        {ICON_MAP[toast.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium leading-snug"
          style={{ color: "var(--color-ink)" }}
        >
          {toast.text}
        </p>
        {clickable && (
          <span
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold"
            style={{ color: "var(--color-accent)" }}
          >
            {toast.action!.label} <ArrowRight size={12} strokeWidth={2.5} />
          </span>
        )}
      </div>
      <button
        onClick={handleClose}
        aria-label="Dismiss"
        className="shrink-0 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        style={{ color: "var(--color-ink4)" }}
      >
        <X size={14} strokeWidth={2} />
      </button>
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-1 rounded-b-xl"
        style={{
          width: "100%",
          background: COLOR_MAP[toast.type],
          opacity: 0.3,
        }}
      />
    </div>
  );
}

export const MAX_TOASTS = 4;

export default function ToastContainer({
  toasts,
  onRemove,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 left-6 z-100 flex flex-col gap-3"
      style={{ maxWidth: "380px" }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
