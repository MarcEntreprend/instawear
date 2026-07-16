// supabase/functions/stripe-webhook/index.ts
// @ts-nocheck
// Webhook Stripe – met à jour le statut, envoie Telegram + Email, puis Printful

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Helpers (versions Deno, pas de window) ──────────────────────────

function sendTelegramServer(
  orderId: string,
  name: string,
  phone: string,
  email: string,
  address: string,
  city: string,
  zip: string,
  country: string,
  items: any[],
  total: number,
  currency: string,
) {
  const itemsStr = items
    .map(
      (item: any) =>
        `- ${item.product_title} (${item.selected_size}, ${item.selected_color}) ×${item.quantity} = ${(item.unit_price * item.quantity).toFixed(2)} ${currency}`,
    )
    .join("\n");

  const msg =
    `🛒 *INSTAWEAR ORDER*\n\n` +
    `🔑 *Order #:* ${orderId}\n\n` +
    `*Customer:* ${name}\n` +
    `*Phone:* ${phone}\n` +
    `*Email:* ${email}\n` +
    `*Address:* ${address}, ${city} ${zip}, ${country}\n` +
    `\n📦 *Items:*\n${itemsStr}\n\n` +
    `💰 *Total:* ${total.toFixed(2)} ${currency}`;

  const url = `https://t.me/marcrubenmacean?text=${encodeURIComponent(msg)}`;
  fetch(url).catch(() => {});
}

function sendEmailServer(
  orderId: string,
  name: string,
  email: string,
  phone: string,
  address: string,
  city: string,
  zip: string,
  country: string,
  stateCode: string,
  items: any[],
  total: number,
  currency: string,
) {
  const itemsHtml = items
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <table><tr>
          <td style="width: 60px; vertical-align: top;">
            <img src="${item.product_image || "https://instawear.vercel.app/Instawear-missing-item.svg"}" style="width: 52px; height: 52px; border-radius: 8px; object-fit: cover;">
          </td>
          <td style="vertical-align: top; padding-left: 12px;">
            <p style="margin: 0; font-weight: 600; font-size: 14px;">${item.product_title}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #888;">
              Color: ${item.selected_color} · Size: ${item.selected_size} · Qty: ${item.quantity}
            </p>
          </td>
          <td style="vertical-align: top; text-align: right; font-weight: 700; font-size: 14px; white-space: nowrap;">
            ${(item.unit_price * item.quantity).toFixed(2)} ${currency}
          </td>
        </tr></table>
      </td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#000;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#a3a3a3;margin:4px 0 0;font-size:14px;">We're getting your order ready!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Order confirmed 🎉</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${name}</strong>,<br><br>Thank you for shopping with us. Your order <strong>${orderId}</strong> has been confirmed. We'll let you know as soon as it ships.</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${itemsHtml}
<tr><td style="padding-top:16px;text-align:right;font-size:16px;font-weight:700;">Order total: ${total.toFixed(2)} ${currency}</td></tr></table>
<a href="https://instawear.vercel.app/?order=success&id=${orderId}" style="display:inline-block;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
<div style="margin-top:24px;padding:16px;background:#f9fafb;border-radius:8px;">
<p style="margin:0 0 8px;font-weight:600;font-size:13px;">Ship to:</p>
<p style="margin:0;font-size:13px;color:#555;">${address}<br>${city}, ${stateCode ? stateCode + ", " : ""}${zip}<br>${country}<br>${phone ? phone + "<br>" : ""}${email}</p>
</div>
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;line-height:1.6;">
<p style="margin:0 0 8px;">This email was sent to <strong>${email}</strong> for your recent purchase at <a href="https://instawear.vercel.app" style="color:#FF5C35;text-decoration:none;">instawear.vercel.app</a></p>
<p style="margin:0;">InstaWear · 123 Main Street, Doral, FL 10001<br>© 2026 InstaWear Inc. All rights reserved.</p>
</div></div></body></html>`;

  const apiKey = Deno.env.get("RESEND_API_KEY")!;
  const fromEmail =
    Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev";

  fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: `Order ${orderId} confirmed!`,
      html,
    }),
  }).catch(console.error);
}

// ── Main handler ─────────────────────────────────────────────────────

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
        event = await stripe.webhooks.constructEventAsync(
          body,
          signature,
          webhookSecret,
        );
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

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (orderId) {
          await supabaseAdmin
            .from("orders")
            .update({ status: "paid", external_order_id: session.id })
            .eq("id", orderId);

          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("*")
            .eq("id", orderId)
            .single();

          if (order) {
            const { data: items } = await supabaseAdmin
              .from("order_items")
              .select("*")
              .eq("order_id", orderId);

            const currencySymbol =
              order.shipping_address_country === "US" ? "$" : "€";

            // 1. Telegram
            sendTelegramServer(
              orderId,
              order.client_name || "Client",
              order.shipping_address_phone || "",
              order.client_email || "",
              order.shipping_address_address || "",
              order.shipping_address_city || "",
              order.shipping_address_zip || "",
              order.shipping_address_country || "US",
              items ?? [],
              order.total_amount,
              currencySymbol,
            );

            // 2. Email client
            sendEmailServer(
              orderId,
              order.client_name || "Client",
              order.client_email || "",
              order.shipping_address_phone || "",
              order.shipping_address_address || "",
              order.shipping_address_city || "",
              order.shipping_address_zip || "",
              order.shipping_address_country || "US",
              order.shipping_address_state_code || "",
              items ?? [],
              order.total_amount,
              currencySymbol,
            );

            // 3. Printful
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
