// src/admin/ui/infoStyles.ts
// Styles des modales "lexique" (Vague C1) : ReportInfoModal et
// MerchandisingInfoModal définissaient les 6 MÊMES objets. Une seule copie.
// Zéro dépendance (importable en node/tests).
import type { CSSProperties } from "react";

export const infoSectionStyle: CSSProperties = {
  marginBottom: 24,
};

export const infoTitleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 15,
  color: "var(--color-ink)",
  marginBottom: 10,
  paddingBottom: 6,
  borderBottom: "1px solid var(--color-border)",
};

export const infoTableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 12,
  color: "var(--color-ink2)",
};

export const infoThStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  background: "var(--color-surface2)",
  fontWeight: 700,
  color: "var(--color-ink3)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  borderBottom: "1px solid var(--color-border)",
};

export const infoTdStyle: CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--color-border)",
  verticalAlign: "top",
  lineHeight: 1.5,
};

export const infoNoteStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--color-ink4)",
  marginTop: 12,
  lineHeight: 1.6,
};
