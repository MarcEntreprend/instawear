//src\admin\AdminDashboardNew.tsx
//
import React, { useState, useCallback } from "react";
import {
  Menu,
  X,
  ArrowLeft,
  Package,
  Users,
  ShoppingBag,
  Wifi,
  WifiOff,
  TrendingUp,
  Activity,
  ChevronRight,
} from "lucide-react";
import AdminSidebar, { AdminSection } from "./AdminSidebar";
import ProductsPage from "./ProductsPage.tsx";
import CustomersPage from "./CustomersPage";
import OrdersPage from "./OrdersPage";
import PromotionsPage from "./PromotionsPage";
import ReportsPage from "./ReportsPage";
import IntegrationsPage from "./IntegrationsPage";
import HelpPage from "./HelpPage";
import SettingsPage from "./SettingsPage";
import AdminUsersPage from "./AdminUsersPage";
import { useDashboard } from "./adminHooks";
import { Order } from "./adminTypes";

interface AdminDashboardProps {
  onReturnToStore: () => void;
}

// ─── Status badge helper ──────────────────────────────────────────────────
const ORDER_STATUS_LABEL: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "En attente", color: "#92400e", bg: "#fef3c7" },
  in_production: { label: "En production", color: "#1e40af", bg: "#dbeafe" },
  shipped: { label: "Expédiée", color: "#065f46", bg: "#d1fae5" },
  delivered: { label: "Livrée", color: "#166534", bg: "#dcfce7" },
  cancelled: { label: "Annulée", color: "#991b1b", bg: "#fee2e2" },
};

function OrderStatusBadge({ status }: { status: string }) {
  const s = ORDER_STATUS_LABEL[status] ?? {
    label: status,
    color: "#555",
    bg: "#f3f4f6",
  };
  return (
    <span
      style={{
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? "var(--color-accent)" : "var(--color-surface)",
        border: accent ? "none" : "1px solid var(--color-border)",
        borderRadius: 18,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: accent ? "var(--shadow-accent)" : "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: accent
            ? "rgba(255,255,255,0.18)"
            : "var(--color-surface2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accent ? "white" : "var(--color-accent)",
        }}
      >
        {icon}
      </div>
      <div>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: accent ? "rgba(255,255,255,0.7)" : "var(--color-ink3)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            marginBottom: 4,
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: accent ? "white" : "var(--color-ink)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </p>
        {sub && (
          <p
            style={{
              fontSize: 11,
              color: accent ? "rgba(255,255,255,0.6)" : "var(--color-ink4)",
              marginTop: 4,
            }}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard Home ───────────────────────────────────────────────────────
function DashboardHome({
  onNavigate,
}: {
  onNavigate: (s: AdminSection) => void;
}) {
  const { data: stats, loading } = useDashboard();

  const IMG =
    "https://cdn.pixabay.com/photo/2026/01/26/22/44/cat-10089737_1280.png";

  if (loading || !stats) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
        }}
      >
        <div
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-accent)",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Quick actions */}
      <div
        style={{
          background: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          padding: "20px 22px",
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: 14,
            color: "var(--color-ink)",
            marginBottom: 14,
            letterSpacing: "-0.02em",
          }}
        >
          Actions rapides
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            { label: "+ Nouveau produit", section: "products" as AdminSection },
            { label: "Voir les commandes", section: "orders" as AdminSection },
            {
              label: "Gérer les clients",
              section: "customers" as AdminSection,
            },
            {
              label: "Configurer Printful",
              section: "settings" as AdminSection,
            },
          ].map((a) => (
            <button
              key={a.section}
              onClick={() => onNavigate(a.section)}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "1.5px solid var(--color-border2)",
                background: "var(--color-surface)",
                color: "var(--color-ink2)",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                transition: "background 0.18s, border-color 0.18s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--color-accent)";
                e.currentTarget.style.color = "white";
                e.currentTarget.style.borderColor = "var(--color-accent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--color-surface)";
                e.currentTarget.style.color = "var(--color-ink2)";
                e.currentTarget.style.borderColor = "var(--color-border2)";
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--color-ink)",
            letterSpacing: "-0.04em",
            marginBottom: 4,
          }}
        >
          Bonjour 👋
        </h1>

        <p style={{ fontSize: 13.5, color: "var(--color-ink3)" }}>
          Voici un aperçu de votre boutique InstaWear aujourd'hui.
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          icon={<Package size={17} strokeWidth={2} />}
          label="Produits en ligne"
          value={stats.productsOnline}
          sub={`${stats.productsOffline} masqués`}
          accent={true}
        />
        <StatCard
          icon={<Users size={17} strokeWidth={2} />}
          label="Clients"
          value={stats.totalCustomers}
          sub="comptes enregistrés"
        />
        <StatCard
          icon={<ShoppingBag size={17} strokeWidth={2} />}
          label="Commandes aujourd'hui"
          value={stats.ordersToday}
          sub="nouvelles commandes"
        />
        <StatCard
          icon={<TrendingUp size={17} strokeWidth={2} />}
          label="CA estimé"
          value={`${stats.revenueEstimate.toFixed(0)} $`}
          sub="toutes commandes"
        />
        <StatCard
          icon={
            stats.podConnected ? (
              <Wifi size={17} strokeWidth={2} />
            ) : (
              <WifiOff size={17} strokeWidth={2} />
            )
          }
          label="Connexion POD"
          value={stats.podConnected ? "Connecté" : "Déconnecté"}
          sub={stats.podConnected ? "Printful actif" : "Configurer l'API"}
        />
      </div>

      {/* Recent orders + recent products */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
        className="admin-two-col"
      >
        {/* Recent orders */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--color-ink)",
                letterSpacing: "-0.02em",
              }}
            >
              Dernières commandes
            </h3>
            <button
              onClick={() => onNavigate("orders")}
              style={{
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-ink2)",
                cursor: "pointer",
              }}
            >
              Voir tout
            </button>
          </div>
          <div style={{ padding: "0 0 8px" }}>
            {stats.recentOrders.map((order: Order) => (
              <div
                key={order.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "11px 20px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "var(--color-ink)",
                    }}
                  >
                    {order.id}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--color-ink3)",
                      marginTop: 1,
                    }}
                  >
                    {order.clientName ?? order.clientEmail}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "var(--color-ink)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {order.totalAmount.toFixed(2)} $
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            ))}
            {stats.recentOrders.length === 0 && (
              <p
                style={{
                  padding: "20px",
                  fontSize: 13,
                  color: "var(--color-ink4)",
                  textAlign: "center",
                }}
              >
                Aucune commande pour l'instant.
              </p>
            )}
          </div>
        </div>

        {/* Recent products */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "var(--shadow-xs)",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--color-ink)",
                letterSpacing: "-0.02em",
              }}
            >
              Produits récents
            </h3>
            <button
              onClick={() => onNavigate("products")}
              style={{
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--color-ink2)",
                cursor: "pointer",
              }}
            >
              Gérer
            </button>
          </div>
          <div style={{ padding: "0 0 8px" }}>
            {stats.recentProducts.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 20px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "var(--color-surface2)",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={p.image || IMG}
                    alt={p.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--color-ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.title}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--color-ink3)",
                      marginTop: 1,
                    }}
                  >
                    {p.price.toFixed(2)} $
                  </p>
                </div>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: p.isActive
                      ? "var(--color-success)"
                      : "var(--color-ink4)",
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Main AdminDashboard ──────────────────────────────────────────────────
export default function AdminDashboard({
  onReturnToStore,
}: AdminDashboardProps) {
  const [navStack, setNavStack] = useState<AdminSection[]>(["dashboard"]);
  const section = navStack[navStack.length - 1];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navigate = useCallback((s: AdminSection) => {
    setNavStack((prev) => [...prev, s]);
    setMobileNavOpen(false);
  }, []);

  // Go back to previous section (or do nothing if at root)
  const goBack = useCallback(() => {
    setNavStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const SECTION_TITLES: Record<AdminSection, string> = {
    dashboard: "Tableau de bord",
    orders: "Commandes",
    products: "Produits",
    customers: "Clients",
    promotions: "Promotions & Deals",
    reports: "Rapports",
    integrations: "Intégrations",
    settings: "Paramètres",
    "admin-users": "Sécurité",
    help: "Aide & Support",
  };

  return (
    <div
      style={{
        display: "flex",
        height: "calc(100vh - 0px)",
        minHeight: "100dvh",
        background: "var(--color-bg)",
        position: "fixed",
        inset: 0,
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {/* Desktop sidebar */}
      <div className="admin-sidebar-desktop">
        <AdminSidebar active={section} onNavigate={navigate} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileNavOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
          }}
        >
          <div
            style={{
              background: "rgba(26,20,10,0.5)",
              position: "absolute",
              inset: 0,
              backdropFilter: "blur(3px)",
            }}
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            style={{
              position: "relative",
              zIndex: 201,
              width: 260,
              flexShrink: 0,
              height: "100%",
            }}
          >
            <AdminSidebar
              active={section}
              onNavigate={navigate}
              onClose={() => setMobileNavOpen(false)}
              mobile
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Top bar */}
        <div
          style={{
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexShrink: 0,
          }}
        >
          {/* Mobile hamburger */}
          <button
            className="admin-hamburger"
            onClick={() => setMobileNavOpen(true)}
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: 7,
              cursor: "pointer",
              color: "var(--color-ink2)",
              display: "none",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <Menu size={17} strokeWidth={2} />
          </button>

          <div
            style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}
          >
            {navStack.length > 1 && (
              <button
                onClick={goBack}
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "5px 8px",
                  cursor: "pointer",
                  color: "var(--color-ink2)",
                  display: "flex",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <ArrowLeft size={14} strokeWidth={2} />
              </button>
            )}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "var(--color-ink3)",
                flexWrap: "wrap",
              }}
            >
              {navStack.map((s, i) => (
                <React.Fragment key={`${s}-${i}`}>
                  {i > 0 && (
                    <ChevronRight
                      size={12}
                      strokeWidth={2}
                      style={{ color: "var(--color-ink4)", flexShrink: 0 }}
                    />
                  )}
                  {i === navStack.length - 1 ? (
                    <span
                      style={{
                        fontWeight: 700,
                        color: "var(--color-ink)",
                        fontSize: 15,
                      }}
                    >
                      {SECTION_TITLES[s]}
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        setNavStack((prev) => prev.slice(0, i + 1))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-ink3)",
                        fontWeight: 500,
                        fontSize: 13,
                        textDecoration: "underline",
                        textUnderlineOffset: 3,
                        padding: 0,
                      }}
                    >
                      {SECTION_TITLES[s]}
                    </button>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <button
            onClick={onReturnToStore}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              borderRadius: 10,
              border: "1.5px solid var(--color-border2)",
              background: "var(--color-surface)",
              color: "var(--color-ink2)",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 12.5,
              cursor: "pointer",
              transition: "background 0.18s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--color-surface2)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--color-surface)")
            }
          >
            <ArrowLeft size={14} strokeWidth={2} />
            <span className="admin-back-label">Voir la boutique</span>
          </button>
        </div>

        {/* Page content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "28px 28px",
          }}
          className="admin-content-scroll"
        >
          {section === "dashboard" && <DashboardHome onNavigate={navigate} />}
          {section === "products" && <ProductsPage />}
          {section === "customers" && <CustomersPage />}
          {section === "orders" && <OrdersPage />}
          {section === "promotions" && <PromotionsPage />}
          {section === "reports" && <ReportsPage />}
          {section === "integrations" && <IntegrationsPage />}
          {section === "settings" && <SettingsPage />}
          {section === "admin-users" && <AdminUsersPage />}
          {section === "help" && <HelpPage />}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .admin-sidebar-desktop { display: flex !important; height: 100%; }
          .admin-hamburger { display: none !important; }
        }
        @media (max-width: 899px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-hamburger { display: flex !important; }
          .admin-back-label { display: none; }
          .admin-content-scroll { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
