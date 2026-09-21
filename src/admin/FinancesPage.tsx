// src/admin/FinancesPage.tsx
//
// Remboursements RÉELS (argent Stripe, pas labels) + file des demandes.
// - Exécuter : edge stripe-refund (JWT admin, idempotent par clic).
// - Demandes : refund_requests (bouton compte) → approuver (= exécute) /
//   rejeter (= notifie le client, aucun mouvement).
// - Historique : order_refunds (registre, re_… uniques).
// Jamais de statut 'refunded' posé ici sans mouvement d'argent : c'est
// l'edge qui le fait, après succès Stripe.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, Check, X, RefreshCw, Search, AlertCircle } from "lucide-react";
import { orderApi, refundApi } from "../api/supabaseApi";
import type { OrderRefund, RefundRequest } from "../api/supabaseApi";
import type { Order } from "./adminTypes";
import { OrderStatusBadge } from "./orderStatusLabels";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
import { formatDateFR } from "../utils/dates";
import CopyID from "../components/CopyID";

interface FinancesPageProps {
  initialOrderId?: string | null;
  onConsumeInitialOrder?: () => void;
}

type ReqFilter = "pending" | "approved" | "rejected" | "all";

const REASONS = [
  { value: "requested_by_customer", label: "Demandé par le client" },
  { value: "duplicate", label: "Double débit constaté" },
  { value: "fraudulent", label: "Fraude avérée (blocklists Radar)" },
];

export default function FinancesPage({
  initialOrderId,
  onConsumeInitialOrder,
}: FinancesPageProps) {
  const currencySymbol = useCurrencySymbol();
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [refunds, setRefunds] = useState<OrderRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reqFilter, setReqFilter] = useState<ReqFilter>("pending");
  const [searchOrder, setSearchOrder] = useState(initialOrderId || "");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrderId || null,
  );
  const [amountInput, setAmountInput] = useState("");
  const [reasonInput, setReasonInput] = useState<string>(
    "requested_by_customer",
  );
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    kind: "success" | "error";
  } | null>(null);

  const flash = (text: string, kind: "success" | "error" = "success") => {
    setMessage({ text, kind });
    setTimeout(() => setMessage(null), 6000);
  };

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Refresh manuel = bypass cache (Vague B item 6 : frais + recache).
      orderApi.invalidateOrdersCache();
      const [o, r, f] = await Promise.all([
        orderApi.listCached(),
        refundApi.listRequests(),
        refundApi.listRefunds(),
      ]);
      setOrders(o);
      setRequests(r);
      setRefunds(f);
    } catch (e: any) {
      setError(e?.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (initialOrderId) {
      setSearchOrder(initialOrderId);
      setSelectedId(initialOrderId);
      onConsumeInitialOrder?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderId]);

  const selected: Order | null = useMemo(
    () => orders.find((o) => o.id === selectedId) ?? null,
    [orders, selectedId],
  );

  const recordedForSelected = useMemo(() => {
    if (!selectedId) return [];
    return refunds.filter((r) => r.orderId === selectedId);
  }, [refunds, selectedId]);

  const refundedSum = useMemo(
    () =>
      recordedForSelected
        .filter((r) => r.status !== "failed")
        .reduce((s, r) => s + r.amountCents, 0),
    [recordedForSelected],
  );

  const suggestedCents = useMemo(() => {
    if (!selected) return 0;
    return Math.max(Math.round(selected.totalAmount * 100) - refundedSum, 0);
  }, [selected, refundedSum]);

  useEffect(() => {
    if (selected && suggestedCents > 0 && !amountInput) {
      setAmountInput((suggestedCents / 100).toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, suggestedCents]);

  const pendingRequests = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );

  const visibleRequests = useMemo(
    () =>
      reqFilter === "all"
        ? requests
        : requests.filter((r) => r.status === reqFilter),
    [requests, reqFilter],
  );

  const doRefund = async (orderId: string, requestId?: string) => {
    const cents = Math.round(Number(amountInput) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      flash("Montant invalide.", "error");
      return;
    }
    const label = `${(cents / 100).toFixed(2)} ${currencySymbol}`;
    if (
      !window.confirm(
        `Rembourser ${label} pour ${orderId} ? L'argent bouge vraiment sur Stripe.${requestId ? " La demande sera marquée approuvée." : ""}`,
      )
    ) {
      return;
    }
    setWorking(true);
    try {
      const res = await refundApi.refund(orderId, {
        amountCents: cents,
        reason: reasonInput,
        requestId,
      });
      flash(
        `Remboursé ${(res.amountCents / 100).toFixed(2)} ${res.currency} (${res.refundId}). Solde restant : ${(res.remainingAfter / 100).toFixed(2)}.`,
      );
      setAmountInput("");
      await reload();
    } catch (e: any) {
      flash(e?.message || "Échec du remboursement.", "error");
    } finally {
      setWorking(false);
    }
  };

  const doReject = async (r: RefundRequest) => {
    if (
      !window.confirm(
        `Rejeter la demande de ${r.customerEmail || "ce client"} (${r.orderId}) ? Le client sera notifié.`,
      )
    ) {
      return;
    }
    setWorking(true);
    try {
      await refundApi.rejectRequest(r.id, r.orderId);
      flash("Demande rejetée, client notifié.");
      await reload();
    } catch (e: any) {
      flash(e?.message || "Échec du rejet.", "error");
    } finally {
      setWorking(false);
    }
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-ink)",
            marginBottom: 2,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          Finances
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
          Remboursements réels Stripe + demandes clients. Chaque euro qui bouge
          est tracé (id `re_…`, montant, motif, auteur).
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background: "#fee2e2",
            color: "#991b1b",
            border: "1px solid #fca5a5",
          }}
        >
          {error}
        </div>
      )}
      {message && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            background: message.kind === "success" ? "#dcfce7" : "#fee2e2",
            color: message.kind === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${message.kind === "success" ? "#86efac" : "#fca5a5"}`,
          }}
        >
          {message.text}
        </div>
      )}

      {/* File des demandes */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          padding: "18px 22px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>
            Demandes clients ({pendingRequests.length} en attente)
          </h3>
          <select
            value={reqFilter}
            onChange={(e) => setReqFilter(e.target.value as ReqFilter)}
            style={{
              marginLeft: "auto",
              padding: "4px 8px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface2)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <option value="pending">En attente</option>
            <option value="approved">Approuvées</option>
            <option value="rejected">Rejetées</option>
            <option value="all">Toutes</option>
          </select>
        </div>
        {visibleRequests.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--color-ink3)", margin: 0 }}>
            Aucune demande dans ce filtre.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {visibleRequests.map((r) => (
              <div
                key={r.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: 12,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                  background:
                    r.status === "pending" ? "#fefce8" : "transparent",
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                    {r.orderId} <CopyID id={r.orderId} size={12} />
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 12,
                      color: "var(--color-ink3)",
                    }}
                  >
                    {r.customerEmail || "—"} ·{" "}
                    {r.amountCents
                      ? `${(r.amountCents / 100).toFixed(2)} ${currencySymbol} souhaités`
                      : "montant total souhaité"}
                    {r.reason ? ` · « ${r.reason} »` : ""} ·{" "}
                    {formatDateFR(r.createdAt)}
                  </p>
                </div>
                {r.status === "pending" ? (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => {
                        setSelectedId(r.orderId);
                        setSearchOrder(r.orderId);
                        if (r.amountCents)
                          setAmountInput((r.amountCents / 100).toFixed(2));
                        document
                          .getElementById("finances-refund-panel")
                          ?.scrollIntoView({ behavior: "smooth" });
                        flash(
                          "Commande chargée ci-dessous : vérifiez le montant puis confirmez le remboursement.",
                        );
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid #059669",
                        background: "#059669",
                        color: "white",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <Check
                        size={13}
                        style={{ verticalAlign: "middle", marginRight: 4 }}
                      />
                      Traiter
                    </button>
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => doReject(r)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface2)",
                        color: "var(--color-ink2)",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      <X
                        size={13}
                        style={{ verticalAlign: "middle", marginRight: 4 }}
                      />
                      Rejeter
                    </button>
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 10px",
                      borderRadius: 999,
                      background:
                        r.status === "approved" ? "#dcfce7" : "#f3f4f6",
                      color: r.status === "approved" ? "#166534" : "#6b7280",
                    }}
                  >
                    {r.status === "approved" ? "Approuvée" : "Rejetée"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panneau remboursement */}
      <div
        id="finances-refund-panel"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          padding: "18px 22px",
        }}
      >
        <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 12px" }}>
          Rembourser une commande
        </h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 10,
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              flex: "1 1 240px",
            }}
          >
            <Search size={14} style={{ color: "var(--color-ink4)" }} />
            <input
              value={searchOrder}
              onChange={(e) => setSearchOrder(e.target.value)}
              placeholder="ORD-2026-XXXXXX"
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                flex: 1,
                fontFamily: "monospace",
                fontSize: 13,
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const found = orders.find(
                (o) => o.id === searchOrder.trim().toUpperCase(),
              );
              if (!found) {
                flash("Commande introuvable.", "error");
                return;
              }
              setSelectedId(found.id);
              setAmountInput("");
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 10,
              border: "1px solid var(--color-border2)",
              background: "var(--color-surface2)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Charger
          </button>
        </div>

        {!selected ? (
          <p style={{ fontSize: 13, color: "var(--color-ink3)", margin: 0 }}>
            Chargez une commande (ou arrive depuis Commandes / file des
            demandes) pour voir le suggéré et rembourser.
          </p>
        ) : (
          <div
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontFamily: "monospace", fontSize: 14 }}>
                {selected.id}
              </strong>
              <CopyID id={selected.id} size={12} />
              {/* Badge canonique (Vague B item 8 : fini le span recodé). */}
              <OrderStatusBadge status={selected.status} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink2)" }}>
              {selected.clientName || selected.clientEmail || "—"} · Total{" "}
              {selected.totalAmount.toFixed(2)} {currencySymbol} · Déjà
              remboursé : {(refundedSum / 100).toFixed(2)} {currencySymbol} ·
              Suggéré : {(suggestedCents / 100).toFixed(2)} {currencySymbol}
            </p>
            {recordedForSelected.length > 0 && (
              <div style={{ fontSize: 12, color: "var(--color-ink3)" }}>
                {recordedForSelected.map((r) => (
                  <div key={r.id}>
                    • {(r.amountCents / 100).toFixed(2)} {r.currency} —{" "}
                    {r.stripeRefundId || r.status} —{" "}
                    {formatDateFR(r.createdAt)}
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "end",
              }}
            >
              <label style={{ fontSize: 12, fontWeight: 600 }}>
                Montant ({currencySymbol})
                <input
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  style={{
                    display: "block",
                    marginTop: 4,
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface2)",
                    fontSize: 14,
                    width: 140,
                  }}
                />
              </label>
              <label style={{ fontSize: 12, fontWeight: 600 }}>
                Motif
                <select
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  style={{
                    display: "block",
                    marginTop: 4,
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface2)",
                    fontSize: 13,
                  }}
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={working || suggestedCents <= 0}
                onClick={() => {
                  const pending = pendingRequests.find(
                    (r) => r.orderId === selected.id,
                  );
                  doRefund(selected.id, pending?.id);
                }}
                style={{
                  padding: "10px 18px",
                  borderRadius: 10,
                  border: "none",
                  background: "#991b1b",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: working ? "not-allowed" : "pointer",
                  opacity: working || suggestedCents <= 0 ? 0.6 : 1,
                }}
              >
                {working ? (
                  <>
                    <RefreshCw
                      size={14}
                      className="animate-spin"
                      style={{ verticalAlign: "middle", marginRight: 6 }}
                    />
                    En cours…
                  </>
                ) : (
                  "Rembourser (Stripe réel)"
                )}
              </button>
            </div>
            {suggestedCents <= 0 && (
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: "#92400e",
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <AlertCircle size={13} /> Solde remboursable nul — rien à
                rembourser (déjà intégral ou aucun encaissement).
              </p>
            )}
          </div>
        )}
      </div>

      {/* Historique global */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          padding: "18px 22px",
        }}
      >
        <h3 style={{ fontWeight: 700, fontSize: 15, margin: "0 0 12px" }}>
          Historique ({refunds.length})
        </h3>
        {refunds.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--color-ink3)", margin: 0 }}>
            Aucun remboursement enregistré.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {refunds.slice(0, 50).map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                  fontSize: 12.5,
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: 8,
                }}
              >
                <strong style={{ fontFamily: "monospace" }}>{r.orderId}</strong>
                <span style={{ fontWeight: 700 }}>
                  {(r.amountCents / 100).toFixed(2)} {r.currency}
                </span>
                <span style={{ color: "var(--color-ink3)" }}>
                  {r.stripeRefundId || r.status} · {r.reason || "—"} ·{" "}
                  {formatDateFR(r.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
