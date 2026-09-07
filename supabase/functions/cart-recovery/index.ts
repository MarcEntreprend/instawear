// supabase/functions/cart-recovery/index.ts
// @ts-nocheck
// Relance panier abandonné — SERVICE_ROLE UNIQUEMENT (cron ou admin).
//
// Trouve les paniers inactifs depuis X heures (défaut 48, clamp 1..168),
// ignore les opt-out marketing (customers.email_preferences.promotions),
// ignore les paniers déjà relancés (reminded_at) et les clients ayant
// commandé depuis, envoie un rappel Resend, marque reminded_at.
//
// Limite Resend mode test : sans domaine vérifié, seuls les destinataires
// = adresse du compte reçoivent le mail. Les échecs par destinataire ne
// font jamais échouer le run (comptés dans failed, détails loggés).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, rateLimitKey } from "./_shared/rateLimit.ts";
import { isPayloadTooLarge } from "./_shared/validators.ts";
import { logSafe } from "./_shared/logSafe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isServiceCaller(req: Request, supabaseAdmin: any): Promise<boolean> {
  const apikeyHeader = req.headers.get("apikey") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (apikeyHeader && apikeyHeader === serviceRoleKey) return true;
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return false;
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !userData?.user) return false;
  const { data: adminRow } = await supabaseAdmin
    .from("admin_users")
    .select("id")
    .eq("email", userData.user.email)
    .maybeSingle();
  return !!adminRow;
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    try {
      const rawBody = await req.text();
      if (isPayloadTooLarge(rawBody)) {
        return json({ error: "Payload trop volumineux" }, 413);
      }
      let body: any = {};
      try {
        body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return json({ error: "Payload JSON invalide" }, 400);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const key = rateLimitKey(req, "cart-recovery");
      if (await isRateLimited(req, key)) {
        return json({ error: "Trop de requetes." }, 429);
      }
      if (!(await isServiceCaller(req, supabaseAdmin))) {
        return json({ error: "Non autorisé : accès backend uniquement" }, 401);
      }

      // Paramètres validés (jamais de confiance aveugle, même en admin)
      const dryRun = body.dry_run === true;
      let hours = Number(body.hours);
      if (!Number.isFinite(hours)) hours = 48;
      hours = Math.min(168, Math.max(1, Math.floor(hours)));
      let limit = Number(body.limit);
      if (!Number.isFinite(limit)) limit = 50;
      limit = Math.min(200, Math.max(1, Math.floor(limit)));

      const cutoff = new Date(Date.now() - hours * 3600000).toISOString();

      // Paniers abandonnés : lignes anciennes, jamais relancées
      const { data: lines, error: linesError } = await supabaseAdmin
        .from("cart_items")
        .select("client_id, added_at, quantity, unit_price, product_id")
        .lt("added_at", cutoff)
        .is("reminded_at", null)
        .order("added_at", { ascending: true })
        .limit(limit * 5);
      if (linesError) throw linesError;

      // Regroupe par client
      const byClient = new Map<string, any[]>();
      for (const l of lines || []) {
        if (!l.client_id) continue;
        if (!byClient.has(l.client_id)) byClient.set(l.client_id, []);
        byClient.get(l.client_id)!.push(l);
      }

      let skippedOptOut = 0;
      let skippedOrdered = 0;
      let sent = 0;
      let failed = 0;
      const failures: string[] = [];

      for (const [clientId, items] of byClient) {
        if (sent + failed >= limit) break;
        // Client + opt-out marketing
        const { data: customer } = await supabaseAdmin
          .from("customers")
          .select("id, email, name, email_preferences")
          .eq("id", clientId)
          .maybeSingle();
        const email = (customer as any)?.email;
        if (!email) continue;
        const prefs = (customer as any)?.email_preferences || {};
        if (prefs.promotions === false) {
          skippedOptOut += 1;
          continue;
        }
        // Déjà commandé depuis ? → plus un abandon
        const latestAdd = items
          .map((i: any) => new Date(i.added_at).getTime())
          .reduce((a: number, b: number) => Math.max(a, b), 0);
        const { data: laterOrder } = await supabaseAdmin
          .from("orders")
          .select("id")
          .or(`client_id.eq.${clientId},client_email.eq.${email}`)
          .gt("created_at", new Date(latestAdd).toISOString())
          .limit(1)
          .maybeSingle();
        if (laterOrder) {
          skippedOrdered += 1;
          continue;
        }

        const count = items.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);
        if (dryRun) {
          sent += 1;
          continue;
        }
        try {
          const firstName = ((customer as any)?.name || "").split(" ")[0] || "there";
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")!}`,
            },
            body: JSON.stringify({
              from: Deno.env.get("RESEND_FROM_EMAIL")!,
              to: [email],
              subject: "Your cart is waiting 🛒",
              html:
                `<div style="font-family:sans-serif;max-width:600px">` +
                `<h2>Hi ${firstName}, your cart is waiting!</h2>` +
                `<p>You left <b>${count} item${count > 1 ? "s" : ""}</b> in your InstaWear cart. They are still reserved for you — for now.</p>` +
                `<p><a href="https://instawear.vercel.app/" style="display:inline-block;background:#ff5c35;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:bold">Back to my cart</a></p>` +
                `<p style="color:#888;font-size:12px">No longer interested? Just ignore this email.</p>` +
                `</div>`,
            }),
          });
          if (!res.ok) {
            const detail = await res.json().catch(() => ({}));
            throw new Error(`resend ${res.status}: ${JSON.stringify(detail).slice(0, 200)}`);
          }
          sent += 1;
        } catch (e) {
          failed += 1;
          const msg = logSafe(String(e)).slice(0, 120);
          failures.push(`${email}: ${msg}`);
          console.error("cart-recovery resend:", logSafe(String(e)));
          continue;
        }
        // Marque relancé seulement si l'email est parti (sinon on réessaiera)
        if (!dryRun) {
          await supabaseAdmin
            .from("cart_items")
            .update({ reminded_at: new Date().toISOString() })
            .eq("client_id", clientId)
            .is("reminded_at", null)
            .lt("added_at", cutoff);
        }
      }

      return json({
        success: true,
        dry_run: dryRun,
        carts_found: byClient.size,
        sent,
        failed,
        skipped_opt_out: skippedOptOut,
        skipped_ordered: skippedOrdered,
        failures: failures.slice(0, 10),
      });
    } catch (e) {
      console.error("cart-recovery fatal:", logSafe(String(e)));
      return json({ error: "Erreur interne. Réessayez plus tard." }, 500);
    }
  },
};
