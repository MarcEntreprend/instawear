// src/components/AccountPage.tsx

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  Paperclip,
  Send,
  MapPin,
  Bell,
  ChevronRight,
  CheckCircle2,
  Clock,
  Truck,
  Box,
  XCircle,
  Trash2,
  Home,
  Edit3,
  Copy,
  Inbox,
  LogOut,
  Search,
  X,
  Upload,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  customerApi,
  interactionApi,
  mapOrder,
  newsletterApi,
} from "../api/supabaseApi";
import CopyID from "./CopyID";
import { storageApi } from "../api/storageApi";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { COUNTRIES } from "../data/countries";
import { PLACEHOLDER_IMG, CART_X_ICON } from "../constants/assets";
import { formatCPFCNPJ } from "../utils/format";
import type { Order, Favourite, AdminCartItem } from "../admin/adminTypes";
import CartIcon from "./CartIcon";
import OrderStatusStepper, { StatusPill } from "./OrderStatusStepper";
import ShipmentTrackingBlock from "./ShipmentTrackingBlock";

// ─── Props ────────────────────────────────────────────────────────────
interface AccountPageProps {
  onClose: () => void;
  onViewProduct?: (
    productId: string,
    initialColor?: string,
    initialSize?: string,
  ) => void;
}

// ─── Local types ─────────────────────────────────────────────────────
interface Interaction {
  id: string;
  subject: string;
  status: string;
  updatedAt: string;
  lastMessage?: string;
}

type TabKey =
  | "orders"
  | "favorites"
  | "cart"
  | "notifications"
  | "profile"
  | "support";

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

//  Resolves the best image for a specific product color
function getVariantImage(product: any, selectedColor: string): string {
  if (product?.variants?.length) {
    const v = product.variants.find((v: any) => v.color === selectedColor);
    if (v?.image) return v.image;
  }
  if (product?.colorImages?.length && product?.colors) {
    const idx = product.colors.indexOf(selectedColor);
    if (idx >= 0 && product.colorImages[idx]) return product.colorImages[idx];
  }
  return product?.image || PLACEHOLDER_IMG;
}

// Shared style tokens for form inputs across this page
const inputClass =
  "w-full rounded-2xl border px-3.5 py-2.5 text-[13.5px] outline-none transition-colors";
const inputStyle: React.CSSProperties = {
  background: "var(--color-surface2)",
  borderColor: "var(--color-border)",
  color: "var(--color-ink)",
  fontFamily: "var(--font-sans)",
};
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em]";

// ─── Main component ───────────────────────────────────────────────────
export default function AccountPage({
  onClose,
  onViewProduct,
}: AccountPageProps) {
  const currencySymbol = useCurrencySymbol();

  // ── Auth & customer ──────────────────────────────────────────────
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [customerPreferences, setCustomerPreferences] = useState({
    order_confirmation: true,
    shipping_update: true,
    promotions: false,
  });

  // Résout l'identité directement depuis la session Supabase Auth.
  // IMPORTANT : on n'utilise plus allCustomers (cache global chargé une
  // seule fois dans App.tsx) car il peut être en retard sur la session
  // réelle (ex: juste après un signup, ou pendant que le cache charge
  // encore) → c'était la cause du flash "Guest". customers.id == auth.uid()
  // pour tout client (voir AuthModal.tsx : id: data.user.id à l'inscription),
  // donc on peut requêter directement par cet ID, sans recherche par email.
  useEffect(() => {
    let cancelled = false;

    const resolveIdentity = async (
      user: { id: string; email?: string; user_metadata?: any } | null,
    ) => {
      if (!user?.email) {
        if (!cancelled) {
          setCustomerId(null);
          setCustomerEmail("");
          setCustomerName("");
          setInitializing(false);
        }
        return;
      }

      if (!cancelled) {
        setCustomerEmail(user.email);
        setCustomerName(user.user_metadata?.full_name || "");
        setCustomerId(user.id);
      }

      const c = await customerApi.get(user.id);
      if (cancelled) return;
      if (c?.name) setCustomerName(c.name);
      if (c?.emailPreferences) setCustomerPreferences(c.emailPreferences);

      newsletterApi.isSubscribed(user.email).then((subscribed) => {
        if (!cancelled) setNewsletterSubscribed(subscribed);
      });

      if (!cancelled) setInitializing(false);
    };

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => resolveIdentity(session?.user ?? null));

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        resolveIdentity(session?.user ?? null);
      },
    );

    return () => {
      cancelled = true;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // ── Navigation ───────────────────────────────────────────────────
  const [tab, setTab] = useState<TabKey>("orders");

  // ── Data ─────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [favorites, setFavorites] = useState<Favourite[]>([]);
  const [loadingFav, setLoadingFav] = useState(false);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loadingInter, setLoadingInter] = useState(false);

  // ── Notifications ──────────────────────────────────────────────
  const [customerNotifications, setCustomerNotifications] = useState<any[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const fetchNotifications = useCallback(
    async (page = 0, append = false) => {
      if (!customerId) return;
      setLoadingNotifs(true);
      try {
        const data = await customerApi.getNotifications(customerId, page, 10);
        if (append) {
          setCustomerNotifications((prev) => [...prev, ...data]);
        } else {
          setCustomerNotifications(data);
        }
        setUnreadNotifsCount(data.filter((n: any) => !n.is_read).length);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingNotifs(false);
      }
    },
    [customerId],
  );

  const handleMarkNotifRead = async (notifId: string) => {
    await customerApi.markNotificationRead(notifId);
    setCustomerNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)),
    );
    setUnreadNotifsCount((prev) => Math.max(0, prev - 1));
  };

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

  const handleUpdatePreferences = async (prefs: typeof customerPreferences) => {
    if (!customerId) return;
    setCustomerPreferences(prefs);
    await customerApi.updateEmailPreferences(customerId, prefs);
  };

  const handleToggleNewsletter = async () => {
    if (!customerEmail) return;
    if (newsletterSubscribed) {
      await newsletterApi.unsubscribe(customerEmail);
      setNewsletterSubscribed(false);
    } else {
      await newsletterApi.subscribe(customerEmail);
      setNewsletterSubscribed(true);
    }
  };

  const fetchOrders = useCallback(
    async (page = 0, append = false, search?: string) => {
      if (!customerId) return;
      setLoadingOrders(true);
      try {
        const newOrders = await customerApi.getOrders(
          customerId,
          page,
          10,
          search,
        );
        if (append) {
          setOrders((prev) => [...prev, ...newOrders]);
        } else {
          setOrders(newOrders);
        }
        setHasMoreOrders(newOrders.length === 10);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingOrders(false);
      }
    },
    [customerId],
  );

  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const [ordersPage, setOrdersPage] = useState(0);

  const [totalOrdersCount, setTotalOrdersCount] = useState(0);

  const handleLoadMoreOrders = useCallback(() => {
    if (loadingOrders || !hasMoreOrders) return;
    const nextPage = ordersPage + 1;
    setOrdersPage(nextPage);
    fetchOrders(nextPage, true);
  }, [loadingOrders, hasMoreOrders, ordersPage, fetchOrders]);

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

  useEffect(() => {
    if (!customerId) return;
    fetchOrders(0, false);
    fetchFavorites();
    fetchCart();
    fetchNotifications(0, false);
    fetchInteractions();
    if (customerId) {
      customerApi
        .getOrderCount(customerId)
        .then(setTotalOrdersCount)
        .catch(() => {});
    }
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return;
    const interval = setInterval(() => {
      fetchFavorites();
      fetchCart();
      customerApi
        .getUnreadNotificationCount(customerId)
        .then(setUnreadNotifsCount)
        .catch(() => {});
      fetchInteractions();
    }, 30000);
    return () => clearInterval(interval);
  }, [customerId, fetchFavorites, fetchCart, fetchInteractions]);

  // ── Stats (computed) ──────────────────────────────────────────────
  const totalSpent = orders.reduce((a, o) => a + o.totalAmount, 0);
  const memberSince =
    orders.length > 0
      ? new Date(
          Math.min(...orders.map((o) => new Date(o.createdAt).getTime())),
        ).toLocaleDateString("en-US", { month: "short", year: "numeric" })
      : "-";

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
      icon: <CartIcon size={18} strokeWidth={1.75} />,
      badge: cart.length || undefined,
    },
    {
      key: "notifications",
      label: "Notifications",
      icon: <Bell size={18} strokeWidth={1.75} />,
      badge: unreadNotifsCount || undefined,
    },
    {
      key: "profile",
      label: "Profile",
      icon: <User size={18} strokeWidth={1.75} />,
    },
    {
      key: "support",
      label: "Support",
      icon: <MessageSquare size={18} strokeWidth={1.75} />,
      badge:
        interactions.filter((i) => i.status === "open").length || undefined,
    },
  ];

  if (initializing) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <Loader2
          size={32}
          className="animate-spin"
          style={{ color: "var(--color-accent)" }}
        />
      </div>
    );
  }

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
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
          style={{
            color: "var(--color-ink3)",
            background: "var(--color-surface2)",
          }}
        >
          <ArrowLeft size={17} strokeWidth={2} />
        </button>
        <span
          className="text-[15px] font-bold"
          style={{ color: "var(--color-ink)" }}
        >
          My Account
        </span>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-black text-white"
          style={{ background: "var(--color-accent)" }}
        >
          {customerId ? initials(customerEmail, customerName) : "?"}
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar (desktop ≥ sm) ────────────────────────────── */}
        <aside
          className="hidden sm:flex w-68 flex-col shrink-0 overflow-y-auto"
          style={{
            borderRight: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          {/* Identity card */}
          <div className="p-6 pb-5">
            <button
              onClick={onClose}
              className="mb-6 flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
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
            <div className="mb-5 flex flex-col items-start gap-3">
              <div
                className="relative flex h-15 w-15 items-center justify-center rounded-3xl text-xl font-black text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
                  boxShadow: "var(--shadow-accent)",
                }}
              >
                {customerId ? initials(customerEmail, customerName) : "?"}
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
              className="card-premium grid grid-cols-2 gap-3 rounded-2xl p-4"
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
                  className="text-[19px] font-black tabular-nums"
                  style={{ color: "var(--color-ink)" }}
                >
                  {totalOrdersCount}
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
                  className="text-[19px] font-black tabular-nums"
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
                className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-all duration-150 text-left"
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
                window.location.href = "/";
              }}
              className="flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors"
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
            <div className="mb-6 hidden sm:flex items-center justify-between">
              <h2
                className="text-[21px] font-black tracking-tight"
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
                onRefresh={fetchOrders}
                onLoadMore={handleLoadMoreOrders}
                hasMore={hasMoreOrders}
                customerEmail={customerEmail}
                customerId={customerId}
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
            {tab === "notifications" && (
              <NotificationsTab
                notifications={customerNotifications}
                loading={loadingNotifs}
                onMarkRead={handleMarkNotifRead}
              />
            )}
            {tab === "profile" && (
              <ProfileTab
                customerEmail={customerEmail}
                customerName={customerName}
                customerId={customerId}
                orders={orders}
                preferences={customerPreferences}
                onUpdatePreferences={handleUpdatePreferences}
                newsletterSubscribed={newsletterSubscribed}
                onClose={onClose}
                onToggleNewsletter={handleToggleNewsletter}
              />
            )}
            {tab === "support" && (
              <SupportTab
                interactions={interactions}
                loading={loadingInter}
                customerEmail={customerEmail}
                customerName={customerName}
                orders={orders}
                currencySymbol={currencySymbol}
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
  onRefresh,
  onLoadMore,
  hasMore,
  customerEmail,
  customerId,
}: {
  orders: Order[];
  loading: boolean;
  currencySymbol: string;
  onViewProduct?: (
    productId: string,
    initialColor?: string,
    initialSize?: string,
  ) => void;
  onRefresh?: (page: number, append: boolean) => Promise<void>;
  onLoadMore?: () => void;
  hasMore?: boolean;
  customerEmail?: string;
  customerId?: string | null;
}) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const loaderRef = useRef<HTMLDivElement>(null);

  const [serverSearch, setServerSearch] = useState("");
  const [serverResults, setServerResults] = useState<Order[]>([]);
  const [serverSearchLoading, setServerSearchLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [searchDebouncing, setSearchDebouncing] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) {
      setServerSearch("");
      setServerResults([]);
      setSearchDebouncing(false);
      return;
    }
    if (!customerId) return;

    setSearchDebouncing(true);
    debounceRef.current = setTimeout(async () => {
      setServerSearchLoading(true);
      setSearchDebouncing(false);
      try {
        const results = await customerApi.getOrders(customerId, 0, 50, search);
        setServerResults(results);
        setServerSearch(search);
      } catch (e) {
        console.error(e);
      } finally {
        setServerSearchLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, customerEmail, customerId]);

  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && onLoadMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  const filtered = useMemo(() => {
    let list = [...orders];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(s) ||
          (o.clientName || "").toLowerCase().includes(s) ||
          (o.clientEmail || "").toLowerCase().includes(s),
      );
    }
    if (filterStatus !== "all") {
      list = list.filter((o) => o.status === filterStatus);
    }
    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return list;
  }, [orders, search, filterStatus, sortOrder]);

  const filteredServerResults = useMemo(() => {
    let list = [...serverResults];
    if (filterStatus !== "all") {
      list = list.filter((o) => o.status === filterStatus);
    }
    list.sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return list;
  }, [serverResults, filterStatus, sortOrder]);

  const handleBack = useCallback(async () => {
    setSelectedOrder(null);
    if (onRefresh) await onRefresh(0, false);
  }, [onRefresh]);

  const openOrder = async (order: Order) => {
    setLoadingDetail(true);
    try {
      const { data: refreshed, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", order.id)
        .single();
      if (!error && refreshed) {
        const items = (refreshed.order_items || []).map((item: any) => ({
          id: item.id,
          orderId: item.order_id,
          productId: item.product_id,
          productTitle: item.product_title,
          productImage: item.product_image,
          selectedColor: item.selected_color,
          selectedSize: item.selected_size,
          quantity: item.quantity,
          unitPrice: item.unit_price,
        }));
        setSelectedOrder({
          ...mapOrder(refreshed),
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
  };

  if (loading && orders.length === 0) return <SkeletonList />;
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
        onBack={handleBack}
        onViewProduct={onViewProduct}
      />
    );

  if (orders.length === 0)
    return (
      <EmptyState
        icon={<CartIcon size={28} strokeWidth={1.5} />}
        title="No orders yet"
        sub="Your order history will appear here after your first purchase."
      />
    );

  const renderOrderRow = (order: Order) => {
    const isActive =
      order.status !== "delivered" && order.status !== "cancelled";
    return (
      <button
        key={order.id}
        onClick={() => openOrder(order)}
        className="card-premium w-full text-left rounded-3xl p-4 transition-all duration-200 active:scale-[0.99]"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p
                className="truncate text-[13px] font-bold flex items-center"
                style={{ color: "var(--color-ink)" }}
              >
                {order.id}
                <CopyID id={order.id} />
              </p>
              {isActive && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "var(--color-accent)" }}
                />
              )}
            </div>
            <p className="text-[12px]" style={{ color: "var(--color-ink4)" }}>
              {formatDate(order.createdAt)} · {order.items?.length ?? 0} item
              {(order.items?.length ?? 0) !== 1 ? "s" : ""}
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
        {order.items && order.items.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5">
            {order.items.slice(0, 4).map((item, i) => (
              <span
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.productId && onViewProduct) {
                    onViewProduct(
                      item.productId,
                      item.selectedColor,
                      item.selectedSize,
                    );
                  }
                }}
                className="h-9 w-9 rounded-xl overflow-hidden border-none p-0 cursor-pointer inline-block"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <img
                  src={item.productImage || PLACEHOLDER_IMG}
                  alt={item.productTitle || "item"}
                  className="h-full w-full object-cover"
                />
              </span>
            ))}
            {order.items.length > 4 && (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[11px] font-bold"
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
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Barre de recherche + filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="flex items-center gap-2 flex-1 min-w-0 rounded-full border px-4 py-2.5"
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
            placeholder="Search by order ID..."
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
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-full border px-4 py-2.5 text-[12.5px] font-medium outline-none cursor-pointer"
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
        <button
          onClick={() =>
            setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))
          }
          className="flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[12.5px] font-medium transition-colors"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-ink2)",
          }}
        >
          <Clock size={13} strokeWidth={1.75} />
          {sortOrder === "newest" ? "Newest" : "Oldest"}
        </button>
        {(search || filterStatus !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterStatus("all");
            }}
            className="flex items-center gap-1 rounded-full px-4 py-2.5 text-[12px] font-semibold transition-colors"
            style={{
              background: "var(--color-accent-bg)",
              border: "1px solid rgba(255,92,53,.25)",
              color: "var(--color-accent)",
            }}
          >
            <X size={12} strokeWidth={2} /> Reset
          </button>
        )}
      </div>

      {serverSearch || searchDebouncing ? (
        serverSearchLoading ? (
          <SkeletonList />
        ) : serverResults.length === 0 ? (
          <EmptyState
            icon={<Search size={28} strokeWidth={1.5} />}
            title="No orders match"
            sub="Try adjusting your search or filters."
          />
        ) : (
          filteredServerResults.map((order) => renderOrderRow(order))
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={28} strokeWidth={1.5} />}
          title="No orders match"
          sub="Try adjusting your search or filters."
        />
      ) : (
        <>{filtered.map((order) => renderOrderRow(order))}</>
      )}

      {hasMore && (
        <div ref={loaderRef} className="flex justify-center py-4">
          <Loader2
            size={20}
            className="animate-spin"
            style={{ color: "var(--color-ink4)" }}
          />
        </div>
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
  onBack: (updatedOrder?: Order) => void;
  onViewProduct?: (
    productId: string,
    initialColor?: string,
    initialSize?: string,
  ) => void;
}) {
  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      <button
        onClick={() => onBack(order)}
        className="flex items-center gap-1.5 text-[13px] font-semibold self-start"
        style={{ color: "var(--color-ink3)" }}
      >
        <ArrowLeft size={14} strokeWidth={2} /> All Orders
      </button>

      {/* Status timeline, composant partagé, réutilisé aussi dans OrderTrackingModal.tsx */}
      <OrderStatusStepper status={order.status} />

      {/* Suivi des colis expédiés */}
      {(order.status === "shipped" || order.status === "delivered") &&
        order.trackingInfo?.length > 0 && (
          <div
            className="rounded-3xl p-5"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <ShipmentTrackingBlock shipments={order.trackingInfo} />
          </div>
        )}

      {/* Order info */}
      <div
        className="rounded-3xl p-5"
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
              className="text-[15px] font-black flex items-center"
              style={{ color: "var(--color-ink)", fontFamily: "monospace" }}
            >
              {order.id}
              <CopyID id={order.id} />
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
                onClick={() => {
                  if (item.productId && onViewProduct) {
                    onViewProduct(
                      item.productId,
                      item.selectedColor,
                      item.selectedSize,
                    );
                  }
                }}
                className="h-14 w-14 shrink-0 rounded-2xl overflow-hidden border-none p-0 cursor-pointer"
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
                  onClick={() => {
                    if (item.productId && onViewProduct) {
                      onViewProduct(
                        item.productId,
                        item.selectedColor,
                        item.selectedSize,
                      );
                    }
                  }}
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
          className="rounded-3xl p-5"
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
      <div className="flex justify-end">
        <button
          onClick={onRemoveAll}
          className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors"
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
            className="card-premium group relative flex flex-col overflow-hidden rounded-3xl"
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

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(fav.productId);
              }}
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-rose-500 opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:opacity-100 hover:bg-white hover:shadow-sm"
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

            <button
              onClick={() => onViewProduct?.(fav.productId)}
              className="absolute inset-x-2 bottom-2 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
            >
              <div
                className="flex items-center justify-center gap-1 rounded-full py-1.5 text-[11px] font-bold text-white"
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
  onViewProduct?: (
    productId: string,
    initialColor?: string,
    initialSize?: string,
  ) => void;
  onUpdateQty: (itemId: string, delta: number) => void;
}) {
  if (loading) return <SkeletonList />;
  if (items.length === 0)
    return (
      <EmptyState
        icon={
          <img
            src={CART_X_ICON}
            alt="Cart"
            className="w-7 h-7"
            style={{ opacity: 0.5 }}
          />
        }
        title="Your cart is empty"
        sub="Items added to your cart will appear here."
      />
    );

  const total = items.reduce(
    (sum, item) =>
      sum + (item.unitPrice ?? item.product?.price ?? 0) * item.quantity,
    0,
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          onClick={onClear}
          className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold transition-colors"
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
          className="card-premium flex items-center gap-3 rounded-3xl p-3.5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <button
            onClick={() => {
              if (onViewProduct) {
                onViewProduct(
                  item.productId,
                  item.selectedColor,
                  item.selectedSize,
                );
              }
            }}
            className="h-14 w-14 shrink-0 rounded-2xl overflow-hidden border-none p-0 cursor-pointer"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <img
              src={getVariantImage(item.product, item.selectedColor)}
              alt={item.product?.title || "product"}
              className="h-full w-full object-cover"
            />
          </button>
          <div className="flex-1 min-w-0">
            <button
              onClick={() => {
                if (onViewProduct) {
                  onViewProduct(
                    item.productId,
                    item.selectedColor,
                    item.selectedSize,
                  );
                }
              }}
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
            <div className="flex items-center justify-between mt-1.5">
              <span
                className="text-[13px] font-bold tabular-nums"
                style={{ color: "var(--color-ink)" }}
              >
                {currencySymbol}
                {(
                  (item.unitPrice ?? item.product?.price ?? 0) * item.quantity
                ).toFixed(2)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onUpdateQty(item.id, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
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
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
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
                  className="flex h-7 w-7 items-center justify-center rounded-full ml-1 transition-colors"
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

      <div
        className="flex justify-between rounded-3xl border p-4"
        style={{
          background: "var(--color-accent-bg)",
          borderColor: "rgba(255,92,53,.2)",
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

const ORDER_ID_REGEX =
  /\b(ord-(?:\d{4}-\d{4,5}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}))\b/gi;

const URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

const MESSAGE_TOKEN_REGEX = new RegExp(
  `(${ORDER_ID_REGEX.source.replace(/^\/|\/$/g, "")})|(${URL_REGEX.source.replace(/^\/|\/$/g, "")})`,
  "gi",
);

function formatMessageText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MESSAGE_TOKEN_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (URL_REGEX.test(token)) {
      // ✅ Correct JSX anchor element
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "var(--color-accent)",
            fontWeight: 600,
            textDecoration: "underline",
            wordBreak: "break-all",
          }}
        >
          {token}
        </a>,
      );
    } else {
      const orderId = token.toUpperCase();
      parts.push(
        <span key={match.index} style={{ whiteSpace: "nowrap" }}>
          {orderId}
          <CopyID id={orderId} size={11} />
        </span>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

// ─── NotificationsTab ─────────────────────────────────────────────────
function NotificationsTab({
  notifications,
  loading,
  onMarkRead,
}: {
  notifications: any[];
  loading: boolean;
  onMarkRead: (id: string) => void;
}) {
  if (loading) return <SkeletonList />;
  if (notifications.length === 0)
    return (
      <EmptyState
        icon={<Bell size={28} strokeWidth={1.5} />}
        title="No notifications yet"
        sub="Updates about your orders will appear here."
      />
    );

  return (
    <div className="flex flex-col gap-2">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className="rounded-3xl border p-4 transition-all"
          style={{
            background: notif.is_read
              ? "var(--color-surface)"
              : "var(--color-accent-bg)",
            borderColor: notif.is_read
              ? "var(--color-border)"
              : "rgba(255,92,53,.25)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                {formatMessageText(notif.title)}
              </p>
              <p
                className="text-[12px] mt-1"
                style={{
                  color: "var(--color-ink3)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {formatMessageText(notif.message)}
              </p>
              <p
                className="text-[10px] mt-2"
                style={{ color: "var(--color-ink4)" }}
              >
                {timeAgo(notif.created_at)}
              </p>
            </div>
            {!notif.is_read && (
              <button
                onClick={() => onMarkRead(notif.id)}
                className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: "var(--color-accent)",
                  color: "white",
                }}
              >
                Mark read
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SupportTab ───────────────────────────────────────────────────────
function SupportTab({
  interactions,
  loading,
  customerEmail,
  customerName,
  orders,
  currencySymbol,
}: {
  interactions: Interaction[];
  loading: boolean;
  customerEmail: string;
  customerName: string;
  orders: Order[];
  currencySymbol: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"question" | "complaint" | "feedback">(
    "question",
  );
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedTicket, setSelectedTicket] = useState<Interaction | null>(
    null,
  );
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await interactionApi.getMessages(selectedTicket.id);
        setTicketMessages(msgs);
      } catch (e) {
        /* silencieux */
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  const openTicket = async (ticket: Interaction) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    try {
      const msgs = await interactionApi.getMessages(ticket.id);
      setTicketMessages(msgs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    await interactionApi.addMessage(
      selectedTicket.id,
      "customer",
      replyText.trim(),
    );
    const msgs = await interactionApi.getMessages(selectedTicket.id);
    setTicketMessages(msgs);
    setReplyText("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSize = 5 * 1024 * 1024;
    const filtered = selected.filter(
      (f) => validTypes.includes(f.type) && f.size <= maxSize,
    );
    setFiles((prev) => {
      const combined = [...prev, ...filtered];
      return combined.slice(0, 3);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setUploadingFiles(true);

    let uploadedUrls: { url: string; name: string; size: number }[] = [];
    try {
      for (const file of files) {
        const url = await storageApi.uploadTicketAttachment(file);
        uploadedUrls.push({
          url,
          name: file.name,
          size: file.size,
        });
      }
    } catch (e) {
      console.error("Upload failed", e);
      setSending(false);
      setUploadingFiles(false);
      return;
    }

    setUploadingFiles(false);

    try {
      const { data: inter } = await supabase
        .from("interactions")
        .insert({
          customer_id: customerEmail,
          customer_name: customerName || "Customer",
          customer_email: customerEmail,
          type,
          status: "open",
          subject: subject.trim(),
          last_message: message.trim(),
          metadata: {
            ...(selectedOrderId ? { orderId: selectedOrderId } : {}),
            ...(uploadedUrls.length > 0 ? { attachments: uploadedUrls } : {}),
          },
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
        setSelectedOrderId("");
        setFiles([]);
      }, 1800);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (selectedTicket) {
    const ticketMeta = (selectedTicket as any).metadata || {};
    const attachments: any[] = ticketMeta.attachments || [];
    return (
      <div className="flex flex-col gap-4 animate-fade-up">
        <button
          onClick={() => {
            setSelectedTicket(null);
            setTicketMessages([]);
          }}
          className="flex items-center gap-1.5 text-[13px] font-semibold self-start"
          style={{ color: "var(--color-ink3)" }}
        >
          <ArrowLeft size={14} strokeWidth={2} /> All conversations
        </button>
        <div
          className="rounded-3xl p-5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p
            className="text-[15px] font-bold"
            style={{ color: "var(--color-ink)" }}
          >
            {selectedTicket.subject}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="chip"
              style={{
                background:
                  selectedTicket.status === "open" ? "#fef3c7" : "#d1fae5",
                color: selectedTicket.status === "open" ? "#d97706" : "#065f46",
              }}
            >
              {selectedTicket.status === "open" ? "Open" : "Resolved"}
            </span>
            <span
              className="text-[11px]"
              style={{ color: "var(--color-ink4)" }}
            >
              {timeAgo(selectedTicket.updatedAt)}
            </span>
          </div>

          {attachments.length > 0 && (
            <div
              className="mt-4 pt-4"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <p
                className="text-[11px] font-semibold uppercase mb-2"
                style={{ color: "var(--color-ink4)" }}
              >
                Attachments ({attachments.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {attachments.map((att: any, i: number) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors hover:bg-(--color-surface2)"
                    style={{
                      background: "var(--color-surface2)",
                      borderColor: "var(--color-border)",
                      color: "var(--color-ink2)",
                      textDecoration: "none",
                    }}
                  >
                    <Paperclip size={14} strokeWidth={1.75} />
                    {att.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="rounded-3xl p-5 flex flex-col gap-4"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          {loadingMessages ? (
            <Loader2
              size={28}
              className="animate-spin mx-auto"
              style={{ color: "var(--color-accent)" }}
            />
          ) : ticketMessages.length === 0 ? (
            <p
              className="text-center text-[12.5px]"
              style={{ color: "var(--color-ink4)" }}
            >
              No messages yet.
            </p>
          ) : (
            ticketMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex flex-col"
                style={{
                  alignItems:
                    msg.from_field === "customer" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  className="max-w-[75%] rounded-2xl px-4 py-2.5 text-[13px]"
                  style={{
                    background:
                      msg.from_field === "customer"
                        ? "var(--color-accent-bg)"
                        : "var(--color-surface2)",
                    border:
                      msg.from_field === "customer"
                        ? "1px solid rgba(255,92,53,.2)"
                        : "1px solid var(--color-border)",
                    color: "var(--color-ink)",
                  }}
                >
                  <p
                    className="text-[11px] font-semibold mb-1"
                    style={{ color: "var(--color-ink3)" }}
                  >
                    {msg.from_field === "customer" ? "You" : "Support"}
                  </p>
                  <p>{formatMessageText(msg.text)}</p>
                </div>
                <span
                  className="text-[10px] mt-1"
                  style={{ color: "var(--color-ink4)" }}
                >
                  {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className={inputClass + " resize-none"}
            style={inputStyle}
          />
          <button
            onClick={handleSendReply}
            disabled={!replyText.trim()}
            className="pill-btn pill-btn-accent self-end disabled:opacity-50"
          >
            <Send size={14} strokeWidth={2} /> Send reply
          </button>
        </div>
      </div>
    );
  }

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
          className="rounded-3xl p-6"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p
            className="mb-4 text-[16px] font-black"
            style={{ color: "var(--color-ink)" }}
          >
            New Support Request
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
                Request submitted
              </p>
              <p
                className="text-[12.5px]"
                style={{ color: "var(--color-ink4)" }}
              >
                We'll get back to you shortly.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <label
                  className={labelClass}
                  style={{ color: "var(--color-ink4)" }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={customerName || "Guest"}
                  disabled
                  className={inputClass + " opacity-60"}
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className={labelClass}
                  style={{ color: "var(--color-ink4)" }}
                >
                  Response Email
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  disabled
                  className={inputClass + " opacity-60"}
                  style={inputStyle}
                />
              </div>
              <div>
                <label
                  className={labelClass}
                  style={{ color: "var(--color-ink4)" }}
                >
                  Request Type <span className="text-(--color-accent)">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className={inputClass + " cursor-pointer"}
                  style={inputStyle}
                >
                  <option value="question">Question</option>
                  <option value="complaint">Complaint</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>
              <div>
                <label
                  className={labelClass}
                  style={{ color: "var(--color-ink4)" }}
                >
                  Related Order (optional)
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className={inputClass + " cursor-pointer"}
                  style={inputStyle}
                >
                  <option value="">None</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} -{" "}
                      {new Date(o.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      · {currencySymbol}
                      {o.totalAmount.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className={labelClass}
                  style={{ color: "var(--color-ink4)" }}
                >
                  Subject <span className="text-(--color-accent)">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wrong size received"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
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
                  className={labelClass}
                  style={{ color: "var(--color-ink4)" }}
                >
                  Description <span className="text-(--color-accent)">*</span>
                </label>
                <textarea
                  placeholder="Describe your issue or question..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className={inputClass + " resize-none"}
                  style={inputStyle}
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
                  className={labelClass}
                  style={{ color: "var(--color-ink4)" }}
                >
                  Attachments (max 3, 5MB each, JPEG/PNG/WebP/GIF)
                </label>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {files.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px]"
                        style={{
                          background: "var(--color-surface2)",
                          borderColor: "var(--color-border)",
                          color: "var(--color-ink2)",
                        }}
                      >
                        <Paperclip size={13} strokeWidth={1.75} />
                        <span className="max-w-35 truncate">{file.name}</span>
                        <button
                          onClick={() => handleRemoveFile(i)}
                          className="flex items-center justify-center w-5 h-5 rounded-full text-(--color-ink4) hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          <X size={12} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-[13px] cursor-pointer transition-colors ${files.length >= 3 ? "opacity-50 pointer-events-none" : ""}`}
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-ink4)",
                    background: "var(--color-surface2)",
                  }}
                  onMouseEnter={(e) => {
                    if (files.length < 3)
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--color-accent)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--color-border)";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (files.length < 3)
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--color-accent)";
                  }}
                  onDragLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--color-border)";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (files.length >= 3) return;
                    const dropped = Array.from(e.dataTransfer.files);
                    const validTypes = [
                      "image/jpeg",
                      "image/png",
                      "image/webp",
                      "image/gif",
                    ];
                    const maxSize = 5 * 1024 * 1024;
                    const filtered = dropped.filter(
                      (f) => validTypes.includes(f.type) && f.size <= maxSize,
                    );
                    setFiles((prev) => {
                      const combined = [...prev, ...filtered];
                      return combined.slice(0, 3);
                    });
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--color-border)";
                  }}
                >
                  <Upload size={18} strokeWidth={1.75} />
                  <span>Choose files or drag and drop here</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleFileSelect}
                  style={{ display: "none" }}
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={
                  sending ||
                  uploadingFiles ||
                  !subject.trim() ||
                  !message.trim()
                }
                className="pill-btn pill-btn-accent w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending || uploadingFiles ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={15} strokeWidth={2} />
                )}
                {uploadingFiles
                  ? "Uploading files..."
                  : sending
                    ? "Submitting..."
                    : "Submit Request"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) return <SkeletonList />;

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
            className="pill-btn pill-btn-accent self-end"
            style={{ padding: "10px 20px" }}
          >
            <Plus size={14} strokeWidth={2.5} /> New message
          </button>
          {interactions.map((t) => (
            <button
              key={t.id}
              onClick={() => openTicket(t)}
              className="card-premium w-full text-left rounded-3xl p-4 transition-all duration-200"
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
                    className="chip"
                    style={{
                      background: t.status === "open" ? "#fef3c7" : "#d1fae5",
                      color: t.status === "open" ? "#d97706" : "#065f46",
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
                  <ChevronRight
                    size={14}
                    style={{ color: "var(--color-ink4)" }}
                  />
                </div>
              </div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

// ─── ProfileTab ─────────────────────────────────────────────────────
function ProfileTab({
  customerEmail,
  customerName,
  customerId,
  orders,
  preferences,
  onUpdatePreferences,
  newsletterSubscribed,
  onToggleNewsletter,
  onClose,
}: {
  customerEmail: string;
  customerName: string;
  customerId: string | null;
  orders: Order[];
  preferences: {
    order_confirmation: boolean;
    shipping_update: boolean;
    promotions: boolean;
  };
  onUpdatePreferences: (prefs: {
    order_confirmation: boolean;
    shipping_update: boolean;
    promotions: boolean;
  }) => void;
  newsletterSubscribed: boolean;
  onClose: () => void;
  onToggleNewsletter: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(customerName);
  const [dob, setDob] = useState("");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [newAddress, setNewAddress] = useState({
    full_name: "",
    address: "",
    city: "",
    zip: "",
    country: "US",
    phone: "",
    state_code: "",
    tax_number: "",
  });
  const [savingAddress, setSavingAddress] = useState(false);

  const [copied, setCopied] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    customerApi.get(customerId).then((c) => {
      if (c?.date_of_birth) setDob(c.date_of_birth);
    });
    setLoadingAddresses(true);
    customerApi
      .getAddresses(customerId)
      .then((addrs) => {
        const sorted = [...addrs].sort((a, b) =>
          a.is_default ? -1 : b.is_default ? 1 : 0,
        );
        setAddresses(sorted);
      })
      .finally(() => setLoadingAddresses(false));
  }, [customerId]);

  const handleSaveName = async () => {
    if (!customerId || !nameInput.trim()) return;
    await customerApi.updateProfile(customerId, { name: nameInput.trim() });
    setEditingName(false);
  };

  const handleSaveDob = async () => {
    if (!customerId) return;
    await customerApi.updateProfile(customerId, {
      date_of_birth: dob || null,
    });
  };

  const handleAddAddress = async () => {
    if (!customerId) return;
    setSavingAddress(true);
    try {
      await customerApi.addAddress(customerId, newAddress);
      const updated = await customerApi.getAddresses(customerId);
      setAddresses(updated);
      setShowAddAddress(false);
      setNewAddress({
        full_name: "",
        address: "",
        city: "",
        zip: "",
        country: "US",
        phone: "",
        state_code: "",
        tax_number: "",
      });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await customerApi.deleteAddress(id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleStartEdit = (addr: any) => {
    setEditingAddressId(addr.id);
    setEditForm({ ...addr });
  };

  const handleCancelEdit = () => {
    setEditingAddressId(null);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!customerId || !editingAddressId) return;
    await customerApi.updateAddress(editingAddressId, editForm);
    const updated = await customerApi.getAddresses(customerId);
    setAddresses(updated);
    setEditingAddressId(null);
    setEditForm({});
  };

  const handleSetDefault = async (id: string) => {
    if (!customerId) return;
    await customerApi.setDefaultAddress(customerId, id);
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, is_default: a.id === id })),
    );
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(customerEmail).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const handleDeleteAccount = async () => {
    if (!customerId) return;
    const confirmed = window.confirm(
      "This will permanently delete your account, orders history access, saved addresses, favourites and cart. This action cannot be undone. Continue?",
    );
    if (!confirmed) return;
    setDeletingAccount(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No active session");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Deletion failed");
      }

      await supabase.auth.signOut();
      onClose();
      window.location.href = "/";
    } catch (e: any) {
      alert(
        e.message ||
          "Failed to delete account. Please try again or contact support.",
      );
      setDeletingAccount(false);
    }
  };

  const smallInput = "rounded-xl border px-2.5 py-1.5 text-sm";
  const smallInputStyle: React.CSSProperties = {
    borderColor: "var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-ink)",
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-up">
      {/* ── Identity card ─────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-6"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="mb-5 flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl text-2xl font-black text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
              boxShadow: "var(--shadow-accent)",
            }}
          >
            {customerEmail ? initials(customerEmail, customerName) : "?"}
          </div>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className={smallInput}
                  style={smallInputStyle}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                />
                <button
                  onClick={handleSaveName}
                  className="text-[11px] font-bold text-(--color-accent)"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-[11px] text-(--color-ink4)"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p
                className="text-[17px] font-bold cursor-pointer hover:underline"
                style={{ color: "var(--color-ink)" }}
                onClick={() => setEditingName(true)}
              >
                {customerName || "Set your name"}
              </p>
            )}
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
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-150 active:scale-90"
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

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: "var(--color-ink4)" }}
              >
                Date of Birth
              </p>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                onBlur={handleSaveDob}
                className={smallInput}
                style={smallInputStyle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Addresses ─────────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-6"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
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
              Shipping Addresses
            </p>
          </div>
          {addresses.length < 3 && (
            <button
              onClick={() => setShowAddAddress(!showAddAddress)}
              className="flex items-center gap-1 text-[11.5px] font-semibold text-(--color-accent)"
            >
              <Plus size={14} strokeWidth={2} /> Add
            </button>
          )}
        </div>

        {showAddAddress && (
          <div
            className="mb-4 rounded-2xl p-4"
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                placeholder="Full name"
                value={newAddress.full_name}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, full_name: e.target.value })
                }
                className={smallInput}
                style={{
                  ...smallInputStyle,
                  background: "var(--color-surface)",
                }}
              />
              <input
                placeholder="Phone"
                value={newAddress.phone}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, phone: e.target.value })
                }
                className={smallInput}
                style={{
                  ...smallInputStyle,
                  background: "var(--color-surface)",
                }}
              />
              <input
                placeholder="Address"
                value={newAddress.address}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, address: e.target.value })
                }
                className={smallInput}
                style={{
                  ...smallInputStyle,
                  background: "var(--color-surface)",
                }}
              />
              <input
                placeholder="City"
                value={newAddress.city}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, city: e.target.value })
                }
                className={smallInput}
                style={{
                  ...smallInputStyle,
                  background: "var(--color-surface)",
                }}
              />
              <input
                placeholder="ZIP"
                value={newAddress.zip}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, zip: e.target.value })
                }
                className={smallInput}
                style={{
                  ...smallInputStyle,
                  background: "var(--color-surface)",
                }}
              />
              <select
                value={newAddress.country}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, country: e.target.value })
                }
                className={smallInput}
                style={{
                  ...smallInputStyle,
                  background: "var(--color-surface)",
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="State (optional)"
                value={newAddress.state_code}
                onChange={(e) =>
                  setNewAddress({ ...newAddress, state_code: e.target.value })
                }
                className={smallInput}
                style={{
                  ...smallInputStyle,
                  background: "var(--color-surface)",
                }}
              />
              <input
                placeholder="Tax number (optional)"
                value={newAddress.tax_number}
                onChange={(e) =>
                  setNewAddress({
                    ...newAddress,
                    tax_number: formatCPFCNPJ(e.target.value),
                  })
                }
                className={smallInput}
                style={{
                  ...smallInputStyle,
                  background: "var(--color-surface)",
                }}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddAddress(false)}
                className="text-xs font-semibold text-(--color-ink4)"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAddress}
                disabled={savingAddress}
                className="pill-btn pill-btn-accent"
                style={{ padding: "8px 18px", fontSize: 12 }}
              >
                {savingAddress ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        )}

        {loadingAddresses ? (
          <SkeletonList />
        ) : addresses.length === 0 ? (
          <p
            className="text-[12.5px] text-center py-2"
            style={{ color: "var(--color-ink4)" }}
          >
            No saved addresses. Your first order will save one automatically.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {addresses.map((addr) => (
              <div
                key={addr.id}
                className="flex items-start gap-3 rounded-2xl p-3.5"
                style={{
                  background: addr.is_default
                    ? "var(--color-accent-bg)"
                    : "var(--color-surface2)",
                  border: `1px solid ${addr.is_default ? "rgba(255,92,53,.25)" : "var(--color-border)"}`,
                }}
              >
                <input
                  type="radio"
                  name="default_address"
                  checked={addr.is_default}
                  onChange={() => handleSetDefault(addr.id)}
                  style={{ accentColor: "var(--color-accent)", marginTop: 3 }}
                />

                {editingAddressId === addr.id ? (
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                    <input
                      value={editForm.full_name || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          full_name: e.target.value,
                        })
                      }
                      placeholder="Full name"
                      className={smallInput + " col-span-2"}
                      style={{
                        ...smallInputStyle,
                        background: "var(--color-surface)",
                      }}
                    />
                    <input
                      value={editForm.phone || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                      placeholder="Phone"
                      className={smallInput}
                      style={{
                        ...smallInputStyle,
                        background: "var(--color-surface)",
                      }}
                    />
                    <input
                      value={editForm.address || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, address: e.target.value })
                      }
                      placeholder="Address"
                      className={smallInput + " col-span-2"}
                      style={{
                        ...smallInputStyle,
                        background: "var(--color-surface)",
                      }}
                    />
                    <input
                      value={editForm.city || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, city: e.target.value })
                      }
                      placeholder="City"
                      className={smallInput}
                      style={{
                        ...smallInputStyle,
                        background: "var(--color-surface)",
                      }}
                    />
                    <input
                      value={editForm.zip || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, zip: e.target.value })
                      }
                      placeholder="ZIP"
                      className={smallInput}
                      style={{
                        ...smallInputStyle,
                        background: "var(--color-surface)",
                      }}
                    />
                    <select
                      value={editForm.country || "US"}
                      onChange={(e) =>
                        setEditForm({ ...editForm, country: e.target.value })
                      }
                      className={smallInput}
                      style={{
                        ...smallInputStyle,
                        background: "var(--color-surface)",
                      }}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={editForm.state_code || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          state_code: e.target.value,
                        })
                      }
                      placeholder="State"
                      className={smallInput}
                      style={{
                        ...smallInputStyle,
                        background: "var(--color-surface)",
                      }}
                    />
                    <input
                      value={editForm.tax_number || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          tax_number: formatCPFCNPJ(e.target.value),
                        })
                      }
                      placeholder="Tax number"
                      className={smallInput}
                      style={{
                        ...smallInputStyle,
                        background: "var(--color-surface)",
                      }}
                    />
                    <div className="col-span-2 flex gap-3 justify-end mt-1">
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs font-semibold text-(--color-ink4)"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="text-xs font-bold bg-(--color-accent) text-white px-3.5 py-1.5 rounded-full"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-[13px] font-semibold"
                        style={{ color: "var(--color-ink)" }}
                      >
                        {addr.full_name}
                      </p>
                      {addr.is_default && (
                        <span
                          className="chip"
                          style={{
                            background: "var(--color-accent)",
                            color: "white",
                          }}
                        >
                          Primary
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[12px] leading-relaxed"
                      style={{ color: "var(--color-ink3)" }}
                    >
                      {addr.address}
                      <br />
                      {addr.city}, {addr.zip}
                      <br />
                      {addr.country}
                    </p>
                    {addr.phone && (
                      <p
                        className="text-[11px] mt-0.5"
                        style={{ color: "var(--color-ink4)" }}
                      >
                        {addr.phone}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  {editingAddressId !== addr.id && (
                    <button
                      onClick={() => handleStartEdit(addr)}
                      className="text-(--color-ink4) hover:text-(--color-ink2) p-1"
                      title="Edit address"
                    >
                      <Edit3 size={13} strokeWidth={1.75} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-rose-400 hover:text-rose-600 p-1"
                    title="Delete address"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preferences */}
      <div
        className="rounded-3xl p-6"
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
          <div className="flex items-center justify-between">
            <span
              className="text-[13px]"
              style={{ color: "var(--color-ink2)" }}
            >
              Newsletter
            </span>
            <button
              onClick={onToggleNewsletter}
              className="relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-200"
              style={{
                background: newsletterSubscribed
                  ? "var(--color-accent)"
                  : "var(--color-border2)",
              }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full transition-transform duration-200"
                style={{
                  background: "white",
                  left: newsletterSubscribed ? "calc(100% - 18px)" : "2px",
                  boxShadow: "var(--shadow-sm)",
                }}
              />
            </button>
          </div>
          {[
            {
              label: "Order confirmation emails",
              key: "order_confirmation" as const,
            },
            {
              label: "Shipping update emails",
              key: "shipping_update" as const,
            },
            { label: "Promotions and deals", key: "promotions" as const },
          ].map(({ label, key }) => {
            const on = preferences[key];
            return (
              <div key={key} className="flex items-center justify-between">
                <span
                  className="text-[13px]"
                  style={{ color: "var(--color-ink2)" }}
                >
                  {label}
                </span>
                <button
                  onClick={() =>
                    onUpdatePreferences({ ...preferences, [key]: !on })
                  }
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
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-3xl p-6"
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
          className="mb-4 text-[12.5px]"
          style={{ color: "var(--color-ink4)" }}
        >
          To update your personal information, please contact support. Deleting
          your account is permanent and cannot be undone.
        </p>
        <button
          className="pill-btn w-full justify-center font-semibold"
          style={{
            background: "var(--color-surface2)",
            color: "var(--color-ink3)",
            border: "1px solid var(--color-border)",
            padding: "12px 26px",
          }}
          onClick={async () => {
            await supabase.auth.signOut();
            onClose();
            window.location.href = "/";
          }}
        >
          <LogOut size={14} strokeWidth={1.75} /> Sign out of InstaWear
        </button>
        <button
          disabled={deletingAccount || !customerId}
          className="pill-btn w-full justify-center mt-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "#FEF2F2",
            color: "#EF4444",
            border: "1px solid #FECACA",
            padding: "12px 26px",
          }}
          onClick={handleDeleteAccount}
        >
          {deletingAccount ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Trash2 size={14} strokeWidth={1.75} />
          )}
          {deletingAccount ? "Deleting..." : "Delete my account"}
        </button>
      </div>
    </div>
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
        className="flex h-15 w-15 items-center justify-center rounded-3xl"
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
          className="pill-btn pill-btn-accent mt-1"
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
          className="rounded-3xl border p-4"
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
            <div className="skeleton h-8 w-16 rounded-full" />
          </div>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="skeleton h-9 w-9 rounded-xl" />
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
          className="rounded-3xl border overflow-hidden"
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
