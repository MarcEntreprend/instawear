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

// ─── Résout un hex de couleur à partir des champs Printful natifs ──────────
function resolveHexColor(
  rawColor: string,
  rawCode?: string,
  rawCode2?: string,
): string {
  if (rawCode2 && /^#/.test(rawCode2)) return rawCode2.toLowerCase();
  if (rawCode && /^#/.test(rawCode)) return rawCode.toLowerCase();
  const key = (rawColor || "").toLowerCase().replace(/\s+/g, "_");
  return (
    COLOR_NAME_TO_HEX[key] ||
    COLOR_NAME_TO_HEX[(rawColor || "").toLowerCase()] ||
    rawCode?.toLowerCase() ||
    rawColor ||
    "#CCCCCC"
  );
}

// ─── Source de vérité unique couleur × taille × prix ───────────────────────
function buildVariantMatrix(syncVariants: any[], catalogVariants: any[]) {
  const byColor = new Map<
    string,
    { name: string; sizes: Map<string, number>; image: string }
  >();

  for (const v of syncVariants || []) {
    const hex = resolveHexColor(v.color, v.color_code, v.color_code2);
    const name = (v.color || hex || "").trim();
    if (!byColor.has(hex))
      byColor.set(hex, { name, sizes: new Map(), image: "" });
    const entry = byColor.get(hex)!;
    if (v.size && v.retail_price != null) {
      entry.sizes.set(v.size, parseFloat(v.retail_price));
    }
    if (!entry.image) {
      entry.image =
        v.files?.[0]?.preview_url || v.files?.[0]?.thumbnail_url || "";
    }
  }

  // Priorité aux images du catalogue (plus représentatives du produit)
  for (const cv of catalogVariants || []) {
    const hex = resolveHexColor(cv.color, cv.color_code, cv.color_code2);
    const entry = byColor.get(hex);
    if (entry) {
      // L'image catalogue écrase toujours la preview si elle existe
      if (cv.image) entry.image = cv.image;
    }
  }

  const variants = [...byColor.entries()].map(([hex, entry]) => ({
    color: hex,
    color_name: entry.name,
    image: entry.image,
    sizes: Object.fromEntries(
      [...entry.sizes.entries()].map(([size, price]) => [size, { price }]),
    ),
  }));

  const colors = variants.map((v) => v.color);
  const colorNames = variants.map((v) => v.color_name);
  const colorImages = variants.map((v) => v.image).filter(Boolean);
  const sizesSet = new Set<string>();
  variants.forEach((v) => Object.keys(v.sizes).forEach((s) => sizesSet.add(s)));

  return { colors, colorNames, colorImages, sizes: [...sizesSet], variants };
}

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

      // ─── Mode "list-products" ──────────────────────────────────────
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

      // ─── Mode "get-product" ────────────────────────────────────────
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
            // fallback to sync variants only
          }
        }

        const { colors, colorNames, colorImages, sizes, variants } =
          buildVariantMatrix(syncVariants, catalogVariants);

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
          colors,
          color_names: colorNames,
          color_images: colorImages,
          sizes,
          retail_price: mainVariant?.retail_price || null,
          original_price: mainVariant?.retail_price
            ? Math.round(parseFloat(mainVariant.retail_price) * 1.3 * 100) / 100
            : null,
          variants,
          sync_variants: syncVariants.map((v: any) => ({
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

      // ─── Mode "get-catalog-product" ─────────────────────────────────
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
          const price = target.price;
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

      // ─── Mode "get-shipping-estimate" ───────────────────────────────
      if (body.action === "get-shipping-estimate") {
        const { variantId } = body;
        if (!variantId) {
          return new Response(JSON.stringify({ error: "variantId requis" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

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
                state_code: country === "US" ? "CA" : undefined,
                zip: "",
              },
              items: [{ variant_id: Number(variantId), quantity: 1 }],
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

      // ─── Mode par défaut : synchronisation complète ────────────────
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

      const listRes = await fetch("https://api.printful.com/store/products", {
        headers: { Authorization: `Bearer ${settings.api_key}` },
      });

      if (!listRes.ok) {
        const errText = await listRes.text();
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

      const listData = await listRes.json();
      const printfulProducts = listData.result ?? [];
      let syncedCount = 0;
      const errors: string[] = [];

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

          const catalogProductId =
            mainVariant?.product?.product_id || mainVariant?.product_id;
          let catalogVariants: any[] = [];
          if (catalogProductId) {
            try {
              const catalogRes = await fetch(
                `https://api.printful.com/products/${catalogProductId}`,
              );
              if (catalogRes.ok) {
                const catalogData = await catalogRes.json();
                const catalogResult =
                  catalogData?.result?.product || catalogData?.result;
                catalogVariants = catalogResult?.variants || [];
              }
            } catch {
              // fallback
            }
          }

          const { colors, colorNames, colorImages, sizes, variants } =
            buildVariantMatrix(syncVariants, catalogVariants);

          const sizeSurcharge: Record<string, number> = {};
          const allPrices = variants.flatMap((v) =>
            Object.entries(v.sizes).map(
              ([size, s]) => [size, s.price] as [string, number],
            ),
          );
          if (allPrices.length > 0) {
            const minPrice = Math.min(...allPrices.map(([, p]) => p));
            for (const [size, p] of allPrices) {
              const surcharge = Math.round((p - minPrice) * 100) / 100;
              if (
                surcharge > 0 &&
                (!sizeSurcharge[size] || surcharge < sizeSurcharge[size])
              ) {
                sizeSurcharge[size] = surcharge;
              }
            }
          }

          const catalogGallery = [...new Set(colorImages)].slice(0, 12);
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
            original_price: price ? Math.round(price * 1.3 * 100) / 100 : null,
            colors,
            color_names: colorNames.length > 0 ? colorNames : null,
            sizes,
            size_surcharge:
              Object.keys(sizeSurcharge).length > 0 ? sizeSurcharge : null,
            variants: variants.length > 0 ? variants : null,
            last_external_sync: new Date().toISOString(),
            external_variant_id: mainVariant?.id?.toString() || null,
          };

          try {
            productPayload.color_images =
              colorImages.length > 0 ? colorImages : null;
          } catch {
            // column may not exist yet
          }

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
