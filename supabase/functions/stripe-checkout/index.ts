// supabase/functions/stripe-checkout/index.ts
// @ts-nocheck
// Stripe Checkout – montant RECALCULÉ côté serveur depuis les prix en base
// (produits + store_settings). Le montant envoyé par le client est ignoré.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Rate limiting simple (en mémoire, par IP) ──────────────────────────
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(req: Request): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

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
  for (const item of orderItems ?? []) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select(
        "price, deal_price, deal_active, deal_ends_at, variants, size_surcharge, title, image",
      )
      .eq("id", item.product_id)
      .single();

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

  // Livraison : retrait → 0 ; sinon coût enregistré sur la commande,
  // avec repli sur store_settings si absent.
  const isPickup =
    (order.shipping_address_address || "").toLowerCase() === "pickup";
  let shippingCost = 0;
  if (!isPickup) {
    shippingCost =
      order.shipping_cost != null && Number(order.shipping_cost) > 0
        ? Number(order.shipping_cost)
        : 0;
    if (shippingCost === 0) {
      const { data: storeSettings } = await supabaseAdmin
        .from("store_settings")
        .select("free_shipping_threshold, shipping_cost")
        .eq("id", true)
        .single();
      const threshold = storeSettings
        ? Number(storeSettings.free_shipping_threshold)
        : 0;
      if (!(threshold > 0 && subtotal >= threshold)) {
        shippingCost = storeSettings ? Number(storeSettings.shipping_cost) : 0;
      }
    }
  }

  return {
    order,
    lineItems,
    subtotal,
    shippingCost,
    total: subtotal + shippingCost,
  };
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    try {
      if (rateLimited(req)) {
        return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        return new Response(JSON.stringify({ error: "Payload trop volumineux" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 413,
        });
      }
      let body: any = {};
      try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }
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
      if (bodyOrderId && !/^ORD-[0-9]{4}-[0-9]{6}$/.test(String(bodyOrderId).trim())) {
        return new Response(JSON.stringify({ error: "orderId invalide" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }
      if ((body as any).customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String((body as any).customerEmail).trim())) {
        return new Response(JSON.stringify({ error: "Email invalide" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
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
        const items: any[] = Array.isArray(body.items) ? body.items : [];
        // P-A (7) validation positive des items carte directe
        for (const it of items) {
          const q = Number(it.quantity);
          if (!Number.isInteger(q) || q <= 0 || q > 100) {
            return new Response(JSON.stringify({ error: "Quantité invalide" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
          }
          if (it.selectedColor && !/^#[0-9a-fA-F]{6}$/.test(String(it.selectedColor).trim())) {
            return new Response(JSON.stringify({ error: "Couleur invalide" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
          }
          if (it.selectedSize && !/^(XS|S|M|L|XL|XXL|2XL|3XL)$/i.test(String(it.selectedSize).trim())) {
            return new Response(JSON.stringify({ error: "Taille invalide" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
          }
        }

        if (orderId) {
          const computed = await computeOrderTotal(supabaseAdmin, orderId);
          if (computed) total = computed.total;
        }
        if (total === 0 && items.length > 0) {
          for (const item of items) {
            const { data: product } = await supabaseAdmin
              .from("products")
              .select(
                "price, deal_price, deal_active, deal_ends_at, variants, size_surcharge",
              )
              .eq("id", item.productId)
              .single();
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
          JSON.stringify({ clientSecret: paymentIntent.client_secret }),
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
        if (!okHosts.some((h) => sUrl.hostname === h || sUrl.hostname.endsWith("." + h)) || !okHosts.some((h) => cUrl.hostname === h || cUrl.hostname.endsWith("." + h))) {
          return new Response(JSON.stringify({ error: "URL de redirection non autorisée" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
        }
      } catch {
        return new Response(JSON.stringify({ error: "URL invalide" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
      }

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
