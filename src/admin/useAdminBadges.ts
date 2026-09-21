// src/admin/useAdminBadges.ts — source UNIQUE des compteurs admin.
// Un seul poller partagé (module singleton + useSyncExternalStore) remplace
// les 5 pollings parallèles historiques (sidebar, NotificationsPage,
// useTabBadge) qui interrogeaient les mêmes chiffres toutes les 30 s.
//
// Définitions (ne pas redéfinir ailleurs) :
// - unread/urgent : notifications status=unread (+ priority=urgent).
// - ordersPending : commandes status=pending ("à traiter", même langue que
//   l'alerte dashboard). ordersToShip : in_production + partial
//   ("à expédier", même périmètre que l'onglet Expéditions — les partielles
//   restent visibles dans Commandes, c'est voulu et libellé côté Shipped).
// - mockupsOpen : jobs queued + processing (podApi.mockupStatus).
// - criticalErrors : edge_errors resolved=false + severity=critical.
// - podConnected : pod_settings.is_connected (informatif, pas un badge).
// Fail-closed : en cas d'erreur, on garde les dernières valeurs connues
// (jamais de remise à zéro qui ferait clignoter les badges).

import { useSyncExternalStore } from "react";
import { ORDER_PENDING_STATUSES } from "./orderStatusLabels";

// Ré-export de compat : la définition canonique vit dans
// orderStatusLabels.ts (Vague B item 6 — une seule vérité "en attente").
export { ORDER_PENDING_STATUSES };
export const ORDER_TOSHIP_STATUSES = ["in_production", "partial"] as const;

export interface AdminBadges {
  unread: number;
  urgent: number;
  ordersPending: number;
  ordersToShip: number;
  mockupsOpen: number;
  criticalErrors: number;
  podConnected: boolean | null;
}

const EMPTY: AdminBadges = {
  unread: 0,
  urgent: 0,
  ordersPending: 0,
  ordersToShip: 0,
  mockupsOpen: 0,
  criticalErrors: 0,
  podConnected: null,
};

const POLL_MS = 30000;

let snapshot: AdminBadges = EMPTY;
let listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let adminEnabled = false;
let inFlight = false;

function emit() {
  for (const l of listeners) l();
}

async function fetchBadges() {
  if (inFlight || !adminEnabled) return;
  inFlight = true;
  try {
    const {
      notificationApi,
      orderApi,
      errorMonitoringApi,
      podApi,
    } = await import("../api/supabaseApi");
    const [unread, urgent, counts, crit, mockups, settings] =
      await Promise.all([
        // 1-2. Notifications (mêmes appels qu'avant, mais une seule fois).
        notificationApi.getUnreadCount().catch(() => snapshot.unread),
        notificationApi
          .list({ status: "unread", priority: "urgent", perPage: 1 })
          .then((r) => r.total)
          .catch(() => snapshot.urgent),
        // 3. Commandes (léger : colonne status seule, cf. getStatusCounts).
        orderApi.getStatusCounts().catch(() => null),
        // 4. Erreurs critiques non résolues.
        errorMonitoringApi.getUnresolvedCriticalCount().catch(() => snapshot.criticalErrors),
        // 5. File mockups (edge existante).
        podApi.mockupStatus().catch(() => null),
        // 6. Connexion POD (1 ligne).
        podApi.getSettings().catch(() => null),
      ]);
    const next: AdminBadges = {
      unread: typeof unread === "number" ? unread : snapshot.unread,
      urgent: typeof urgent === "number" ? urgent : snapshot.urgent,
      ordersPending: counts
        ? ORDER_PENDING_STATUSES.reduce((s, k) => s + (counts[k] || 0), 0)
        : snapshot.ordersPending,
      ordersToShip: counts
        ? ORDER_TOSHIP_STATUSES.reduce((s, k) => s + (counts[k] || 0), 0)
        : snapshot.ordersToShip,
      criticalErrors: typeof crit === "number" ? crit : snapshot.criticalErrors,
      mockupsOpen: mockups
        ? (mockups.counts?.queued || 0) + (mockups.counts?.processing || 0)
        : snapshot.mockupsOpen,
      podConnected:
        settings && typeof settings.isConnected === "boolean"
          ? settings.isConnected
          : snapshot.podConnected,
    };
    if (JSON.stringify(next) !== JSON.stringify(snapshot)) {
      snapshot = next;
      emit();
    }
  } finally {
    inFlight = false;
  }
}

function ensurePolling() {
  if (timer || listeners.size === 0) return;
  void fetchBadges();
  timer = setInterval(() => {
    void fetchBadges();
  }, POLL_MS);
  window.addEventListener("notifications-updated", handleExternalUpdate);
}

function stopPolling() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  window.removeEventListener("notifications-updated", handleExternalUpdate);
}

function handleExternalUpdate() {
  void fetchBadges();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  ensurePolling();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      adminEnabled = false;
      stopPolling();
    }
  };
}

function getSnapshot(): AdminBadges {
  return snapshot;
}

/**
 * Compteurs admin partagés. `admin=true` (défaut) : interroge les sources
 * admin (RLS admin-only, échec silencieux => dernières valeurs). `false` :
 * s'abonne sans déclencher de requêtes admin (usage storefront).
 */
export function useAdminBadges(admin = true): AdminBadges {
  if (admin && !adminEnabled) {
    adminEnabled = true;
    void fetchBadges();
  }
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Remise à zéro (tests/déconnexion). */
export function resetAdminBadgesForTests(): void {
  snapshot = EMPTY;
  emit();
}

export function __adminBadgesInternalsForTests() {
  return {
    get adminEnabled() {
      return adminEnabled;
    },
    get listenerCount() {
      return listeners.size;
    },
  };
}
