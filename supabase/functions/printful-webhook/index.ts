// supabase/functions/printful-webhook/index.ts
// @ts-nocheck
// Webhook Printful – reçoit les événements réels de Printful et met à jour
// le statut de la commande (shipped / cancelled / on_hold / refunded /
// returned) + note le numéro de suivi.
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

// Événements que nous traitons activement. P6 POD: stock_updated géré pour MAJ variantes.
const SUPPORTED_TYPES = new Set([
  "package_shipped",
  "order_failed",
  "order_canceled",
  "order_put_hold",
  "order_remove_hold",
  "order_refunded",
  "package_returned",
  "stock_updated",
]);

// P-B State Machine pour webhooks (même table que create-printful-order)
const ALLOWED_WEBHOOK_TRANSITIONS = new Set([
  "pending->paid", "pending->cancelled",
  "paid->in_production", "paid->partial", "paid->on_hold", "paid->cancelled",
  "in_production->shipped", "in_production->partial", "in_production->on_hold", "in_production->cancelled",
  "partial->shipped", "partial->on_hold", "partial->cancelled", "partial->refunded",
  "on_hold->in_production", "on_hold->partial", "on_hold->cancelled", "on_hold->refunded",
  "shipped->delivered", "shipped->returned", "shipped->refunded",
  "delivered->returned", "delivered->refunded",
]);
function isWebhookTransitionAllowed(from: string, to: string): boolean {
  return from === to || ALLOWED_WEBHOOK_TRANSITIONS.has(`${from}->${to}`);
}

// Couleurs et libellés pour la barre de progression dans l'email d'expédition.
// Duplication manuelle de src/constants/orderStatus.tsx car Deno Deploy ne
// partage pas de bundle avec le frontend Vite.
const EMAIL_STATUS_STEPS = [
  "Paid",
  "Pending",
  "In Production",
  "Shipped",
  "Delivered",
];
const EMAIL_STEP_INDEX: Record<string, number> = {
  paid: 0,
  pending: 1,
  in_production: 2,
  shipped: 3,
  delivered: 4,
  on_hold: 2,
  refunded: -1,
  returned: -1,
};
const ACCENT = "#059669"; // couleur "shipped" (var(--color-accent) côté site)
const REACHED_GREY = "#9CA3AF"; // approx var(--color-ink4)
const BORDER_GREY = "#E5E7EB"; // approx var(--color-border)

// ── Estimation d'arrivée ────────────────────────────────────────────────
// La fenêtre d'arrivée d'un colis = ship_date + [min_days .. max_days]
// jours ouvrés, où min/max viennent de store_settings (voir migration
// 20260809_add_shipping_delay_days.sql). Calculé ici, au moment du webhook,
// puis stocké dans chaque colis de tracking_info → lu ensuite par le site,
// la page compte et les emails sans dépendre de l'horloge du client.

function addBusinessDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
}

// Calcule estimated_min_date / estimated_max_date pour un colis. Renvoie
// null si on n'a ni date d'expédition ni délais numériques configurés.
function computeEstimate(
  shipDate: string | null,
  minDays: number | null,
  maxDays: number | null,
): { estimatedMinDate: string | null; estimatedMaxDate: string | null } {
  if (!shipDate || minDays == null) {
    return { estimatedMinDate: null, estimatedMaxDate: null };
  }
  const max = maxDays != null ? Math.max(maxDays, minDays) : minDays;
  return {
    estimatedMinDate: addBusinessDays(shipDate, minDays),
    estimatedMaxDate: addBusinessDays(shipDate, max),
  };
}

// Formate une date ISO "YYYY-MM-DD" en "12 août 2026" (locale fr, pour le
// mail). Retourne null si la date est absente ou invalide.
function formatEstimateDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Construit la barre de progression en HTML/CSS inline --- reproduit
// visuellement OrderStatusStepper.tsx (mêmes 5 étapes, même logique
// reached/current) pour que le mail et le site racontent la même histoire.
function buildStatusStepperHtml(currentStep: number): string {
  const circles = EMAIL_STATUS_STEPS.map((label, i) => {
    const reached = currentStep >= i;
    const current = currentStep === i;
    const circleColor = current ? ACCENT : reached ? REACHED_GREY : "#F3F4F6";
    const textColor = current ? "#1a1a1a" : reached ? REACHED_GREY : "#9CA3AF";
    const connectorColor =
      currentStep > i + 1
        ? REACHED_GREY
        : currentStep > i
          ? ACCENT
          : BORDER_GREY;
    const circle = `
      <td style="text-align:center;vertical-align:top;width:44px;">
        <div style="width:22px;height:22px;border-radius:50%;background:${circleColor};margin:0 auto 4px;line-height:22px;color:#fff;font-size:11px;font-weight:700;">
          ${reached ? "✓" : ""}
        </div>
        <div style="font-size:9px;font-weight:600;color:${textColor};white-space:nowrap;">${label}</div>
      </td>`;
    const connector =
      i < EMAIL_STATUS_STEPS.length - 1
        ? `<td style="vertical-align:top;padding-top:11px;"><div style="height:2px;background:${connectorColor};"></div></td>`
        : "";
    return circle + connector;
  }).join("");

  return `<table role="presentation" width="100%" style="border-collapse:collapse;"><tr>${circles}</tr></table>`;
}

// ── Email d'expédition automatique (via send-email, clé service_role) ───
async function sendShippedEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  allShipments: any[],
) {
  const currentStep = EMAIL_STEP_INDEX[order.status] ?? 3;
  const stepperHtml = buildStatusStepperHtml(currentStep);

  // Un bloc HTML par colis --- même contenu que ce qu'affiche
  // OrderTrackingModal.tsx (carrier, tracking, date, badge réexpédition).
  const shipmentsHtml = allShipments
    .map((shipment, i) => {
      const trackingNumber = shipment?.tracking_number;
      const trackingUrl = shipment?.tracking_url;
      const carrier = shipment?.carrier || shipment?.service;
      const reshipmentBadge = shipment?.reshipment
        ? `<span style="display:inline-block;font-size:10.5px;font-weight:700;color:#92400e;background:#fef3c7;border-radius:999px;padding:2px 8px;margin-bottom:6px;">Reshipped free of charge</span><br/>`
        : "";
      const label =
        allShipments.length > 1
          ? `Package ${i + 1} of ${allShipments.length}`
          : "Package";

      // Fenêtre d'arrivée estimée — calculée côté webhook (ship_date +
      // délais numériques de store_settings) puis stockée sur le colis.
      let estimateHtml = "";
      const minEst = formatEstimateDate(shipment?.estimated_min_date);
      const maxEst = formatEstimateDate(shipment?.estimated_max_date);
      if (minEst && maxEst && minEst === maxEst) {
        estimateHtml = `<p style="margin:6px 0 0;font-size:13px;"><strong>Estimated delivery:</strong> ${minEst}</p>`;
      } else if (minEst && maxEst) {
        estimateHtml = `<p style="margin:6px 0 0;font-size:13px;"><strong>Estimated delivery:</strong> ${minEst} – ${maxEst}</p>`;
      }

      return `
      <div style="background:#f9fafb;border-radius:8px;padding:14px;margin-bottom:10px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;">${label}</p>
        ${reshipmentBadge}
        ${estimateHtml}
        <p style="margin:6px 0 4px;font-size:13px;"><strong>Carrier:</strong> ${carrier || "---"}</p>
        <p style="margin:0;font-size:13px;">
          <strong>Tracking:</strong>
          ${
            trackingUrl
              ? `<a href="${trackingUrl}" style="color:#FF5C35;">${trackingNumber}</a>`
              : trackingNumber || "---"
          }
        </p>
      </div>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#dbeafe;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#1e40af;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#1e40af;margin:4px 0 0;font-size:14px;">Your order is on its way!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 16px;font-size:18px;">Shipped 🚚</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${order.client_name || "there"}</strong>, your order <strong>${order.id}</strong> has been shipped and is on its way to you.</p>

<!-- Barre de progression --- identique à celle du site et de la page compte -->
<div style="margin-bottom:20px;">${stepperHtml}</div>

${shipmentsHtml}

<a href="https://instawear.vercel.app/?track=${encodeURIComponent(order.id)}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
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

// ── Email d'échec de commande (via send-email, clé service_role) ────────
async function sendFailedEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  reason?: string,
) {
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#ffe6e6;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#cc0000;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#cc0000;margin:4px 0 0;font-size:14px;">We couldn't process your order</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Order failed ❌</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${order.client_name || "there"}</strong>,<br><br>Unfortunately, your order <strong>${order.id}</strong> could not be processed.${reason ? ` Reason: ${reason}.` : ""} If you've already been charged, a refund will be issued automatically.</p>
<a href="https://instawear.vercel.app" style="display:inline-block;padding:12px 24px;background:#cc0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Visit InstaWear →</a>
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
        subject: `Your order ${order.id} could not be processed`,
        html,
      }),
    });
  } catch (err) {
    console.error("Failed email error:", err);
  }
}

// ── Email d'annulation de commande (via send-email, clé service_role) ───
async function sendCancelledEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  reason?: string,
) {
  const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#ffe6e6;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#cc0000;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#cc0000;margin:4px 0 0;font-size:14px;">Your order has been cancelled</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">Order cancelled</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${order.client_name || "there"}</strong>,<br><br>Your order <strong>${order.id}</strong> has been cancelled.${reason ? ` Reason: ${reason}.` : ""} If you have any questions, please contact our support team.</p>
<a href="https://instawear.vercel.app" style="display:inline-block;padding:12px 24px;background:#999;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Visit InstaWear →</a>
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
        subject: `Your order ${order.id} has been cancelled`,
        html,
      }),
    });
  } catch (err) {
    console.error("Cancelled email error:", err);
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

      // P-C (4) Blind Trust: secret token optionnel pour le webhook Printful
      // Configurez PRINTFUL_WEBHOOK_SECRET en Edge Secret et ajoutez ?secret=xxx à l'URL webhook Printful
      try {
        const expectedSecret = Deno.env.get("PRINTFUL_WEBHOOK_SECRET");
        if (expectedSecret) {
          const url = new URL(req.url);
          const got = url.searchParams.get("secret") || url.searchParams.get("token") || req.headers.get("x-webhook-secret") || req.headers.get("x-pf-secret") || "";
          if (got !== expectedSecret) {
            return new Response(JSON.stringify({ error: "Webhook secret invalide" }), { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
          }
        }
      } catch {}

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

      // ── 4. Gestion stock_updated (P6 POD) — MAJ variantes sans bloquer commande ──
      if (type === "stock_updated") {
        const productId = (data as any).product_id;
        const variantStock = (data as any).variant_stock || {};
        const outIds: number[] = Array.isArray(variantStock.out) ? variantStock.out : [];
        const discIds: number[] = Array.isArray(variantStock.discontinued) ? variantStock.discontinued : [];
        const summary = `Stock Printful: ${discIds.length} discontinued, ${outIds.length} rupture (product_id ${productId})`;
        // notif admin toujours
        try {
          await supabaseAdmin.from("notifications").insert({
            title: `Stock Printful mis à jour — produit ${productId}`,
            description: summary,
            category: "products",
            priority: discIds.length > 0 ? "high" : "medium",
            status: "unread",
            metadata: { productId: String(productId), out: outIds, discontinued: discIds, linkTo: "/admin/products", source: "Printful" },
            action_label: "Voir le produit",
          });
        } catch {}
        // Tentative de MAJ directe du produit concerné (si external_product_id == productId)
        try {
          const { data: prod } = await supabaseAdmin.from("products").select("id, variants, variant_availability").eq("external_product_id", String(productId)).maybeSingle();
          if (prod) {
            // Audit léger pour que la prochaine sync sache quoi griser — on stocke les listes
            const audit = { ...(prod.variant_availability || {}), _stock_updated_at: new Date().toISOString(), _out: outIds, _discontinued: discIds };
            await supabaseAdmin.from("products").update({ variant_availability: audit }).eq("id", prod.id);
            // Optionnel: si toutes les variantes sont discontinued, passer in_stock=false pour masquer du catalogue
            if (discIds.length > 0 && outIds.length === 0) {
              // on ne touche pas aux prix, le prochain sync complet reconstruira stock_status proprement
            }
          }
        } catch (e) { console.warn("stock_updated update failed", e); }
        return new Response(JSON.stringify({ received: true, handled: true, type: "stock_updated" }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
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

      // P-C fetch-back: vérifier que la commande existe vraiment chez Printful (anti-spoof sans HMAC)
      try {
        const { data: podSettings } = await supabaseAdmin.from("pod_settings").select("api_key").eq("id", "pod-main").maybeSingle();
        const apiKey = (podSettings as any)?.api_key;
        if (apiKey && pfOrderId) {
          const vRes = await fetch(`https://api.printful.com/orders/${encodeURIComponent(String(pfOrderId))}`, { headers: { Authorization: `Bearer ${apiKey}` } });
          if (!vRes.ok && vRes.status === 404) {
            console.warn(`P-C fetch-back: Printful order ${pfOrderId} introuvable -> webhook ignoré`);
            // on ne bloque pas, mais on log pour audit
          } else if (vRes.ok) {
            const vData = await vRes.json();
            const vExt = String(vData.result?.external_id || "");
            if (vExt && vExt !== String(orderId) && vExt !== String(order.external_id || "")) {
              console.warn(`P-C fetch-back: external_id mismatch webhook ${vExt} vs db ${orderId}`);
            }
          }
        }
      } catch (e) { console.warn("P-C fetch-back failed", e); }

      // ── 5. Appliquer la transition de statut ──────────────────────
      const shipment = data.shipment;
      const trackingNumber = shipment?.tracking_number;
      const trackingUrl = shipment?.tracking_url;
      const carrier = shipment?.carrier || shipment?.service;
      const shipDate = shipment?.ship_date || null;

      // Délais numériques (jours ouvrés) pour le calcul de l'estimation
      // d'arrivée. Voir migration 20260809_add_shipping_delay_days.sql.
      let minDays: number | null = null;
      let maxDays: number | null = null;
      try {
        const { data: storeSettings } = await supabaseAdmin
          .from("store_settings")
          .select("shipping_delay_min_days, shipping_delay_max_days")
          .eq("id", true)
          .maybeSingle();
        if (storeSettings) {
          minDays =
            typeof storeSettings.shipping_delay_min_days === "number"
              ? storeSettings.shipping_delay_min_days
              : null;
          maxDays =
            typeof storeSettings.shipping_delay_max_days === "number"
              ? storeSettings.shipping_delay_max_days
              : null;
        }
      } catch (err) {
        console.warn("store_settings illisibles, estimation désactivée:", err);
      }

      let newStatus: string | null = null;
      const notes: string[] = [];

      if (order.notes) notes.push(order.notes);
      const reason = data.reason;

      const updatePayload: Record<string, any> = {};
      let allShipments: any[] = [];
      let isDuplicate = false;

      if (type === "package_shipped") {
        if (order.status !== "shipped") {
          newStatus = "shipped";
        }

        // Normaliser l'existant en tableau
        const existing = order.tracking_info;
        const existingShipments: any[] = Array.isArray(existing)
          ? existing
          : existing
            ? [existing]
            : [];

        // Anti-doublon : Printful peut renvoyer le même webhook en retry
        // (même tracking_number). Dans ce cas on ne ré-ajoute pas le colis
        // et on ne renvoie ni email ni notification.
        if (trackingNumber) {
          isDuplicate = existingShipments.some(
            (s) => s?.tracking_number === trackingNumber,
          );
        }

        // Fenêtre d'arrivée estimée pour CE colis (ship_date + délais)
        const { estimatedMinDate, estimatedMaxDate } = computeEstimate(
          shipDate,
          minDays,
          maxDays,
        );

        // Nouveau colis à ajouter (reshipment du flag Printful)
        const newShipment = {
          carrier: carrier || null,
          service: shipment?.service || null,
          tracking_number: trackingNumber || null,
          tracking_url: trackingUrl || null,
          ship_date: shipDate || null,
          reshipment: shipment?.reshipment === true,
          estimated_min_date: estimatedMinDate,
          estimated_max_date: estimatedMaxDate,
        };

        if (!isDuplicate) {
          allShipments = [...existingShipments, newShipment];
          updatePayload.tracking_info = allShipments;
        } else {
          // Garder l'existant tel quel (pas de doublon dans le tableau)
          allShipments = existingShipments;
        }

        if (trackingNumber && !isDuplicate) {
          notes.push(
            `Tracking Printful: ${carrier ? `${carrier} ` : ""}${trackingNumber}${trackingUrl ? ` (${trackingUrl})` : ""}${newShipment.reshipment ? " [REEXPEDITION]" : ""}${estimatedMinDate ? ` — Arrivée estimée: ${formatEstimateDate(estimatedMinDate)}${estimatedMaxDate && estimatedMaxDate !== estimatedMinDate ? ` – ${formatEstimateDate(estimatedMaxDate)}` : ""}` : ""}`,
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
          `Commande annulée par le fournisseur${reason ? ` : ${reason}` : ""}`,
        );
      } else if (type === "order_put_hold") {
        if (order.status !== "on_hold") {
          newStatus = "on_hold";
        }
        notes.push(
          `Commande mise en pause par Printful${reason ? ` : ${reason}` : ""}`,
        );
      } else if (type === "order_remove_hold") {
        if (order.status === "on_hold") {
          newStatus = "in_production";
        }
        notes.push(
          `Pause levée, le traitement reprend${reason ? ` : ${reason}` : ""}`,
        );
      } else if (type === "order_refunded") {
        if (order.status !== "refunded") {
          newStatus = "refunded";
        }
        notes.push(
          `Commande remboursée par le fournisseur${reason ? ` : ${reason}` : ""}`,
        );
      } else if (type === "package_returned") {
        if (order.status !== "returned") {
          newStatus = "returned";
        }
        notes.push(`Colis renvoyé au vendeur${reason ? ` : ${reason}` : ""}`);
      }

      if (newStatus) updatePayload.status = newStatus;
      // P-B State Machine: refuse transition illégale mais conserve tracking_info/notes
      if (newStatus && !isWebhookTransitionAllowed(order.status, newStatus)) {
        console.warn(`P-B: transition ${order.status} -> ${newStatus} non autorisée pour ${type}, status conservé`);
        delete updatePayload.status;
        newStatus = null;
      }
      if (notes.length > 0)
        updatePayload.notes = notes.filter(Boolean).join("\n");

      await supabaseAdmin
        .from("orders")
        .update(updatePayload)
        .eq("id", orderId);

      // ── 6. Notifications + email (uniquement si un nouveau colis a
      //      réellement été enregistré, jamais sur un doublon de retry) ──
      if (type === "package_shipped" && !isDuplicate) {
        const estMin = allShipments.length
          ? allShipments[allShipments.length - 1]?.estimated_min_date
          : null;
        const estMax = allShipments.length
          ? allShipments[allShipments.length - 1]?.estimated_max_date
          : null;
        const estLabel =
          estMin && estMax && estMin === estMax
            ? formatEstimateDate(estMin)
            : estMin && estMax
              ? `${formatEstimateDate(estMin)} – ${formatEstimateDate(estMax)}`
              : null;

        // Notification client (table customer_notifications, RLS *_own).
        // On n'insère que si la commande est liée à un compte client
        // (client_id renseigné — pas de compte = commande invité).
        if (order.client_id) {
          try {
            await supabaseAdmin.from("customer_notifications").insert({
              customer_id: order.client_id,
              title: order.client_name
                ? `Votre commande ${orderId} est expédiée !`
                : `Commande ${orderId} expédiée`,
              message: [
                `Votre commande ${orderId} a été expédiée${carrier ? ` par ${carrier}` : ""}.`,
                estLabel ? `Arrivée estimée : ${estLabel}.` : null,
                trackingUrl
                  ? `Suivez votre colis : ${trackingUrl}`
                  : trackingNumber
                    ? `Numéro de suivi : ${trackingNumber}`
                    : null,
              ]
                .filter(Boolean)
                .join("\n"),
              type: "order_status",
              is_read: false,
              metadata: {
                orderId,
                carrier: carrier || null,
                tracking_number: trackingNumber || null,
                tracking_url: trackingUrl || null,
                estimated_min_date: estMin || null,
                estimated_max_date: estMax || null,
              },
            });
          } catch (err) {
            console.warn("Échec notification client:", err);
          }
        }

        // Notification admin (table notifications, RLS is_admin) — visible
        // dans NotificationsPage (supervision), avec l'estimation.
        try {
          await supabaseAdmin.from("notifications").insert({
            title: `Commande ${orderId} expédiée`,
            description: [
              `${order.client_name || "Client"} — ${carrier ? `${carrier} — ` : ""}${trackingNumber || "numéro de suivi inconnu"}.`,
              estLabel ? `Arrivée estimée : ${estLabel}.` : null,
            ]
              .filter(Boolean)
              .join(" "),
            category: "orders",
            priority: "low",
            status: "unread",
            metadata: {
              orderId,
              customerName: order.client_name || null,
              tracking_number: trackingNumber || null,
              tracking_url: trackingUrl || null,
              estimated_min_date: estMin || null,
              estimated_max_date: estMax || null,
              linkTo: "/admin/orders",
              source: "Printful",
            },
            action_label: "Voir la commande",
          });
        } catch (err) {
          console.warn("Échec notification admin:", err);
        }

        // Email d'expédition automatique (uniquement sur une nouvelle
        // transition vers "shipped", pas sur les ré-expéditions répétées).
        if (newStatus === "shipped") {
          await sendShippedEmail(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            order,
            allShipments,
          );
        }
      }

      // ── 7. Notifications admin pour les événements non-expédition ──
      const ADMIN_EVENT_META: Record<
        string,
        { title: string; priority: string }
      > = {
        order_put_hold: {
          title: `Commande ${orderId} mise en pause`,
          priority: "medium",
        },
        order_remove_hold: {
          title: `Pause levée — commande ${orderId}`,
          priority: "low",
        },
        order_refunded: {
          title: `Commande ${orderId} remboursée`,
          priority: "medium",
        },
        package_returned: {
          title: `Colis retourné — commande ${orderId}`,
          priority: "high",
        },
        order_failed: { title: `Échec commande ${orderId}`, priority: "high" },
        order_canceled: {
          title: `Commande ${orderId} annulée`,
          priority: "medium",
        },
      };

      const adminMeta = ADMIN_EVENT_META[type];
      if (adminMeta && type !== "package_shipped") {
        try {
          await supabaseAdmin.from("notifications").insert({
            title: adminMeta.title,
            description: notes.length
              ? `${order.client_name || "Client"} — ${notes.join(" ")}`
              : order.client_name || "Client",
            category: "orders",
            priority: adminMeta.priority,
            status: "unread",
            metadata: {
              orderId,
              customerName: order.client_name || null,
              linkTo: "/admin/orders",
              source: "Printful",
            },
            action_label: "Voir la commande",
          });
        } catch (err) {
          console.warn("Échec notification admin:", err);
        }

        // Emails dédiés : échec vs annulation (chaque événement a le sien).
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        if (type === "order_failed") {
          await sendFailedEmail(supabaseUrl, serviceRoleKey, order, reason);
        } else if (type === "order_canceled") {
          await sendCancelledEmail(supabaseUrl, serviceRoleKey, order, reason);
        }
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
