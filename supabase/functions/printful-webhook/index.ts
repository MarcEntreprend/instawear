// supabase/functions/printful-webhook/index.ts
// @ts-nocheck
// Webhook Printful – reçoit les événements réels de Printful et met à jour
// le statut de la commande (shipped / cancelled) + note le numéro de suivi.
//
// Printful n'offre pas de signature HMAC (pas de X-PF-Signature) : la
// validation repose sur la structure du payload, le store ID et la
// correspondance de l'ordre via external_id / external_order_id.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS restreint : ce webhook est un endpoint serveur→serveur. Seules les
// origines de l'application (frontend Vercel + localhost de dev) peuvent
// l'appeler depuis un navigateur ; les autres origines ne reçoivent pas
// d'en-tête Access-Control-Allow-Origin.
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

// Événements que nous traitons activement.
const SUPPORTED_TYPES = new Set([
  "package_shipped",
  "order_failed",
  "order_canceled",
]);

// ── Email d'expédition automatique (via send-email, clé service_role) ───
async function sendShippedEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  shipment: any,
) {
  const trackingNumber = shipment?.tracking_number;
  const trackingUrl = shipment?.tracking_url;
  const carrier = shipment?.carrier || shipment?.service;

  const trackingHtml = trackingNumber
    ? `
    <p style="margin:0 0 8px;"><strong>Carrier:</strong> ${carrier || "—"}</p>
    <p style="margin:0 0 8px;"><strong>Tracking number:</strong> ${
      trackingUrl
        ? `<a href="${trackingUrl}" style="color:#FF5C35;">${trackingNumber}</a>`
        : trackingNumber
    }</p>
    ${trackingUrl ? `<p style="margin:0;"><a href="${trackingUrl}" style="color:#FF5C35;">Follow your package →</a></p>` : ""}`
    : "";

  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#dbeafe;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#1e40af;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#1e40af;margin:4px 0 0;font-size:14px;">Your order is on its way!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Shipped 🚚</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${order.client_name || "there"}</strong>,<br><br>Your order <strong>${order.id}</strong> has been shipped and is on its way to you.</p>
<div style="padding:16px;background:#f9fafb;border-radius:8px;font-size:13px;color:#555;">
${trackingHtml}
</div>
<a href="https://instawear.vercel.app/?order=success&id=${order.id}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;line-height:1.6;">
<p style="margin:0;">This email was sent to <strong>${order.client_email || ""}</strong> for your recent purchase at instawear.vercel.app</p>
</div></div></body></html>`;

  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({
        to: order.client_email,
        subject: `Your order ${order.id} has shipped!`,
        html,
      }),
    });
  } catch (err) {
    console.error("Shipped email error:", err);
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: getCorsHeaders(req) });
    }

    try {
      // ── 1. Lire et valider la structure du payload ────────────────
      const rawBody = await req.text();
      let payload: any;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return new Response(
          JSON.stringify({ error: "Payload JSON invalide" }),
          {
            status: 400,
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }

      const type = payload?.type;
      const store = payload?.store;
      const data = payload?.data;
      if (typeof type !== "string" || !data || typeof data !== "object") {
        return new Response(
          JSON.stringify({ error: "Structure webhook invalide" }),
          {
            status: 400,
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }

      // ── 2. Ignorer les événements non gérés (réponse 2xx) ─────────
      if (!SUPPORTED_TYPES.has(type)) {
        return new Response(
          JSON.stringify({
            received: true,
            handled: false,
            reason: "unsupported_type",
          }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // ── 3. Vérifier le store ID (anti-spoofing) ──────────────────
      if (store != null) {
        const { data: settings } = await supabaseAdmin
          .from("pod_settings")
          .select("store_id")
          .eq("id", "pod-main")
          .maybeSingle();
        const expectedStore = settings?.store_id;
        if (expectedStore && String(store) !== String(expectedStore).trim()) {
          return new Response(
            JSON.stringify({
              received: false,
              error: "Store ID mismatch",
            }),
            {
              status: 403,
              headers: {
                ...getCorsHeaders(req),
                "Content-Type": "application/json",
              },
            },
          );
        }
      }

      // ── 4. Retrouver la commande locale ───────────────────────────
      const orderData = data.order;
      const pfOrderId = orderData?.id;
      const externalId = orderData?.external_id;

      let orderId: string | null = null;
      let order: any = null;

      // L'ordre Printful référence notre id via external_id
      if (externalId) {
        const { data: found } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("id", String(externalId))
          .maybeSingle();
        if (found) {
          order = found;
          orderId = found.id;
        }
      }

      // Sinon on cherche par external_order_id (l'ID Printful stocké)
      if (!order && pfOrderId != null) {
        const { data: found } = await supabaseAdmin
          .from("orders")
          .select("*")
          .eq("external_order_id", String(pfOrderId))
          .maybeSingle();
        if (found) {
          order = found;
          orderId = found.id;
        }
      }

      if (!orderId || !order) {
        return new Response(
          JSON.stringify({
            received: true,
            handled: false,
            reason: "order_not_found",
          }),
          {
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }

      // ── 5. Appliquer la transition de statut ──────────────────────
      const shipment = data.shipment;
      const trackingNumber = shipment?.tracking_number;
      const trackingUrl = shipment?.tracking_url;
      const carrier = shipment?.carrier || shipment?.service;
      const shipDate = shipment?.ship_date || null;

      let newStatus: string | null = null;
      const notes: string[] = [];

      if (order.notes) notes.push(order.notes);
      const reason = data.reason;

      const updatePayload: Record<string, any> = {};

      if (type === "package_shipped") {
        if (order.status !== "shipped") {
          newStatus = "shipped";
        }
        // Tracking structuré (exposé au client via get_order_tracking)
        const trackingInfo: Record<string, any> = {
          carrier: carrier || null,
          tracking_number: trackingNumber || null,
          tracking_url: trackingUrl || null,
          ship_date: shipDate || null,
        };
        updatePayload.tracking_info = trackingInfo;
        if (trackingNumber) {
          notes.push(
            `Tracking Printful: ${carrier ? `${carrier} ` : ""}${trackingNumber}${trackingUrl ? ` (${trackingUrl})` : ""}`,
          );
        }
      } else if (type === "order_failed") {
        if (order.status !== "cancelled") {
          newStatus = "cancelled";
        }
        notes.push(`Échec commande Printful${reason ? ` : ${reason}` : ""}`);
      } else if (type === "order_canceled") {
        if (order.status !== "cancelled") {
          newStatus = "cancelled";
        }
        notes.push(
          `Commande annulée chez Printful${reason ? ` : ${reason}` : ""}`,
        );
      }

      if (newStatus) updatePayload.status = newStatus;
      if (notes.length > 0)
        updatePayload.notes = notes.filter(Boolean).join("\n");

      await supabaseAdmin
        .from("orders")
        .update(updatePayload)
        .eq("id", orderId);

      // Email d'expédition automatique (uniquement sur une nouvelle
      // transition vers "shipped", pas sur les ré-expéditions répétées).
      if (type === "package_shipped" && newStatus === "shipped") {
        await sendShippedEmail(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          order,
          shipment,
        );
      }

      return new Response(
        JSON.stringify({ received: true, handled: true, orderId }),
        {
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error?.message || "Erreur inconnue" }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
          },
        },
      );
    }
  },
};
