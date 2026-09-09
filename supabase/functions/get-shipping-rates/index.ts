// supabase/functions/get-shipping-rates/index.ts
// Fetches real-time shipping rates from Printful's POST /shipping/rates API.
// Public endpoint (no JWT) — rate-limited. Frontend calls this to display
// accurate shipping costs before checkout. NEVER trust client-sent shipping
// costs — the backend must always recalculate.

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logSafe } from "../_shared/logSafe.ts";
import { isRateLimited, rateLimitKey } from "../_shared/rateLimit.ts";
import {
  fetchPrintfulShippingRates,
  normalizePrintfulRates,
} from "../_shared/printfulRates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRINTFUL_API = "https://api.printful.com";

// ── In-memory rate cache (5 min TTL per key) ────────────────────────────────
const rateCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(
  countryCode: string,
  items: any[],
  currency?: string,
  stateCode?: string | null,
  city?: string | null,
  zip?: string | null,
): string {
  const itemKey = items
    .map((i) => `${i.variant_id}:${i.quantity}`)
    .sort()
    .join(",");
  const addrKey = [stateCode || "", city || "", zip || ""].join("|");
  return `${countryCode}:${currency || ""}:${addrKey}:${itemKey}`;
}

// ── Input validation ────────────────────────────────────────────────────────

const COUNTRY_RE = /^[A-Z]{2}$/;
const VALID_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "BRL", "MXN",
]);

function isValidCountryCode(v: unknown): boolean {
  return typeof v === "string" && COUNTRY_RE.test(v);
}

function isValidStateCode(v: unknown): boolean {
  return typeof v === "string" && v.length <= 10;
}

function isValidZip(v: unknown): boolean {
  return typeof v === "string" && v.length <= 20;
}

function isValidAddress(v: unknown): boolean {
  return typeof v === "string" && v.length <= 200;
}

function isValidCity(v: unknown): boolean {
  return typeof v === "string" && v.length <= 100;
}

interface ShippingRateItem {
  variant_id: string;
  quantity: number;
}

function validateItems(items: unknown): {
  valid: boolean;
  error?: string;
  cleaned?: ShippingRateItem[];
} {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: "items requis (tableau non vide)" };
  }
  if (items.length > 20) {
    return { valid: false, error: "trop d'items (max 20)" };
  }
  const cleaned: ShippingRateItem[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") {
      return { valid: false, error: "item invalide" };
    }
    const vid = item.variant_id;
    const qty = item.quantity;
    if (!vid || typeof vid !== "string" && typeof vid !== "number") {
      return { valid: false, error: "variant_id invalide" };
    }
    const vidStr = String(vid).trim();
    if (!/^\d+$/.test(vidStr)) {
      return { valid: false, error: `variant_id non numérique: ${vidStr}` };
    }
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 100) {
      return { valid: false, error: `quantity invalide: ${qty}` };
    }
    cleaned.push({ variant_id: vidStr, quantity: qty });
  }
  return { valid: true, cleaned };
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    // Only POST allowed
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting
    if (await isRateLimited(req, rateLimitKey(req, "get-shipping-rates"))) {
      return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
        status: 429,
      });
    }

    try {
      const rawBody = await req.text();
      if (rawBody.length > 50 * 1024) {
        return new Response(
          JSON.stringify({ error: "Payload trop volumineux" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 413,
          },
        );
      }

      let body: any = {};
      try {
        body = JSON.parse(rawBody);
        console.log("get-shipping-rates request:", logSafe({ country_code: body.country_code, items_count: body.items?.length, state_code: body.state_code }));
      } catch {
        return new Response(JSON.stringify({ error: "JSON invalide" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // ── Validate inputs ─────────────────────────────────────────
      const countryCode = body.country_code;
      if (!isValidCountryCode(countryCode)) {
        console.warn("country_code validation failed:", logSafe(countryCode));
        return new Response(
          JSON.stringify({ error: "country_code requis (2 lettres, ex: US)" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // State code: requis par Printful pour US/AU/CA (cf. doc officielle
      // POST /shipping/rates — ShippingRatesAddress). Sans lui, Printful
      // répondrait 400 : on renvoie donc 200 + rates vide + approximate:true
      // pour que le frontend utilise le fallback silencieusement (smooth UX,
      // pas d'erreur console pendant que l'utilisateur tape son adresse).
      const stateCode = body.state_code || null;
      if (["US", "AU", "CA"].includes(countryCode) && !stateCode) {
        return new Response(
          JSON.stringify({
            rates: [],
            approximate: true,
            reason: `state_code requis pour ${countryCode}`,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
      if (stateCode && !isValidStateCode(stateCode)) {
        return new Response(
          JSON.stringify({ error: "state_code invalide" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const city = body.city || null;
      if (city && !isValidCity(city)) {
        return new Response(JSON.stringify({ error: "city invalide" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const zip = body.zip || null;
      if (zip && !isValidZip(zip)) {
        return new Response(JSON.stringify({ error: "zip invalide" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const address = body.address || null;
      if (address && !isValidAddress(address)) {
        return new Response(JSON.stringify({ error: "address invalide" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const currency = body.currency || undefined;
      if (currency && !VALID_CURRENCIES.has(currency.toUpperCase())) {
        return new Response(
          JSON.stringify({ error: `currency invalide: ${currency}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const itemsResult = validateItems(body.items);
      if (!itemsResult.valid) {
        console.warn("Items validation failed:", itemsResult.error, "received:", logSafe(body.items));
        return new Response(
          JSON.stringify({ error: itemsResult.error }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // ── Check cache ─────────────────────────────────────────────
      const cacheKeyStr = cacheKey(
        countryCode,
        itemsResult.cleaned!,
        currency,
        stateCode,
        city,
        zip,
      );
      const cached = rateCache.get(cacheKeyStr);
      if (cached && Date.now() < cached.expiresAt) {
        return new Response(JSON.stringify({ rates: cached.data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Get Printful credentials ────────────────────────────────
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: podSettings } = await supabaseAdmin
        .from("pod_settings")
        .select("api_key, store_id")
        .eq("id", "pod-main")
        .maybeSingle();

      const apiKey = podSettings?.api_key;
      const storeId = podSettings?.store_id;
      if (!apiKey || !storeId) {
        return new Response(
          JSON.stringify({
            error: "Configuration Printful manquante",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ── Build Printful request ──────────────────────────────────
      const recipient: any = { country_code: countryCode };
      if (stateCode) recipient.state_code = stateCode;
      if (city) recipient.city = city;
      if (zip) recipient.zip = zip;
      if (address) recipient.address1 = address;

      // ── Call Printful API (avec repli sync_variant_id -> variant_id) ──
      const pf = await fetchPrintfulShippingRates({
        apiKey,
        storeId,
        recipient,
        items: itemsResult.cleaned!,
        currency,
      });

      if (!pf.ok) {
        console.warn("Printful shipping rates error:", logSafe(pf.error));
        console.warn(
          "Printful request:",
          logSafe({ recipient, items: itemsResult.cleaned, storeId }),
        );
        // Échec Printful (ex: variant inconnu) : 200 + approximate pour
        // garder le frontend smooth (fallback forfaitaire, pas de 400).
        return new Response(
          JSON.stringify({
            rates: [],
            approximate: true,
            reason: pf.error || "Erreur Printful",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
      if (pf.usedField && pf.usedField !== "sync_variant_id") {
        console.log("Printful rates via champ repli:", pf.usedField);
      }

      // ── Normalize response ──────────────────────────────────────
      const rates = normalizePrintfulRates(pf.rates);

      // ── Cache result ────────────────────────────────────────────
      rateCache.set(cacheKeyStr, {
        data: rates,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return new Response(JSON.stringify({ rates }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error?.message || "Erreur inconnue" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  },
};
