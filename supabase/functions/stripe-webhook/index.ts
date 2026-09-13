// supabase/functions/stripe-webhook/index.ts

// @ts-nocheck
// Webhook Stripe réel : vérifie la signature, puis gère
// checkout.session.completed → commande "paid" + notifications.
// Idempotent : une commande déjà "paid" n'est jamais retraitée.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeFetch } from "./_shared/safeUrl.ts";
import { logSafe, safeTruncate } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey, quotaFor } from "./_shared/rateLimit.ts";
import { reportError } from "./_shared/opsUtils.ts";
import Stripe from "https://esm.sh/stripe@13";

// CORS restreint : ce webhook est un endpoint serveur→serveur (Stripe).
// Seules les origines de l'application peuvent l'appeler depuis un
// navigateur ; les autres origines ne reçoivent pas d'en-tête CORS.
const ALLOWED_ORIGINS = [
  "https://instawear.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    };
  }
  return {};
}

// Helper Telegram (API Bot)
async function sendTelegramServer(
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
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID")!;
  if (!token || !chatId) {
    console.error("Telegram secrets missing");
    return;
  }

  const itemsStr = items
    .map(
      (item: any) =>
        `- ${item.product_title} (${item.selected_size}, ${item.selected_color}) ×${item.quantity} = ${(item.unit_price * item.quantity).toFixed(2)} ${currency}`,
    )
    .join("\n");

  const text =
    `🛒 *INSTAWEAR ORDER*\n\n` +
    `🔑 *Order #:* ${orderId}\n\n` +
    `*Customer:* ${name}\n` +
    `*Phone:* ${phone}\n` +
    `*Email:* ${email}\n` +
    `*Address:* ${address}, ${city} ${zip}, ${country}\n` +
    `\n📦 *Items:*\n${itemsStr}\n\n` +
    `💰 *Total:* ${total.toFixed(2)} ${currency}`;

  const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
  const tgBody = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
  });

  try {
    const tgRes = await fetch(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: tgBody,
    });
    if (!tgRes.ok) {
      console.error("Telegram send error:", tgRes.status, await tgRes.text());
    }
  } catch (err) {
    console.error("Telegram fetch error:", err);
  }
}

// ── Helper Email (Resend) ───────────────────────────────────────────────
// Destinataire = adresse du checkout (order.client_email), guest ou loggé
// sans différence : on ne gate JAMAIS sur client_id ici (l'in-app seule en
// dépend, via le trigger SQL). Best-effort : renvoie false au lieu de
// lever — le webhook ne doit jamais échouer à cause de Resend (mode test
// 403, adresse invalide, réseau). Ne logge que le domaine, jamais
// l'adresse complète (PII).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "?";
}
async function sendEmailServer(
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
  shippingCost: number,
  shippingMethodName?: string | null,
  shippingDeliveryEstimate?: string | null,
): Promise<boolean> {
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

  const subtotal = items.reduce(
    (sum: number, item: any) => sum + item.unit_price * item.quantity,
    0,
  );

  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#000;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#fff;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#a3a3a3;margin:4px 0 0;font-size:14px;">We're getting your order ready!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Order confirmed 🎉</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${name}</strong>,<br><br>Thank you for shopping with us. Your order <strong>${orderId}</strong> has been confirmed. We'll let you know as soon as it ships.</p>
<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
  ${itemsHtml}
  <tr>
    <td colspan="2" style="padding-top:16px;text-align:right;font-size:13px;color:#888;">
      Subtotal: ${subtotal.toFixed(2)} ${currency}
    </td>
  </tr>
  <tr>
    <td colspan="2" style="text-align:right;font-size:13px;color:#888;">
      Shipping${shippingMethodName ? ` (${shippingMethodName})` : ""}: ${shippingCost === 0 ? "Free" : `${shippingCost.toFixed(2)} ${currency}`}
    </td>
  </tr>
  ${shippingDeliveryEstimate ? `<tr>
    <td colspan="2" style="text-align:right;font-size:11px;color:#aaa;">
      Est. delivery: ${shippingDeliveryEstimate}
    </td>
  </tr>` : ""}
  <tr>
    <td colspan="2" style="padding-top:8px;text-align:right;font-size:16px;font-weight:700;color:#1a1a1a;">
      Order total: ${total.toFixed(2)} ${currency}
    </td>
  </tr>
</table>
<a href="https://instawear.vercel.app/?order=${encodeURIComponent(orderId)}" style="display:inline-block;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
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

  const dest = (email || "").trim();
  if (!EMAIL_RE.test(dest)) {
    console.warn(
      `[stripe-webhook] confirmation ${logSafe(orderId)} ignorée : adresse checkout invalide`,
    );
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [dest],
        subject: `Order ${orderId} confirmed!`,
        html,
      }),
    });
    if (!res.ok) {
      // 403 mode test Resend, domaine non vérifié, adresse rejetée :
      // attendu en dev, jamais fatal (le retry Stripe ne changerait rien).
      console.warn(
        `[stripe-webhook] confirmation ${logSafe(orderId)} non remise (domaine ${logSafe(emailDomain(dest))}, HTTP ${res.status})`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(
      `[stripe-webhook] confirmation ${logSafe(orderId)} erreur réseau:`,
      logSafe(err),
    );
    return false;
  }
}

// ── Ensemble partagé "commande payée" ─────────────────────────────────────
// Point d'entrée UNIQUE pour TOUS les moyens de paiement (hosted Stripe
// Phase 1, carte directe Phase 5, futurs moyens ensuite) : une seule
// transition paid, un seul contrôle montant, une seule idempotence, un
// seul ordre d'effets (Telegram → email client → Printful → email admin).
// Choix stabilité/sécu (doc 10-Security) : pas de duplication par canal,
// pas de montant venu du client (l'edge compare au total autoritatif en
// base), self-calls en service_role, chaque effet best-effort isolé.
// Retourne "paid" | "duplicate" (ne lève que sur commande introuvable,
// gérée en 404 par l'appelant).
async function handlePaidOrder(
  supabaseAdmin: any,
  orderId: string,
  externalId: string,
  opts: { expectedAmountCents?: number | null } = {},
): Promise<"paid" | "duplicate"> {
  const { data: existing } = await supabaseAdmin
    .from("orders")
    .select(
      "status, external_order_id, total_amount, shipping_cost, shipping_method_name, shipping_delivery_estimate",
    )
    .eq("id", orderId)
    .single();
  if (!existing) throw new Error("Commande introuvable");

  // Idempotence : Stripe retente tant que pas 2xx — ne jamais retraiter
  // une commande déjà payée avec le même identifiant externe.
  if (
    existing.status === "paid" &&
    existing.external_order_id === externalId
  ) {
    return "duplicate";
  }

  // Montant autoritatif en base (calculé serveur à la création checkout) :
  // tout écart = 400, jamais de marquage paid.
  if (opts.expectedAmountCents != null) {
    const expectedAmount = Math.round(Number(existing.total_amount || 0) * 100);
    if (expectedAmount > 0 && opts.expectedAmountCents !== expectedAmount) {
      throw new Error(
        `Montant incohérent: ${opts.expectedAmountCents} != ${expectedAmount}`,
      );
    }
  }

  await supabaseAdmin
    .from("orders")
    .update({ status: "paid", external_order_id: externalId })
    .eq("id", orderId);

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (!order) return "paid";

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  // Symbole depuis les settings boutique (source de vérité),
  // jamais deviné depuis le pays de livraison.
  const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    BRL: "R$",
    CAD: "CA$",
    CHF: "CHF",
    JPY: "¥",
    MXN: "MX$",
    AUD: "A$",
  };
  let currencyCode = "USD";
  let currencySymbol = "$";
  try {
    const { data: ss } = await supabaseAdmin
      .from("store_settings")
      .select("currency")
      .eq("id", true)
      .maybeSingle();
    currencyCode = String((ss as any)?.currency || "USD").toUpperCase();
    currencySymbol = CURRENCY_SYMBOLS[currencyCode] || "$";
  } catch {}

  // 1. Telegram (API Bot, serveur)
  try {
    await sendTelegramServer(
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
  } catch (err) {
    console.error(`[stripe-webhook] telegram ${logSafe(orderId)}:`, logSafe(err));
  }

  // 2. Email client vers l'adresse du checkout (guest = loggé).
  await sendEmailServer(
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
    order.shipping_cost || 0,
    order.shipping_method_name,
    order.shipping_delivery_estimate,
  );

  // 3. Printful (transmission production, best-effort : l'admin peut
  // renvoyer depuis OrdersPage si 502).
  try {
    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-printful-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        },
        body: JSON.stringify({ orderId }),
      },
    );
  } catch (err) {
    console.error(`[stripe-webhook] printful ${logSafe(orderId)}:`, logSafe(err));
  }

  // 4. Email admin (doublon du récap Telegram) : garanti côté serveur
  // (le fire-and-forget client meurt à la redirection Stripe).
  // Best-effort : n'échoue jamais le webhook.
  try {
    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-order-notify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        },
        body: JSON.stringify({
          orderId,
          name: order.client_name || "",
          phone: order.shipping_address_phone || "",
          email: order.client_email || "",
          reception: "livraison",
          address: order.shipping_address_address || "",
          city: order.shipping_address_city || "",
          zip: order.shipping_address_zip || "",
          country: order.shipping_address_country || "",
          items: (items ?? []).map((it: any) => ({
            title: it.product_title || "Item",
            size: it.selected_size || "",
            color: it.selected_color || "",
            quantity: it.quantity,
            price: it.unit_price,
          })),
          total: Number(order.total_amount) || 0,
          currency: currencyCode,
        }),
      },
    );
  } catch {}
  return "paid";
}

// ── Main handler ────────────────────────────────────────────────────────
export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: getCorsHeaders(req) });
    }

    try {
      if (await isRateLimited(req, rateLimitKey(req, "stripe-webhook"))) {
        return new Response(JSON.stringify({ error: "Trop de requetes." }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "Retry-After": "60" },
          status: 429,
        });
      }
      // Même fallback de clé que stripe-checkout (TEST d'abord, sinon PROD).
      const stripe = new Stripe(
        Deno.env.get("STRIPE_SECRET_KEY_TEST") ||
          Deno.env.get("STRIPE_SECRET_KEY")!,
        { apiVersion: "2023-10-16" },
      );
      const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
      const signature = req.headers.get("stripe-signature")!;

      if (!signature) {
        return new Response(JSON.stringify({ error: "Signature manquante" }), {
          status: 400,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        });
      }

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
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

        if (!orderId) {
          return new Response(JSON.stringify({ error: "orderId manquant" }), {
            status: 400,
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          });
        }

        // Voie hosted Stripe (Phase 1) : ensemble partagé handlePaidOrder
        // (idempotence + contrôle montant + Telegram + email client vers
        // l'adresse du checkout + Printful + email admin). Montant
        // incohérent → 400 (on ne marque jamais paid à tort) ; commande
        // absente → 404. Les retries Stripe reçoivent 200 en cas de
        // doublon (géré dans le helper).
        try {
          await handlePaidOrder(supabaseAdmin, orderId, session.id, {
            expectedAmountCents: session.amount_total ?? null,
          });
        } catch (err: any) {
          const msg = String(err?.message || err);
          const status = msg.startsWith("Montant incohérent")
            ? 400
            : msg === "Commande introuvable"
              ? 404
              : 500;
          return new Response(JSON.stringify({ error: msg }), {
            status,
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          });
        }
      }

      // ── Carte directe (PaymentIntent, sans Checkout Session) ──────────
      // PHASE 5 : remplacer tout ce bloc par handlePaidOrder(supabaseAdmin,
      // orderId, pi.id, { expectedAmountCents: pi.amount_received ?? null })
      // pour obtenir les mêmes 4 garanties (Telegram + email client +
      // Printful + email admin). COMPORTEMENT PHASE 1 INCHANGÉ ci-dessous
      // (admin-notify seul) — ne pas modifier avant Phase 5.
      if (event.type === "payment_intent.succeeded") {
        const pi = event.data.object as any;
        const orderId = pi?.metadata?.orderId;
        if (!orderId) {
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          });
        }
        const { data: existing } = await supabaseAdmin
          .from("orders")
          .select("id, status")
          .eq("id", orderId)
          .maybeSingle();
        if (!existing) {
          return new Response(JSON.stringify({ error: "Commande introuvable" }), {
            status: 404,
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          });
        }
        if (existing.status === "paid") {
          return new Response(JSON.stringify({ received: true }), {
            headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
          });
        }
        await supabaseAdmin
          .from("orders")
          .update({ status: "paid", external_order_id: pi.id })
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
          let currencyCode = "USD";
          try {
            const { data: ss } = await supabaseAdmin
              .from("store_settings")
              .select("currency")
              .eq("id", true)
              .maybeSingle();
            currencyCode = String((ss as any)?.currency || "USD").toUpperCase();
          } catch {}
          try {
            await fetch(
              `${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-order-notify`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
                },
                body: JSON.stringify({
                  orderId,
                  name: order.client_name || "",
                  phone: order.shipping_address_phone || "",
                  email: order.client_email || "",
                  reception: "livraison",
                  address: order.shipping_address_address || "",
                  city: order.shipping_address_city || "",
                  zip: order.shipping_address_zip || "",
                  country: order.shipping_address_country || "",
                  items: (items ?? []).map((it: any) => ({
                    title: it.product_title || "Item",
                    size: it.selected_size || "",
                    color: it.selected_color || "",
                    quantity: it.quantity,
                    price: it.unit_price,
                  })),
                  total: Number(order.total_amount) || 0,
                  currency: currencyCode,
                }),
              },
            );
          } catch {}
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    } catch (error: any) {
      // Gap 13 : commande payée non enregistrée = CRITICAL (Stripe retente,
      // notif admin dédupliquée). Client reconstruit (hors scope du try).
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await reportError(admin, {
          fn: "stripe-webhook",
          action: "handler",
          error,
          severity: "critical",
        });
      } catch {}
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
  },
};
