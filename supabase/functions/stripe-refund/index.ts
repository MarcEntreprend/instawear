// supabase/functions/stripe-refund/index.ts

// @ts-nocheck
// Remboursement RÉEL (mouvement d'argent Stripe + registre + statut).
// C'est LA voie des refunds : aucun statut 'refunded' ne doit être posé
// sans passer ici (order-status-update le refuse en 409).
//
// Contrat :
//   POST { orderId, amountCents?, reason?, key, requestId? }
//   - Auth : service_role (appels internes) OU JWT admin.
//   - key : UUID d'idempotence fourni par l'appelant (généré par clic).
//     Même clé + même montant = replay sûr (Stripe retourne le même re_…).
//   - Mode NORMAL : exécute refunds.create (mouvement d'argent).
//   - Mode CONSTAT (recordOnly + stripeRefundId) : AUCUN mouvement —
//     vérifie que le refund existe sur Stripe, puis enregistre + statut +
//     notifs. Pour les remboursements faits depuis le dashboard Stripe
//     (filet charge.refunded) : l'argent a déjà bougé, on ne fait que
//     réconcilier. Pas de clé requise dans ce mode (l'unicité re_… garde).
//   - amountCents absent = solde restant (calculé sur Stripe, source de
//     vérité : reçu − déjà-remboursé). Toujours 0 < montant ≤ restant.
//   - reason : duplicate | fraudulent | requested_by_customer
//     (défaut requested_by_customer ; fraudulent = blocklists Radar,
//     réservé aux cas avérés).
//   - Résolution PI : colonne dédiée → external_order_id pi_ → session
//     Checkout expand. Introuvable → 404, JAMAIS d'argent aveugle.
//   - Enregistre order_refunds (re_… unique = garde anti-double).
//   - Statut : complet → 'refunded' si la transition existe en table
//     (sinon statut gardé + note) ; partiel → note seule.
//   - Trio admin + telegram riche de statut + email client canonique.
//   - requestId (optionnel) : marque la demande refund_requests → approved.
// Best-effort isolés ; 4xx/502/500 remontent avec message actionnable.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13";
import { logSafe } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { notifyAdmin } from "./_shared/notifyAdmin.ts";
import { sendTelegramStatus } from "./_shared/telegramNotify.ts";
import { buildRefundedEmail } from "./_shared/orderStatusEmails.ts";
import {
  resolvePaymentIntent,
  remainingOnPI,
  executeRefund,
  isValidIdempotencyKey,
} from "./_shared/stripeRefunds.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REASONS = ["duplicate", "fraudulent", "requested_by_customer"];
const ORDER_ID_RE = /^ORD-[0-9]{4}-[0-9]{6}$/;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", BRL: "R$", CAD: "CA$",
  CHF: "CHF", JPY: "¥", MXN: "MX$", AUD: "A$",
};

// ── Finalisation partagée (exécution OU constat) : registre + statut +
// note + trio + telegram + email client + demande liée. Best-effort isolés.
async function finalizeRefund(ctx: {
  supabaseAdmin: any;
  supabaseUrl: string;
  serviceRoleKey: string;
  order: any;
  orderId: string;
  refundId: string;
  amount: number;
  currency: string;
  mapped: string;
  reason: string;
  actor: string | null;
  isFull: boolean;
  requestId: string | null;
}): Promise<string | null> {
  const { supabaseAdmin, supabaseUrl, serviceRoleKey, order, orderId } = ctx;
  const { refundId, amount, currency, mapped, reason, actor, isFull, requestId } = ctx;

  try {
    await supabaseAdmin.from("order_refunds").insert({
      order_id: orderId,
      stripe_refund_id: refundId || null,
      amount_cents: amount,
      currency,
      reason,
      status: mapped,
      requested_by: actor || "admin",
    });
  } catch (e: any) {
    console.warn("[stripe-refund] registre:", logSafe(e?.message || e));
  }

  let newStatus: string | null = null;
  if (isFull && mapped !== "failed") {
    try {
      const { data: tr } = await supabaseAdmin
        .from("order_status_transitions")
        .select("from_status")
        .eq("from_status", order.status)
        .eq("to_status", "refunded")
        .maybeSingle();
      if (tr) {
        await supabaseAdmin.from("orders").update({ status: "refunded" }).eq("id", orderId);
        newStatus = "refunded";
      }
    } catch {}
  }
  const note =
    `[Refund] ${(amount / 100).toFixed(2)} ${currency} ${isFull ? "(total)" : "(partiel)"}` +
    (refundId ? ` — ${refundId}` : "") +
    ` — motif ${reason}`;
  try {
    const prev = typeof order.notes === "string" ? order.notes : "";
    await supabaseAdmin
      .from("orders")
      .update({ notes: (prev ? prev + "\n" : "") + note.slice(0, 900) })
      .eq("id", orderId);
  } catch {}

  const symbol = CURRENCY_SYMBOLS[currency] || "$";
  try {
    await notifyAdmin(
      {
        supabaseAdmin,
        supabaseUrl,
        serviceRoleKey,
        resendApiKey: Deno.env.get("RESEND_API_KEY")!,
        resendFrom: Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev",
        adminEmail: Deno.env.get("ADMIN_NOTIFY_EMAIL") || "",
      },
      {
        title: `Remboursement ${isFull ? "total" : "partiel"} — commande ${orderId}`,
        description: `${(amount / 100).toFixed(2)} ${currency}${refundId ? ` (${refundId})` : ""} — ${order.client_name || order.client_email || "Client"}`,
        category: "finance",
        priority: "medium",
        linkTo: "/admin/finances",
        metadata: { orderId, refundId, amountCents: amount, source: "stripe-refund" },
        action_label: "Voir les finances",
        skipTelegram: true,
      },
    );
  } catch (e) {
    console.warn("[stripe-refund] trio:", logSafe(e));
  }
  if (newStatus) {
    try {
      await sendTelegramStatus(
        Deno.env.get("TELEGRAM_BOT_TOKEN") || "",
        Deno.env.get("TELEGRAM_CHAT_ID") || "",
        {
          orderId,
          from: order.status,
          to: newStatus,
          customer: order.client_name || order.client_email || null,
          updatedAt: new Date(),
          prevAt: (order as any)?.updated_at ?? null,
        },
      );
    } catch (e) {
      console.warn("[stripe-refund] telegram:", logSafe(e));
    }
  }
  if (mapped !== "failed") {
    try {
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);
      let csymbol = symbol;
      try {
        const { data: ss } = await supabaseAdmin
          .from("store_settings")
          .select("currency")
          .eq("id", true)
          .maybeSingle();
        csymbol = CURRENCY_SYMBOLS[String((ss as any)?.currency || currency).toUpperCase()] || symbol;
      } catch {}
      const built = buildRefundedEmail(
        order,
        Array.isArray(items) ? items : [],
        csymbol,
        `${(amount / 100).toFixed(2)} ${currency}`,
      );
      const dest = String(order.client_email || "").trim();
      if (EMAIL_RE.test(dest)) {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: serviceRoleKey },
          body: JSON.stringify({ to: dest, subject: built.subject, html: built.html }),
        });
      }
    } catch (e) {
      console.warn("[stripe-refund] email client:", logSafe(e));
    }
  }

  if (requestId) {
    try {
      await supabaseAdmin
        .from("refund_requests")
        .update({ status: "approved", decided_by: actor || "admin", decided_at: new Date().toISOString() })
        .eq("id", requestId);
    } catch {}
  }
  return newStatus;
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
      if (await isRateLimited(req, rateLimitKey(req, "stripe-refund"))) {
        return json({ error: "Trop de requêtes." }, 429);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // ── Auth : service_role OU JWT admin ──
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const internal = (req.headers.get("apikey") || "") === serviceRoleKey;
      let actor: string | null = null;
      if (!internal) {
        const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
        if (!token) return json({ error: "Unauthorized" }, 401);
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.getUser(token);
        if (userError || !userData?.user) return json({ error: "Invalid session" }, 401);
        const { data: adminRow } = await supabaseAdmin
          .from("admin_users")
          .select("id")
          .eq("email", userData.user.email)
          .maybeSingle();
        if (!adminRow) return json({ error: "Admin access required" }, 403);
        actor = userData.user.email;
      }

      // ── Validation stricte ──
      let body: any = {};
      try {
        const raw = await req.text();
        if (raw.length > 10 * 1024) return json({ error: "Payload trop volumineux" }, 413);
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return json({ error: "Invalid JSON payload" }, 400);
      }
      const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
      if (!ORDER_ID_RE.test(orderId)) return json({ error: "orderId invalide" }, 400);
      const key = typeof body.key === "string" ? body.key.trim() : "";
      if (!isValidIdempotencyKey(key)) {
        return json({ error: "Clé d'idempotence UUID requise" }, 400);
      }
      const reason =
        typeof body.reason === "string" && REASONS.includes(body.reason)
          ? body.reason
          : "requested_by_customer";
      const amountAsked =
        body.amountCents === undefined || body.amountCents === null
          ? null
          : Number(body.amountCents);
      if (amountAsked !== null && (!Number.isInteger(amountAsked) || amountAsked <= 0)) {
        return json({ error: "amountCents doit être un entier > 0 (centimes)" }, 400);
      }
      const requestId =
        typeof body.requestId === "string" && body.requestId.trim() ? body.requestId.trim() : null;

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return json({ error: "Commande introuvable" }, 404);

      const stripe = new Stripe(
        Deno.env.get("STRIPE_SECRET_KEY_TEST") ||
          Deno.env.get("STRIPE_SECRET_KEY")!,
        { apiVersion: "2023-10-16" },
      );

      // ── Mode CONSTAT : aucun mouvement, on réconcilie un refund qui
      // existe déjà côté Stripe (dashboard, ou filet charge.refunded).
      // Vérifié avant d'écrire quoi que ce soit.
      if (body.recordOnly === true) {
        const rid =
          typeof body.stripeRefundId === "string" ? body.stripeRefundId.trim() : "";
        if (!rid.startsWith("re_")) {
          return json({ error: "stripeRefundId (re_…) requis en mode constat" }, 400);
        }
        let robj: any;
        try {
          robj = await stripe.refunds.retrieve(rid);
        } catch {
          return json({ error: "Remboursement introuvable côté Stripe" }, 404);
        }
        const rpi = typeof (robj as any)?.payment_intent === "string"
          ? (robj as any).payment_intent
          : (robj as any)?.payment_intent?.id || null;
        const ours = [
          typeof order.stripe_payment_intent_id === "string" ? order.stripe_payment_intent_id : null,
          typeof order.external_order_id === "string" && order.external_order_id.startsWith("pi_")
            ? order.external_order_id
            : null,
        ].filter(Boolean);
        if (!rpi || !ours.includes(rpi)) {
          // Hosted sans PI persisté : dernier recours via la session.
          let linked = false;
          if (typeof order.external_order_id === "string" && order.external_order_id.startsWith("cs_")) {
            try {
              const s: any = await stripe.checkout.sessions.retrieve(order.external_order_id, {
                expand: ["payment_intent"],
              });
              const sp = s?.payment_intent;
              linked = (typeof sp === "string" ? sp : sp?.id) === rpi;
            } catch {}
          }
          if (!linked) return json({ error: "Ce remboursement n'appartient pas à cette commande" }, 409);
        }
        const { data: already } = await supabaseAdmin
          .from("order_refunds")
          .select("id")
          .eq("stripe_refund_id", rid)
          .limit(1)
          .maybeSingle();
        if (already) return json({ ok: true, recorded: true, deduped: true, refundId: rid });
        const ramount = Number((robj as any)?.amount || 0);
        const rcurrency = String((robj as any)?.currency || "usd").toUpperCase();
        const rstatus = String((robj as any)?.status || "");
        const rmapped = rstatus === "succeeded" ? "succeeded" : rstatus === "pending" ? "pending" : "failed";
        const orderTotal = Math.round(Number(order.total_amount || 0) * 100);
        const { data: prior } = await supabaseAdmin
          .from("order_refunds")
          .select("amount_cents")
          .eq("order_id", orderId);
        const priorSum = (Array.isArray(prior) ? prior : []).reduce(
          (s: number, r: any) => s + Number(r?.amount_cents || 0),
          0,
        );
        const newStatus = await finalizeRefund({
          supabaseAdmin,
          supabaseUrl: Deno.env.get("SUPABASE_URL")!,
          serviceRoleKey,
          order,
          orderId,
          refundId: rid,
          amount: ramount,
          currency: rcurrency,
          mapped: rmapped,
          reason: String((robj as any)?.reason || "requested_by_customer"),
          actor: actor || "stripe-dashboard",
          isFull: orderTotal > 0 && priorSum + ramount >= orderTotal,
          requestId,
        });
        return json({ ok: true, recorded: true, refundId: rid, status: newStatus });
      }

      // ── Résolution PI + solde (Stripe = source de vérité) ──
      const resolved: any = await resolvePaymentIntent(stripe, supabaseAdmin, order);
      if ((resolved as any)?.error) {
        return json({ error: (resolved as any).error }, 404);
      }
      const piId = (resolved as any).piId as string;
      let remaining = 0;
      let currency = "USD";
      let received = 0;
      try {
        const bal = await remainingOnPI(stripe, piId);
        received = bal.received;
        currency = bal.currency;
        remaining = bal.received - bal.refunded;
      } catch (err: any) {
        return json({ error: `Lecture Stripe impossible: ${logSafe(err?.message || err)}` }, 502);
      }
      if (received <= 0) {
        return json({ error: "Aucun montant encaissé sur ce paiement" }, 409);
      }
      if (remaining <= 0) {
        return json({ error: "Déjà intégralement remboursé côté Stripe" }, 409);
      }
      const amount = amountAsked ?? remaining;
      if (amount > remaining) {
        return json(
          { error: `Montant supérieur au solde remboursable (${(remaining / 100).toFixed(2)})` },
          400,
        );
      }
      const isFull = amount >= remaining;

      // ── Exécution (idempotente par clé) ──
      let refund: any;
      try {
        refund = await executeRefund(stripe, piId, amountAsked, {
          reason,
          idempotencyKey: `refund-${orderId}-${key}`,
          orderId,
        });
      } catch (err: any) {
        const msg = String(err?.message || err);
        // Déjà remboursé entre-temps (race) : on l'enregistre comme tel
        // si un re_… existe, sinon 502 actionnable.
        return json({ error: `Stripe refuse: ${msg.slice(0, 200)}` }, 502);
      }
      const refundId = String((refund as any)?.id || "");
      const refundStatus = String((refund as any)?.status || "");
      const mapped = refundStatus === "succeeded" ? "succeeded" : refundStatus === "pending" ? "pending" : "failed";

      const newStatus = await finalizeRefund({
        supabaseAdmin,
        supabaseUrl: Deno.env.get("SUPABASE_URL")!,
        serviceRoleKey,
        order,
        orderId,
        refundId,
        amount,
        currency,
        mapped,
        reason,
        actor,
        isFull,
        requestId,
      });

      return json({
        ok: true,
        refundId,
        amountCents: amount,
        currency,
        remainingAfter: Math.max(remaining - amount, 0),
        status: newStatus,
        stripeStatus: mapped,
      });
    } catch (e: any) {
      console.error("[stripe-refund] fatal:", logSafe(e?.message || e));
      return json({ error: "Erreur interne. Réessayez plus tard." }, 500);
    }
  },
};
