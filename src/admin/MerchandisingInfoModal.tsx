// src/admin/MerchandisingInfoModal.tsx
// Lexicon modal for the Merchandising page (same pattern as ReportInfoModal).
// Plain-English explanations of every control, signal and fallback.
import React from "react";
import { X } from "lucide-react";

interface MerchandisingInfoModalProps {
  onClose: () => void;
}

export default function MerchandisingInfoModal({ onClose }: MerchandisingInfoModalProps) {
  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 15,
    color: "var(--color-ink)",
    marginBottom: 10,
    paddingBottom: 6,
    borderBottom: "1px solid var(--color-border)",
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    color: "var(--color-ink2)",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 10px",
    background: "var(--color-surface2)",
    fontWeight: 700,
    color: "var(--color-ink3)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.03em",
    borderBottom: "1px solid var(--color-border)",
  };

  const tdStyle: React.CSSProperties = {
    padding: "8px 10px",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "top",
    lineHeight: 1.5,
  };

  const noteStyle: React.CSSProperties = {
    fontSize: 11,
    color: "var(--color-ink4)",
    marginTop: 12,
    lineHeight: 1.6,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(26,20,10,0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: 20,
          maxWidth: 900,
          width: "90%",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: 28,
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h2
            style={{ fontWeight: 700, fontSize: 18, color: "var(--color-ink)" }}
          >
            ✨ How merchandising works
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: 4,
              cursor: "pointer",
              color: "var(--color-ink2)",
              display: "flex",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Pipeline */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>🔄 The pipeline in 3 steps</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Step</th>
                <th style={thStyle}>What happens</th>
                <th style={thStyle}>Where</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>1. Signals</td>
                <td style={tdStyle}>
                  The site collects sales (last 30 days), ratings, views, clicks, cart additions, favorites, searches and real co-purchases — silently, in the background.
                </td>
                <td style={tdStyle}>Automatic, every visit</td>
              </tr>
              <tr>
                <td style={tdStyle}>2. Nightly scorer</td>
                <td style={tdStyle}>
                  Once a day, a backend job turns those signals into a score from 0 to 1 for every product, per section. Higher score = shown first.
                </td>
                <td style={tdStyle}>“Nightly scorer” card + “Run scorer now”</td>
              </tr>
              <tr>
                <td style={tdStyle}>3. Display</td>
                <td style={tdStyle}>
                  The storefront orders products by score. If scores are missing or older than 48h, the site automatically falls back to the classic order — never empty, never broken.
                </td>
                <td style={tdStyle}>Storefront (automatic)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sections */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>🧩 Sections (where each one lives)</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Lives on the site at</th>
                <th style={thStyle}>Job</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}><code>frequently</code></td>
                <td style={tdStyle}>Product page → “Frequently bought together”</td>
                <td style={tdStyle}>Complete the outfit: real co-purchases first (different category), then rule-based fill.</td>
              </tr>
              <tr>
                <td style={tdStyle}><code>related</code></td>
                <td style={tdStyle}>Product page → “You might also like”</td>
                <td style={tdStyle}>Discovery: affinity first, then same category/event, then rest — never repeats an item already shown above.</td>
              </tr>
              <tr>
                <td style={tdStyle}><code>new</code></td>
                <td style={tdStyle}>Home → “New arrivals”</td>
                <td style={tdStyle}>Freshness first. Falls back to active products so the section never shrinks.</td>
              </tr>
              <tr>
                <td style={tdStyle}><code>featured</code></td>
                <td style={tdStyle}>Home → “Featured offers”</td>
                <td style={tdStyle}>Editorial picks. Scores only <em>suggest</em> — a human always decides here.</td>
              </tr>
              <tr>
                <td style={tdStyle}><code>catalog</code></td>
                <td style={tdStyle}>Home → product grid (default sort)</td>
                <td style={tdStyle}>Overall ranking when the visitor hasn&apos;t chosen a manual sort.</td>
              </tr>
              <tr>
                <td style={tdStyle}><code>search</code></td>
                <td style={tdStyle}>Header → trending chips (empty search box)</td>
                <td style={tdStyle}>Real trending search terms from the last 30 days.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Signals */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>📶 Signals (what the score is made of)</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Signal</th>
                <th style={thStyle}>Plain meaning</th>
                <th style={thStyle}>Source</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>popularity</td>
                <td style={tdStyle}>How much it sold in the last 30 days (0–1, best seller = 1).</td>
                <td style={tdStyle}><code>product_sales_stats</code></td>
              </tr>
              <tr>
                <td style={tdStyle}>freshness</td>
                <td style={tdStyle}>How recently it was added. Fades over ~60 days — new items shine, old ones don&apos;t get punished forever.</td>
                <td style={tdStyle}><code>products.created_at</code></td>
              </tr>
              <tr>
                <td style={tdStyle}>quality</td>
                <td style={tdStyle}>Average rating, adjusted so 5★ from 2 reviews weighs less than 4.6★ from 200 reviews (Bayesian average).</td>
                <td style={tdStyle}><code>products.ratings_*</code></td>
              </tr>
              <tr>
                <td style={tdStyle}>attention</td>
                <td style={tdStyle}>Real interest: views count 1, favorites 2, cart additions 3.</td>
                <td style={tdStyle}><code>engagement_events</code> (30 days)</td>
              </tr>
              <tr>
                <td style={tdStyle}>discount</td>
                <td style={tdStyle}>Size of the active deal (0 if no deal or expired). Biggest real discount wins.</td>
                <td style={tdStyle}><code>products.deal_*</code></td>
              </tr>
              <tr>
                <td style={tdStyle}>event</td>
                <td style={tdStyle}>Boost when the product&apos;s event date approaches (1 at 60 days out → 0 on the day, nothing after).</td>
                <td style={tdStyle}>Event calendar below</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Controls */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>🎛️ Controls (what each setting does)</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Control</th>
                <th style={thStyle}>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Weight sliders (0–1)</td>
                <td style={tdStyle}>How much each signal counts for this section. 0 = ignore that signal. They don&apos;t need to add up to 1 — only the relative order matters.</td>
              </tr>
              <tr>
                <td style={tdStyle}>Enabled (kill switch)</td>
                <td style={tdStyle}>ON = algorithm drives this section. OFF = instant fallback to the classic order, no scoring involved. Use it if anything ever looks wrong.</td>
              </tr>
              <tr>
                <td style={tdStyle}>A/B test</td>
                <td style={tdStyle}>Splits visitors 50/50, stable per visitor: group A sees the classic order, group B sees the scored order. Compare real behavior before deciding. Off = everyone sees scored order.</td>
              </tr>
              <tr>
                <td style={tdStyle}>Pins</td>
                <td style={tdStyle}>Product IDs always shown first in this section, in the order you list them. Type IDs separated by commas — only IDs that exist in the catalog are kept, and product names appear below the field to confirm.</td>
              </tr>
              <tr>
                <td style={tdStyle}>Excludes</td>
                <td style={tdStyle}>Product IDs never shown in this section, whatever the score says. Useful to hide a flop or an item you want to reserve for elsewhere.</td>
              </tr>
              <tr>
                <td style={tdStyle}>Save</td>
                <td style={tdStyle}>Writes this section&apos;s settings. Nothing applies to the site before you press Save.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Nightly run */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>🌙 Nightly scorer run line</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Part</th>
                <th style={thStyle}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Date + “ok”</td>
                <td style={tdStyle}>When the last computation finished and whether it succeeded. “ok” = scores are fresh.</td>
              </tr>
              <tr>
                <td style={tdStyle}>N scores</td>
                <td style={tdStyle}>Number of (section × product) scores written — e.g. 25 scores = 5 products × 5 sections.</td>
              </tr>
              <tr>
                <td style={tdStyle}>N produits</td>
                <td style={tdStyle}>Eligible products scored (active, in stock, non-affiliate).</td>
              </tr>
              <tr>
                <td style={tdStyle}>Run scorer now</td>
                <td style={tdStyle}>Recomputes everything immediately (takes a few seconds). Use it after changing weights, pins or event dates.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Event calendar */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>📅 Event calendar (demand peaks)</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Element</th>
                <th style={thStyle}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Date per event</td>
                <td style={tdStyle}>The real date of the event (final, carnival…). Products linked to that event get a growing boost during the 60 days before, nothing after. Empty date = no boost.</td>
              </tr>
              <tr>
                <td style={tdStyle}>New event types</td>
                <td style={tdStyle}>Appear here automatically as soon as a product uses them — no code change needed.</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Cart recovery */}
        <div style={sectionStyle}>
          <h3 style={titleStyle}>🛒 Abandoned cart recovery</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Element</th>
                <th style={thStyle}>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>Inactive since (hours)</td>
                <td style={tdStyle}>Only carts untouched for at least this long are candidates (1–168h).</td>
              </tr>
              <tr>
                <td style={tdStyle}>Dry run</td>
                <td style={tdStyle}>Simulation: counts who <em>would</em> be emailed (found, to-send, opted-out, ordered-since) without sending anything. Always run this first.</td>
              </tr>
              <tr>
                <td style={tdStyle}>Send now</td>
                <td style={tdStyle}>Sends real reminder emails after confirmation. Skips marketing opt-outs, customers who ordered since, and already-reminded carts (one reminder per cart, ever).</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Safety */}
        <div style={noteStyle}>
          <strong>📌 Safety nets (always on):</strong>
          <ul style={{ marginTop: 4, paddingLeft: 18 }}>
            <li>
              <strong>Never empty</strong> — sections fall back to the classic order when scores are missing or older than 48h.
            </li>
            <li>
              <strong>Hard filters first</strong> — inactive, out-of-stock and affiliate products can never be pushed by scores.
            </li>
            <li>
              <strong>Respect flags</strong> — per-product rating/purchase display settings are never bypassed.
            </li>
            <li>
              <strong>No duplicates</strong> — an item shown in one block is not repeated in the next one on the same page.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
