// supabase/functions/create-printful-order/index.ts

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Rate limiting simple (en mémoire, par IP) ──────────────────────────
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

function rateLimited(req: Request): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (rateLimited(req)) {
      return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }

    try {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // ── Vérification de l'appelant ─────────────────────────────────
      // Deux accès autorisés :
      //   1. Appel interne (stripe-webhook) avec la clé service_role.
      //   2. Utilisateur authentifié avec le rôle admin.
      const apikeyHeader = req.headers.get("apikey") || "";
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      if (apikeyHeader !== serviceRoleKey) {
        if (!token) {
          return new Response(JSON.stringify({ error: "Non autorisé" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.getUser(token);
        if (userError || !userData?.user) {
          return new Response(JSON.stringify({ error: "Session invalide" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // const { data: adminRow } = await supabaseAdmin
        //   .from("admin_users")
        //   .select("id")
        //   .eq("id", userData.user.id)
        //   .maybeSingle();
        const { data: adminRow } = await supabaseAdmin
          .from("admin_users")
          .select("id")
          .eq("email", userData.user.email)
          .maybeSingle();
        if (!adminRow) {
          return new Response(
            JSON.stringify({ error: "Accès administrateur requis" }),
            {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      const body = await req.json().catch(() => ({}));
      const { orderId } = body;
      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId requis" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // 1. Récupérer la commande et ses items depuis Supabase
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (orderError || !order) {
        return new Response(JSON.stringify({ error: "Commande introuvable" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      if (order.status !== "paid") {
        return new Response(
          JSON.stringify({
            error:
              "La commande doit être payée avant l'envoi à Printful (statut actuel: " +
              order.status +
              ").",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);
      if (itemsError) {
        return new Response(
          JSON.stringify({ error: "Erreur chargement items" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }

      // 2. Récupérer les paramètres Printful
      const { data: settings, error: settingsError } = await supabaseAdmin
        .from("pod_settings")
        .select("*")
        .single();
      if (settingsError || !settings?.api_key) {
        return new Response(
          JSON.stringify({ error: "Clé API Printful non configurée." }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // 3. Construire le payload Printful
      const printfulItems: any[] = [];
      for (const item of orderItems) {
        const { data: product } = await supabaseAdmin
          .from("products")
          .select(
            "external_product_id, title, variants, colors, sizes, external_variant_id",
          )
          .eq("id", item.product_id)
          .single();

        if (!product) {
          console.warn(`Produit introuvable: ${item.product_id}`);
          continue;
        }

        // Trouver le variant qui correspond à la couleur et à la taille sélectionnées
        let externalVariantId: number | null = null;

        // D'abord chercher dans le tableau variantsf
        if (product.variants && Array.isArray(product.variants)) {
          const matchingVariant = product.variants.find(
            (v: any) =>
              v.color?.toLowerCase() === item.selected_color?.toLowerCase() &&
              v.sizes &&
              v.sizes[item.selected_size] !== undefined,
          );
          if (matchingVariant) {
            if (matchingVariant.external_variant_id) {
              externalVariantId = Number(matchingVariant.external_variant_id);
            } else if (matchingVariant.sync_variant_id) {
              externalVariantId = Number(matchingVariant.sync_variant_id);
            } else if (matchingVariant.variant_id) {
              externalVariantId = Number(matchingVariant.variant_id);
            }
          }
        }

        if (!externalVariantId) {
          console.warn(
            `Aucun ID variant Printful trouvé pour ${item.product_id} (couleur: ${item.selected_color}, taille: ${item.selected_size}). ` +
              `Variant matché: ${JSON.stringify(matchingVariant)}`,
          );
          continue;
        }

        printfulItems.push({
          sync_variant_id: externalVariantId,
          quantity: item.quantity,
          retail_price: item.unit_price.toFixed(2),
          name: item.product_title || product.title || undefined,
        });
      }

      if (printfulItems.length === 0) {
        return new Response(
          JSON.stringify({ error: "Aucun item avec variant Printful trouvé" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      const printfulOrder = {
        external_id: order.id,
        shipping: "STANDARD",
        recipient: {
          name: order.shipping_address_full_name || order.client_name,
          address1: order.shipping_address_address,
          city: order.shipping_address_city,
          state_code: order.shipping_address_state_code || undefined,
          zip: order.shipping_address_zip,
          country_code: order.shipping_address_country,
          phone: order.shipping_address_phone,
          email: order.client_email,
          tax_number: order.shipping_address_tax_number || undefined,
        },
        items: printfulItems,
        retail_costs: {
          shipping: order.shipping_cost?.toFixed(2) || "0.00",
        },
      };

      // 4. Créer la commande chez Printful (mode draft, pas de confirm)
      const pfRes = await fetch("https://api.printful.com/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(printfulOrder),
      });

      if (!pfRes.ok) {
        const errText = await pfRes.text();
        return new Response(
          JSON.stringify({ error: `Erreur Printful: ${errText}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 502,
          },
        );
      }

      const pfData = await pfRes.json();
      const externalOrderId = pfData.result?.id?.toString() || "";

      // 5. Mettre à jour la commande dans Supabase
      await supabaseAdmin
        .from("orders")
        .update({ external_order_id: externalOrderId, status: "in_production" })
        .eq("id", orderId);

      // 6. Envoyer l'email "in production" si le client a un email
      if (order.client_email) {
        const html = `<!DOCTYPE html><html><body style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
<div style="background:#ede9fe;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
<h1 style="color:#7c3aed;margin:0;font-size:22px;">InstaWear</h1>
<p style="color:#7c3aed;margin:4px 0 0;font-size:14px;">We're printing your order!</p>
</div>
<div style="background:#fff;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px;">
<h2 style="margin:0 0 8px;font-size:18px;">In Production 🖨️</h2>
<p style="margin:0 0 20px;color:#555;font-size:14px;">Hi <strong>${order.client_name || "Customer"}</strong>,<br><br>Your order <strong>${order.id}</strong> is now being printed. We'll notify you as soon as it ships.</p>
<a href="https://instawear.vercel.app" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View order details →</a>
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:11px;color:#999;line-height:1.6;">
<p style="margin:0 0 8px;">This email was sent to <strong>${order.client_email}</strong> for your recent purchase at <a href="https://instawear.vercel.app" style="color:#FF5C35;text-decoration:none;">instawear.vercel.app</a></p>
<p style="margin:0;">InstaWear · 123 Main Street, Doral, FL 10001<br>© 2026 InstaWear Inc. All rights reserved.</p>
</div></div></body></html>`;

        await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          },
          body: JSON.stringify({
            to: order.client_email,
            subject: `Your order ${order.id} is now in production!`,
            html,
          }),
        });
      }

      return new Response(JSON.stringify({ success: true, externalOrderId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

      //
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Erreur inconnue",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        },
      );
    }
  },
};
