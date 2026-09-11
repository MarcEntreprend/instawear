// supabase/functions/email-preferences/index.ts
// @ts-nocheck
// Préférences email publiques (/unsubscribe) — remplace le REST anon direct.
//
// Rôle : lire/écrire newsletter_subscribers + customers.email_preferences via
// service_role (le REST anon est verrouillé : migration 20261020), valider,
// rate-limiter, et journaliser chaque changement dans email_preference_events
// (rapport admin : onglet "Préférences" de la page Email Marketing).
//
// Ops : { op: "get", email } → état actuel (jamais d'écriture)
//       { op: "save", email, newsletter?, order_confirmation?, shipping_update?, promotions? }
//       → applique SEULEMENT les clés fournies (fusion, jamais de suppression).
//
// Protections : rate limit 10/min par IP, payload ≤100KB, email strict,
// booléens stricts, clés inconnues rejetées, log d'erreurs sanitizé.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isRateLimited, rateLimitKey, clientIp } from "./_shared/rateLimit.ts";
import { isPayloadTooLarge } from "./_shared/validators.ts";
import { logSafe } from "./_shared/logSafe.ts";
import {
  normalizeEmail,
  validateSaveBody,
  displayPrefs,
  mergePrefs,
  describeChanges,
} from "./_shared/prefs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
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
      const path = "email-preferences";
      const key = rateLimitKey(req, path);
      if (await isRateLimited(req, key)) {
        return json(
          { error: "Too many requests. Please try again in a minute." },
          429,
          { "Retry-After": "60" },
        );
      }

      const rawBody = await req.text();
      if (isPayloadTooLarge(rawBody)) {
        return json({ error: "Payload too large" }, 413);
      }
      let body: any = {};
      try {
        body = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        return json({ error: "Invalid JSON payload" }, 400);
      }

      const op = body.op;
      if (op !== "get" && op !== "save") {
        return json({ error: 'Invalid op (expected "get" or "save")' }, 400);
      }
      const email = normalizeEmail(body.email);
      if (!email) {
        return json({ error: "Invalid email address" }, 400);
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // État actuel (lecture service_role : le REST anon est verrouillé)
      const { data: subRow } = await supabaseAdmin
        .from("newsletter_subscribers")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      const { data: customer } = await supabaseAdmin
        .from("customers")
        .select("id, email_preferences")
        .eq("email", email)
        .maybeSingle();

      const newsletter = !!subRow;
      const isCustomer = !!customer;
      const prefs = displayPrefs(
        (customer?.email_preferences as Record<string, unknown> | null) ?? null,
      );

      if (op === "get") {
        return json({
          ok: true,
          newsletter,
          is_customer: isCustomer,
          prefs: isCustomer ? prefs : null,
        });
      }

      // ── save : applique uniquement les clés fournies ──
      const validated = validateSaveBody(body);
      if ("error" in validated) {
        return json({ error: validated.error }, 400);
      }
      const patch = validated.prefs;

      let newNewsletter = newsletter;
      if (patch.newsletter !== undefined) {
        if (patch.newsletter && !newsletter) {
          const { error } = await supabaseAdmin
            .from("newsletter_subscribers")
            .upsert({ email }, { onConflict: "email" });
          if (error) {
            console.error("email-preferences subscribe:", logSafe(error));
            return json({ error: "Could not save. Please try again later." }, 500);
          }
          newNewsletter = true;
        } else if (!patch.newsletter && newsletter) {
          const { error } = await supabaseAdmin
            .from("newsletter_subscribers")
            .delete()
            .eq("email", email);
          if (error) {
            console.error("email-preferences unsubscribe:", logSafe(error));
            return json({ error: "Could not save. Please try again later." }, 500);
          }
          newNewsletter = false;
        }
      }

      let newPrefs = { ...prefs };
      if (isCustomer) {
        // NOTE : "newsletter" vit dans newsletter_subscribers, jamais dans email_preferences.
        const prefPatch: Partial<Record<string, boolean>> = {};
        if (patch.order_confirmation !== undefined) prefPatch.order_confirmation = patch.order_confirmation;
        if (patch.shipping_update !== undefined) prefPatch.shipping_update = patch.shipping_update;
        if (patch.promotions !== undefined) prefPatch.promotions = patch.promotions;
        if (Object.keys(prefPatch).length > 0) {
          newPrefs = mergePrefs(
            (customer?.email_preferences as Record<string, unknown> | null) ?? null,
            prefPatch,
          );
          // Fusion avec les clés existantes inconnues (jamais de perte)
          const merged = {
            ...((customer?.email_preferences as Record<string, unknown>) || {}),
            ...newPrefs,
          };
          const { error } = await supabaseAdmin
            .from("customers")
            .update({ email_preferences: merged })
            .eq("id", customer.id);
          if (error) {
            console.error("email-preferences prefs:", logSafe(error));
            return json({ error: "Could not save. Please try again later." }, 500);
          }
        }
      }

      // Journal admin (best-effort : un échec de log ne fait jamais échouer le save)
      try {
        const changes = describeChanges(
          { newsletter, prefs, isCustomer },
          { newsletter: newNewsletter, prefs: newPrefs },
        );
        if (Object.keys(changes).length > 0) {
          await supabaseAdmin.from("email_preference_events").insert({
            email,
            changes,
            source: "unsubscribe_page",
            ip: clientIp(req),
          });
        }
      } catch (e) {
        console.error("email-preferences log:", logSafe(e));
      }

      return json({
        ok: true,
        newsletter: newNewsletter,
        is_customer: isCustomer,
        prefs: isCustomer ? newPrefs : null,
      });
    } catch (e) {
      console.error("email-preferences fatal:", logSafe(e));
      return json({ error: "Could not save. Please try again later." }, 500);
    }
  },
};
