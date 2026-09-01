// supabase/functions/health/index.ts
// P-G inventory: healthcheck protégé is_admin() (non-public, évite fuite topologie)
// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logSafe } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";

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
      return new Response(
        JSON.stringify({
          status: "ok",
          service: "instawear-pod",
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
