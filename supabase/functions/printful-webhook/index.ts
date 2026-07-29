// supabase/functions/printful-webhook/index.ts
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS")
      return new Response("ok", { headers: corsHeaders });

    try {
      const body = await req.json();
      const eventType = body?.type;
      const eventData = body?.data;

      if (!eventType || !eventData) {
        return new Response(JSON.stringify({ error: "Invalid payload" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseAdmin = createClient(
        Deno.env.get("PROJECT_URL")!,
        Deno.env.get("SERVICE_ROLE_KEY")!,
      );

      // Récupérer la commande par external_order_id (Printful order ID)
      const printfulOrderId = eventData.order?.id?.toString();
      if (!printfulOrderId) {
        return new Response(JSON.stringify({ error: "Missing order id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("id, client_email, status, notes")
        .eq("external_order_id", printfulOrderId)
        .maybeSingle();

      if (orderError || !order) {
        console.warn(`Order not found for Printful id ${printfulOrderId}`);
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let newStatus = order.status;
      let emailType = "";
      let trackingNumber = "";
      let notes = order.notes || "";

      switch (eventType) {
        case "package_shipped": {
          newStatus = "shipped";
          emailType = "shipped";
          const shipment = eventData.shipment;
          if (shipment?.tracking_number) {
            trackingNumber = shipment.tracking_number;
            notes += `\nTracking: ${trackingNumber} (carrier: ${shipment.carrier || "N/A"})`;
          }
          break;
        }
        case "order_canceled":
          newStatus = "cancelled";
          emailType = "cancelled";
          break;
        case "order_failed":
          newStatus = "failed";
          emailType = "failed";
          break;
        case "order_updated": {
          // On peut éventuellement gérer "delivered" ici si Printful l'envoie
          // Pour l'instant, on ne change pas le statut automatiquement
          break;
        }
        default:
          console.log(`Unhandled event type: ${eventType}`);
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
      }

      // Mise à jour de la commande
      if (newStatus !== order.status) {
        await supabaseAdmin
          .from("orders")
          .update({ status: newStatus, notes })
          .eq("id", order.id);
      } else if (trackingNumber) {
        // Même si le statut ne change pas, on peut mettre à jour le tracking
        await supabaseAdmin.from("orders").update({ notes }).eq("id", order.id);
      }

      // Envoyer l'email si nécessaire
      if (emailType && order.client_email) {
        const emailHtml = buildEmailHtml(emailType, order.id, trackingNumber);
        await fetch(`${Deno.env.get("PROJECT_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: Deno.env.get("SERVICE_ROLE_KEY")!,
          },
          body: JSON.stringify({
            to: order.client_email,
            subject: getEmailSubject(emailType),
            html: emailHtml,
          }),
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};

function getEmailSubject(type: string): string {
  switch (type) {
    case "shipped":
      return "📦 Your order has been shipped!";
    case "cancelled":
      return "❌ Your order has been cancelled";
    case "failed":
      return "⚠️ Issue with your order";
    default:
      return "Order update";
  }
}

function buildEmailHtml(
  type: string,
  orderId: string,
  tracking?: string,
): string {
  const trackingSection = tracking
    ? `<p><strong>Tracking number:</strong> ${tracking}</p>`
    : "";
  switch (type) {
    case "shipped":
      return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:800;color:#1a1916">Your order has been shipped! 📦</h1>
        <p>Order <strong>${orderId}</strong> is on its way.</p>
        ${trackingSection}
        <p>Thank you for shopping with InstaWear.</p>
      </div>`;
    case "cancelled":
      return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:800;color:#1a1916">Order cancelled ❌</h1>
        <p>Order <strong>${orderId}</strong> has been cancelled.</p>
        <p>If you have questions, contact our support.</p>
      </div>`;
    case "failed":
      return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:24px;font-weight:800;color:#1a1916">Issue with your order ⚠️</h1>
        <p>We encountered a problem with order <strong>${orderId}</strong>.</p>
        <p>Our team will contact you shortly.</p>
      </div>`;
    default:
      return `<p>Order ${orderId} status update.</p>`;
  }
}
