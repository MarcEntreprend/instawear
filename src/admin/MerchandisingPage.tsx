// src/admin/MerchandisingPage.tsx — Phase 5 : pilotage algo merchandising
// Poids par section, pins/excludes, kill switches, A/B, calendrier events,
// dernier run du scorer + déclenchement manuel, relance paniers (dry-run).
import { useEffect, useMemo, useState } from "react";
import { Play, Save, RotateCcw, Mail, Info } from "lucide-react";
import { merchApi, productApi, type MerchConfig } from "../api/supabaseApi";
import { DEFAULT_WEIGHTS, WEIGHT_KEYS } from "../utils/merch";
import type { AdminProduct } from "./adminTypes";
import MerchandisingInfoModal from "./MerchandisingInfoModal";

// Short per-section explanations (full lexicon lives in the modal above).
const SECTION_BLURBS: Record<string, string> = {
  frequently:
    "Product page → “Frequently bought together”. Real co-purchases first (different category), then rule-based fill. Empty = hidden.",
  related:
    "Product page → “You might also like”. Affinity first, then same category/event, never repeats an item shown above on the page.",
  new: "Home → “New arrivals”. Freshness first. Falls back to active products so the section never shrinks below 4 items.",
  featured:
    "Home → “Featured offers”. Scores only suggest here — a human always decides what is displayed.",
  catalog:
    "Home → product grid default order, used when the visitor hasn't picked a manual sort.",
  search:
    "Header → trending chips shown when the search box is empty, built from real search terms (30 days).",
};

// Self-contained info toggle (same pattern as ReportsPage metric infos).
function BlockInfo({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ display: "inline-flex", position: "relative" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="What is this?"
        style={{
          background: open
            ? "var(--color-accent-soft)"
            : "var(--color-surface2)",
          border: "1px solid var(--color-border)",
          borderRadius: 8,
          padding: 4,
          cursor: "pointer",
          color: open ? "var(--color-accent)" : "var(--color-ink3)",
          display: "inline-flex",
        }}
      >
        <Info size={14} strokeWidth={2} />
      </button>
      {open && (
        <span
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            zIndex: 50,
            width: 280,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-lg)",
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: 1.5,
            color: "var(--color-ink2)",
            fontWeight: 400,
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

const SECTIONS = [
  "frequently",
  "related",
  "new",
  "featured",
  "catalog",
  "search",
] as const;

// One-line tooltips for weight sliders (full details in the lexicon modal).
const WEIGHT_TOOLTIPS: Record<string, string> = {
  popularity: "Sales in the last 30 days (0–1, best seller = 1).",
  freshness: "How recently the product was added — fades over ~60 days.",
  quality:
    "Average rating adjusted for sample size (5★ from 2 reviews weighs less than 4.6★ from 200).",
  attention:
    "Real interest: product views ×1, favorites ×2, cart additions ×3.",
  discount: "Size of the active deal (0 when no deal or expired).",
  event:
    "Boost as the linked event date approaches (60 days out → day of, nothing after).",
};

const card: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
};
const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-ink2)",
  display: "block",
  marginBottom: 4,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  fontSize: 13,
  color: "var(--color-ink)",
  outline: "none",
};

export default function MerchandisingPage() {
  const [configs, setConfigs] = useState<Record<string, MerchConfig>>({});
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [events, setEvents] = useState<
    { event_type: string; event_date: string | null; label: string | null }[]
  >([]);
  const [cartHours, setCartHours] = useState(48);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartResult, setCartResult] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, prods, run, evts] = await Promise.all([
        merchApi.getConfigs(),
        productApi.list().catch(() => []),
        merchApi.getLastRun().catch(() => null),
        merchApi.getEventDates().catch(() => []),
      ]);
      setConfigs(c);
      setProducts(prods as AdminProduct[]);
      setLastRun(run);
      setEvents(evts);
    } catch (e) {
      console.warn("Merchandising load error", e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const titles = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(p.id, p.title);
    return m;
  }, [products]);
  const knownEvents = useMemo(() => {
    const s = new Set<string>();
    for (const p of products)
      if ((p as any).eventType) s.add((p as any).eventType);
    for (const e of events) s.add(e.event_type);
    return [...s].sort();
  }, [products, events]);

  const patch = (section: string, p: Partial<MerchConfig>) =>
    setConfigs((prev) => {
      const cur = prev[section];
      return {
        ...prev,
        [section]: {
          enabled: p.enabled ?? cur?.enabled ?? true,
          pins: p.pins ?? cur?.pins ?? [],
          excludes: p.excludes ?? cur?.excludes ?? [],
          settings: p.settings ?? cur?.settings ?? {},
          weights: p.weights ?? cur?.weights ?? {},
        },
      };
    });

  const save = async (section: string) => {
    setSaving(section);
    try {
      const c = configs[section];
      await merchApi.updateConfig(section, {
        enabled: c?.enabled !== false,
        pins: c?.pins || [],
        excludes: c?.excludes || [],
        settings: c?.settings || {},
        weights: c?.weights || {},
      });
    } catch (e: any) {
      alert(e.message || "Save failed");
    } finally {
      setSaving(null);
    }
  };

  const parseIds = (raw: string): string[] =>
    raw
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((id) => titles.has(id));

  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}
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
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)" }}
          >
            Merchandising Algorithm
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            Weights, pins and kill switches per section. The storefront falls
            back to the classic order when scores are missing or stale.
          </p>
        </div>
        <button
          onClick={() => setShowInfoModal(true)}
          title="How merchandising works"
          style={{
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            padding: "4px 8px",
            cursor: "pointer",
            color: "var(--color-ink2)",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Info size={14} strokeWidth={2} />
        </button>
      </div>
      {showInfoModal && (
        <MerchandisingInfoModal onClose={() => setShowInfoModal(false)} />
      )}

      {/* Dernier run + déclenchement */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Nightly scorer
          </h3>
          <BlockInfo text="Recomputes every product score once a day (sales, ratings, attention, freshness, discounts, events). “N scores” = sections × products written. Use “Run scorer now” after changing weights, pins or event dates." />
        </div>
        {lastRun ? (
          <p style={{ fontSize: 13, color: "var(--color-ink2)" }}>
            Dernier run : {new Date(lastRun.started_at).toLocaleString()} —{" "}
            {lastRun.status}
            {lastRun.stats?.scores_written != null &&
              ` — ${lastRun.stats.scores_written} scores, ${lastRun.stats.products} produits`}
          </p>
        ) : (
          <p style={{ fontSize: 13, color: "var(--color-ink4)" }}>
            Aucun run enregistré.
          </p>
        )}
        {runResult && (
          <p style={{ fontSize: 13, color: "var(--color-ink2)", marginTop: 8 }}>
            {runResult}
          </p>
        )}
        <button
          onClick={async () => {
            setRunning(true);
            setRunResult(null);
            try {
              const r = await merchApi.runScorer();
              setRunResult(
                `OK : ${r.scores_written} scores, ${r.products} produits, ${r.events_30d} events 30j.`,
              );
              const run = await merchApi.getLastRun().catch(() => null);
              setLastRun(run);
            } catch (e: any) {
              setRunResult(`Échec : ${e.message || "erreur"}`);
            } finally {
              setRunning(false);
            }
          }}
          disabled={running}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 10,
            border: "none",
            background: "var(--color-accent)",
            color: "white",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            marginTop: 12,
            opacity: running ? 0.6 : 1,
          }}
        >
          <Play size={15} /> {running ? "Scoring…" : "Run scorer now"}
        </button>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => {
        const cfg = configs[section] || {
          enabled: true,
          pins: [],
          excludes: [],
          settings: {},
          weights: {},
        };
        const weights = {
          ...(DEFAULT_WEIGHTS[section] || {}),
          ...(cfg.weights || {}),
        };
        const ab = (cfg.settings as any)?.ab === true;
        return (
          <div key={section} style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 14,
                flexWrap: "wrap",
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--color-ink)",
                  textTransform: "capitalize",
                }}
              >
                {section}
              </h3>
              <BlockInfo
                text={
                  SECTION_BLURBS[section] ||
                  "Ordering rules for this storefront section."
                }
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--color-ink2)",
                  marginLeft: "auto",
                }}
              >
                <input
                  type="checkbox"
                  checked={cfg.enabled !== false}
                  onChange={(e) =>
                    patch(section, { enabled: e.target.checked })
                  }
                />
                Enabled (kill switch)
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "var(--color-ink2)",
                }}
                title="A = legacy order, B = scored order (50/50 per session)"
              >
                <input
                  type="checkbox"
                  checked={ab}
                  onChange={(e) =>
                    patch(section, {
                      settings: {
                        ...(cfg.settings || {}),
                        ab: e.target.checked,
                      },
                    })
                  }
                />
                A/B test
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              {WEIGHT_KEYS.map((k) => (
                <div key={k} title={WEIGHT_TOOLTIPS[k] || k}>
                  <label style={label}>
                    {k} : {(weights[k] ?? 0).toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={weights[k] ?? 0}
                    onChange={(e) =>
                      patch(section, {
                        weights: {
                          ...(cfg.weights || {}),
                          [k]: Number(e.target.value),
                        },
                      })
                    }
                    style={{ width: "100%" }}
                  />
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={label}>
                  Pins (product ids, comma-separated, shown first)
                </label>
                <input
                  type="text"
                  defaultValue={(cfg.pins || []).join(", ")}
                  key={`${section}-pins-${(cfg.pins || []).join(",")}`}
                  onBlur={(e) =>
                    patch(section, { pins: parseIds(e.target.value) })
                  }
                  style={input}
                  placeholder="prod_abc123, prod_def456"
                />
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-ink4)",
                    marginTop: 4,
                  }}
                >
                  {(cfg.pins || [])
                    .map((id) => titles.get(id) || id)
                    .join(" · ") || "—"}
                </p>
              </div>
              <div>
                <label style={label}>Excludes (never shown)</label>
                <input
                  type="text"
                  defaultValue={(cfg.excludes || []).join(", ")}
                  key={`${section}-ex-${(cfg.excludes || []).join(",")}`}
                  onBlur={(e) =>
                    patch(section, { excludes: parseIds(e.target.value) })
                  }
                  style={input}
                  placeholder="prod_xyz789"
                />
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-ink4)",
                    marginTop: 4,
                  }}
                >
                  {(cfg.excludes || [])
                    .map((id) => titles.get(id) || id)
                    .join(" · ") || "—"}
                </p>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 12,
              }}
            >
              <button
                onClick={() => save(section)}
                disabled={saving === section}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: "var(--color-accent)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  opacity: saving === section ? 0.6 : 1,
                }}
              >
                <Save size={14} /> {saving === section ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        );
      })}

      {/* Calendrier events */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Event calendar (demand peaks)
          </h3>
          <BlockInfo text="Set the real date of each event. Linked products get a growing score boost during the 60 days before, nothing after. Empty date = no boost. New event types appear here automatically." />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {knownEvents.map((ev) => {
            const row = events.find((e) => e.event_type === ev);
            return (
              <div
                key={ev}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    minWidth: 140,
                  }}
                >
                  {ev}
                </span>
                <input
                  type="date"
                  defaultValue={row?.event_date || ""}
                  key={`${ev}-${row?.event_date || "none"}`}
                  onBlur={(e) => {
                    merchApi
                      .setEventDate(ev, e.target.value || null)
                      .then(() =>
                        merchApi
                          .getEventDates()
                          .then(setEvents)
                          .catch(() => {}),
                      )
                      .catch((err: any) => alert(err.message || "Save failed"));
                  }}
                  style={{ ...input, width: "auto" }}
                />
                {row?.event_date && (
                  <button
                    onClick={() => {
                      merchApi
                        .setEventDate(ev, null)
                        .then(() =>
                          merchApi
                            .getEventDates()
                            .then(setEvents)
                            .catch(() => {}),
                        )
                        .catch((err: any) =>
                          alert(err.message || "Save failed"),
                        );
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-ink4)",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: "var(--color-ink4)", marginTop: 8 }}>
          Boost croissant 60j avant la date, rien après. Vide = aucun boost.
        </p>
      </div>

      {/* Relance paniers */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Abandoned cart recovery
          </h3>
          <BlockInfo text="Emails carts untouched for at least X hours. Always Dry run first (counts only, sends nothing). Skips marketing opt-outs, customers who ordered since, and already-reminded carts — one reminder per cart, ever." />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <label style={label}>Inactive since (hours)</label>
          <input
            type="number"
            min={1}
            max={168}
            value={cartHours}
            onChange={(e) => setCartHours(Number(e.target.value) || 48)}
            style={{ ...input, width: 100 }}
          />
          <button
            onClick={async () => {
              setCartBusy(true);
              setCartResult(null);
              try {
                const r = await merchApi.runCartRecovery({
                  dry_run: true,
                  hours: cartHours,
                });
                setCartResult(
                  `Dry run : ${r.carts_found} carts, ${r.sent} to send, ${r.skipped_opt_out} opt-out, ${r.skipped_ordered} ordered since.`,
                );
              } catch (e: any) {
                setCartResult(`Échec : ${e.message || "erreur"}`);
              } finally {
                setCartBusy(false);
              }
            }}
            disabled={cartBusy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 10,
              border: "1.5px solid var(--color-border2)",
              background: "var(--color-surface)",
              color: "var(--color-ink2)",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <RotateCcw size={14} /> Dry run
          </button>
          <button
            onClick={async () => {
              if (!window.confirm("Send real reminder emails now?")) return;
              setCartBusy(true);
              setCartResult(null);
              try {
                const r = await merchApi.runCartRecovery({
                  dry_run: false,
                  hours: cartHours,
                });
                setCartResult(
                  `Sent : ${r.sent}, failed : ${r.failed}, opt-out : ${r.skipped_opt_out}, ordered : ${r.skipped_ordered}.`,
                );
              } catch (e: any) {
                setCartResult(`Échec : ${e.message || "erreur"}`);
              } finally {
                setCartBusy(false);
              }
            }}
            disabled={cartBusy}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--color-accent)",
              color: "white",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              opacity: cartBusy ? 0.6 : 1,
            }}
          >
            <Mail size={14} /> Send now
          </button>
        </div>
        {cartResult && (
          <p style={{ fontSize: 13, color: "var(--color-ink2)", marginTop: 8 }}>
            {cartResult}
          </p>
        )}
        <p style={{ fontSize: 11, color: "var(--color-ink4)", marginTop: 8 }}>
          Opt-out marketing respecté, déjà-commandés ignorés, 1 seul rappel par
          panier. Resend test mode : livraison réelle après vérification de
          domaine.
        </p>
      </div>
    </div>
  );
}
