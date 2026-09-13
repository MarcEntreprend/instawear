// supabase/functions/interaction-notify/index.ts

// @ts-nocheck
// Notifie l'admin d'un ticket créé depuis le compte client (AccountPage) :
// le ticket existe déjà (créé côté front), il manquait notif + telegram +
// email admin (le formulaire /contact via contact-message les a, le compte
// non — incohérence corrigée ici, même niveau d'alerte : urgent).
//
// Contrat :
//   POST { interactionId } + JWT client (propriétaire du ticket).
//   - Ownership serveur : interaction.customer_id == auth.user.id OU
//     interaction.customer_email == auth email. Sinon 403 (404 si absent :
//     pas de leak d'existence croisée). Aucun pouvoir admin accordé.
//   - Déduplication 30 min par interactionId (double-clic, retry).
//   - Notif admin (interactions, urgent) + telegram court + email admin
//     Resend (même résolution que contact-message). Best-effort isolés.
//
// Protections : rate limit 10/min par IP, payload ≤100KB, JWT exigé.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { isPayloadTooLarge } from "./_shared/validators.ts";
import { logSafe } from "./_shared/logSafe.ts";
import { sendTelegramNotice } from "./_shared/telegramNotify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
      if (await isRateLimited(req, rateLimitKey(req, "interaction-notify"))) {
        return json({ error: "Trop de requêtes." }, 429);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // ── Auth : service_role (interne) OU JWT client ──
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const apikeyHeader = req.headers.get("apikey") || "";
      const internal = apikeyHeader === serviceRoleKey;
      let callerId: string | null = null;
      let callerEmail: string | null = null;
      if (!internal) {
        const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
        if (!token) return json({ error: "Unauthorized" }, 401);
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.getUser(token);
        if (userError || !userData?.user) return json({ error: "Invalid session" }, 401);
        callerId = userData.user.id;
        callerEmail = (userData.user.email || "").toLowerCase() || null;
      }

      let body: any = {};
      try {
        const raw = await req.text();
        if (isPayloadTooLarge(raw)) return json({ error: "Payload trop volumineux" }, 413);
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return json({ error: "Invalid JSON payload" }, 400);
      }
      const interactionId =
        typeof body.interactionId === "string" ? body.interactionId.trim().slice(0, 64) : "";
      if (!interactionId) return json({ error: "interactionId requis" }, 400);

      const { data: inter } = await supabaseAdmin
        .from("interactions")
        .select("*")
        .eq("id", interactionId)
        .maybeSingle();
      if (!inter) return json({ error: "Ticket introuvable" }, 404);

      // Ownership : le ticket appartient à l'appelant (id ou email).
      if (!internal) {
        const ownerId = (inter as any).customer_id
          ? String((inter as any).customer_id)
          : null;
        const ownerEmail = ((inter as any).customer_email || "").toLowerCase() || null;
        if (ownerId !== callerId && ownerEmail !== callerEmail) {
          return json({ error: "Forbidden" }, 403);
        }
      }

      // Déduplication 30 min (double-clic, retry réseau).
      try {
        const since = new Date(Date.now() - 30 * 60000).toISOString();
        const { data: recent } = await supabaseAdmin
          .from("notifications")
          .select("metadata")
          .eq("category", "interactions")
          .gte("created_at", since)
          .limit(50);
        const dup = ((recent || []) as any[]).some(
          (n) => n?.metadata?.interactionId === interactionId,
        );
        if (dup) return json({ ok: true, notified: false, deduped: true });
      } catch {
        // Doute → on notifie (mieux qu'un silence).
      }

      const email = String((inter as any).customer_email || "");
      const subject = String((inter as any).subject || "Demande support");
      const type = String((inter as any).type || "question");
      const orderId = (inter as any)?.metadata?.orderId || null;

      // 1. Notif admin (même form que /contact : urgente).
      try {
        await supabaseAdmin.from("notifications").insert({
          title: `Nouveau message — compte client (${type})`,
          description: `"${email}" : ${subject}`.slice(0, 200),
          category: "interactions",
          priority: "urgent",
          status: "unread",
          timestamp: new Date().toISOString(),
          metadata: {
            interactionId,
            customerEmail: email,
            orderId,
            linkTo: "/admin/interactions",
            source: "account-page",
          },
          action_label: "Voir le message",
        });
      } catch (e) {
        console.warn("interaction-notify notif:", logSafe(e));
      }

      // 2. Telegram court (best-effort).
      try {
        await sendTelegramNotice(
          Deno.env.get("TELEGRAM_BOT_TOKEN") || "",
          Deno.env.get("TELEGRAM_CHAT_ID") || "",
          {
            category: "interactions",
            title: `Nouveau message — compte client (${type})`,
            description: `"${email}" : ${subject}${orderId ? ` [${orderId}]` : ""}`.slice(0, 200),
            priority: "urgent",
          },
        );
      } catch (e) {
        console.warn("interaction-notify telegram:", logSafe(e));
      }

      // 3. Email admin Resend (même résolution que contact-message).
      let adminEmail: string | null = Deno.env.get("CONTACT_NOTIFY_EMAIL") || null;
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
      if (adminEmail) {
        try {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")!}`,
            },
            body: JSON.stringify({
              from: Deno.env.get("RESEND_FROM_EMAIL")!,
              to: [adminEmail],
              reply_to: email || undefined,
              subject: `[Support compte] ${email} — ${subject}`.slice(0, 120),
              html:
                `<div style="font-family:sans-serif;max-width:600px">` +
                `<h2>Nouveau ticket — compte client</h2>` +
                `<p><b>De :</b> ${escapeHtml(email)} (${escapeHtml(type)})</p>` +
                (orderId ? `<p><b>Commande :</b> ${escapeHtml(orderId)}</p>` : "") +
                `<p><b>Sujet :</b> ${escapeHtml(subject)}</p>` +
                `<hr><p style="color:#888;font-size:12px">Ticket <b>${escapeHtml(interactionId)}</b> — voir Admin → Interactions.</p></div>`,
            }),
          });
        } catch (e) {
          console.warn("interaction-notify resend:", logSafe(e));
        }
      }

      return json({ ok: true, notified: true });
    } catch (e) {
      console.error("interaction-notify fatal:", logSafe(String(e)));
      return json({ error: "Erreur interne. Réessayez plus tard." }, 500);
    }
  },
};
