// src/admin/OrdersPage.tsx

import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Truck,
  Package,
  FileText,
  Eye,
  Calendar,
  ShoppingBag,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import { useOrders } from "./adminHooks";
import { useHighlightListener } from "./useAdminHighlight";
import { productApi } from "../api/supabaseApi";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";
import { Order, OrderFilters, AdminProduct } from "./adminTypes";
import ProductQuickViewModal from "./ProductQuickViewModal";

// ─── Status labels & colors ────────────────────────────────────────────────
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
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        color: s.color,
        background: s.bg,
        whiteSpace: "nowrap",
        lineHeight: 1.4,
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Small action button ──────────────────────────────────────────────────
const iconBtn: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: 6,
  cursor: "pointer",
  color: "var(--color-ink2)",
  display: "flex",
  alignItems: "center",
};

// ─── Format currency ───────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  value.toFixed(2).replace(".", ",") + " $";

export default function OrdersPage() {
  const {
    orders: allOrders,
    loading,
    error,
    refetch,
    updateStatus,
    exportCsv,
  } = useOrders();

  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    status: "",
    dateFrom: "",
    dateTo: "",
    clientId: "",
  });

  const [sortKey, setSortKey] = useState<keyof Order>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ── Detail modal state ───────────────────────────────────────────────────
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<AdminProduct | null>(
    null,
  );
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(
    null,
  );

  // states pour le chargement et la fonction de récupération
  const [loadingQuickView, setLoadingQuickView] = useState(false);

  useHighlightListener(
    "instawear:highlight-orders",
    setHighlightedOrderId,
    2500,
    'tr[data-order-id="{}"]',
  );

  const handleQuickView = async (productId: string) => {
    setLoadingQuickView(true);
    try {
      const product = await productApi.get(productId);
      if (product) {
        setQuickViewProduct(product);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuickView(false);
    }
  };

  // ── Filter & sort ────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    let list = [...allOrders];

    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(s) ||
          (o.clientName ?? "").toLowerCase().includes(s) ||
          (o.clientEmail ?? "").toLowerCase().includes(s) ||
          o.items.some((item) =>
            (item.productTitle ?? "").toLowerCase().includes(s),
          ),
      );
    }
    if (filters.status) {
      list = list.filter((o) => o.status === filters.status);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      list = list.filter((o) => new Date(o.createdAt).getTime() >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo).setHours(23, 59, 59, 999);
      list = list.filter((o) => new Date(o.createdAt).getTime() <= to);
    }
    if (filters.clientId) {
      list = list.filter((o) => o.clientId === filters.clientId);
    }

    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return 0;
    });
    return list;
  }, [allOrders, filters, sortKey, sortDir]);

  const toggleSort = (key: keyof Order) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: keyof Order) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={11} />
    ) : (
      <ChevronDown size={11} />
    );
  };

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateStatus(orderId, newStatus as any);
  };

  const handleExport = async () => {
    await exportCsv();
  };

  // ── Loading / error states ───────────────────────────────────────────────
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
        <ShoppingBag
          size={32}
          style={{ margin: "0 auto 12px", opacity: 0.5 }}
        />
        <p>Impossible de charger les commandes.</p>
        <p style={{ fontSize: 12, marginTop: 4 }}>{error}</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
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
              Commandes
            </h2>
            <button
              onClick={() => refetch()}
              title="Rafraîchir les commandes"
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
            {filteredOrders.length} commande
            {filteredOrders.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleExport}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 12,
            border: "1.5px solid var(--color-border2)",
            background: "var(--color-surface)",
            color: "var(--color-ink2)",
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <FileText size={15} strokeWidth={2} />
          Exporter CSV
        </button>
      </div>

      {/* Filter bar – sticky on scroll within admin content */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          padding: "14px 16px",
          borderRadius: 16,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 10,
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            flex: "1 1 200px",
          }}
        >
          <Search
            size={14}
            strokeWidth={2}
            style={{ color: "var(--color-ink4)", flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="Rechercher (ID, client, produit)…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              flex: 1,
              fontSize: 13,
              color: "var(--color-ink)",
              fontFamily: "var(--font-body)",
            }}
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ ...filters, search: "" })}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink4)",
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={{
            padding: "7px 12px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-ink2)",
            cursor: "pointer",
          }}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(ORDER_STATUS_LABEL).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={14} style={{ color: "var(--color-ink4)" }} />
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters({ ...filters, dateFrom: e.target.value })
            }
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface2)",
              fontSize: 12,
              color: "var(--color-ink2)",
              fontFamily: "var(--font-body)",
            }}
          />
          <span style={{ color: "var(--color-ink4)", fontSize: 12 }}>à</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface2)",
              fontSize: 12,
              color: "var(--color-ink2)",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>

        <button
          onClick={() =>
            setFilters({
              search: "",
              status: "",
              dateFrom: "",
              dateTo: "",
              clientId: "",
            })
          }
          style={{
            padding: "6px 14px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            color: "var(--color-ink3)",
            fontWeight: 600,
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Effacer filtres
        </button>
      </div>

      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead
            style={{
              background: "var(--color-surface2)",
              fontWeight: 700,
              color: "var(--color-ink2)",
            }}
          >
            <tr>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
                onClick={() => toggleSort("id")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  ID {sortIcon("id")}
                </div>
              </th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>
                Client
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
                onClick={() => toggleSort("createdAt")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Date {sortIcon("createdAt")}
                </div>
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Statut
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "right",
                  cursor: "pointer",
                }}
                onClick={() => toggleSort("totalAmount")}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    justifyContent: "flex-end",
                  }}
                >
                  Montant {sortIcon("totalAmount")}
                </div>
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Livraison
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: 32,
                    color: "var(--color-ink4)",
                  }}
                >
                  <Package
                    size={28}
                    style={{ margin: "0 auto 10px", opacity: 0.5 }}
                  />
                  Aucune commande trouvée.
                </td>
              </tr>
            )}
            {filteredOrders.map((order) => (
              <tr
                key={order.id}
                data-order-id={order.id}
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  transition: "background 0.3s ease, box-shadow 0.3s ease",
                  background:
                    highlightedOrderId === order.id
                      ? "var(--color-accent-bg)"
                      : "transparent",
                  boxShadow:
                    highlightedOrderId === order.id
                      ? "inset 0 0 0 2px var(--color-accent)"
                      : "none",
                }}
              >
                <td
                  style={{
                    padding: "10px 14px",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                  }}
                >
                  {order.id}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                    {order.clientName ?? order.clientEmail ?? order.clientId}
                  </span>
                  {order.clientName && order.clientEmail && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink4)",
                        marginTop: 2,
                      }}
                    >
                      {order.clientEmail}
                    </div>
                  )}
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "var(--color-ink2)",
                  }}
                >
                  {new Date(order.createdAt).toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "center" }}>
                  <OrderStatusBadge status={order.status} />
                </td>
                <td
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 700,
                    color: "var(--color-ink)",
                  }}
                >
                  {formatCurrency(order.totalAmount)}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "center" }}>
                  {order.shippingCost === 0 ? (
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--color-success)",
                        fontWeight: 600,
                      }}
                    >
                      Gratuite
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: "var(--color-ink3)" }}>
                      {formatCurrency(order.shippingCost)}
                    </span>
                  )}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      justifyContent: "center",
                    }}
                  >
                    <button
                      title="Voir le détail"
                      style={iconBtn}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <Eye size={14} strokeWidth={2} />
                    </button>
                    <select
                      value={order.status}
                      onChange={(e) =>
                        handleStatusChange(order.id, e.target.value)
                      }
                      style={{
                        padding: "4px 8px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface2)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--color-ink2)",
                        cursor: "pointer",
                      }}
                    >
                      {Object.keys(ORDER_STATUS_LABEL).map((key) => (
                        <option key={key} value={key}>
                          {ORDER_STATUS_LABEL[key].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(26,20,10,0.5)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setSelectedOrder(null)}
          />
          <div
            style={{
              position: "relative",
              zIndex: 201,
              background: "var(--color-surface)",
              borderRadius: 20,
              maxWidth: 800,
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "var(--shadow-xl)",
            }}
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
                Commande {selectedOrder.id}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: "var(--color-ink2)",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
                marginBottom: 24,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-ink3)",
                    textTransform: "uppercase",
                  }}
                >
                  Client
                </p>
                <p style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                  {selectedOrder.clientName ??
                    selectedOrder.clientEmail ??
                    selectedOrder.clientId}
                </p>
                {selectedOrder.shippingAddress && (
                  <div style={{ marginTop: 12 }}>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--color-ink3)",
                        textTransform: "uppercase",
                      }}
                    >
                      Adresse de livraison
                    </p>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--color-ink2)",
                        lineHeight: 1.5,
                      }}
                    >
                      {selectedOrder.shippingAddress.fullName}
                      <br />
                      {selectedOrder.shippingAddress.address}
                      <br />
                      {selectedOrder.shippingAddress.zip}{" "}
                      {selectedOrder.shippingAddress.city},{" "}
                      {selectedOrder.shippingAddress.country}
                      <br />
                      {selectedOrder.shippingAddress.phone}
                    </p>
                  </div>
                )}
              </div>
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--color-ink3)",
                    textTransform: "uppercase",
                  }}
                >
                  Statut
                </p>
                <OrderStatusBadge status={selectedOrder.status} />

                {/* ajout du bouton « Envoyer à Printful » */}
                {selectedOrder.status === "pending" && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            "Envoyer cette commande à Printful (mode draft) ?",
                          )
                        )
                          return;
                        try {
                          const { podApi } = await import("../api/supabaseApi");
                          await podApi.createOrder(selectedOrder.id);
                          alert(
                            "Commande envoyée à Printful (statut mis à jour).",
                          );
                          setSelectedOrder(null);
                        } catch (e: any) {
                          alert("Erreur : " + (e.message || ""));
                        }
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        border: "1px solid var(--color-accent)",
                        background: "var(--color-accent)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Package size={14} strokeWidth={2} />
                      Envoyer à Printful
                    </button>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--color-ink3)",
                      textTransform: "uppercase",
                    }}
                  >
                    Date
                  </p>
                  <p style={{ fontSize: 13, color: "var(--color-ink2)" }}>
                    {new Date(selectedOrder.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <div style={{ marginTop: 12 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--color-ink3)",
                      textTransform: "uppercase",
                    }}
                  >
                    Notes
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--color-ink2)",
                      fontStyle: selectedOrder.notes ? "normal" : "italic",
                    }}
                  >
                    {selectedOrder.notes || "Aucune"}
                  </p>
                </div>
                {selectedOrder.externalOrderId && (
                  <div style={{ marginTop: 12 }}>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--color-ink3)",
                        textTransform: "uppercase",
                      }}
                    >
                      Commande externe (POD)
                    </p>
                    <p style={{ fontSize: 13, color: "var(--color-ink2)" }}>
                      {selectedOrder.externalOrderId}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <h4
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--color-ink)",
                  marginBottom: 12,
                }}
              >
                Articles ({selectedOrder.items.length})
              </h4>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "8px 12px",
                        fontWeight: 600,
                        color: "var(--color-ink3)",
                      }}
                    >
                      Produit
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "8px 12px",
                        fontWeight: 600,
                        color: "var(--color-ink3)",
                      }}
                    >
                      Couleur
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "8px 12px",
                        fontWeight: 600,
                        color: "var(--color-ink3)",
                      }}
                    >
                      Taille
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "8px 12px",
                        fontWeight: 600,
                        color: "var(--color-ink3)",
                      }}
                    >
                      Qté
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px 12px",
                        fontWeight: 600,
                        color: "var(--color-ink3)",
                      }}
                    >
                      Prix
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "8px 12px",
                        fontWeight: 600,
                        color: "var(--color-ink3)",
                      }}
                    >
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      <td style={{ padding: "10px 12px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <button
                            onClick={() => handleQuickView(item.productId)}
                            style={{
                              width: 32,
                              height: 32,
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
                              src={item.productImage || PLACEHOLDER_IMG}
                              alt={item.productTitle ?? ""}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          </button>
                          <button
                            onClick={() => handleQuickView(item.productId)}
                            style={{
                              fontWeight: 500,
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
                            {item.productTitle ?? item.productId}
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: "center", padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: item.selectedColor,
                            border: "1px solid var(--color-border)",
                            verticalAlign: "middle",
                          }}
                          title={item.selectedColor}
                        />
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "10px 12px",
                          fontWeight: 500,
                          color: "var(--color-ink2)",
                        }}
                      >
                        {item.selectedSize}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "10px 12px",
                          fontWeight: 600,
                          color: "var(--color-ink)",
                        }}
                      >
                        {item.quantity}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "10px 12px",
                          fontVariantNumeric: "tabular-nums",
                          color: "var(--color-ink2)",
                        }}
                      >
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "10px 12px",
                          fontWeight: 700,
                          color: "var(--color-ink)",
                        }}
                      >
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div
                style={{
                  marginTop: 16,
                  textAlign: "right",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                }}
              >
                Total : {formatCurrency(selectedOrder.totalAmount)}
                {selectedOrder.shippingCost > 0 && (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--color-ink3)",
                      marginLeft: 8,
                    }}
                  >
                    (dont {formatCurrency(selectedOrder.shippingCost)} de
                    livraison)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
}
