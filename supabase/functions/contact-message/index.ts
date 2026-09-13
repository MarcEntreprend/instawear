// supabase/functions/contact-message/index.ts
// @ts-nocheck
// Formulaire de contact public (/contact) — BACKEND foreseeable spam-safe.
//
// Rôle : recevoir les messages du formulaire public, les stocker comme
// ticket `interactions` (file admin existante) via service_role (contourne
// le RLS qui bloque les inserts anon/auth directs), vérifier si l'email est
// un client inscrit, et notifier l'admin par email via Resend.
//
// Protections : rate limit 5/min par IP, payload ≤100KB, email whitelist,
// message 10..5000 chars. Pas de relais arbitraire : destinataire admin
// uniquement (admin_users super_admin, sinon CONTACT_NOTIFY_EMAIL).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { isValidEmail, isPayloadTooLarge } from "./_shared/validators.ts";
import { logSafe } from "./_shared/logSafe.ts";
import { notifyAdmin } from "./_shared/notifyAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MIN_MSG = 10;
const MAX_MSG = 5000;

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
      const path = "contact-message";
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
      const message =
        typeof body.message === "string" ? body.message.trim() : "";
      if (!isValidEmail(email)) {
        return json({ error: "Invalid email address" }, 400);
      }
      if (message.length < MIN_MSG || message.length > MAX_MSG) {
        return json(
          {
            error: `Le message doit contenir entre ${MIN_MSG} et ${MAX_MSG} caractères`,
          },
          400,
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // 1. Client inscrit ?
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("id, email, name")
        .eq("email", email)
        .maybeSingle();

      // 2. Ticket support (file admin existante)
      const subjectBase =
        message.length > 60 ? message.slice(0, 60) + "…" : message;
      // customer_id : UUID si client connu, sinon email (text, comme le
      // front), avec repli NULL si le schéma refuse la chaîne (FK/uuid —
      // le display admin n'utilise que name/email, jamais customer_id).
      // Chaque tentative est loggée avec son code PG pour diagnostic.
      let inter: any = null;
      {
        const base: Record<string, unknown> = {
          customer_name: customer?.name || email,
          customer_email: email,
          type: "question",
          status: "open",
          subject: `Contact — ${subjectBase}`,
          last_message: message,
          metadata: { source: "contact-page", registered_user: !!customer },
        };
        const first = await supabaseAdmin
          .from("interactions")
          .insert({ ...base, customer_id: customer?.id || email })
          .select()
          .single();
        if (!first.error && first.data) {
          inter = first.data;
        } else {
          console.error(
            "contact-message ticket(email-id):",
            logSafe({ code: (first.error as any)?.code, message: (first.error as any)?.message }),
          );
          if (!customer) {
            const second = await supabaseAdmin
              .from("interactions")
              .insert({ ...base, customer_id: null })
              .select()
              .single();
            if (!second.error && second.data) {
              inter = second.data;
            } else {
              console.error(
                "contact-message ticket(null-id):",
                logSafe({ code: (second.error as any)?.code, message: (second.error as any)?.message }),
              );
            }
          }
        }
      }
      if (!inter) {
        return json(
          { error: "Envoi impossible pour le moment. Réessayez plus tard.", code: "TICKET_FAILED" },
          500,
        );
      }

      const { error: msgError } = await supabaseAdmin
        .from("interaction_messages")
        .insert({
          interaction_id: inter.id,
          from_field: "customer",
          text: message,
        });
      if (msgError) {
        console.error("contact-message first message:", logSafe(msgError));
      }

      // 3+4+5. Trio admin (remplace notif + telegram + email direct) :
      // cloche + telegram court + email RICHE (corps du message + reply_to
      // pour répondre à l'expéditeur). Destinataire pinné ADMIN_NOTIFY_EMAIL
      // (l'ancienne chaîne CONTACT_NOTIFY_EMAIL → super_admin → 1er admin
      // est abandonnée : fallback silencieux = emails fantômes).
      // Ne fait jamais échouer le ticket.
      let mailSent = false;
      let mailErrorMsg: string | null = null;
      {
        const safeEmail = escapeHtml(email);
        const safeMsg = escapeHtml(message).replace(/\n/g, "<br>");
        const userLine = customer
          ? `✅ <b>Client inscrit</b> (${escapeHtml(customer.name || customer.email)})`
          : `⚪ <b>Non inscrit</b> (pas de compte avec cet email)`;
        const result = await notifyAdmin(
          {
            supabaseAdmin,
            supabaseUrl: Deno.env.get("SUPABASE_URL")!,
            serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            resendApiKey: Deno.env.get("RESEND_API_KEY")!,
            resendFrom: Deno.env.get("RESEND_FROM_EMAIL")!,
            adminEmail: Deno.env.get("ADMIN_NOTIFY_EMAIL") || "",
          },
          {
            title: "Nouveau message — /contact",
            description: `"${email}" : ${subjectBase}`,
            category: "interactions",
            priority: "urgent",
            linkTo: "/admin/interactions",
            metadata: {
              interactionId: inter.id,
              customerEmail: email,
              registeredUser: !!customer,
              source: "contact-page",
            },
            actionLabel: "Voir le message",
            replyTo: email,
            emailSubject: `[Contact InstaWear] ${email}`,
            emailHtml:
              `<div style="font-family:sans-serif;max-width:600px">` +
              `<h2>Nouveau message — /contact</h2>` +
              `<p><b>De :</b> ${safeEmail}</p>` +
              `<p><b>Profil :</b> ${userLine}</p>` +
              `<hr>` +
              `<p>${safeMsg}</p>` +
              `<hr>` +
              `<p style="color:#888;font-size:12px">Ticket <b>${inter.id}</b> — voir Admin → Interactions. Répondez directement à cet email pour répondre à l'expéditeur.</p>` +
              `</div>`,
          },
        );
        mailSent = result.email;
        if (!result.email) mailErrorMsg = "email admin non remis (voir logs edge)";
        if (!result.inApp) mailErrorMsg = (mailErrorMsg ? mailErrorMsg + " " : "") + "cloche non créée";
      }

      return json({ success: true, mailSent, mailError: mailErrorMsg });
    } catch (e) {
      console.error("contact-message fatal:", logSafe(String(e)));
      return json({ error: "Erreur interne. Réessayez plus tard." }, 500);
    }
  },
};
