// src/admin/HeroStatsPanel.tsx — statistiques du hero + verdict A/B (lot 10).
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { RefreshCw, X } from "lucide-react";
import {
  heroStatsApi,
  type HeroStats,
  type HeroStatsArm,
  type HeroStatsSlide,
} from "../api/supabaseApi";
import type { HeroPromotion } from "./adminTypes";
import { resolveHeroConfig } from "../lib/heroSchema";
import { compareCtr, ctr } from "../lib/heroStats";

interface Info {
  label: string;
  ab?: "A" | "B";
  ctas: Record<string, string>;
}
interface Row {
  id: string;
  pos: number;
  info: Info;
  stat: HeroStatsSlide | null;
}

const ZERO: HeroStatsArm = {
  impressions: 0,
  clicks: 0,
  impSessions: 0,
  clickSessions: 0,
};

function infoOf(p: HeroPromotion): Info {
  const c = resolveHeroConfig(p);
  const t = c.layers.find((l) => l.type === "text");
  const head = (t && t.type === "text" ? t.headline : p.headline || "")
    .split("\n")[0]
    .trim();
  return {
    label: head || `Slide ${p.id.slice(0, 6)}`,
    ab: c.ab,
    ctas: Object.fromEntries(c.ctas.map((x) => [x.id, x.label])),
  };
}

const ctaName = (info: Info, key: string) =>
  key === "main"
    ? "Visuel principal"
    : key.startsWith("tile-")
      ? `Tuile ${Number(key.slice(5)) + 1}`
      : key === "html"
        ? "Lien du HTML collé"
        : (info.ctas[key] ?? key);

const pct = (x: number | null) =>
  x == null ? "—" : `${(x * 100).toFixed(1)} %`;
const nf = (n: number) => n.toLocaleString("fr-FR");

const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 300,
  background: "rgba(10,9,7,.55)",
  overflowY: "auto",
  padding: "4vh 16px",
};
const card: CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};
const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};
const sel: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink)",
  fontSize: 12,
};
const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 11,
  color: "var(--color-ink3)",
  fontWeight: 700,
  whiteSpace: "nowrap",
};
const td: CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
};
const note: CSSProperties = {
  fontSize: 12,
  color: "var(--color-ink3)",
  margin: 0,
  lineHeight: 1.5,
};

/** Dernières 24 h (UTC) : barres par heure, heure en cours encadrée. */
function Hourly({ hourly }: { hourly: HeroStats["hourly"] }) {
  if (hourly.length === 0)
    return <p style={note}>Aucun événement sur les dernières 24 h.</p>;
  const W = 600;
  const H = 46;
  const max = Math.max(1, ...hourly.map((d) => d.impressions));
  const bw = W / 24;
  const curHour = new Date().toISOString().slice(0, 13);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 60 }}
      role="img"
      aria-label="Impressions et clics par heure, dernières 24 heures"
    >
      {hourly.map((d) => {
        const h = (d.impressions / max) * (H - 4);
        const hc = (d.clicks / max) * (H - 4);
        const idx = hourIndex(d.hour);
        const x = idx * bw + bw * 0.15;
        const w = bw * 0.7;
        const isCur = d.hour.slice(0, 13) === curHour;
        const label = `${d.hour.slice(11, 13)}h : ${d.impressions} impressions, ${d.clicks} clics${isCur ? " (heure en cours)" : ""}`;
        return (
          <g key={d.hour}>
            <title>{label}</title>
            <rect
              x={x}
              y={H - h}
              width={w}
              height={Math.max(h, 1)}
              fill="var(--color-border2)"
              rx={1}
              stroke={isCur ? "var(--color-accent)" : "none"}
              strokeWidth={isCur ? 1.5 : 0}
            />
            <rect
              x={x}
              y={H - hc}
              width={w}
              height={hc}
              fill="var(--color-accent)"
              rx={1}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Position 0..23 d'après l'heure UTC (repli : hash stable). */
function hourIndex(iso: string): number {
  const m = iso.match(/T(\d{2}):/);
  if (m) return Math.max(0, Math.min(23, Number(m[1])));
  let h = 0;
  for (const ch of iso) h = (h * 31 + ch.charCodeAt(0)) % 24;
  return h;
}

function Daily({ daily }: { daily: HeroStats["daily"] }) {  if (daily.length === 0)
    return <p style={note}>Aucune donnée sur la période.</p>;
  const W = 600;
  const H = 70;
  const max = Math.max(1, ...daily.map((d) => d.impressions));
  const bw = W / daily.length;
  // Jour UTC (même référentiel que le RPC) ; repli : dernière barre.
  const today = new Date().toISOString().slice(0, 10);
  const hasToday = daily.some((d) => d.date === today);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 90 }}
      role="img"
      aria-label="Impressions et clics par jour"
    >
      {daily.map((d, i) => {
        const h = (d.impressions / max) * (H - 4);
        const hc = (d.clicks / max) * (H - 4);
        const x = i * bw + bw * 0.15;
        const w = bw * 0.7;
        const isToday = hasToday ? d.date === today : i === daily.length - 1;
        return (
          <g key={d.date}>
            <title>{`${d.date} : ${d.impressions} impressions, ${d.clicks} clics${isToday ? " (aujourd'hui, en cours)" : ""}`}</title>
            <rect
              x={x}
              y={H - h}
              width={w}
              height={Math.max(h, 1)}
              fill="var(--color-border2)"
              rx={2}
              stroke={isToday ? "var(--color-accent)" : "none"}
              strokeWidth={isToday ? 2 : 0}
            />
            <rect
              x={x}
              y={H - hc}
              width={w}
              height={hc}
              fill="var(--color-accent)"
              rx={2}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function HeroStatsPanel({
  slides,
  onClose,
}: {
  slides: HeroPromotion[];
  onClose: () => void;
}) {
  const [days, setDays] = useState(14);
  const [data, setData] = useState<HeroStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [cmpA, setCmpA] = useState("");
  const [cmpB, setCmpB] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    heroStatsApi
      .get(days)
      .then(
        (d) => {
          if (!alive) return;
          setData(d);
          setRefreshedAt(Date.now());
        },
        (e) =>
          alive &&
          setErr(
            e?.message ||
              "Statistiques indisponibles (migration du lot 10 non appliquée ?).",
          ),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [days, tick]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.slides.map((s) => [s.slideId, s]));
    const known = slides.map((p, i) => ({
      id: p.id,
      pos: i + 1,
      info: infoOf(p),
      stat: byId.get(p.id) ?? null,
    }));
    const ids = new Set(slides.map((p) => p.id));
    const orphans = data.slides
      .filter((s) => !ids.has(s.slideId))
      .map((s) => ({
        id: s.slideId,
        pos: 0,
        info: {
          label: `Slide supprimé ${s.slideId.slice(0, 6)}`,
          ctas: {},
        } as Info,
        stat: s,
      }));
    return [...known, ...orphans];
  }, [data, slides]);

  // Comparaison par défaut : un slide A contre un slide B s'ils existent, sinon les deux premiers.
  useEffect(() => {
    if (cmpA || cmpB || rows.length < 2) return;
    const a = rows.find((r) => r.info.ab === "A") ?? rows[0];
    const b =
      rows.find((r) => r.info.ab === "B" && r.id !== a.id) ??
      rows.find((r) => r.id !== a.id);
    if (a) setCmpA(a.id);
    if (b) setCmpB(b.id);
  }, [rows]);

  const arm = (r?: Row) => ({
    impSessions: r?.stat?.impSessions ?? 0,
    clickSessions: r?.stat?.clickSessions ?? 0,
  });
  const rA = rows.find((r) => r.id === cmpA);
  const rB = rows.find((r) => r.id === cmpB);
  const cmp = rA && rB && rA.id !== rB.id ? compareCtr(arm(rA), arm(rB)) : null;
  const maxCtr = Math.max(0.0001, ...rows.map((r) => ctr(arm(r)) ?? 0));
  const totalImp = rows.reduce((n, r) => n + (r.stat?.impressions ?? 0), 0);
  const totalClk = rows.reduce((n, r) => n + (r.stat?.clicks ?? 0), 0);

  const verdict = () => {
    if (!cmp || !rA || !rB) return "Choisis deux slides différents.";
    if (cmp.verdict === "insufficient") {
      return `Pas assez de données : il faut au moins ${cmp.min} visiteurs par slide (actuellement ${nf(cmp.nA)} et ${nf(cmp.nB)}).`;
    }
    if (cmp.verdict === "none") {
      return `Aucune différence significative (CTR ${pct(cmp.rateA)} contre ${pct(cmp.rateB)}). Laisse tourner le test ou garde les deux.`;
    }
    const win = cmp.verdict === "a" ? rA : rB;
    const winRate = (cmp.verdict === "a" ? cmp.rateA : cmp.rateB) as number;
    const lose = (cmp.verdict === "a" ? cmp.rateB : cmp.rateA) as number;
    const lift =
      lose > 0
        ? ` (${(((winRate - lose) / lose) * 100).toFixed(0)} % de mieux)`
        : "";
    return `« ${win.info.label} » gagne : CTR ${pct(winRate)} contre ${pct(lose)}${lift}. Différence significative (p = ${(cmp.p as number).toFixed(4)}).`;
  };

  return (
    <div style={wrap} onClick={onClose}>
      <div
        style={card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Statistiques du hero"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
              flex: 1,
            }}
          >
            Statistiques du hero
          </h2>
          <select
            style={sel}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Période"
          >
            {[7, 14, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d} derniers jours
              </option>
            ))}
          </select>
          <button
            type="button"
            style={btn}
            onClick={() => setTick((t) => t + 1)}
            disabled={loading}
          >
            <RefreshCw size={13} /> Actualiser
          </button>
          {refreshedAt !== null && (
            <span style={{ ...note, margin: 0 }}>
              Actualisé à{" "}
              {new Date(refreshedAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
          <button
            type="button"
            style={btn}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>

        <p style={note}>
          Mesures des visiteurs ayant accepté les cookies non essentiels. «
          Visiteurs » = navigateurs distincts, pas des personnes. Impression =
          slide visible ≥ 1 s, comptée une fois par chargement de page. CTR =
          visiteurs ayant cliqué ÷ visiteurs ayant vu. Les administrateurs
          connectés et l'aperçu du studio sont exclus.
        </p>

        {err && <p style={{ ...note, color: "#991b1b" }}>{err}</p>}
        {loading && !data && <p style={note}>Chargement…</p>}

        {data && (
          <>
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                fontSize: 13,
                color: "var(--color-ink2)",
              }}
            >
              <span>
                <strong style={{ fontSize: 20, color: "var(--color-ink)" }}>
                  {nf(totalImp)}
                </strong>{" "}
                impressions
              </span>
              <span>
                <strong style={{ fontSize: 20, color: "var(--color-ink)" }}>
                  {nf(totalClk)}
                </strong>{" "}
                clics
              </span>
              <span style={{ color: "var(--color-ink3)" }}>
                {data.lastEventAt
                  ? `Dernier événement : ${new Date(data.lastEventAt).toLocaleString("fr-FR")}`
                  : "Aucun événement enregistré"}
              </span>
            </div>

            <Daily daily={data.daily} />
            <p style={note}>
              Gris : impressions · Orange : clics (par jour, tous slides).
            </p>

            <Hourly hourly={data.hourly} />
            <p style={note}>
              Dernières 24 heures UTC (barre encadrée = heure en cours).
            </p>

            <div
              style={{
                overflowX: "auto",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "var(--color-surface2)" }}>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>Slide</th>
                    <th style={th}>Audience</th>
                    <th style={th}>Impressions</th>
                    <th style={th}>Visiteurs</th>
                    <th style={th}>Clics</th>
                    <th style={th}>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const a = arm(r);
                    const rate = ctr(a);
                    const isOpen = open === r.id;
                    return (
                      <FragmentRow
                        key={r.id}
                        row={r}
                        rate={rate}
                        maxCtr={maxCtr}
                        isOpen={isOpen}
                        onToggle={() => setOpen(isOpen ? null : r.id)}
                      />
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td style={td} colSpan={7}>
                        Aucun slide.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface2)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <strong style={{ fontSize: 14, color: "var(--color-ink)" }}>
                Comparer deux slides (test A/B)
              </strong>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <select
                  style={sel}
                  value={cmpA}
                  onChange={(e) => setCmpA(e.target.value)}
                  aria-label="Slide A"
                >
                  <option value="">— Slide —</option>
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.info.label}
                      {r.info.ab ? ` (${r.info.ab})` : ""}
                    </option>
                  ))}
                </select>
                <span style={{ color: "var(--color-ink3)" }}>contre</span>
                <select
                  style={sel}
                  value={cmpB}
                  onChange={(e) => setCmpB(e.target.value)}
                  aria-label="Slide B"
                >
                  <option value="">— Slide —</option>
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.info.label}
                      {r.info.ab ? ` (${r.info.ab})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--color-ink)",
                  fontWeight: 600,
                }}
              >
                {verdict()}
              </div>
              <p style={note}>
                Test z de deux proportions, seuil 5 %. Fixe la durée à l'avance
                (au moins 7 jours) et ne t'arrête pas au premier résultat «
                significatif » : regarder le test en cours fausse le verdict.
                Pour tester, règle l'« Audience » de chaque slide (A / B) dans
                le studio.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FragmentRow({
  row,
  rate,
  maxCtr,
  isOpen,
  onToggle,
}: {
  row: Row;
  rate: number | null;
  maxCtr: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const s = row.stat;
  const ctas = s ? Object.entries(s.byCta).sort((a, b) => b[1] - a[1]) : [];
  const variants = s ? Object.entries(s.byVariant).sort() : [];
  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: "pointer",
          borderTop: "1px solid var(--color-border)",
          background: isOpen ? "var(--color-accent-bg)" : "transparent",
        }}
      >
        <td style={td}>{row.pos || "—"}</td>
        <td
          style={{
            ...td,
            maxWidth: 260,
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 600,
          }}
        >
          {row.info.label}
        </td>
        <td style={td}>{row.info.ab ? `Variante ${row.info.ab}` : "Tous"}</td>
        <td style={td}>{nf(s?.impressions ?? 0)}</td>
        <td style={td}>{nf(s?.impSessions ?? 0)}</td>
        <td style={td}>{nf(s?.clicks ?? 0)}</td>
        <td style={td}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong>{pct(rate)}</strong>
            <div
              style={{
                width: 70,
                height: 6,
                borderRadius: 99,
                background: "var(--color-surface2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${((rate ?? 0) / maxCtr) * 100}%`,
                  height: "100%",
                  background: "var(--color-accent)",
                }}
              />
            </div>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr style={{ background: "var(--color-surface2)" }}>
          <td style={td} />
          <td style={{ ...td, whiteSpace: "normal" }} colSpan={6}>
            <div
              style={{
                display: "flex",
                gap: 32,
                flexWrap: "wrap",
                fontSize: 12,
                color: "var(--color-ink2)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Clics par bouton
                </div>
                {ctas.length === 0
                  ? "Aucun clic."
                  : ctas.map(([k, n]) => (
                      <div key={k}>
                        {ctaName(row.info, k)} : {nf(n)}
                      </div>
                    ))}
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Par variante de visiteur
                </div>
                {variants.length === 0
                  ? "—"
                  : variants.map(([k, a]) => (
                      <div key={k}>
                        {k === "?" ? "Variante inconnue" : `Variante ${k}`} :{" "}
                        {nf(a.impSessions)} visiteurs, {nf(a.clickSessions)}{" "}
                        cliqueurs, CTR {pct(ctr(a))}
                      </div>
                    ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
