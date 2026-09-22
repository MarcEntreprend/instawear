// src/admin/AdminSidebar.tsx

import React, { useState } from "react";
import {
  LayoutDashboard,
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
  Bell,
  MessageSquare,
  Mail,
  Truck,
  Sparkles,
  Activity,
  Wallet,
} from "lucide-react";
import { useAdminBadges } from "./useAdminBadges";
import {
  PLACEHOLDER_IMG,
  LOGO_URL,
  LOGO_SETTINGS_URL,
} from "../constants/assets";
import CartIcon from "../components/CartIcon";

export type AdminSection =
  | "dashboard"
  | "orders"
  | "notifications"
  | "shipped"
  | "products"
  | "customers"
  | "interactions"
  | "promotions"
  | "email-marketing"
  | "reports"
  | "monitoring"
  | "integrations"
  | "settings"
  | "admin-users"
  | "merchandising"
  | "finances"
  | "help";

interface NavItem {
  id: AdminSection;
  label: string;
  icon: React.FC<any>;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

// ─── Navigation UNIQUE (Vague D) ───────────────────────────────────────────
// UNE vérité d'ordre + libellés : groupes Pilotage / Catalogue & Clients /
// Marketing / Système (audit item 17). Ordre logique métier : Commandes →
// Expédiées → Finances (fini Finances entre Commandes et Notifications,
// fini Expédiées loin des Commandes). Francisé (Emails, Supervision).
// `help` intégrée au groupe Système (fini le bouton footer jamais actif).
// AUCUNE route supprimée : AdminSection inchangé, que du réarrangement.
// NAV_LABELS = source des titres (fil d'Ariane) : fini sidebar≠breadcrumb.
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "pilotage",
    label: "Pilotage",
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
      { id: "orders", label: "Commandes", icon: CartIcon },
      { id: "shipped", label: "Expédiées & Livrées", icon: Truck },
      { id: "finances", label: "Finances", icon: Wallet },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    id: "catalogue",
    label: "Catalogue & Clients",
    items: [
      { id: "products", label: "Produits", icon: Package },
      { id: "customers", label: "Clients", icon: Users },
      { id: "interactions", label: "Interactions", icon: MessageSquare },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    items: [
      { id: "promotions", label: "Promotions & Deals", icon: Tag },
      { id: "merchandising", label: "Merchandising", icon: Sparkles },
      { id: "email-marketing", label: "Emails", icon: Mail },
      { id: "reports", label: "Rapports", icon: BarChart3 },
    ],
  },
  {
    id: "systeme",
    label: "Système",
    items: [
      { id: "monitoring", label: "Supervision", icon: Activity },
      { id: "integrations", label: "Intégrations", icon: Link2 },
      { id: "settings", label: "Paramètres", icon: Settings },
      { id: "admin-users", label: "Sécurité", icon: Shield },
      { id: "help", label: "Aide & Support", icon: HelpCircle },
    ],
  },
];

export const NAV_LABELS: Record<AdminSection, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.label])),
) as Record<AdminSection, string>;

interface AdminSidebarProps {
  active: AdminSection;
  onNavigate: (s: AdminSection) => void;
  onClose?: () => void;
  mobile?: boolean;
}

/** Pastille de comptage nav (même gabarit que la pastille notifs). */
function NavCountBadge({
  count,
  title,
  alert = false,
}: {
  count: number;
  title: string;
  alert?: boolean;
}) {
  return (
    <span
      title={title}
      style={{
        background: alert ? "var(--color-accent)" : "var(--color-ink3)",
        color: alert ? "white" : "var(--color-bg)",
        borderRadius: 999,
        padding: "1px 7px",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.4,
      }}
    >
      {count}
    </span>
  );
}

export default function AdminSidebar({
  active,
  onNavigate,
  onClose,
  mobile,
}: AdminSidebarProps) {
  // Couleurs adaptatives selon le thème (clair / sombre)
  const bg = "var(--color-surface2)";
  const textMuted = "var(--color-ink3)";
  const textDim = "var(--color-ink4)";
  const borderColor = "var(--color-border)";
  const activeBg = "var(--color-accent-soft)";
  const activeText = "var(--color-accent)";
  // Compteurs partagés (un seul poller pour tout l'admin, cf.
  // useAdminBadges) : notifs + commandes en attente + mockups + critiques.
  const badges = useAdminBadges(true);
  const unreadCount = badges.unread;
  const urgentCount = badges.urgent;

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

      {/* Nav — UN seul CTA boutique (barre supérieure, "Voir la boutique") :
          ce bloc redondant (avec reload) est supprimé, Vague D. */}
      <nav
        aria-label="Navigation principale"
        style={{
          flex: 1,
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          overflowY: "auto",
        }}
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.id}>
            <p
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: textDim,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "10px 10px 4px",
                margin: 0,
              }}
            >
              {group.label}
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {group.items.map((item) => {
                const isActive = active === item.id;
                const Icon = item.icon;
                const isNotif = item.id === "notifications";
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        onNavigate(item.id);
                        if (mobile && onClose) onClose();
                      }}
                      aria-current={isActive ? "page" : undefined}
                      className={
                        isActive ? "admin-nav-btn active" : "admin-nav-btn"
                      }
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
                      <span
                        style={{
                          position: "relative",
                          display: "inline-flex",
                        }}
                      >
                        <Icon
                          size={16}
                          strokeWidth={isActive ? 2.2 : 1.8}
                          style={
                            isNotif && urgentCount > 0
                              ? {
                                  animation:
                                    "bell-shake 0.4s ease-in-out infinite",
                                  animationDelay: "2s",
                                  color: "var(--color-accent)",
                                }
                              : undefined
                          }
                        />
                        {isNotif && urgentCount > 0 && (
                          <span
                            style={{
                              position: "absolute",
                              top: -3,
                              right: -6,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--color-accent)",
                              border: "1.5px solid var(--color-surface2)",
                            }}
                          />
                        )}
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {isNotif && unreadCount > 0 && (
                        <span
                          title={
                            urgentCount > 0
                              ? `${urgentCount} urgente(s)`
                              : `${unreadCount} non lue(s)`
                          }
                          style={{
                            background:
                              urgentCount > 0
                                ? "var(--color-accent)"
                                : "var(--color-ink3)",
                            color:
                              urgentCount > 0 ? "white" : "var(--color-bg)",
                            borderRadius: 999,
                            padding: "1px 7px",
                            fontSize: 11,
                            fontWeight: 700,
                            lineHeight: 1.4,
                          }}
                        >
                          {unreadCount}
                        </span>
                      )}
                      {item.id === "orders" && badges.ordersPending > 0 && (
                        <NavCountBadge
                          count={badges.ordersPending}
                          title={`${badges.ordersPending} commande(s) en attente`}
                        />
                      )}
                      {item.id === "products" && badges.mockupsOpen > 0 && (
                        <NavCountBadge
                          count={badges.mockupsOpen}
                          title={`${badges.mockupsOpen} mockup(s) en file ou en cours`}
                        />
                      )}
                      {item.id === "monitoring" &&
                        badges.criticalErrors > 0 && (
                          <NavCountBadge
                            count={badges.criticalErrors}
                            title={`${badges.criticalErrors} erreur(s) critique(s) non résolue(s)`}
                            alert
                          />
                        )}
                      {isActive && !isNotif && (
                        <ChevronRight
                          size={13}
                          strokeWidth={2}
                          style={{ color: "var(--color-ink4)" }}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — help vit dans la nav (groupe Système, avec état actif) :
          fini le bouton footer jamais actif. */}
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
      </div>
    </aside>
  );
}
