// supabase/functions/reset-password/index.ts

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MASTER_CODE = "000000";

export default {
  async fetch(req: Request): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const { email, code, newPassword } = await req.json();

      if (!email || !code || !newPassword) {
        return new Response(JSON.stringify({ error: "Données manquantes" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      if (code !== MASTER_CODE) {
        return new Response(JSON.stringify({ error: "Code invalide" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      if (newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: "Mot de passe trop court (min 6)" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get("PROJECT_URL")!,
        Deno.env.get("SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // Chercher l'utilisateur par email avec pagination
      let userId: string | null = null;
      let page = 1;
      const perPage = 100;
      while (true) {
        const { data: list, error: listError } =
          await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (listError) {
          return new Response(
            JSON.stringify({
              error: `Erreur liste users: ${listError.message}`,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            },
          );
        }
        const found = list.users.find((u: any) => u.email === email);
        if (found) {
          userId = found.id;
          break;
        }
        if (list.users.length < perPage) break;
        page++;
      }

      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Aucun compte trouvé avec cet email" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          },
        );
      }

      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        });
      if (updateError) {
        return new Response(
          JSON.stringify({ error: `Erreur update: ${updateError.message}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Mot de passe réinitialisé" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Erreur inconnue",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }
  },
};
