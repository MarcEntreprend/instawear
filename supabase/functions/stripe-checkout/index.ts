// supabase/functions/stripe-checkout/index.ts
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
      const { orderId, lineItems, customerEmail, successUrl, cancelUrl } = body;

      if (!orderId || !lineItems || !successUrl || !cancelUrl) {
        return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Créer la session Stripe Checkout
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
            unit_amount: item.unitAmount, // en cents
          },
          quantity: item.quantity,
        })),
        metadata: {
          orderId,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      // Optionnel : enregistrer l'ID de session dans la commande
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
