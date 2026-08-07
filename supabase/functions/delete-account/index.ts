// supabase/functions/delete-account/index.ts
// Supprime définitivement le compte du client authentifié (customers + auth.users)

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
