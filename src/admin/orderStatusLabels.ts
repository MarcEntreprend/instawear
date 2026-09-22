// src/admin/orderStatusLabels.ts
// Source unique des libellés FR + couleurs des 10 statuts commande côté admin.
// Remplace les copies divergentes (OrdersPage, AdminDashboardNew,
// CustomersPage — `paid` et `partial` manquaient dans 2 d'entre elles et
// tombaient en badge gris "brut"). Toute modification ici se répercute
// partout : listes, détail, dashboard, fiches clients.
//
// Règles métier canoniques (Vague B item 6/8) :
// - "En attente" = ORDER_PENDING_STATUSES (badges + listes + dashboard).
// - CA net = isRevenueOrder (pending/cancelled/refunded/returned exclus ;
//   partial compte PLEIN = encaissé partiel, jamais "des deux côtés").
// - Vue expéditions = SHIPPED_VIEW_STATUSES (partial inclus : 1er colis).
// Palette volontairement DISTINCTE par statut (fini les 3 verts + 3 ambres
// confusables) : ambre → attente, sarcelle → payée, bleu → production,
// orange → partielle, indigo → expédiée, vert → livrée, ardoise → pause.

import React from "react";
import AdminBadge from "./ui/AdminBadge";

export const ORDER_STATUS_LABEL: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "En attente", color: "#92400e", bg: "#fef3c7" },
  paid: { label: "Payée", color: "#0f766e", bg: "#ccfbf1" },
  in_production: { label: "En production", color: "#1e40af", bg: "#dbeafe" },
  shipped: { label: "Expédiée", color: "#4338ca", bg: "#e0e7ff" },
  delivered: { label: "Livrée", color: "#166534", bg: "#dcfce7" },
  cancelled: { label: "Annulée", color: "#991b1b", bg: "#fee2e2" },
  on_hold: { label: "En pause", color: "#475569", bg: "#f1f5f9" },
  refunded: { label: "Remboursée", color: "#4c1d95", bg: "#ede9fe" },
  returned: { label: "Retournée", color: "#9f1239", bg: "#ffe4e6" },
  partial: { label: "Partielle", color: "#c2410c", bg: "#ffedd5" },
};

/** "En attente" (badge sidebar + listes + dashboard) : status=pending seul. */
export const ORDER_PENDING_STATUSES: readonly string[] = ["pending"];

export function isPendingOrder(status: unknown): boolean {
  return (
    typeof status === "string" && ORDER_PENDING_STATUSES.includes(status)
  );
}

/**
 * Statuts SANS revenu (ni encaissé ni conservé) : paniers en attente,
 * annulées, remboursées, retournées. Tout le reste (paid, in_production,
 * partial, shipped, delivered, on_hold) compte plein — partial = encaissé
 * partiel, pas "des deux côtés".
 */
export const NON_REVENUE_STATUSES: readonly string[] = [
  "pending",
  "cancelled",
  "refunded",
  "returned",
];

export function isRevenueOrder(status: unknown): boolean {
  return (
    typeof status === "string" && !NON_REVENUE_STATUSES.includes(status)
  );
}

/** CA net partagé (dashboard + rapports) : somme des commandes à revenu. */
export function sumRevenue(
  orders: Array<{ status: string; totalAmount: number }>,
): number {
  return (orders ?? []).reduce(
    (sum, o) => sum + (isRevenueOrder(o?.status) ? o.totalAmount || 0 : 0),
    0,
  );
}

/** Vue expéditions : colis en route ou arrivés (partial = 1er colis posé). */
export const SHIPPED_VIEW_STATUSES: readonly string[] = [
  "shipped",
  "partial",
  "delivered",
];

export function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS_LABEL[status] ?? {
    label: status,
    color: "#555",
    bg: "#f3f4f6",
  };
  // Géométrie via AdminBadge (Vague C2 : pastille unique).
  return React.createElement(AdminBadge, {
    color: s.color,
    bg: s.bg,
    children: s.label,
  });
}
