// src/admin/InteractionsPage.tsx
// Page "Interactions Clients" – centralise les tickets support, réclamations,

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertTriangle,
  ThumbsUp,
  HelpCircle,
  RefreshCw,
  Paperclip,
  Eye,
  Clock,
  User,
  ShoppingBag,
  Package,
  ArrowLeft,
  Send,
} from "lucide-react";
import { interactionApi } from "../api/supabaseApi";
import { useHighlightListener } from "./useAdminHighlight";

// ─── Types ─────────────────────────────────────────────────────────────────

export type InteractionStatus = "open" | "in_progress" | "resolved" | "closed";
export type InteractionType =
  | "complaint"
  | "question"
  | "feedback"
  | "retention";

export interface AdminInteraction {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  type: InteractionType;
  status: InteractionStatus;
  subject: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    orderId?: string;
    productId?: string;
    productTitle?: string;
    linkTo?: string;
    attachments?: { url: string; name: string; size: number }[];
  };
  messages: InteractionMessage[];
}

export interface InteractionMessage {
  id: string;
  from: "customer" | "admin";
  text: string;
  timestamp: string;
}

// ─── Constantes ────────────────────────────────────────────────────────────

const STATUS_META: Record<
  InteractionStatus,
  { label: string; color: string; bg: string }
> = {
  open: { label: "Ouvert", color: "#92400e", bg: "#fef3c7" },
  in_progress: { label: "En cours", color: "#1e40af", bg: "#dbeafe" },
  resolved: { label: "Résolu", color: "#065f46", bg: "#d1fae5" },
  closed: { label: "Fermé", color: "#6b7280", bg: "#f3f4f6" },
};

const TYPE_META: Record<
  InteractionType,
  { label: string; icon: React.ReactNode }
> = {
  complaint: { label: "Réclamation", icon: <AlertTriangle size={14} /> },
  question: { label: "Question", icon: <HelpCircle size={14} /> },
  feedback: { label: "Feedback", icon: <ThumbsUp size={14} /> },
  retention: { label: "Fidélisation", icon: <User size={14} /> },
};

function StatusBadge({ status }: { status: InteractionStatus }) {
  const s = STATUS_META[status];
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

// ─── Composant principal ───────────────────────────────────────────────────

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<AdminInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<InteractionType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<InteractionStatus | "all">(
    "all",
  );
  const [sortKey, setSortKey] = useState<keyof AdminInteraction>("updatedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedTicket, setSelectedTicket] = useState<AdminInteraction | null>(
    null,
  );
  const [messages, setMessages] = useState<InteractionMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [highlightedTicketId, setHighlightedTicketId] = useState<string | null>(
    null,
  );

  // Charger les interactions depuis l'API
  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await interactionApi.list({
        type: filterType !== "all" ? filterType : undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        search: search || undefined,
      });
      setInteractions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, search]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  // ── Polling messages du ticket ouvert ────────────────────────────
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await interactionApi.getMessages(selectedTicket.id);
        setMessages(
          msgs.map((m: any) => ({
            id: m.id,
            from: m.from_field,
            text: m.text,
            timestamp: m.timestamp,
          })),
        );
      } catch (e) {
        /* silencieux */
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  // Highlight depuis les notifications
  useHighlightListener(
    "instawear:highlight-interactions",
    setHighlightedTicketId,
    8000,
    'tr[data-interaction-id="{}"]',
  );

  // Recharge les messages du ticket ouvert toutes les 10 secondes
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await interactionApi.getMessages(selectedTicket.id);
        setMessages(
          msgs.map((m: any) => ({
            id: m.id,
            from: m.from_field,
            text: m.text,
            timestamp: m.timestamp,
          })),
        );
      } catch (e) {
        /* silencieux */
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  const openTicket = async (ticket: AdminInteraction) => {
    setSelectedTicket(ticket);
    try {
      const msgs = await interactionApi.getMessages(ticket.id);
      setMessages(
        msgs.map((m: any) => ({
          id: m.id,
          from: m.from_field,
          text: m.text,
          timestamp: m.timestamp,
        })),
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    await interactionApi.addMessage(
      selectedTicket.id,
      "admin",
      replyText.trim(),
    );
    const msgs = await interactionApi.getMessages(selectedTicket.id);
    setMessages(
      msgs.map((m: any) => ({
        id: m.id,
        from: m.from_field,
        text: m.text,
        timestamp: m.timestamp,
      })),
    );
    setReplyText("");
    fetchInteractions();
  };

  const handleChangeStatus = async (
    id: string,
    newStatus: InteractionStatus,
  ) => {
    await interactionApi.updateStatus(id, newStatus);
    fetchInteractions();
    if (selectedTicket?.id === id) {
      setSelectedTicket((prev) =>
        prev ? { ...prev, status: newStatus } : null,
      );
    }
  };

  // ── Filtrage & tri ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...interactions];

    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(s) ||
          t.customerName.toLowerCase().includes(s) ||
          t.customerEmail.toLowerCase().includes(s) ||
          t.lastMessage.toLowerCase().includes(s),
      );
    }
    if (filterType !== "all") list = list.filter((t) => t.type === filterType);
    if (filterStatus !== "all")
      list = list.filter((t) => t.status === filterStatus);

    list.sort((a, b) => {
      const va = a[sortKey] as string;
      const vb = b[sortKey] as string;
      if (typeof va === "string" && typeof vb === "string")
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      return 0;
    });
    return list;
  }, [interactions, search, filterType, filterStatus, sortKey, sortDir]);

  const toggleSort = (key: keyof AdminInteraction) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: keyof AdminInteraction) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={11} />
    ) : (
      <ChevronDown size={11} />
    );
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────
  if (selectedTicket) {
    return (
      <TicketDetail
        ticket={selectedTicket}
        messages={messages}
        replyText={replyText}
        setReplyText={setReplyText}
        onSendReply={handleSendReply}
        onChangeStatus={(status) =>
          handleChangeStatus(selectedTicket.id, status)
        }
        onBack={() => {
          setSelectedTicket(null);
          setMessages([]);
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Header */}
      <div style={headerRowStyle}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              Interactions clients
            </h2>
            <button
              onClick={fetchInteractions}
              title="Rafraîchir"
              style={refreshBtnStyle}
            >
              <RefreshCw size={14} strokeWidth={2} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
            {" · "}
            {interactions.filter((t) => t.status === "open").length} ouvert
            {interactions.filter((t) => t.status === "open").length !== 1
              ? "s"
              : ""}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div style={filterBarStyle}>
        <div style={searchWrapperStyle}>
          <Search
            size={14}
            strokeWidth={2}
            style={{ color: "var(--color-ink4)", flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder="Rechercher un ticket, un client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchInputStyle}
          />
          {search && (
            <button onClick={() => setSearch("")} style={clearBtnStyle}>
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          style={selectStyle}
        >
          <option value="all">Tous types</option>
          {Object.entries(TYPE_META).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          style={selectStyle}
        >
          <option value="all">Tous statuts</option>
          {Object.entries(STATUS_META).map(([key, val]) => (
            <option key={key} value={key}>
              {val.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            setFilterType("all");
            setFilterStatus("all");
            setSearch("");
          }}
          style={clearFiltersBtnStyle}
        >
          Effacer filtres
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
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
      ) : (
        <div style={tableWrapperStyle}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead style={theadStyle}>
              <tr>
                <th style={thStyle}>Client</th>
                <th style={thStyle}>Sujet</th>
                <th
                  style={{ ...thStyle, cursor: "pointer" }}
                  onClick={() => toggleSort("type")}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    Type {sortIcon("type")}
                  </div>
                </th>
                <th
                  style={{ ...thStyle, cursor: "pointer" }}
                  onClick={() => toggleSort("status")}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    Statut {sortIcon("status")}
                  </div>
                </th>
                <th
                  style={{ ...thStyle, cursor: "pointer" }}
                  onClick={() => toggleSort("updatedAt")}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                  >
                    Dernière activité {sortIcon("updatedAt")}
                  </div>
                </th>
                <th style={{ ...thStyle, textAlign: "center", width: 80 }}>
                  Détail
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  data-interaction-id={ticket.id}
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    transition: "background 0.3s ease, box-shadow 0.3s ease",
                    background:
                      highlightedTicketId === ticket.id
                        ? "var(--color-accent-bg)"
                        : "transparent",
                    boxShadow:
                      highlightedTicketId === ticket.id
                        ? "inset 0 0 0 2px var(--color-accent)"
                        : "none",
                  }}
                >
                  <td style={tdStyle}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div style={avatarStyle}>
                        {(ticket.customerName || "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p
                          style={{ fontWeight: 600, color: "var(--color-ink)" }}
                        >
                          {ticket.customerName}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--color-ink4)" }}>
                          {ticket.customerEmail}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <p style={{ fontWeight: 500, color: "var(--color-ink)" }}>
                      {ticket.subject}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink4)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 280,
                      }}
                    >
                      {ticket.lastMessage}
                    </p>
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "var(--color-ink2)",
                      }}
                    >
                      {TYPE_META[ticket.type].icon}
                      {TYPE_META[ticket.type].label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      fontSize: 11,
                      color: "var(--color-ink4)",
                    }}
                  >
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <Clock size={10} />
                      {new Date(ticket.updatedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <button
                      onClick={() => openTicket(ticket)}
                      style={iconBtn}
                      title="Voir le ticket"
                    >
                      <Eye size={15} strokeWidth={2} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "var(--color-ink4)",
                    }}
                  >
                    <MessageSquare
                      size={28}
                      style={{ margin: "0 auto 10px", opacity: 0.5 }}
                    />
                    <p>Aucun ticket trouvé.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Ticket Detail (modal pleine page) ─────────────────────────────────────

function TicketDetail({
  ticket,
  messages,
  replyText,
  setReplyText,
  onSendReply,
  onChangeStatus,
  onBack,
}: {
  ticket: AdminInteraction;
  messages: InteractionMessage[];
  replyText: string;
  setReplyText: (v: string) => void;
  onSendReply: () => void;
  onChangeStatus: (status: InteractionStatus) => void;
  onBack: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Barre de retour */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={onBack} style={backBtnStyle}>
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--color-ink)",
              marginBottom: 2,
            }}
          >
            {ticket.subject}
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            {ticket.customerName} · {ticket.customerEmail}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge status={ticket.status} />
          <select
            value={ticket.status}
            onChange={(e) =>
              onChangeStatus(e.target.value as InteractionStatus)
            }
            style={{ ...selectStyle, fontSize: 11 }}
          >
            {Object.keys(STATUS_META).map((key) => (
              <option key={key} value={key}>
                {STATUS_META[key as InteractionStatus].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Métadonnées (commande/produit lié) */}
      {ticket.metadata && (
        <div
          style={{
            background: "var(--color-surface2)",
            borderRadius: 12,
            padding: 12,
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            fontSize: 12,
            color: "var(--color-ink2)",
          }}
        >
          {ticket.metadata.orderId && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <ShoppingBag size={12} /> Commande : {ticket.metadata.orderId}
            </span>
          )}
          {ticket.metadata.productTitle && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Package size={12} /> Produit : {ticket.metadata.productTitle}
            </span>
          )}
        </div>
      )}

      {/* Pièces jointes */}
      {ticket.metadata?.attachments &&
        ticket.metadata.attachments.length > 0 && (
          <div
            style={{
              background: "var(--color-surface2)",
              borderRadius: 12,
              padding: 12,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              fontSize: 12,
              color: "var(--color-ink2)",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontWeight: 600,
              }}
            >
              <Paperclip size={12} /> Pièces jointes :
            </span>
            {ticket.metadata.attachments.map((att: any, i: number) => (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--color-accent)",
                  textDecoration: "underline",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Paperclip size={11} />
                {att.name}
              </a>
            ))}
          </div>
        )}

      {/* Messages */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: 400,
          overflowY: "auto",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.from === "admin" ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: 14,
                background:
                  msg.from === "admin"
                    ? "var(--color-accent-bg)"
                    : "var(--color-surface2)",
                border:
                  msg.from === "admin"
                    ? "1px solid var(--color-accent-soft)"
                    : "1px solid var(--color-border)",
                color: "var(--color-ink)",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <p
                style={{
                  fontWeight: 600,
                  fontSize: 11,
                  marginBottom: 4,
                  color: "var(--color-ink3)",
                }}
              >
                {msg.from === "admin" ? "Vous" : ticket.customerName}
              </p>
              <p>{msg.text}</p>
            </div>
            <span
              style={{ fontSize: 10, color: "var(--color-ink4)", marginTop: 4 }}
            >
              {new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>

      {/* Zone de réponse */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Écrire une réponse…"
          style={{
            width: "100%",
            minHeight: 80,
            padding: 12,
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            fontSize: 13,
            color: "var(--color-ink)",
            fontFamily: "var(--font-body)",
            resize: "vertical",
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onSendReply();
            }
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onSendReply}
            disabled={!replyText.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background: "var(--color-accent)",
              color: "white",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 13.5,
              cursor: "pointer",
              opacity: replyText.trim() ? 1 : 0.5,
            }}
          >
            <Send size={14} /> Envoyer
          </button>
        </div>
        <p
          style={{
            fontSize: 10,
            color: "var(--color-ink4)",
            textAlign: "right",
          }}
        >
          Ctrl+Entrée pour envoyer
        </p>
      </div>
    </div>
  );
}

// ─── Styles réutilisés ─────────────────────────────────────────────────────

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: 12,
};

const refreshBtnStyle: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
  color: "var(--color-ink2)",
  display: "flex",
  alignItems: "center",
};

const filterBarStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 40,
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  padding: "14px 16px",
  borderRadius: 16,
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  alignItems: "center",
};

const searchWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: 10,
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  flex: "1 1 200px",
};

const searchInputStyle: React.CSSProperties = {
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

const clearFiltersBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink3)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

const selectStyle: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--color-ink2)",
  cursor: "pointer",
  outline: "none",
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
