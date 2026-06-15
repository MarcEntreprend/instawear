// src/admin/CustomersPage.tsx

import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { useCustomers } from "./adminHooks";
import { useCustomerDetail } from "./adminHooks";
import { Customer, Favourite, AdminCartItem, Order } from "./adminTypes";

const IMG =
  "https://cdn.pixabay.com/photo/2026/01/26/22/44/cat-10089737_1280.png";

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
export default function CustomersPage() {
  const { data: customers, loading } = useCustomers();

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Customer>("registrationDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

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
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={headerRowStyle}>
        <div>
          <h2 style={titleStyle}>Clients</h2>
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
                style={{ borderBottom: "1px solid var(--color-border)" }}
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
                      color: "var(--color-ink3)",
                      fontSize: 12,
                    }}
                  >
                    <Clock size={12} />
                    {formatDateTime(c.lastLoginDate)}
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
}: {
  customerId: string;
  onBack: () => void;
}) {
  const { data } = useCustomerDetail(customerId);
  const [activeTab, setActiveTab] = useState<"favorites" | "cart" | "orders">(
    "orders",
  );

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
      key: "favorites" as const,
      label: "Favoris",
      icon: <Heart size={14} />,
      count: favourites.length,
    },
    {
      key: "cart" as const,
      label: "Panier",
      icon: <ShoppingBag size={14} />,
      count: cart.length,
    },
    {
      key: "orders" as const,
      label: "Commandes",
      icon: <Package size={14} />,
      count: orders.length,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Back + customer info */}
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
            Dernière connexion {formatDateTime(customer.lastLoginDate)}
          </span>
        </div>
      </div>

      {/* Tabs */}
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

      {/* Tab content */}
      {activeTab === "favorites" && <FavouritesList items={favourites} />}
      {activeTab === "cart" && <CartList items={cart} />}
      {activeTab === "orders" && <OrdersList orders={orders} />}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────
function FavouritesList({ items }: { items: Favourite[] }) {
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
                  <div style={miniImgStyle}>
                    <img
                      src={fav.product?.image || IMG}
                      alt=""
                      style={imgStyle}
                    />
                  </div>
                  <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                    {fav.product?.title || fav.productId}
                  </span>
                </div>
              </td>
              <td style={tdStyle}>
                {fav.product?.price != null
                  ? `${fav.product.price.toFixed(2)} $`
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

function CartList({ items }: { items: AdminCartItem[] }) {
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
                  <div style={miniImgStyle}>
                    <img
                      src={item.product?.image || IMG}
                      alt=""
                      style={imgStyle}
                    />
                  </div>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--color-ink)",
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.product?.title || item.productId}
                  </span>
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
                {((item.product?.price ?? 0) * item.quantity).toFixed(2)} $
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={totalRowStyle}>
        <span>Total panier :</span>
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {total.toFixed(2)} $
        </span>
      </div>
    </div>
  );
}

function OrdersList({ orders }: { orders: Order[] }) {
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
                {order.id.slice(0, 8)}…
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
                {order.totalAmount.toFixed(2)} $
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
