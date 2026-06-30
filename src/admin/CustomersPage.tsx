// src/admin/CustomersPage.tsx
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  Heart,
  ShoppingBag,
  Package,
  Mail,
  Calendar,
  Clock,
  Eye,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
} from "lucide-react";
import { useCustomers } from "./adminHooks";
import { useHighlightListener } from "./useAdminHighlight";
import { useCustomerDetail } from "./adminHooks";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";
import ProductQuickViewModal from "./ProductQuickViewModal";
import type { AdminSection } from "./AdminSidebar";
import {
  Customer,
  Favourite,
  AdminCartItem,
  Order,
  AdminProduct,
} from "./adminTypes";
import { customerApi, interactionApi } from "../api/supabaseApi";

// ─── Status badge ─────────────────────────────────────────────────────────
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
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Format date ──────────────────────────────────────────────────────────
function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Main component ───────────────────────────────────────────────────────
export default function CustomersPage({
  onNavigate,
  onQuickView,
}: {
  onNavigate?: (section: AdminSection) => void;
  onQuickView?: (product: AdminProduct) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await customerApi.list();
      setCustomers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  const currencySymbol = useCurrencySymbol();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Customer>("registrationDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [quickViewProduct, setQuickViewProduct] = useState<AdminProduct | null>(
    null,
  );
  const [highlightedCustomerId, setHighlightedCustomerId] = useState<
    string | null
  >(null);

  // ── Filter & sort ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!customers) return [];
    let list = [...customers];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.email.toLowerCase().includes(s) ||
          (c.name && c.name.toLowerCase().includes(s)),
      );
    }
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string")
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return 0;
    });
    return list;
  }, [customers, search, sortKey, sortDir]);
  useHighlightListener(
    "instawear:highlight-customers",
    setHighlightedCustomerId,
    8000,
    'tr[data-customer-id="{}"]',
  );

  const toggleSort = (key: keyof Customer) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: keyof Customer) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={11} />
    ) : (
      <ChevronDown size={11} />
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={centerStyle}>
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

  // ── Détail client ──────────────────────────────────────────────────────
  if (selectedCustomerId) {
    return (
      <CustomerDetailPanel
        customerId={selectedCustomerId}
        onBack={() => setSelectedCustomerId(null)}
        onNavigate={onNavigate}
        onQuickView={setQuickViewProduct}
        quickViewProduct={quickViewProduct}
        setQuickViewProduct={setQuickViewProduct}
      />
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
              }}
            >
              Clients
            </h2>
            <button
              onClick={fetchCustomers}
              title="Rafraîchir les clients"
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
            {filtered.length} client{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Search */}
      <div style={searchBarStyle}>
        <Search
          size={15}
          strokeWidth={2}
          style={{ color: "var(--color-ink4)", flexShrink: 0 }}
        />
        <input
          type="text"
          placeholder="Rechercher par email ou nom…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
        {search && (
          <button onClick={() => setSearch("")} style={clearBtnStyle}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div style={tableWrapperStyle}>
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead style={theadStyle}>
            <tr>
              <th style={thStyle}>Client</th>
              <th
                style={{ ...thStyle, cursor: "pointer" }}
                onClick={() => toggleSort("registrationDate")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Inscription {sortIcon("registrationDate")}
                </div>
              </th>
              <th
                style={{ ...thStyle, cursor: "pointer" }}
                onClick={() => toggleSort("lastLoginDate")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Dernière connexion {sortIcon("lastLoginDate")}
                </div>
              </th>
              <th style={{ ...thStyle, textAlign: "center", width: 100 }}>
                Détail
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                data-customer-id={c.id}
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  transition: "background 0.3s ease, box-shadow 0.3s ease",
                  background:
                    highlightedCustomerId === c.id
                      ? "var(--color-accent-bg)"
                      : "transparent",
                  boxShadow:
                    highlightedCustomerId === c.id
                      ? "inset 0 0 0 2px var(--color-accent)"
                      : "none",
                }}
              >
                <td style={tdStyle}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div style={avatarStyle}>
                      {(c.name || c.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                        {c.name || "Sans nom"}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--color-ink4)" }}>
                        <Mail
                          size={10}
                          style={{ marginRight: 4, verticalAlign: "middle" }}
                        />
                        {c.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td style={tdStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      color: "var(--color-ink3)",
                      fontSize: 12,
                    }}
                  >
                    <Calendar size={12} />
                    {formatDate(c.registrationDate)}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      color: c.lastLoginDate
                        ? "var(--color-ink3)"
                        : "var(--color-ink4)",
                      fontSize: 12,
                    }}
                  >
                    <Clock size={12} />
                    {c.lastLoginDate
                      ? formatDateTime(c.lastLoginDate)
                      : "Jamais connecté"}
                  </div>
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <button
                    onClick={() => setSelectedCustomerId(c.id)}
                    style={iconBtn}
                    title="Voir le détail"
                  >
                    <Eye size={15} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--color-ink4)",
            }}
          >
            <Users size={28} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
            Aucun client trouvé.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Customer detail panel ────────────────────────────────────────────────
function CustomerDetailPanel({
  customerId,
  onBack,
  onNavigate,
  onQuickView,
  quickViewProduct,
  setQuickViewProduct,
}: {
  customerId: string;
  onBack: () => void;
  onNavigate?: (section: AdminSection) => void;
  onQuickView?: (product: AdminProduct) => void;
  quickViewProduct?: AdminProduct | null;
  setQuickViewProduct?: (product: AdminProduct | null) => void;
}) {
  const { data } = useCustomerDetail(customerId);
  const [activeTab, setActiveTab] = useState<
    "favorites" | "cart" | "orders" | "interactions"
  >("orders");
  const [interactions, setInteractions] = useState<any[]>([]);
  const [interactionsLoading, setInteractionsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "interactions" && customerId) {
      setInteractionsLoading(true);
      interactionApi
        .list({ search: customerId })
        .then(setInteractions)
        .catch(() => setInteractions([]))
        .finally(() => setInteractionsLoading(false));
    }
  }, [activeTab, customerId]);

  if (!data) {
    return (
      <div style={centerStyle}>
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

  const { customer, favourites, cart, orders } = data;

  if (!customer) {
    return (
      <div style={centerStyle}>
        <p>Client introuvable.</p>
        <button onClick={onBack} style={backBtnStyle}>
          <ArrowLeft size={16} strokeWidth={2} /> Retour
        </button>
      </div>
    );
  }

  const tabs = [
    {
      key: "orders" as const,
      label: "Commandes",
      icon: <Package size={14} />,
      count: orders.length,
    },
    {
      key: "cart" as const,
      label: "Panier",
      icon: <ShoppingBag size={14} />,
      count: cart.length,
    },
    {
      key: "favorites" as const,
      label: "Favoris",
      icon: <Heart size={14} />,
      count: favourites.length,
    },
    {
      key: "interactions" as const,
      label: "Interactions",
      icon: <MessageSquare size={14} />,
      count: interactions.length,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <button onClick={onBack} style={backBtnStyle}>
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <div style={{ ...avatarStyle, width: 48, height: 48, fontSize: 18 }}>
          {(customer.name || customer.email).charAt(0).toUpperCase()}
        </div>
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--color-ink)",
              marginBottom: 2,
            }}
          >
            {customer.name || "Sans nom"}
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-ink4)" }}>
            <Mail
              size={11}
              style={{ marginRight: 5, verticalAlign: "middle" }}
            />
            {customer.email}
          </p>
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 14,
            fontSize: 12,
            color: "var(--color-ink3)",
          }}
        >
          <span>
            <Calendar
              size={12}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            Inscrit le {formatDate(customer.registrationDate)}
          </span>
          <span>
            <Clock
              size={12}
              style={{ marginRight: 4, verticalAlign: "middle" }}
            />
            {customer.lastLoginDate
              ? `Dernière connexion ${formatDateTime(customer.lastLoginDate)}`
              : "Aucune connexion enregistrée"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 2,
          borderBottom: "1px solid var(--color-border)",
          paddingBottom: 0,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...tabBtnStyle,
              color:
                activeTab === tab.key
                  ? "var(--color-accent)"
                  : "var(--color-ink3)",
              borderBottom:
                activeTab === tab.key
                  ? "2px solid var(--color-accent)"
                  : "2px solid transparent",
              fontWeight: activeTab === tab.key ? 700 : 500,
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span style={tabCountStyle(activeTab === tab.key)}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "orders" && (
        <OrdersList orders={orders} onNavigate={onNavigate} />
      )}
      {activeTab === "cart" && (
        <CartList items={cart} onQuickView={onQuickView} />
      )}
      {activeTab === "favorites" && (
        <FavouritesList items={favourites} onQuickView={onQuickView} />
      )}
      {activeTab === "interactions" && (
        <InteractionsTab
          interactions={interactions}
          loading={interactionsLoading}
          onNavigate={onNavigate}
        />
      )}
      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct?.(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────
function FavouritesList({
  items,
  onQuickView,
}: {
  items: Favourite[];
  onQuickView?: (product: AdminProduct) => void;
}) {
  const currencySymbol = useCurrencySymbol();
  if (items.length === 0)
    return <EmptyState icon={<Heart size={28} />} text="Aucun favori." />;
  return (
    <div style={cardStyle}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead style={theadStyle}>
          <tr>
            <th style={thStyle}>Produit</th>
            <th style={thStyle}>Prix</th>
            <th style={thStyle}>Date d'ajout</th>
          </tr>
        </thead>
        <tbody>
          {items.map((fav) => (
            <tr
              key={fav.id}
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <td style={tdStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={() =>
                      fav.product && onQuickView?.(fav.product as AdminProduct)
                    }
                    style={{
                      ...miniImgStyle,
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <img
                      src={fav.product?.image || PLACEHOLDER_IMG}
                      alt=""
                      style={imgStyle}
                    />
                  </button>
                  <button
                    onClick={() =>
                      fav.product && onQuickView?.(fav.product as AdminProduct)
                    }
                    style={{
                      fontWeight: 600,
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
                    {fav.product?.title || fav.productId}
                  </button>
                </div>
              </td>
              <td style={tdStyle}>
                {fav.product?.price != null
                  ? `${fav.product.price.toFixed(2)} ${currencySymbol}`
                  : "—"}
              </td>
              <td
                style={{ ...tdStyle, color: "var(--color-ink3)", fontSize: 12 }}
              >
                {formatDate(fav.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CartList({
  items,
  onQuickView,
}: {
  items: AdminCartItem[];
  onQuickView?: (product: AdminProduct) => void;
}) {
  const currencySymbol = useCurrencySymbol();

  if (items.length === 0)
    return <EmptyState icon={<ShoppingBag size={28} />} text="Panier vide." />;
  const total = items.reduce(
    (sum, i) => sum + (i.product?.price ?? 0) * i.quantity,
    0,
  );
  return (
    <div style={cardStyle}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead style={theadStyle}>
          <tr>
            <th style={thStyle}>Produit</th>
            <th style={thStyle}>Couleur</th>
            <th style={thStyle}>Taille</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Qté</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Prix</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <td style={tdStyle}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    onClick={() =>
                      item.product &&
                      onQuickView?.(item.product as AdminProduct)
                    }
                    style={{
                      ...miniImgStyle,
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    <img
                      src={item.product?.image || PLACEHOLDER_IMG}
                      alt=""
                      style={imgStyle}
                    />
                  </button>
                  <button
                    onClick={() =>
                      item.product &&
                      onQuickView?.(item.product as AdminProduct)
                    }
                    style={{
                      fontWeight: 600,
                      color: "var(--color-ink)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      padding: 0,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.product?.title || item.productId}
                  </button>
                </div>
              </td>
              <td style={tdStyle}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      ...colorSwatchStyle,
                      background: item.selectedColor,
                    }}
                  />
                  {item.selectedColor}
                </span>
              </td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>
                {item.selectedSize}
              </td>
              <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>
                {item.quantity}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "right",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {((item.product?.price ?? 0) * item.quantity).toFixed(2)}{" "}
                {currencySymbol}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={totalRowStyle}>
        <span>Total panier :</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {total.toFixed(2)} {currencySymbol}
        </span>
      </div>
    </div>
  );
}

function OrdersList({
  orders,
  onNavigate,
}: {
  orders: Order[];
  onNavigate?: (section: AdminSection) => void;
}) {
  const currencySymbol = useCurrencySymbol();

  if (orders.length === 0)
    return <EmptyState icon={<Package size={28} />} text="Aucune commande." />;
  return (
    <div style={cardStyle}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead style={theadStyle}>
          <tr>
            <th style={thStyle}>N° commande</th>
            <th style={thStyle}>Date</th>
            <th style={{ ...thStyle, textAlign: "right" }}>Montant</th>
            <th style={{ ...thStyle, textAlign: "center" }}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <td
                style={{ ...tdStyle, fontWeight: 600, fontFamily: "monospace" }}
              >
                <button
                  onClick={() => {
                    onNavigate?.("orders");
                    setTimeout(() => {
                      window.dispatchEvent(
                        new CustomEvent("instawear:highlight-orders", {
                          detail: order.id,
                        }),
                      );
                    }, 400);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-ink)",
                    fontWeight: 600,
                    fontFamily: "monospace",
                    fontSize: "inherit",
                    padding: 0,
                    textDecoration: "underline",
                    textUnderlineOffset: 3,
                  }}
                >
                  {/* {order.id.slice(0, 8)}… */}
                  {order.id}
                </button>
              </td>
              <td
                style={{ ...tdStyle, color: "var(--color-ink3)", fontSize: 12 }}
              >
                {formatDate(order.createdAt)}
              </td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "right",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {order.totalAmount.toFixed(2)} {currencySymbol}
              </td>
              <td style={{ ...tdStyle, textAlign: "center" }}>
                <OrderStatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// function interactionsTab
function InteractionsTab({
  interactions,
  loading,
  onNavigate,
}: {
  interactions: any[];
  loading: boolean;
  onNavigate?: (section: AdminSection) => void;
}) {
  if (loading) {
    return (
      <div style={centerStyle}>
        <div
          className="animate-spin"
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "2px solid var(--color-border)",
            borderTopColor: "var(--color-accent)",
          }}
        />
      </div>
    );
  }
  if (interactions.length === 0)
    return (
      <EmptyState
        icon={<MessageSquare size={28} />}
        text="Aucune interaction avec ce client."
      />
    );
  return (
    <div style={cardStyle}>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead style={theadStyle}>
          <tr>
            <th style={thStyle}>Sujet</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Statut</th>
            <th style={thStyle}>Dernier message</th>
          </tr>
        </thead>
        <tbody>
          {interactions.map((ticket: any) => (
            <tr
              key={ticket.id}
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <td style={tdStyle}>
                <p style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                  {ticket.subject}
                </p>
              </td>
              <td style={tdStyle}>
                <span style={{ fontSize: 12, color: "var(--color-ink2)" }}>
                  {ticket.type === "complaint"
                    ? "Réclamation"
                    : ticket.type === "question"
                      ? "Question"
                      : ticket.type === "feedback"
                        ? "Feedback"
                        : "Fidélisation"}
                </span>
              </td>
              <td style={tdStyle}>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    background:
                      ticket.status === "open"
                        ? "#fef3c7"
                        : ticket.status === "in_progress"
                          ? "#dbeafe"
                          : ticket.status === "resolved"
                            ? "#d1fae5"
                            : "#f3f4f6",
                    color:
                      ticket.status === "open"
                        ? "#92400e"
                        : ticket.status === "in_progress"
                          ? "#1e40af"
                          : ticket.status === "resolved"
                            ? "#065f46"
                            : "#6b7280",
                  }}
                >
                  {ticket.status === "open"
                    ? "Ouvert"
                    : ticket.status === "in_progress"
                      ? "En cours"
                      : ticket.status === "resolved"
                        ? "Résolu"
                        : "Fermé"}
                </span>
              </td>
              <td
                style={{ ...tdStyle, fontSize: 11, color: "var(--color-ink4)" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 200,
                    }}
                  >
                    {ticket.lastMessage || ticket.last_message || "—"}
                  </span>
                  <button
                    onClick={() => onNavigate?.("interactions")}
                    style={{
                      background: "var(--color-surface2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--color-ink2)",
                      cursor: "pointer",
                      flexShrink: 0,
                      marginLeft: 8,
                    }}
                  >
                    Voir
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Tiny reusable ────────────────────────────────────────────────────────
function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div
      style={{ textAlign: "center", padding: 40, color: "var(--color-ink4)" }}
    >
      <div style={{ marginBottom: 8, opacity: 0.5 }}>{icon}</div>
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const centerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 200,
};
const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
};
const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: "var(--color-ink)",
  marginBottom: 2,
};
const searchBarStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 14px",
  borderRadius: 14,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  maxWidth: 400,
};
const inputStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  outline: "none",
  flex: 1,
  fontSize: 13,
  color: "var(--color-ink)",
  fontFamily: "var(--font-body)",
};
const clearBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--color-ink4)",
  padding: 0,
};
const tableWrapperStyle: React.CSSProperties = {
  overflowX: "auto",
  borderRadius: 16,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
};
const theadStyle: React.CSSProperties = {
  background: "var(--color-surface2)",
  fontWeight: 700,
  color: "var(--color-ink2)",
};
const thStyle: React.CSSProperties = {
  padding: "12px 14px",
  textAlign: "left",
  whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "10px 14px",
  verticalAlign: "middle",
};
const avatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: "var(--color-accent)",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: 13,
  flexShrink: 0,
};
const iconBtn: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: 7,
  cursor: "pointer",
  color: "var(--color-ink2)",
  display: "inline-flex",
  alignItems: "center",
};
const backBtnStyle: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 10,
  padding: 8,
  cursor: "pointer",
  color: "var(--color-ink2)",
  display: "flex",
  alignItems: "center",
};
const tabBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: "12px 18px",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "var(--font-body)",
  display: "flex",
  alignItems: "center",
  gap: 6,
  transition: "color 0.18s, border-color 0.18s",
  whiteSpace: "nowrap",
};
const tabCountStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "var(--color-accent-soft)" : "var(--color-surface2)",
  color: active ? "var(--color-accent)" : "var(--color-ink4)",
  borderRadius: 999,
  padding: "1px 7px",
  fontSize: 10,
  fontWeight: 700,
});
const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  overflow: "hidden",
};
const miniImgStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 8,
  overflow: "hidden",
  background: "var(--color-surface2)",
  flexShrink: 0,
};
const imgStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};
const colorSwatchStyle: React.CSSProperties = {
  width: 14,
  height: 14,
  borderRadius: "50%",
  border: "1px solid var(--color-border)",
  display: "inline-block",
};
const totalRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  padding: "14px 20px",
  borderTop: "1px solid var(--color-border)",
  fontWeight: 700,
  fontSize: 14,
  color: "var(--color-ink)",
  gap: 8,
};
