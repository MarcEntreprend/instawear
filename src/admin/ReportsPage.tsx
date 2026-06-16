// src/admin/ReportsPage.tsx
import React, { useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Eye,
  ShoppingBag,
  Wifi,
  WifiOff,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useDashboard } from "./adminHooks";

// ─── Composant de barre de progression ────────────────────────────────────
function ProgressBar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <span
        style={{
          fontSize: 13,
          width: 100,
          color: "var(--color-ink2)",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 10,
          borderRadius: 5,
          background: "var(--color-surface2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 5,
            background: color,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--color-ink)",
          minWidth: 40,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ─── Carte de statistique avec delta ────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: { value: number; positive: boolean } | null;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ color: "var(--color-accent)", marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <p
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--color-ink)",
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
      <p style={{ fontSize: 12, color: "var(--color-ink3)", marginTop: 6 }}>
        {label}
      </p>
    </div>
  );
}

// ─── Section vide ──────────────────────────────────────────────────────────
function EmptySection({ message }: { message: string }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: 24,
        color: "var(--color-ink4)",
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────
export default function ReportsPage() {
  // Récupération des données réelles depuis le dashboard hook
  const { data: stats, loading } = useDashboard();

  // Préparer les données pour les KPI (utiliser les stats si disponibles)
  const revenue = stats ? `${stats.revenueEstimate.toFixed(0)} $` : "0 $";
  const ordersCount = stats ? stats.ordersToday : 0; // Idéalement total des commandes, mais le hook ne donne que "today". On utilise un mock pour l'exemple.
  const totalCustomers = stats ? stats.totalCustomers : 0;
  const averageBasket =
    stats?.revenueEstimate && ordersCount > 0
      ? (stats.revenueEstimate / ordersCount).toFixed(2) + " $"
      : "0.00 $";

  // Catégories simulées (à remplacer par des données réelles plus tard)
  const categorySales = [
    { label: "T-Shirts", pct: 45, color: "var(--color-accent)" },
    { label: "Hoodies", pct: 30, color: "#f59e0b" },
    { label: "Accessoires", pct: 15, color: "#10b981" },
    { label: "Mugs", pct: 10, color: "#6366f1" },
  ];

  // Produits les plus vendus (mock – à connecter à une requête groupée sur order_items)
  const topProducts = [
    { name: "T-Shirt Rio Carnival", orders: 28, revenue: "839,72 $" },
    { name: "Hoodie UCL Finals", orders: 22, revenue: "1 209,78 $" },
    { name: "Casquette Olympics", orders: 18, revenue: "359,82 $" },
    { name: "T-Shirt Coachella", orders: 15, revenue: "419,85 $" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* En-tête avec période et export */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--color-ink)",
              marginBottom: 4,
            }}
          >
            Rapports
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            Analysez vos ventes, vos clients et la performance de vos produits.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--color-ink4)" }}>
            Derniers 30 jours
          </span>
          <button style={textBtn}>
            <FileText size={14} /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Indicateurs clés */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          icon={<DollarSign size={20} strokeWidth={2} />}
          label="CA Total"
          value={revenue}
          delta={{ value: 8, positive: true }}
        />
        <StatCard
          icon={<ShoppingBag size={20} strokeWidth={2} />}
          label="Commandes (total)"
          value={ordersCount.toString()}
          delta={{ value: 12, positive: true }}
        />
        <StatCard
          icon={<Users size={20} strokeWidth={2} />}
          label="Clients uniques"
          value={totalCustomers.toString()}
          delta={{ value: 5, positive: true }}
        />
        <StatCard
          icon={<TrendingUp size={20} strokeWidth={2} />}
          label="Panier moyen"
          value={averageBasket}
          delta={{ value: 3, positive: false }}
        />
      </div>

      {/* Graphique des tendances (placeholder amélioré) */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3
            style={{ fontWeight: 700, fontSize: 15, color: "var(--color-ink)" }}
          >
            Évolution du CA et des commandes
          </h3>
          <div style={{ display: "flex", gap: 6 }}>
            {["7j", "30j", "3m", "1a"].map((period) => (
              <button
                key={period}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--color-border)",
                  background:
                    period === "30j" ? "var(--color-accent)" : "transparent",
                  color: period === "30j" ? "white" : "var(--color-ink3)",
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        <div
          style={{
            height: 160,
            display: "flex",
            alignItems: "flex-end",
            gap: 4,
            marginTop: 8,
          }}
        >
          {Array.from({ length: 30 }).map((_, i) => {
            const h = Math.floor(20 + Math.random() * 80); // hauteur aléatoire pour l'exemple
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: `${h}%`,
                    background:
                      i % 7 === 0
                        ? "var(--color-accent)"
                        : "var(--color-border2)",
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.3s",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            fontSize: 10,
            color: "var(--color-ink4)",
          }}
        >
          <span>01/01</span>
          <span>31/01</span>
        </div>
      </div>

      {/* Top catégories et top produits */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        className="reports-two-col"
      >
        {/* Ventes par catégorie */}
        <div style={cardStyle}>
          <h3
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              marginBottom: 16,
            }}
          >
            Ventes par catégorie
          </h3>
          {categorySales.map((item) => (
            <ProgressBar
              key={item.label}
              label={item.label}
              pct={item.pct}
              color={item.color}
            />
          ))}
        </div>

        {/* Top produits */}
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <h3
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--color-ink)",
              }}
            >
              Top produits
            </h3>
            <button style={textBtn}>
              <Eye size={14} /> Voir tout
            </button>
          </div>
          {topProducts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topProducts.map((product, index) => (
                <div
                  key={product.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: "var(--color-accent)",
                        minWidth: 20,
                      }}
                    >
                      #{index + 1}
                    </span>
                    <div>
                      <p
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: "var(--color-ink)",
                        }}
                      >
                        {product.name}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--color-ink3)" }}>
                        {product.orders} commandes
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--color-ink)",
                    }}
                  >
                    {product.revenue}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptySection message="Aucun produit vendu pour le moment." />
          )}
        </div>
      </div>

      {/* Statut des intégrations */}
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h3
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--color-ink)",
              }}
            >
              Santé des intégrations
            </h3>
            <span style={{ fontSize: 11, color: "var(--color-ink4)" }}>
              (supervisé toutes les heures)
            </span>
          </div>
        </div>
        <div
          style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 20 }}
        >
          {[
            {
              name: "Printful",
              connected: stats?.podConnected ?? false,
            },
            {
              name: "API Interne",
              connected: true,
            },
          ].map((integration) => (
            <div
              key={integration.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 20px",
                background: integration.connected
                  ? "var(--color-success-bg)"
                  : "#fef2f2",
                borderRadius: 12,
                border: integration.connected
                  ? "1px solid #bbf7d0"
                  : "1px solid #fecaca",
                minWidth: 180,
              }}
            >
              {integration.connected ? (
                <Wifi
                  size={16}
                  strokeWidth={2}
                  style={{ color: "var(--color-success)" }}
                />
              ) : (
                <WifiOff
                  size={16}
                  strokeWidth={2}
                  style={{ color: "#ef4444" }}
                />
              )}
              <div>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--color-ink)",
                  }}
                >
                  {integration.name}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: integration.connected
                      ? "var(--color-success)"
                      : "#ef4444",
                  }}
                >
                  {integration.connected ? "Connecté" : "Déconnecté"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pied de page */}
      <p
        style={{
          fontSize: 12,
          color: "var(--color-ink4)",
          textAlign: "center",
        }}
      >
        Certaines données sont fictives et seront connectées à Supabase
        prochainement.
      </p>

      <style>{`
        @media (max-width: 768px) {
          .reports-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Styles réutilisés ─────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
  boxShadow: "var(--shadow-sm)",
};

const textBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  padding: "6px 12px",
  cursor: "pointer",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12,
};
