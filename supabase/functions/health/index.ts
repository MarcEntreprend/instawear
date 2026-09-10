// supabase/functions/health/index.ts
// P-G inventory: healthcheck protégé is_admin() (non-public, évite fuite topologie)
// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logSafe } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
// BISECT TEMP: import opsUtils neutralisé pour isoler le BOOT_ERROR.
// import { fetchWithRetry } from "./_shared/opsUtils.ts";
async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
): Promise<{ res: Response | null; error?: string }> {
  try {
    const res = await fetch(url, init);
    return { res };
  } catch (e: any) {
    return { res: null, error: e?.message || "network" };
  }
}

// Vérifie une dépendance avec timeout (jamais plus de ~8s par check pour
// rester sous la limite d'exécution de l'edge).
async function checkWithTimeout(
  name: string,
  fn: () => Promise<{ ok: boolean; detail?: string }>,
  timeoutMs = 8000,
): Promise<{ ok: boolean; detail?: string; ms: number }> {
  const started = Date.now();
  try {
    const r = await Promise.race([
      fn(),
      new Promise<{ ok: boolean; detail?: string }>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs),
      ),
    ]);
    return { ...r, ms: Date.now() - started };
  } catch (e: any) {
    return { ok: false, detail: e?.message || "échec", ms: Date.now() - started };
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      });
    }
    try {
      if (await isRateLimited(req, rateLimitKey(req, "health"))) {
        return new Response(JSON.stringify({ error: "Trop de requetes." }), {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "60" },
        });
      }
      const auth = req.headers.get("Authorization") || "";
      const token = auth.replace("Bearer ", "");
      const apikey = req.headers.get("apikey") || "";
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      let isAdmin = apikey === serviceRoleKey;
      if (!isAdmin && token) {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          serviceRoleKey,
        );
        const { data: userData } = await admin.auth.getUser(token);
        if (userData?.user) {
          const { data: row } = await admin
            .from("admin_users")
            .select("id")
            .eq("email", userData.user.email)
            .maybeSingle();
          isAdmin = !!row;
        }
      }
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin requis" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // ── Checks réels des dépendances (gap 17) ─────────────────────
      // database : lecture pod_settings (prouve Supabase + RLS service_role)
      // printful : GET /stores avec la clé pod-main (prouve token + réseau)
      // stripe   : lecture du solde (prouve clé secrète ; non configuré =
      //            "not_configured", pas une erreur).
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(supabaseUrl, serviceRoleKey);

      const database = await checkWithTimeout("database", async () => {
        const { error } = await admin
          .from("pod_settings")
          .select("id")
          .eq("id", "pod-main")
          .maybeSingle();
        if (error) return { ok: false, detail: error.message.slice(0, 200) };
        return { ok: true };
      });

      let printfulKey: string | null = null;
      let printfulStore: string | null = null;
      try {
        const { data: pod } = await admin
          .from("pod_settings")
          .select("api_key, store_id")
          .eq("id", "pod-main")
          .maybeSingle();
        printfulKey = (pod as any)?.api_key || null;
        printfulStore = (pod as any)?.store_id != null ? String((pod as any).store_id) : null;
      } catch (e) {
        console.warn("health pod_settings:", logSafe(e));
      }

      const printful = await checkWithTimeout("printful", async () => {
        if (!printfulKey) return { ok: false, detail: "clé Printful non configurée" };
        const headers: Record<string, string> = {
          Authorization: `Bearer ${printfulKey}`,
        };
        if (printfulStore) headers["X-PF-Store-Id"] = printfulStore;
        const { res, error } = await fetchWithRetry(
          "https://api.printful.com/stores",
          { headers },
          { attempts: 2, baseMs: 500, idempotent: true },
        );
        if (!res) return { ok: false, detail: error || "injoignable" };
        if (res.status === 401) return { ok: false, detail: "token invalide (401)" };
        if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
        return { ok: true };
      });

      const stripe = await checkWithTimeout("stripe", async () => {
        const key =
          Deno.env.get("STRIPE_SECRET_KEY_TEST") ||
          Deno.env.get("STRIPE_SECRET_KEY") ||
          "";
        if (!key) return { ok: false, detail: "not_configured" };
        const { res, error } = await fetchWithRetry(
          "https://api.stripe.com/v1/balance",
          {
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
          { attempts: 2, baseMs: 500, idempotent: true },
        );
        if (!res) return { ok: false, detail: error || "injoignable" };
        if (res.status === 401) {
          return { ok: false, detail: "clé invalide (401)" };
        }
        if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
        return { ok: true };
      });

      const checks = { database, printful, stripe };
      const allOk = database.ok && printful.ok && stripe.ok;

      return new Response(
        JSON.stringify({
          status: allOk ? "ok" : "degraded",
          service: "instawear-pod",
          checks,
          ts: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    } catch (e) {
      return new Response(JSON.stringify({ error: logSafe(String(e)) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
