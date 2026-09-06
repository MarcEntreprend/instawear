// supabase/functions/merch-scorer/index.ts
// @ts-nocheck
// Scoring merchandising nocturne — SERVICE_ROLE UNIQUEMENT (cron ou admin).
//
// Lit les signaux (ventes, avis, engagement 30j), normalise 0-1, applique les
// poids par section (défauts ci-dessous, surchargeables via merch_config.weights
// — clés whitelistées, valeurs clampées 0..1), écrit product_scores +
// search_trends, purge les événements >90j, journalise dans merch_runs.
// Ne renvoie que des compteurs (jamais de PII).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { isPayloadTooLarge } from "./_shared/validators.ts";
import { logSafe } from "./_shared/logSafe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SCORE_SECTIONS = ["new", "catalog", "search", "related", "frequently"] as const;

// Poids par défaut (somme ≈ 1 par section). Surcharge via merch_config.weights.
const DEFAULT_WEIGHTS: Record<string, Record<string, number>> = {
  new: { freshness: 0.5, popularity: 0.2, attention: 0.2, quality: 0.1, discount: 0 },
  catalog: { popularity: 0.35, attention: 0.25, quality: 0.2, freshness: 0.1, discount: 0.1 },
  search: { popularity: 0.4, attention: 0.3, quality: 0.2, freshness: 0.1, discount: 0 },
  related: { popularity: 0.25, attention: 0.2, quality: 0.25, freshness: 0.05, discount: 0.1 },
  frequently: { popularity: 0.3, attention: 0.2, quality: 0.2, freshness: 0.05, discount: 0.1 },
};
const WEIGHT_KEYS = ["popularity", "freshness", "quality", "attention", "discount"];
const FRESHNESS_HALF_LIFE_DAYS = 60;
const BAYES_M = 10;
const ENGAGEMENT_WINDOW_DAYS = 30;
const RETENTION_DAYS = 90;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isServiceCaller(req: Request, supabaseAdmin: any): Promise<boolean> {
  const apikeyHeader = req.headers.get("apikey") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (apikeyHeader && apikeyHeader === serviceRoleKey) return true;
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return false;
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) return false;
  const { data: adminRow } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("email", userData.user.email)
    .maybeSingle();
  return !!adminRow;
}

function minMax(values: number[]): (v: number) => number {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length === 0) return () => 0;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (max <= min) return () => 0;
  return (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min)));
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const startedAt = new Date().toISOString();
    let runId: string | null = null;
    try {
      const rawBody = await req.text();
      if (isPayloadTooLarge(rawBody)) {
        return json({ error: "Payload trop volumineux" }, 413);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const key = rateLimitKey(req, "merch-scorer");
      if (await isRateLimited(req, key)) {
        return json({ error: "Trop de requetes." }, 429);
      }
      if (!(await isServiceCaller(req, supabaseAdmin))) {
        return json({ error: "Non autorisé : accès backend uniquement" }, 401);
      }

      const { data: run } = await supabaseAdmin
        .from("merch_runs")
        .insert({ status: "running", stats: {} })
        .select("id")
        .single();
      runId = run?.id || null;

      // ── 1. Produits éligibles (filtres durs centralisés) ──
      const { data: products, error: prodError } = await supabaseAdmin
        .from("products")
        .select(
          "id, is_active, in_stock, affiliate_mode, price, deal_active, deal_price, deal_ends_at, ratings_score, ratings_count, created_at, stock_quantity",
        );
      if (prodError) throw prodError;
      const eligible = (products || []).filter(
        (p: any) => p.is_active && p.in_stock !== false && !p.affiliate_mode,
      );

      // ── 2. Ventes (table pré-calculée, pas de recalcul maison) ──
      const { data: stats } = await supabaseAdmin
        .from("product_sales_stats")
        .select("product_id, total_bought, bought_last_month");
      const sales = new Map(
        (stats || []).map((s: any) => [
          s.product_id,
          {
            month: Number(s.bought_last_month) || 0,
            total: Number(s.total_bought) || 0,
          },
        ]),
      );

      // ── 3. Engagement 30j (borné, jamais lu en direct au rendu) ──
      const since = new Date(
        Date.now() - ENGAGEMENT_WINDOW_DAYS * 86400000,
      ).toISOString();
      const { data: events } = await supabaseAdmin
        .from("engagement_events")
        .select("entity_type, entity_id, event_type, context")
        .gte("created_at", since)
        .limit(50000);
      const attention = new Map<string, number>();
      const searchCounts = new Map<string, number>();
      const EVENT_W = { product_click: 1, favourite: 2, add_to_cart: 3 } as Record<string, number>;
      for (const e of events || []) {
        if (e.entity_type === "product" && EVENT_W[e.event_type]) {
          attention.set(
            e.entity_id,
            (attention.get(e.entity_id) || 0) + EVENT_W[e.event_type],
          );
        }
        if (e.event_type === "search") {
          const q = String((e.context as any)?.query || "")
            .toLowerCase()
            .trim()
            .slice(0, 40);
          // Hygiène (#6) : jamais d'email ni de terme à 1 caractère
          if (q.length >= 2 && !q.includes("@")) {
            searchCounts.set(q, (searchCounts.get(q) || 0) + 1);
          }
        }
      }

      // ── 4. Normalisations 0-1 ──
      const now = Date.now();
      const normPop = minMax(eligible.map((p: any) => sales.get(p.id)?.month || 0));
      const normAtt = minMax(eligible.map((p: any) => attention.get(p.id) || 0));
      const rated = eligible.filter((p: any) => (p.ratings_count || 0) > 0);
      const globalMean =
        rated.length > 0
          ? rated.reduce((s: number, p: any) => s + Number(p.ratings_score || 0), 0) / rated.length
          : 4.0;
      const normFresh = (p: any) => {
        const ageDays = Math.max(
          0,
          (now - new Date(p.created_at).getTime()) / 86400000,
        );
        return Math.exp(-ageDays / FRESHNESS_HALF_LIFE_DAYS);
      };
      const bayes = (p: any) => {
        const v = Number(p.ratings_count) || 0;
        const r = Number(p.ratings_score) || 0;
        return (v / (v + BAYES_M)) * r + (BAYES_M / (v + BAYES_M)) * globalMean;
      };
      const normQual = minMax(eligible.map(bayes));
      const discountOf = (p: any) => {
        if (!p.deal_active || p.deal_price == null) return 0;
        if (p.deal_ends_at && new Date(p.deal_ends_at).getTime() <= now) return 0;
        const price = Number(p.price) || 0;
        const deal = Number(p.deal_price) || 0;
        if (price <= 0 || deal >= price) return 0;
        return (price - deal) / price;
      };
      const normDisc = minMax(eligible.map(discountOf));

      // ── 5. Poids (config admin, clés whitelistées, clamp 0..1) ──
      const { data: configs } = await supabaseAdmin
        .from("merch_config")
        .select("section, weights");
      const cfgW = new Map((configs || []).map((c: any) => [c.section, c.weights || {}]));
      const weightsFor = (section: string) => {
        const base = { ...(DEFAULT_WEIGHTS[section] || DEFAULT_WEIGHTS.catalog) };
        const over = cfgW.get(section) || {};
        for (const k of WEIGHT_KEYS) {
          const v = Number((over as any)[k]);
          if (Number.isFinite(v)) base[k] = Math.min(1, Math.max(0, v));
        }
        return base;
      };

      // ── 6. Scores + upsert ──
      const rows: any[] = [];
      const topBySection: Record<string, string[]> = {};
      for (const section of SCORE_SECTIONS) {
        const w = weightsFor(section);
        const scored = eligible
          .map((p: any) => {
            const pop = normPop(sales.get(p.id)?.month || 0);
            const att = normAtt(attention.get(p.id) || 0);
            const qual = normQual(bayes(p));
            const fresh = normFresh(p);
            const disc = normDisc(discountOf(p));
            const score =
              w.popularity * pop +
              w.attention * att +
              w.quality * qual +
              w.freshness * fresh +
              w.discount * disc;
            return { id: p.id, score };
          })
          .sort((a, b) => b.score - a.score);
        topBySection[section] = scored.slice(0, 5).map((s) => s.id);
        const ts = new Date().toISOString();
        for (const s of scored) {
          rows.push({
            section,
            product_id: s.id,
            score: Number(s.score.toFixed(4)),
            computed_at: ts,
          });
        }
      }
      // Upsert par paquets (lignes PK section+product_id)
      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabaseAdmin
          .from("product_scores")
          .upsert(rows.slice(i, i + 500), { onConflict: "section,product_id" });
        if (error) throw error;
      }

      // ── 7. Tendances recherche (top 20, upsert + élagage) ──
      const topTerms = [...searchCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
      for (const [term, hits] of topTerms) {
        await supabaseAdmin
          .from("search_trends")
          .upsert(
            { term, hits, updated_at: new Date().toISOString() },
            { onConflict: "term" },
          );
      }

      // ── 8. Rétention : purge événements >90j ──
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000).toISOString();
      await supabaseAdmin.from("engagement_events").delete().lt("created_at", cutoff);

      const finishedAt = new Date().toISOString();
      const summary = {
        products: eligible.length,
        events_30d: (events || []).length,
        scores_written: rows.length,
        search_terms: topTerms.length,
        top5_hero_suggest: topBySection.catalog.slice(0, 5),
        duration_ms: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
      };
      if (runId) {
        await supabaseAdmin
          .from("merch_runs")
          .update({ status: "ok", finished_at: finishedAt, stats: summary })
          .eq("id", runId);
      }
      return json({ success: true, ...summary });
    } catch (e) {
      console.error("merch-scorer fatal:", logSafe(String(e)));
      if (runId) {
        try {
          const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            { auth: { autoRefreshToken: false, persistSession: false } },
          );
          await supabaseAdmin
            .from("merch_runs")
            .update({
              status: "error",
              finished_at: new Date().toISOString(),
              stats: { error: logSafe(String(e)) },
            })
            .eq("id", runId);
        } catch {
          // ignore
        }
      }
      return json({ error: "Erreur interne. Réessayez plus tard." }, 500);
    }
  },
};
