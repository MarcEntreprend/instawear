// supabase/functions/admin-order-notify/index.ts
// @ts-nocheck
// Doublon email de la notif Telegram commande (admin uniquement).
//
// Rôle : après une commande (test admin le plus souvent), envoyer le même
// récapitulatif par email à l'admin via Resend + insérer une notification
// "Nouvelle commande" (cloche admin, badge onglet).
//
// Protections : JWT admin vérifié (admin_users) ou service_role ;
// rate limit 10/min par IP ; payload ≤100KB ; validation stricte du body
// (tailles, quantités, prix, email) ; HTML échappé ; logs sanitizés.
// N'échoue jamais côté appelant : le front l'appelle en fire-and-forget.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { isPayloadTooLarge } from "./_shared/validators.ts";
import { logSafe } from "./_shared/logSafe.ts";
import {
  validateNotifyBody,
  buildAdminOrderHtml,
} from "./_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    try {
      const path = "admin-order-notify";
      const key = rateLimitKey(req, path);
      if (await isRateLimited(req, key)) {
        return json(
          { error: "Too many requests. Please try again in a minute." },
          429,
          { "Retry-After": "60" },
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // ── Gate admin (même pattern que sync-printful) ──
      const apikeyHeader = req.headers.get("apikey") || "";
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      if (apikeyHeader !== serviceRoleKey) {
        if (!token) {
          return json({ error: "Unauthorized" }, 401);
        }
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.getUser(token);
        if (userError || !userData?.user) {
          return json({ error: "Invalid session" }, 401);
        }
        const { data: adminRow } = await supabaseAdmin
          .from("admin_users")
          .select("id")
          .eq("email", userData.user.email)
          .maybeSingle();
        if (!adminRow) {
          return json({ error: "Admin access required" }, 403);
        }
      }

      const rawBody = await req.text();
      if (isPayloadTooLarge(rawBody)) {
        return json({ error: "Payload too large" }, 413);
      }
      let body: any = {};
      try {
        body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return json({ error: "Invalid JSON payload" }, 400);
      }
      const validated = validateNotifyBody(body);
      if ("error" in validated) {
        return json({ error: validated.error }, 400);
      }
      const order = validated.order;

      // ── Destinataire admin : env explicite, sinon super_admin, sinon 1er admin ──
      let adminEmail: string | null =
        Deno.env.get("ADMIN_NOTIFY_EMAIL") || null;
      if (!adminEmail) {
        const { data: superAdmin } = await supabaseAdmin
          .from("admin_users")
          .select("email")
          .eq("role", "super_admin")
          .limit(1)
          .maybeSingle();
        adminEmail = (superAdmin as any)?.email || null;
      }
      if (!adminEmail) {
        const { data: anyAdmin } = await supabaseAdmin
          .from("admin_users")
          .select("email")
          .limit(1)
          .maybeSingle();
        adminEmail = (anyAdmin as any)?.email || null;
      }
      if (!adminEmail) {
        return json({ error: "No admin email configured" }, 500);
      }

      // ── Email via Resend direct (jamais de SDK, jamais de relais arbitraire :
      // destinataire = admin résolu serveur uniquement) ──
      let emailed = false;
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")!}`,
          },
          body: JSON.stringify({
            from: Deno.env.get("RESEND_FROM_EMAIL")!,
            to: [adminEmail],
            subject: `🛍️ New order ${order.orderId} — ${order.total.toFixed(2)} ${order.currency}`,
            html: buildAdminOrderHtml(order),
          }),
        });
        emailed = res.ok;
        if (!res.ok) {
          console.error("admin-order-notify resend:", logSafe(await res.text()));
        }
      } catch (e) {
        console.error("admin-order-notify resend:", logSafe(e));
      }

      // ── Notification in-app (cloche + badge, best-effort) ──
      let notified = false;
      try {
        const { error: notifError } = await supabaseAdmin
          .from("notifications")
          .insert({
            title: `New order — ${order.orderId}`,
            description: `${order.name || order.email} · ${order.total.toFixed(2)} ${order.currency} · ${order.items.length} item(s)`.slice(0, 300),
            category: "orders",
            priority: "high",
            status: "unread",
            timestamp: new Date().toISOString(),
            metadata: { orderId: order.orderId, linkTo: "/admin/orders", source: "admin-order-notify" },
            action_label: "Voir la commande",
          });
        notified = !notifError;
        if (notifError) {
          console.error("admin-order-notify notification:", logSafe(notifError));
        }
      } catch (e) {
        console.error("admin-order-notify notification:", logSafe(e));
      }

      return json({ ok: true, emailed, notified });
    } catch (e) {
      console.error("admin-order-notify fatal:", logSafe(e));
      return json({ error: "Notification failed. Please try again later." }, 500);
    }
  },
};
