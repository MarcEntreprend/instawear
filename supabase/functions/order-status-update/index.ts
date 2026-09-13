// supabase/functions/order-status-update/index.ts

// @ts-nocheck
// Changement de statut MANUEL par l'admin — chemin serveur unique.
// Remplace le fire-and-forget front (adminHooks → updateStatus direct +
// emailTemplates via send-email) qui : ne vérifiait aucune transition,
// envoyait des templates minimaux, doublonnait l'email in_production
// (create-printful-order l'envoie déjà) et restait muet sur
// refunded/returned/on_hold/partial.
//
// Contrat :
//   POST { orderId, toStatus, reason? }
//   - Auth : service_role (appels internes) OU JWT admin (admin_users).
//   - Cibles manuelles : in_production, shipped, delivered, cancelled,
//     on_hold, refunded, returned, partial. `paid` = propriété du webhook
//     Stripe, `pending` = état initial : refusés en 409.
//   - Transition validée contre order_status_transitions (même table que
//     les webhooks) ; même statut = no-op { ok, emailed: false }.
//   - in_production : transmission Printful d'abord (self-call
//     create-printful-order, qui possède l'email) ; l'edge n'envoie
//     jamais elle-même cet email (zéro doublon). Si Printful met en
//     pause (broderie/coût async) → email on_hold à la place.
//   - Autres statuts : in-app client+admin + email canonique
//     (orderStatusEmails.ts, adresse du checkout).
//   - Chaque effet best-effort isolé ; seuls 4xx/502/500 remontent.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logSafe } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import {
  buildInProductionEmail,
  buildPartialEmail,
  buildShippedEmail,
  buildDeliveredEmail,
  buildCancelledEmail,
  buildOnHoldEmail,
  buildRefundedEmail,
  buildReturnedEmail,
} from "./_shared/orderStatusEmails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Cibles autorisées en manuel. `paid` (webhook Stripe) et `pending`
// (état initial, aucune transition entrante) sont exclus.
const MANUAL_TARGETS = new Set([
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "on_hold",
  "refunded",
  "returned",
  "partial",
]);

const STATUS_LABELS_FR: Record<string, string> = {
  in_production: "En production",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  on_hold: "En pause",
  refunded: "Remboursée",
  returned: "Retournée",
  partial: "Partielle",
};

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function emailContext(supabaseAdmin: any, orderId: string) {
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
    currencySymbol =
      CURRENCY_SYMBOLS[String((ss as any)?.currency || "USD").toUpperCase()] ||
      "$";
  } catch {}
  return { items, currencySymbol };
}

async function postCustomerEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  orderId: string,
  to: unknown,
  subject: string,
  html: string,
): Promise<boolean> {
  const dest = typeof to === "string" ? to.trim() : "";
  if (!EMAIL_RE.test(dest)) return false;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: serviceRoleKey },
      body: JSON.stringify({ to: dest, subject, html }),
    });
    return res.ok;
  } catch (err) {
    console.error(`[order-status-update] email ${logSafe(orderId)}:`, logSafe(err));
    return false;
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
      if (await isRateLimited(req, rateLimitKey(req, "order-status-update"))) {
        return json({ error: "Trop de requêtes." }, 429);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // ── Auth : service_role (interne) OU JWT admin ──
      const apikeyHeader = req.headers.get("apikey") || "";
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      if (apikeyHeader !== serviceRoleKey) {
        const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
        if (!token) return json({ error: "Unauthorized" }, 401);
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.getUser(token);
        if (userError || !userData?.user)
          return json({ error: "Invalid session" }, 401);
        const { data: adminRow } = await supabaseAdmin
          .from("admin_users")
          .select("id")
          .eq("email", userData.user.email)
          .maybeSingle();
        if (!adminRow) return json({ error: "Admin access required" }, 403);
      }

      // ── Validation stricte du body (whitelist, tailles bornées) ──
      let body: any = {};
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON payload" }, 400);
      }
      const orderId =
        typeof body.orderId === "string" ? body.orderId.trim().slice(0, 64) : "";
      const toStatus =
        typeof body.toStatus === "string" ? body.toStatus.trim() : "";
      const reason =
        typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
      if (!orderId) return json({ error: "orderId requis" }, 400);
      if (!MANUAL_TARGETS.has(toStatus)) {
        const hint =
          toStatus === "paid"
            ? "paid est posé par le webhook Stripe uniquement"
            : toStatus === "pending"
              ? "pending est l'état initial, jamais une cible"
              : `cibles manuelles : ${[...MANUAL_TARGETS].join(", ")}`;
        return json({ error: `Statut cible invalide (${hint})` }, 409);
      }

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return json({ error: "Commande introuvable" }, 404);

      // No-op : même statut → 200 sans effet (idempotence côté UI).
      if (order.status === toStatus)
        return json({ ok: true, emailed: false, noop: true, status: toStatus });

      // State machine serveur (même table que webhooks + approve).
      const { data: transition } = await supabaseAdmin
        .from("order_status_transitions")
        .select("from_status")
        .eq("from_status", order.status)
        .eq("to_status", toStatus)
        .maybeSingle();
      if (!transition) {
        return json(
          { error: `Transition ${order.status} -> ${toStatus} non autorisée` },
          409,
        );
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const fr = STATUS_LABELS_FR[toStatus] || toStatus;

      // ── Cas in_production : la transmission possède l'email ──
      if (toStatus === "in_production") {
        if (!order.external_order_id) {
          // Transmission Printful (transmet + pose le statut + envoie
          // l'email canonique elle-même). Échec → 502, rien n'est changé.
          let pfRes: Response | null = null;
          try {
            pfRes = await fetch(
              `${supabaseUrl}/functions/v1/create-printful-order`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: serviceRoleKey,
                },
                body: JSON.stringify({ orderId }),
              },
            );
          } catch (err) {
            return json(
              { error: `Transmission Printful injoignable: ${logSafe(err)}` },
              502,
            );
          }
          if (!pfRes || !pfRes.ok) {
            const errText = pfRes
              ? (await pfRes.text().catch(() => "")).slice(0, 300)
              : "Printful injoignable";
            return json({ error: `Transmission Printful refusée: ${errText}` }, 502);
          }
          const { data: fresh } = await supabaseAdmin
            .from("orders")
            .select("status")
            .eq("id", orderId)
            .maybeSingle();
          const actual = String((fresh as any)?.status || "in_production");
          await notifyBoth(supabaseAdmin, { ...order, status: actual }, orderId, fr);
          if (actual === "on_hold") {
            // Printful a mis en pause (broderie/coût async) : l'email
            // in_production n'est pas parti, on notifie la pause.
            const emailed = await sendStatusEmail(
              supabaseUrl,
              serviceRoleKey,
              supabaseAdmin,
              { ...order, status: actual },
              "on_hold",
              reason || "Détail de production à résoudre côté fournisseur.",
            );
            return json({ ok: true, emailed, status: actual, transmitted: true, held: true });
          }
          return json({ ok: true, emailed: true, status: actual, transmitted: true });
        }
        // Déjà transmise (external_order_id posé) : simple mise à jour +
        // in-app, SANS email (la transmission l'a déjà envoyé — zéro doublon).
        await supabaseAdmin.from("orders").update({ status: toStatus }).eq("id", orderId);
        await notifyBoth(supabaseAdmin, order, orderId, fr);
        return json({ ok: true, emailed: false, status: toStatus, transmitted: false });
      }

      // ── Cas général : update + in-app + email canonique ──
      const patch: Record<string, any> = { status: toStatus };
      if (reason) {
        const prev = typeof order.notes === "string" ? order.notes : "";
        patch.notes = (prev ? prev + "\n" : "") + `[Admin] ${reason}`.slice(0, 900);
      }
      await supabaseAdmin.from("orders").update(patch).eq("id", orderId);
      await notifyBoth(supabaseAdmin, order, orderId, fr);
      const emailed = await sendStatusEmail(
        supabaseUrl,
        serviceRoleKey,
        supabaseAdmin,
        order,
        toStatus,
        reason,
      );
      return json({ ok: true, emailed, status: toStatus });
    } catch (e: any) {
      console.error("[order-status-update] fatal:", logSafe(e?.message || e));
      return json({ error: "Notification failed. Please try again later." }, 500);
    }
  },
};

// ── In-app client + admin (mêmes tables que le front écrivait en direct) ──
async function notifyBoth(supabaseAdmin: any, order: any, orderId: string, fr: string) {
  const status = order.status;
  try {
    let customerId = order.client_id;
    if (customerId && order.client_email) {
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("id")
        .eq("email", order.client_email)
        .maybeSingle();
      if (customer) customerId = customer.id;
    }
    if (customerId) {
      await supabaseAdmin.from("customer_notifications").insert({
        customer_id: customerId,
        title: `Order ${orderId}`,
        message: `Your order status has been updated to: ${String(status).replace("_", " ")}.`,
        type: "order_status",
        metadata: { orderId, status },
      });
    }
  } catch (e) {
    console.warn("Échec insertion notification client", logSafe(e));
  }
  try {
    await supabaseAdmin.from("notifications").insert({
      title: "Statut commande mis à jour",
      description: `Commande ${orderId} → "${fr}"`,
      category: "orders",
      priority: status === "cancelled" ? "high" : "low",
      metadata: { orderId, linkTo: "/admin/orders", source: "Admin" },
      action_label: "Voir la commande",
    });
  } catch (e) {
    console.warn("Échec création notification statut", logSafe(e));
  }
}

// ── Email canonique par statut (moule Phase 2). in_production exclu ─────────
// (possédé par create-printful-order — voir branche dédiée plus haut).
async function sendStatusEmail(
  supabaseUrl: string,
  serviceRoleKey: string,
  supabaseAdmin: any,
  order: any,
  toStatus: string,
  reason: string,
): Promise<boolean> {
  const { items, currencySymbol } = await emailContext(supabaseAdmin, order.id);
  const shipments = Array.isArray(order.tracking_info)
    ? order.tracking_info
    : order.tracking_info
      ? [order.tracking_info]
      : [];
  let built: { subject: string; html: string } | null = null;
  if (toStatus === "shipped")
    built = buildShippedEmail(order, currencySymbol, shipments);
  else if (toStatus === "delivered")
    built = buildDeliveredEmail(order, items, currencySymbol);
  else if (toStatus === "cancelled")
    built = buildCancelledEmail(order, items, currencySymbol, reason || null);
  else if (toStatus === "on_hold")
    built = buildOnHoldEmail(order, currencySymbol, reason || null);
  else if (toStatus === "refunded")
    built = buildRefundedEmail(order, items, currencySymbol, null);
  else if (toStatus === "returned")
    built = buildReturnedEmail(order, items, currencySymbol, reason || null);
  else if (toStatus === "partial")
    built = buildPartialEmail(order, items, currencySymbol, shipments);
  else if (toStatus === "in_production")
    built = buildInProductionEmail(order, items, currencySymbol);
  if (!built) return false;
  return postCustomerEmail(
    supabaseUrl,
    serviceRoleKey,
    order.id,
    order.client_email,
    built.subject,
    built.html,
  );
}
