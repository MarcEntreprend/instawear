// src/admin/ShippedDeliveredPage.tsx

// Suivi des expéditions — vue dédiée aux commandes expédiées et livrées.
// Objectif : donner à l'admin en un coup d'œil tout ce qui concerne les
// colis en route ou arrivés (tracking, arrivée estimée, transporteur,
// réexpédition) sans mélanger avec les commandes en cours de production.

import React, { useMemo, useState } from "react";
import {
  Truck,
  RefreshCw,
  Package,
  PackageCheck,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { orderApi } from "../api/supabaseApi";
import type { Order } from "./adminTypes";
import CopyID from "../components/CopyID";
import ShipmentTrackingBlock from "../components/ShipmentTrackingBlock";

const SHIPPED_STATUSES = new Set(["shipped", "delivered"]);

const formatCurrency = (value: number) =>
  value.toFixed(2).replace(".", ",") + " $";

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ShippedDeliveredPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "shipped" | "delivered"
  >("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const all = await orderApi.list();
      setOrders(all.filter((o) => SHIPPED_STATUSES.has(o.status)));
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.clientName || "").toLowerCase().includes(q) ||
        (o.clientEmail || "").toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const shippedCount = (orders ?? []).filter(
    (o) => o.status === "shipped",
  ).length;
  const deliveredCount = (orders ?? []).filter(
    (o) => o.status === "delivered",
  ).length;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
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

  if (error) {
    return (
      <div
        style={{ textAlign: "center", padding: 40, color: "var(--color-ink3)" }}
      >
        <Package size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
        <p>Impossible de charger les expéditions.</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>{error}</p>
        <button
          onClick={load}
          style={{
            marginTop: 12,
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            cursor: "pointer",
            color: "var(--color-ink2)",
          }}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
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
                marginBottom: 2,
              }}
            >
              Expédiées & Livrées
            </h2>
            <button
              onClick={load}
              title="Rafraîchir"
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
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink3)",
              marginTop: 4,
            }}
          >
            {shippedCount} expédiée(s) · {deliveredCount} livrée(s) — colis
            suivis par le webhook Printful.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Filtre statut */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "shipped" | "delivered")
            }
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              color: "var(--color-ink)",
              outline: "none",
            }}
          >
            <option value="all">Tous les statuts</option>
            <option value="shipped">Expédiée</option>
            <option value="delivered">Livrée</option>
          </select>

          {/* Recherche */}
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--color-ink4)",
              }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ID, client, email…"
              style={{
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                borderRadius: 10,
                padding: "8px 12px 8px 30px",
                fontSize: 13,
                color: "var(--color-ink)",
                outline: "none",
                width: 220,
              }}
            />
          </div>
        </div>
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: "var(--color-ink3)",
          }}
        >
          <PackageCheck
            size={32}
            style={{ margin: "0 auto 12px", opacity: 0.4 }}
          />
          <p>Aucune commande expédiée ou livrée.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((order) => {
            const isShipped = order.status === "shipped";
            const shipments = order.trackingInfo ?? [];
            const expanded = expandedId === order.id;
            return (
              <div
                key={order.id}
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {/* Ligne résumé */}
                <button
                  onClick={() => setExpandedId(expanded ? null : order.id)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isShipped
                        ? "var(--color-accent-soft)"
                        : "#d1fae5",
                      color: isShipped ? "var(--color-accent)" : "#065f46",
                    }}
                  >
                    {isShipped ? (
                      <Truck size={16} strokeWidth={2} />
                    ) : (
                      <PackageCheck size={16} strokeWidth={2} />
                    )}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          color: "var(--color-ink)",
                          fontFamily: "monospace",
                          fontSize: 13.5,
                        }}
                      >
                        {order.id}
                      </span>
                      <CopyID id={order.id} size={11} />
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: isShipped ? "#065f46" : "#166534",
                          background: isShipped ? "#d1fae5" : "#dcfce7",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {isShipped ? "Expédiée" : "Livrée"}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--color-ink3)",
                          marginLeft: "auto",
                        }}
                      >
                        {formatDate(order.createdAt)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        marginTop: 3,
                        fontSize: 12.5,
                        color: "var(--color-ink2)",
                        flexWrap: "wrap",
                      }}
                    >
                      <span>
                        {order.clientName || order.clientEmail || "—"}
                      </span>
                      <span style={{ color: "var(--color-ink4)" }}>
                        {shipments.length} colis ·{" "}
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                  {expanded ? (
                    <ChevronUp
                      size={16}
                      style={{ color: "var(--color-ink4)" }}
                    />
                  ) : (
                    <ChevronDown
                      size={16}
                      style={{ color: "var(--color-ink4)" }}
                    />
                  )}
                </button>

                {/* Détail tracking */}
                {expanded && (
                  <div
                    style={{
                      padding: "0 16px 16px",
                      borderTop: "1px solid var(--color-border)",
                      paddingTop: 14,
                    }}
                  >
                    {shipments.length > 0 ? (
                      <>
                        <ShipmentTrackingBlock shipments={shipments} />
                        {order.clientEmail && (
                          <div
                            style={{
                              marginTop: 12,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 12,
                              color: "var(--color-ink3)",
                            }}
                          >
                            <ExternalLink size={12} />
                            {order.clientEmail}
                          </div>
                        )}
                      </>
                    ) : (
                      <p
                        style={{
                          fontSize: 12.5,
                          color: "var(--color-ink3)",
                          fontStyle: "italic",
                        }}
                      >
                        Aucun colis enregistré pour cette commande.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
