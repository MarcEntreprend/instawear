// supabase/functions/stripe-checkout/index.ts
// @ts-nocheck
// Stripe Checkout – montant RECALCULÉ côté serveur depuis les prix en base
// (produits + store_settings). Le montant envoyé par le client est ignoré.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeFetch } from "./_shared/safeUrl.ts";
import { logSafe, safeTruncate } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey, quotaFor } from "./_shared/rateLimit.ts";
import {
  fetchPrintfulShippingRates,
  normalizePrintfulRates,
} from "./_shared/printfulRates.ts";
import Stripe from "https://esm.sh/stripe@13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Rate limiting simple (en mémoire, par IP) ──────────────────────────
// P-F rate limit distribué importé depuis _shared/rateLimit.ts

// ── Prix autoritatif d'un produit (miroir de la logique du frontend) ───
function resolveUnitPrice(
  product: any,
  color: string | undefined,
  size: string | undefined,
): number {
  const now = new Date();
  const dealActive =
    !!product.deal_active &&
    (!product.deal_ends_at || new Date(product.deal_ends_at) > now) &&
    product.deal_price != null;
  const basePrice = dealActive
    ? Number(product.deal_price)
    : Number(product.price);

  if (Array.isArray(product.variants)) {
    const variant = product.variants.find(
      (v: any) => (v.color || "").toLowerCase() === (color || "").toLowerCase(),
    );
    const variantPrice = variant?.sizes?.[size]?.price;
    if (variantPrice != null) {
      if (dealActive && Number(product.price) > 0) {
        const ratio = Number(product.deal_price) / Number(product.price);
        return Number(variantPrice) * ratio;
      }
      return Number(variantPrice);
    }
  }
  return basePrice + (Number(product.size_surcharge?.[size]) || 0);
}

// ── Validation couleur/taille contre les données produit ────────────────
// Remplace les anciennes whitelists en dur (tailles habillement XS..3XL,
// couleurs hex uniquement) qui rejetaient des variantes RÉELLES et
// sélectionnables côté boutique : 4XL/5XL, tailles bébé (3-6M, 12-18M),
// pointures, One Size, couleurs nommées ("Natural", "Yellow Haze"...).
// Règle : la couleur/taille doit exister dans les variantes du produit en
// base (même matching insensible à la casse que resolveUnitPrice). Garde
// anti-injection : chaînes saines (longueur bornée, sans contrôle).
// Si le produit est introuvable, on ne valide que la forme (le total
// tombera à 0 → "Impossible de calculer le montant", comme avant).

function saneLabel(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > maxLen) return null;
  if (/[\x00-\x1F\x7F]/.test(t)) return null;
  return t;
}

function variantSelectionError(
  product: any,
  color: unknown,
  size: unknown,
): string | null {
  const hasColor = color !== undefined && color !== null && String(color).trim() !== "";
  const hasSize = size !== undefined && size !== null && String(size).trim() !== "";
  const c = hasColor ? saneLabel(color, 100) : null;
  const s = hasSize ? saneLabel(size, 20) : null;
  if (hasColor && c === null) return "Couleur invalide";
  if (hasSize && s === null) return "Taille invalide";

  if (product && (c !== null || s !== null)) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variantColors =
      variants.length > 0
        ? variants.map((vv: any) => String(vv.color || "").toLowerCase())
        : (Array.isArray(product.colors)
            ? product.colors.map((x: any) => String(x).toLowerCase())
            : []);

    let colorVariant: any = null;
    if (c !== null) {
      if (
        variantColors.length > 0 &&
        !variantColors.includes(c.toLowerCase())
      ) {
        return "Couleur indisponible pour ce produit";
      }
      colorVariant =
        variants.find(
          (vv: any) => String(vv.color || "").toLowerCase() === c.toLowerCase(),
        ) || null;
    }

    if (s !== null) {
      // Tailles candidates : celles de la variante couleur si trouvée,
      // sinon union de toutes les variantes, sinon tailles legacy.
      let candidates: string[] = [];
      if (colorVariant && colorVariant.sizes && typeof colorVariant.sizes === "object") {
        candidates = Object.keys(colorVariant.sizes);
      } else if (variants.length > 0) {
        const set = new Set<string>();
        for (const vv of variants) {
          if (vv.sizes && typeof vv.sizes === "object") {
            for (const k of Object.keys(vv.sizes)) set.add(k);
          }
        }
        candidates = [...set];
      } else if (Array.isArray(product.sizes)) {
        candidates = product.sizes.map((x: any) => String(x));
      }
      if (candidates.length > 0 && !candidates.includes(s)) {
        return "Taille indisponible pour ce produit";
      }
    }
  }
  return null;
}

// Miroir serveur de getVariantAvailability (données FRAÎCHES de la base) :
// un item ajouté quand il était dispo puis devenu indisponible (sync entre
// l'ajout panier et le paiement) ne doit JAMAIS être facturé. Le filtre
// frontend utilisait un snapshot potentiellement périmé ; l'edge tranche.
function isItemAvailableNow(product: any, color: unknown, size: unknown): boolean {
  if (!product) return false;
  const c = saneLabel(color, 100);
  const s = saneLabel(size, 20);
  if (!c || !s) return false;
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length > 0) {
    const v = variants.find(
      (vv: any) => String(vv.color || "").toLowerCase() === c.toLowerCase(),
    );
    if (!v) return false;
    const e = v.sizes?.[s];
    if (!e) return false;
    return ((e as any).stock_status || "available") === "available";
  }
  if (Array.isArray(product.sizes)) {
    return product.sizes.map((x: any) => String(x)).includes(s);
  }
  return true;
}

// ── Calcul du total d'une commande à partir de la base ──────────────────
async function computeOrderTotal(supabaseAdmin: any, orderId: string) {
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (orderError || !order) return null;

  const { data: orderItems, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (itemsError) return null;

  let subtotal = 0;
  const lineItems: any[] = [];
  let excludedCount = 0;
  for (const item of orderItems ?? []) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select(
        "price, deal_price, deal_active, deal_ends_at, variants, size_surcharge, title, image",
      )
      .eq("id", item.product_id)
      .single();

    // Exclusion serveur des items devenus indisponibles (données fraîches).
    if (
      product &&
      !isItemAvailableNow(product, item.selected_color, item.selected_size)
    ) {
      excludedCount++;
      continue;
    }

    const unitPrice = product
      ? resolveUnitPrice(product, item.selected_color, item.selected_size)
      : Number(item.unit_price);

    subtotal += unitPrice * Number(item.quantity);
    lineItems.push({
      name: item.product_title || product?.title || "Produit",
      image: item.product_image || product?.image || undefined,
      unitAmount: Math.round(unitPrice * 100),
      quantity: Number(item.quantity),
    });
  }

  // ── P-F SECURITY: Never trust client shipping_cost. Always recalculate
  //    server-side via Printful Shipping Rate API. Falls back to
  //    store_settings flat rate if Printful API fails. ─────────────────
  const isPickup =
    (order.shipping_address_address || "").toLowerCase() === "pickup";

  let shippingCost = 0;
  let shippingMethodName: string | null = null;
  let shippingDeliveryEstimate: string | null = null;

  if (!isPickup) {
    // Check free shipping threshold first
    const { data: storeSettings } = await supabaseAdmin
      .from("store_settings")
      .select("free_shipping_threshold, shipping_cost, store_id")
      .eq("id", true)
      .single();
    const threshold = storeSettings
      ? Number(storeSettings.free_shipping_threshold)
      : 0;

    if (threshold > 0 && subtotal >= threshold) {
      // Free shipping — threshold met
      shippingCost = 0;
      shippingMethodName = "Free Shipping";
      shippingDeliveryEstimate = null;
    } else {
      // Fetch real rates from Printful
      try {
        const { data: podSettings } = await supabaseAdmin
          .from("pod_settings")
          .select("api_key, store_id")
          .eq("id", "pod-main")
          .maybeSingle();

        if (podSettings?.api_key && podSettings?.store_id) {
          // Build variant items for shipping rate lookup
          const shippingItems: { variant_id: string; quantity: number }[] = [];
          for (const item of orderItems ?? []) {
            const { data: product } = await supabaseAdmin
              .from("products")
              .select("variants")
              .eq("id", item.product_id)
              .single();

            if (product?.variants && Array.isArray(product.variants)) {
              const mv = product.variants.find(
                (v: any) =>
                  v.color?.toLowerCase() ===
                    item.selected_color?.toLowerCase() &&
                  v.sizes &&
                  v.sizes[item.selected_size] !== undefined,
              );
              if (mv) {
                const vid =
                  mv.external_variant_id ||
                  mv.sync_variant_id ||
                  mv.variant_id;
                if (vid) {
                  shippingItems.push({
                    variant_id: String(vid),
                    quantity: Number(item.quantity),
                  });
                }
              }
            }
          }

          if (shippingItems.length > 0) {
            const recipient: any = {
              country_code: order.shipping_address_country || "US",
            };
            if (order.shipping_address_state_code)
              recipient.state_code = order.shipping_address_state_code;
            if (order.shipping_address_city)
              recipient.city = order.shipping_address_city;
            if (order.shipping_address_zip)
              recipient.zip = order.shipping_address_zip;
            if (order.shipping_address_address)
              recipient.address1 = order.shipping_address_address;

            // Repli automatique sync_variant_id -> variant_id (cf. _shared/printfulRates.ts)
            const pf = await fetchPrintfulShippingRates({
              apiKey: podSettings.api_key,
              storeId: podSettings.store_id,
              recipient,
              items: shippingItems,
            });

            if (pf.ok) {
              const rates = normalizePrintfulRates(pf.rates);
              if (rates.length > 0) {
                // Pick the cheapest rate
                const cheapest = rates.reduce((a: any, b: any) =>
                  a.rate <= b.rate ? a : b,
                );
                shippingCost = cheapest.rate || 0;
                shippingMethodName = cheapest.name || "Standard Shipping";
                const minD = cheapest.minDeliveryDays;
                const maxD = cheapest.maxDeliveryDays;
                if (minD && maxD) {
                  shippingDeliveryEstimate = `${minD}-${maxD} business days`;
                } else if (minD) {
                  shippingDeliveryEstimate = `${minD} business days`;
                }
              }
            } else {
              console.warn(
                "Printful shipping rates API error, falling back to store_settings",
                logSafe(pf.error),
              );
            }
          }
        }
      } catch (err) {
        console.warn("Shipping rate fetch failed, falling back:", err);
      }

      // Fallback: if Printful didn't return a rate, use store_settings flat rate
      if (shippingCost === 0 && !shippingMethodName) {
        shippingCost = storeSettings ? Number(storeSettings.shipping_cost) : 0;
        shippingMethodName = shippingCost > 0 ? "Flat Rate" : null;
      }
    }
  }

  return {
    order,
    lineItems,
    subtotal,
    excludedCount,
    shippingCost,
    shippingMethodName,
    shippingDeliveryEstimate,
    total: subtotal + shippingCost,
  };
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      const path = "stripe-checkout";
      const key = rateLimitKey(req, path);
      if (await isRateLimited(req, key)) {
        return new Response(JSON.stringify({ error: "Trop de requetes." }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
          status: 429,
        });
      }

      const stripe = new Stripe(
        Deno.env.get("STRIPE_SECRET_KEY_TEST") ||
          Deno.env.get("STRIPE_SECRET_KEY")!,
        { apiVersion: "2023-10-16" },
      );

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // P-A (1+7) payload size limit (100KB) + validation
      const rawBody = await req.text();
      if (rawBody.length > 100 * 1024) {
        return new Response(
          JSON.stringify({ error: "Payload trop volumineux" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 413,
          },
        );
      }
      let body: any = {};
      try {
        body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        body = {};
      }
      const {
        action,
        orderId,
        lineItems,
        customerEmail,
        successUrl,
        cancelUrl,
      } = body;

      // P-A (7) validation orderId/email si présents
      const bodyOrderId = (body as any).orderId;
      if (
        bodyOrderId &&
        !/^ORD-[0-9]{4}-[0-9]{6}$/.test(String(bodyOrderId).trim())
      ) {
        return new Response(JSON.stringify({ error: "orderId invalide" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      if (
        (body as any).customerEmail &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          String((body as any).customerEmail).trim(),
        )
      ) {
        return new Response(JSON.stringify({ error: "Email invalide" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // ── Devise depuis store_settings ──
      const { data: storeSettings } = await supabaseAdmin
        .from("store_settings")
        .select("currency")
        .eq("id", true)
        .single();
      const currency = (storeSettings?.currency || "usd")
        .toString()
        .toLowerCase();

      // ── PaymentIntent pour carte directe ──
      // Montant recalculé côté serveur depuis les produits en base. P-A validation stricte.
      if (action === "payment-intent") {
        let total = 0;
        // Items devenus indisponibles depuis l'ajout panier (données fraîches
        // DB) : exclus du montant, comptés pour info frontend. Jamais
        // facturé = jamais de cassure côté client.
        let excludedCount = 0;
        const items: any[] = Array.isArray(body.items) ? body.items : [];
        // Cache produits (évite de re-fetcher pour le calcul du total).
        const productCache = new Map<string, any>();
        const getProductCached = async (productId: unknown) => {
          const key = String(productId || "");
          if (!key) return null;
          if (productCache.has(key)) return productCache.get(key);
          const { data } = await supabaseAdmin
            .from("products")
            .select(
              "price, deal_price, deal_active, deal_ends_at, variants, colors, sizes, size_surcharge",
            )
            .eq("id", key)
            .maybeSingle();
          productCache.set(key, data || null);
          return data || null;
        };
        // P-A (7) validation positive des items carte directe.
        // Couleur/taille validées contre les variantes RÉELLES du produit
        // (jamais de whitelist en dur : 5XL, tailles bébé, noms de couleurs
        // et pointures passent si le produit les propose).
        for (const it of items) {
          const q = Number(it.quantity);
          if (!Number.isInteger(q) || q <= 0 || q > 100) {
            return new Response(
              JSON.stringify({ error: "Quantité invalide" }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              },
            );
          }
          const product = await getProductCached((it as any).productId);
          const selError = variantSelectionError(
            product,
            (it as any).selectedColor,
            (it as any).selectedSize,
          );
          if (selError) {
            return new Response(JSON.stringify({ error: selError }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            });
          }
        }

        if (orderId) {
          const computed = await computeOrderTotal(supabaseAdmin, orderId);
          if (computed) total = computed.total;
        }
        if (total === 0 && items.length > 0) {
          // Exclusion serveur des items devenus indisponibles (données
          // fraîches — voir isItemAvailableNow).
          for (const item of items) {
            // Produit déjà en cache (validation ci-dessus) : pas de requête.
            const product = await getProductCached(item.productId);
            if (
              product &&
              !isItemAvailableNow(product, item.selectedColor, item.selectedSize)
            ) {
              excludedCount++;
              continue;
            }
            if (product) {
              const unitPrice = resolveUnitPrice(
                product,
                item.selectedColor,
                item.selectedSize,
              );
              total += unitPrice * Number(item.quantity);
            }
          }
        }
        if (total <= 0) {
          return new Response(
            JSON.stringify({ error: "Impossible de calculer le montant" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total * 100),
          currency,
          payment_method_types: ["card"],
          metadata: { orderId: orderId || "" },
        });

        return new Response(
          JSON.stringify({ clientSecret: paymentIntent.client_secret, excludedCount }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ── Session Stripe Checkout ──
      if (!orderId || !successUrl || !cancelUrl) {
        return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      // P-A (7) whitelist URLs (évite open redirect)
      try {
        const sUrl = new URL(successUrl);
        const cUrl = new URL(cancelUrl);
        const okHosts = ["instawear.vercel.app", "localhost", "127.0.0.1"];
        if (
          !okHosts.some(
            (h) => sUrl.hostname === h || sUrl.hostname.endsWith("." + h),
          ) ||
          !okHosts.some(
            (h) => cUrl.hostname === h || cUrl.hostname.endsWith("." + h),
          )
        ) {
          return new Response(
            JSON.stringify({ error: "URL de redirection non autorisée" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }
      } catch {
        return new Response(JSON.stringify({ error: "URL invalide" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      /**
       * Dans l'Edge Function stripe-checkout/index.ts, la liste blanche anti-open-redirect
       * n'autorise que instawear.vercel.app, localhost et 127.0.0.1 :
       * ```const okHosts = ["instawear.vercel.app", "localhost", "127.0.0.1"];```
       *Si tu testes un jour ce flux depuis une URL de preview Vercel (type instawear-git-retouches-2-xxx.vercel.app), la création de session Stripe sera rejetée avec un 400 avant même d'atteindre Stripe — pas le bug d'aujourd'hui (tu as bien atteint et payé sur Stripe, donc ce test-ci passait), mais à garder en tête si un futur test "ne fait rien du tout dès le clic sur Stripe Checkout".
       * **/

      const computed = await computeOrderTotal(supabaseAdmin, orderId);
      if (!computed || computed.lineItems.length === 0) {
        return new Response(
          JSON.stringify({ error: "Commande ou articles introuvables" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          },
        );
      }

      const serverLineItems = computed.lineItems.map((item: any) => ({
        price_data: {
          currency,
          product_data: {
            name: item.name,
            images: item.image ? [item.image] : [],
          },
          unit_amount: item.unitAmount,
        },
        quantity: item.quantity,
      }));

      if (computed.shippingCost > 0) {
        serverLineItems.push({
          price_data: {
            currency,
            product_data: {
              name: "Shipping",
              images: [],
            },
            unit_amount: Math.round(computed.shippingCost * 100),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: customerEmail || undefined,
        line_items: serverLineItems,
        metadata: { orderId },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      // Synchroniser la commande avec le montant autoritatif calculé
      await supabaseAdmin
        .from("orders")
        .update({
          external_order_id: session.id,
          status: "pending",
          total_amount: computed.total,
          shipping_cost: computed.shippingCost,
          shipping_method_name: computed.shippingMethodName,
          shipping_delivery_estimate: computed.shippingDeliveryEstimate,
        })
        .eq("id", orderId);

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
