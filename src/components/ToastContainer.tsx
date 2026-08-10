// src/components/ToastContainer.tsx

/**
 * ToastContainer – Système de notification
 * Types : success, error, info, warning
 * Icônes, barre de progression CSS, bouton de fermeture
 */
import React, { useState, useEffect, useRef } from "react";
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

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: number) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<number | null>(null);
  const removeTimerRef = useRef<number | null>(null);

  // Fonction de suppression propre
  const handleRemove = () => {
    // Annuler tous les timers en cours
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (removeTimerRef.current) {
      clearTimeout(removeTimerRef.current);
      removeTimerRef.current = null;
    }
    // Déclencher l'animation de sortie
    setExiting(true);
    // Après l'animation, supprimer du DOM
    removeTimerRef.current = window.setTimeout(() => {
      onRemove(toast.id);
    }, 300);
  };

  useEffect(() => {
    const duration = toast.duration ?? 4500;
    // Timer pour la fermeture automatique
    timerRef.current = window.setTimeout(() => {
      handleRemove();
    }, duration);

    // Déclencher la barre de progression après le montage
    // Un petit délai pour que la transition soit prise en compte
    const progressTimer = setTimeout(() => {
      setProgress(0);
    }, 50);

    return () => {
      clearTimeout(progressTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, [toast.duration]);

  return (
    <div
      className={`relative flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-sm transition-all duration-300 max-w-sm w-full ${
        exiting
          ? "opacity-0 translate-x-4 scale-95"
          : "opacity-100 translate-x-0 scale-100"
      }`}
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Icône */}
      <span
        className="shrink-0 mt-0.5"
        style={{ color: COLOR_MAP[toast.type] }}
      >
        {ICON_MAP[toast.type]}
      </span>

      {/* Message */}
      <p
        className="flex-1 text-sm font-medium leading-snug"
        style={{ color: "var(--color-ink)" }}
      >
        {toast.text}
      </p>

      {/* Bouton fermer */}
      <button
        onClick={handleRemove}
        className="shrink-0 p-0.5 rounded-full transition-colors hover:bg-(--color-surface2)"
        style={{ color: "var(--color-ink4)" }}
      >
        <X size={14} strokeWidth={2} />
      </button>

      {/* Barre de progression avec transition CSS sur la largeur */}
      <div
        className="absolute bottom-0 left-0 h-1 rounded-b-2xl"
        style={{
          width: `${progress}%`,
          background: COLOR_MAP[toast.type],
          opacity: 0.5,
          transition: `width ${toast.duration ?? 4500}ms linear`,
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
      className="fixed bottom-6 left-6 z-100 flex flex-col gap-3"
      style={{ maxWidth: "380px" }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}
