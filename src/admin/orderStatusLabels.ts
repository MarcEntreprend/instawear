// src/admin/orderStatusLabels.ts
// Source unique des libellés FR + couleurs des 10 statuts commande côté admin.
// Remplace les 3 copies divergentes (OrdersPage, AdminDashboardNew,
// CustomersPage — `paid` et `partial` manquaient dans 2 d'entre elles et
// tombaient en badge gris "brut"). Toute modification ici se répercute
// partout : listes, détail, dashboard, fiches clients.

import React from "react";

export const ORDER_STATUS_LABEL: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "En attente", color: "#92400e", bg: "#fef3c7" },
  paid: { label: "Payée", color: "#065f46", bg: "#d1fae5" },
  in_production: { label: "En production", color: "#1e40af", bg: "#dbeafe" },
  shipped: { label: "Expédiée", color: "#065f46", bg: "#d1fae5" },
  delivered: { label: "Livrée", color: "#166534", bg: "#dcfce7" },
  cancelled: { label: "Annulée", color: "#991b1b", bg: "#fee2e2" },
  on_hold: { label: "En pause", color: "#92400e", bg: "#fef3c7" },
  refunded: { label: "Remboursée", color: "#4c1d95", bg: "#ede9fe" },
  returned: { label: "Retournée", color: "#9f1239", bg: "#ffe4e6" },
  partial: { label: "Partielle", color: "#b45309", bg: "#fef3c7" },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS_LABEL[status] ?? {
    label: status,
    color: "#555",
    bg: "#f3f4f6",
  };
  return React.createElement(
    "span",
    {
      style: {
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        whiteSpace: "nowrap",
        lineHeight: 1.4,
      },
    },
    s.label,
  );
}
