// src/admin/emailMarketing/constants.ts
import React from "react";
import { Loader2, CheckCircle2, AlertCircle, Calendar, Edit3 } from "lucide-react";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";

export const STATUS_META: Record<CampaignStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft: { label: "Brouillon", color: "var(--color-ink4)", bg: "var(--color-surface2)", icon: <Edit3 size={11} strokeWidth={2} /> },
  scheduled: { label: "Programmée", color: "#d97706", bg: "#fef3c7", icon: <Calendar size={11} strokeWidth={2} /> },
  sending: { label: "En cours", color: "#2563eb", bg: "#dbeafe", icon: <Loader2 size={11} strokeWidth={2} /> },
  sent: { label: "Envoyée", color: "var(--color-emerald)", bg: "var(--color-success-bg)", icon: <CheckCircle2 size={11} strokeWidth={2} /> },
  failed: { label: "Échouée", color: "#991b1b", bg: "#fee2e2", icon: <AlertCircle size={11} strokeWidth={2} /> },
};