// supabase/functions/auth-welcome/index.ts
// @ts-nocheck
// Email de bienvenue après inscription — via Resend, sans config dashboard.
//
// Le front appelle cette fonction après un signup réussi (avec session).
// L'edge vérifie en service_role que l'email correspond à un compte créé
// récemment (anti relais-spam), puis envoie le mail de bienvenue via Resend.
//
// Protections : rate limit 3/min par IP, payload ≤100KB, email whitelist,
// compte récent (<30 min) exigé. Destinataire = l'inscrit uniquement.

import { Resend } from "npm:resend@3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { isValidEmail, isPayloadTooLarge } from "./_shared/validators.ts";
import { logSafe } from "./_shared/logSafe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Fenêtre anti-spam : le compte doit avoir été créé il y a moins de 30 min
const MAX_ACCOUNT_AGE_MS = 30 * 60 * 1000;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
      return json({ error: "Méthode non autorisée" }, 405);
    }

    try {
      const path = "auth-welcome";
      const key = rateLimitKey(req, path);
      if (await isRateLimited(req, key)) {
        return json(
          { error: "Trop de requêtes. Réessayez dans une minute." },
          429,
          { "Retry-After": "60" },
        );
      }

      const rawBody = await req.text();
      if (isPayloadTooLarge(rawBody)) {
        return json({ error: "Payload trop volumineux" }, 413);
      }
      let body: any = {};
      try {
        body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return json({ error: "Payload JSON invalide" }, 400);
      }

      const email = typeof body.email === "string" ? body.email.trim() : "";
      const name =
        typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
      if (!isValidEmail(email)) {
        return json({ error: "Invalid email address" }, 400);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // Anti relais-spam : seul un compte créé récemment reçoit le mail
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("id, email, name, registration_date")
        .eq("email", email)
        .maybeSingle();
      const age = customer?.registration_date
        ? Date.now() - new Date(customer.registration_date).getTime()
        : Infinity;
      if (!customer || age > MAX_ACCOUNT_AGE_MS) {
        return json({ error: "No recent registration for this email" }, 400);
      }

      const displayName = name || customer.name || email;

      // Notification admin (compteur + badge) — ici plutôt que dans le front
      // car l'insert direct échoue en RLS 403 pour un compte frais.
      const { error: notifError } = await supabaseAdmin
        .from("notifications")
        .insert({
          title: "New customer registered",
          description: `"${displayName}" signed up on the store`,
          category: "customers",
          priority: "low",
          status: "unread",
          timestamp: new Date().toISOString(),
          metadata: {
            customerId: customer.id,
            customerName: displayName,
            linkTo: "/admin/customers",
            source: "auth-welcome",
          },
          action_label: "View profile",
        });
      if (notifError) {
        console.error("auth-welcome notification:", logSafe(notifError));
      }

      const safeName = escapeHtml(displayName);
      const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
      const { data: mailData, error: mailError } = await resend.emails.send({
        from: Deno.env.get("RESEND_FROM_EMAIL")!,
        to: [email],
        subject: "Welcome to InstaWear 🎉",
        html:
          `<div style="font-family:sans-serif;max-width:600px">` +
          `<h2>Welcome, ${safeName}!</h2>` +
          `<p>Your InstaWear account is ready. Wear the energy of every event — festival tees, sport hoodies and more, printed on demand.</p>` +
          `<p><a href="https://instawear.vercel.app/" style="display:inline-block;background:#ff5c35;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Start shopping</a></p>` +
          `<p style="color:#888;font-size:12px">You received this email because you just created an account on InstaWear.</p>` +
          `</div>`,
      });
      if (mailError) {
        // Ne jamais faire échouer l'inscription : compte + notif admin OK.
        // Le front ignore ce flag (fire-and-forget) ; voir logs pour Resend.
        console.error("auth-welcome resend:", logSafe(mailError));
        return json({
          success: true,
          mailSent: false,
          mailError: logSafe(mailError),
        });
      }

      console.log("auth-welcome mail sent:", (mailData as any)?.id || "ok");
      return json({ success: true, mailSent: true });
    } catch (e) {
      console.error("auth-welcome fatal:", logSafe(String(e)));
      return json({ error: "Erreur interne. Réessayez plus tard." }, 500);
    }
  },
};
