// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// @ts-nocheck

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase({ auth: ["publishable", "secret"] }, async (req, ctx) => {
    // Gérer les requêtes CORS preflight
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    try {
      // Récupérer les paramètres Printful depuis la base
      const { data: settings, error: settingsError } = await ctx.supabaseAdmin
        .from("pod_settings")
        .select("*")
        .single();

      if (settingsError || !settings?.api_key) {
        return Response.json(
          { error: "Clé API Printful non configurée." },
          { status: 400 },
        );
      }

      // Appeler l'API Printful pour récupérer les produits synchronisés
      const printfulResponse = await fetch(
        "https://api.printful.com/store/products",
        {
          headers: {
            Authorization: `Bearer ${settings.api_key}`,
          },
        },
      );

      if (!printfulResponse.ok) {
        const errText = await printfulResponse.text();
        return Response.json(
          { error: `Erreur Printful : ${errText}` },
          { status: 502 },
        );
      }

      const printfulData = await printfulResponse.json();
      const syncedCount = printfulData.result?.length ?? 0;

      // Mettre à jour les paramètres de synchronisation dans Supabase
      await ctx.supabaseAdmin
        .from("pod_settings")
        .update({
          last_sync_at: new Date().toISOString(),
          products_synced_count: syncedCount,
          sync_status: "synced",
        })
        .eq("id", settings.id);

      // Enregistrer un log de synchronisation
      await ctx.supabaseAdmin.from("sync_logs").insert({
        id: `log-${Date.now()}`,
        sync_date: new Date().toISOString(),
        status: "success",
        message: `${syncedCount} produits synchronisés avec Printful.`,
        duration: 0,
      });

      return Response.json({ success: true, syncedCount });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Erreur inconnue" },
        { status: 500 },
      );
    }
  }),
};
