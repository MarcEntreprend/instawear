// src/admin/ErrorMonitoringPage.tsx
// Gap 13 — Monitoring autonome des erreurs edge (sans vendor).
// Lit edge_errors (RLS admin-only) : stats 24h, filtres, résolution,
// détail meta. Les erreurs "critical" arrivent aussi en Notifications
// (catégorie api, dédupliquées 30 min côté edge).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { errorMonitoringApi, type EdgeErrorRow } from "../api/supabaseApi";

const SEVERITY_STYLE: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  critical: { color: "#991b1b", bg: "#fee2e2", label: "Critique" },
  high: { color: "#92400e", bg: "#fef3c7", label: "Haute" },
  medium: { color: "#1e40af", bg: "#dbeafe", label: "Moyenne" },
};

const KNOWN_FUNCTIONS = [
  "create-printful-order",
  "printful-webhook",
  "stripe-checkout",
  "stripe-webhook",
  "sync-printful",
  "printful-reports",
  "approve-printful-design",
  "get-shipping-rates",
];

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function ErrorMonitoringPage() {
  const [rows, setRows] = useState<EdgeErrorRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    total24h: number;
    critical24h: number;
    unresolved: number;
    byFunction: Record<string, number>;
  } | null>(null);

  const [severity, setSeverity] = useState("all");
  const [fn, setFn] = useState("all");
  const [showResolved, setShowResolved] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  const perPage = 20;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, st] = await Promise.all([
        errorMonitoringApi.list({
          severity,
          fn,
          resolved: showResolved ? undefined : false,
          search: search.trim() || undefined,
          page,
          perPage,
        }),
        errorMonitoringApi.stats(),
      ]);
      setRows(list.data);
      setTotal(list.total);
      setStats(st);
    } catch (e: any) {
      setError(
        e?.message ||
          "Table edge_errors introuvable — exécutez la migration 20261018_edge_errors.sql",
      );
    } finally {
      setLoading(false);
    }
  }, [severity, fn, showResolved, search, page]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Rafraîchit toutes les 60s (surveillance passive, sans spam réseau).
  useEffect(() => {
    const t = setInterval(() => {
      fetchAll();
    }, 60000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const fnOptions = useMemo(() => {
    const fromStats = stats ? Object.keys(stats.byFunction) : [];
    return [...new Set([...KNOWN_FUNCTIONS, ...fromStats])].sort();
  }, [stats]);

  const toggleResolve = async (row: EdgeErrorRow) => {
    setResolving(row.id);
    try {
      await errorMonitoringApi.resolve(row.id, !row.resolved);
      await fetchAll();
    } catch (e: any) {
      setError(e?.message || "Échec mise à jour");
    } finally {
      setResolving(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const selectStyle: React.CSSProperties = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    color: "var(--color-ink2)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Monitoring — erreurs Edge Functions
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "var(--color-ink3)",
              margin: "4px 0 0",
            }}
          >
            Pannes Printful/paiement tracées automatiquement. Les critiques
            arrivent aussi en Notifications (dédupliquées 30 min).
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchAll()}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid var(--color-border2)",
            background: "var(--color-surface)",
            color: "var(--color-ink2)",
            fontWeight: 700,
            fontSize: 12,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          <RefreshCw
            size={14}
            strokeWidth={2.5}
            className={loading ? "animate-spin" : ""}
          />
          Actualiser
        </button>
      </div>

      {/* Stats 24h */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {[
          {
            label: "Erreurs (24h)",
            value: stats?.total24h ?? "—",
            alert: false,
          },
          {
            label: "Critiques (24h)",
            value: stats?.critical24h ?? "—",
            alert: (stats?.critical24h ?? 0) > 0,
          },
          {
            label: "Non résolues",
            value: stats?.unresolved ?? "—",
            alert: (stats?.unresolved ?? 0) > 0,
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "var(--color-surface)",
              border: s.alert
                ? "1px solid #991b1b"
                : "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <p
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: s.alert ? "#991b1b" : "var(--color-ink)",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {s.alert && <AlertTriangle size={18} />}
              {s.value}
            </p>
            <p
              style={{
                fontSize: 11,
                color: "var(--color-ink3)",
                margin: "4px 0 0",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          value={severity}
          onChange={(e) => {
            setSeverity(e.target.value);
            setPage(1);
          }}
          style={selectStyle}
          aria-label="Filtrer par sévérité"
        >
          <option value="all">Toutes sévérités</option>
          <option value="critical">Critique</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
        </select>
        <select
          value={fn}
          onChange={(e) => {
            setFn(e.target.value);
            setPage(1);
          }}
          style={selectStyle}
          aria-label="Filtrer par fonction"
        >
          <option value="all">Toutes fonctions</option>
          {fnOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: "var(--color-ink2)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => {
              setShowResolved(e.target.checked);
              setPage(1);
            }}
            style={{ accentColor: "var(--color-accent)" }}
          />
          Inclure résolues
        </label>
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Rechercher (message, action)…"
          style={{
            ...selectStyle,
            minWidth: 220,
          }}
        />
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "var(--color-negative)" }}>{error}</p>
      )}

      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            color: "var(--color-ink)",
          }}
        >
          <thead>
            <tr style={{ background: "var(--color-surface2)" }}>
              {[
                "Date",
                "Fonction / Action",
                "Sévérité",
                "Message",
                "État",
                "",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
                    textTransform: "uppercase",
                    color: "var(--color-ink3)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "var(--color-ink3)",
                  }}
                >
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "var(--color-ink3)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <CheckCircle2 size={14} /> Aucune erreur — tout est nominal.
                  </span>
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const sev = SEVERITY_STYLE[r.severity] || SEVERITY_STYLE.medium;
                const isOpen = expanded === r.id;
                return (
                  <React.Fragment key={r.id}>
                    <tr
                      style={{
                        borderTop: "1px solid var(--color-border)",
                        opacity: r.resolved ? 0.55 : 1,
                      }}
                    >
                      <td
                        style={{ padding: "10px 12px", whiteSpace: "nowrap" }}
                      >
                        {fmtDate(r.created_at)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <strong>{r.function_name}</strong>
                        <br />
                        <span style={{ color: "var(--color-ink3)" }}>
                          {r.action}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 8px",
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 800,
                            color: sev.color,
                            background: sev.bg,
                          }}
                        >
                          {sev.label}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "10px 12px",
                          maxWidth: 380,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={r.message}
                      >
                        {r.message.slice(0, 160)}
                      </td>
                      <td
                        style={{ padding: "10px 12px", whiteSpace: "nowrap" }}
                      >
                        <button
                          type="button"
                          onClick={() => toggleResolve(r)}
                          disabled={resolving === r.id}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--color-border2)",
                            background: r.resolved
                              ? "var(--color-surface2)"
                              : "var(--color-accent)",
                            color: r.resolved ? "var(--color-ink2)" : "white",
                            fontWeight: 700,
                            fontSize: 11,
                            cursor:
                              resolving === r.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {r.resolved ? "Rouvrir" : "Résoudre"}
                        </button>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                          aria-label="Détail"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--color-ink3)",
                          }}
                        >
                          <ChevronDown
                            size={16}
                            style={{
                              transform: isOpen ? "rotate(180deg)" : undefined,
                              transition: "transform 0.15s",
                            }}
                          />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ background: "var(--color-surface2)" }}>
                        <td colSpan={6} style={{ padding: "10px 12px" }}>
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--color-ink)",
                              margin: "0 0 8px",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-word",
                            }}
                          >
                            {r.message}
                          </p>
                          <pre
                            style={{
                              fontSize: 11,
                              color: "var(--color-ink3)",
                              background: "var(--color-surface)",
                              border: "1px solid var(--color-border)",
                              borderRadius: 8,
                              padding: 10,
                              overflowX: "auto",
                              margin: 0,
                            }}
                          >
                            {JSON.stringify(r.meta ?? {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 10,
          fontSize: 12,
          color: "var(--color-ink3)",
        }}
      >
        <span>
          Page {page} / {totalPages} ({total} erreur{total > 1 ? "s" : ""})
        </span>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          style={selectStyle}
        >
          ←
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          style={selectStyle}
        >
          →
        </button>
      </div>
    </div>
  );
}

/**
 * **13 + 14 terminés — 305/305 tests, tsc OK, 7/7 fonctions déployées.**

## 13. Monitoring autonome (sans vendor)
- **`edge_errors`** (migration `20261018_edge_errors.sql` **à exécuter**) : fonction/action/sévérité/message/meta assainie/résolu, RLS admin-only
- **`_shared/opsUtils.ts → reportError()`** : insert best-effort (ne throw jamais) + notif admin `api/high` **uniquement si critical**, dédupliquée 30 min par (fn, action)
- **Instrumenté** : création commande (critical), cancel (high), webhook-500s (high), paiements checkout/webhook (critical), sync fatal (critical), setup-webhook/mockups/approve/reports (high/medium)
- **Page admin Monitoring** (sidebar + route) : stats 24h (total/critiques/non résolues), filtres sévérité/fonction/recherche, pagination, détail meta JSON, bouton Résoudre/Rouvrir, auto-refresh 60s. Zéro UI ailleurs touchée

## 14. Retry/backoff partagé
- **`fetchWithRetry`** : 429 + 502/503/504 + réseau, backoff exponentiel + jitter, respecte `Retry-After` (plafond 30s), max 3 essais. **Jamais** de retry 5xx si `idempotent:false` (approve, submit, mockup create-task — pas de double validation design)
- Appliqué : shipping rates + résolution IDs, création commande (idempotent via `external_id`), cancel (GET/DELETE, 404-DELETE traité comme succès), sync (liste/détails/catalogue/sizes/webhooks), reports, fetch-back webhook, approve/submit/list
- **Non couvert (choix documenté)** : appels SDK Stripe (infra Stripe, hors sujet), lectures admin UI (échec déjà visible + re-clic), `send-email`/Resend (autre vendor)

## Règle user/admin respectée
**Aucune alerte user ajoutée** : les erreurs sont domaine admin. Le seul cas user-direct (commande payée non transmise) était déjà couvert par l'email "Order failed" existant — le monitoring garantit juste que l'admin le voit aussi.
 * ***/
