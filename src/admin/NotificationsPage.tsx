// src/admin/NotificationsPage.tsx
// Version fusionnée – UX avancée + design system InstaWear

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShoppingBag,
  Package,
  Users,
  Wifi,
  WifiOff,
  Shield,
  CreditCard,
  Megaphone,
  Settings,
  Truck,
  Star,
  MessageSquare,
  Eye,
  EyeOff,
  Archive,
  Mail,
  MailOpen,
  CheckCheck,
  Clock,
  Inbox,
  Zap,
  Ban,
  TrendingUp,
  Gift,
  FileText,
  X,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { notificationApi } from "../api/supabaseApi";
import type { AdminSection } from "./AdminSidebar";
import { useAdminHighlight } from "./useAdminHighlight";

// ─── Types ──────────────────────────────────────

export type NotificationPriority = "low" | "medium" | "high" | "urgent";
export type NotificationStatus = "unread" | "read" | "archived";
export type NotificationCategory =
  | "orders"
  | "products"
  | "customers"
  | "interactions"
  | "bonus"
  | "api"
  | "security"
  | "finance";

export interface AdminNotification {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  status: NotificationStatus;
  timestamp: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    productTitle?: string;
    productImage?: string;
    customerName?: string;
    customerId?: string;
    interactionId?: string;
    amount?: number;
    currency?: string;
    linkTo?: string;
    externalRef?: string;
    source?: "Printful" | "Client" | "Système" | "Stripe" | "Shopify";
  };
  icon: React.ReactNode;
  actionLabel?: string;
}

// ─── Constantes visuelles (variables CSS du projet) ────────────────────────

const PRIORITY_META: Record<
  NotificationPriority,
  { label: string; dot: string; ring: string }
> = {
  low: {
    label: "Basse",
    dot: "var(--color-ink4)",
    ring: "var(--color-surface2)",
  },
  medium: {
    label: "Moyenne",
    dot: "var(--color-ink3)",
    ring: "var(--color-surface2)",
  },
  high: {
    label: "Haute",
    dot: "var(--color-accent)",
    ring: "var(--color-accent-bg)",
  },
  urgent: {
    label: "Urgente",
    dot: "var(--color-accent)",
    ring: "var(--color-accent-soft)",
  },
};

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  orders: "Commandes",
  products: "Produits",
  customers: "Clients",
  interactions: "Interactions",
  bonus: "Bonus & Promos",
  api: "API & Technique",
  security: "Sécurité",
  finance: "Finances",
};

const CATEGORY_COLORS: Record<
  NotificationCategory,
  { border: string; bg: string }
> = {
  orders: {
    border: "var(--notif-cat-orders)",
    bg: "var(--notif-cat-orders-bg)",
  },
  products: {
    border: "var(--notif-cat-products)",
    bg: "var(--notif-cat-products-bg)",
  },
  customers: {
    border: "var(--notif-cat-customers)",
    bg: "var(--notif-cat-customers-bg)",
  },
  interactions: {
    border: "var(--notif-cat-interactions)",
    bg: "var(--notif-cat-interactions-bg)",
  },
  bonus: { border: "var(--notif-cat-bonus)", bg: "var(--notif-cat-bonus-bg)" },
  api: { border: "var(--notif-cat-api)", bg: "var(--notif-cat-api-bg)" },
  security: {
    border: "var(--notif-cat-security)",
    bg: "var(--notif-cat-security-bg)",
  },
  finance: {
    border: "var(--notif-cat-finance)",
    bg: "var(--notif-cat-finance-bg)",
  },
};

const CATEGORY_ICONS: Record<NotificationCategory, React.ReactNode> = {
  orders: <ShoppingBag size={13} strokeWidth={1.75} />,
  products: <Package size={13} strokeWidth={1.75} />,
  customers: <Users size={13} strokeWidth={1.75} />,
  interactions: <MessageSquare size={13} strokeWidth={1.75} />,
  bonus: <Gift size={13} strokeWidth={1.75} />,
  api: <Settings size={13} strokeWidth={1.75} />,
  security: <Shield size={13} strokeWidth={1.75} />,
  finance: <CreditCard size={13} strokeWidth={1.75} />,
};

function isNegativeNotification(notification: AdminNotification): boolean {
  const text = (
    notification.title +
    " " +
    notification.description
  ).toLowerCase();
  const negativeWords = [
    "échec",
    "echec",
    "refusé",
    "refuse",
    "annulé",
    "annule",
    "erreur",
    "rupture",
    "délai dépassé",
    "delai depasse",
    "impossible",
    "violation",
    "signalé",
    "signale",
    "fraude",
    "suspecte",
  ];
  return negativeWords.some((w) => text.includes(w));
}

function getNotificationIcon(
  category: NotificationCategory,
  priority: NotificationPriority,
): React.ReactNode {
  // Icônes spécifiques pour certains couples catégorie/priorité
  if (category === "orders" && priority === "high")
    return <XCircle size={17} strokeWidth={1.75} />;
  if (category === "api" && priority === "urgent")
    return <WifiOff size={17} strokeWidth={1.75} />;
  if (category === "security") return <Shield size={17} strokeWidth={1.75} />;
  if (category === "finance")
    return <CreditCard size={17} strokeWidth={1.75} />;

  // Sinon, icône par défaut de la catégorie
  const icons: Record<NotificationCategory, React.ReactNode> = {
    orders: <ShoppingBag size={17} strokeWidth={1.75} />,
    products: <Package size={17} strokeWidth={1.75} />,
    customers: <Users size={17} strokeWidth={1.75} />,
    interactions: <MessageSquare size={17} strokeWidth={1.75} />,
    bonus: <Gift size={17} strokeWidth={1.75} />,
    api: <Settings size={17} strokeWidth={1.75} />,
    security: <Shield size={17} strokeWidth={1.75} />,
    finance: <CreditCard size={17} strokeWidth={1.75} />,
  };
  return icons[category];
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function dayBucket(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86400000,
  );
  if (diffDays <= 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return "Cette semaine";
  return "Plus ancien";
}

// ─── Toast system ──────────────────────────────────────────────────────────

interface ToastState {
  id: number;
  message: string;
}

function useToasts() {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const counter = useRef(0);
  const push = (message: string) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      3200,
    );
  };
  return { toasts, push };
}

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

// ─── Composant principal ───────────────────────────────────────────────────

export default function NotificationsPage() {
  // ─── États ──────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<
    NotificationCategory | "all"
  >("all");
  const [filterPriority, setFilterPriority] = useState<
    NotificationPriority | "all"
  >("all");
  const [filterStatus, setFilterStatus] = useState<NotificationStatus | "all">(
    "all",
  );
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "compact">("list");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showNotifSettings, setShowNotifSettings] = useState(false);
  const [hideArchived, setHideArchived] = useState(true);
  const [pendingNewNotifs, setPendingNewNotifs] = useState(false); // true = clignotement du RefreshCw
  const perPage = 20;
  const { toasts, push: pushToast } = useToasts();

  // ─── Chargement réel depuis l'API ──────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, total } = await notificationApi.list({
        category: filterCategory !== "all" ? filterCategory : undefined,
        priority: filterPriority !== "all" ? filterPriority : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        search: searchTerm || undefined,
        page: currentPage,
        perPage,
        sortOrder,
      });
      setNotifications(data);
      setTotalCount(total);
    } catch (e) {
      console.error("Erreur chargement notifications", e);
    } finally {
      setIsLoading(false);
    }
  }, [
    filterCategory,
    filterPriority,
    filterStatus,
    searchTerm,
    currentPage,
    sortOrder,
  ]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ─── Compteurs (même logique légère que la sidebar, instantanée) ─────

  const [unreadCount, setUnreadCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);

  const fetchCounts = useCallback(() => {
    notificationApi
      .getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
    notificationApi
      .list({ status: "unread", priority: "urgent", perPage: 1 })
      .then(({ total }) => setUrgentCount(total))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    const handler = () => {
      fetchCounts();
      setPendingNewNotifs(true); // déclenche l'effet ping sur le RefreshCw
    };
    window.addEventListener("notifications-updated", handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications-updated", handler);
    };
  }, [fetchCounts]);

  // ─── Handlers (appels API réels) ───────────────────────────────────────

  const handleMarkAsRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    window.dispatchEvent(new Event("notifications-updated"));
    fetchNotifications();
  };

  const handleMarkAsUnread = async (id: string) => {
    await notificationApi.markAsUnread(id);
    window.dispatchEvent(new Event("notifications-updated"));
    fetchNotifications();
  };

  const handleArchive = async (id: string) => {
    await notificationApi.archive(id);
    window.dispatchEvent(new Event("notifications-updated"));
    pushToast("Notification archivée.");
    fetchNotifications();
  };

  const handleUnarchive = async (id: string) => {
    await notificationApi.unarchive(id);
    window.dispatchEvent(new Event("notifications-updated"));
    pushToast("Notification désarchivée.");
    fetchNotifications();
  };

  const handleBulkMarkAsUnread = async () => {
    const count = selectedIds.size;
    await notificationApi.bulkMarkAsUnread([...selectedIds]);
    window.dispatchEvent(new Event("notifications-updated"));
    pushToast(`${count} notification(s) marquée(s) comme non lue(s).`);
    setSelectedIds(new Set());
    fetchNotifications();
  };

  const handleBulkMarkAsRead = async () => {
    await notificationApi.bulkMarkAsRead([...selectedIds]);
    window.dispatchEvent(new Event("notifications-updated"));
    pushToast(`${selectedIds.size} notification(s) marquée(s) comme lue(s).`);
    setSelectedIds(new Set());
    fetchNotifications();
  };

  const handleBulkArchive = async () => {
    const count = selectedIds.size;
    await notificationApi.bulkArchive([...selectedIds]);
    window.dispatchEvent(new Event("notifications-updated"));
    pushToast(`${count} notification(s) archivée(s).`);
    setSelectedIds(new Set());
    fetchNotifications();
  };

  const handleBulkUnarchive = async () => {
    const count = selectedIds.size;
    await notificationApi.bulkUnarchive([...selectedIds]);
    window.dispatchEvent(new Event("notifications-updated"));
    pushToast(`${count} notification(s) désarchivée(s).`);
    setSelectedIds(new Set());
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await notificationApi.markAllAsRead();
    window.dispatchEvent(new Event("notifications-updated"));
    pushToast("Toutes les notifications ont été marquées comme lues.");
    fetchNotifications();
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === notifications.length && notifications.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  // Dans le composant :
  const { navigateAndHighlight } = useAdminHighlight();

  const handleNavigate = (notif: AdminNotification) => {
    const link = notif.metadata?.linkTo;
    if (!link) return;

    const match = link.match(/\/admin\/([a-z-]+)/);
    const section = match ? (match[1] as AdminSection) : null;
    if (!section) return;

    navigateAndHighlight({
      section,
      highlightId:
        notif.metadata?.productId ||
        notif.metadata?.orderId ||
        notif.metadata?.customerId ||
        notif.metadata?.interactionId,
    });
  };

  const handleExport = () => {
    notificationApi
      .exportCsv()
      .then((csv) => {
        const blob = new Blob(["\uFEFF" + csv], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `notifications-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        pushToast(
          `Export CSV généré – ${notifications.length} notification(s).`,
        );
      })
      .catch(() => pushToast("Erreur lors de l'export."));
  };

  const activeFilterCount = [
    filterCategory !== "all",
    filterPriority !== "all",
    filterStatus !== "all",
  ].filter(Boolean).length;

  // Compteurs non lues par catégorie (pour les dots sur les filtres)
  const unreadByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications
      .filter((n) => n.status === "unread")
      .forEach((n) => {
        counts[n.category] = (counts[n.category] || 0) + 1;
      });
    return counts;
  }, [notifications]);

  const unreadByPriority = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications
      .filter((n) => n.status === "unread")
      .forEach((n) => {
        counts[n.priority] = (counts[n.priority] || 0) + 1;
      });
    return counts;
  }, [notifications]);

  const totalUnreadForFilters = Object.values(unreadByCategory).reduce(
    (s, c) => s + c,
    0,
  );

  const resetFilters = () => {
    setFilterCategory("all");
    setFilterPriority("all");
    setFilterStatus("all");
    setSearchTerm("");
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterPriority, filterStatus, searchTerm]);

  useEffect(() => {
    if (!showNotifSettings) return;
    const handleClickOutside = () => setShowNotifSettings(false);
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showNotifSettings]);

  // ─── Catégories pour le bento stats ──────────────────────────────────
  const [categoryBreakdownData, setCategoryBreakdownData] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    notificationApi
      .getCategoryBreakdown()
      .then(setCategoryBreakdownData)
      .catch(() => {});
  }, [notifications]); // se recharge quand notifications change

  const categoryBreakdown = useMemo(() => {
    const total =
      Object.values(categoryBreakdownData).reduce((s, c) => s + c, 0) || 1;
    return (Object.keys(categoryBreakdownData) as NotificationCategory[])
      .map((key) => ({
        key,
        count: categoryBreakdownData[key],
        pct: Math.round((categoryBreakdownData[key] / total) * 100),
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [categoryBreakdownData]);

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  // ─── Groupement par jour ──────────────────────────────────────────────
  const groupedByDay = useMemo(() => {
    const groups: { label: string; items: AdminNotification[] }[] = [];
    for (const notif of notifications) {
      const label = dayBucket(notif.timestamp);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(notif);
      else groups.push({ label, items: [notif] });
    }
    return groups;
  }, [notifications]);

  // ─── Rendu ────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--color-accent-bg)",
              color: "var(--color-accent)",
            }}
          >
            <Inbox size={19} strokeWidth={1.75} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--color-ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                Notifications
              </h2>
              <button
                onClick={() => {
                  setPendingNewNotifs(false);
                  fetchNotifications();
                }}
                title="Rafraîchir les notifications"
                style={{
                  background: pendingNewNotifs
                    ? "var(--color-accent-bg)"
                    : "var(--color-surface2)",
                  border: `1px solid ${pendingNewNotifs ? "var(--color-accent)" : "var(--color-border)"}`,
                  borderRadius: 8,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: pendingNewNotifs
                    ? "var(--color-accent)"
                    : "var(--color-ink2)",
                  display: "flex",
                  alignItems: "center",
                  boxShadow: pendingNewNotifs
                    ? "0 0 0 3px rgba(255,92,53,0.25)"
                    : "none",
                  animation: pendingNewNotifs
                    ? "pulse-ring 1.8s ease-out infinite"
                    : "none",
                  transition:
                    "background 0.2s, border-color 0.2s, color 0.2s, box-shadow 0.2s",
                }}
              >
                <RefreshCw size={14} strokeWidth={2} />
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--color-ink3)" }}>
              {unreadCount > 0
                ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`
                : "Tout est à jour"}
              {urgentCount > 0 && (
                <span style={{ color: "var(--color-accent)" }}>
                  {" · "}
                  {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* setting */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            style={{
              ...secondaryBtn,
              opacity: unreadCount === 0 ? 0.4 : 1,
              cursor: unreadCount === 0 ? "not-allowed" : "pointer",
            }}
          >
            <CheckCheck size={14} strokeWidth={1.75} /> Tout marquer comme lu
          </button>
          <button onClick={handleExport} style={secondaryBtn}>
            <FileText size={14} strokeWidth={1.75} /> Exporter
          </button>
          <div
            style={{
              display: "flex",
              gap: 1,
              background: "var(--color-surface2)",
              borderRadius: 10,
              padding: 3,
            }}
          >
            {(["list", "compact"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  ...toggleBtn,
                  background:
                    viewMode === mode ? "var(--color-surface)" : "transparent",
                  color:
                    viewMode === mode
                      ? "var(--color-ink)"
                      : "var(--color-ink4)",
                }}
              >
                {mode === "list" ? "Liste" : "Compact"}
              </button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifSettings((prev) => !prev);
              }}
              title="Paramètres d'affichage"
              style={{
                ...secondaryBtn,
                padding: "6px 8px",
              }}
            >
              <Settings size={14} />
            </button>
            {showNotifSettings && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 8,
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  boxShadow: "var(--shadow-xl)",
                  padding: "14px 18px",
                  zIndex: 100,
                  minWidth: 220,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "var(--color-ink)",
                    fontWeight: 600,
                  }}
                >
                  <span>Masquer les archivées</span>
                  <button
                    onClick={() => setHideArchived((prev) => !prev)}
                    style={{
                      background: hideArchived
                        ? "var(--color-accent)"
                        : "var(--color-surface2)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 999,
                      width: 36,
                      height: 20,
                      position: "relative",
                      cursor: "pointer",
                      padding: 0,
                      transition: "background 0.2s",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        left: hideArchived ? 18 : 2,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
        {/* Deux petites cartes empilées */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MiniStatCard
            label="Non lues"
            value={unreadCount}
            icon={<Inbox size={16} strokeWidth={2} />}
            accent
          />
          <MiniStatCard
            label="Urgentes"
            value={urgentCount}
            icon={<Zap size={16} strokeWidth={2} />}
          />
        </div>

        {/* Répartition par catégorie avec barres */}
        <div style={cardStyle}>
          <h3
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              marginBottom: 16,
            }}
          >
            Répartition par catégorie
          </h3>
          {categoryBreakdown.length > 0 ? (
            categoryBreakdown.map((c) => (
              <ProgressBar
                key={c.key}
                label={CATEGORY_LABELS[c.key]}
                pct={c.pct}
                color="var(--color-accent)"
              />
            ))
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: 12,
                color: "var(--color-ink4)",
                fontSize: 13,
              }}
            >
              Aucune notification active.
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {" "}
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          style={{
            ...secondaryBtn,
            position: "relative",
            borderColor:
              activeFilterCount > 0
                ? "var(--color-accent)"
                : "var(--color-border)",
            background:
              activeFilterCount > 0
                ? "var(--color-accent-bg)"
                : "var(--color-surface)",
            color:
              activeFilterCount > 0
                ? "var(--color-accent)"
                : "var(--color-ink2)",
          }}
        >
          {!filtersOpen && totalUnreadForFilters > 0 && (
            <span
              style={{
                position: "absolute",
                top: -3,
                left: -3,
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--color-accent)",
                border: "1.5px solid var(--color-surface)",
              }}
            />
          )}
          <SlidersHorizontal size={14} strokeWidth={1.75} />
          Filtres
          {activeFilterCount > 0 && (
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "var(--color-accent)",
                color: "white",
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            size={13}
            strokeWidth={1.75}
            style={{
              transition: "transform 0.2s",
              transform: filtersOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
        <button
          onClick={() =>
            setSortOrder((p) => (p === "newest" ? "oldest" : "newest"))
          }
          style={secondaryBtn}
        >
          <Clock size={14} strokeWidth={1.75} />
          {sortOrder === "newest" ? "Plus récent" : "Plus ancien"}
        </button>
        <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
          <Search
            size={14}
            strokeWidth={1.75}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-ink4)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Rechercher une commande, un client, un produit…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>
      </div>

      {/* Panneau de filtres */}
      {filtersOpen && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            padding: 12,
            borderRadius: 14,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
          }}
        >
          <FilterSelect
            value={filterCategory}
            onChange={(v) => setFilterCategory(v as any)}
            placeholder="Toutes catégories"
            options={Object.entries(CATEGORY_LABELS).map(([k, v]) => ({
              value: k,
              label: v,
              dotCount: unreadByCategory[k] || 0,
            }))}
            dotCount={totalUnreadForFilters}
          />
          <FilterSelect
            value={filterPriority}
            onChange={(v) => setFilterPriority(v as any)}
            placeholder="Toutes priorités"
            options={[
              {
                value: "low",
                label: "Basse",
                dotCount: unreadByPriority["low"] || 0,
              },
              {
                value: "medium",
                label: "Moyenne",
                dotCount: unreadByPriority["medium"] || 0,
              },
              {
                value: "high",
                label: "Haute",
                dotCount: unreadByPriority["high"] || 0,
              },
              {
                value: "urgent",
                label: "Urgente",
                dotCount: unreadByPriority["urgent"] || 0,
              },
            ]}
            dotCount={totalUnreadForFilters}
          />
          <FilterSelect
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as any)}
            placeholder="Tous statuts"
            options={[
              { value: "unread", label: "Non lue" },
              { value: "read", label: "Lue" },
              { value: "archived", label: "Archivée" },
            ]}
          />
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "none",
                border: "none",
                color: "var(--color-accent)",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <X size={12} strokeWidth={2} /> Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Barre d'actions groupées */}
      <div
        style={{
          overflow: "hidden",
          maxHeight: selectedIds.size > 0 ? 60 : 0,
          opacity: selectedIds.size > 0 ? 1 : 0,
          transition: "max-height 0.3s ease, opacity 0.3s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            borderRadius: 14,
            background: "var(--color-accent)",
            color: "white",
            boxShadow: "var(--shadow-accent)",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {(() => {
              const selectedNotifications = notifications.filter((n) =>
                selectedIds.has(n.id),
              );
              const allRead =
                selectedNotifications.length > 0 &&
                selectedNotifications.every((n) => n.status === "read");
              const allUnread =
                selectedNotifications.length > 0 &&
                selectedNotifications.every((n) => n.status === "unread");
              const allArchived =
                selectedNotifications.length > 0 &&
                selectedNotifications.every((n) => n.status === "archived");
              const hasArchived = selectedNotifications.some(
                (n) => n.status === "archived",
              );

              return (
                <>
                  <button
                    onClick={handleBulkMarkAsRead}
                    disabled={allRead || hasArchived}
                    style={{
                      ...actionBtnWhite,
                      opacity: allRead || hasArchived ? 0.4 : 1,
                      cursor:
                        allRead || hasArchived ? "not-allowed" : "pointer",
                    }}
                  >
                    <Eye size={13} strokeWidth={1.75} /> Marquer lue(s)
                  </button>
                  <button
                    onClick={handleBulkMarkAsUnread}
                    disabled={allUnread && !allArchived}
                    style={{
                      ...actionBtnWhite,
                      opacity: allUnread && !allArchived ? 0.4 : 1,
                      cursor:
                        allUnread && !allArchived ? "not-allowed" : "pointer",
                    }}
                  >
                    <EyeOff size={13} strokeWidth={1.75} /> Marquer non lue(s)
                  </button>
                </>
              );
            })()}
            {(() => {
              const selectedNotifications = notifications.filter((n) =>
                selectedIds.has(n.id),
              );
              const allArchived =
                selectedNotifications.length > 0 &&
                selectedNotifications.every((n) => n.status === "archived");
              return allArchived ? (
                <button
                  onClick={handleBulkUnarchive}
                  style={{ ...actionBtnWhite }}
                >
                  <Mail size={13} strokeWidth={1.75} /> Désarchiver
                </button>
              ) : (
                <button
                  onClick={handleBulkArchive}
                  style={{ ...actionBtnWhite }}
                >
                  <Archive size={13} strokeWidth={1.75} /> Archiver
                </button>
              );
            })()}
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
              }}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 14,
                padding: 16,
                borderRadius: 14,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <div
                className="skeleton"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  className="skeleton"
                  style={{ height: 14, width: "42%", borderRadius: 999 }}
                />
                <div
                  className="skeleton"
                  style={{ height: 12, width: "68%", borderRadius: 999 }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          hasFilters={activeFilterCount > 0 || !!searchTerm}
          onReset={resetFilters}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--color-ink3)",
                marginLeft: 4,
              }}
            >
              <input
                type="checkbox"
                checked={
                  selectedIds.size === notifications.length &&
                  notifications.length > 0
                }
                onChange={handleSelectAll}
                style={{ accentColor: "var(--color-accent)" }}
              />
              Tout sélectionner ({notifications.length})
            </label>

            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    ...pageBtn,
                    opacity: currentPage === 1 ? 0.4 : 1,
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  }}
                >
                  ←
                </button>
                <span style={{ fontSize: 12.5, color: "var(--color-ink3)" }}>
                  {currentPage}/{totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  style={{
                    ...pageBtn,
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    cursor:
                      currentPage === totalPages ? "not-allowed" : "pointer",
                  }}
                >
                  →
                </button>
              </div>
            )}
          </div>

          {groupedByDay.map((group) => {
            const visibleItems =
              hideArchived && filterStatus !== "archived"
                ? group.items.filter((n) => n.status !== "archived")
                : group.items;
            if (visibleItems.length === 0) return null;
            return (
              <div
                key={group.label}
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--color-ink4)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginLeft: 4,
                  }}
                >
                  {group.label}
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: viewMode === "compact" ? 6 : 10,
                  }}
                >
                  {visibleItems.map((notif) => (
                    <NotificationCard
                      key={notif.id}
                      notification={notif}
                      compact={viewMode === "compact"}
                      isSelected={selectedIds.has(notif.id)}
                      onToggleSelect={() => handleToggleSelect(notif.id)}
                      onMarkRead={() => handleMarkAsRead(notif.id)}
                      onMarkUnread={() => handleMarkAsUnread(notif.id)}
                      onArchive={() => handleArchive(notif.id)}
                      onNavigate={() => handleNavigate(notif)}
                      onUnarchive={() => handleUnarchive(notif.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            style={{
              ...pageBtn,
              opacity: currentPage === 1 ? 0.4 : 1,
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            ←
          </button>
          <span style={{ fontSize: 12.5, color: "var(--color-ink3)" }}>
            Page {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            style={{
              ...pageBtn,
              opacity: currentPage === totalPages ? 0.4 : 1,
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            }}
          >
            →
          </button>
        </div>
      )}

      {/* Toasts */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderRadius: 12,
              borderLeft: "3px solid var(--color-accent)",
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-lg)",
              animation: "slideInRight 0.3s ease",
            }}
          >
            <CheckCircle2
              size={15}
              strokeWidth={1.75}
              style={{ color: "var(--color-accent)", flexShrink: 0 }}
            />
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: "var(--color-ink)",
              }}
            >
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sous-composants ───────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
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
          color: accent ? "rgba(255,255,255,0.8)" : "var(--color-accent)",
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
    </div>
  );
}

function MiniStatCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? "var(--color-accent)" : "var(--color-surface)",
        border: accent ? "none" : "1px solid var(--color-border)",
        borderRadius: 16,
        padding: "14px 18px",
        boxShadow: accent ? "var(--shadow-accent)" : "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: accent ? "rgba(255,255,255,0.7)" : "var(--color-ink3)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </p>
        <span
          style={{
            color: accent ? "rgba(255,255,255,0.7)" : "var(--color-accent)",
          }}
        >
          {icon}
        </span>
      </div>
      <p
        style={{
          fontSize: 26,
          fontWeight: 800,
          color: accent ? "white" : "var(--color-ink)",
          lineHeight: 1,
          marginTop: 6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  dotCount,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; dotCount?: number }[];
  placeholder: string;
  dotCount?: number;
}) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={selectStyle}
      >
        <option value="all">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.dotCount && o.dotCount > 0 ? " ●" : ""}
          </option>
        ))}
      </select>
      {dotCount !== undefined && dotCount > 0 && (
        <span
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "var(--color-accent)",
            color: "white",
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          {dotCount}
        </span>
      )}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onReset,
}: {
  hasFilters: boolean;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: 64,
        borderRadius: 16,
        border: "1px dashed var(--color-border)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-surface2)",
          color: "var(--color-ink4)",
        }}
      >
        <Inbox size={22} strokeWidth={1.5} />
      </div>
      <div>
        <p
          style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink2)" }}
        >
          {hasFilters
            ? "Aucune notification ne correspond"
            : "Aucune notification"}
        </p>
        <p style={{ fontSize: 12.5, color: "var(--color-ink4)", marginTop: 2 }}>
          {hasFilters
            ? "Essayez d'ajuster vos filtres ou votre recherche."
            : "Les nouveaux événements de la boutique apparaîtront ici."}
        </p>
      </div>
      {hasFilters && (
        <button onClick={onReset} style={{ ...secondaryBtn, marginTop: 4 }}>
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );
}

function NotificationCard({
  notification,
  compact,
  isSelected,
  onToggleSelect,
  onMarkRead,
  onMarkUnread,
  onArchive,
  onUnarchive,
  onNavigate,
}: {
  notification: AdminNotification;
  compact: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onNavigate: (notif: AdminNotification) => void;
}) {
  const priorityMeta = PRIORITY_META[notification.priority];
  const isUnread = notification.status === "unread";
  const isArchived = notification.status === "archived";
  const [isHovered, setIsHovered] = useState(false);
  const negative = isNegativeNotification(notification);
  const catColor = negative
    ? { border: "var(--notif-negative)", bg: "var(--notif-negative-bg)" }
    : CATEGORY_COLORS[notification.category];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(notification)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onNavigate(notification);
      }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: compact ? "center" : "flex-start",
        gap: compact ? 12 : 14,
        padding: compact ? "10px 14px" : "14px 18px",
        borderRadius: 14,
        border: `1px solid ${isUnread ? catColor.border : "var(--color-border)"}`,
        background: "var(--color-surface)",
        opacity: isArchived ? 0.55 : 1,
        cursor: "pointer",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: isUnread ? "0 0 0 0 transparent" : "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (!isUnread)
          e.currentTarget.style.borderColor = "var(--color-border2)";
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (!isUnread)
          e.currentTarget.style.borderColor = "var(--color-border)";
      }}
    >
      {isUnread && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 12,
            bottom: 12,
            width: 3,
            borderRadius: 999,
            background: catColor.border,
          }}
        />
      )}

      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        style={{
          marginTop: compact ? 0 : 3,
          accentColor: "var(--color-accent)",
        }}
      />

      <div
        style={{
          width: compact ? 32 : 40,
          height: compact ? 32 : 40,
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isUnread ? catColor.bg : "var(--color-surface2)",
          color: isUnread ? catColor.border : "var(--color-ink3)",
          flexShrink: 0,
          transition: "background 0.2s",
        }}
      >
        {getNotificationIcon(notification.category, notification.priority)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: compact ? 12.5 : 13.5,
              fontWeight: isUnread ? 600 : 500,
              color: isUnread ? "var(--color-ink)" : "var(--color-ink2)",
            }}
          >
            {notification.title}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "1px 8px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 600,
              background: priorityMeta.ring,
              color: "var(--color-ink2)",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: priorityMeta.dot,
              }}
            />
            {priorityMeta.label}
          </span>
        </div>

        {!compact && (
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink3)",
              lineHeight: 1.5,
              marginBottom: 6,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {notification.description}
          </p>
        )}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px 10px",
            fontSize: 11,
            color: "var(--color-ink4)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={10} strokeWidth={1.75} />
            {timeAgo(notification.timestamp)}
          </span>
          {notification.metadata?.source && (
            <span>· {notification.metadata.source}</span>
          )}
          {notification.metadata?.orderId && (
            <span>· {notification.metadata.orderId}</span>
          )}
          {notification.metadata?.amount && (
            <span style={{ fontWeight: 600, color: "var(--color-ink3)" }}>
              ·{" "}
              {notification.metadata.amount.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
              })}{" "}
              {notification.metadata.currency}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 2,
          alignItems: "center",
          flexShrink: 0,
          opacity: isHovered ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      >
        {/* Marquer comme lue (enveloppe ouverte) – uniquement si non lue */}
        {notification.status === "unread" && (
          <IconAction
            icon={<MailOpen size={14} strokeWidth={1.75} />}
            label="Marquer comme lue"
            onClick={onMarkRead}
          />
        )}

        {/* Marquer comme non lue (enveloppe fermée) – uniquement si lue, pas si archivée */}
        {notification.status === "read" && (
          <IconAction
            icon={<Mail size={14} strokeWidth={1.75} />}
            label="Marquer non lue"
            onClick={onMarkUnread}
          />
        )}

        {/* Archiver / Désarchiver */}
        {notification.status !== "archived" ? (
          <IconAction
            icon={<Archive size={14} strokeWidth={1.75} />}
            label="Archiver"
            onClick={onArchive}
          />
        ) : (
          <IconAction
            icon={<Archive size={14} strokeWidth={1.75} />}
            label="Désarchiver"
            onClick={onUnarchive}
          />
        )}
        {/* Voir */}
        {notification.metadata?.linkTo && (
          <IconAction
            icon={<ExternalLink size={14} strokeWidth={1.75} />}
            label="Voir"
            accent
            onClick={() => onNavigate(notification)}
          />
        )}
      </div>
    </div>
  );
}

function IconAction({
  icon,
  label,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: accent ? "var(--color-accent)" : "var(--color-ink4)",
        transition: "background 0.15s, color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = accent
          ? "var(--color-accent-bg)"
          : "var(--color-surface2)";
        e.currentTarget.style.color = accent
          ? "var(--color-accent)"
          : "var(--color-ink2)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = accent
          ? "var(--color-accent)"
          : "var(--color-ink4)";
      }}
    >
      {icon}
    </button>
  );
}

// ─── Styles réutilisés ─────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "var(--shadow-sm)",
};

const secondaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12.5,
  cursor: "pointer",
  transition: "border-color 0.2s, color 0.2s",
};

const toggleBtn: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 7,
  border: "none",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  background: "transparent",
  transition: "background 0.2s, color 0.2s",
};

const actionBtnWhite: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  borderRadius: 8,
  border: "none",
  background: "rgba(255,255,255,0.15)",
  color: "white",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  transition: "background 0.2s",
};

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px 10px 36px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  fontSize: 13,
  color: "var(--color-ink)",
  outline: "none",
  transition: "border-color 0.2s",
};

const selectStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  fontSize: 12.5,
  fontWeight: 500,
  color: "var(--color-ink2)",
  cursor: "pointer",
  outline: "none",
  transition: "border-color 0.2s",
};

const pageBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-ink2)",
  cursor: "pointer",
  fontWeight: 600,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "border-color 0.2s",
};
