// supabase/functions/stripe-checkout/index.ts
// @ts-nocheck

// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13";

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
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY_TEST")!, {
        apiVersion: "2023-10-16",
      });

      const supabaseAdmin = createClient(
        Deno.env.get("PROJECT_URL")!,
        Deno.env.get("SERVICE_ROLE_KEY")!,
      );

      const body = await req.json().catch(() => ({}));
      const {
        action,
        orderId,
        lineItems,
        customerEmail,
        successUrl,
        cancelUrl,
        amount,
        currency,
      } = body;

      // ── Nouveau : PaymentIntent pour carte directe ──
      if (action === "payment-intent") {
        if (!amount || !currency) {
          return new Response(
            JSON.stringify({ error: "amount et currency requis" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
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

      // ── Comportement existant : Stripe Checkout ──
      if (!orderId || !lineItems || !successUrl || !cancelUrl) {
        return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: customerEmail || undefined,
        line_items: lineItems.map((item: any) => ({
          price_data: {
            currency: item.currency || "usd",
            product_data: {
              name: item.name,
              images: item.image ? [item.image] : [],
            },
            unit_amount: item.unitAmount,
          },
          quantity: item.quantity,
        })),
        metadata: { orderId },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      await supabaseAdmin
        .from("orders")
        .update({ external_order_id: session.id, status: "pending" })
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
