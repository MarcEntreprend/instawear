// supabase/functions/printful-reports/index.ts
// @ts-nocheck
// Rapports Printful (GET /reports/statistics) avec cache local 12h.
// Les endpoints earnings/sales n'existent pas dans cette version de l'API ;
// on utilise report_types=profit,printful_costs,sales_and_costs_summary,
// total_paid_orders (période max 6 mois imposée par Printful).
// Actions (POST JSON) :
//   { action: "get", date_from, date_to, currency? }     -> snapshot frais ou cache
//   { action: "refresh", date_from, date_to, currency? } -> force Printful + snapshot
// Auth : service_role (interne) OU admin JWT — page Reports admin uniquement.
// Le snapshot vit dans printful_report_snapshots (migration 20261017).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logSafe } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { fetchWithRetry, reportError } from "./_shared/opsUtils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const REPORT_TYPES = "profit,printful_costs,sales_and_costs_summary,total_paid_orders";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

// Normalise result.store_statistics[0] vers notre forme stable.
function normalizeStatistics(result: any, from: string, to: string) {
  const store = (result?.store_statistics || [])[0] || {};
  const summary = Array.isArray(store.sales_and_costs_summary)
    ? store.sales_and_costs_summary
    : [];
  const totalRow = summary.find((r: any) => r?.date === "Total") || {};
  const daily = summary
    .filter((r: any) => r && r.date !== "Total")
    .map((r: any) => ({
      date: String(r.date || ""),
      order_count: num(r.order_count) ?? 0,
      costs: num(r.costs) ?? 0,
      profit: num(r.profit) ?? 0,
    }));
  return {
    currency: store.currency || "USD",
    period: { from, to },
    totals: {
      profit: num(totalRow.profit) ?? num(store.profit?.value),
      printful_costs:
        num(totalRow.costs) ?? num(store.printful_costs?.value),
      paid_orders: num(store.total_paid_orders?.value),
      order_count: num(totalRow.order_count),
    },
    deltas: {
      profit: num(store.profit?.relative_difference),
      printful_costs: num(store.printful_costs?.relative_difference),
      paid_orders: num(store.total_paid_orders?.relative_difference),
    },
    daily,
  };
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (await isRateLimited(req, rateLimitKey(req, "printful-reports"))) {
      return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        status: 429,
      });
    }

    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // ── Auth : service_role OU admin JWT ──────────────────────────
      const apikeyHeader = req.headers.get("apikey") || "";
      const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      if (apikeyHeader !== serviceRoleKey) {
        if (!token) {
          return new Response(JSON.stringify({ error: "Non autorisé" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.getUser(token);
        if (userError || !userData?.user) {
          return new Response(JSON.stringify({ error: "Session invalide" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: adminRow } = await supabaseAdmin
          .from("admin_users")
          .select("id")
          .eq("email", userData.user.email)
          .maybeSingle();
        if (!adminRow) {
          return new Response(
            JSON.stringify({ error: "Accès administrateur requis" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      const rawBody = await req.text();
      if (rawBody.length > 50 * 1024) {
        return new Response(JSON.stringify({ error: "Payload trop volumineux" }), {
          status: 413,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      let body: any = {};
      try {
        body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return new Response(JSON.stringify({ error: "JSON invalide" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const action = String(body.action || "get");
      if (action !== "get" && action !== "refresh") {
        return new Response(JSON.stringify({ error: "action invalide (get|refresh)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const dateFrom = String(body.date_from || "");
      const dateTo = String(body.date_to || "");
      if (!DATE_RE.test(dateFrom) || !DATE_RE.test(dateTo)) {
        return new Response(JSON.stringify({ error: "date_from/date_to requis (YYYY-MM-DD)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (dateFrom > dateTo) {
        return new Response(JSON.stringify({ error: "date_from postérieure à date_to" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Printful : période max 6 mois (~183 jours).
      const days =
        (new Date(dateTo + "T00:00:00Z").getTime() -
          new Date(dateFrom + "T00:00:00Z").getTime()) /
        86400000;
      if (!Number.isFinite(days) || days < 0 || days > 183) {
        return new Response(
          JSON.stringify({ error: "Période max 6 mois (limite Printful)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const currencyParam = String(body.currency || "").toUpperCase().slice(0, 3) || null;
      // Devise : paramètre explicite > store_settings > USD. Résolue AVANT
      // la lecture du cache (clé du snapshot).
      let currency = "USD";
      if (currencyParam) {
        currency = currencyParam;
      } else {
        try {
          const { data: ss } = await supabaseAdmin
            .from("store_settings")
            .select("currency")
            .eq("id", true)
            .maybeSingle();
          if (ss?.currency) {
            currency = String(ss.currency).toUpperCase().slice(0, 3) || "USD";
          }
        } catch {}
      }

      // ── Snapshot frais ? (sauf refresh forcé) ─────────────────────
      if (action === "get") {
        try {
          const { data: snap } = await supabaseAdmin
            .from("printful_report_snapshots")
            .select("payload, fetched_at")
            .eq("period_start", dateFrom)
            .eq("period_end", dateTo)
            .eq("currency", currency)
            .maybeSingle();
          if (snap?.payload && Date.now() - new Date(snap.fetched_at).getTime() < CACHE_TTL_MS) {
            return new Response(
              JSON.stringify({ ...(snap.payload as any), cached: true, fetched_at: snap.fetched_at }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        } catch (e) {
          console.warn("snapshot read failed:", logSafe(e));
        }
      }

      // ── Appel Printful ────────────────────────────────────────────
      const { data: podSettings } = await supabaseAdmin
        .from("pod_settings")
        .select("api_key, store_id")
        .eq("id", "pod-main")
        .maybeSingle();
      const apiKey = (podSettings as any)?.api_key;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Printful non configuré" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Devise déjà résolue plus haut (paramètre > store_settings > USD).
      const pfHeaders: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
      };
      if ((podSettings as any)?.store_id) {
        pfHeaders["X-PF-Store-Id"] = String((podSettings as any).store_id);
      }
      const qs = new URLSearchParams({
        report_types: REPORT_TYPES,
        date_from: dateFrom,
        date_to: dateTo,
        currency,
      });
      let pfRes: Response | null;
      try {
        // GET idempotent : retry 429/5xx (gap 14).
        const r = await fetchWithRetry(
          `https://api.printful.com/reports/statistics?${qs.toString()}`,
          { headers: pfHeaders },
          { attempts: 3, baseMs: 600, idempotent: true },
        );
        pfRes = r.res;
        if (!pfRes) {
          await reportError(supabaseAdmin, {
            fn: "printful-reports",
            action: "statistics",
            error: r.error || "Printful injoignable",
            meta: { dateFrom, dateTo },
            severity: "medium",
          });
          return new Response(
            JSON.stringify({ error: `Printful injoignable: ${r.error}` }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (e: any) {
        return new Response(
          JSON.stringify({ error: `Printful injoignable: ${e?.message || e}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!pfRes.ok) {
        const t = await pfRes.text().catch(() => "");
        console.warn("Printful statistics error:", logSafe(t.slice(0, 500)));
        return new Response(
          JSON.stringify({ error: `Erreur Printful: ${t.slice(0, 300)}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const pfData = await pfRes.json().catch(() => null);
      const normalized = normalizeStatistics(pfData?.result, dateFrom, dateTo);
      const fetchedAt = new Date().toISOString();

      // ── Snapshot (upsert, best-effort) ────────────────────────────
      try {
        await supabaseAdmin.from("printful_report_snapshots").upsert(
          {
            period_start: dateFrom,
            period_end: dateTo,
            currency,
            payload: normalized,
            fetched_at: fetchedAt,
          },
          { onConflict: "period_start,period_end,currency" },
        );
      } catch (e) {
        console.warn("snapshot write failed:", logSafe(e));
      }

      return new Response(
        JSON.stringify({ ...normalized, cached: false, fetched_at: fetchedAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error?.message || "Erreur inconnue" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  },
};
