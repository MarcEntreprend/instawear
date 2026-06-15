// src/admin/ReportsPage.tsx

import React from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  DollarSign,
  Eye,
} from "lucide-react";

const statCard = (icon: React.ReactNode, label: string, value: string) => (
  <div style={cardStyle}>
    <div style={{ color: "var(--color-accent)", marginBottom: 8 }}>{icon}</div>
    <p style={{ fontSize: 24, fontWeight: 800, color: "var(--color-ink)" }}>
      {value}
    </p>
    <p style={{ fontSize: 12, color: "var(--color-ink3)", marginTop: 4 }}>
      {label}
    </p>
  </div>
);

export default function ReportsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 14,
        }}
      >
        {statCard(<DollarSign size={20} />, "CA Total", "4 820 €")}
        {statCard(<ShoppingBagIcon />, "Commandes", "128")}
        {statCard(<Users size={20} />, "Clients uniques", "47")}
        {statCard(<TrendingUp size={20} />, "Panier moyen", "37,66 €")}
      </div>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3
            style={{ fontWeight: 700, fontSize: 15, color: "var(--color-ink)" }}
          >
            Ventes par catégorie
          </h3>
          <button style={textBtn}>
            <Eye size={14} /> Voir détail
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "T-Shirts", pct: 45 },
            { label: "Hoodies", pct: 30 },
            { label: "Accessoires", pct: 15 },
            { label: "Mugs", pct: 10 },
          ].map((item) => (
            <div
              key={item.label}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <span
                style={{ fontSize: 13, width: 100, color: "var(--color-ink2)" }}
              >
                {item.label}
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 4,
                  background: "var(--color-surface2)",
                }}
              >
                <div
                  style={{
                    width: `${item.pct}%`,
                    height: "100%",
                    borderRadius: 4,
                    background: "var(--color-accent)",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                }}
              >
                {item.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--color-ink4)",
          textAlign: "center",
        }}
      >
        Les données ci-dessus sont fictives. Elles seront connectées à Supabase
        prochainement.
      </p>
    </div>
  );
}

const ShoppingBagIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
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
