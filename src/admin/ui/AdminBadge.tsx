// src/admin/ui/AdminBadge.tsx
// Pastille admin UNIQUE (Vague C2) : fini les ~44 spans radius:999 recodés
// (paddings 3/10 vs 2/10 vs 2/8, fontSize 11 vs 10, uppercase ou non).
// Les MAPS restent du domaine (ORDER_STATUS_LABEL, STATUS_META, ROLE_BADGE…)
// — ici seule la géométrie est unifiée.
// - md (défaut) : 3px 10px / 11px — OrderStatusBadge, tickets, rôles.
// - sm : 2px 8px / 10px — badges produit compacts.
import React from "react";

export interface AdminBadgeProps {
  color: string;
  bg: string;
  children: React.ReactNode;
  size?: "sm" | "md";
  uppercase?: boolean;
  /** Variante bordure (ex. pastille "Vous") : 1px solid var(--color-border). */
  bordered?: boolean;
  title?: string;
  style?: React.CSSProperties;
}

export default function AdminBadge({
  color,
  bg,
  children,
  size = "md",
  uppercase = false,
  bordered = false,
  title,
  style,
}: AdminBadgeProps) {
  return (
    <span
      title={title}
      style={{
        display: "inline-block",
        padding: size === "sm" ? "2px 8px" : "3px 10px",
        borderRadius: 999,
        fontSize: size === "sm" ? 10 : 11,
        fontWeight: 700,
        color,
        background: bg,
        whiteSpace: "nowrap",
        lineHeight: 1.4,
        ...(bordered ? { border: "1px solid var(--color-border)" } : null),
        ...(uppercase
          ? { textTransform: "uppercase", letterSpacing: "0.04em" }
          : null),
        ...style,
      }}
    >
      {children}
    </span>
  );
}
