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
} from "lucide-react";
import { notificationApi } from "../api/supabaseApi";

// ─── Types (conservés de ta version) ──────────────────────────────────────

export type NotificationPriority = "low" | "medium" | "high" | "urgent";
export type NotificationStatus = "unread" | "read" | "archived";
export type NotificationCategory =
  | "orders"
  | "products"
  | "customers"
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
  bonus: "Bonus & Promos",
  api: "API & Technique",
  security: "Sécurité",
  finance: "Finances",
};

const CATEGORY_ICONS: Record<NotificationCategory, React.ReactNode> = {
  orders: <ShoppingBag size={13} strokeWidth={1.75} />,
  products: <Package size={13} strokeWidth={1.75} />,
  customers: <Users size={13} strokeWidth={1.75} />,
  bonus: <Gift size={13} strokeWidth={1.75} />,
  api: <Settings size={13} strokeWidth={1.75} />,
  security: <Shield size={13} strokeWidth={1.75} />,
  finance: <CreditCard size={13} strokeWidth={1.75} />,
};

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
  const perPage = 10;
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

  // ─── Compteur non lues (polling toutes les 30s) ────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    notificationApi
      .getUnreadCount()
      .then(setUnreadCount)
      .catch(() => {});
    const interval = setInterval(() => {
      notificationApi
        .getUnreadCount()
        .then(setUnreadCount)
        .catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [notifications]);

  // ─── Handlers (appels API réels) ───────────────────────────────────────

  const handleMarkAsRead = async (id: string) => {
    await notificationApi.markAsRead(id);
    fetchNotifications();
  };

  const handleMarkAsUnread = async (id: string) => {
    await notificationApi.markAsUnread(id);
    fetchNotifications();
  };

  const handleArchive = async (id: string) => {
    await notificationApi.archive(id);
    pushToast("Notification archivée.");
    fetchNotifications();
  };

  const handleBulkMarkAsRead = async () => {
    await notificationApi.bulkMarkAsRead([...selectedIds]);
    pushToast(`${selectedIds.size} notification(s) marquée(s) comme lue(s).`);
    setSelectedIds(new Set());
    fetchNotifications();
  };

  const handleBulkArchive = async () => {
    const count = selectedIds.size;
    await notificationApi.bulkArchive([...selectedIds]);
    pushToast(`${count} notification(s) archivée(s).`);
    setSelectedIds(new Set());
    fetchNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await notificationApi.markAllAsRead();
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

  const handleNavigate = (link?: string, title?: string) => {
    if (!link) return;
    pushToast(`Navigation vers : ${title ?? link}`);
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

  const resetFilters = () => {
    setFilterCategory("all");
    setFilterPriority("all");
    setFilterStatus("all");
    setSearchTerm("");
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterPriority, filterStatus, searchTerm]);

  // ─── Catégories pour le bento stats ──────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const counts: Record<NotificationCategory, number> = {
      orders: 0,
      products: 0,
      customers: 0,
      bonus: 0,
      api: 0,
      security: 0,
      finance: 0,
    };
    notifications
      .filter((n) => n.status !== "archived")
      .forEach((n) => counts[n.category]++);
    const max = Math.max(1, ...Object.values(counts));
    return (Object.keys(counts) as NotificationCategory[])
      .map((key) => ({
        key,
        count: counts[key],
        pct: (counts[key] / max) * 100,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [notifications]);

  const urgentCount = notifications.filter(
    (n) => n.status !== "archived" && n.priority === "urgent",
  ).length;
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
        </div>
      </div>

      {/* Bento stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1.6fr",
          gap: 12,
        }}
      >
        <StatCard
          label="Non lues"
          value={unreadCount}
          icon={<Inbox size={16} strokeWidth={1.75} />}
          tone="accent"
        />
        <StatCard
          label="Urgentes en attente"
          value={urgentCount}
          icon={<Zap size={16} strokeWidth={1.75} />}
          tone={urgentCount > 0 ? "warning" : "neutral"}
        />
        <div style={{ ...cardStyle, padding: 16 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-ink4)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Répartition par catégorie
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {categoryBreakdown.map((c) => (
              <div
                key={c.key}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--color-surface2)",
                    color: "var(--color-ink3)",
                    flexShrink: 0,
                  }}
                >
                  {CATEGORY_ICONS[c.key]}
                </span>
                <span
                  style={{
                    width: 88,
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--color-ink2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {CATEGORY_LABELS[c.key]}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    background: "var(--color-surface2)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${c.pct}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "var(--color-accent)",
                      transition: "width 0.7s ease",
                    }}
                  />
                </div>
                <span
                  style={{
                    width: 20,
                    flexShrink: 0,
                    textAlign: "right",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink3)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {c.count}
                </span>
              </div>
            ))}
          </div>
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

        <button
          onClick={() => setFiltersOpen((v) => !v)}
          style={{
            ...secondaryBtn,
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
            }))}
          />
          <FilterSelect
            value={filterPriority}
            onChange={(v) => setFilterPriority(v as any)}
            placeholder="Toutes priorités"
            options={[
              { value: "low", label: "Basse" },
              { value: "medium", label: "Moyenne" },
              { value: "high", label: "Haute" },
              { value: "urgent", label: "Urgente" },
            ]}
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
            <button
              onClick={handleBulkMarkAsRead}
              style={{ ...actionBtnWhite }}
            >
              <Eye size={13} strokeWidth={1.75} /> Marquer lue(s)
            </button>
            <button onClick={handleBulkArchive} style={{ ...actionBtnWhite }}>
              <Archive size={13} strokeWidth={1.75} /> Archiver
            </button>
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

          {groupedByDay.map((group) => (
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
                {group.items.map((notif) => (
                  <NotificationCard
                    key={notif.id}
                    notification={notif}
                    compact={viewMode === "compact"}
                    isSelected={selectedIds.has(notif.id)}
                    onToggleSelect={() => handleToggleSelect(notif.id)}
                    onMarkRead={() => handleMarkAsRead(notif.id)}
                    onMarkUnread={() => handleMarkAsUnread(notif.id)}
                    onArchive={() => handleArchive(notif.id)}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
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
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "accent" | "warning" | "neutral";
}) {
  const toneBg =
    tone === "accent"
      ? "var(--color-accent-bg)"
      : tone === "warning"
        ? "var(--color-gold-bg)"
        : "var(--color-surface2)";
  const toneColor =
    tone === "accent"
      ? "var(--color-accent)"
      : tone === "warning"
        ? "var(--color-gold)"
        : "var(--color-ink3)";

  return (
    <div style={cardStyle}>
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
            color: "var(--color-ink4)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </p>
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: toneBg,
            color: toneColor,
          }}
        >
          {icon}
        </span>
      </div>
      <p
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "var(--color-ink)",
          marginTop: 8,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.02em",
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
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={selectStyle}
    >
      <option value="all">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
  onNavigate,
}: {
  notification: AdminNotification;
  compact: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onArchive: () => void;
  onNavigate: (link?: string, title?: string) => void;
}) {
  const priorityMeta = PRIORITY_META[notification.priority];
  const isUnread = notification.status === "unread";
  const isArchived = notification.status === "archived";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() =>
        onNavigate(notification.metadata?.linkTo, notification.title)
      }
      onKeyDown={(e) => {
        if (e.key === "Enter")
          onNavigate(notification.metadata?.linkTo, notification.title);
      }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: compact ? "center" : "flex-start",
        gap: compact ? 12 : 14,
        padding: compact ? "10px 14px" : "14px 18px",
        borderRadius: 14,
        border: `1px solid ${isUnread ? "var(--color-accent)" : "var(--color-border)"}`,
        background: "var(--color-surface)",
        opacity: isArchived ? 0.55 : 1,
        cursor: "pointer",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        boxShadow: isUnread ? "0 0 0 0 transparent" : "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        if (!isUnread)
          e.currentTarget.style.borderColor = "var(--color-border2)";
      }}
      onMouseLeave={(e) => {
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
            background: "var(--color-accent)",
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
          background: isUnread
            ? "var(--color-accent-bg)"
            : "var(--color-surface2)",
          color: isUnread ? "var(--color-accent)" : "var(--color-ink3)",
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

      {!compact && (
        <div
          style={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexShrink: 0,
            opacity: 0,
            transition: "opacity 0.2s",
          }}
          className="notification-actions"
        >
          {notification.status !== "read" && (
            <IconAction
              icon={<Eye size={14} strokeWidth={1.75} />}
              label="Marquer comme lue"
              onClick={onMarkRead}
            />
          )}
          {notification.status !== "unread" &&
            notification.status !== "archived" && (
              <IconAction
                icon={<EyeOff size={14} strokeWidth={1.75} />}
                label="Marquer non lue"
                onClick={onMarkUnread}
              />
            )}
          {notification.status !== "archived" && (
            <IconAction
              icon={<Archive size={14} strokeWidth={1.75} />}
              label="Archiver"
              onClick={onArchive}
            />
          )}
          {notification.metadata?.linkTo && (
            <IconAction
              icon={<ExternalLink size={14} strokeWidth={1.75} />}
              label="Voir"
              accent
              onClick={() =>
                onNavigate(notification.metadata!.linkTo, notification.title)
              }
            />
          )}
        </div>
      )}
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
