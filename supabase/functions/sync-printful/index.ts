// supabase\functions\sync-printful\index.ts
// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Fallback color name → hex (Printful n'a pas toujours un color_code2) ──
const COLOR_NAME_TO_HEX: Record<string, string> = {
  black: "#1A1A1A",
  white: "#FFFFFF",
  red: "#CC0000",
  navy: "#000080",
  "dark heather": "#3E3E3E",
  heather: "#C0C0C0",
  "light blue": "#ADD8E6",
  royal: "#4169E1",
  "sport grey": "#808080",
  sand: "#C2B280",
  "light pink": "#FFB6C1",
  ash: "#B2BEB5",
  charcoal: "#36454F",
  forest: "#228B22",
  purple: "#800080",
  gold: "#FFD700",
  orange: "#FFA500",
  yellow: "#FFFF00",
  green: "#008000",
  blue: "#0000FF",
  pink: "#FFC0CB",
  grey: "#808080",
  gray: "#808080",
  brown: "#A52A2A",
  beige: "#F5F5DC",
  silver: "#C0C0C0",
  maroon: "#800000",
  olive: "#808000",
  teal: "#008080",
  aqua: "#00FFFF",
  coral: "#FF7F50",
  mint: "#98FF98",
  lavender: "#E6E6FA",
  khaki: "#C3B091",
  mustard: "#FFDB58",
  burgundy: "#800020",
  blush: "#DE5D83",
  "baby blue": "#89CFF0",
  lime: "#00FF00",
  cream: "#FFFDD0",
  tan: "#D2B48C",
  chocolate: "#7B3F00",
  indigo: "#4B0082",
  violet: "#8F00FF",
  crimson: "#DC143C",
  "dark chocolate": "#4A3728",
  "heather grey": "#9B9B9B",
  "sport gray": "#808080",
  "dark grey": "#A9A9A9",
  "dark gray": "#A9A9A9",
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
        const syncVariants = detail.sync_variants ?? [];

        const mainVariant = syncVariants[0];

        let catalogVariants: any[] = [];
        let catalogProductName = "";
        let catalogProductImage = "";

        const catalogProductId =
          mainVariant?.product?.product_id || mainVariant?.product_id;

        if (catalogProductId) {
          try {
            const catalogRes = await fetch(
              `https://api.printful.com/products/${catalogProductId}`,
            );
            if (catalogRes.ok) {
              const catalogData = await catalogRes.json();
              const catalogResult =
                catalogData?.result?.product || catalogData?.result;
              if (catalogResult) {
                catalogProductName = catalogResult.name || "";
                catalogProductImage = catalogResult.image || "";
                catalogVariants = (catalogResult.variants || []).map(
                  (v: any) => ({
                    id: v.id,
                    product_id: v.product_id,
                    name: v.name,
                    color: v.color || "",
                    color_code: v.color_code || "",
                    color_code2: v.color_code2 || "",
                    size: v.size || "",
                    price: v.price,
                    currency: v.currency,
                    image: v.image || "",
                    availability_status: v.availability_status,
                  }),
                );
              }
            }
          } catch {
            // Silently fallback to sync variants only
          }
        }

        const allColorsMap = new Map<
          string,
          { code: string; name: string; image: string }
        >();
        const allSizesSet = new Set<string>();

        for (const v of catalogVariants.length > 0
          ? catalogVariants
          : syncVariants) {
          const hex =
            v.color_code2 ||
            (v.color_code && /^#/.test(v.color_code) ? v.color_code : null) ||
            COLOR_NAME_TO_HEX[
              (v.color || "").toLowerCase().replace(/\s+/g, "_")
            ] ||
            COLOR_NAME_TO_HEX[(v.color || "").toLowerCase()] ||
            "";
          const code = hex || v.color_code || v.color || "";
          const name = v.color || "";
          const dedupKey = hex || code;
          if (dedupKey && !allColorsMap.has(dedupKey)) {
            allColorsMap.set(dedupKey, {
              code: hex || code,
              name,
              image: v.image || (v as any).product_image || "",
            });
          }
          if (v.size) allSizesSet.add(v.size);
        }

        const uniqueColors = [...allColorsMap.values()];
        const uniqueColorCodes = uniqueColors.map((c) => c.code);
        const uniqueColorNames = uniqueColors.map((c) => c.name);
        const uniqueColorImages = uniqueColors
          .map((c: any) => c.image)
          .filter((img: string) => img && img.trim().length > 0);
        const uniqueSizes = [...allSizesSet];

        const productData = {
          id: syncProduct?.id || detail.id,
          name: syncProduct?.name || detail.name || catalogProductName || "",
          description: syncProduct?.description || "",
          thumbnail_url:
            syncProduct?.thumbnail_url ||
            catalogProductImage ||
            mainVariant?.files?.[0]?.preview_url ||
            "",
          currency: mainVariant?.currency || "USD",
          colors: uniqueColorCodes,
          color_names: uniqueColorNames,
          color_images: uniqueColorImages,
          sizes: uniqueSizes,
          variants: syncVariants.map((v: any) => ({
            id: v.id,
            external_id: v.external_id || v.sku,
            size: v.size,
            color: v.color,
            color_code: v.color_code,
            retail_price: v.retail_price,
            price: v.price,
            currency: v.currency,
            files: v.files || [],
            preview_url:
              v.files?.[0]?.preview_url || v.files?.[0]?.thumbnail_url || "",
            product_image: v.product?.image || "",
            product: v.product || {},
          })),
          catalog_variants: catalogVariants,
        };

        return new Response(JSON.stringify(productData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Mode "get-catalog-product" : récupérer le prix catalogue d'un variant ───
      if (body.action === "get-catalog-product") {
        const { productId, variantId } = body;
        if (!productId || !variantId) {
          return new Response(
            JSON.stringify({ error: "productId et variantId requis" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        try {
          const res = await fetch(
            `https://api.printful.com/products/${productId}`,
          );
          if (!res.ok)
            throw new Error(`Printful catalogue error ${res.status}`);
          const data = await res.json();
          const catalogResult = data?.result?.product || data?.result;
          const variants = catalogResult?.variants;
          if (!Array.isArray(variants))
            throw new Error("Variants introuvables");
          const target = variants.find((v: any) => v.id == variantId);
          if (!target) throw new Error("Variant non trouvé");
          const price = target.price; // string or number
          return new Response(JSON.stringify({ price }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 502,
          });
        }
      }

      // ─── Mode "get-shipping-estimate" : estimation des frais de port Printful ───
      if (body.action === "get-shipping-estimate") {
        const { variantId } = body; // correspond au catalogue variant ID
        if (!variantId) {
          return new Response(JSON.stringify({ error: "variantId requis" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Récupérer les paramètres Printful ET le pays de la boutique
        const { data: podSettings, error: podError } = await supabaseAdmin
          .from("pod_settings")
          .select("*")
          .single();

        if (podError || !podSettings?.api_key) {
          return new Response(
            JSON.stringify({ error: "Clé API Printful non configurée." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        const { data: storeSettings } = await supabaseAdmin
          .from("store_settings")
          .select("country")
          .eq("id", true)
          .single();

        const country = storeSettings?.country || "BR";

        // Appeler l'API Printful Shipping Rates
        const shippingRes = await fetch(
          "https://api.printful.com/shipping/rates",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${podSettings.api_key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipient: {
                address1: "",
                city: "",
                country_code: country,
                state_code: country === "US" ? "CA" : undefined, // requis pour les US
                zip: "",
              },
              items: [
                {
                  variant_id: Number(variantId),
                  quantity: 1,
                },
              ],
            }),
          },
        );

        if (!shippingRes.ok) {
          const errText = await shippingRes.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful Shipping: ${errText}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        const shippingData = await shippingRes.json();
        const rates = shippingData.result || [];
        if (rates.length === 0) {
          return new Response(JSON.stringify({ error: "Aucun tarif trouvé" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        // Extraire le min et le max
        const costs = rates.map((r: any) => parseFloat(r.rate));
        const minCost = Math.min(...costs);
        const maxCost = Math.max(...costs);
        const currency = rates[0].currency || "BRL";

        return new Response(
          JSON.stringify({ min: minCost, max: maxCost, currency }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
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
        // Si 401, la clé est invalide → on marque comme déconnecté
        if (listRes.status === 401) {
          await supabaseAdmin
            .from("pod_settings")
            .update({ is_connected: false, sync_status: "error" })
            .eq("id", settings.id);
        }
        return new Response(
          JSON.stringify({ error: `Erreur Printful: ${errText}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 502,
          },
        );
      }

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
          const syncVariants = detail.sync_variants ?? [];
          const mainVariant = syncVariants[0];

          const imageUrl =
            syncProduct?.thumbnail_url ||
            mainVariant?.files?.[0]?.thumbnail_url ||
            "";
          const price = mainVariant?.retail_price
            ? parseFloat(mainVariant.retail_price)
            : null;

          let colors: string[] = [];
          let colorNames: string[] = [];
          let colorImages: string[] = [];
          let sizes: string[] = [];
          let catalogGallery: string[] = [];

          const catalogProductId =
            mainVariant?.product?.product_id || mainVariant?.product_id;

          if (catalogProductId) {
            try {
              const catalogRes = await fetch(
                `https://api.printful.com/products/${catalogProductId}`,
              );
              if (catalogRes.ok) {
                const catalogData = await catalogRes.json();
                const catalogResult =
                  catalogData?.result?.product || catalogData?.result;
                if (catalogResult) {
                  const catalogVariants = catalogResult.variants || [];
                  const colorMap = new Map<
                    string,
                    { code: string; name: string; image: string }
                  >();
                  for (const v of catalogVariants) {
                    const hex =
                      v.color_code2 ||
                      (v.color_code && /^#/.test(v.color_code)
                        ? v.color_code
                        : null) ||
                      COLOR_NAME_TO_HEX[
                        (v.color || "").toLowerCase().replace(/\s+/g, "_")
                      ] ||
                      COLOR_NAME_TO_HEX[(v.color || "").toLowerCase()] ||
                      "";
                    const code = hex || (v.color_code || v.color || "").trim();
                    const name = (v.color || "").trim();
                    const img = (v.image || "").trim();
                    const dedupKey = hex || code;
                    if (dedupKey && !colorMap.has(dedupKey)) {
                      colorMap.set(dedupKey, {
                        code: hex || code,
                        name,
                        image: img,
                      });
                    }
                    if (v.size) sizes.push(v.size);
                  }
                  sizes = [...new Set(sizes)];
                  colors = [...colorMap.values()].map((c) => c.code);
                  colorNames = [...colorMap.values()].map((c) => c.name);
                  colorImages = [...colorMap.values()]
                    .map((c) => c.image)
                    .filter((img: string) => img && img.trim().length > 0);
                  catalogGallery = [
                    ...new Set(
                      catalogVariants
                        .map((v: any) => v.image as string)
                        .filter((img: string) => img && img.trim().length > 0),
                    ),
                  ].slice(0, 12);
                  if (catalogGallery.length === 0 && catalogResult.image) {
                    catalogGallery = [catalogResult.image];
                  }
                }
              }
            } catch {
              // fallback to sync_variants
            }
          }

          if (colors.length === 0) {
            for (const v of syncVariants) {
              const raw = (v.color_code || v.color || "").trim();
              const hex =
                (/^#/.test(raw) ? raw : null) ||
                COLOR_NAME_TO_HEX[raw.toLowerCase().replace(/\s+/g, "_")] ||
                COLOR_NAME_TO_HEX[raw.toLowerCase()] ||
                raw;
              const name = (v.color || raw).trim();
              if (hex && !colors.includes(hex)) colors.push(hex);
              if (name && !colorNames.includes(name)) colorNames.push(name);
              if (v.size && !sizes.includes(v.size)) sizes.push(v.size);
            }
          }

          const gallery =
            catalogGallery.length > 0
              ? catalogGallery
              : (
                  mainVariant?.files?.map((f: any) => f.thumbnail_url) || []
                ).filter((u: string) => u && u.trim().length > 0);

          const productPayload: Record<string, any> = {
            title: syncProduct?.name || pfProduct.name || "Sans titre",
            image: imageUrl,
            gallery,
            price: price ?? 0,
            colors,
            color_names: colorNames.length > 0 ? colorNames : null,
            sizes,
            last_external_sync: new Date().toISOString(),
            external_variant_id: mainVariant?.id?.toString() || null,
          };

          try {
            productPayload.color_images =
              colorImages.length > 0 ? colorImages : null;
          } catch {
            // column may not exist yet
          }

          // Vérifier si le produit existe déjà dans InstaWear
          const { data: existing } = await supabaseAdmin
            .from("products")
            .select("id")
            .eq("external_product_id", pfProduct.id.toString())
            .maybeSingle();

          if (existing) {
            const updatePayload = { ...productPayload };
            try {
              await supabaseAdmin
                .from("products")
                .update(updatePayload)
                .eq("id", existing.id);
            } catch (e: any) {
              delete updatePayload.color_images;
              await supabaseAdmin
                .from("products")
                .update(updatePayload)
                .eq("id", existing.id);
            }
          } else {
            const productId = `prod-printful-${pfProduct.id}`;
            const insertPayload = { ...productPayload };
            try {
              await supabaseAdmin.from("products").insert({
                id: productId,
                is_active: true,
                brand: "INSTAWEAR",
                description: syncProduct?.name || "",
                category: "tshirt",
                event_type: "culture",
                style: "street",
                tags: [],
                external_product_id: pfProduct.id.toString(),
                ...insertPayload,
              });
            } catch (e: any) {
              delete insertPayload.color_images;
              await supabaseAdmin.from("products").insert({
                id: productId,
                is_active: true,
                brand: "INSTAWEAR",
                description: syncProduct?.name || "",
                category: "tshirt",
                event_type: "culture",
                style: "street",
                tags: [],
                external_product_id: pfProduct.id.toString(),
                ...insertPayload,
              });
            }
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
          is_connected: true,
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
