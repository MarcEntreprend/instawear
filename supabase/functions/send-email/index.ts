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
