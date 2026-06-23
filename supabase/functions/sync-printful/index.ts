// supabase\functions\sync-printful\index.ts
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
      const supabaseAdmin = createClient(
        Deno.env.get("PROJECT_URL")!,
        Deno.env.get("SERVICE_ROLE_KEY")!,
      );

      const body = await req.json().catch(() => ({}));

      // ─── Mode "list-products" : retourne la liste simplifiée des produits Printful ───
      if (body.action === "list-products") {
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
        const pfRes = await fetch("https://api.printful.com/store/products", {
          headers: { Authorization: `Bearer ${settings.api_key}` },
        });
        if (!pfRes.ok) {
          const errText = await pfRes.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${errText}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }
        const pfData = await pfRes.json();
        const items = (pfData.result || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          thumbnail_url: p.thumbnail_url,
        }));
        return new Response(JSON.stringify(items), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Mode "get-product" : récupérer les détails d'un produit Printful ───
      if (body.action === "get-product" && body.productId) {
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

        // Récupérer le produit depuis Printful
        const pfRes = await fetch(
          `https://api.printful.com/store/products/${body.productId}`,
          { headers: { Authorization: `Bearer ${settings.api_key}` } },
        );

        if (!pfRes.ok) {
          const errText = await pfRes.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${errText}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        const pfData = await pfRes.json();
        const detail = pfData.result;
        const syncProduct = detail.sync_product;
        const variants = detail.sync_variants ?? [];

        // Construire un objet produit complet
        const mainVariant = variants[0];
        const productData = {
          id: syncProduct?.id || detail.id,
          name: syncProduct?.name || detail.name || "",
          description: syncProduct?.description || "",
          thumbnail_url:
            syncProduct?.thumbnail_url ||
            mainVariant?.files?.[0]?.thumbnail_url ||
            "",
          variants: variants.map((v: any) => ({
            id: v.id,
            external_id: v.external_id || v.sku,
            size: v.size,
            color: v.color,
            color_code: v.color_code,
            retail_price: v.retail_price,
            price: v.price,
            files: v.files || [],
          })),
        };

        return new Response(JSON.stringify(productData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Mode par défaut : synchronisation complète du catalogue ─────────
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

      // 1. Récupérer la liste des produits
      const listRes = await fetch("https://api.printful.com/store/products", {
        headers: { Authorization: `Bearer ${settings.api_key}` },
      });

      if (!listRes.ok) {
        const errText = await listRes.text();
        return new Response(
          JSON.stringify({ error: `Erreur Printful: ${errText}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 502,
          },
        );
      }

      const listData = await listRes.json();
      const printfulProducts = listData.result ?? [];
      let syncedCount = 0;
      const errors: string[] = [];

      // 2. Pour chaque produit Printful, récupérer les détails et synchroniser
      for (const pfProduct of printfulProducts) {
        try {
          const detailRes = await fetch(
            `https://api.printful.com/store/products/${pfProduct.id}`,
            { headers: { Authorization: `Bearer ${settings.api_key}` } },
          );

          if (!detailRes.ok) {
            errors.push(
              `Erreur détails produit ${pfProduct.id}: ${detailRes.status}`,
            );
            continue;
          }

          const detailData = await detailRes.json();
          const detail = detailData.result;
          const syncProduct = detail.sync_product;
          const variants = detail.sync_variants ?? [];

          const mainVariant = variants[0];
          const imageUrl =
            syncProduct?.thumbnail_url ||
            mainVariant?.files?.[0]?.thumbnail_url ||
            "";
          const price = mainVariant?.retail_price
            ? parseFloat(mainVariant.retail_price)
            : null;

          const colors: string[] = [];
          const sizes: string[] = [];
          for (const v of variants) {
            if (v.color && !colors.includes(v.color)) colors.push(v.color);
            if (v.size && !sizes.includes(v.size)) sizes.push(v.size);
          }

          // Vérifier si le produit existe déjà dans InstaWear
          const { data: existing } = await supabaseAdmin
            .from("products")
            .select("id")
            .eq("external_product_id", pfProduct.id.toString())
            .maybeSingle();

          if (existing) {
            // Mettre à jour
            await supabaseAdmin
              .from("products")
              .update({
                title: syncProduct?.name || pfProduct.name || "Sans titre",
                image: imageUrl,
                gallery:
                  mainVariant?.files?.map((f: any) => f.thumbnail_url) || [],
                price: price ?? 0,
                colors: colors,
                sizes: sizes,
                last_external_sync: new Date().toISOString(),
                external_variant_id: mainVariant?.id?.toString() || null,
              })
              .eq("id", existing.id);
          } else {
            // Créer un nouveau produit
            const productId = `prod-printful-${pfProduct.id}`;
            await supabaseAdmin.from("products").insert({
              id: productId,
              is_active: true,
              title: syncProduct?.name || pfProduct.name || "Sans titre",
              brand: "INSTAWEAR",
              description: syncProduct?.name || "",
              image: imageUrl,
              gallery:
                mainVariant?.files?.map((f: any) => f.thumbnail_url) || [],
              price: price ?? 0,
              colors: colors,
              sizes: sizes,
              category: "tshirt",
              event_type: "culture",
              style: "street",
              tags: [],
              external_product_id: pfProduct.id.toString(),
              external_variant_id: mainVariant?.id?.toString() || null,
              last_external_sync: new Date().toISOString(),
            });
          }

          syncedCount++;
        } catch (e: any) {
          errors.push(`Exception produit ${pfProduct.id}: ${e.message}`);
        }
      }

      // 3. Mettre à jour les stats
      const now = new Date().toISOString();
      const syncStatus = errors.length > 0 ? "partial" : "synced";
      await supabaseAdmin
        .from("pod_settings")
        .update({
          last_sync_at: now,
          products_synced_count: syncedCount,
          sync_status: syncStatus,
        })
        .eq("id", settings.id);

      // 4. Log
      await supabaseAdmin.from("sync_logs").insert({
        id: `log-${Date.now()}`,
        sync_date: now,
        status: syncStatus,
        message: `${syncedCount} produits synchronisés.${errors.length > 0 ? ` ${errors.length} erreur(s).` : ""}`,
        duration: 0,
      });

      return new Response(
        JSON.stringify({
          success: true,
          syncedCount,
          errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
