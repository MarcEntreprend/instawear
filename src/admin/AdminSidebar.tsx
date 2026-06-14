// src\admin\AdminSidebar.tsx

import React from "react";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  Settings,
  Shield,
  X,
  ChevronRight,
  Zap,
} from "lucide-react";

export type AdminSection =
  | "dashboard"
  | "products"
  | "customers"
  | "orders"
  | "settings"
  | "admin-users";

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.FC<{ size?: number; strokeWidth?: number }>;
  badge?: string | number;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "products", label: "Produits", icon: Package },
  { id: "customers", label: "Clients", icon: Users },
  { id: "orders", label: "Commandes", icon: ShoppingBag },
  { id: "settings", label: "Paramètres", icon: Settings },
  { id: "admin-users", label: "Administrateurs", icon: Shield },
];

const LOGO_URL = "/InstaWear-logo-settings.png";

interface AdminSidebarProps {
  active: AdminSection;
  onNavigate: (s: AdminSection) => void;
  onClose?: () => void;
  mobile?: boolean;
}

export default function AdminSidebar({
  active,
  onNavigate,
  onClose,
  mobile = false,
}: AdminSidebarProps) {
  return (
    <aside
      style={{
        width: mobile ? "100%" : 240,
        background: "var(--color-ink)",
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
          borderBottom: "1px solid rgba(255,255,255,0.07)",
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
              border: "1.5px solid rgba(255,255,255,0.15)",
            }}
          >
            <img
              src={LOGO_URL}
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
                color: "white",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              InstaWear
            </p>
            <p
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
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
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              color: "rgba(255,255,255,0.6)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Live indicator */}
      <div
        style={{
          padding: "10px 14px",
          margin: "12px 12px 0",
          borderRadius: 10,
          background: "rgba(232,76,30,0.12)",
          border: "1px solid rgba(232,76,30,0.2)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--color-accent)",
            flexShrink: 0,
            boxShadow: "0 0 0 3px rgba(232,76,30,0.25)",
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
      </div>

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
            color: "rgba(255,255,255,0.28)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "6px 10px 4px",
          }}
        >
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
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
                background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                color: isActive ? "white" : "rgba(255,255,255,0.5)",
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
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "rgba(255,255,255,0.85)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.5)";
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
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
              )}
              {item.badge !== undefined && (
                <span
                  style={{
                    background: "var(--color-accent)",
                    color: "white",
                    borderRadius: 999,
                    padding: "1px 7px",
                    fontSize: 10,
                    fontWeight: 800,
                    lineHeight: 1.6,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <p
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.25)",
            lineHeight: 1.6,
          }}
        >
          InstaWear Admin v1.0
          <br />© 2026 — Tous droits réservés
        </p>
      </div>
    </aside>
  );
}
