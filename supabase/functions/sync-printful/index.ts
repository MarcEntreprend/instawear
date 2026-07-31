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
  black: "#1a1a1a",
  white: "#ffffff",
  red: "#cc0000",
  navy: "#000080",
  "dark heather": "#3e3e3e",
  heather: "#c0c0c0",
  "light blue": "#add8e6",
  royal: "#4169e1",
  "sport grey": "#808080",
  sand: "#c2b280",
  "light pink": "#ffb6c1",
  ash: "#b2beb5",
  charcoal: "#36454f",
  forest: "#228b22",
  purple: "#800080",
  gold: "#ffd700",
  orange: "#ffa500",
  yellow: "#ffff00",
  green: "#008000",
  blue: "#0000ff",
  pink: "#ffc0cb",
  grey: "#808080",
  gray: "#808080",
  brown: "#a52a2a",
  beige: "#f5f5dc",
  silver: "#c0c0c0",
  maroon: "#800000",
  olive: "#808000",
  teal: "#008080",
  aqua: "#00ffff",
  coral: "#ff7f50",
  mint: "#98ff98",
  lavender: "#e6e6fa",
  khaki: "#c3b091",
  mustard: "#ffdb58",
  burgundy: "#800020",
  blush: "#de5d83",
  "baby blue": "#89cff0",
  lime: "#00ff00",
  cream: "#fffdd0",
  tan: "#d2b48c",
  chocolate: "#7b3f00",
  indigo: "#4b0082",
  violet: "#8f00ff",
  crimson: "#dc143c",
  "dark chocolate": "#4a3728",
  "heather grey": "#9b9b9b",
  "sport gray": "#808080",
  "dark grey": "#a9a9a9",
  "dark gray": "#a9a9a9",
  // ── Printful-specific color names (sync variants often have null color_code) ──
  "washed black": "#1a1a1a",
  "light washed denim": "#7b8fa1",
  "vintage white": "#f5f0e8",
  spruce: "#2e4a1a",
  stone: "#8b8682",
  "green camo": "#4a5d23",
  "dark heather grey": "#3e3e3e",
  "heather midnight navy": "#1a2035",
  "heather olive": "#4a5032",
};

// ─── Résout un hex de couleur à partir des champs Printful natifs ──────────
function resolveHexColor(
  rawColor: string,
  rawCode?: string,
  rawCode2?: string,
): string {
  // Normalise TOUS les hex en lowercase : Store API → "#ffffff",
  // Catalog API → "#FFFFFF", COLOR_NAME_TO_HEX → "#FFFFFF"
  // Sans normalisation le matching Map échoue
  if (rawCode2 && /^#/.test(rawCode2)) return rawCode2.toLowerCase();
  if (rawCode && /^#/.test(rawCode)) return rawCode.toLowerCase();
  const key = (rawColor || "").toLowerCase().replace(/\s+/g, "_");
  const fromMap =
    COLOR_NAME_TO_HEX[key] || COLOR_NAME_TO_HEX[(rawColor || "").toLowerCase()];
  if (fromMap) return fromMap.toLowerCase();
  return rawCode?.toLowerCase() || rawColor || "#cccccc";
}

// ─── Source de vérité unique couleur × taille × prix ───────────────────────
function buildVariantMatrix(syncVariants: any[], catalogVariants: any[]) {
  const byColor = new Map<
    string,
    {
      name: string;
      sizes: Map<string, number>;
      image: string;
      id: number | null;
    }
  >();

  const catalogIdToHex = new Map<number, string>();
  for (const cv of catalogVariants || []) {
    const cvId = cv.id;
    if (!cvId) continue;
    const cvHex = resolveHexColor(cv.color, cv.color_code, cv.color_code2);
    if (cvHex.startsWith("#")) {
      catalogIdToHex.set(cvId, cvHex);
    }
  }

  for (const v of syncVariants || []) {
    let hex = resolveHexColor(v.color, v.color_code, v.color_code2);

    if (!hex.startsWith("#")) {
      const catalogVid = v.variant_id || v.product?.variant_id;
      if (catalogVid && catalogIdToHex.has(catalogVid)) {
        hex = catalogIdToHex.get(catalogVid)!;
      }
    }

    const name = (v.color || hex || "").trim();
    if (!byColor.has(hex))
      byColor.set(hex, { name, sizes: new Map(), image: "", id: null });
    const entry = byColor.get(hex)!;

    // Stocker l'ID du variant Printful (le premier trouvé fait foi)
    if (!entry.id && v.id) {
      entry.id = v.id;
    }

    if (v.size && v.retail_price != null) {
      entry.sizes.set(v.size, parseFloat(v.retail_price));
    }
    if (!entry.image && v.product?.image) {
      entry.image = v.product.image;
    }
  }

  for (const cv of catalogVariants || []) {
    const hex = resolveHexColor(cv.color, cv.color_code, cv.color_code2);
    const entry = byColor.get(hex);
    if (entry) {
      if (cv.image) entry.image = cv.image;
    }
  }

  for (const v of syncVariants || []) {
    let hex = resolveHexColor(v.color, v.color_code, v.color_code2);
    if (!hex.startsWith("#")) {
      const catalogVid = v.variant_id || v.product?.variant_id;
      if (catalogVid && catalogIdToHex.has(catalogVid)) {
        hex = catalogIdToHex.get(catalogVid)!;
      }
    }
    const entry = byColor.get(hex);
    if (entry && !entry.image) {
      entry.image =
        v.files?.[0]?.preview_url || v.files?.[0]?.thumbnail_url || "";
    }
  }

  const variants = [...byColor.entries()].map(([hex, entry]) => ({
    color: hex,
    color_name: entry.name,
    image: entry.image,
    external_variant_id: entry.id ? String(entry.id) : undefined,
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

// ─── Maps catalog_variant_id → hex_color for mockup result matching ──────
function buildVariantIdToColorMap(syncVariants: any[], catalogVariants: any[]) {
  const map = new Map<number, string>();

  // First pass: catalog variants (always have reliable color codes)
  for (const cv of catalogVariants || []) {
    if (!cv.id) continue;
    const hex = resolveHexColor(cv.color, cv.color_code, cv.color_code2);
    if (map.has(cv.id)) continue; // already set
    map.set(cv.id, hex.startsWith("#") ? hex : hex);
  }

  // Second pass: sync variants (fill gaps where catalog variant was missing)
  for (const v of syncVariants || []) {
    const catalogVariantId = v.variant_id || v.product?.variant_id;
    if (!catalogVariantId) continue;
    if (map.has(catalogVariantId)) continue; // catalog already set, prefer it
    const hex = resolveHexColor(v.color, v.color_code, v.color_code2);
    if (hex.startsWith("#")) map.set(catalogVariantId, hex);
  }

  return map;
}

// ─── Polls mockup generation task until complete or timeout ─────────────
async function pollMockupTask(
  apiKey: string,
  storeId: string | undefined,
  taskKey: string,
  maxAttempts = 20,
  intervalMs = 3000,
) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    if (storeId) headers["X-PF-Store-Id"] = storeId;

    const res = await fetch(
      `https://api.printful.com/mockup-generator/task?task_key=${taskKey}`,
      { headers },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Poll mockup task failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const result = data?.result;
    if (!result) continue;

    if (result.status === "completed") return result;
    if (result.status === "failed") {
      throw new Error(
        `Mockup generation failed: ${result.error || "Unknown error"}`,
      );
    }
  }
  throw new Error(
    `Mockup generation timed out after ${(maxAttempts * intervalMs) / 1000}s`,
  );
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

      // ─── Mode "get-product-sizes" ─────────────────────────────────
      if (body.action === "get-product-sizes" && body.productId) {
        try {
          const res = await fetch(
            `https://api.printful.com/products/${body.productId}/sizes`,
          );
          if (!res.ok) {
            return new Response(
              JSON.stringify({
                error: `Printful sizes API error ${res.status}`,
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 502,
              },
            );
          }
          const data = await res.json();
          return new Response(JSON.stringify(data.result ?? {}), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }
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

      // ─── Mode "setup-webhook" ─────────────────────────────────────────
      if (body.action === "setup-webhook") {
        const { apiKey, storeId, webhookUrl, types } = body;
        if (!apiKey || !webhookUrl || !types) {
          return new Response(
            JSON.stringify({ error: "apiKey, webhookUrl, types requis" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (storeId) headers["X-PF-Store-Id"] = storeId;

        const res = await fetch("https://api.printful.com/webhooks", {
          method: "POST",
          headers,
          body: JSON.stringify({ url: webhookUrl, types }),
        });

        if (!res.ok) {
          const err = await res.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${err}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Mode "get-webhook-config" ────────────────────────────────────
      if (body.action === "get-webhook-config") {
        const { apiKey, storeId } = body;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "apiKey requis" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (storeId) headers["X-PF-Store-Id"] = storeId;

        const res = await fetch("https://api.printful.com/webhooks", {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          const err = await res.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${err}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        const data = await res.json();
        return new Response(
          JSON.stringify({
            url: data.result?.url || "",
            types: data.result?.types || [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Mode "disable-webhook" ───────────────────────────────────────
      if (body.action === "disable-webhook") {
        const { apiKey, storeId } = body;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "apiKey requis" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (storeId) headers["X-PF-Store-Id"] = storeId;

        const res = await fetch("https://api.printful.com/webhooks", {
          method: "DELETE",
          headers,
        });

        if (!res.ok) {
          const err = await res.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${err}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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

      // ─── Mode "generate-mockups" ────────────────────────────────────
      if (body.action === "generate-mockups" && body.productId) {
        const { data: prodSettings, error: podErr } = await supabaseAdmin
          .from("pod_settings")
          .select("*")
          .single();
        if (podErr || !prodSettings?.api_key) {
          return new Response(
            JSON.stringify({ error: "Clé API Printful non configurée." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        const apiKey = prodSettings.api_key;
        const storeId = prodSettings.store_id;

        // 1. Look up product in DB
        const { data: dbProduct, error: dbErr } = await supabaseAdmin
          .from("products")
          .select("*")
          .eq("id", body.productId)
          .single();

        if (dbErr || !dbProduct) {
          return new Response(
            JSON.stringify({ error: "Produit introuvable." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 404,
            },
          );
        }

        if (!dbProduct.external_product_id) {
          return new Response(
            JSON.stringify({
              error: "Ce produit n'est pas importé de Printful.",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // 2. Fetch Printful store product details (sync variants)
        const storeRes = await fetch(
          `https://api.printful.com/store/products/${dbProduct.external_product_id}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        if (!storeRes.ok) {
          const errText = await storeRes.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful Store: ${errText}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        const storeData = await storeRes.json();
        const detail = storeData.result;
        const syncVariants: any[] = detail.sync_variants ?? [];
        const mainVariant = syncVariants[0];

        if (!mainVariant) {
          return new Response(
            JSON.stringify({ error: "Aucun variant Printful trouvé." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 404,
            },
          );
        }

        // 3. Get catalog product ID
        const catalogProductId =
          mainVariant?.product?.product_id || mainVariant?.product_id;
        if (!catalogProductId) {
          return new Response(
            JSON.stringify({
              error: "Impossible de déterminer le produit catalogue.",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // 4. Fetch catalog variants for color mapping
        let catalogVariants: any[] = [];
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
          // fallback — will use sync variants only
        }

        // 5. Build catalog_variant_id → hex_color map
        const variantIdToColor = buildVariantIdToColorMap(
          syncVariants,
          catalogVariants,
        );

        // 6. Collect ONE catalog variant ID per color + the print file URL
        const seenColors = new Set<string>();
        const uniqueVariantIds: number[] = [];
        let printFileUrl = "";

        for (const v of syncVariants) {
          const catalogVid = v.variant_id || v.product?.variant_id;
          if (!catalogVid) continue;
          const hex = resolveHexColor(v.color, v.color_code, v.color_code2);
          if (!seenColors.has(hex)) {
            seenColors.add(hex);
            uniqueVariantIds.push(catalogVid);
          }
          if (!printFileUrl) {
            printFileUrl =
              v.files?.[0]?.preview_url || v.files?.[0]?.thumbnail_url || "";
          }
        }

        if (uniqueVariantIds.length === 0) {
          return new Response(
            JSON.stringify({ error: "Aucun variant catalogue trouvé." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        if (!printFileUrl) {
          return new Response(
            JSON.stringify({
              error: "Aucun fichier d'impression (print file) trouvé.",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // 7. Fetch printfiles to get print area dimensions + available placements
        let printAreaWidth = 1800;
        let printAreaHeight = 2400;
        let placement = "front"; // fallback for legacy DTG products

        try {
          const pfHeaders: Record<string, string> = {
            Authorization: `Bearer ${apiKey}`,
          };
          if (storeId) pfHeaders["X-PF-Store-Id"] = storeId;

          const pfRes = await fetch(
            `https://api.printful.com/mockup-generator/printfiles/${catalogProductId}`,
            { headers: pfHeaders },
          );
          if (pfRes.ok) {
            const pfData = await pfRes.json();
            const result = pfData?.result || {};

            // Determine the correct placement from available_placements
            const availablePlacements: Record<string, string> =
              result.available_placements || {};
            const placementKeys = Object.keys(availablePlacements);
            if (placementKeys.length > 0) {
              placement = placementKeys[0]; // e.g. "front", "default", "embroidery_front"
            }

            const printfiles: any[] = result.printfiles ?? [];
            if (printfiles.length > 0) {
              const firstPf = printfiles[0];
              if (firstPf.width) printAreaWidth = firstPf.width;
              if (firstPf.height) printAreaHeight = firstPf.height;
              // If the printfile itself declares a placement, prefer it
              if (firstPf.placement) placement = firstPf.placement;
            }
          }
        } catch {
          // fallback: use "front" with default DTG dimensions (12"×16" @ 150 DPI)
        }

        // 8. Create mockup generation task
        const createHeaders: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (storeId) createHeaders["X-PF-Store-Id"] = storeId;

        const createBody: Record<string, any> = {
          variant_ids: uniqueVariantIds,
          format: "jpg",
          product_options: { lifelike: true },
          files: [
            {
              placement,
              image_url: printFileUrl,
              position: {
                area_width: printAreaWidth,
                area_height: printAreaHeight,
                width: printAreaWidth,
                height: printAreaHeight,
                top: 0,
                left: 0,
              },
            },
          ],
        };

        let createRes: Response;
        try {
          createRes = await fetch(
            `https://api.printful.com/mockup-generator/create-task/${catalogProductId}`,
            {
              method: "POST",
              headers: createHeaders,
              body: JSON.stringify(createBody),
            },
          );
        } catch (createErr: any) {
          return new Response(
            JSON.stringify({
              error: `Échec création tâche mockup: ${createErr.message}`,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        if (!createRes.ok) {
          const errText = await createRes.text();
          return new Response(
            JSON.stringify({
              error: `Échec création tâche mockup (${createRes.status}): ${errText}`,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        const createData = await createRes.json();
        const taskKey = createData?.result?.task_key;
        if (!taskKey) {
          return new Response(
            JSON.stringify({
              error: "Pas de task_key reçue de Printful.",
              raw: createData,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        // 8. Poll for completion (up to ~60s)
        let taskResult: any;
        try {
          taskResult = await pollMockupTask(apiKey, storeId, taskKey);
        } catch (pollErr: any) {
          return new Response(
            JSON.stringify({ error: pollErr.message, taskKey }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        const mockups: any[] = taskResult?.mockups ?? [];
        if (mockups.length === 0) {
          return new Response(
            JSON.stringify({ error: "Aucun mockup généré.", taskKey }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        // 9. Map mockups to colors and download + upload to Storage
        const colorToMockupUrl = new Map<string, string>();
        for (const m of mockups) {
          const variantIds: number[] = m.variant_ids ?? [];
          const mockupUrl: string = m.mockup_url || "";
          if (!mockupUrl) continue;
          const placement: string = m.placement || "front";

          for (const vid of variantIds) {
            const hex = variantIdToColor.get(vid);
            if (hex && !colorToMockupUrl.has(hex)) {
              colorToMockupUrl.set(hex, mockupUrl);
            }
          }
        }

        if (colorToMockupUrl.size === 0) {
          return new Response(
            JSON.stringify({
              error: "Impossible d'associer les mockups aux couleurs.",
              taskKey,
              mockupCount: mockups.length,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        // 10. Ensure storage bucket exists
        try {
          await supabaseAdmin.storage.createBucket("product-mockups", {
            public: true,
          });
        } catch {
          // bucket likely already exists
        }

        // 11. Download each mockup, upload to Storage, update product
        const storageUrls: Record<string, string> = {}; // hex → storage_url
        const mockupInserts: any[] = [];

        for (const [hex, mockupUrl] of colorToMockupUrl) {
          try {
            const imgRes = await fetch(mockupUrl);
            if (!imgRes.ok) {
              console.error(
                `Failed to download mockup for ${hex}: ${imgRes.status}`,
              );
              continue;
            }
            const imgBuffer = await imgRes.arrayBuffer();
            const safeHex = hex.replace("#", "");
            const storagePath = `${body.productId}/${safeHex}.jpg`;

            const { error: uploadErr } = await supabaseAdmin.storage
              .from("product-mockups")
              .upload(storagePath, imgBuffer, {
                contentType: "image/jpeg",
                upsert: true,
              });

            if (uploadErr) {
              console.error(
                `Failed to upload mockup for ${hex}: ${uploadErr.message}`,
              );
              continue;
            }

            const { data: publicUrlData } = supabaseAdmin.storage
              .from("product-mockups")
              .getPublicUrl(storagePath);

            const storageUrl = publicUrlData?.publicUrl || "";
            if (storageUrl) {
              storageUrls[hex] = storageUrl;
              mockupInserts.push({
                product_id: body.productId,
                color: hex,
                catalog_variant_ids: uniqueVariantIds.filter(
                  (vid) => variantIdToColor.get(vid) === hex,
                ),
                mockup_url: mockupUrl,
                storage_url: storageUrl,
                placement: "front",
              });
            }
          } catch (downloadErr: any) {
            console.error(
              `Error processing mockup for ${hex}: ${downloadErr.message}`,
            );
          }
        }

        if (Object.keys(storageUrls).length === 0) {
          return new Response(
            JSON.stringify({
              error: "Échec du téléchargement et stockage des mockups.",
              taskKey,
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        // 12. Update product.variants with new images
        const existingVariants: any[] = dbProduct.variants ?? [];
        const newGallery: string[] = [];
        const newColorImages: string[] = [];

        const updatedVariants = existingVariants.map((v: any) => {
          const hex = v.color;
          const storageUrl = storageUrls[hex];
          if (storageUrl) {
            newColorImages.push(storageUrl);
            newGallery.push(storageUrl);
            return { ...v, image: storageUrl };
          }
          // Keep existing image if no new mockup for this color
          if (v.image) newGallery.push(v.image);
          return v;
        });

        const updatedGallery = [...new Set(newGallery)].slice(0, 20);
        const firstMockupUrl = Object.values(storageUrls)[0] || "";

        const updatePayload: Record<string, any> = {
          variants: updatedVariants,
          gallery:
            updatedGallery.length > 0 ? updatedGallery : dbProduct.gallery,
        };
        if (newColorImages.length > 0) {
          updatePayload.color_images = newColorImages;
        }
        // Also update the main product image so store cards show mockup
        if (firstMockupUrl) {
          updatePayload.image = firstMockupUrl;
        }

        try {
          await supabaseAdmin
            .from("products")
            .update(updatePayload)
            .eq("id", body.productId);
        } catch (updateErr: any) {
          console.error(`Failed to update product: ${updateErr.message}`);
        }

        // 13. Insert into product_mockups table
        if (mockupInserts.length > 0) {
          try {
            await supabaseAdmin.from("product_mockups").insert(mockupInserts);
          } catch (insertErr: any) {
            console.error(
              `Failed to insert mockup records: ${insertErr.message}`,
            );
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            taskKey,
            mockupsGenerated: Object.keys(storageUrls).length,
            colors: Object.keys(storageUrls),
            storageUrls,
          }),
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

          // Récupérer le size guide Printful pour ce produit catalogue
          let sizeGuideData: any = undefined;
          if (catalogProductId) {
            try {
              const sizesRes = await fetch(
                `https://api.printful.com/products/${catalogProductId}/sizes`,
              );
              if (sizesRes.ok) {
                const sizesData = await sizesRes.json();
                sizeGuideData = sizesData.result || undefined;
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

          const price = mainVariant?.retail_price
            ? parseFloat(mainVariant.retail_price)
            : null;

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
            size_guide: sizeGuideData || null,
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
