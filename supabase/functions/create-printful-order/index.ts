// supabase/functions/create-printful-order/index.ts

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
      const { orderId } = body;
      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId requis" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // 1. Récupérer la commande et ses items depuis Supabase
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (orderError || !order) {
        return new Response(JSON.stringify({ error: "Commande introuvable" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);
      if (itemsError) {
        return new Response(
          JSON.stringify({ error: "Erreur chargement items" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }

      // 2. Récupérer les paramètres Printful
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

      // 3. Construire le payload Printful
      const printfulItems: any[] = [];
      for (const item of orderItems) {
        const { data: product } = await supabaseAdmin
          .from("products")
          .select(
            "external_product_id, title, variants, colors, sizes, external_variant_id",
          )
          .eq("id", item.product_id)
          .single();

        if (!product) {
          console.warn(`Produit introuvable: ${item.product_id}`);
          continue;
        }

        // Trouver le variant qui correspond à la couleur et à la taille sélectionnées
        let externalVariantId: number | null = null;

        // D'abord chercher dans le tableau variants
        if (product.variants && Array.isArray(product.variants)) {
          const matchingVariant = product.variants.find(
            (v: any) =>
              v.color === item.selected_color &&
              v.sizes &&
              v.sizes[item.selected_size] !== undefined,
          );
          if (matchingVariant?.external_variant_id) {
            externalVariantId = Number(matchingVariant.external_variant_id);
          }
        }

        // Fallback : utiliser le champ external_variant_id racine
        if (!externalVariantId && product.external_variant_id) {
          externalVariantId = Number(product.external_variant_id);
        }

        if (!externalVariantId) {
          console.warn(
            `Aucun external_variant_id trouvé pour ${item.product_id} (couleur: ${item.selected_color}, taille: ${item.selected_size})`,
          );
          continue;
        }

        printfulItems.push({
          sync_variant_id: externalVariantId,
          quantity: item.quantity,
          retail_price: item.unit_price.toFixed(2),
          name: item.product_title || product.title || undefined,
        });
      }

      if (printfulItems.length === 0) {
        return new Response(
          JSON.stringify({ error: "Aucun item avec variant Printful trouvé" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const printfulOrder = {
        external_id: order.id,
        shipping: "STANDARD",
        recipient: {
          name: order.shipping_address_full_name || order.client_name,
          address1: order.shipping_address_address,
          city: order.shipping_address_city,
          state_code: order.shipping_address_state_code || undefined,
          zip: order.shipping_address_zip,
          country_code: order.shipping_address_country,
          phone: order.shipping_address_phone,
          email: order.client_email,
          tax_number: order.shipping_address_tax_number || undefined,
        },
        items: printfulItems,
        retail_costs: {
          shipping: order.shipping_cost?.toFixed(2) || "0.00",
        },
      };

      // 4. Créer la commande chez Printful (mode draft, pas de confirm)
      const pfRes = await fetch("https://api.printful.com/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(printfulOrder),
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
      const externalOrderId = pfData.result?.id?.toString() || "";

      // 5. Mettre à jour la commande dans Supabase
      await supabaseAdmin
        .from("orders")
        .update({ external_order_id: externalOrderId, status: "in_production" })
        .eq("id", orderId);

      return new Response(JSON.stringify({ success: true, externalOrderId }), {
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
