// src/admin/emailMarketing/PrefsEventsSection.tsx
// Rapport des changements de préférences email (page /unsubscribe via l'edge
// `email-preferences`). Lecture seule : la table email_preference_events est
// append-only (RLS admin). Utilisé par l'onglet "Préférences" de EmailMarketingPage.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface PrefEvent {
  id: string;
  email: string;
  changes: Record<string, { from?: unknown; to?: unknown }>;
  source: string | null;
  ip: string | null;
  created_at: string;
}

const PREF_LABELS: Record<string, string> = {
  newsletter: "Newsletter",
  order_confirmation: "Confirmations",
  shipping_update: "Shipping",
  promotions: "Promos",
};

function boolLabel(v: unknown): string {
  if (v === true) return "oui";
  if (v === false) return "non";
  return "—";
}

/** Résumé FR d'un event, ex: "Newsletter : oui → non · Promos : non → oui". */
export function summarizeChanges(changes: PrefEvent["changes"]): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(changes || {})) {
    const label = PREF_LABELS[k] || k;
    if (v && typeof v === "object" && ("from" in v || "to" in v)) {
      parts.push(`${label} : ${boolLabel((v as any).from)} → ${boolLabel((v as any).to)}`);
    } else {
      parts.push(`${label} : ${boolLabel(v)}`);
    }
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

const card: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 14,
  padding: "14px 16px",
};
const input: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  fontSize: 13,
  color: "var(--color-ink)",
  outline: "none",
};

export default function PrefsEventsSection({
  toast,
}: {
  toast: (msg: string, type?: "success" | "error") => void;
}) {
  const [events, setEvents] = useState<PrefEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("email_preference_events")
          .select("id, email, changes, source, ip, created_at")
          .order("created_at", { ascending: false })
          .limit(500);
        if (error) throw error;
        setEvents((data ?? []) as PrefEvent[]);
      } catch (e: any) {
        toast(e?.message || "Chargement impossible", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  const stats = useMemo(() => {
    const now = Date.now();
    const in30d = events.filter((e) => now - new Date(e.created_at).getTime() < 30 * 86400000);
    const newsletterOff = in30d.filter((e) => (e.changes as any)?.newsletter?.to === false).length;
    const newsletterOn = in30d.filter((e) => (e.changes as any)?.newsletter?.to === true).length;
    const prefsTouched = in30d.filter((e) =>
      ["order_confirmation", "shipping_update", "promotions"].some((k) => k in (e.changes || {})),
    ).length;
    return {
      total30: in30d.length,
      newsletterOff,
      newsletterOn,
      prefsTouched,
      unique: new Set(in30d.map((e) => e.email)).size,
    };
  }, [events]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => e.email.toLowerCase().includes(q));
  }, [events, search]);

  const statCards = [
    { label: "Événements (30j)", value: stats.total30 },
    { label: "Désabonnements newsletter", value: stats.newsletterOff },
    { label: "Réabonnements newsletter", value: stats.newsletterOn },
    { label: "Modifs prefs clients", value: stats.prefsTouched },
    { label: "Emails uniques", value: stats.unique },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--color-ink)", margin: 0 }}>
          Préférences email — journal
        </h3>
        <p style={{ fontSize: 12, color: "var(--color-ink3)", margin: "4px 0 0" }}>
          Chaque changement via la page /unsubscribe (edge <code>email-preferences</code>, validé + rate-limité).
          Lecture seule — le journal est append-only.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {statCards.map((s) => (
          <div key={s.label} style={card}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ink)" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--color-ink3)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Rechercher un email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...input, width: 280 }}
        />
        <span style={{ fontSize: 12, color: "var(--color-ink3)" }}>
          {filtered.length} événement{filtered.length > 1 ? "s" : ""} (500 derniers max)
        </span>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 20, fontSize: 13, color: "var(--color-ink3)" }}>Chargement…</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: 20, fontSize: 13, color: "var(--color-ink3)" }}>
            Aucun changement enregistré pour l'instant.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-surface2)", textAlign: "left" }}>
                <th style={{ padding: "10px 14px", color: "var(--color-ink3)", fontWeight: 600 }}>Date</th>
                <th style={{ padding: "10px 14px", color: "var(--color-ink3)", fontWeight: 600 }}>Email</th>
                <th style={{ padding: "10px 14px", color: "var(--color-ink3)", fontWeight: 600 }}>Changement</th>
                <th style={{ padding: "10px 14px", color: "var(--color-ink3)", fontWeight: 600 }}>Source</th>
                <th style={{ padding: "10px 14px", color: "var(--color-ink3)", fontWeight: 600 }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "10px 14px", color: "var(--color-ink2)", whiteSpace: "nowrap" }}>
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--color-ink)", fontWeight: 600 }}>{e.email}</td>
                  <td style={{ padding: "10px 14px", color: "var(--color-ink2)" }}>{summarizeChanges(e.changes)}</td>
                  <td style={{ padding: "10px 14px", color: "var(--color-ink3)" }}>{e.source || "—"}</td>
                  <td style={{ padding: "10px 14px", color: "var(--color-ink3)" }}>{e.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
