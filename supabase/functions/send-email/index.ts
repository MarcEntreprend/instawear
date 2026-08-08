// supabase/functions/send-email/index.ts

// @ts-nocheck
// Envoi d'emails transactionnels via Resend — BACKEND-ONLY.
//
// Accès autorisés :
//   1. Appels internes (webhooks / autres Edge Functions) avec la clé
//      service_role dans le header `apikey`.
//   2. Utilisateur authentifié avec le rôle admin (JWT dans Authorization).
// La clé anon publique n'est plus acceptée : le frontend ne peut plus
// utiliser cette fonction comme relais de spam.

import { Resend } from "npm:resend@3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Rate limiting simple (en mémoire, par IP) ──────────────────────────
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(req: Request): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

async function isAdminCaller(req: Request): Promise<boolean> {
  // Appel interne avec la clé service_role
  const apikeyHeader = req.headers.get("apikey") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (apikeyHeader && apikeyHeader === serviceRoleKey) return true;

  // Sinon, exiger un JWT admin valide
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return false;

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) return false;

  const { data: adminRow } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("email", userData.user.email)
    .maybeSingle();
  return !!adminRow;
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS")
      return new Response("ok", { headers: corsHeaders });

    if (rateLimited(req)) {
      return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    if (!(await isAdminCaller(req))) {
      return new Response(
        JSON.stringify({ error: "Non autorisé : accès backend uniquement" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { to, subject, html } = await req.json().catch(() => ({}));
    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "to, subject, html requis" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data, error } = await resend.emails.send({
      from: Deno.env.get("RESEND_FROM_EMAIL")!,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  },
};
