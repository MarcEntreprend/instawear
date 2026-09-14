// supabase/functions/refund-request/index.ts

// @ts-nocheck
// Demande de remboursement côté client (bouton compte).
// L'éligibilité est tranchée SERVEUR (statut + fenêtre 14j + pas de
// doublon) : le front n'affiche le bouton qu'à titre indicatif.
// Invités (sans compte) : pas de JWT → passer par /contact (indiqué en UI).
//
// Contrat :
//   POST { orderId, amountCents?, message? } + JWT propriétaire.
//   - Ownership : order.client_id == uid OU order.client_email == email.
//   - Éligible : paid/in_production/on_hold (annulation, intégral) OU
//     delivered depuis ≤14 jours (retour). shipped = refusé (en transit,
//     voir support). Terminaux/pending = refusés.
//   - Pas de demande pending existante sur la commande (409).
//   - Crée refund_requests(pending) + in-app client + trio admin (finance).
// Best-effort isolés ; 4xx explicites.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logSafe } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { notifyAdmin } from "./_shared/notifyAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ORDER_ID_RE = /^ORD-[0-9]{4}-[0-9]{6}$/;
const CANCELABLE = ["paid", "in_production", "on_hold"];
const RETURN_WINDOW_DAYS = 14;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    try {
      if (await isRateLimited(req, rateLimitKey(req, "refund-request"))) {
        return json({ error: "Trop de requêtes." }, 429);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // JWT propriétaire exigé (invités → /contact, indiqué en UI).
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const internal = (req.headers.get("apikey") || "") === serviceRoleKey;
      let callerId: string | null = null;
      let callerEmail: string | null = null;
      if (!internal) {
        const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
        if (!token) return json({ error: "Unauthorized" }, 401);
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.getUser(token);
        if (userError || !userData?.user) return json({ error: "Invalid session" }, 401);
        callerId = userData.user.id;
        callerEmail = (userData.user.email || "").toLowerCase() || null;
      }

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
      const message =
        typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
      const amountAsked =
        body.amountCents === undefined || body.amountCents === null
          ? null
          : Number(body.amountCents);
      if (amountAsked !== null && (!Number.isInteger(amountAsked) || amountAsked <= 0)) {
        return json({ error: "amountCents doit être un entier > 0 (centimes)" }, 400);
      }

      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      if (!order) return json({ error: "Commande introuvable" }, 404);

      if (!internal) {
        const ownerId = order.client_id ? String(order.client_id) : null;
        const ownerEmail = (order.client_email || "").toLowerCase() || null;
        if (ownerId !== callerId && ownerEmail !== callerEmail) {
          return json({ error: "Forbidden" }, 403);
        }
      }

      // Éligibilité serveur.
      const status = String(order.status || "");
      let kind: "cancel" | "return" | null = null;
      if (CANCELABLE.includes(status)) {
        kind = "cancel";
      } else if (status === "delivered") {
        const deliveredAt = (order as any)?.updated_at
          ? new Date((order as any).updated_at).getTime()
          : new Date(order.createdAt || order.created_at || Date.now()).getTime();
        const ageDays = (Date.now() - deliveredAt) / 86400000;
        if (ageDays <= RETURN_WINDOW_DAYS) kind = "return";
        else {
          return json(
            { error: "Délai de retour dépassé (14 jours après livraison). Contactez le support." },
            409,
          );
        }
      } else if (status === "shipped") {
        return json(
          { error: "Colis en transit : attendez la livraison ou contactez le support." },
          409,
        );
      } else {
        return json({ error: `Statut '${status}' non éligible au remboursement.` }, 409);
      }

      if (amountAsked !== null) {
        const totalCents = Math.round(Number(order.total_amount || 0) * 100);
        if (totalCents > 0 && amountAsked > totalCents) {
          return json({ error: "Montant supérieur au total de la commande" }, 400);
        }
      }

      // Pas de doublon : une seule demande ouverte par commande.
      const { data: open } = await supabaseAdmin
        .from("refund_requests")
        .select("id")
        .eq("order_id", orderId)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      if (open) {
        return json({ error: "Une demande est déjà en cours pour cette commande." }, 409);
      }

      const { data: created, error: insertError } = await supabaseAdmin
        .from("refund_requests")
        .insert({
          order_id: orderId,
          customer_id: order.client_id || callerId,
          customer_email: order.client_email || callerEmail,
          amount_cents: amountAsked,
          reason: message || (kind === "cancel" ? "Annulation demandée par le client" : "Retour demandé par le client"),
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (insertError || !created) {
        return json({ error: "Création impossible pour le moment." }, 500);
      }

      // In-app client (confirmation de réception).
      try {
        const customerId = order.client_id || callerId;
        if (customerId) {
          await supabaseAdmin.from("customer_notifications").insert({
            customer_id: customerId,
            title: `Refund request received — ${orderId}`,
            message: `Your ${kind === "cancel" ? "cancellation" : "return"} request for order ${orderId} is under review. We'll notify you of the decision.`,
            type: "order_status",
            is_read: false,
            metadata: { orderId, requestId: (created as any).id },
          });
        }
      } catch (e) {
        console.warn("[refund-request] in-app:", logSafe(e));
      }

      // Trio admin (file Finances).
      try {
        await notifyAdmin(
          {
            supabaseAdmin,
            supabaseUrl: Deno.env.get("SUPABASE_URL")!,
            serviceRoleKey,
            resendApiKey: Deno.env.get("RESEND_API_KEY")!,
            resendFrom: Deno.env.get("RESEND_FROM_EMAIL") || "onboarding@resend.dev",
            adminEmail: Deno.env.get("ADMIN_NOTIFY_EMAIL") || "",
          },
          {
            title: `Demande de remboursement — commande ${orderId}`,
            description: `${order.client_name || order.client_email || "Client"} — ${kind === "cancel" ? "annulation" : "retour"}${message ? ` : ${message}` : ""}`.slice(0, 300),
            category: "finance",
            priority: "medium",
            linkTo: "/admin/finances",
            metadata: { orderId, requestId: (created as any).id, kind, source: "refund-request" },
            action_label: "Voir les finances",
          },
        );
      } catch (e) {
        console.warn("[refund-request] trio:", logSafe(e));
      }

      return json({ ok: true, requestId: (created as any).id, kind });
    } catch (e: any) {
      console.error("[refund-request] fatal:", logSafe(e?.message || e));
      return json({ error: "Erreur interne. Réessayez plus tard." }, 500);
    }
  },
};
