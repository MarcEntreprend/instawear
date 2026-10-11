// src/admin/HeroHistoryPanel.tsx — historique d'un slide + corbeille (Hero Studio, lot 9).
import { useEffect, useState, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import {
  heroHistoryApi,
  type HeroDeletedRow,
  type HeroVersionRow,
} from "../api/supabaseApi";
import {
  diffHeroConfigs,
  snapshotConfig,
  snapshotToDraftParts,
} from "../lib/heroHistory";
import type { HeroConfig } from "../lib/heroSchema";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const REASON = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
} as const;

const small: CSSProperties = {
  fontSize: 12,
  color: "var(--color-ink3)",
  margin: 0,
};
const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 11,
  cursor: "pointer",
};

const summary = (m: HeroVersionRow["meta"]) =>
  `« ${m.headline || "sans titre"} » · ${m.layers ?? 0} couche(s) · ${m.ctas ?? 0} bouton(s)${
    m.active === false ? " · hors ligne" : ""
  }`;

export default function HeroHistoryPanel({
  slideId,
  current,
  currentProductId,
  refreshKey,
  onLoad,
}: {
  slideId: string | null;
  current: HeroConfig;
  currentProductId: string;
  refreshKey: number;
  onLoad: (
    parts: { productId: string; config: HeroConfig },
    when: string,
  ) => void;
}) {
  const [rows, setRows] = useState<HeroVersionRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setErr(null);
    setOpen(null);
    setDiffs({});
    if (!slideId) return;
    let alive = true;
    heroHistoryApi.list(slideId).then(
      (r) => alive && setRows(r),
      (e) =>
        alive &&
        setErr(
          e?.message ||
            "Historique indisponible (migration du lot 9 non appliquée ?).",
        ),
    );
    return () => {
      alive = false;
    };
  }, [slideId, refreshKey]);

  const toggleDiff = async (row: HeroVersionRow) => {
    if (open === row.id) {
      setOpen(null);
      return;
    }
    setOpen(row.id);
    if (diffs[row.id]) return;
    setBusy(row.id);
    try {
      const snap = await heroHistoryApi.getSnapshot(row.id);
      if (!snap) throw new Error("Version introuvable.");
      const lines = diffHeroConfigs(current, snapshotConfig(snap), {
        currentProductId,
        versionProductId: snap.product_id ?? "",
      });
      setDiffs((d) => ({ ...d, [row.id]: lines }));
    } catch (e: any) {
      setErr(e?.message || "Lecture impossible.");
    } finally {
      setBusy(null);
    }
  };

  const load = async (row: HeroVersionRow) => {
    setBusy(row.id);
    try {
      const snap = await heroHistoryApi.getSnapshot(row.id);
      if (!snap) throw new Error("Version introuvable.");
      onLoad(snapshotToDraftParts(snap), fmt(row.createdAt));
    } catch (e: any) {
      setErr(e?.message || "Chargement impossible.");
    } finally {
      setBusy(null);
    }
  };

  if (!slideId)
    return (
      <p style={small}>
        L'historique apparaît après le premier enregistrement.
      </p>
    );
  if (err) return <p style={{ ...small, color: "#991b1b" }}>{err}</p>;
  if (rows === null) return <p style={small}>Chargement…</p>;
  if (rows.length === 0)
    return <p style={small}>Aucune version enregistrée.</p>;

  return (
    <>
      <p style={small}>
        {rows.length} dernière(s) version(s). « Charger » met la version dans
        l'éditeur sans l'enregistrer ; la visibilité et la planification ne
        changent pas.
      </p>
      {rows.map((r, i) => (
        <div
          key={r.id}
          style={{
            padding: 8,
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{ fontSize: 12, color: "var(--color-ink)", fontWeight: 700 }}
          >
            {fmt(r.createdAt)} · {REASON[r.reason]}
            {i === 0 && r.reason !== "delete" ? " · actuelle" : ""}
          </div>
          <div style={small}>
            {r.createdBy ?? "—"} · {summary(r.meta)}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              style={btn}
              disabled={busy === r.id}
              onClick={() => toggleDiff(r)}
            >
              {open === r.id ? "Masquer" : "Changements"}
            </button>
            <button
              type="button"
              style={btn}
              disabled={busy === r.id}
              onClick={() => load(r)}
            >
              <RotateCcw size={11} /> Charger dans l'éditeur
            </button>
          </div>
          {open === r.id && (
            <div style={{ fontSize: 12, color: "var(--color-ink2)" }}>
              {diffs[r.id] === undefined ? (
                "Calcul…"
              ) : diffs[r.id].length === 0 ? (
                "Identique au contenu actuel."
              ) : (
                <>
                  <div style={{ fontWeight: 700 }}>
                    Si tu charges cette version :
                  </div>
                  {diffs[r.id].map((l, k) => (
                    <div key={k}>• {l}</div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/** Corbeille : slides supprimés, récupérables en brouillon (même id). */
export function HeroTrashPanel({
  refreshKey,
  onRecovered,
}: {
  refreshKey: number;
  onRecovered: (slideId: string) => void;
}) {
  const [rows, setRows] = useState<HeroDeletedRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    heroHistoryApi.deleted().then(setRows, () => setRows([]));
  }, [refreshKey]);

  if (rows.length === 0) return null;

  const recover = async (r: HeroDeletedRow) => {
    if (!window.confirm("Récupérer ce slide en brouillon ?")) return;
    setBusy(r.versionId);
    setErr(null);
    try {
      const id = await heroHistoryApi.restoreDeleted(r.versionId);
      onRecovered(id);
    } catch (e: any) {
      setErr(e?.message || "Récupération impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <details style={{ marginTop: 6 }}>
      <summary
        style={{
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--color-ink2)",
        }}
      >
        Corbeille ({rows.length})
      </summary>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginTop: 8,
        }}
      >
        {rows.map((r) => (
          <div
            key={r.versionId}
            style={{
              padding: 8,
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface2)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              {r.meta.headline || "Slide sans titre"}
            </div>
            <div style={small}>
              Supprimé le {fmt(r.createdAt)} par {r.createdBy ?? "—"}
            </div>
            <button
              type="button"
              style={btn}
              disabled={busy === r.versionId}
              onClick={() => recover(r)}
            >
              <RotateCcw size={11} /> Récupérer
            </button>
          </div>
        ))}
        {err && <p style={{ ...small, color: "#991b1b" }}>{err}</p>}
        <p style={small}>
          Le HTML collé se retrouve dans « HTML collé → Historique HTML »
          (super_admin).
        </p>
      </div>
    </details>
  );
}
