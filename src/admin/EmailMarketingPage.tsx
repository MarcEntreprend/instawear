// src/admin/EmailMarketingPage.tsx
// Page complète de gestion des emails marketing
// Composer, choisir les destinataires, gérer la liste, envoyer, supprimer

import React, { useState, useEffect, useCallback } from "react";
import {
  Send,
  Mail,
  Users,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Search,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

// ─── Types ──────────────────────────────────────────────────────────────
interface Subscriber {
  email: string;
  subscribed_at: string;
}

export default function EmailMarketingPage() {
  // ── Onglets ──────────────────────────────────────────────────────────
  const [tab, setTab] = useState<"compose" | "subscribers">("compose");

  // ── Compose ──────────────────────────────────────────────────────────
  const [audience, setAudience] = useState<
    "newsletter" | "customers_promotions"
  >("newsletter");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number>(0);

  // ── Subscribers ──────────────────────────────────────────────────────
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [searchSub, setSearchSub] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setLoadingSubs(true);
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("email, subscribed_at")
      .order("subscribed_at", { ascending: false });
    setSubscribers(data ?? []);
    setLoadingSubs(false);
  }, []);

  useEffect(() => {
    if (tab === "subscribers") fetchSubscribers();
  }, [tab, fetchSubscribers]);

  // Compte des destinataires
  useEffect(() => {
    setRecipientCount(null);
    if (audience === "newsletter") {
      supabase
        .from("newsletter_subscribers")
        .select("email", { count: "exact", head: true })
        .then(({ count }) => setRecipientCount(count ?? 0));
    } else {
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .filter("email_preferences->>promotions", "eq", "true")
        .then(({ count }) => setRecipientCount(count ?? 0));
    }
  }, [audience]);

  // ── Envoyer ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError(null);

    try {
      let emails: string[] = [];
      if (audience === "newsletter") {
        const { data } = await supabase
          .from("newsletter_subscribers")
          .select("email");
        emails = (data ?? []).map((r) => r.email);
      } else {
        const { data } = await supabase
          .from("customers")
          .select("email")
          .filter("email_preferences->>promotions", "eq", "true");
        emails = (data ?? []).map((r) => r.email);
      }

      if (emails.length === 0) {
        setError("No recipients found for this audience.");
        setSending(false);
        return;
      }

      let count = 0;
      for (const email of emails) {
        if (!email || !email.includes("@")) continue; // skip invalid
        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ to: email, subject, html: message }),
            },
          );
          count++;
        } catch {
          /* skip */
        }
      }

      setSuccessCount(count);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setSubject("");
        setMessage("");
        setSuccessCount(0);
      }, 4000);
    } catch (e: any) {
      setError(e.message || "An error occurred.");
    } finally {
      setSending(false);
    }
  };

  // ── Gérer les subscribers ────────────────────────────────────────────
  const handleAddSubscriber = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    setAddError(null);
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email: newEmail.trim() });
    if (error) {
      setAddError(error.message);
    } else {
      setNewEmail("");
      fetchSubscribers();
    }
    setAdding(false);
  };

  const handleDeleteSubscriber = async (email: string) => {
    await supabase.from("newsletter_subscribers").delete().eq("email", email);
    fetchSubscribers();
  };

  const filteredSubs = subscribers.filter((s) =>
    s.email.toLowerCase().includes(searchSub.toLowerCase()),
  );

  // ─── Styles ───────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    borderRadius: 18,
    padding: 28,
    boxShadow: "var(--shadow-xs)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-ink2)",
    display: "block",
    marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface2)",
    fontSize: 13.5,
    color: "var(--color-ink)",
    fontFamily: "var(--font-body)",
    outline: "none",
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "var(--color-accent-bg)" : "var(--color-surface2)",
    border: `1.5px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 13.5,
    color: active ? "var(--color-accent)" : "var(--color-ink3)",
    cursor: "pointer",
    fontFamily: "var(--font-body)",
    display: "flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.15s",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-ink)",
            marginBottom: 4,
          }}
        >
          Email Marketing
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
          Compose and send promotional emails. Manage your subscriber list.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => setTab("compose")}
          style={tabBtnStyle(tab === "compose")}
        >
          <Send size={16} strokeWidth={2} /> Compose
        </button>
        <button
          onClick={() => setTab("subscribers")}
          style={tabBtnStyle(tab === "subscribers")}
        >
          <Users size={16} strokeWidth={2} /> Subscribers
        </button>
      </div>

      {/* ── Tab: Compose ─────────────────────────────────────────────── */}
      {tab === "compose" && (
        <>
          {/* Audience selector */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <Users
                size={18}
                strokeWidth={2}
                style={{ color: "var(--color-accent)" }}
              />
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--color-ink)",
                }}
              >
                Recipients
              </h3>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              {[
                { key: "newsletter" as const, label: "Newsletter subscribers" },
                {
                  key: "customers_promotions" as const,
                  label: "Customers (promos enabled)",
                },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setAudience(key)}
                  style={tabBtnStyle(audience === key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {recipientCount !== null && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--color-ink4)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Mail size={13} strokeWidth={1.75} />
                {recipientCount} recipient{recipientCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Compose */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 18,
              }}
            >
              <Send
                size={18}
                strokeWidth={2}
                style={{ color: "var(--color-accent)" }}
              />
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--color-ink)",
                }}
              >
                Compose Email
              </h3>
            </div>

            {sent ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 12,
                  padding: "40px 0",
                }}
              >
                <CheckCircle2
                  size={40}
                  strokeWidth={1.5}
                  style={{ color: "var(--color-success)" }}
                />
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--color-ink)",
                  }}
                >
                  Sent!
                </p>
                <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
                  Delivered to {successCount} recipient
                  {successCount !== 1 ? "s" : ""}.
                </p>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                <div>
                  <label style={labelStyle}>Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={inputStyle}
                    placeholder="e.g. New collection just dropped!"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Message (HTML)</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={10}
                    style={{
                      ...inputStyle,
                      resize: "vertical",
                      minHeight: 200,
                      fontFamily: "monospace",
                    }}
                    placeholder={`<h2>New arrivals!</h2>\n<p>Check out our latest products...</p>`}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#991B1B",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <AlertCircle size={15} strokeWidth={2} /> {error}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={handleSend}
                    disabled={sending || !subject.trim() || !message.trim()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 24px",
                      borderRadius: 12,
                      border: "none",
                      background: "var(--color-accent)",
                      color: "white",
                      fontFamily: "var(--font-body)",
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: "pointer",
                      boxShadow: "var(--shadow-accent)",
                      opacity: sending ? 0.6 : 1,
                      transition: "all 0.15s",
                    }}
                  >
                    {sending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        <Send size={16} strokeWidth={2} /> Send to{" "}
                        {recipientCount ?? 0} recipient
                        {(recipientCount ?? 0) !== 1 ? "s" : ""}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Tab: Subscribers ──────────────────────────────────────────── */}
      {tab === "subscribers" && (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Users
                size={18}
                strokeWidth={2}
                style={{ color: "var(--color-accent)" }}
              />
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--color-ink)",
                }}
              >
                Subscribers ({subscribers.length})
              </h3>
              <button
                onClick={fetchSubscribers}
                title="Refresh"
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: "var(--color-ink2)",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <RefreshCw size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Add */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setAddError(null);
              }}
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Add subscriber email…"
              onKeyDown={(e) => e.key === "Enter" && handleAddSubscriber()}
            />
            <button
              onClick={handleAddSubscriber}
              disabled={adding || !newEmail.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                borderRadius: 12,
                border: "none",
                background: "var(--color-accent)",
                color: "white",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
                opacity: adding || !newEmail.trim() ? 0.6 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {adding ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Plus size={15} />
              )}{" "}
              Add
            </button>
          </div>
          {addError && (
            <p style={{ fontSize: 12, color: "#EF4444", marginBottom: 12 }}>
              {addError}
            </p>
          )}

          {/* Search */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              borderRadius: 12,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface2)",
              marginBottom: 12,
            }}
          >
            <Search
              size={14}
              strokeWidth={2}
              style={{ color: "var(--color-ink4)" }}
            />
            <input
              type="text"
              value={searchSub}
              onChange={(e) => setSearchSub(e.target.value)}
              placeholder="Search subscribers…"
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                flex: 1,
                fontSize: 13,
                color: "var(--color-ink)",
                fontFamily: "var(--font-body)",
              }}
            />
            {searchSub && (
              <button
                onClick={() => setSearchSub("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink4)",
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* List */}
          {loadingSubs ? (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 24 }}
            >
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "var(--color-accent)" }}
              />
            </div>
          ) : filteredSubs.length === 0 ? (
            <p
              style={{
                textAlign: "center",
                padding: 24,
                color: "var(--color-ink4)",
                fontSize: 13,
              }}
            >
              No subscribers found.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                maxHeight: 400,
                overflowY: "auto",
              }}
            >
              {filteredSubs.map((s) => (
                <div
                  key={s.email}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "var(--color-ink)",
                      }}
                    >
                      {s.email}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--color-ink4)" }}>
                      {new Date(s.subscribed_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteSubscriber(s.email)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--color-ink4)",
                      padding: 4,
                      borderRadius: 6,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color = "#EF4444";
                      (e.currentTarget as HTMLElement).style.background =
                        "#FEF2F2";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--color-ink4)";
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
