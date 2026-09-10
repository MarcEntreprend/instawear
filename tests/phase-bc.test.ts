// tests/phase-bc.test.ts
// Phase B (stock temps réel) + Phase C (reports Printful).
// Miroirs de supabase/functions/printful-webhook (stock_updated) et
// supabase/functions/printful-reports (validation, normalisation, cache).

import { test } from "node:test";
import assert from "node:assert/strict";

// ─── Phase B : application stock temps réel (miroir edge) ───────────────────

interface SizeEntry {
  price: number;
  stock_status?: string;
  sync_variant_id?: number;
  catalog_variant_id?: number;
}
interface Variant {
  color: string;
  external_variant_id?: string;
  sizes: Record<string, SizeEntry>;
}

function applyStock(
  variants: Variant[],
  outIds: Set<string>,
  discIds: Set<string>,
): { variants: Variant[]; out: number; disc: number; restored: number; anyAvailable: boolean } {
  let out = 0;
  let disc = 0;
  let restored = 0;
  const next = variants.map((v) => {
    const sizes: Record<string, SizeEntry> = { ...(v.sizes || {}) };
    for (const [sz, sd] of Object.entries(sizes)) {
      const entry = { ...sd };
      const known = [entry.sync_variant_id, entry.catalog_variant_id, v.external_variant_id]
        .filter((x) => x !== undefined && x !== null && String(x).length > 0)
        .map((x) => String(x));
      if (known.length === 0) continue;
      const isDisc = known.some((id) => discIds.has(id));
      const isOut = known.some((id) => outIds.has(id));
      const cur = entry.stock_status || "available";
      if (isDisc && cur !== "discontinued") {
        entry.stock_status = "discontinued";
        disc++;
      } else if (!isDisc && isOut && cur !== "out_of_stock" && cur !== "discontinued") {
        entry.stock_status = "out_of_stock";
        out++;
      } else if (!isDisc && !isOut && cur !== "available") {
        entry.stock_status = "available";
        restored++;
      }
      sizes[sz] = entry;
    }
    return { ...v, sizes };
  });
  const anyAvailable = next.some((v) =>
    Object.values(v.sizes || {}).some(
      (sd) => (sd?.stock_status || "available") === "available",
    ),
  );
  return { variants: next, out, disc, restored, anyAvailable };
}

const base: Variant[] = [
  {
    color: "#000000",
    external_variant_id: "111",
    sizes: {
      S: { price: 10, stock_status: "available", sync_variant_id: 111, catalog_variant_id: 201 },
      M: { price: 10, stock_status: "available", sync_variant_id: 112, catalog_variant_id: 202 },
    },
  },
];

test("rupture par sync ID → out_of_stock", () => {
  const r = applyStock(structuredClone(base), new Set(["112"]), new Set());
  assert.equal(r.variants[0].sizes.M.stock_status, "out_of_stock");
  assert.equal(r.variants[0].sizes.S.stock_status, "available");
  assert.equal(r.out, 1);
  assert.ok(r.anyAvailable);
});

test("discontinued par catalogue ID → discontinued (prioritaire)", () => {
  const r = applyStock(structuredClone(base), new Set(["201"]), new Set(["201"]));
  assert.equal(r.variants[0].sizes.S.stock_status, "discontinued");
  assert.equal(r.disc, 1);
});

test("clé out_of_stock supportée comme out", () => {
  // L'edge fusionne variant_stock.out + .out_of_stock avant ce point.
  const merged = new Set(["112"]);
  const r = applyStock(structuredClone(base), merged, new Set());
  assert.equal(r.out, 1);
});

test("ID absent des listes → restauré (doc : absent = actif)", () => {
  const v = structuredClone(base);
  v[0].sizes.M.stock_status = "out_of_stock";
  const r = applyStock(v, new Set(), new Set());
  assert.equal(r.variants[0].sizes.M.stock_status, "available");
  assert.equal(r.restored, 1);
});

test("tailles sans ID connu : intouchées (audit seul)", () => {
  const v: Variant[] = [
    { color: "#fff", sizes: { S: { price: 10, stock_status: "out_of_stock" } } },
  ];
  const r = applyStock(v, new Set(["999"]), new Set());
  assert.equal(r.variants[0].sizes.S.stock_status, "out_of_stock");
  assert.equal(r.out, 0);
});

test("tout indisponible → anyAvailable false (in_stock=false côté edge)", () => {
  const r = applyStock(
    structuredClone(base),
    new Set(),
    new Set(["111", "112"]),
  );
  assert.equal(r.anyAvailable, false);
  assert.equal(r.disc, 2);
});

test("discontinued conservé si listé rupture seule (pas de downgrade)", () => {
  const v = structuredClone(base);
  v[0].sizes.S.stock_status = "discontinued";
  const r = applyStock(v, new Set(["111"]), new Set());
  assert.equal(r.variants[0].sizes.S.stock_status, "discontinued");
});

// ─── Phase C : validation période (miroir edge) ─────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validatePeriod(
  from: string,
  to: string,
): { ok: boolean; error?: string } {
  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return { ok: false, error: "date_from/date_to requis (YYYY-MM-DD)" };
  }
  if (from > to) return { ok: false, error: "date_from postérieure à date_to" };
  const days =
    (new Date(to + "T00:00:00Z").getTime() -
      new Date(from + "T00:00:00Z").getTime()) /
    86400000;
  if (!Number.isFinite(days) || days < 0 || days > 183) {
    return { ok: false, error: "Période max 6 mois (limite Printful)" };
  }
  return { ok: true };
}

test("période valide 30j", () => {
  assert.ok(validatePeriod("2026-08-01", "2026-08-30").ok);
});

test("format invalide rejeté", () => {
  assert.equal(validatePeriod("01/08/2026", "2026-08-30").ok, false);
});

test("from > to rejeté", () => {
  assert.equal(validatePeriod("2026-08-30", "2026-08-01").ok, false);
});

test("> 183 jours rejeté (limite Printful)", () => {
  assert.equal(validatePeriod("2026-01-01", "2026-12-31").ok, false);
});

test("183 jours pile accepté", () => {
  assert.ok(validatePeriod("2026-01-01", "2026-07-02").ok);
});

// ─── Phase C : normalisation statistics (miroir edge) ───────────────────────

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function normalizeStatistics(result: any, from: string, to: string) {
  const store = (result?.store_statistics || [])[0] || {};
  const summary = Array.isArray(store.sales_and_costs_summary)
    ? store.sales_and_costs_summary
    : [];
  const totalRow = summary.find((r: any) => r?.date === "Total") || {};
  return {
    currency: store.currency || "USD",
    period: { from, to },
    totals: {
      profit: num(totalRow.profit) ?? num(store.profit?.value),
      printful_costs: num(totalRow.costs) ?? num(store.printful_costs?.value),
      paid_orders: num(store.total_paid_orders?.value),
      order_count: num(totalRow.order_count),
    },
  };
}

test("ligne Total prioritaire, value en repli", () => {
  const out = normalizeStatistics(
    {
      store_statistics: [
        {
          currency: "USD",
          profit: { value: 90 },
          printful_costs: { value: 40 },
          total_paid_orders: { value: 5 },
          sales_and_costs_summary: [
            { date: "Total", order_count: 5, costs: 42, profit: 95 },
            { date: "2026-08-01", order_count: 5, costs: 42, profit: 95 },
          ],
        },
      ],
    },
    "2026-08-01",
    "2026-08-31",
  );
  assert.equal(out.totals.profit, 95);
  assert.equal(out.totals.printful_costs, 42);
  assert.equal(out.totals.paid_orders, 5);
  assert.equal(out.totals.order_count, 5);
  assert.equal(out.currency, "USD");
});

test("sans ligne Total : repli sur value", () => {
  const out = normalizeStatistics(
    {
      store_statistics: [
        { profit: { value: 90 }, printful_costs: { value: 40 } },
      ],
    },
    "2026-08-01",
    "2026-08-31",
  );
  assert.equal(out.totals.profit, 90);
  assert.equal(out.totals.printful_costs, 40);
  assert.equal(out.totals.paid_orders, null);
});

test("réponse vide → nulls, pas de crash", () => {
  const out = normalizeStatistics(null, "2026-08-01", "2026-08-31");
  assert.equal(out.totals.profit, null);
  assert.equal(out.currency, "USD");
});

// ─── Phase C : TTL cache 12h ────────────────────────────────────────────────

test("snapshot < 12h = frais, ≥ 12h = périmé", () => {
  const TTL = 12 * 60 * 60 * 1000;
  const fresh = Date.now() - 11 * 3600 * 1000;
  const stale = Date.now() - 13 * 3600 * 1000;
  assert.ok(Date.now() - fresh < TTL);
  assert.ok(!(Date.now() - stale < TTL));
});
