// src/admin/ui/AdminButton.tsx
// Bouton admin UNIQUE (Vague C1) : fini primary/secondary 1px-vs-1.5px
// dispersés et le danger #991b1b recodé à chaque fois.
// - primary : action principale (fond accent, texte blanc).
// - secondary : action neutre (fond surface2, bordure).
// - danger : action destructive (fond #991b1b, texte blanc).
// - ghost : texte seul (transparent, texte accent).
// `style` fusionne PAR-DESSUS (échappatoire, pas la norme).
import React from "react";

export type AdminButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost";

export interface AdminButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant;
}

const BASE: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 18px",
  borderRadius: 10,
  fontWeight: 700,
  fontSize: 13,
  fontFamily: "var(--font-body)",
  cursor: "pointer",
  transition: "opacity 0.15s, transform 0.05s",
  whiteSpace: "nowrap",
};

const VARIANTS: Record<AdminButtonVariant, React.CSSProperties> = {
  primary: {
    background: "var(--color-accent)",
    color: "white",
    border: "none",
  },
  secondary: {
    background: "var(--color-surface2)",
    color: "var(--color-ink2)",
    border: "1px solid var(--color-border)",
  },
  danger: {
    background: "#991b1b",
    color: "white",
    border: "none",
  },
  ghost: {
    background: "transparent",
    color: "var(--color-accent)",
    border: "none",
    fontWeight: 600,
  },
};

export default function AdminButton({
  variant = "secondary",
  disabled,
  style,
  children,
  ...rest
}: AdminButtonProps) {
  return (
    <button
      disabled={disabled}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...(disabled ? { opacity: 0.55, cursor: "not-allowed" } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
