// src/admin/AdminDashboardNew.tsx
import React, { useState, useCallback, useEffect } from "react";
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
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  RefreshCw,
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
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { useDashboard } from "./adminHooks";
import ProductQuickViewModal from "./ProductQuickViewModal";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";
import { orderApi, dashboardApi } from "../api/supabaseApi";
import { AdminProduct, Order, DashboardStats } from "./adminTypes";

interface AdminDashboardProps {
  onReturnToStore: () => void;
}

// ─── Status badge ──────────────────────────────────────────────────────────
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

// ─── Stat card  ─────────
function StatCard({
  icon,
  label,
  value,
  sub,
  delta,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  delta?: { value: number; positive: boolean } | null;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? "var(--color-accent)" : "var(--color-surface)",
        border: accent ? "none" : "1px solid var(--color-border)",
        borderRadius: 16,
        padding: 20,
        boxShadow: accent ? "var(--shadow-accent)" : "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          color: accent ? "white" : "var(--color-accent)",
          marginBottom: 12,
        }}
      >
        {icon}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <p
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: accent ? "white" : "var(--color-ink)",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </p>
        {delta && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: delta.positive ? "var(--color-success)" : "#ef4444",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            {delta.positive ? (
              <ArrowUpRight size={14} strokeWidth={2.5} />
            ) : (
              <ArrowDownRight size={14} strokeWidth={2.5} />
            )}
            {delta.value}%
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: 12,
          color: accent ? "rgba(255,255,255,0.7)" : "var(--color-ink3)",
          marginTop: 6,
        }}
      >
        {label}
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
  );
}

// ─── Skeleton loading ──────────────────────────────────────────────────────
function SkeletonDashboard() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div className="skeleton" style={{ height: 60, borderRadius: 16 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="skeleton"
            style={{ height: 120, borderRadius: 16 }}
          />
        ))}
      </div>
      <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    </div>
  );
}

// ─── Graphique 30 jours amélioré ───────────────────────────────────────────
function OrdersChart() {
  const [data, setData] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    day: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    import("../api/supabaseApi").then(({ dashboardApi }) => {
      dashboardApi
        .getOrdersByDay(30)
        .then(setData)
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading) {
    return (
      <div
        className="skeleton"
        style={{
          height: 160,
          borderRadius: 16,
          background: "var(--color-surface)",
        }}
      />
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: "20px 22px",
        boxShadow: "var(--shadow-sm)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
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
          Commandes par jour (30 derniers jours)
        </h3>
        <span style={{ fontSize: 11, color: "var(--color-ink4)" }}>
          Total : {data.reduce((sum, d) => sum + d.count, 0)}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          height: 120,
          maxWidth: "100%",
          overflowX: "auto",
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        {data.map((d) => (
          <div
            key={d.date}
            style={{
              flex: 1,
              minWidth: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTooltip({
                day: d.date,
                count: d.count,
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
              });
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${(d.count / maxCount) * 100}%`,
                background:
                  d.count > 0 ? "var(--color-accent)" : "var(--color-border)",
                borderRadius: "2px 2px 0 0",
                transition: "height 0.2s ease",
                minHeight: d.count > 0 ? 4 : 2,
                cursor: "pointer",
              }}
            />
          </div>
        ))}
      </div>
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
            background: "var(--color-ink)",
            color: "var(--color-bg)",
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            pointerEvents: "none",
            zIndex: 500,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {new Date(tooltip.day).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          })}{" "}
          : {tooltip.count} commande{tooltip.count > 1 ? "s" : ""}
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
          fontSize: 10,
          color: "var(--color-ink4)",
        }}
      >
        <span>{data[0]?.date?.split("-").slice(1, 3).join("/")}</span>
        <span>
          {data[data.length - 1]?.date?.split("-").slice(1, 3).join("/")}
        </span>
      </div>
    </div>
  );
}

// ─── Dashboard Home ───────────────────────────────────────────────────────
function DashboardHome({
  onNavigate,
  onQuickView,
}: {
  onNavigate: (s: AdminSection) => void;
  onQuickView?: (product: AdminProduct) => void;
}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const s = await dashboardApi.getStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const currencySymbol = useCurrencySymbol();

  // Deltas réels (comparaison avec hier pour les commandes)
  const [yesterdayOrders, setYesterdayOrders] = useState<number | null>(null);

  useEffect(() => {
    import("../api/supabaseApi").then(({ dashboardApi }) => {
      dashboardApi.getOrdersByDay(2).then((data) => {
        if (data.length >= 2) {
          const yesterdayData = data[data.length - 2];
          setYesterdayOrders(yesterdayData.count);
        }
      });
    });
  }, []);

  if (loading || !stats) {
    return <SkeletonDashboard />;
  }

  const ordersDelta =
    yesterdayOrders !== null && yesterdayOrders > 0
      ? {
          value: Math.abs(
            Math.round(
              ((stats.ordersToday - yesterdayOrders) / yesterdayOrders) * 100,
            ),
          ),
          positive: stats.ordersToday >= yesterdayOrders,
        }
      : yesterdayOrders === 0 && stats.ordersToday > 0
        ? { value: 100, positive: true }
        : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--color-ink)",
              letterSpacing: "-0.03em",
            }}
          >
            Bonjour
          </h1>
          <button
            onClick={fetchStats}
            title="Rafraîchir les statistiques"
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "4px 8px",
              cursor: "pointer",
              color: "var(--color-ink2)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <RefreshCw size={14} strokeWidth={2} />
          </button>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--color-ink3)", marginTop: 4 }}>
          Aperçu de votre boutique InstaWear aujourd'hui.
        </p>
      </div>

      {/* Actions rapides */}
      <div
        style={{
          background: "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: "16px 20px",
        }}
      >
        <h3
          style={{
            fontWeight: 700,
            fontSize: 13,
            color: "var(--color-ink2)",
            marginBottom: 12,
            letterSpacing: "-0.01em",
          }}
        >
          Actions rapides
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
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
                padding: "7px 14px",
                borderRadius: 8,
                border: "1px solid var(--color-border2)",
                background: "var(--color-surface)",
                color: "var(--color-ink2)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
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

      {/* Commandes en attente (alerte) */}
      {(() => {
        const pendingOrders = stats.recentOrders.filter(
          (o) => o.status === "pending",
        );
        if (pendingOrders.length === 0) return null;
        const handleMoveToProduction = async (orderId: string) => {
          await orderApi.updateStatus(orderId, "in_production");
          window.location.reload();
        };
        return (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 16,
              padding: "16px 20px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: "#92400e",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Clock size={16} strokeWidth={2} />
                {pendingOrders.length} commande
                {pendingOrders.length > 1 ? "s" : ""} en attente
              </h3>
              <button
                onClick={() => onNavigate("orders")}
                style={{
                  background: "white",
                  border: "1px solid #fcd34d",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#92400e",
                  cursor: "pointer",
                }}
              >
                Voir tout
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingOrders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "white",
                    borderRadius: 10,
                    border: "1px solid #fde68a",
                  }}
                >
                  <div>
                    <button
                      onClick={() => onNavigate("orders")}
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "var(--color-ink)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        textDecoration: "underline",
                        textUnderlineOffset: 3,
                      }}
                    >
                      {order.id}
                    </button>
                    <p style={{ fontSize: 11, color: "var(--color-ink3)" }}>
                      {order.clientName ??
                        order.clientEmail ??
                        "Client inconnu"}{" "}
                      – {order.totalAmount.toFixed(2)} {currencySymbol}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMoveToProduction(order.id)}
                    style={{
                      background: "var(--color-accent)",
                      border: "none",
                      color: "white",
                      padding: "5px 12px",
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Package size={14} strokeWidth={2} />
                    En production
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Statistiques principales */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          icon={<Package size={20} strokeWidth={2} />}
          label="Produits en ligne"
          value={stats.productsOnline}
          sub={`${stats.productsOffline} masqués`}
          accent={true}
        />
        <StatCard
          icon={<Users size={20} strokeWidth={2} />}
          label="Clients"
          value={stats.totalCustomers}
          sub="comptes enregistrés"
        />
        <StatCard
          icon={<ShoppingBag size={20} strokeWidth={2} />}
          label="Commandes aujourd'hui"
          value={stats.ordersToday}
          sub="nouvelles commandes"
          delta={ordersDelta}
        />
        <StatCard
          icon={<TrendingUp size={20} strokeWidth={2} />}
          label="CA estimé"
          value={`${stats.revenueEstimate.toFixed(0)} ${currencySymbol}`}
          sub="toutes commandes"
        />
        <StatCard
          icon={
            stats.podConnected ? (
              <Wifi size={20} strokeWidth={2} />
            ) : (
              <WifiOff size={20} strokeWidth={2} />
            )
          }
          label="Connexion POD"
          value={stats.podConnected ? "Connecté" : "Déconnecté"}
          sub={stats.podConnected ? "Printful actif" : "Configurer l'API"}
        />
      </div>

      {/* Graphique commandes 30 jours */}
      <OrdersChart />

      {/* Dernières commandes & Produits récents */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
        className="admin-two-col"
      >
        {/* Dernières commandes */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "var(--color-ink)",
                letterSpacing: "-0.01em",
              }}
            >
              Dernières commandes
            </h3>
            <button
              onClick={() => onNavigate("orders")}
              style={{
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                padding: "3px 10px",
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
                  padding: "10px 20px",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div>
                  <button
                    onClick={() => onNavigate("orders")}
                    style={{
                      fontWeight: 700,
                      fontSize: 12.5,
                      color: "var(--color-ink)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: 0,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    {order.id}
                  </button>
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
                    {order.totalAmount.toFixed(2)} {currencySymbol}
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

        {/* Produits récents */}
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: "var(--color-ink)",
                letterSpacing: "-0.01em",
              }}
            >
              Produits récents
            </h3>
            <button
              onClick={() => onNavigate("products")}
              style={{
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                borderRadius: 6,
                padding: "3px 10px",
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
                <button
                  onClick={() => onQuickView?.(p)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "var(--color-surface2)",
                    flexShrink: 0,
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={p.image || PLACEHOLDER_IMG}
                    alt={p.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <button
                    onClick={() => onQuickView?.(p)}
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "var(--color-ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: 0,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    {p.title}
                  </button>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--color-ink3)",
                      marginTop: 1,
                    }}
                  >
                    {p.price.toFixed(2)} {currencySymbol}
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

// ─── Main AdminDashboard (inchangé) ──────────────────────────────────────
export default function AdminDashboard({
  onReturnToStore,
}: AdminDashboardProps) {
  const [navStack, setNavStack] = useState<AdminSection[]>(["dashboard"]);
  const section = navStack[navStack.length - 1];
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<AdminProduct | null>(
    null,
  );

  // Remplace le dernier élément de la stack au lieu d'empiler (évite l'historique infini)
  const navigate = useCallback((s: AdminSection) => {
    setNavStack((prev) => {
      if (prev.length <= 1) return [...prev, s]; // depuis le dashboard, on push normalement
      return [...prev.slice(0, -1), s]; // sinon on remplace la page courante
    });
    setMobileNavOpen(false);
  }, []);

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
      <div className="admin-sidebar-desktop">
        <AdminSidebar
          active={section}
          onNavigate={navigate}
          onReturnToStore={onReturnToStore}
        />
      </div>

      {mobileNavOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex" }}
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
              onReturnToStore={onReturnToStore}
            />
          </div>
        </div>
      )}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
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
            onClick={() => {
              onReturnToStore();
              window.location.reload();
            }}
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

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "28px 28px",
            scrollbarGutter: "stable",
          }}
          className="admin-content-scroll"
        >
          {section === "dashboard" && (
            <DashboardHome
              onNavigate={navigate}
              onQuickView={setQuickViewProduct}
            />
          )}
          {section === "products" && <ProductsPage />}
          {section === "customers" && (
            <CustomersPage
              onNavigate={navigate}
              onQuickView={setQuickViewProduct}
            />
          )}
          {section === "orders" && <OrdersPage />}
          {section === "promotions" && <PromotionsPage />}
          {section === "reports" && <ReportsPage />}
          {section === "integrations" && <IntegrationsPage />}
          {section === "settings" && <SettingsPage />}
          {section === "admin-users" && <AdminUsersPage />}
          {section === "help" && <HelpPage />}
        </div>
      </div>

      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

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
