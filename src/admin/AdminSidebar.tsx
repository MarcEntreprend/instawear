// src/admin/AdminSidebar.tsx

import React from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Tag,
  BarChart3,
  Link2,
  Settings,
  Shield,
  X,
  HelpCircle,
  ChevronRight,
  Zap,
} from "lucide-react";
import {
  PLACEHOLDER_IMG,
  LOGO_URL,
  LOGO_SETTINGS_URL,
} from "../constants/assets";

export type AdminSection =
  | "dashboard"
  | "orders"
  | "products"
  | "customers"
  | "promotions"
  | "reports"
  | "integrations"
  | "settings"
  | "admin-users"
  | "help";

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.FC<{ size?: number; strokeWidth?: number }>;
}

const NAV_ITEMS: (NavItem | "separator")[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "orders", label: "Commandes", icon: ShoppingBag },
  { id: "products", label: "Produits", icon: Package },
  { id: "customers", label: "Clients", icon: Users },
  { id: "promotions", label: "Promotions & Deals", icon: Tag },
  { id: "reports", label: "Rapports", icon: BarChart3 },
  "separator",
  { id: "integrations", label: "Intégrations", icon: Link2 },
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "admin-users", label: "Sécurité", icon: Shield },
];

interface AdminSidebarProps {
  active: AdminSection;
  onNavigate: (s: AdminSection) => void;
  onClose?: () => void;
  mobile?: boolean;
  onReturnToStore?: () => void;
}

export default function AdminSidebar({
  active,
  onNavigate,
  onClose,
  mobile,
  onReturnToStore,
}: AdminSidebarProps) {
  // Couleurs adaptatives selon le thème (clair / sombre)
  const bg = "var(--color-surface2)";
  const textMuted = "var(--color-ink3)";
  const textDim = "var(--color-ink4)";
  const borderColor = "var(--color-border)";
  const activeBg = "var(--color-accent-soft)";
  const activeText = "var(--color-accent)";
  const hoverBg = "var(--color-surface)";
  const hoverText = "var(--color-ink)";

  return (
    <aside
      style={{
        width: mobile ? "100%" : 240,
        background: bg,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: `1px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              overflow: "hidden",
              flexShrink: 0,
              border: `1.5px solid ${borderColor}`,
            }}
          >
            <img
              src={LOGO_SETTINGS_URL}
              alt="InstaWear"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
          <div>
            <p
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: "var(--color-ink)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              InstaWear
            </p>
            <p
              style={{
                fontSize: 10,
                color: textMuted,
                marginTop: 2,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Admin Studio
            </p>
          </div>
        </div>
        {mobile && onClose && (
          <button
            onClick={onClose}
            style={{
              background: "var(--color-surface)",
              border: "none",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              color: textMuted,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Live indicator */}
      <button
        onClick={() => {
          onReturnToStore?.();
          window.location.reload();
        }}
        style={{
          padding: "10px 14px",
          margin: "12px 12px 0",
          borderRadius: 10,
          background: "var(--color-accent-soft)",
          border: "1px solid var(--color-accent-soft2)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "calc(100% - 24px)",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--color-accent)",
            flexShrink: 0,
            boxShadow: "0 0 0 3px rgba(255,92,53,0.25)",
            animation: "pulse-ring 1.8s ease-out infinite",
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-accent)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Boutique en ligne
        </span>
        <Zap
          size={10}
          style={{ color: "var(--color-accent)", marginLeft: "auto" }}
          strokeWidth={2.5}
        />
      </button>

      {/* Nav */}
      <nav
        style={{
          flex: 1,
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        <p
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: textDim,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "6px 10px 4px",
          }}
        >
          Navigation
        </p>
        {NAV_ITEMS.map((item, i) => {
          if (item === "separator") {
            return (
              <div
                key={`sep-${i}`}
                style={{
                  height: 1,
                  background: borderColor,
                  margin: "8px 10px",
                }}
              />
            );
          }
          const isActive = active === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (mobile && onClose) onClose();
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 10,
                border: "none",
                background: isActive ? activeBg : "transparent",
                color: isActive ? activeText : textMuted,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13.5,
                textAlign: "left",
                transition: "background 0.18s, color 0.18s",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = hoverBg;
                  e.currentTarget.style.color = hoverText;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = textMuted;
                }
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 3,
                    height: 20,
                    borderRadius: "0 2px 2px 0",
                    background: "var(--color-accent)",
                  }}
                />
              )}
              <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {isActive && (
                <ChevronRight
                  size={13}
                  strokeWidth={2}
                  style={{ color: "var(--color-ink4)" }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer avec bouton Help */}
      <div
        style={{
          padding: "10px 14px",
          borderTop: `1px solid ${borderColor}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            fontSize: 9,
            color: textDim,
            lineHeight: 1.4,
            flex: 1,
            margin: 0,
          }}
        >
          InstaWear Admin v1.0
          <br />© 2026 — Tous droits réservés
        </p>
        <button
          onClick={() => onNavigate("help")}
          title="Aide & Support"
          style={{
            background: "var(--color-surface)",
            border: "none",
            borderRadius: 8,
            width: 28,
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: textMuted,
          }}
        >
          <HelpCircle size={16} strokeWidth={2} />
        </button>
      </div>
    </aside>
  );
}
