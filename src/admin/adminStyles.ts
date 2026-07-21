// src/admin/adminStyles.ts
// Styles partagés par toutes les pages admin — évite les doublons
// Importer avec : import { card, input } from "./adminStyles";

import React from "react";

// ─── Petit bouton d'action ──────────────────────────────────────────────
export const iconBtn: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: 6,
  cursor: "pointer",
  color: "var(--color-ink2)",
  display: "flex",
  alignItems: "center",
};

// ─── Layout ─────────────────────────────────────────────────────────────
export const centerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 200,
};

export const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
};

// ─── Titres ─────────────────────────────────────────────────────────────
export const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "var(--color-ink)",
  marginBottom: 2,
};

// ─── Recherche ──────────────────────────────────────────────────────────
export const searchBarStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 14,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  maxWidth: 400,
};

export const inputStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  outline: "none",
  flex: 1,
  fontSize: 13,
  color: "var(--color-ink)",
  fontFamily: "var(--font-body)",
};

export const clearBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--color-ink4)",
  padding: 0,
};

// ─── Tableau ────────────────────────────────────────────────────────────
export const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
  borderRadius: 16,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
};

export const theadStyle: React.CSSProperties = {
  background: "var(--color-surface2)",
  fontWeight: 700,
  color: "var(--color-ink2)",
};

export const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  whiteSpace: "nowrap",
};

export const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  verticalAlign: "middle",
};

// ─── Éléments réutilisables ─────────────────────────────────────────────
export const avatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "var(--color-accent)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: 13,
  flexShrink: 0,
};

export const backBtnStyle: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  padding: 8,
  cursor: "pointer",
  color: "var(--color-ink2)",
  display: "flex",
  alignItems: "center",
};

export const tabBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "var(--font-body)",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "color 0.18s, border-color 0.18s",
  whiteSpace: "nowrap",
};

export const tabCountStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "var(--color-accent-soft)" : "var(--color-surface2)",
  color: active ? "var(--color-accent)" : "var(--color-ink4)",
  borderRadius: 999,
  padding: "1px 7px",
  fontSize: 10,
  fontWeight: 700,
});

// ─── Cartes ─────────────────────────────────────────────────────────────
export const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  overflow: "hidden",
};

// ─── Images ─────────────────────────────────────────────────────────────
export const miniImgStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  overflow: "hidden",
  background: "var(--color-surface2)",
  flexShrink: 0,
};

export const imgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

// ─── Divers ─────────────────────────────────────────────────────────────
export const colorSwatchStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: "50%",
  border: "1px solid var(--color-border)",
  display: "inline-block",
};

export const totalRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  padding: "14px 20px",
  borderTop: "1px solid var(--color-border)",
  fontWeight: 700,
  fontSize: 14,
  color: "var(--color-ink)",
  gap: 8,
};
