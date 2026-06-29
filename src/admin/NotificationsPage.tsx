// src/admin/NotificationsPage.tsx

import React, { useState, useMemo } from "react";
import {
  Bell,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  ShoppingBag,
  Package,
  Users,
  Tag,
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
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  MoreHorizontal,
  RefreshCw,
  Inbox,
  Zap,
  Ban,
  TrendingUp,
  Gift,
  BarChart3,
  FileText,
} from "lucide-react";

// ─── Types TypeScript (anticipent la connexion backend) ─────────────────────

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
  timestamp: string; // ISO
  metadata?: {
    orderId?: string;
    productId?: string;
    productTitle?: string;
    productImage?: string;
    customerName?: string;
    amount?: number;
    currency?: string;
    linkTo?: string; // simule la navigation future
    externalRef?: string;
    source?: "Printful" | "Client" | "Système" | "Stripe" | "Shopify";
  };
  icon: React.ReactNode;
  actionLabel?: string;
}

// ─── Données mockées ultra‑réalistes (20+ notifications) ────────────────────

const MOCK_NOTIFICATIONS: AdminNotification[] = [
  {
    id: "1",
    title: "Nouvelle commande #ORD-2026-1173",
    description: "Client : Jean Dupont. 3 articles pour un total de 152,97 $.",
    category: "orders",
    priority: "medium",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(), // il y a 12 min
    metadata: {
      orderId: "ORD-2026-1173",
      customerName: "Jean Dupont",
      amount: 152.97,
      currency: "$",
      linkTo: "/admin/orders/ORD-2026-1173",
      productTitle: "T-Shirt Rio Carnival, Mug Brazil, Coque iPhone",
    },
    icon: <ShoppingBag size={18} />,
    actionLabel: "Voir la commande",
  },
  {
    id: "2",
    title: "Statut commande mis à jour",
    description: 'Commande #ORD-2026-1170 est passée en "Expédiée".',
    category: "orders",
    priority: "low",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    metadata: {
      orderId: "ORD-2026-1170",
      linkTo: "/admin/orders/ORD-2026-1170",
      source: "Printful",
    },
    icon: <Truck size={18} />,
    actionLabel: "Suivre le colis",
  },
  {
    id: "3",
    title: "Échec création commande Printful",
    description:
      "La commande #ORD-2026-1168 n'a pas pu être envoyée à Printful (erreur 400).",
    category: "orders",
    priority: "high",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    metadata: {
      orderId: "ORD-2026-1168",
      source: "Printful",
      linkTo: "/admin/orders/ORD-2026-1168",
    },
    icon: <XCircle size={18} />,
    actionLabel: "Résoudre le problème",
  },
  {
    id: "4",
    title: "Délai d'impression dépassé",
    description:
      "Commande #ORD-2026-1165 : l'impression chez Printful prend plus de 3 jours.",
    category: "orders",
    priority: "high",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    metadata: {
      orderId: "ORD-2026-1165",
      source: "Printful",
      linkTo: "/admin/orders/ORD-2026-1165",
    },
    icon: <Clock size={18} />,
    actionLabel: "Contacter le support Printful",
  },
  {
    id: "5",
    title: "Nouveau produit importé",
    description:
      'Le produit "Tough Case for iPhone®" a été importé depuis Printful.',
    category: "products",
    priority: "low",
    status: "read",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    metadata: {
      productId: "prod-printful-441770369",
      productTitle: "Tough Case for iPhone®",
      productImage: "https://files.cdn.printful.com/...",
      linkTo: "/admin/products/prod-printful-441770369",
    },
    icon: <Package size={18} />,
    actionLabel: "Voir le produit",
  },
  {
    id: "6",
    title: "Produit en rupture chez Printful",
    description:
      'Le variant "M / Black" du produit "Haiti Unisex t-shirt" est en rupture de stock.',
    category: "products",
    priority: "high",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    metadata: {
      productId: "prod-printful-441780380",
      productTitle: "Haiti Unisex t-shirt",
      linkTo: "/admin/products/prod-printful-441780380",
      source: "Printful",
    },
    icon: <Ban size={18} />,
    actionLabel: "Désactiver le variant",
  },
  {
    id: "7",
    title: "Sync Printful échouée",
    description:
      "La synchronisation automatique a rencontré une erreur (401 Unauthorized).",
    category: "api",
    priority: "urgent",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    metadata: {
      source: "Printful",
      linkTo: "/admin/settings",
    },
    icon: <WifiOff size={18} />,
    actionLabel: "Vérifier la connexion API",
  },
  {
    id: "8",
    title: "Nouveau client inscrit",
    description: "Marie Lambert s'est inscrite sur le site.",
    category: "customers",
    priority: "low",
    status: "read",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    metadata: {
      customerName: "Marie Lambert",
      linkTo: "/admin/customers",
    },
    icon: <Users size={18} />,
    actionLabel: "Voir le profil",
  },
  {
    id: "9",
    title: "Client VIP atteint",
    description:
      'Carlos Mendes a atteint le palier "Gold" avec plus de 500 $ d\'achats.',
    category: "customers",
    priority: "medium",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    metadata: {
      customerName: "Carlos Mendes",
      amount: 520,
      currency: "$",
      linkTo: "/admin/customers",
    },
    icon: <Star size={18} />,
    actionLabel: "Féliciter le client",
  },
  {
    id: "10",
    title: "Nouvel avis produit",
    description: 'Le produit "Hoodie UCL Finals" a reçu un avis 5 étoiles.',
    category: "customers",
    priority: "low",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    metadata: {
      productId: "prod-123",
      productTitle: "Hoodie UCL Finals",
      linkTo: "/admin/products/prod-123",
    },
    icon: <MessageSquare size={18} />,
    actionLabel: "Lire l'avis",
  },
  {
    id: "11",
    title: "Code promo utilisé",
    description:
      'Le code "SUMMER25" a été utilisé 47 fois. Il expire dans 2 jours.',
    category: "bonus",
    priority: "medium",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    metadata: {
      linkTo: "/admin/promotions",
      source: "Système",
    },
    icon: <Megaphone size={18} />,
    actionLabel: "Gérer les promos",
  },
  {
    id: "12",
    title: "Campagne promotionnelle terminée",
    description:
      'La campagne "Summer Sale" a généré 2 340 $ de CA avec 38 commandes.',
    category: "bonus",
    priority: "low",
    status: "read",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    metadata: {
      amount: 2340,
      currency: "$",
      linkTo: "/admin/promotions",
    },
    icon: <BarChart3 size={18} />,
    actionLabel: "Voir les résultats",
  },
  {
    id: "13",
    title: "Objectif de vente atteint",
    description: "Vous avez atteint 100 commandes ce mois‑ci ! Bonus débloqué.",
    category: "bonus",
    priority: "medium",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    metadata: {
      linkTo: "/admin/reports",
      source: "Système",
    },
    icon: <TrendingUp size={18} />,
    actionLabel: "Voir les stats",
  },
  {
    id: "14",
    title: "Webhook Printful reçu",
    description:
      'Webhook "package_shipped" reçu pour la commande #ORD-2026-1160.',
    category: "api",
    priority: "low",
    status: "read",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    metadata: {
      orderId: "ORD-2026-1160",
      source: "Printful",
      linkTo: "/admin/orders/ORD-2026-1160",
    },
    icon: <Wifi size={18} />,
    actionLabel: "Voir la commande",
  },
  {
    id: "15",
    title: "Erreur API Stripe",
    description:
      "Échec de débit pour la commande #ORD-2026-1158 : carte refusée.",
    category: "finance",
    priority: "high",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    metadata: {
      orderId: "ORD-2026-1158",
      source: "Stripe",
      linkTo: "/admin/orders/ORD-2026-1158",
    },
    icon: <CreditCard size={18} />,
    actionLabel: "Contacter le client",
  },
  {
    id: "16",
    title: "Facture Printful disponible",
    description: "Votre facture mensuelle de juin 2026 est prête (1 247,80 $).",
    category: "finance",
    priority: "medium",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    metadata: {
      amount: 1247.8,
      currency: "$",
      source: "Printful",
      linkTo: "https://printful.com/dashboard/billing",
    },
    icon: <FileText size={18} />,
    actionLabel: "Télécharger la facture",
  },
  {
    id: "17",
    title: "Tentative de fraude détectée",
    description:
      "Connexion suspecte depuis l'IP 203.0.113.42 (localisation : Russie).",
    category: "security",
    priority: "urgent",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    metadata: {
      source: "Système",
      linkTo: "/admin/security",
    },
    icon: <Shield size={18} />,
    actionLabel: "Examiner l'activité",
  },
  {
    id: "18",
    title: "Produit signalé par un client",
    description:
      'Le produit "Mug World Cup" a été signalé pour contenu inapproprié.',
    category: "security",
    priority: "high",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    metadata: {
      productId: "prod-789",
      productTitle: "Mug World Cup",
      linkTo: "/admin/products/prod-789",
    },
    icon: <AlertTriangle size={18} />,
    actionLabel: "Modérer le contenu",
  },
  {
    id: "19",
    title: "Sync produits terminée",
    description:
      "La synchronisation automatique avec Printful vient de se terminer.",
    category: "api",
    priority: "low",
    status: "read",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    metadata: {
      source: "Printful",
      linkTo: "/admin/reports",
    },
    icon: <RefreshCw size={18} />,
    actionLabel: "Voir les résultats",
  },
  {
    id: "20",
    title: "Quota API proche de la limite",
    description:
      "Vous avez utilisé 85% du quota autorisé pour l'API Printful ce mois‑ci.",
    category: "api",
    priority: "medium",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    metadata: {
      source: "Printful",
      linkTo: "/admin/settings",
    },
    icon: <Zap size={18} />,
    actionLabel: "Gérer les quotas",
  },
  {
    id: "21",
    title: "Ticket support ouvert",
    description:
      'Le client "Sophie Martin" a ouvert un ticket : "Problème de taille".',
    category: "customers",
    priority: "medium",
    status: "unread",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    metadata: {
      customerName: "Sophie Martin",
      linkTo: "/admin/support",
    },
    icon: <MessageSquare size={18} />,
    actionLabel: "Répondre",
  },
];

// ─── Constantes de style ────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<
  NotificationPriority,
  { bg: string; color: string; label: string }
> = {
  low: { bg: "#f3f4f6", color: "#6b7280", label: "Basse" },
  medium: { bg: "#dbeafe", color: "#1e40af", label: "Moyenne" },
  high: { bg: "#fee2e2", color: "#991b1b", label: "Haute" },
  urgent: { bg: "#fef3c7", color: "#92400e", label: "Urgente" },
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
  orders: <ShoppingBag size={14} />,
  products: <Package size={14} />,
  customers: <Users size={14} />,
  bonus: <Gift size={14} />,
  api: <Settings size={14} />,
  security: <Shield size={14} />,
  finance: <CreditCard size={14} />,
};

// ─── Composant principal ────────────────────────────────────────────────────

export default function NotificationsPage() {
  // ─── States (préparés pour la connexion backend) ─────────────────────────
  const [notifications, setNotifications] =
    useState<AdminNotification[]>(MOCK_NOTIFICATIONS);
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
  const perPage = 10;

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleMarkAsRead = (id: string) => {
    // Simulé – futur : PUT /api/notifications/{id}/read
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: "read" as NotificationStatus } : n,
      ),
    );
  };

  const handleMarkAsUnread = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: "unread" as NotificationStatus } : n,
      ),
    );
  };

  const handleArchive = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: "archived" as NotificationStatus } : n,
      ),
    );
  };

  const handleBulkMarkAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.has(n.id)
          ? { ...n, status: "read" as NotificationStatus }
          : n,
      ),
    );
    setSelectedIds(new Set());
  };

  const handleBulkArchive = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        selectedIds.has(n.id)
          ? { ...n, status: "archived" as NotificationStatus }
          : n,
      ),
    );
    setSelectedIds(new Set());
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.status === "unread"
          ? { ...n, status: "read" as NotificationStatus }
          : n,
      ),
    );
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
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  // Simule la navigation vers une page externe
  const handleNavigate = (link?: string) => {
    if (!link) return;
    alert(`Navigation simulée vers : ${link}`);
  };

  // ─── Filtrage & Tri & Pagination ─────────────────────────────────────────

  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    if (filterCategory !== "all") {
      result = result.filter((n) => n.category === filterCategory);
    }
    if (filterPriority !== "all") {
      result = result.filter((n) => n.priority === filterPriority);
    }
    if (filterStatus !== "all") {
      result = result.filter((n) => n.status === filterStatus);
    }
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(s) ||
          n.description.toLowerCase().includes(s) ||
          n.metadata?.customerName?.toLowerCase().includes(s) ||
          n.metadata?.orderId?.toLowerCase().includes(s) ||
          n.metadata?.productTitle?.toLowerCase().includes(s),
      );
    }

    result.sort((a, b) =>
      sortOrder === "newest"
        ? new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        : new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    return result;
  }, [
    notifications,
    filterCategory,
    filterPriority,
    filterStatus,
    searchTerm,
    sortOrder,
  ]);

  const paginatedNotifications = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredNotifications.slice(start, start + perPage);
  }, [filteredNotifications, currentPage]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotifications.length / perPage),
  );
  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  // Réinitialiser la page quand les filtres changent
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, filterPriority, filterStatus, searchTerm]);

  // ─── Rendu ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
          {unreadCount > 0 && (
            <span
              style={{
                background: "var(--color-accent)",
                color: "white",
                borderRadius: 999,
                padding: "2px 10px",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleMarkAllAsRead} style={secondaryBtn}>
            <CheckCheck size={14} /> Tout marquer comme lu
          </button>
          <button
            onClick={() => alert("Export simulé (CSV)")}
            style={secondaryBtn}
          >
            <FileText size={14} /> Exporter
          </button>
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "var(--color-surface2)",
              borderRadius: 8,
              padding: 3,
            }}
          >
            <button
              onClick={() => setViewMode("list")}
              style={{
                ...toggleBtn,
                background:
                  viewMode === "list" ? "var(--color-surface)" : "transparent",
                color:
                  viewMode === "list"
                    ? "var(--color-ink)"
                    : "var(--color-ink4)",
              }}
            >
              Liste
            </button>
            <button
              onClick={() => setViewMode("compact")}
              style={{
                ...toggleBtn,
                background:
                  viewMode === "compact"
                    ? "var(--color-surface)"
                    : "transparent",
                color:
                  viewMode === "compact"
                    ? "var(--color-ink)"
                    : "var(--color-ink4)",
              }}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: 10,
              color: "var(--color-ink4)",
            }}
          />
          <input
            type="text"
            placeholder="Rechercher dans les notifications…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInputStyle}
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as any)}
          style={selectStyle}
        >
          <option value="all">Toutes catégories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as any)}
          style={selectStyle}
        >
          <option value="all">Toutes priorités</option>
          <option value="low">Basse</option>
          <option value="medium">Moyenne</option>
          <option value="high">Haute</option>
          <option value="urgent">Urgente</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          style={selectStyle}
        >
          <option value="all">Tous statuts</option>
          <option value="unread">Non lue</option>
          <option value="read">Lue</option>
          <option value="archived">Archivée</option>
        </select>
        <button
          onClick={() =>
            setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
          }
          style={{ ...secondaryBtn, gap: 4 }}
        >
          <Clock size={14} />{" "}
          {sortOrder === "newest" ? "Plus récent" : "Plus ancien"}
        </button>
      </div>

      {/* Actions groupées (visibles si sélection) */}
      {selectedIds.size > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 12px",
            background: "var(--color-accent-soft)",
            borderRadius: 12,
            color: "var(--color-accent)",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <span>
            {selectedIds.size} sélectionnée{selectedIds.size > 1 ? "s" : ""}
          </span>
          <button onClick={handleBulkMarkAsRead} style={actionBtn}>
            <Eye size={14} /> Marquer lue(s)
          </button>
          <button onClick={handleBulkArchive} style={actionBtn}>
            <Archive size={14} /> Archiver
          </button>
        </div>
      )}

      {/* Liste des notifications */}
      {paginatedNotifications.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "var(--color-ink4)",
          }}
        >
          <Inbox size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
          <p>Aucune notification trouvée.</p>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: viewMode === "compact" ? 6 : 12,
          }}
        >
          {/* Checkbox "Tout sélectionner" */}
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
                selectedIds.size === filteredNotifications.length &&
                filteredNotifications.length > 0
              }
              onChange={handleSelectAll}
            />
            Tout sélectionner
          </label>
          {paginatedNotifications.map((notif) => (
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            alignItems: "center",
          }}
        >
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            style={pageBtn}
          >
            ←
          </button>
          <span style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            Page {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            style={pageBtn}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sous‑composant NotificationCard ────────────────────────────────────────

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
  onNavigate: (link?: string) => void;
}) {
  const priorityStyle = PRIORITY_COLORS[notification.priority];
  const isUnread = notification.status === "unread";

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${isUnread ? "var(--color-accent)" : "var(--color-border)"}`,
        borderRadius: 14,
        padding: compact ? "10px 14px" : "14px 18px",
        opacity: notification.status === "archived" ? 0.6 : 1,
        display: "flex",
        gap: compact ? 10 : 14,
        alignItems: compact ? "center" : "flex-start",
        transition: "background 0.15s",
        fontWeight: isUnread ? 600 : 400,
        cursor: "pointer",
      }}
      onClick={() => onNavigate(notification.metadata?.linkTo)}
    >
      {/* Checkbox */}
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

      {/* Icône */}
      <div
        style={{
          width: compact ? 32 : 40,
          height: compact ? 32 : 40,
          borderRadius: 10,
          background: isUnread
            ? "var(--color-accent-soft)"
            : "var(--color-surface2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isUnread ? "var(--color-accent)" : "var(--color-ink3)",
          flexShrink: 0,
        }}
      >
        {notification.icon}
      </div>

      {/* Contenu */}
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
              fontSize: compact ? 13 : 14,
              fontWeight: isUnread ? 700 : 500,
              color: "var(--color-ink)",
            }}
          >
            {notification.title}
          </span>
          {/* Pastille priorité */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "1px 6px",
              borderRadius: 999,
              background: priorityStyle.bg,
              color: priorityStyle.color,
              whiteSpace: "nowrap",
            }}
          >
            {priorityStyle.label}
          </span>
          {isUnread && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-accent)",
                flexShrink: 0,
              }}
            />
          )}
        </div>
        {!compact && (
          <p
            style={{
              fontSize: 12.5,
              color: "var(--color-ink2)",
              marginBottom: 6,
              lineHeight: 1.5,
            }}
          >
            {notification.description}
          </p>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            fontSize: 11,
            color: "var(--color-ink4)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={10} />
            {new Date(notification.timestamp).toLocaleString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {notification.metadata?.source && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              · {notification.metadata.source}
            </span>
          )}
          {notification.metadata?.orderId && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              · {notification.metadata.orderId}
            </span>
          )}
          {notification.metadata?.amount && (
            <span style={{ fontWeight: 600 }}>
              · {notification.metadata.amount} {notification.metadata.currency}
            </span>
          )}
        </div>
      </div>

      {/* Actions (hors compact) */}
      {!compact && (
        <div
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {notification.status !== "read" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead();
              }}
              title="Marquer comme lue"
              style={iconBtn}
            >
              <Eye size={14} />
            </button>
          )}
          {notification.status !== "unread" &&
            notification.status !== "archived" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkUnread();
                }}
                title="Marquer non lue"
                style={iconBtn}
              >
                <EyeOff size={14} />
              </button>
            )}
          {notification.status !== "archived" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              title="Archiver"
              style={iconBtn}
            >
              <Archive size={14} />
            </button>
          )}
          {notification.metadata?.linkTo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(notification.metadata!.linkTo);
              }}
              title="Voir"
              style={{ ...iconBtn, color: "var(--color-accent)" }}
            >
              <ExternalLink size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Styles réutilisés ──────────────────────────────────────────────────────

const searchInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 14px 9px 34px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  fontSize: 13,
  color: "var(--color-ink)",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  padding: "9px 14px",
  borderRadius: 12,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  fontSize: 13,
  color: "var(--color-ink)",
  cursor: "pointer",
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
};

const toggleBtn: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 6,
  border: "none",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
  background: "transparent",
};

const actionBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "4px 10px",
  borderRadius: 6,
  border: "none",
  background: "var(--color-surface)",
  color: "var(--color-accent)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: "var(--color-ink4)",
  display: "flex",
  alignItems: "center",
  padding: 4,
};

const pageBtn: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-ink2)",
  cursor: "pointer",
  fontWeight: 600,
};
