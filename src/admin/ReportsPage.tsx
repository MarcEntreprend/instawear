// src/admin/ReportsPage.tsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import {
  TrendingUp,
  Users,
  DollarSign,
  Eye,
  ShoppingBag,
  Wifi,
  WifiOff,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  Info,
  X,
} from "lucide-react";
import {
  dashboardApi,
  orderApi,
  productApi,
  customerApi,
} from "../api/supabaseApi";
import type { Order, AdminProduct, Customer } from "./adminTypes";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";

// ─── Palette de couleurs pour les catégories ────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  tshirt: "var(--color-accent)",
  hoodie: "#f59e0b",
  accessories: "#10b981",
  mug: "#6366f1",
  hat: "#ec4899",
  bag: "#8b5cf6",
  other: "#6b7280",
};

function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.other;
}

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
  onInfo,
  isActive,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: { value: number; positive: boolean } | null;
  onInfo: () => void;
  isActive: boolean;
}) {
  return (
    <div style={{ ...cardStyle, position: "relative" }}>
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
      {/* Bouton info */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onInfo();
        }}
        title="En savoir plus sur cette métrique"
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          background: isActive
            ? "var(--color-accent)"
            : "var(--color-surface2)",
          border: isActive
            ? "1px solid var(--color-accent)"
            : "1px solid var(--color-border)",
          borderRadius: 12,
          width: 20,
          height: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: isActive ? "white" : "var(--color-ink4)",
          fontSize: 11,
          fontWeight: 700,
          padding: 0,
          lineHeight: 1,
        }}
      >
        i
      </button>
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

// ─── Helpers de date ──────────────────────────────────────────────────────
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatShortDate = (iso: string) => {
  if (!iso) return "…";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

const formatDateForInput = (d: Date) => d.toISOString().split("T")[0];

// ─── Composant principal ──────────────────────────────────────────────────
export default function ReportsPage() {
  const currencySymbol = useCurrencySymbol();

  const [stats, setStats] = useState<any>(null);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<AdminProduct[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30); // 30j par défaut
  const [customMode, setCustomMode] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeInfo, setActiveInfo] = useState<string | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showTopModal, setShowTopModal] = useState(false);
  const [devMode, setDevMode] = useState(false); // mode test : force les boutons visibles

  const periodOptions = [
    { label: "7j", days: 7 },
    { label: "30j", days: 30 },
    { label: "3m", days: 90 },
    { label: "1a", days: 365 },
  ];

  // Dates min/max pour le sélecteur personnalisé (basées sur les commandes)
  const orderDates = useMemo(() => {
    const dates = allOrders.map((o) => new Date(o.createdAt).getTime());
    if (dates.length === 0)
      return {
        min: formatDateForInput(new Date()),
        max: formatDateForInput(new Date()),
      };
    return {
      min: formatDateForInput(new Date(Math.min(...dates))),
      max: formatDateForInput(new Date(Math.max(...dates))),
    };
  }, [allOrders]);

  // Chargement initial
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, orders, products, customers] = await Promise.all([
        dashboardApi.getStats(),
        orderApi.list(),
        productApi.list(),
        customerApi.list(),
      ]);
      setStats(s);
      setAllOrders(orders);
      setAllProducts(products);
      setAllCustomers(customers);
    } catch (e) {
      console.error("Erreur chargement rapports", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Période effective ─────────────────────────────────────────────────
  const customDatesReady = customMode && customStart && customEnd;
  const { effectiveStart, effectiveEnd } = useMemo(() => {
    if (customDatesReady) {
      return {
        effectiveStart: new Date(customStart),
        effectiveEnd: new Date(customEnd + "T23:59:59"),
      };
    }
    const now = new Date();
    return { effectiveStart: daysAgo(period), effectiveEnd: now };
  }, [customDatesReady, customStart, customEnd, period]);

  // Libellé lisible de la période
  const periodLabel = useMemo(() => {
    if (customMode) {
      if (customDatesReady) {
        return `${formatShortDate(customStart)} – ${formatShortDate(customEnd)}`;
      }
      return "Plage personnalisée (choisissez les dates)";
    }
    return periodOptions.find((p) => p.days === period)?.label || "30j";
  }, [customMode, customDatesReady, customStart, customEnd, period]);

  // ─── Commandes dans les périodes courante et précédente ───────────────
  const { currentOrders, previousOrders } = useMemo(() => {
    const now = effectiveEnd;
    const periodStart = effectiveStart;
    const durationMs = now.getTime() - periodStart.getTime();
    const previousStart = new Date(periodStart.getTime() - durationMs);

    const current = allOrders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= periodStart && d <= now;
    });
    const previous = allOrders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= previousStart && d < periodStart;
    });
    return { currentOrders: current, previousOrders: previous };
  }, [allOrders, effectiveStart, effectiveEnd]);

  // ─── KPIs ──────────────────────────────────────────────────────────────
  const currentRevenue = useMemo(
    () => currentOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [currentOrders],
  );
  const previousRevenue = useMemo(
    () => previousOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [previousOrders],
  );
  const currentOrderCount = currentOrders.length;
  const previousOrderCount = previousOrders.length;

  const currentAvgBasket =
    currentOrderCount > 0 ? currentRevenue / currentOrderCount : 0;
  const previousAvgBasket =
    previousOrderCount > 0 ? previousRevenue / previousOrderCount : 0;

  const currentNewCustomers = useMemo(() => {
    const start = effectiveStart;
    return allCustomers.filter((c) => {
      const d = c.registrationDate ? new Date(c.registrationDate) : null;
      return d && d >= start && d <= effectiveEnd;
    }).length;
  }, [allCustomers, effectiveStart, effectiveEnd]);

  const previousNewCustomers = useMemo(() => {
    const durationMs = effectiveEnd.getTime() - effectiveStart.getTime();
    const prevStart = new Date(effectiveStart.getTime() - durationMs);
    return allCustomers.filter((c) => {
      const d = c.registrationDate ? new Date(c.registrationDate) : null;
      return d && d >= prevStart && d < effectiveStart;
    }).length;
  }, [allCustomers, effectiveStart, effectiveEnd]);

  const calcDelta = (current: number, previous: number) => {
    if (previous === 0) return null;
    const pct = Math.round(((current - previous) / previous) * 100);
    return { value: Math.abs(pct), positive: pct >= 0 };
  };

  const revenueDelta = calcDelta(currentRevenue, previousRevenue);
  const ordersDelta = calcDelta(currentOrderCount, previousOrderCount);
  const customersDelta = calcDelta(currentNewCustomers, previousNewCustomers);
  const basketDelta = calcDelta(currentAvgBasket, previousAvgBasket);

  // ─── Graphique (revenu par jour) ───────────────────────────────────────
  const chartData = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    currentOrders.forEach((o) => {
      const day = o.createdAt.split("T")[0];
      revenueMap[day] = (revenueMap[day] || 0) + o.totalAmount;
    });

    const days: { label: string; revenue: number }[] = [];
    const start = new Date(effectiveStart);
    const end = new Date(effectiveEnd);
    const d = new Date(start);
    while (d <= end) {
      const key = formatDateForInput(d);
      days.push({
        label: formatShortDate(key),
        revenue: revenueMap[key] || 0,
      });
      d.setDate(d.getDate() + 1);
    }

    if (days.length <= 31) return days;

    const bucketCount = 30;
    const bucketSize = Math.ceil(days.length / bucketCount);
    const aggregated: { label: string; revenue: number }[] = [];
    for (let i = 0; i < days.length; i += bucketSize) {
      const bucket = days.slice(i, i + bucketSize);
      aggregated.push({
        label: bucket[0].label,
        revenue: bucket.reduce((s, d) => s + d.revenue, 0),
      });
    }
    return aggregated;
  }, [currentOrders, effectiveStart, effectiveEnd]);

  const maxChartRevenue = useMemo(
    () => Math.max(...chartData.map((d) => d.revenue), 1),
    [chartData],
  );

  // ─── Ventes par catégorie ──────────────────────────────────────────────
  const categorySales = useMemo(() => {
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const revenueByCat: Record<string, number> = {};
    currentOrders.forEach((order) => {
      order.items.forEach((item) => {
        const product = productMap.get(item.productId);
        const cat = product?.category || "other";
        const itemRevenue = item.unitPrice * item.quantity;
        revenueByCat[cat] = (revenueByCat[cat] || 0) + itemRevenue;
      });
    });

    const totalCatRevenue = Object.values(revenueByCat).reduce(
      (s, v) => s + v,
      0,
    );
    if (totalCatRevenue === 0) return [] as any[];

    const catLabels: Record<string, string> = {
      tshirt: "T-Shirts",
      hoodie: "Hoodies",
      accessories: "Accessoires",
      mug: "Mugs",
      hat: "Casquettes",
      bag: "Sacs",
      other: "Autres",
    };

    return Object.entries(revenueByCat)
      .map(([cat, rev]) => ({
        value: cat,
        label: catLabels[cat] || cat,
        pct: Math.round((rev / totalCatRevenue) * 100),
        revenue: rev,
        color: getCategoryColor(cat),
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [currentOrders, allProducts]);

  // ─── Top produits (par CA) ─────────────────────────────────────────────
  const topProducts = useMemo(() => {
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    const agg: Record<
      string,
      { title: string; orders: number; revenue: number }
    > = {};
    currentOrders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.productId;
        if (!agg[key]) {
          agg[key] = {
            title:
              item.productTitle ||
              productMap.get(item.productId)?.title ||
              "Inconnu",
            orders: 0,
            revenue: 0,
          };
        }
        agg[key].orders += item.quantity;
        agg[key].revenue += item.unitPrice * item.quantity;
      });
    });

    return Object.values(agg)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({
        name: p.title,
        orders: p.orders,
        revenue: `${p.revenue.toFixed(0)} ${currencySymbol}`,
      }));
  }, [currentOrders, allProducts, currencySymbol]);

  const totalCustomers = stats?.totalCustomers ?? 0;

  // ─── Définitions des métriques ─────────────────────────────────────────
  const metricInfos: Record<string, string> = {
    revenue: `**CA (Chiffre d'Affaires)** = somme des montants totaux de toutes les commandes sur la période « ${periodLabel} ».\n\nLa flèche compare au CA de la période précédente de même durée.`,
    orders: `**Commandes** = nombre total de commandes enregistrées sur la période « ${periodLabel} ».\n\nLa flèche compare au nombre de commandes de la période précédente de même durée.`,
    customers: `**Clients (total)** = nombre total de clients dans la base, toutes périodes confondues.\n\nLa flèche compare le nombre de nouveaux clients de la période « ${periodLabel} » à la période précédente.`,
    basket: `**Panier moyen** = CA total ÷ nombre de commandes sur la période « ${periodLabel} ».\n\nLa flèche compare au panier moyen de la période précédente de même durée.`,
  };

  // Toggle info et fermeture lors du passage en mode plage
  const toggleInfo = (key: string) => {
    setActiveInfo((prev) => (prev === key ? null : key));
  };

  const activateCustomMode = () => {
    setCustomMode((prev) => {
      if (!prev) {
        // ouverture du mode plage → fermer l’info
        setActiveInfo(null);
      }
      return !prev;
    });
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", minHeight: 200 }}
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
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              Rapports
            </h2>
            <button
              onClick={fetchAll}
              title="Rafraîchir les données"
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
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            Analysez vos ventes, vos clients et la performance de vos produits.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--color-ink4)" }}>
            {periodLabel}
          </span>
          <button
            style={{
              ...textBtn,
              opacity: customDatesReady || !customMode ? 1 : 0.4,
              pointerEvents: customDatesReady || !customMode ? "auto" : "none",
            }}
            disabled={!customDatesReady && customMode}
          >
            <FileText size={14} /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Sélecteur de période */}
      <div
        style={{
          display: "flex",
          gap: 6,
          justifyContent: "flex-end",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {periodOptions.map(({ label, days }) => (
          <button
            key={label}
            onClick={() => {
              setPeriod(days);
              setCustomMode(false);
              setActiveInfo(null);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background:
                !customMode && period === days
                  ? "var(--color-accent)"
                  : "var(--color-surface)",
              color:
                !customMode && period === days ? "white" : "var(--color-ink2)",
              fontWeight: 600,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={activateCustomMode}
          title="Plage personnalisée"
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: customMode
              ? "var(--color-accent)"
              : "var(--color-surface)",
            color: customMode ? "white" : "var(--color-ink2)",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Calendar size={14} strokeWidth={2} />
          Plage
        </button>
      </div>

      {/* Inputs de plage personnalisée */}
      {customMode && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <label style={{ fontSize: 12, color: "var(--color-ink3)" }}>Du</label>
          <input
            type="date"
            value={customStart}
            min={orderDates.min}
            max={orderDates.max}
            onChange={(e) => setCustomStart(e.target.value)}
            style={dateInputStyle}
          />
          <label style={{ fontSize: 12, color: "var(--color-ink3)" }}>au</label>
          <input
            type="date"
            value={customEnd}
            min={orderDates.min}
            max={orderDates.max}
            onChange={(e) => setCustomEnd(e.target.value)}
            style={dateInputStyle}
          />
        </div>
      )}

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
          label={`CA (${periodLabel})`}
          value={`${currentRevenue.toFixed(0)} ${currencySymbol}`}
          delta={revenueDelta}
          onInfo={() => toggleInfo("revenue")}
          isActive={activeInfo === "revenue"}
        />
        <StatCard
          icon={<ShoppingBag size={20} strokeWidth={2} />}
          label={`Commandes (${periodLabel})`}
          value={currentOrderCount.toString()}
          delta={ordersDelta}
          onInfo={() => toggleInfo("orders")}
          isActive={activeInfo === "orders"}
        />
        <StatCard
          icon={<Users size={20} strokeWidth={2} />}
          label="Clients (total)"
          value={totalCustomers.toString()}
          delta={customersDelta}
          onInfo={() => toggleInfo("customers")}
          isActive={activeInfo === "customers"}
        />
        <StatCard
          icon={<TrendingUp size={20} strokeWidth={2} />}
          label="Panier moyen"
          value={`${currentAvgBasket.toFixed(0)} ${currencySymbol}`}
          delta={basketDelta}
          onInfo={() => toggleInfo("basket")}
          isActive={activeInfo === "basket"}
        />
      </div>

      {/* Panneau d'information métrique */}
      {activeInfo && (
        <div
          style={{
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "14px 18px",
            fontSize: 13,
            color: "var(--color-ink2)",
            whiteSpace: "pre-line",
            lineHeight: 1.6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
            <Info
              size={14}
              style={{
                marginRight: 8,
                verticalAlign: "middle",
                marginBottom: 2,
              }}
            />
            {metricInfos[activeInfo].replace(
              /\*\*(.*?)\*\*/g,
              (_, text) => text,
            )}
          </span>
          <button
            onClick={() => setActiveInfo(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink4)",
              padding: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Graphique des tendances */}
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
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
            }}
          >
            Revenu par jour ({periodLabel})
          </h3>
        </div>
        <div
          style={{
            height: 160,
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
            marginTop: 8,
          }}
        >
          {chartData.map((d, i) => {
            const h =
              maxChartRevenue > 0 ? (d.revenue / maxChartRevenue) * 100 : 0;
            return (
              <div
                key={i}
                title={`${d.label}: ${d.revenue.toFixed(0)} ${currencySymbol}`}
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
                    height: `${Math.max(h, 1)}%`,
                    background:
                      d.revenue > 0
                        ? "var(--color-accent)"
                        : "var(--color-border2)",
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.3s",
                    minHeight: d.revenue > 0 ? 2 : 1,
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
          <span>{chartData[0]?.label || ""}</span>
          <span>{chartData[chartData.length - 1]?.label || ""}</span>
        </div>
      </div>

      {/* Top catégories et top produits */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        className="reports-two-col"
      >
        {/* Ventes par catégorie */}
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
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: "var(--color-ink)",
              }}
            >
              Ventes par catégorie ({periodLabel})
            </h3>
            {(categorySales.length > 10 || devMode) && (
              <button onClick={() => setShowCatModal(true)} style={textBtn}>
                <Eye size={14} /> Voir tout
              </button>
            )}
          </div>
          {categorySales.length > 0 ? (
            categorySales
              .slice(0, 10)
              .map((item) => (
                <ProgressBar
                  key={item.value}
                  label={item.label}
                  pct={item.pct}
                  color={item.color}
                />
              ))
          ) : (
            <EmptySection message="Aucune vente sur cette période." />
          )}
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
              Top produits ({periodLabel}) · par CA
            </h3>
            {(topProducts.length > 5 || devMode) && (
              <button onClick={() => setShowTopModal(true)} style={textBtn}>
                <Eye size={14} /> Voir tout
              </button>
            )}
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
                        {product.orders} articles vendus
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

      {/* Modal "Top produits" complet */}
      {showTopModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowTopModal(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: 20,
              maxWidth: 600,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: 28,
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--color-ink)",
                }}
              >
                Top produits ({periodLabel}) · par CA
              </h3>
              <button
                onClick={() => setShowTopModal(false)}
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: 4,
                  cursor: "pointer",
                  color: "var(--color-ink2)",
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>
            {topProducts.length === 0 ? (
              <EmptySection message="Aucun produit vendu pour le moment." />
            ) : (
              topProducts.map((product, index) => (
                <div
                  key={product.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: "var(--color-accent)",
                        minWidth: 28,
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
                        {product.orders} articles vendus
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
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal "Ventes par catégorie" complet */}
      {showCatModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowCatModal(false)}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: 20,
              maxWidth: 600,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: 28,
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--color-ink)",
                }}
              >
                Ventes par catégorie ({periodLabel})
              </h3>
              <button
                onClick={() => setShowCatModal(false)}
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: 4,
                  cursor: "pointer",
                  color: "var(--color-ink2)",
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>
            {categorySales.length === 0 && (
              <EmptySection message="Aucune vente sur cette période." />
            )}
            {categorySales.map((item, idx) => (
              <div
                key={item.value}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: "var(--color-accent)",
                      minWidth: 28,
                    }}
                  >
                    #{idx + 1}
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--color-ink)",
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--color-ink)",
                      marginRight: 12,
                    }}
                  >
                    {item.pct}%
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-ink3)" }}>
                    {item.revenue.toFixed(0)} {currencySymbol}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statut des intégrations*/}
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
                  : "var(--color-accent-bg)",
                borderRadius: 12,
                border: `1px solid ${
                  integration.connected
                    ? "var(--color-success)"
                    : "var(--color-accent-soft)"
                }`,
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
                  style={{ color: "var(--color-accent)" }}
                />
              )}
              <div>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 13,
                    color: "var(--color-ink3)",
                  }}
                >
                  {integration.name}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: integration.connected
                      ? "var(--color-success)"
                      : "var(--color-accent)",
                  }}
                >
                  {integration.connected ? "Connecté" : "Déconnecté"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .reports-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Mode test – retirer en production */}
      {/* # TO DELETE once test is complete */}
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <button
          onClick={() => setDevMode(!devMode)}
          style={{
            padding: "4px 12px",
            borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: devMode
              ? "var(--color-accent)"
              : "var(--color-surface2)",
            color: devMode ? "white" : "var(--color-ink4)",
            fontWeight: 600,
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          {devMode ? "✓ Boutons visibles" : "🧪 Voir boutons masqués"}
        </button>
      </div>
    </div>
  );
}

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

const dateInputStyle: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  fontSize: 12,
  color: "var(--color-ink)",
  fontFamily: "var(--font-body)",
  outline: "none",
};
