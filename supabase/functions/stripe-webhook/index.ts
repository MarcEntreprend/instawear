// supabase/functions/stripe-webhook/index.ts
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
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
      const signature = req.headers.get("stripe-signature")!;

      const body = await req.text();
      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        return new Response(
          `Webhook signature verification failed: ${err.message}`,
          { status: 400 },
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get("PROJECT_URL")!,
        Deno.env.get("SERVICE_ROLE_KEY")!,
      );

      // Traiter uniquement les paiements réussis
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await supabaseAdmin
            .from("orders")
            .update({ status: "paid", external_order_id: session.id })
            .eq("id", orderId);

          // Envoyer vers Printful (mode draft) si pas déjà fait
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();

          if (order) {
            // Appeler Printful via l'Edge Function existante
            await fetch(
              `${Deno.env.get("PROJECT_URL")}/functions/v1/create-printful-order`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: Deno.env.get("SERVICE_ROLE_KEY")!,
                },
                body: JSON.stringify({ orderId }),
              },
            );
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
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
