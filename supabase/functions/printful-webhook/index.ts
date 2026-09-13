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
import { safeFetch } from "./_shared/safeUrl.ts";
import { logSafe, safeTruncate } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey, quotaFor } from "./_shared/rateLimit.ts";
import { fetchWithRetry, reportError } from "./_shared/opsUtils.ts";
// Moule unique des emails client (canonique : supabase/functions/_shared/
// orderStatusEmails.ts — toute modification se fait là-bas puis recopie
// à l'identique ici + create-printful-order + tests).
import {
  buildInProductionEmail,
  buildPartialEmail,
  buildFailedEmail,
  buildCancelledEmail,
  buildOnHoldEmail,
  buildApprovalEmail,
  buildRefundedEmail,
  buildReturnedEmail,
} from "./_shared/orderStatusEmails.ts";

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

// Événements que nous traitons activement. Couverture complète :
// commandes (created/updated/failed/canceled/hold/refunded/shipped/returned),
// approbation design, stock et catalogue produit (synced/updated/deleted).
const SUPPORTED_TYPES = new Set([
  "package_shipped",
  "order_created",
  "order_updated",
  "order_failed",
  "order_canceled",
  "order_put_hold",
  "order_put_hold_approval",
  "order_remove_hold",
  "order_refunded",
  "package_returned",
  "stock_updated",
  "product_synced",
  "product_updated",
  "product_deleted",
]);

// P-B State Machine pour webhooks (même table que create-printful-order).
// 'partial' exige la migration 20261015_webhook_coverage.sql (CHECK étendu).
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

// Mappe un statut Printful (Orders API + openapi.json `Order.status` :
// draft/inreview/pending/failed/canceled/inprocess/onhold/partial/
// fulfilled/archived — orthographes sans underscore côté API : `canceled`
// 1 L, `onhold` collé) vers notre statut interne.
// Normalisation : casse + séparateurs ignorés (`on-hold`/`on_hold`/`onhold`
// → identique, `canceled`/`cancelled` → identique).
// Retourne null quand AUCUNE action locale n'est due via order_updated :
// - draft/inreview/archived : brouillon/revue/archivé côté Printful, on ne
//   recule jamais (order_created possède la liaison, pas le statut).
// Seuls les statuts de progression sont réconciliés ici ; les événements
// dédiés (order_failed/order_canceled/order_put_hold/...) restent
// propriétaires de leur transition + email, mais order_updated sert de
// filet de rattrapage s'ils ont été manqués (retry Printful 1..1024 min).
function mapPrintfulStatusToLocal(pfStatus: unknown): string | null {
  const s = String(pfStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, "");
  if (s === "pending" || s === "inprocess") return "in_production";
  if (s === "partial") return "partial";
  // fulfilled = tout expédié côté Printful → chez nous `shipped` (le
  // `delivered` reste manuel admin). Sans ça, un order_updated/fulfilled
  // sans package_shipped laissait la commande bloquée.
  if (s === "fulfilled") return "shipped";
  // Filet order_updated : si les événements dédiés ont été manqués.
  if (s === "failed" || s === "canceled" || s === "cancelled")
    return "cancelled";
  if (s === "onhold") return "on_hold";
  return null;
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
  partial: 2,
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

// ── Contexte email (items + devise boutique, best-effort) ─────────────────
// Les webhooks dédiés (failed/canceled/hold/...) n'ont que `order` en main :
// on recharge les items et la devise ici, une seule fois par envoi.
const EMAIL_CURRENCY_SYMBOLS: Record<string, string> = {
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
async function getEmailContext(supabaseAdmin: any, orderId: string) {
  let items: any[] = [];
  let currencySymbol = "$";
  try {
    const { data } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);
    if (Array.isArray(data)) items = data;
  } catch {}
  try {
    const { data: ss } = await supabaseAdmin
      .from("store_settings")
      .select("currency")
      .eq("id", true)
      .maybeSingle();
    const code = String((ss as any)?.currency || "USD").toUpperCase();
    currencySymbol = EMAIL_CURRENCY_SYMBOLS[code] || "$";
  } catch {}
  return { items, currencySymbol };
}

// ── Envoi client via send-email (clé service_role, best-effort) ───────────
// Destinataire = adresse du checkout (guest = loggé). Adresse absente ou
// invalide → skip silencieux. N'échoue jamais l'appelant.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
async function postCustomerEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  orderId: string,
  to: unknown,
  subject: string,
  html: string,
) {
  const dest = typeof to === "string" ? to.trim() : "";
  if (!EMAIL_RE.test(dest)) return;
  try {
    await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ to: dest, subject, html }),
    });
  } catch (err) {
    console.error(`Customer email ${logSafe(orderId)} error:`, logSafe(err));
  }
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

<a href="https://instawear.vercel.app/?order=${encodeURIComponent(order.id)}" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#FF5C35;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
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

// ── Email d'échec de commande (moule canonique : items + totaux + CTA) ───
// Échec TECHNIQUE côté fournisseur (fichiers, paiement, adresse) : l'équipe
// travaille dessus, remboursement auto si débité. Distinct de cancelled
// (annulation volontaire) — wording différent, même moule.
async function sendFailedEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  reason?: string,
) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { items, currencySymbol } = await getEmailContext(
      supabaseAdmin,
      order.id,
    );
    const built = buildFailedEmail(order, items, currencySymbol, reason);
    await postCustomerEmail(
      supabaseUrl,
      serviceRoleKey,
      order.id,
      order.client_email,
      built.subject,
      built.html,
    );
  } catch (err) {
    console.error("Failed email error:", logSafe(err));
  }
}

// ── Email d'annulation de commande (moule canonique) ─────────────────────
async function sendCancelledEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  reason?: string,
) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { items, currencySymbol } = await getEmailContext(
      supabaseAdmin,
      order.id,
    );
    const built = buildCancelledEmail(order, items, currencySymbol, reason);
    await postCustomerEmail(
      supabaseUrl,
      serviceRoleKey,
      order.id,
      order.client_email,
      built.subject,
      built.html,
    );
  } catch (err) {
    console.error("Cancelled email error:", logSafe(err));
  }
}

// ── Email d'attente pour approbation design (moule canonique + stepper) ─
async function sendApprovalEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  reason?: string,
) {
  if (!order.client_email) return;
  try {
    const built = buildApprovalEmail(order, "$", reason);
    await postCustomerEmail(
      supabaseUrl,
      serviceRoleKey,
      order.id,
      order.client_email,
      built.subject,
      built.html,
    );
  } catch (err) {
    console.error("Approval email error:", logSafe(err));
  }
}

// ── Nouveaux emails Phase 2 (même pattern : canonique + best-effort) ───────
async function sendRefundedEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  amount?: string | number | null,
) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { items, currencySymbol } = await getEmailContext(
      supabaseAdmin,
      order.id,
    );
    const built = buildRefundedEmail(order, items, currencySymbol, amount);
    await postCustomerEmail(
      supabaseUrl,
      serviceRoleKey,
      order.id,
      order.client_email,
      built.subject,
      built.html,
    );
  } catch (err) {
    console.error("Refunded email error:", logSafe(err));
  }
}

async function sendReturnedEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  reason?: string,
) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { items, currencySymbol } = await getEmailContext(
      supabaseAdmin,
      order.id,
    );
    const built = buildReturnedEmail(order, items, currencySymbol, reason);
    await postCustomerEmail(
      supabaseUrl,
      serviceRoleKey,
      order.id,
      order.client_email,
      built.subject,
      built.html,
    );
  } catch (err) {
    console.error("Returned email error:", logSafe(err));
  }
}

// Pause hors approval (ex. coût broderie calculé en async côté Printful,
// doc Orders API) : même moule, raison explicite, pas de fichiers.
async function sendOnHoldEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  reason?: string,
) {
  if (!order.client_email) return;
  try {
    const built = buildOnHoldEmail(order, "$", reason);
    await postCustomerEmail(
      supabaseUrl,
      serviceRoleKey,
      order.id,
      order.client_email,
      built.subject,
      built.html,
    );
  } catch (err) {
    console.error("On-hold email error:", logSafe(err));
  }
}

// Production reprise après pause (order_remove_hold) : moule in_production.
async function sendBackInProductionEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { items, currencySymbol } = await getEmailContext(
      supabaseAdmin,
      order.id,
    );
    const built = buildInProductionEmail(order, items, currencySymbol);
    await postCustomerEmail(
      supabaseUrl,
      serviceRoleKey,
      order.id,
      order.client_email,
      built.subject,
      built.html,
    );
  } catch (err) {
    console.error("Back-in-production email error:", logSafe(err));
  }
}

// Premier colis d'une commande multi-colis (newStatus partial) : le client
// voit le colis parti + le récapitulatif, pas un faux "shipped".
async function sendPartialEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  order: any,
  allShipments: any[],
) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { items, currencySymbol } = await getEmailContext(
      supabaseAdmin,
      order.id,
    );
    const built = buildPartialEmail(order, items, currencySymbol, allShipments);
    await postCustomerEmail(
      supabaseUrl,
      serviceRoleKey,
      order.id,
      order.client_email,
      built.subject,
      built.html,
    );
  } catch (err) {
    console.error("Partial email error:", logSafe(err));
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: getCorsHeaders(req) });
    }

    try {
      if (await isRateLimited(req, rateLimitKey(req, "printful-webhook"))) {
        return new Response(JSON.stringify({ error: "Trop de requetes." }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "Retry-After": "60" },
          status: 429,
        });
      }
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

      // P-C (4) Secret webhook OBLIGATOIRE (fail-closed, gap 18).
      // Sans secret configuré côté serveur, on refuse tout plutôt que
      // d'accepter des webhooks non authentifiés. Le secret est posé via
      // `supabase secrets set PRINTFUL_WEBHOOK_SECRET=...` et ajouté à
      // l'URL Printful AUTOMATIQUEMENT par setup-webhook (sync-printful) :
      // un clic "Enregistrer dans Printful" suffit. Rotation : générer une
      // nouvelle valeur, `secrets set`, re-cliquer Enregistrer (l'ancienne
      // URL cesse de fonctionner dès le remplacement côté Printful).
      // Printful retente les 2xx manqués (1..1024 min) : aucune perte
      // pendant la bascule.
      const expectedSecret = (() => {
        try {
          return Deno.env.get("PRINTFUL_WEBHOOK_SECRET") || "";
        } catch {
          return "";
        }
      })();
      if (!expectedSecret) {
        return new Response(
          JSON.stringify({ error: "Webhook non configuré (secret manquant)" }),
          {
            status: 503,
            headers: {
              ...getCorsHeaders(req),
              "Content-Type": "application/json",
            },
          },
        );
      }
      try {
        const url = new URL(req.url);
        const got = url.searchParams.get("secret") || url.searchParams.get("token") || req.headers.get("x-webhook-secret") || req.headers.get("x-pf-secret") || "";
        // Comparaison temps constant (anti timing-attack sur le secret).
        let match = got.length === expectedSecret.length;
        for (let i = 0; i < Math.max(got.length, expectedSecret.length); i++) {
          if ((got.charCodeAt(i) || 0) !== (expectedSecret.charCodeAt(i) || 0)) match = false;
        }
        if (!match) {
          try {
            const admin = createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            );
            await reportError(admin, {
              fn: "printful-webhook",
              action: "auth",
              error: "Secret webhook invalide (tentative rejetée)",
              severity: "high",
            });
          } catch {}
          return new Response(JSON.stringify({ error: "Webhook secret invalide" }), { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
        }
      } catch {
        return new Response(JSON.stringify({ error: "Webhook secret invalide" }), { status: 403, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
      }

      const type = payload?.type;
      const store = payload?.store;
      const data = payload?.data;
      // Doc Webhook API : chaque event porte `retries` (0 = 1er envoi,
      // Printful retente en 1/4/16/64/256/1024 min tant que pas 2xx).
      // Loggé systématiquement : indispensable pour distinguer un doublon
      // de retry d'un vrai 2e colis / vrai changement de statut.
      try {
        console.log(
          `[printful-webhook] type=${logSafe(type)} retries=${logSafe(payload?.retries ?? 0)} store=${logSafe(store)} created=${logSafe(payload?.created ?? null)}`,
        );
      } catch {}
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

      // ── 4. Gestion stock_updated (Phase B : temps réel) ──────────
      // Payload doc : data = { product_id, variant_stock: {...} } avec les
      // IDs des variantes discontinued + en rupture (clés `discontinued` et
      // `out` ou `out_of_stock` selon versions). IDs = sync ou catalogue :
      // on matche les deux (sizes[].sync_variant_id / catalog_variant_id /
      // external_variant_id, posés au sync). Doc : les IDs absents des deux
      // listes sont actifs/en stock → restauration ciblée (jamais aveugle :
      // seules les tailles à ID connu et non-available sont restaurées).
      // La sync complète reste la source de vérité (reconstruction).
      if (type === "stock_updated") {
        const productId = (data as any).product_id;
        const variantStock = (data as any).variant_stock || {};
        const numList = (v: unknown): string[] =>
          (Array.isArray(v) ? v : [])
            .map((x) => String(x))
            .filter((s) => s.length > 0);
        const outIds = new Set([
          ...numList(variantStock.out),
          ...numList(variantStock.out_of_stock),
        ]);
        const discIds = new Set(numList(variantStock.discontinued));
        const summary = `Stock Printful: ${discIds.size} discontinued, ${outIds.size} rupture (product_id ${productId})`;

        let appliedOut = 0;
        let appliedDisc = 0;
        let appliedRestored = 0;
        let productTitle: string | null = null;
        try {
          const { data: prod } = await supabaseAdmin
            .from("products")
            .select("id, title, variants, variant_availability, in_stock")
            .eq("external_product_id", String(productId))
            .maybeSingle();
          if (prod && Array.isArray((prod as any).variants)) {
            let anyAvailable = false;
            const variants = (prod as any).variants.map((v: any) => {
              const sizes = { ...(v.sizes || {}) };
              for (const [sz, sd] of Object.entries(sizes)) {
                const entry: any = { ...(sd as any) };
                const knownIds = [
                  entry.sync_variant_id,
                  entry.catalog_variant_id,
                  v.external_variant_id,
                ]
                  .filter((x) => x !== undefined && x !== null && String(x).length > 0)
                  .map((x) => String(x));
                if (knownIds.length === 0) continue; // pré-ID : audit seul
                const isDisc = knownIds.some((id) => discIds.has(id));
                const isOut = knownIds.some((id) => outIds.has(id));
                const cur = entry.stock_status || "available";
                if (isDisc && cur !== "discontinued") {
                  entry.stock_status = "discontinued";
                  appliedDisc++;
                } else if (!isDisc && isOut && cur !== "out_of_stock" && cur !== "discontinued") {
                  entry.stock_status = "out_of_stock";
                  appliedOut++;
                } else if (!isDisc && !isOut && cur !== "available") {
                  entry.stock_status = "available";
                  appliedRestored++;
                }
                sizes[sz] = entry;
              }
              return { ...v, sizes };
            });
            for (const v of variants) {
              for (const sd of Object.values(v.sizes || {}) as any[]) {
                if ((sd?.stock_status || "available") === "available") {
                  anyAvailable = true;
                  break;
                }
              }
              if (anyAvailable) break;
            }
            productTitle = (prod as any).title || null;
            const audit = {
              ...((prod as any).variant_availability || {}),
              _stock_updated_at: new Date().toISOString(),
              _out: [...outIds],
              _discontinued: [...discIds],
              _applied: { out: appliedOut, discontinued: appliedDisc, restored: appliedRestored },
            };
            const patch: Record<string, any> = { variants, variant_availability: audit };
            if (!anyAvailable) patch.in_stock = false; // sens unique : on ne réactive jamais ici
            await supabaseAdmin.from("products").update(patch).eq("id", (prod as any).id);
          }
        } catch (e) { console.warn("stock_updated apply failed", e); }

        // notif admin (enrichie du appliqué)
        try {
          await supabaseAdmin.from("notifications").insert({
            title: `Stock Printful mis à jour — produit ${productId}`,
            description: [
              summary,
              productTitle ? `« ${productTitle} ».` : null,
              (appliedOut + appliedDisc + appliedRestored) > 0
                ? `Appliqué : ${appliedDisc} supprimée(s), ${appliedOut} en rupture, ${appliedRestored} restaurée(s).`
                : "Aucune taille à ID connu à mettre à jour (prochain sync complet).",
            ].filter(Boolean).join(" "),
            category: "products",
            priority: discIds.size > 0 ? "high" : "medium",
            status: "unread",
            metadata: {
              productId: String(productId),
              out: [...outIds],
              discontinued: [...discIds],
              applied: { out: appliedOut, discontinued: appliedDisc, restored: appliedRestored },
              linkTo: "/admin/products",
              source: "Printful",
            },
            action_label: "Voir le produit",
          });
        } catch {}
        return new Response(JSON.stringify({ received: true, handled: true, type: "stock_updated" }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      // ── 4b. Événements catalogue produit (aucune commande liée) ──────
      // product_synced / product_updated : un produit ou une variante a été
      // créé/modifié côté Printful. product_deleted : produit ou variante
      // supprimé côté Printful. Payload: data.sync_product (+ sync_variant
      // éventuel). Réponse rapide (2xx) : on trace + notifie, le resync
      // complet reste manuel via l'admin (trop lourd pour un webhook).
      if (type === "product_synced" || type === "product_updated" || type === "product_deleted") {
        const sp = (data as any).sync_product || {};
        const pfProductId = sp.id ?? (data as any).product_id ?? null;
        const pfVariant = (data as any).sync_variant || null;
        const pfName = sp.name || (pfVariant ? `variante ${pfVariant.id ?? ""}`.trim() : null);

        // Retrouver le produit local via external_product_id (= sync product id)
        let localProduct: any = null;
        if (pfProductId != null) {
          try {
            const { data: found } = await supabaseAdmin
              .from("products")
              .select("id, title, is_active, in_stock")
              .eq("external_product_id", String(pfProductId))
              .maybeSingle();
            if (found) localProduct = found;
          } catch {}
        }

        const isDelete = type === "product_deleted";
        const scopeLabel = pfVariant
          ? `variante ${pfVariant.id ?? "?"} du produit`
          : "produit";
        const displayName = pfName || (localProduct?.title as string) || `sync product ${pfProductId ?? "?"}`;

        // Suppression produit entier côté Printful → masquer de la vente
        // (in_stock=false, réversible ; le resync restaure si retour).
        // Suppression de variante seule → audit pour le prochain sync.
        let deactivated = false;
        if (isDelete && localProduct && !pfVariant) {
          try {
            await supabaseAdmin.from("products").update({ in_stock: false }).eq("id", localProduct.id);
            deactivated = true;
          } catch (e) { console.warn("product_deleted deactivate failed", e); }
        } else if (isDelete && localProduct && pfVariant?.id != null) {
          try {
            const { data: prod } = await supabaseAdmin.from("products").select("variant_availability").eq("id", localProduct.id).maybeSingle();
            const audit = { ...((prod as any)?.variant_availability || {}), _deleted_at: new Date().toISOString(), _deleted_variant: String(pfVariant.id) };
            await supabaseAdmin.from("products").update({ variant_availability: audit }).eq("id", localProduct.id);
          } catch (e) { console.warn("product_deleted audit failed", e); }
        }

        // Trace d'audit (statuts lus par l'admin : success/partial/error)
        try {
          await supabaseAdmin.from("sync_logs").insert({
            id: `log-${Date.now()}`,
            sync_date: new Date().toISOString(),
            status: isDelete ? "error" : "success",
            message: `Printful ${type} : ${scopeLabel} « ${displayName} »${localProduct ? "" : " (produit local introuvable)"}${deactivated ? " — masqué de la vente (in_stock=false)" : ""}`,
            product_id: localProduct?.id || null,
          });
        } catch (e) { console.warn("product event sync_logs failed", e); }

        // Notification admin (catégorie products, déjà affichée)
        try {
          await supabaseAdmin.from("notifications").insert({
            title: isDelete
              ? `Produit supprimé côté Printful — ${displayName}`
              : `Produit ${type === "product_synced" ? "synchronisé" : "modifié"} côté Printful — ${displayName}`,
            description: [
              localProduct ? `Produit local : ${localProduct.title}.` : `Aucun produit local lié (sync product ${pfProductId ?? "?"}).`,
              isDelete
                ? deactivated
                  ? "Masqué de la vente (in_stock=false). Vérifiez puis resynchronisez."
                  : "Vérifiez le catalogue puis resynchronisez si besoin."
                : "Lancez une resynchronisation pour répercuter le changement.",
            ].join(" "),
            category: "products",
            priority: isDelete ? "high" : "medium",
            status: "unread",
            metadata: {
              syncProductId: pfProductId != null ? String(pfProductId) : null,
              syncVariantId: pfVariant?.id != null ? String(pfVariant.id) : null,
              productId: localProduct?.id || null,
              deactivated,
              linkTo: "/admin/products",
              source: "Printful",
            },
            action_label: "Voir les produits",
          });
        } catch (err) { console.warn("Échec notification admin (produit):", err); }

        return new Response(JSON.stringify({ received: true, handled: true, type }), {
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
      // GET idempotent : retry 429/5xx best-effort (gap 14).
      try {
        const { data: podSettings } = await supabaseAdmin.from("pod_settings").select("api_key").eq("id", "pod-main").maybeSingle();
        const apiKey = (podSettings as any)?.api_key;
        if (apiKey && pfOrderId) {
          const { res: vRes } = await fetchWithRetry(
            `https://api.printful.com/orders/${encodeURIComponent(String(pfOrderId))}`,
            { headers: { Authorization: `Bearer ${apiKey}` } },
            { attempts: 2, baseMs: 400, idempotent: true },
          );
          if (!vRes) {
            // Printful injoignable après retries : on continue (fail-open,
            // les autres gardes restent actives).
          } else if (!vRes.ok && vRes.status === 404) {
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
        // Normaliser l'existant en tableau (avant toute décision de statut :
        // le multi-colis doc — un event PAR colis — en dépend).
        const existing = order.tracking_info;
        const existingShipments: any[] = Array.isArray(existing)
          ? existing
          : existing
            ? [existing]
            : [];

        // Anti-doublon : Printful peut renvoyer le même webhook en retry
        // (même tracking_number, retries>0). Dans ce cas on ne ré-ajoute
        // pas le colis et on ne renvoie ni email ni notification.
        if (trackingNumber) {
          isDuplicate = existingShipments.some(
            (s) => s?.tracking_number === trackingNumber,
          );
        }

        // Compteur du colis courant (hors bloc décision pour stockage ci-dessous).
        let currentQty: number | null = null;
        if (!isDuplicate) {
          // ── Quantités : Shipment.items (doc openapi `Shipment.items[]`) ──
          // Chaque item porte `quantity`. On stocke item_count par colis
          // pour cumuler à travers les webhooks successifs.
          try {
            const sItems = (shipment as any)?.items;
            if (Array.isArray(sItems) && sItems.length > 0) {
              let sum = 0;
              let known = true;
              for (const it of sItems) {
                const q = Number((it as any)?.quantity);
                if (!Number.isFinite(q) || q <= 0) {
                  known = false;
                  break;
                }
                sum += q;
              }
              if (known && sum > 0) currentQty = sum;
            }
          } catch {}
          const prevQty = existingShipments.reduce((acc: number, s: any) => {
            const q = Number(s?.item_count);
            return acc + (Number.isFinite(q) && q > 0 ? q : 0);
          }, 0);
          const prevKnown = existingShipments.every((s: any) => {
            const q = Number(s?.item_count);
            return Number.isFinite(q) && q > 0;
          });

          // Total commandé (source locale, best-effort).
          let totalQty: number | null = null;
          try {
            const { data: oItems } = await supabaseAdmin
              .from("order_items")
              .select("quantity")
              .eq("order_id", orderId);
            if (Array.isArray(oItems) && oItems.length > 0) {
              let sum = 0;
              let known = true;
              for (const r of oItems) {
                const q = Number((r as any)?.quantity);
                if (!Number.isFinite(q) || q <= 0) {
                  known = false;
                  break;
                }
                sum += q;
              }
              if (known && sum > 0) totalQty = sum;
            }
          } catch {}

          // ── Décision partial vs shipped (doc : partial = une partie ──
          // expédiée, le reste suit ; fulfilled = tout expédié) ──
          // - Jamais de recul shipped → partial.
          // - Reshipment Printful : on reste shipped.
          // - Quantités connues : cumulé < total → partial, sinon shipped.
          // - Quantités inconnues : repli prudent — 1er colis d'une
          //   commande multi-unités → partial (corrigé en shipped au
          //   webhook suivant), sinon shipped (ancien comportement).
          //   L'email "shipped" ne part QUE sur newStatus shipped ; le
          //   template "partial" arrivera en Phase 2.
          const isReship = (shipment as any)?.reshipment === true;
          let wanted: string | null = null;
          if (order.status !== "shipped" && order.status !== "delivered") {
            if (isReship) {
              wanted = "shipped";
            } else if (
              currentQty != null &&
              totalQty != null &&
              prevKnown
            ) {
              wanted =
                prevQty + currentQty < totalQty ? "partial" : "shipped";
            } else if (totalQty != null && totalQty > 1 && existingShipments.length === 0 && currentQty == null) {
              wanted = "partial";
            } else {
              wanted = "shipped";
            }
            // Garde state-machine : si partial refusé depuis l'état
            // courant mais shipped accepté (ex. paid→partial ok de toute
            // façon, mais sécurité), on dégrade proprement ; sinon rien.
            if (
              wanted &&
              !isWebhookTransitionAllowed(order.status, wanted)
            ) {
              if (
                wanted === "partial" &&
                isWebhookTransitionAllowed(order.status, "shipped")
              ) {
                wanted = "shipped";
              } else {
                wanted = null;
              }
            }
          }
          newStatus = wanted;
        } // fin décision (doublons exclus) — la suite s'exécute dans tous les cas non-dupliqués ci-dessous

        // Fenêtre d'arrivée estimée pour CE colis (ship_date + délais)
        const { estimatedMinDate, estimatedMaxDate } = computeEstimate(
          shipDate,
          minDays,
          maxDays,
        );

        // Nouveau colis à ajouter (reshipment du flag Printful + compteur
        // d'unités pour le cumul multi-colis à travers les webhooks).
        const newShipment = {
          carrier: carrier || null,
          service: shipment?.service || null,
          tracking_number: trackingNumber || null,
          tracking_url: trackingUrl || null,
          ship_date: shipDate || null,
          reshipment: shipment?.reshipment === true,
          estimated_min_date: estimatedMinDate,
          estimated_max_date: estimatedMaxDate,
          item_count: currentQty,
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
      } else if (type === "order_put_hold_approval") {
        if (order.status !== "on_hold") {
          newStatus = "on_hold";
        }
        // Stocker les données d'approbation sur la commande pour que
        // l'admin puisse voir les fichiers et approuver/rejeter.
        const approvalFiles = data.approval_files || [];
        updatePayload.approval_data = {
          reason: reason || "Design adjustment needed",
          approval_files: approvalFiles.map((f: any) => ({
            confirm_hash: f.confirm_hash || "",
            submitted_design: f.submitted_design || "",
            recommended_design: f.recommended_design || "",
            approval_sheet: f.approval_sheet || "",
          })),
          received_at: new Date().toISOString(),
        };
        notes.push(
          `Approbation requise${reason ? ` : ${reason}` : ""}`,
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
      } else if (type === "order_created") {
        // Confirmation de création côté Printful (notre id via external_id).
        // Action unique : lier l'ID Printful si absent. Pas de changement de
        // statut (la commande reste paid/in_production), pas d'email client
        // (la confirmation d'achat est déjà partie au checkout).
        if (pfOrderId != null && !order.external_order_id) {
          updatePayload.external_order_id = String(pfOrderId);
          notes.push(`Commande confirmée côté Printful (ID ${pfOrderId})`);
          (updatePayload as any)._firstLink = true;
        }
      } else if (type === "order_updated") {
        // Réconciliateur : Printful notifie TOUTE mise à jour (y compris
        // celles déjà couvertes par d'autres webhooks). On n'agit que sur
        // un vrai changement de statut mappé + autorisé — sinon acquitter
        // silencieusement (anti-spam notifications/emails).
        if (pfOrderId != null && !order.external_order_id) {
          updatePayload.external_order_id = String(pfOrderId);
        }
        const pfStatus = (orderData as any)?.status;
        const mapped = mapPrintfulStatusToLocal(pfStatus);
        if (mapped && mapped !== order.status) {
          newStatus = mapped;
          notes.push(`Statut Printful synchronisé : ${pfStatus} → ${mapped}`);
        }
      }

      if (newStatus) updatePayload.status = newStatus;
      // P-B State Machine: refuse transition illégale mais conserve tracking_info/notes
      if (newStatus && !isWebhookTransitionAllowed(order.status, newStatus)) {
        console.warn(`P-B: transition ${order.status} -> ${newStatus} non autorisée pour ${type}, status conservé`);
        delete updatePayload.status;
        newStatus = null;
      }
      // Marqueur interne (non-colonne) : première liaison order_created.
      const firstLink = (updatePayload as any)._firstLink === true;
      delete (updatePayload as any)._firstLink;
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
        // Libellé selon la transition réelle (Phase 0 : partial vs shipped).
        if (order.client_id) {
          try {
            const isPartial = newStatus === "partial";
            await supabaseAdmin.from("customer_notifications").insert({
              customer_id: order.client_id,
              title: order.client_name
                ? isPartial
                  ? `Votre commande ${orderId} est partiellement expédiée !`
                  : `Votre commande ${orderId} est expédiée !`
                : isPartial
                  ? `Commande ${orderId} partiellement expédiée`
                  : `Commande ${orderId} expédiée`,
              message: [
                isPartial
                  ? `Le premier colis de votre commande ${orderId} a été expédié${carrier ? ` par ${carrier}` : ""}. Le reste suit.`
                  : `Votre commande ${orderId} a été expédiée${carrier ? ` par ${carrier}` : ""}.`,
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
            title:
              newStatus === "partial"
                ? `Commande ${orderId} partiellement expédiée`
                : `Commande ${orderId} expédiée`,
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
        // Email "partial" sur 1er colis d'un multi-colis (Phase 2) : le
        // client voit le colis parti, pas un faux "shipped".
        if (newStatus === "shipped") {
          await sendShippedEmail(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            order,
            allShipments,
          );
        } else if (newStatus === "partial") {
          await sendPartialEmail(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            order,
            allShipments,
          );
        }
      }

      // ── 6b. Notification client pour approbation design ──────────
      if (type === "order_put_hold_approval" && order.client_id) {
        try {
          await supabaseAdmin.from("customer_notifications").insert({
            customer_id: order.client_id,
            title: `Votre commande ${orderId} est en revue`,
            message: `Nous vérifions que votre design soit parfait sur le produit. Mise à jour sous 24-48h.`,
            type: "order_status",
            is_read: false,
            metadata: { orderId },
          });
        } catch (err) {
          console.warn("Échec notification client (approval):", err);
        }

        // Email d'attente rassurant
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        await sendApprovalEmail(supabaseUrl, serviceRoleKey, order, reason);
      }

      // ── 6c. order_created : notif admin uniquement à la 1re liaison ──
      // (les retries Printful ne renotifient pas). Pas de notif client ni
      // d'email : la confirmation d'achat est déjà partie au checkout.
      if (type === "order_created" && firstLink) {
        try {
          await supabaseAdmin.from("notifications").insert({
            title: `Commande ${orderId} confirmée côté Printful`,
            description: `${order.client_name || "Client"} — ID Printful ${pfOrderId}. La production va démarrer.`,
            category: "orders",
            priority: "low",
            status: "unread",
            metadata: {
              orderId,
              printfulOrderId: pfOrderId != null ? String(pfOrderId) : null,
              linkTo: "/admin/orders",
              source: "Printful",
            },
            action_label: "Voir la commande",
          });
        } catch (err) {
          console.warn("Échec notification admin (created):", err);
        }
      }

      // ── 6d. order_updated : notifs uniquement sur vrai changement ──
      // (les updates sans changement de statut sont acquittés en silence).
      // Pas d'email : les événements dédiés (shipped/failed/...) ont le leur.
      if (type === "order_updated" && newStatus) {
        try {
          await supabaseAdmin.from("notifications").insert({
            title: `Commande ${orderId} → ${newStatus === "in_production" ? "en production" : "partielle"}`,
            description: `${order.client_name || "Client"} — statut Printful synchronisé (${(orderData as any)?.status || "?"}).`,
            category: "orders",
            priority: "low",
            status: "unread",
            metadata: {
              orderId,
              newStatus,
              linkTo: "/admin/orders",
              source: "Printful",
            },
            action_label: "Voir la commande",
          });
        } catch (err) {
          console.warn("Échec notification admin (updated):", err);
        }

        if (order.client_id) {
          try {
            await supabaseAdmin.from("customer_notifications").insert({
              customer_id: order.client_id,
              title: `Votre commande ${orderId} est en production`,
              message: `Bonne nouvelle : votre commande ${orderId} est en cours de production. Vous serez notifié à l'expédition.`,
              type: "order_status",
              is_read: false,
              metadata: { orderId, status: newStatus },
            });
          } catch (err) {
            console.warn("Échec notification client (updated):", err);
          }
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
        order_put_hold_approval: {
          title: `Approbation requise — commande ${orderId}`,
          priority: "high",
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
            category: type === "order_put_hold_approval" ? "approval" : "orders",
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

        // Emails client Phase 2 (moule canonique) + notif in-app, UNIQUEMENT
        // sur transition réelle (newStatus) : les retries Printful ne
        // renotifient jamais. Email = adresse du checkout (guest = loggé) ;
        // in-app = client_id requis (commande liée à un compte).
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const notifyCustomer = async (title: string, message: string, status: string) => {
          if (!order.client_id) return;
          try {
            await supabaseAdmin.from("customer_notifications").insert({
              customer_id: order.client_id,
              title,
              message,
              type: "order_status",
              is_read: false,
              metadata: { orderId, status },
            });
          } catch (err) {
            console.warn("Échec notification client:", logSafe(err));
          }
        };
        if (type === "order_failed" && newStatus === "cancelled") {
          await sendFailedEmail(supabaseUrl, serviceRoleKey, order, reason);
          await notifyCustomer(
            `Votre commande ${orderId} n'a pas pu être traitée`,
            `Votre commande ${orderId} a rencontré un problème technique. Notre équipe travaille dessus — remboursement automatique si vous avez été débité.`,
            "cancelled",
          );
        } else if (type === "order_canceled" && newStatus === "cancelled") {
          await sendCancelledEmail(supabaseUrl, serviceRoleKey, order, reason);
          await notifyCustomer(
            `Votre commande ${orderId} est annulée`,
            `Votre commande ${orderId} a été annulée. Contactez notre support pour toute question.`,
            "cancelled",
          );
        } else if (type === "order_put_hold" && newStatus === "on_hold") {
          // Pause hors approval (ex. coût broderie async, doc Orders API).
          await sendOnHoldEmail(supabaseUrl, serviceRoleKey, order, reason);
          await notifyCustomer(
            `Votre commande ${orderId} est en pause`,
            `Votre commande ${orderId} est temporairement en pause le temps de résoudre un détail de production. Aucune action requise.`,
            "on_hold",
          );
        } else if (type === "order_remove_hold" && newStatus === "in_production") {
          await sendBackInProductionEmail(supabaseUrl, serviceRoleKey, order);
          await notifyCustomer(
            `Votre commande ${orderId} est en production`,
            `Bonne nouvelle : votre commande ${orderId} est en cours de production. Vous serez notifié à l'expédition.`,
            "in_production",
          );
        } else if (type === "order_refunded" && newStatus === "refunded") {
          const amount = (data as any)?.amount ?? null;
          await sendRefundedEmail(supabaseUrl, serviceRoleKey, order, amount);
          await notifyCustomer(
            `Votre commande ${orderId} est remboursée`,
            `Votre commande ${orderId} a été remboursée. Le montant apparaîtra sur votre moyen de paiement sous quelques jours.`,
            "refunded",
          );
        } else if (type === "package_returned" && newStatus === "returned") {
          await sendReturnedEmail(supabaseUrl, serviceRoleKey, order, reason);
          await notifyCustomer(
            `Votre commande ${orderId} est retournée`,
            `Votre colis ${orderId} nous a été retourné. Notre support vous contactera pour une réexpédition ou un remboursement.`,
            "returned",
          );
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
      // Gap 13 : toute 500 est tracée (page Monitoring). Printful retente
      // de lui-même (1..1024 min) ; severity high, pas de notif (le retry
      // couvre le transitoire, la page montre le persistant).
      // Client reconstruit ici (supabaseAdmin du try est hors scope).
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await reportError(admin, {
          fn: "printful-webhook",
          action: "handler",
          error,
          severity: "high",
        });
      } catch {}
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
