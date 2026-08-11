// src/components/ui/Button.tsx

import React from "react";
import { Loader2 } from "lucide-react";

type Variant = "cta" | "accent" | "outline" | "ghost" | "indigo";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidthOnMobile?: boolean;
}

const sizeMap: Record<Size, string> = {
  sm: "text-xs px-4 py-2 gap-1.5",
  md: "text-xs sm:text-sm px-5 py-3 gap-2",
  lg: "text-sm px-7 py-4 gap-2.5",
};

export function Button({
  variant = "cta",
  size = "md",
  loading = false,
  icon,
  iconRight,
  fullWidthOnMobile = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-bold uppercase tracking-wider rounded-full transition-all duration-200 select-none " +
    "hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0";

  const variants: Record<Variant, React.CSSProperties> = {
    cta: { background: "var(--color-cta-bg)", color: "var(--color-cta-ink)" },
    accent: {
      background:
        "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
      color: "#fff",
      boxShadow: "var(--shadow-accent)",
    },
    indigo: {
      background:
        "linear-gradient(135deg, var(--color-indigo), var(--color-indigo2))",
      color: "#fff",
      boxShadow: "var(--shadow-indigo)",
    },
    outline: {
      background: "transparent",
      color: "var(--color-ink)",
      border: "1.5px solid var(--color-border2)",
    },
    ghost: {
      background: "var(--color-surface2)",
      color: "var(--color-ink2)",
    },
  };

  return (
    <button
      className={`${base} ${sizeMap[size]} ${fullWidthOnMobile ? "w-full sm:w-auto" : ""} ${className}`}
      style={variants[variant]}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        icon && <span className="shrink-0 flex items-center">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && iconRight && (
        <span className="shrink-0 flex items-center">{iconRight}</span>
      )}
    </button>
  );
}

export function IconButton({
  active,
  className = "",
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 hover:-translate-y-0.5 ${className}`}
      style={{
        color: active ? "var(--color-accent)" : "var(--color-ink2)",
        background: active ? "var(--color-accent-bg)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background =
            "var(--color-surface2)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Chip({
  active,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className="shrink-0 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all duration-200"
      style={{
        background: active ? "var(--color-cta-bg)" : "var(--color-surface2)",
        color: active ? "var(--color-cta-ink)" : "var(--color-ink3)",
        border: `1.5px solid ${active ? "var(--color-cta-bg)" : "var(--color-border)"}`,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
