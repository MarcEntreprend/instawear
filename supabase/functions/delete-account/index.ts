// supabase/functions/delete-account/index.ts
// Supprime définitivement le compte du client authentifié (customers + auth.users)

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";

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

    try {
      // G1 (audit) : rate-limit branché (quota 3/min déjà défini) —
      // destructif même si self-only, coût nul pour l'usage légitime (1 appel).
      if (await isRateLimited(req, rateLimitKey(req, "delete-account"))) {
        return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (!token) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // Valide le token et récupère l'utilisateur RÉEL derrière ce token
      // (empêche un client de supprimer le compte de quelqu'un d'autre)
      const { data: userData, error: userError } =
        await supabaseAdmin.auth.getUser(token);
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Session invalide" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = userData.user.id;

      // Garde-fou : un compte admin ne peut pas être supprimé par ce endpoint
      const { data: isAdminRow } = await supabaseAdmin
        .from("admin_users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (isAdminRow) {
        return new Response(
          JSON.stringify({
            error:
              "Les comptes administrateurs ne peuvent pas être supprimés ici.",
          }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ── Anonymisation (vie privée) AVANT suppression ──────────────────
      // Le compte et la ligne customers disparaissent, mais tickets,
      // messages, notifs et avis gardaient nom + email en clair ("définitif"
      // mensonger). On anonymise ; les commandes sont CONSERVÉES (pièces
      // comptables, pas de FK vers customers — vérifié). Chaque étape est
      // best-effort isolée : un échec n'empêche jamais la suppression.
      const userEmail = (userData.user.email || "").trim();
      const ANON_NAME = "Compte supprimé";
      const ANON_EMAIL = "deleted@deleted.local";
      const ANON_TEXT = "[Message supprimé — compte clôturé]";
      // NOTE SÉCURITÉ : jamais de filtre `.or()` avec l'email interpolé
      // (caractères spéciaux = injection PostgREST) — requêtes `.eq()`
      // séparées ci-dessous, valeurs passées en paramètres.
      const scrubInteractions = () =>
        Promise.all([
          supabaseAdmin
            .from("interactions")
            .update({ customer_name: ANON_NAME, customer_email: ANON_EMAIL })
            .eq("customer_id", userId),
          ...(userEmail
            ? [
                supabaseAdmin
                  .from("interactions")
                  .update({ customer_name: ANON_NAME, customer_email: ANON_EMAIL })
                  .eq("customer_email", userEmail),
              ]
            : []),
        ]);
      const ownedInteractionIds = async (): Promise<string[]> => {
        const [byId, byEmail] = await Promise.all([
          supabaseAdmin.from("interactions").select("id").eq("customer_id", userId),
          ...(userEmail
            ? [
                supabaseAdmin
                  .from("interactions")
                  .select("id")
                  .eq("customer_email", userEmail),
              ]
            : []),
        ]);
        const ids = new Set<string>();
        for (const r of [byId, byEmail]) {
          for (const row of ((r as any)?.data || []) as any[]) {
            if (row?.id) ids.add(String(row.id));
          }
        }
        return [...ids];
      };
      try {
        // Tickets : identité dissociée (historique support conservé).
        await scrubInteractions();
        // Messages : contenu potentiellement identifiant → placeholder.
        try {
          const ids = await ownedInteractionIds();
          if (ids.length > 0) {
            await supabaseAdmin
              .from("interaction_messages")
              .update({ text: ANON_TEXT })
              .in("interaction_id", ids);
          }
        } catch {}
        // Cloches : éphémères, supprimées (aucune valeur d'archive).
        try {
          await supabaseAdmin
            .from("customer_notifications")
            .delete()
            .eq("customer_id", userId);
        } catch {}
        // Avis publics : contenu conservé, auteur dissocié.
        try {
          await supabaseAdmin
            .from("product_reviews")
            .update({ customer_id: "deleted", customer_name: "Anonymous" })
            .eq("customer_id", userId);
        } catch {}
        // Newsletter : consentement retiré avec le compte.
        if (userEmail) {
          try {
            await supabaseAdmin
              .from("newsletter_subscribers")
              .delete()
              .eq("email", userEmail);
          } catch {}
        }
        // Demandes de remboursement : email dissocié (le suivi financier
        // reste : order_id + montants, sans PII).
        try {
          await supabaseAdmin
            .from("refund_requests")
            .update({ customer_email: ANON_EMAIL })
            .eq("customer_id", userId);
          if (userEmail) {
            await supabaseAdmin
              .from("refund_requests")
              .update({ customer_email: ANON_EMAIL })
              .eq("customer_email", userEmail);
          }
        } catch {}
      } catch (e) {
        console.warn("delete-account anonymize:", String((e as any)?.message || e).slice(0, 200));
      }

      // Supprime la ligne customers (cascade automatique sur
      // customer_addresses, cart_items, favourites via les FK ON DELETE CASCADE)
      await supabaseAdmin.from("customers").delete().eq("id", userId);

      // Supprime le compte Auth (empêche toute reconnexion future)
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        return new Response(JSON.stringify({ error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Erreur inconnue",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  },
};
