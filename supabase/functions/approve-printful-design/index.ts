// supabase/functions/approve-printful-design/index.ts
// Admin action: approve, submit changes, or list approval sheets for Printful orders.

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeFetch } from "../_shared/safeUrl.ts";
import { logSafe } from "../_shared/logSafe.ts";
import { isRateLimited, rateLimitKey } from "../_shared/rateLimit.ts";
import { isValidOrderId } from "../_shared/validators.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PRINTFUL_API = "https://api.printful.com";

async function getPrintfulCredentials(supabaseAdmin: any) {
  const { data } = await supabaseAdmin
    .from("pod_settings")
    .select("api_key, store_id")
    .eq("id", "pod-main")
    .maybeSingle();
  return { apiKey: data?.api_key || null, storeId: data?.store_id || null };
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (
      await isRateLimited(req, rateLimitKey(req, "approve-printful-design"))
    ) {
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
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      // ── Auth: admin only ──────────────────────────────────────────
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
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

      // ── Parse body ────────────────────────────────────────────────
      const rawBody = await req.text();
      if (rawBody.length > 100 * 1024) {
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
      } catch {
        return new Response(JSON.stringify({ error: "JSON invalide" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const action = body.action;
      if (!action || !["approve", "submit_changes", "list"].includes(action)) {
        return new Response(
          JSON.stringify({
            error: "action invalide (approve | submit_changes | list)",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // ── Get Printful credentials ──────────────────────────────────
      const { apiKey, storeId } = await getPrintfulCredentials(supabaseAdmin);
      if (!apiKey || !storeId) {
        return new Response(
          JSON.stringify({
            error: "Configuration Printful manquante (api_key ou store_id)",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          },
        );
      }

      const pfHeaders = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      // ── LIST ──────────────────────────────────────────────────────
      if (action === "list") {
        const listRes = await safeFetch(
          `${PRINTFUL_API}/approval-sheets?store_id=${encodeURIComponent(storeId)}`,
          { headers: pfHeaders },
        );
        const listData = await listRes.json();
        if (!listRes.ok) {
          console.warn("Printful list approval sheets error:", logSafe(listData));
          return new Response(
            JSON.stringify({
              error: "Erreur Printful",
              details: listData?.result || listData?.error?.message || null,
            }),
            {
              status: listRes.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        return new Response(JSON.stringify({ data: listData.result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Approve / Submit changes require confirm_hash + orderId ───
      const confirmHash = body.confirm_hash;
      const orderId = body.order_id;

      if (!confirmHash || typeof confirmHash !== "string") {
        return new Response(
          JSON.stringify({ error: "confirm_hash requis" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }
      // Sanity: Printful hashes are hex, ~32 chars
      if (!/^[a-f0-9]{20,64}$/i.test(confirmHash)) {
        return new Response(
          JSON.stringify({ error: "confirm_hash format invalide" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      if (!orderId || !isValidOrderId(orderId)) {
        return new Response(
          JSON.stringify({ error: "order_id invalide (format ORD-XXXX-XXXXXX)" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          },
        );
      }

      // Verify order exists and has approval_data
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .select("id, status, approval_data")
        .eq("id", orderId)
        .maybeSingle();
      if (orderErr || !order) {
        return new Response(JSON.stringify({ error: "Commande introuvable" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (order.status !== "on_hold") {
        return new Response(
          JSON.stringify({ error: "La commande n'est pas en pause" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ── APPROVE ───────────────────────────────────────────────────
      if (action === "approve") {
        const approveRes = await safeFetch(
          `${PRINTFUL_API}/approval-sheets/${encodeURIComponent(confirmHash)}?store_id=${encodeURIComponent(storeId)}`,
          {
            method: "POST",
            headers: pfHeaders,
            body: JSON.stringify({ status: "approved" }),
          },
        );
        const approveData = await approveRes.json();
        if (!approveRes.ok) {
          console.warn("Printful approve error:", logSafe(approveData));
          return new Response(
            JSON.stringify({
              error: "Erreur Printful lors de l'approbation",
              details: approveData?.result || approveData?.error?.message || null,
            }),
            {
              status: approveRes.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Clear approval_data and move order back to in_production
        const { error: updateErr } = await supabaseAdmin
          .from("orders")
          .update({
            status: "in_production",
            approval_data: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);
        if (updateErr) {
          console.warn("Order update after approve:", updateErr);
        }

        // Notification admin
        try {
          await supabaseAdmin.from("notifications").insert({
            title: `Design approuvé — commande ${orderId}`,
            description: `Approbation confirmée, la production reprend.`,
            category: "orders",
            priority: "low",
            status: "unread",
            metadata: { orderId, linkTo: "/admin/orders" },
            action_label: "Voir la commande",
          });
        } catch (e) {
          console.warn("Notification admin (approve):", e);
        }

        // Customer notification
        try {
          const { data: fullOrder } = await supabaseAdmin
            .from("orders")
            .select("client_id")
            .eq("id", orderId)
            .maybeSingle();
          if (fullOrder?.client_id) {
            await supabaseAdmin.from("customer_notifications").insert({
              customer_id: fullOrder.client_id,
              title: `Votre commande ${orderId} est de nouveau en production`,
              message: `Votre design a été validé. La production reprend !`,
              type: "order_status",
              is_read: false,
              metadata: { orderId },
            });
          }
        } catch (e) {
          console.warn("Customer notification (approve):", e);
        }

        return new Response(
          JSON.stringify({ success: true, action: "approved" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ── SUBMIT CHANGES ────────────────────────────────────────────
      if (action === "submit_changes") {
        const message = body.message;
        const files = body.files;

        if (!message || typeof message !== "string" || message.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: "message requis (texte des changements)" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }
        if (message.length > 2000) {
          return new Response(
            JSON.stringify({ error: "message trop long (max 2000 caractères)" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Validate files array (optional but must be valid if provided)
        const validFiles: { url: string }[] = [];
        if (Array.isArray(files)) {
          for (const f of files) {
            if (!f.url || typeof f.url !== "string") continue;
            // SSRF: assertSafeUrl will throw if not a safe https URL
            try {
              safeFetch(f.url);
            } catch (e) {
              return new Response(
                JSON.stringify({
                  error: `URL de fichier non autorisée: ${f.url}`,
                }),
                {
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                  status: 400,
                },
              );
            }
            validFiles.push({ url: f.url });
          }
        }

        const changesRes = await safeFetch(
          `${PRINTFUL_API}/approval-sheets/changes?confirm_hash=${encodeURIComponent(confirmHash)}&store_id=${encodeURIComponent(storeId)}`,
          {
            method: "POST",
            headers: pfHeaders,
            body: JSON.stringify({
              message: message.trim(),
              files: validFiles,
            }),
          },
        );
        const changesData = await changesRes.json();
        if (!changesRes.ok) {
          console.warn("Printful submit changes error:", logSafe(changesData));
          return new Response(
            JSON.stringify({
              error: "Erreur Printful lors de la soumission",
              details: changesData?.result || changesData?.error?.message || null,
            }),
            {
              status: changesRes.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        // Log admin action in order notes
        try {
          const notes = order.approval_data?.notes || [];
          notes.push({
            action: "submit_changes",
            message: message.trim(),
            files_count: validFiles.length,
            admin_email: userData.user.email,
            timestamp: new Date().toISOString(),
          });
          await supabaseAdmin
            .from("orders")
            .update({
              approval_data: { ...order.approval_data, notes },
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);
        } catch (e) {
          console.warn("Order notes update:", e);
        }

        return new Response(
          JSON.stringify({ success: true, action: "changes_submitted" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
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
