// src/components/AccountPage.tsx
//
// Redesign UX — visuel uniquement, zéro modification de logique métier.
// Layout: sidebar identité (desktop) + bottom-nav (mobile), contenu scrollable.
// Dark mode: 100% automatique via les variables CSS du design system.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Package,
  Heart,
  MessageSquare,
  User,
  ArrowLeft,
  Eye,
  Plus,
  Minus,
  Loader2,
  Send,
  MapPin,
  ChevronRight,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  XCircle,
  Trash2,
  Star,
  ShoppingBag,
  Home,
  Edit3,
  Copy,
  ExternalLink,
  AlertCircle,
  Inbox,
  LogOut,
  Search,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { customerApi, interactionApi } from "../api/supabaseApi";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { PLACEHOLDER_IMG } from "../constants/assets";
import type { Order, Favourite, AdminCartItem } from "../admin/adminTypes";

// ─── Props ────────────────────────────────────────────────────────────
interface AccountPageProps {
  allCustomers: { id: string; email: string }[];
  onClose: () => void;
  onViewProduct?: (productId: string) => void;
}

// ─── Local types ─────────────────────────────────────────────────────
interface Interaction {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  lastMessage?: string;
}

type TabKey = "orders" | "favorites" | "cart" | "support" | "profile";

// ─── Status config ────────────────────────────────────────────────────
const ORDER_STATUS: Record<
  string,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    step: number;
  }
> = {
  paid: {
    label: "Paid",
    icon: <CheckCircle2 size={12} strokeWidth={2} />,
    color: "#2563eb",
    bg: "#dbeafe",
    step: 0,
  },
  pending: {
    label: "Pending",
    icon: <Clock size={12} strokeWidth={2} />,
    color: "#d97706",
    bg: "#fef3c7",
    step: 1,
  },
  in_production: {
    label: "In Production",
    icon: <Box size={12} strokeWidth={2} />,
    color: "#7c3aed",
    bg: "#ede9fe",
    step: 2,
  },
  shipped: {
    label: "Shipped",
    icon: <Truck size={12} strokeWidth={2} />,
    color: "#059669",
    bg: "#d1fae5",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    icon: <CheckCircle2 size={12} strokeWidth={2} />,
    color: "#166534",
    bg: "#dcfce7",
    step: 4,
  },
  cancelled: {
    label: "Cancelled",
    icon: <XCircle size={12} strokeWidth={2} />,
    color: "#991b1b",
    bg: "#fee2e2",
    step: -1,
  },
};

const STATUS_STEPS = [
  "Paid",
  "Pending",
  "In Production",
  "Shipped",
  "Delivered",
];

// ─── Helpers ──────────────────────────────────────────────────────────
function initials(email: string, name?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Main component ───────────────────────────────────────────────────
export default function AccountPage({
  allCustomers,
  onClose,
  onViewProduct,
}: AccountPageProps) {
  const currencySymbol = useCurrencySymbol();

  // ── Auth & customer ──────────────────────────────────────────────
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.email) return;
      const cust = allCustomers.find((c) => c.email === user.email);
      if (cust) {
        setCustomerId(cust.id);
        setCustomerEmail(user.email);
        setCustomerName(user.user_metadata?.full_name || "");
      }
    });
  }, [allCustomers]);

  // ── Navigation ───────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>("orders");

  // ── Data ─────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [favorites, setFavorites] = useState<Favourite[]>([]);
  const [loadingFav, setLoadingFav] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInter, setLoadingInter] = useState(false);

  // ── Cart ─────────────────────────────────────────────────────────
  const [cart, setCart] = useState<AdminCartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!customerId) return;
    setLoadingCart(true);
    try {
      const data = await customerApi.getCart(customerId);
      setCart(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCart(false);
    }
  }, [customerId]);

  const handleRemoveCartItem = async (itemId: string) => {
    if (!customerId) return;
    const updated = cart.filter((item) => item.id !== itemId);
    await customerApi.clearCart(customerId);
    for (const item of updated) {
      await customerApi.addCartItem(customerId, {
        productId: item.productId,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
      });
    }
    setCart(updated);
  };

  const handleClearCart = async () => {
    if (!customerId) return;
    if (!window.confirm("Are you sure you want to clear your entire cart?"))
      return;
    await customerApi.clearCart(customerId);
    setCart([]);
  };

  const handleUpdateCartQty = async (itemId: string, delta: number) => {
    if (!customerId) return;
    const updated = cart
      .map((item) => {
        if (item.id !== itemId) return item;
        const newQty = item.quantity + delta;
        return newQty <= 0 ? null : { ...item, quantity: newQty };
      })
      .filter(Boolean) as AdminCartItem[];

    await customerApi.clearCart(customerId);
    for (const item of updated) {
      await customerApi.addCartItem(customerId, {
        productId: item.productId,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
      });
    }
    setCart(updated);
  };

  const handleRemoveFavourite = async (productId: string) => {
    if (!customerId) return;
    await customerApi.removeFavourite(customerId, productId);
    setFavorites((prev) => prev.filter((f) => f.productId !== productId));
  };

  const handleRemoveAllFavourites = async () => {
    if (!customerId) return;
    if (!window.confirm("Are you sure you want to remove all saved items?"))
      return;
    for (const fav of favorites) {
      await customerApi.removeFavourite(customerId, fav.productId);
    }
    setFavorites([]);
  };

  const fetchOrders = useCallback(async () => {
    if (!customerId) return;
    setLoadingOrders(true);
    try {
      setOrders(await customerApi.getOrders(customerId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingOrders(false);
    }
  }, [customerId]);

  const fetchFavorites = useCallback(async () => {
    if (!customerId) return;
    setLoadingFav(true);
    try {
      setFavorites(await customerApi.getFavourites(customerId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFav(false);
    }
  }, [customerId]);

  const fetchInteractions = useCallback(async () => {
    if (!customerEmail) return;
    setLoadingInter(true);
    try {
      setInteractions(await interactionApi.list({ search: customerEmail }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInter(false);
    }
  }, [customerEmail]);

  // Charge les données (orders toujours rafraîchies)
  useEffect(() => {
    if (tab === "orders") fetchOrders();
    if (tab === "favorites" && favorites.length === 0) fetchFavorites();
    if (tab === "support" && interactions.length === 0) fetchInteractions();
    if (tab === "cart" && cart.length === 0) fetchCart();
  }, [tab, fetchOrders, fetchFavorites, fetchInteractions, fetchCart]);

  // ── Stats (computed) ──────────────────────────────────────────────
  const totalSpent = orders.reduce((a, o) => a + o.totalAmount, 0);
  const memberSince =
    orders.length > 0
      ? new Date(
          Math.min(...orders.map((o) => new Date(o.createdAt).getTime())),
        ).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : "—";

  // ── Tab labels ────────────────────────────────────────────────────
  const NAV: {
    key: TabKey;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      key: "orders",
      label: "Orders",
      icon: <Package size={18} strokeWidth={1.75} />,
      badge:
        orders.filter(
          (o) => o.status !== "delivered" && o.status !== "cancelled",
        ).length || undefined,
    },
    {
      key: "favorites",
      label: "Saved",
      icon: <Heart size={18} strokeWidth={1.75} />,
      badge: favorites.length || undefined,
    },
    {
      key: "cart",
      label: "Cart",
      icon: <ShoppingBag size={18} strokeWidth={1.75} />,
      badge: cart.length || undefined,
    },
    {
      key: "support",
      label: "Support",
      icon: <MessageSquare size={18} strokeWidth={1.75} />,
      badge:
        interactions.filter((i) => i.status === "open").length || undefined,
    },
    {
      key: "profile",
      label: "Profile",
      icon: <User size={18} strokeWidth={1.75} />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      {/* ── Top bar (mobile only) ─────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-3 sm:hidden"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
          style={{ color: "var(--color-ink3)" }}
        >
          <ArrowLeft size={18} strokeWidth={2} />
        </button>
        <span
          className="text-[15px] font-bold"
          style={{ color: "var(--color-ink)" }}
        >
          My Account
        </span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-black text-white"
          style={{ background: "var(--color-accent)" }}
        >
          {customerId ? initials(customerEmail, customerName) : "?"}
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar (desktop ≥ sm) ────────────────────────────── */}
        <aside
          className="hidden sm:flex w-64 flex-col shrink-0 overflow-y-auto"
          style={{
            borderRight: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          {/* Identity card */}
          <div className="p-6 pb-5">
            <button
              onClick={onClose}
              className="mb-5 flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
              style={{ color: "var(--color-ink4)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--color-ink2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--color-ink4)")
              }
            >
              <ArrowLeft size={13} strokeWidth={2} /> Back to store
            </button>

            {/* Avatar */}
            <div className="mb-4 flex flex-col items-start gap-3">
              <div
                className="relative flex h-14 w-14 items-center justify-center rounded-[18px] text-xl font-black text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
                  boxShadow: "var(--shadow-accent)",
                }}
              >
                {customerId ? initials(customerEmail, customerName) : "?"}
                {/* Online dot */}
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2"
                  style={{
                    background: "var(--color-emerald)",
                    borderColor: "var(--color-surface)",
                  }}
                />
              </div>
              <div className="min-w-0">
                <p
                  className="truncate text-[15px] font-bold"
                  style={{ color: "var(--color-ink)" }}
                >
                  {customerName || "Guest"}
                </p>
                <p
                  className="truncate text-[12px]"
                  style={{ color: "var(--color-ink4)" }}
                >
                  {customerEmail}
                </p>
              </div>
            </div>

            {/* Stats mini */}
            <div
              className="grid grid-cols-2 gap-2 rounded-[14px] p-3"
              style={{ background: "var(--color-surface2)" }}
            >
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-ink4)" }}
                >
                  Orders
                </p>
                <p
                  className="text-[18px] font-black tabular-nums"
                  style={{ color: "var(--color-ink)" }}
                >
                  {orders.length}
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-ink4)" }}
                >
                  Saved
                </p>
                <p
                  className="text-[18px] font-black tabular-nums"
                  style={{ color: "var(--color-ink)" }}
                >
                  {favorites.length}
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-ink4)" }}
                >
                  Total spent
                </p>
                <p
                  className="text-[14px] font-bold tabular-nums"
                  style={{ color: "var(--color-accent)" }}
                >
                  {currencySymbol}
                  {totalSpent.toFixed(0)}
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-ink4)" }}
                >
                  Member since
                </p>
                <p
                  className="text-[12px] font-semibold"
                  style={{ color: "var(--color-ink3)" }}
                >
                  {memberSince}
                </p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 px-3 pb-4 flex-1">
            {NAV.map(({ key, label, icon, badge }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-all duration-150 text-left"
                style={{
                  background:
                    tab === key ? "var(--color-accent-bg)" : "transparent",
                  color:
                    tab === key ? "var(--color-accent)" : "var(--color-ink2)",
                }}
                onMouseEnter={(e) => {
                  if (tab !== key)
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--color-surface2)";
                }}
                onMouseLeave={(e) => {
                  if (tab !== key)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                <span
                  style={{
                    color:
                      tab === key ? "var(--color-accent)" : "var(--color-ink4)",
                  }}
                >
                  {icon}
                </span>
                <span className="flex-1">{label}</span>
                {badge !== undefined && (
                  <span
                    className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold"
                    style={{
                      background:
                        tab === key
                          ? "var(--color-accent)"
                          : "var(--color-surface2)",
                      color: tab === key ? "white" : "var(--color-ink3)",
                    }}
                  >
                    {badge}
                  </span>
                )}
                {tab === key && (
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    style={{ color: "var(--color-accent)" }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Sign out */}
          <div className="p-4 pt-0">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                onClose();
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors"
              style={{ color: "var(--color-ink4)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--color-surface2)";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-ink2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--color-ink4)";
              }}
            >
              <LogOut size={15} strokeWidth={1.75} /> Sign out
            </button>
          </div>
        </aside>

        {/* ── Content ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto pb-20 sm:pb-0">
          <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
            {/* Section heading */}
            <div className="mb-5 hidden sm:flex items-center justify-between">
              <h2
                className="text-[20px] font-bold tracking-tight"
                style={{ color: "var(--color-ink)" }}
              >
                {NAV.find((n) => n.key === tab)?.label}
              </h2>
            </div>

            {tab === "orders" && (
              <OrdersTab
                orders={orders}
                loading={loadingOrders}
                currencySymbol={currencySymbol}
                onViewProduct={onViewProduct}
              />
            )}
            {tab === "favorites" && (
              <FavoritesTab
                favorites={favorites}
                loading={loadingFav}
                currencySymbol={currencySymbol}
                onRemove={handleRemoveFavourite}
                onRemoveAll={handleRemoveAllFavourites}
                onViewProduct={onViewProduct}
              />
            )}
            {tab === "cart" && (
              <CartTab
                items={cart}
                loading={loadingCart}
                currencySymbol={currencySymbol}
                onRemove={handleRemoveCartItem}
                onClear={handleClearCart}
                onViewProduct={onViewProduct}
                onUpdateQty={handleUpdateCartQty}
              />
            )}
            {tab === "support" && (
              <SupportTab
                interactions={interactions}
                loading={loadingInter}
                customerEmail={customerEmail}
                customerName={customerName}
              />
            )}
            {tab === "profile" && (
              <ProfileTab
                customerEmail={customerEmail}
                customerName={customerName}
                orders={orders}
              />
            )}
          </div>
        </main>
      </div>

      {/* ── Bottom nav (mobile) ─────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-10 flex sm:hidden"
        style={{
          background: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {NAV.map(({ key, label, icon, badge }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="relative flex flex-1 flex-col items-center gap-1 py-3 transition-colors"
            style={{
              color: tab === key ? "var(--color-accent)" : "var(--color-ink4)",
            }}
          >
            <span className="relative">
              {icon}
              {badge !== undefined && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  {badge}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold">{label}</span>
            {tab === key && (
              <span
                className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
                style={{ background: "var(--color-accent)" }}
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── OrdersTab ────────────────────────────────────────────────────────
function OrdersTab({
  orders,
  loading,
  currencySymbol,
  onViewProduct,
}: {
  orders: Order[];
  loading: boolean;
  currencySymbol: string;
  onViewProduct?: (productId: string) => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");

  // Filtrage + tri
  const filtered = useMemo(() => {
    let list = [...orders];

    // Recherche textuelle
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(s) ||
          (o.clientName || "").toLowerCase().includes(s) ||
          (o.clientEmail || "").toLowerCase().includes(s),
      );
    }

    // Filtre par statut
    if (filterStatus !== "all") {
      list = list.filter((o) => o.status === filterStatus);
    }

    // Tri par date
    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });

    return list;
  }, [orders, search, filterStatus, sortOrder]);

  if (loading) return <SkeletonList />;
  if (loadingDetail)
    return (
      <div className="flex justify-center py-12">
        <Loader2
          size={28}
          className="animate-spin"
          style={{ color: "var(--color-accent)" }}
        />
      </div>
    );
  if (selectedOrder)
    return (
      <OrderDetail
        order={selectedOrder}
        currencySymbol={currencySymbol}
        onBack={() => setSelectedOrder(null)}
        onViewProduct={onViewProduct}
      />
    );

  if (orders.length === 0)
    return (
      <EmptyState
        icon={<ShoppingBag size={28} strokeWidth={1.5} />}
        title="No orders yet"
        sub="Your order history will appear here after your first purchase."
      />
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Barre de recherche + filtres */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div
          className="flex items-center gap-2 flex-1 min-w-0 rounded-xl border px-3 py-2"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <Search
            size={14}
            strokeWidth={1.75}
            style={{ color: "var(--color-ink4)", flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="Search by order ID or customer name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px]"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="shrink-0"
              style={{ color: "var(--color-ink4)" }}
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Filtre statut */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl border px-3 py-2 text-[12.5px] font-medium outline-none cursor-pointer"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-ink2)",
          }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="in_production">In Production</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {/* Tri */}
        <button
          onClick={() =>
            setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))
          }
          className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12.5px] font-medium transition-colors"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-ink2)",
          }}
        >
          <Clock size={13} strokeWidth={1.75} />
          {sortOrder === "newest" ? "Newest" : "Oldest"}
        </button>

        {/* Reset */}
        {(search || filterStatus !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterStatus("all");
            }}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors"
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-accent)",
            }}
          >
            <X size={12} strokeWidth={2} /> Reset
          </button>
        )}
      </div>

      {/* Résultat */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={28} strokeWidth={1.5} />}
          title="No orders match"
          sub="Try adjusting your search or filters."
        />
      ) : (
        filtered.map((order) => {
          const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
          const isActive =
            order.status !== "delivered" && order.status !== "cancelled";
          return (
            <button
              key={order.id}
              onClick={async () => {
                setLoadingDetail(true);
                try {
                  const { data: refreshed, error } = await supabase
                    .from("orders")
                    .select("*, order_items(*)")
                    .eq("id", order.id)
                    .single();
                  if (!error && refreshed) {
                    const items = (refreshed.order_items || []).map(
                      (item: any) => ({
                        id: item.id,
                        orderId: item.order_id,
                        productId: item.product_id,
                        productTitle: item.product_title,
                        productImage: item.product_image,
                        selectedColor: item.selected_color,
                        selectedSize: item.selected_size,
                        quantity: item.quantity,
                        unitPrice: item.unit_price,
                      }),
                    );
                    setSelectedOrder({
                      id: refreshed.id,
                      clientId: refreshed.client_id,
                      clientName: refreshed.client_name,
                      clientEmail: refreshed.client_email,
                      createdAt: refreshed.created_at,
                      status: refreshed.status,
                      totalAmount: refreshed.total_amount,
                      shippingCost: refreshed.shipping_cost,
                      shippingAddress: {
                        fullName: refreshed.shipping_address_full_name,
                        address: refreshed.shipping_address_address,
                        city: refreshed.shipping_address_city,
                        zip: refreshed.shipping_address_zip,
                        country: refreshed.shipping_address_country,
                        phone: refreshed.shipping_address_phone,
                      },
                      externalOrderId: refreshed.external_order_id,
                      notes: refreshed.notes,
                      items,
                    } as Order);
                  } else {
                    setSelectedOrder(order);
                  }
                } catch {
                  setSelectedOrder(order);
                } finally {
                  setLoadingDetail(false);
                }
              }}
              className="w-full text-left rounded-2xl border p-4 transition-all duration-200 hover:shadow-(--shadow-md) active:scale-[0.99]"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p
                      className="truncate text-[13px] font-bold"
                      style={{ color: "var(--color-ink)" }}
                    >
                      {order.id}
                    </p>
                    {isActive && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: "var(--color-accent)" }}
                      />
                    )}
                  </div>
                  <p
                    className="text-[12px]"
                    style={{ color: "var(--color-ink4)" }}
                  >
                    {formatDate(order.createdAt)} · {order.items?.length ?? 0}{" "}
                    item{(order.items?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className="text-[15px] font-black tabular-nums"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {currencySymbol}
                    {order.totalAmount.toFixed(2)}
                  </span>
                  <StatusPill status={order.status} />
                </div>
              </div>

              {/* Item thumbnails */}
              {order.items && order.items.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5">
                  {order.items.slice(0, 4).map((item, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        item.productId && onViewProduct?.(item.productId);
                      }}
                      className="h-9 w-9 rounded-lg overflow-hidden border-none p-0 cursor-pointer"
                      style={{ border: "1px solid var(--color-border)" }}
                    >
                      <img
                        src={item.productImage || PLACEHOLDER_IMG}
                        alt={item.productTitle || "item"}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                  {order.items.length > 4 && (
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-bold"
                      style={{
                        background: "var(--color-surface2)",
                        color: "var(--color-ink3)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      +{order.items.length - 4}
                    </div>
                  )}
                  <ChevronRight
                    size={16}
                    strokeWidth={1.75}
                    className="ml-auto"
                    style={{ color: "var(--color-ink4)" }}
                  />
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}

// ─── OrderDetail ──────────────────────────────────────────────────────
function OrderDetail({
  order,
  currencySymbol,
  onBack,
  onViewProduct,
}: {
  order: Order;
  currencySymbol: string;
  onBack: () => void;
  onViewProduct?: (productId: string) => void;
}) {
  const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending;

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13px] font-semibold self-start"
        style={{ color: "var(--color-ink3)" }}
      >
        <ArrowLeft size={14} strokeWidth={2} /> All Orders
      </button>

      {/* Status timeline */}
      {order.status !== "cancelled" && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--color-ink4)" }}
            >
              Order Status
            </p>
            <StatusPill status={order.status} />
          </div>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
              const reached = st.step >= i;
              const current = st.step === i;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300"
                      style={{
                        background: reached
                          ? "var(--color-accent)"
                          : "var(--color-surface2)",
                        border: current
                          ? "2px solid var(--color-accent)"
                          : `2px solid ${reached ? "var(--color-accent)" : "var(--color-border)"}`,
                        boxShadow: current
                          ? "0 0 0 3px var(--color-accent-bg)"
                          : "none",
                      }}
                    >
                      {reached ? (
                        <CheckCircle2
                          size={13}
                          strokeWidth={2.5}
                          style={{ color: "white" }}
                        />
                      ) : (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: "var(--color-border)" }}
                        />
                      )}
                    </div>
                    <span
                      className="text-[9px] font-semibold text-center leading-tight whitespace-nowrap"
                      style={{
                        color: reached
                          ? "var(--color-ink2)"
                          : "var(--color-ink4)",
                      }}
                    >
                      {step}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className="mx-1 h-0.5 flex-1 rounded-full transition-all duration-500"
                      style={{
                        background:
                          st.step > i
                            ? "var(--color-accent)"
                            : "var(--color-border)",
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Order info */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--color-ink4)" }}
            >
              Order ID
            </p>
            <p
              className="text-[15px] font-black"
              style={{ color: "var(--color-ink)", fontFamily: "monospace" }}
            >
              {order.id}
            </p>
          </div>
          <p className="text-[12px]" style={{ color: "var(--color-ink4)" }}>
            {formatDate(order.createdAt)}
          </p>
        </div>

        {/* Items */}
        <div
          className="flex flex-col gap-3 pt-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <button
                onClick={() =>
                  item.productId && onViewProduct?.(item.productId)
                }
                className="h-14 w-14 shrink-0 rounded-[10px] overflow-hidden border-none p-0 cursor-pointer"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <img
                  src={item.productImage || PLACEHOLDER_IMG}
                  alt={item.productTitle || "item"}
                  className="h-full w-full object-cover"
                />
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() =>
                    item.productId && onViewProduct?.(item.productId)
                  }
                  className="truncate text-[13px] font-semibold text-left bg-transparent border-none p-0 cursor-pointer hover:underline"
                  style={{ color: "var(--color-ink)" }}
                >
                  {item.productTitle}
                </button>
                <p
                  className="text-[11.5px] mt-0.5"
                  style={{ color: "var(--color-ink4)" }}
                >
                  Size {item.selectedSize} · Qty {item.quantity}
                </p>
              </div>
              <span
                className="text-[13px] font-bold tabular-nums shrink-0"
                style={{ color: "var(--color-ink)" }}
              >
                {currencySymbol}
                {(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div
          className="mt-4 flex flex-col gap-1.5 pt-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          {order.shippingCost != null && (
            <div
              className="flex justify-between text-[12.5px]"
              style={{ color: "var(--color-ink3)" }}
            >
              <span>Shipping</span>
              <span>
                {order.shippingCost === 0
                  ? "Free"
                  : `${currencySymbol}${order.shippingCost.toFixed(2)}`}
              </span>
            </div>
          )}
          <div
            className="flex justify-between text-[15px] font-black"
            style={{ color: "var(--color-ink)" }}
          >
            <span>Total</span>
            <span className="tabular-nums">
              {currencySymbol}
              {order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Shipping address */}
      {order.shippingAddress && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <MapPin
              size={14}
              strokeWidth={1.75}
              style={{ color: "var(--color-ink4)" }}
            />
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--color-ink4)" }}
            >
              Shipping Address
            </p>
          </div>
          <p
            className="text-[13px] font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            {order.shippingAddress.fullName}
          </p>
          <p className="text-[12.5px]" style={{ color: "var(--color-ink3)" }}>
            {order.shippingAddress.address}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.zip} ·{" "}
            {order.shippingAddress.country}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── FavoritesTab ─────────────────────────────────────────────────────
function FavoritesTab({
  favorites,
  loading,
  currencySymbol,
  onRemove,
  onRemoveAll,
  onViewProduct,
}: {
  favorites: Favourite[];
  loading: boolean;
  currencySymbol: string;
  onRemove: (productId: string) => void;
  onRemoveAll: () => void;
  onViewProduct?: (productId: string) => void;
}) {
  if (loading) return <SkeletonGrid />;
  if (favorites.length === 0)
    return (
      <EmptyState
        icon={<Heart size={28} strokeWidth={1.5} />}
        title="Nothing saved yet"
        sub="Tap the heart icon on any product to save it here for later."
      />
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Remove all button */}
      <div className="flex justify-end">
        <button
          onClick={onRemoveAll}
          className="flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
          style={{
            background: "var(--color-surface2)",
            color: "var(--color-ink4)",
            border: "1px solid var(--color-border)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#FEF2F2";
            (e.currentTarget as HTMLElement).style.color = "#EF4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-surface2)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-ink4)";
          }}
        >
          <Trash2 size={12} strokeWidth={2} /> Remove all
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {favorites.map((fav) => (
          <div
            key={fav.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-200 hover:shadow-(--shadow-md)"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div
              className="aspect-square overflow-hidden"
              style={{ background: "var(--color-surface2)" }}
            >
              <img
                src={fav.product?.image || PLACEHOLDER_IMG}
                alt={fav.product?.title || "product"}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(fav.productId);
              }}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-rose-500 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:bg-white hover:shadow-sm"
            >
              <Trash2 size={13} strokeWidth={2.5} />
            </button>

            <div className="flex flex-col gap-1 p-3">
              <p
                className="line-clamp-2 text-[12.5px] font-semibold leading-snug"
                style={{ color: "var(--color-ink)" }}
              >
                {fav.product?.title || "Product unavailable"}
              </p>
              {fav.product?.price != null && (
                <p
                  className="text-[13px] font-black tabular-nums"
                  style={{ color: "var(--color-accent)" }}
                >
                  {currencySymbol}
                  {fav.product.price.toFixed(2)}
                </p>
              )}
            </div>

            {/* Hover — "View product" pill */}
            <button
              onClick={() => onViewProduct?.(fav.productId)}
              className="absolute inset-x-2 bottom-2 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
            >
              <div
                className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold text-white"
                style={{ background: "var(--color-accent)" }}
              >
                <Eye size={12} strokeWidth={2} /> View
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CartTab ──────────────────────────────────────────────────────────
function CartTab({
  items,
  loading,
  currencySymbol,
  onRemove,
  onClear,
  onViewProduct,
  onUpdateQty,
}: {
  items: AdminCartItem[];
  loading: boolean;
  currencySymbol: string;
  onRemove: (itemId: string) => void;
  onClear: () => void;
  onViewProduct?: (productId: string) => void;
  onUpdateQty: (itemId: string, delta: number) => void;
}) {
  if (loading) return <SkeletonList />;
  if (items.length === 0)
    return (
      <EmptyState
        icon={<ShoppingBag size={28} strokeWidth={1.5} />}
        title="Your cart is empty"
        sub="Items added to your cart will appear here."
      />
    );

  const total = items.reduce(
    (sum, item) => sum + (item.product?.price ?? 0) * item.quantity,
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Clear all button */}
      <div className="flex justify-end">
        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded-[10px] px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
          style={{
            background: "var(--color-surface2)",
            color: "var(--color-ink4)",
            border: "1px solid var(--color-border)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "#FEF2F2";
            (e.currentTarget as HTMLElement).style.color = "#EF4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--color-surface2)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-ink4)";
          }}
        >
          <Trash2 size={12} strokeWidth={2} /> Clear cart
        </button>
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 rounded-2xl border p-3"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <button
            onClick={() => onViewProduct?.(item.productId)}
            className="h-14 w-14 shrink-0 rounded-[10px] overflow-hidden border-none p-0 cursor-pointer"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <img
              src={item.product?.image || PLACEHOLDER_IMG}
              alt={item.product?.title || "product"}
              className="h-full w-full object-cover"
            />
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onViewProduct?.(item.productId)}
              className="truncate text-[13px] font-semibold text-left bg-transparent border-none p-0 cursor-pointer hover:underline"
              style={{ color: "var(--color-ink)" }}
            >
              {item.product?.title || "Product"}
            </button>
            <p className="text-[11.5px]" style={{ color: "var(--color-ink4)" }}>
              Size {item.selectedSize} · Qty {item.quantity}
              {item.selectedColor && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <span
                    className="inline-block h-3 w-3 rounded-full border"
                    style={{
                      backgroundColor: item.selectedColor,
                      borderColor: "var(--color-border)",
                    }}
                  />
                </span>
              )}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span
                className="text-[13px] font-bold tabular-nums"
                style={{ color: "var(--color-ink)" }}
              >
                {currencySymbol}
                {((item.product?.price ?? 0) * item.quantity).toFixed(2)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateQty(item.id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                  style={{
                    background: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-ink2)",
                  }}
                >
                  <Minus size={12} strokeWidth={2.5} />
                </button>
                <span
                  className="w-7 text-center text-sm font-bold tabular-nums"
                  style={{ color: "var(--color-ink)" }}
                >
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQty(item.id, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
                  style={{
                    background: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-ink2)",
                  }}
                >
                  <Plus size={12} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => onRemove(item.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg ml-1 transition-colors"
                  style={{ color: "#EF4444" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#FEF2F2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Total */}
      <div
        className="flex justify-between rounded-2xl border p-4"
        style={{
          background: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <span
          className="text-[14px] font-bold"
          style={{ color: "var(--color-ink)" }}
        >
          Cart total
        </span>
        <span
          className="text-[14px] font-black tabular-nums"
          style={{ color: "var(--color-accent)" }}
        >
          {currencySymbol}
          {total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ─── SupportTab ───────────────────────────────────────────────────────
function SupportTab({
  interactions,
  loading,
  customerEmail,
  customerName,
}: {
  interactions: Interaction[];
  loading: boolean;
  customerEmail: string;
  customerName: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const { data: inter } = await supabase
        .from("interactions")
        .insert({
          customer_id: customerEmail,
          customer_name: customerName || "Customer",
          customer_email: customerEmail,
          type: "question",
          status: "open",
          subject: subject.trim(),
          last_message: message.trim(),
        })
        .select()
        .single();
      if (inter) {
        await supabase.from("interaction_messages").insert({
          interaction_id: inter.id,
          from_field: "customer",
          text: message.trim(),
        });
      }
      setSent(true);
      setTimeout(() => {
        setShowForm(false);
        setSent(false);
        setSubject("");
        setMessage("");
      }, 1800);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <SkeletonList />;

  if (showForm) {
    return (
      <div className="flex flex-col gap-4 animate-fade-up">
        <button
          onClick={() => setShowForm(false)}
          className="flex items-center gap-1.5 text-[13px] font-semibold self-start"
          style={{ color: "var(--color-ink3)" }}
        >
          <ArrowLeft size={14} strokeWidth={2} /> Back
        </button>

        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p
            className="mb-4 text-[15px] font-bold"
            style={{ color: "var(--color-ink)" }}
          >
            New message
          </p>

          {sent ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center animate-scale-in">
              <CheckCircle2
                size={36}
                strokeWidth={1.5}
                style={{ color: "var(--color-emerald)" }}
              />
              <p
                className="text-[14px] font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                Message sent
              </p>
              <p
                className="text-[12.5px]"
                style={{ color: "var(--color-ink4)" }}
              >
                We'll get back to you shortly.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-ink4)" }}
                >
                  Subject
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wrong size received"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none transition-colors"
                  style={{
                    background: "var(--color-surface2)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-sans)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-border)")
                  }
                />
              </div>
              <div>
                <label
                  className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-ink4)" }}
                >
                  Message
                </label>
                <textarea
                  placeholder="Describe your issue or question…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border px-3.5 py-2.5 text-[13.5px] outline-none transition-colors"
                  style={{
                    background: "var(--color-surface2)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-sans)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-border)")
                  }
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={sending || !subject.trim() || !message.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13.5px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  background: "var(--color-accent)",
                  boxShadow: "var(--shadow-accent)",
                }}
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={15} strokeWidth={2} />
                )}
                {sending ? "Sending…" : "Send message"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {interactions.length === 0 ? (
        <EmptyState
          icon={<Inbox size={28} strokeWidth={1.5} />}
          title="No conversations yet"
          sub="Have a question or issue? Our team typically responds within a few hours."
          action={{
            label: "Contact Support",
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 self-end rounded-[10px] px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-150 active:scale-[0.97]"
            style={{
              background: "var(--color-accent-bg)",
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent)" + "30",
            }}
          >
            <Plus size={14} strokeWidth={2.5} /> New message
          </button>

          {interactions.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl p-4"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[13.5px] font-semibold"
                    style={{ color: "var(--color-ink)" }}
                  >
                    {t.subject}
                  </p>
                  {t.lastMessage && (
                    <p
                      className="mt-1 line-clamp-2 text-[12px]"
                      style={{ color: "var(--color-ink4)" }}
                    >
                      {t.lastMessage}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    style={{
                      background:
                        t.status === "open"
                          ? "#fef3c7"
                          : "var(--color-surface2)",
                      color:
                        t.status === "open" ? "#d97706" : "var(--color-ink4)",
                    }}
                  >
                    {t.status === "open" ? "Open" : "Resolved"}
                  </span>
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--color-ink4)" }}
                  >
                    {timeAgo(t.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── ProfileTab ───────────────────────────────────────────────────────
function ProfileTab({
  customerEmail,
  customerName,
  orders,
}: {
  customerEmail: string;
  customerName: string;
  orders: Order[];
}) {
  const [copied, setCopied] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText(customerEmail).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  // Extract latest shipping address from most recent order that has one
  const savedAddress =
    orders
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .find((o) => o.shippingAddress)?.shippingAddress ?? null;

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      {/* Identity card */}
      <div
        className="rounded-[18px] p-5"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="mb-4 flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] text-2xl font-black text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            {customerEmail ? initials(customerEmail, customerName) : "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="text-[17px] font-bold"
              style={{ color: "var(--color-ink)" }}
            >
              {customerName || "Guest User"}
            </p>
            <p className="text-[12.5px]" style={{ color: "var(--color-ink4)" }}>
              InstaWear Customer
            </p>
          </div>
        </div>

        <div
          className="flex flex-col gap-3 pt-4"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--color-ink4)" }}
              >
                Name
              </p>
              <p
                className="text-[13.5px] font-medium"
                style={{ color: "var(--color-ink)" }}
              >
                {customerName || "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--color-ink4)" }}
              >
                Email
              </p>
              <p
                className="truncate text-[13.5px] font-medium"
                style={{ color: "var(--color-ink)" }}
              >
                {customerEmail}
              </p>
            </div>
            <button
              onClick={copyEmail}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150 active:scale-90"
              style={{
                background: "var(--color-surface2)",
                color: copied ? "var(--color-emerald)" : "var(--color-ink4)",
              }}
            >
              {copied ? (
                <CheckCircle2 size={13} strokeWidth={2} />
              ) : (
                <Copy size={13} strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Saved address */}
      <div
        className="rounded-[18px] p-5"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin
              size={14}
              strokeWidth={1.75}
              style={{ color: "var(--color-ink4)" }}
            />
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: "var(--color-ink4)" }}
            >
              Saved Address
            </p>
          </div>
          {/* Placeholder — future: edit address */}
          <button
            className="flex items-center gap-1 text-[11.5px] font-semibold transition-colors"
            style={{ color: "var(--color-ink4)" }}
            title="Edit address (coming soon)"
          >
            <Edit3 size={12} strokeWidth={1.75} /> Edit
          </button>
        </div>

        {savedAddress ? (
          <div
            className="flex items-start gap-3 rounded-xl p-3"
            style={{ background: "var(--color-surface2)" }}
          >
            <div
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: "var(--color-accent-bg)",
                color: "var(--color-accent)",
              }}
            >
              <Home size={14} strokeWidth={1.75} />
            </div>
            <div>
              <p
                className="text-[13px] font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                {savedAddress.fullName}
              </p>
              <p
                className="text-[12px] leading-relaxed"
                style={{ color: "var(--color-ink3)" }}
              >
                {savedAddress.address}
                <br />
                {savedAddress.city}, {savedAddress.zip}
                <br />
                {savedAddress.country}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "var(--color-surface2)" }}
          >
            <p className="text-[12.5px]" style={{ color: "var(--color-ink4)" }}>
              Your shipping address will be saved after your first order.
            </p>
          </div>
        )}
      </div>

      {/* Preferences (placeholder — future feature) */}
      <div
        className="rounded-[18px] p-5"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p
          className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--color-ink4)" }}
        >
          Preferences
        </p>
        <div className="flex flex-col gap-2">
          {[
            { label: "Order confirmation emails", on: true },
            { label: "Shipping update emails", on: true },
            { label: "Promotions & deals", on: false },
          ].map(({ label, on }) => (
            <div key={label} className="flex items-center justify-between">
              <span
                className="text-[13px]"
                style={{ color: "var(--color-ink2)" }}
              >
                {label}
              </span>
              {/* Toggle visual (non-functional placeholder) */}
              <div
                className="relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-200"
                style={{
                  background: on
                    ? "var(--color-accent)"
                    : "var(--color-border2)",
                }}
              >
                <span
                  className="absolute top-0.5 h-4 w-4 rounded-full transition-transform duration-200"
                  style={{
                    background: "white",
                    left: on ? "calc(100% - 18px)" : "2px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p
          className="mt-3 text-[11.5px]"
          style={{ color: "var(--color-ink4)" }}
        >
          Notification preferences — coming soon.
        </p>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-[18px] p-5"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <p
          className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: "var(--color-ink4)" }}
        >
          Account
        </p>
        <p
          className="mb-3 text-[12.5px]"
          style={{ color: "var(--color-ink4)" }}
        >
          To update your personal information or delete your account, please
          contact support.
        </p>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold transition-all duration-150 active:scale-[0.98]"
          style={{
            background: "var(--color-surface2)",
            color: "var(--color-ink3)",
            border: "1px solid var(--color-border)",
          }}
          onClick={async () => {
            await supabase.auth.signOut();
          }}
        >
          <LogOut size={14} strokeWidth={1.75} /> Sign out of InstaWear
        </button>
      </div>
    </div>
  );
}

// ─── Shared UI pieces ────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const st = ORDER_STATUS[status] || ORDER_STATUS.pending;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10.5px] font-bold"
      style={{ background: st.bg, color: st.color }}
    >
      {st.icon} {st.label}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  sub,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-[18px]"
        style={{
          background: "var(--color-surface2)",
          color: "var(--color-ink4)",
        }}
      >
        {icon}
      </div>
      <div>
        <p
          className="text-[14px] font-semibold"
          style={{ color: "var(--color-ink2)" }}
        >
          {title}
        </p>
        <p
          className="mt-0.5 text-[12.5px]"
          style={{ color: "var(--color-ink4)" }}
        >
          {sub}
        </p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
          style={{
            background: "var(--color-accent)",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border p-4"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2 flex-1">
              <div className="skeleton h-3.5 w-[45%] rounded-full" />
              <div className="skeleton h-3 w-[30%] rounded-full" />
            </div>
            <div className="skeleton h-8 w-16 rounded-[10px]" />
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="skeleton h-9 w-9 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border overflow-hidden"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="skeleton aspect-square" />
          <div className="p-3 flex flex-col gap-2">
            <div className="skeleton h-3 w-[80%] rounded-full" />
            <div className="skeleton h-3 w-[45%] rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
