// src/components/ToastContainer.tsx

/**
 * ToastContainer – Système de notifications avec file d'attente
 * Supporte les types : success, error, info, warning
 * Icônes, barre de progression, bouton de fermeture
 */
import React, { useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  text: string;
  type: ToastType;
  duration?: number; // ms, défaut 4500
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

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleRemove = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const duration = toast.duration ?? 4500;
    timerRef.current = window.setTimeout(handleRemove, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleRemove, toast.duration]);

  return (
    <div
      className={`animate-fade-up flex items-start gap-3 p-4 rounded-xl shadow-lg border max-w-sm w-full transition-all duration-300 ${
        exiting ? "opacity-0 translate-x-4" : "opacity-100"
      }`}
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
      <p
        className="flex-1 text-sm font-medium leading-snug"
        style={{ color: "var(--color-ink)" }}
      >
        {toast.text}
      </p>
      <button
        onClick={handleRemove}
        className="shrink-0 p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        style={{ color: "var(--color-ink4)" }}
      >
        <X size={14} strokeWidth={2} />
      </button>
      {/* Barre de progression */}
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

export default function ToastContainer({
  toasts,
  onRemove,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-55 flex flex-col gap-3"
      style={{ maxWidth: "380px" }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
