// src/admin/ui/AdminEmpty.tsx
// État vide admin UNIQUE (Vague C2) : fini les 4 composants locaux
// (CustomersPage EmptyState, NotificationsPage EmptyState,
// EmailMarketingPage EmptyPlaceholder, ReportsPage EmptySection) + les
// textes "Aucun…" ad hoc. Carte pointillée + icône + titre + sous-texte +
// action optionnelle. Rendu sûr dans un <td> comme dans une page.
import React from "react";
import AdminButton from "./AdminButton";

export interface AdminEmptyProps {
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
}

export default function AdminEmpty({ icon, title, sub, action }: AdminEmptyProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "40px 24px",
        borderRadius: 16,
        border: "1px dashed var(--color-border)",
        textAlign: "center",
        color: "var(--color-ink3)",
      }}
    >
      {icon && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--color-surface2)",
            color: "var(--color-ink4)",
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-ink2)" }}>
        {title}
      </div>
      {sub && <div style={{ fontSize: 12 }}>{sub}</div>}
      {action && (
        <AdminButton variant="secondary" onClick={action.onClick}>
          {action.label}
        </AdminButton>
      )}
    </div>
  );
}
