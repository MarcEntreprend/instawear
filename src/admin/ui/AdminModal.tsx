// src/admin/ui/AdminModal.tsx
// Coquille modale UNIQUE (Vague C1) : fini les 8 implémentations (z
// 200/250/300, 2 fonds). zIndex 300 partout, fond + blur uniques,
// fermeture overlay + Escape, scroll-lock du body.
// Tailles : sm 480 / md 720 / lg 900 (largeur max, 92% viewport).
import React, { useEffect } from "react";
import { X } from "lucide-react";

export type AdminModalSize = "sm" | "md" | "lg";

export interface AdminModalProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  size?: AdminModalSize;
  /** Clic fond = fermer (défaut true). */
  closeOnOverlay?: boolean;
  /** Touche Escape = fermer (défaut true). */
  closeOnEscape?: boolean;
  /** zIndex (défaut 300 ; monter si modale au-dessus d'une modale). */
  zIndex?: number;
}

const MAX_WIDTH: Record<AdminModalSize, number> = {
  sm: 480,
  md: 720,
  lg: 900,
};

export default function AdminModal({
  title,
  onClose,
  children,
  size = "md",
  closeOnOverlay = true,
  closeOnEscape = true,
  zIndex = 300,
}: AdminModalProps) {
  useEffect(() => {
    if (!closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(26,20,10,0.5)",
        backdropFilter: "blur(4px)",
        padding: 16,
      }}
      onClick={() => {
        if (closeOnOverlay) onClose();
      }}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: 20,
          maxWidth: MAX_WIDTH[size],
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 28,
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: 4,
              cursor: "pointer",
              color: "var(--color-ink2)",
              display: "flex",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
