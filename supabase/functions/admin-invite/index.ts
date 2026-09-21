// supabase/functions/admin-invite/index.ts
// Invitation d'un nouvel administrateur : crée la ligne admin_users ET
// envoie l'invitation Auth (l'invité pose son mot de passe lui-même).
// AUCUN mot de passe ne transite ici (ni en entrée, ni en log).
//
// Gate : super_admin uniquement (JWT vérifié + lookup admin_users, même
// pattern que sync-printful). 401 sans session, 403 si non super_admin
// (403 et non 404 : l'existence de l'endpoint admin est déjà connue des
// admins connectés ; les anonymes tombent en 401 avant).
// Rate limit : quota par défaut (20/min) — invitations rares, surface
// d'abus = compte admin compromis uniquement.
// SMTP : invitations via Supabase Auth (SMTP partagé par défaut, custom
// Resend optionnel) — aucun secret mail ici.
// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logSafe } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { validateInvite } from "./_shared/validate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Méthode non autorisée." }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      if (await isRateLimited(req, rateLimitKey(req, "admin-invite"))) {
        return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
        });
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // ── Gate super_admin ──────────────────────────────────────────
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Non autorisé." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.getUser(token);
      const callerEmail = userData?.user?.email?.toLowerCase() || "";
      if (userError || !callerEmail) {
        return new Response(JSON.stringify({ error: "Session invalide." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: callerRow } = await supabaseAdmin
        .from("admin_users")
        .select("role")
        .ilike("email", callerEmail)
        .maybeSingle();
      if (!callerRow || callerRow.role !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Réservé aux super-administrateurs." }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ── Validation entrée (whitelist stricte, jamais de rôle libre) ──
      const body = await req.json().catch(() => ({}));
      const invite = validateInvite(body);
      if (!invite) {
        return new Response(
          JSON.stringify({ error: "Email ou rôle invalide." }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (invite.email === callerEmail) {
        return new Response(
          JSON.stringify({ error: "Vous êtes déjà administrateur." }),
          {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ── Ligne admin d'abord (idempotente : email UNIQUE) ───────────
      // Si la ligne existe déjà, on réinvite seulement (pas d'écrasement
      // silencieux du rôle existant).
      const { data: existing } = await supabaseAdmin
        .from("admin_users")
        .select("id, role")
        .ilike("email", invite.email)
        .maybeSingle();
      let adminId: string;
      if (existing) {
        adminId = existing.id;
      } else {
        const { data: inserted, error: insErr } = await supabaseAdmin
          .from("admin_users")
          .insert({ email: invite.email, role: invite.role })
          .select("id")
          .maybeSingle();
        if (insErr || !inserted) {
          console.error(logSafe(`admin-invite insert: ${insErr?.message || "?"}`));
          return new Response(
            JSON.stringify({ error: "Création impossible." }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        adminId = inserted.id;
      }

      // ── Invitation Auth (l'invité pose son mot de passe lui-même) ───
      const { error: invErr } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(invite.email);
      if (invErr) {
        // Ligne conservée : un réessai renverra l'invitation (pas de
        // suppression : on ne détruit jamais une ligne sur un échec mail).
        console.error(logSafe(`admin-invite email: ${invErr.message}`));
        return new Response(
          JSON.stringify({
            ok: true,
            adminId,
            invited: false,
            warning:
              "Ligne créée, mais l'email d'invitation n'est pas parti. Réessayez (l'invitation sera renvoyée).",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ ok: true, adminId, invited: true, role: existing?.role ?? invite.role }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (e: any) {
      console.error(logSafe(`admin-invite fatal: ${e?.message || e}`));
      return new Response(JSON.stringify({ error: "Erreur inconnue." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
