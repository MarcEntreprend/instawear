// supabase\functions\sync-printful\index.ts
// @ts-nocheck
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default {
  async fetch(req: Request): Promise<Response> {
    // ⚠️ Toujours ajouter les headers CORS, même pour les OPTIONS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: settings, error: settingsError } = await supabaseAdmin
        .from("pod_settings")
        .select("*")
        .single();

      if (settingsError || !settings?.api_key) {
        return new Response(
          JSON.stringify({ error: "Clé API Printful non configurée." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const printfulResponse = await fetch(
        "https://api.printful.com/store/products",
        {
          headers: { Authorization: `Bearer ${settings.api_key}` },
        },
      );

      if (!printfulResponse.ok) {
        const errText = await printfulResponse.text();
        return new Response(
          JSON.stringify({ error: `Erreur Printful : ${errText}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 502,
          },
        );
      }

      const printfulData = await printfulResponse.json();
      const syncedCount = printfulData.result?.length ?? 0;

      await supabaseAdmin
        .from("pod_settings")
        .update({
          last_sync_at: new Date().toISOString(),
          products_synced_count: syncedCount,
          sync_status: "synced",
        })
        .eq("id", settings.id);

      await supabaseAdmin.from("sync_logs").insert({
        id: `log-${Date.now()}`,
        sync_date: new Date().toISOString(),
        status: "success",
        message: `${syncedCount} produits synchronisés avec Printful.`,
        duration: 0,
      });

      return new Response(JSON.stringify({ success: true, syncedCount }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
