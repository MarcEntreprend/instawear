// src/constants/orderStatus.tsx

import React from "react";
import { CheckCircle2, Clock, Box, Truck, XCircle } from "lucide-react";

// Source unique de vérité pour le statut de commande — utilisée par
// AccountPage.tsx (historique client), OrderStatusStepper.tsx (composant
// partagé) et OrderTrackingModal.tsx (suivi public). Toute modification de
// libellé, couleur ou ordre des étapes ici se répercute partout.
export const ORDER_STATUS: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    step: number;
  }
> = {
  paid: {
    label: "Paid",
    icon: <CheckCircle2 size={12} strokeWidth={2} />,
    color: "#2563eb",
    bg: "#dbeafe",
    step: 0,
  },
  pending: {
    label: "Pending",
    icon: <Clock size={12} strokeWidth={2} />,
    color: "#d97706",
    bg: "#fef3c7",
    step: 1,
  },
  in_production: {
    label: "In Production",
    icon: <Box size={12} strokeWidth={2} />,
    color: "#7c3aed",
    bg: "#ede9fe",
    step: 2,
  },
  shipped: {
    label: "Shipped",
    icon: <Truck size={12} strokeWidth={2} />,
    color: "#059669",
    bg: "#d1fae5",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    icon: <CheckCircle2 size={12} strokeWidth={2} />,
    color: "#166534",
    bg: "#dcfce7",
    step: 4,
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle size={12} strokeWidth={2} />,
    color: "#991b1b",
    bg: "#fee2e2",
    step: -1,
  },
};

export const STATUS_STEPS = [
  "Paid",
  "Pending",
  "In Production",
  "Shipped",
  "Delivered",
];
