// supabase/functions/create-printful-order/index.ts

// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeFetch } from "./_shared/safeUrl.ts";
import { logSafe, safeTruncate } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey, quotaFor } from "./_shared/rateLimit.ts";
import { fetchWithRetry, reportError } from "./_shared/opsUtils.ts";
// Moule unique des emails client (canonique : supabase/functions/_shared/
// orderStatusEmails.ts — toute modification se fait là-bas puis recopie
// à l'identique ici + printful-webhook + tests).
import { buildInProductionEmail } from "./_shared/orderStatusEmails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// P-B State Machine (Business Logic Abuse) - transitions autorisées côté serveur
const ALLOWED_TRANSITIONS = new Set([
  "pending->paid", "pending->cancelled",
  "paid->in_production", "paid->partial", "paid->on_hold", "paid->cancelled",
  "in_production->shipped", "in_production->partial", "in_production->on_hold", "in_production->cancelled",
  "partial->shipped", "partial->on_hold", "partial->cancelled", "partial->refunded",
  "on_hold->in_production", "on_hold->partial", "on_hold->cancelled", "on_hold->refunded",
  "shipped->delivered", "shipped->returned", "shipped->refunded",
  "delivered->returned", "delivered->refunded",
]);
function isTransitionAllowed(from: string, to: string): boolean {
  return from === to || ALLOWED_TRANSITIONS.has(`${from}->${to}`);
}

// Phase A (gap 11): annulation côté Printful (DELETE /orders/{id}).
// Printful n'annule que les commandes draft/pending : on vérifie le statut
// distant AVANT de supprimer, puis on aligne le statut local via la state
// machine. Auth : même garde que la création (service_role OU admin JWT).
async function handleCancelPrintfulOrder(
  supabaseAdmin: any,
  order: any,
): Promise<Response> {
  const orderId = order.id;
  const pfId = order.external_order_id ? String(order.external_order_id) : "";
  if (!pfId) {
    return new Response(
      JSON.stringify({ error: "Aucune commande Printful liée à annuler" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
  if (!isTransitionAllowed(order.status, "cancelled")) {
    return new Response(
      JSON.stringify({ error: `Transition ${order.status} -> cancelled non autorisée` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
    );
  }

  const { data: settings } = await supabaseAdmin
    .from("pod_settings")
    .select("api_key, store_id")
    .eq("id", "pod-main")
    .maybeSingle();
  const apiKey = (settings as any)?.api_key;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Printful non configuré" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
    );
  }
  const pfHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if ((settings as any)?.store_id) pfHeaders["X-PF-Store-Id"] = String((settings as any).store_id);

  // Statut distant : annulable uniquement si draft/pending.
  // GET idempotent : retry 429/5xx (gap 14).
  let pfStatus = "";
  try {
    const { res: gRes, error: gNetError } = await fetchWithRetry(
      `https://api.printful.com/orders/${encodeURIComponent(pfId)}`,
      { headers: pfHeaders },
      { attempts: 3, baseMs: 400, idempotent: true },
    );
    if (!gRes) {
      await reportError(supabaseAdmin, {
        fn: "create-printful-order",
        action: "cancel-printful-order",
        error: gNetError || "Printful injoignable",
        meta: { orderId, pfId, step: "get-status" },
        severity: "high",
      });
      return new Response(
        JSON.stringify({ error: `Printful injoignable: ${gNetError}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }
    if (gRes.status === 404) {
      return new Response(
        JSON.stringify({ error: "Commande introuvable côté Printful (déjà supprimée ?)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
      );
    }
    if (!gRes.ok) {
      const t = await gRes.text();
      return new Response(
        JSON.stringify({ error: `Erreur Printful: ${t.slice(0, 300)}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }
    const gData = await gRes.json();
    pfStatus = String(gData.result?.status || "").toLowerCase();
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `Printful injoignable: ${e?.message || e}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
    );
  }
  if (pfStatus !== "draft" && pfStatus !== "pending") {
    return new Response(
      JSON.stringify({
        error: `Statut Printful « ${pfStatus || "inconnu"} » non annulable (seuls draft/pending le sont). Passez par un remboursement.`,
        printfulStatus: pfStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 },
    );
  }

  // DELETE : le GET vient de confirmer draft/pending, donc un 404 ici
  // signifie presque sûrement que la suppression est déjà passée (réponse
  // perdue) → objectif atteint, on aligne le local. Retry 429/5xx + réseau.
  try {
    const { res: dRes, error: dNetError } = await fetchWithRetry(
      `https://api.printful.com/orders/${encodeURIComponent(pfId)}`,
      { method: "DELETE", headers: pfHeaders },
      { attempts: 3, baseMs: 400, idempotent: true },
    );
    if (!dRes) {
      await reportError(supabaseAdmin, {
        fn: "create-printful-order",
        action: "cancel-printful-order",
        error: dNetError || "Printful injoignable",
        meta: { orderId, pfId, step: "delete" },
        severity: "high",
      });
      return new Response(
        JSON.stringify({ error: `Printful injoignable: ${dNetError}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }
    if (!dRes.ok && dRes.status !== 404) {
      const t = await dRes.text();
      await reportError(supabaseAdmin, {
        fn: "create-printful-order",
        action: "cancel-printful-order",
        error: t.slice(0, 300),
        meta: { orderId, pfId, status: dRes.status },
        severity: "high",
      });
      return new Response(
        JSON.stringify({ error: `Erreur Printful: ${t.slice(0, 300)}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
      );
    }
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: `Printful injoignable: ${e?.message || e}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
    );
  }

  // Aligne le local : statut cancelled + note (external_order_id conservé).
  const note = `[POD] Annulée chez Printful par l'admin (statut distant: ${pfStatus}).`;
  await supabaseAdmin
    .from("orders")
    .update({
      status: "cancelled",
      notes: order.notes ? `${order.notes}\n${note}` : note,
    })
    .eq("id", orderId);

  // Notif admin + notif client (l'email annulé part côté frontend via le
  // template existant, comme pour tout passage à cancelled).
  try {
    await supabaseAdmin.from("notifications").insert({
      title: `Commande ${orderId} annulée chez Printful`,
      description: `${order.client_name || "Client"} — commande Printful ${pfId} supprimée (était ${pfStatus}).`,
      category: "orders",
      priority: "medium",
      status: "unread",
      metadata: { orderId, printfulOrderId: pfId, linkTo: "/admin/orders", source: "Printful" },
      action_label: "Voir la commande",
    });
  } catch {}
  if (order.client_id) {
    try {
      await supabaseAdmin.from("customer_notifications").insert({
        customer_id: order.client_id,
        title: `Votre commande ${orderId} est annulée`,
        message: `Votre commande ${orderId} a été annulée. Si vous avez été débité, un remboursement sera émis.`,
        type: "order_status",
        is_read: false,
        metadata: { orderId, status: "cancelled" },
      });
    } catch {}
  }

  return new Response(
    JSON.stringify({ success: true, printfulStatus: pfStatus }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

// ── Rate limiting simple (en mémoire, par IP) ──────────────────────────
// P-F rate limit distribué importé depuis _shared/rateLimit.ts

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (await isRateLimited(req, rateLimitKey(req, "create-printful-order"))) {
      return new Response(JSON.stringify({ error: 'Trop de requêtes.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' },
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

      // P-A (7) payload size limit 100KB
      const rawBody = await req.text();
      if (rawBody.length > 100 * 1024) {
        return new Response(JSON.stringify({ error: "Payload trop volumineux" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 413 });
      }
      let body: any = {};
      try { body = rawBody ? JSON.parse(rawBody) : {}; } catch { body = {}; }
      const { orderId } = body;
      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId requis" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      // P-A (1+7) validation positive orderId
      if (!/^ORD-[0-9]{4}-[0-9]{6}$/.test(String(orderId).trim())) {
        return new Response(JSON.stringify({ error: "orderId invalide" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
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

      // Phase A (gap 11): action d'annulation (même garde auth ci-dessus).
      if (String(body.action || "create") === "cancel-printful-order") {
        return await handleCancelPrintfulOrder(supabaseAdmin, order);
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

      // 3. Construire le payload Printful - P4 POD partial fulfillment
      // Un variant indisponible (is_active=false ou stock_status) ne bloque PLUS les autres items.
      const printfulItems: any[] = [];
      const blockedItems: {
        item: any;
        print_status: string;
        block_reason: string;
      }[] = [];
      // pour marquer les items en DB après analyse
      for (const item of orderItems) {
        // P-A (7) + P-B: quantité positive bornée (évite -1, 0, 9999, injection)
        const qty = Number(item.quantity);
        if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
          blockedItems.push({ item, print_status: 'failed', block_reason: 'Quantité invalide: ' + String(item.quantity) });
          continue;
        }
        const { data: product } = await supabaseAdmin
          .from("products")
          .select(
            "is_active, external_product_id, title, variants, colors, sizes, external_variant_id",
          )
          .eq("id", item.product_id)
          .single();

        if (!product) {
          console.warn(`Produit introuvable: ${item.product_id}`);
          blockedItems.push({
            item,
            print_status: "blocked_discontinued",
            block_reason: "Produit introuvable",
          });
          continue;
        }

        // Admin a désactivé le produit
        if (product.is_active === false) {
          blockedItems.push({
            item,
            print_status: "blocked_inactive",
            block_reason: "Produit désactivé par l'admin (is_active=false)",
          });
          continue;
        }

        // Trouver le variant qui correspond à la couleur et à la taille sélectionnées
        let externalVariantId: number | null = null;
        let matchingVariant: any = null;
        let stockStatus: string = "available";

        if (product.variants && Array.isArray(product.variants)) {
          matchingVariant = product.variants.find(
            (v: any) =>
              v.color?.toLowerCase() === item.selected_color?.toLowerCase() &&
              v.sizes &&
              v.sizes[item.selected_size] !== undefined,
          );
          if (matchingVariant) {
            const szEntry: any = matchingVariant.sizes[item.selected_size];
            stockStatus =
              szEntry && typeof szEntry === "object" && szEntry.stock_status
                ? String(szEntry.stock_status)
                : "available";
            if (matchingVariant.external_variant_id) {
              externalVariantId = Number(matchingVariant.external_variant_id);
            } else if (matchingVariant.sync_variant_id) {
              externalVariantId = Number(matchingVariant.sync_variant_id);
            } else if (matchingVariant.variant_id) {
              externalVariantId = Number(matchingVariant.variant_id);
            }
          } else {
            // variante couleur/taille introuvable -> discontinued
            blockedItems.push({
              item,
              print_status: "blocked_discontinued",
              block_reason: `Variante ${item.selected_color}/${item.selected_size} introuvable (supprimée par le fournisseur)`,
            });
            continue;
          }
        }

        // stock_status Printful
        if (stockStatus === "discontinued") {
          blockedItems.push({
            item,
            print_status: "blocked_discontinued",
            block_reason:
              "Variante discontinued par le fournisseur (availability_status)",
          });
          continue;
        }
        if (stockStatus === "out_of_stock") {
          blockedItems.push({
            item,
            print_status: "blocked_out_of_stock",
            block_reason: "Rupture temporaire Printful (out_of_stock)",
          });
          continue;
        }

        if (!externalVariantId) {
          console.warn(
            `Aucun ID variant Printful trouvé pour ${item.product_id} (couleur: ${item.selected_color}, taille: ${item.selected_size}). ` +
              `Variant matché: ${JSON.stringify(matchingVariant)}`,
          );
          blockedItems.push({
            item,
            print_status: "blocked_discontinued",
            block_reason: "Aucun ID variant Printful (supprimé)",
          });
          continue;
        }

        printfulItems.push({
          sync_variant_id: externalVariantId,
          quantity: item.quantity,
          retail_price: item.unit_price.toFixed(2),
          name: item.product_title || product.title || undefined,
        });
      }

      // Marquer immédiatement les bloqués en DB (P1 print_status)
      for (const b of blockedItems) {
        try {
          await supabaseAdmin
            .from("order_items")
            .update({
              print_status: b.print_status,
              block_reason: b.block_reason,
            })
            .eq("id", b.item.id);
        } catch (e) {
          console.warn("update blocked item failed", e);
        }
      }

      if (printfulItems.length === 0) {
        // Tout bloqué -> on_hold (pas d'envoi Printful), notif admin
        const reasonSummary = blockedItems
          .map(
            (b) =>
              `${b.item.product_title || b.item.product_id} (${b.item.selected_color}/${b.item.selectedSize || b.item.selected_size}): ${b.block_reason}`,
          )
          .join("; ");
        // P-B State Machine: vérifie transition autorisée
        if (!isTransitionAllowed(order.status, "on_hold")) {
          return new Response(JSON.stringify({ error: "Transition "+order.status+" -> on_hold non autorisée" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 });
        }
        await supabaseAdmin
          .from("orders")
          .update({
            status: "on_hold",
            notes:
              (order.notes ? order.notes + "\n" : "") +
              `[POD P4] Tous les items bloqués — aucun envoi Printful. ${reasonSummary}`.slice(
                0,
                900,
              ),
          })
          .eq("id", orderId);
        // notif admin
        try {
          await supabaseAdmin.from("notifications").insert({
            title: `Commande ${orderId} en pause — variantes indisponibles`,
            description: reasonSummary.slice(0, 300),
            category: "orders",
            priority: "high",
            status: "unread",
            metadata: {
              orderId,
              blockedCount: blockedItems.length,
              linkTo: "/admin/orders",
              source: "Printful",
            },
            action_label: "Voir la commande",
          });
        } catch {}
        return new Response(
          JSON.stringify({
            error:
              "Tous les items sont indisponibles (désactivés ou rupture Printful)",
            blockedCount: blockedItems.length,
            blockedItems: blockedItems.map((b) => ({
              id: b.item.id,
              reason: b.block_reason,
            })),
          }),
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

      // 4. Créer la commande par le fournisseur (mode draft, pas de confirm) — P5 idempotence external_id
      // Gap 14 : retry 429/5xx (POST idempotent via external_id + update_existing).
      const { res: pfRes, error: pfNetError } = await fetchWithRetry(
        "https://api.printful.com/orders?update_existing=true",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.api_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(printfulOrder),
        },
        { attempts: 3, baseMs: 600, idempotent: true },
      );
      if (!pfRes) {
        await reportError(supabaseAdmin, {
          fn: "create-printful-order",
          action: "create",
          error: pfNetError || "Printful injoignable",
          meta: { orderId },
          severity: "critical",
        });
        return new Response(
          JSON.stringify({ error: `Printful injoignable: ${pfNetError}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 502,
          },
        );
      }

      if (!pfRes.ok) {
        const errText = await pfRes.text();
        // P5: external_id déjà utilisé -> idempotence (retry Stripe webhook)
        if (pfRes.status === 400 && /EXTERNAL_ID_IN_USE|external_id/i.test(errText)) {
          try {
            const { res: existingPfRes } = await fetchWithRetry(
              `https://api.printful.com/orders/@${encodeURIComponent(order.id)}`,
              { headers: { Authorization: `Bearer ${settings.api_key}` } },
              { attempts: 3, baseMs: 400, idempotent: true },
            );
            if (existingPfRes && existingPfRes.ok) {
              const existingPf = await existingPfRes.json();
              const existingId = existingPf.result?.id?.toString() || "";
              // marquer comme succès idempotent
              await supabaseAdmin.from("orders").update({ external_order_id: existingId, status: "in_production" }).eq("id", orderId);
              // Phase A (gap 8): snapshot coûts aussi sur le chemin idempotent
              try {
                const r = existingPf.result || {};
                if (r.costs || r.retail_costs || r.pricing_breakdown) {
                  await supabaseAdmin.from("orders").update({
                    printful_costs: {
                      costs: r.costs || null,
                      retail_costs: r.retail_costs || null,
                      pricing_breakdown: r.pricing_breakdown || null,
                      currency: r.currency || null,
                      estimated_at: new Date().toISOString(),
                    },
                  }).eq("id", orderId);
                }
              } catch {}
              for (const it of orderItems) {
                const isBlocked = blockedItems.some((b) => b.item.id === it.id);
                if (!isBlocked) try { await supabaseAdmin.from("order_items").update({ print_status: "fulfillable" }).eq("id", it.id); } catch {}
              }
              return new Response(JSON.stringify({ success: true, externalOrderId: existingId, idempotent: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          } catch {}
        }
        // P5: erreurs ciblées thread_colors / Invalid position -> marquer bloqués au lieu de 502 générique
        const lower = errText.toLowerCase();
        if (lower.includes("thread_colors") || lower.includes("invalid position") || lower.includes("embroidery")) {
          // marquer tous les fulfillables comme failed pour traçage, passe en on_hold
          for (const it of orderItems) {
            const isBlocked = blockedItems.some((b) => b.item.id === it.id);
            if (!isBlocked) try { await supabaseAdmin.from("order_items").update({ print_status: "failed", block_reason: errText.slice(0, 300) }).eq("id", it.id); } catch {}
          }
          await supabaseAdmin.from("orders").update({ status: "on_hold", notes: (order.notes ? order.notes + "\n" : "") + `[POD P5] Printful 400: ${errText}`.slice(0, 900) }).eq("id", orderId);
        }
        // Échec définitif côté Printful (après retries) : commande payée
        // non transmise = CRITICAL (notif admin dédupliquée).
        await reportError(supabaseAdmin, {
          fn: "create-printful-order",
          action: "create",
          error: errText.slice(0, 500),
          meta: { orderId, status: pfRes.status },
          severity: "critical",
        });
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

      // 5. Mettre à jour la commande - P4 partiel
      const hasBlocked = blockedItems.length > 0;
      const newStatus = hasBlocked ? "partial" : "in_production";
      // P-B State Machine
      let transitionTarget = newStatus;
      if (!isTransitionAllowed(order.status, transitionTarget)) {
        if (transitionTarget === "partial" && isTransitionAllowed(order.status, "in_production")) transitionTarget = "in_production";
        else return new Response(JSON.stringify({ error: "Transition "+order.status+" -> "+transitionTarget+" non autorisée" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 });
      }
      // si 'partial' n'est pas encore autorisé en DB, fallback in_production
      let updatedStatus = transitionTarget;
      const notesAppend = hasBlocked
        ? `\n[POD P4] ${printfulItems.length}/${orderItems.length} items envoyés à Printful. ${blockedItems.length} bloqué(s): ${blockedItems.map((b) => `${b.item.product_title || b.item.product_id} (${b.item.selected_color}/${b.item.selected_size}): ${b.block_reason}`).join("; ")}`.slice(
            0,
            900,
          )
        : "";
      let updRes = await supabaseAdmin
        .from("orders")
        .update({
          external_order_id: externalOrderId,
          status: updatedStatus,
          notes: order.notes ? order.notes + notesAppend : notesAppend.trim(),
        })
        .eq("id", orderId);
      // fallback si contrainte orders_status_check ne connaît pas 'partial'
      if (
        updRes.error &&
        String(updRes.error.message || "").includes("orders_status_check")
      ) {
        updatedStatus = "in_production";
        await supabaseAdmin
          .from("orders")
          .update({
            external_order_id: externalOrderId,
            status: updatedStatus,
            notes: order.notes ? order.notes + notesAppend : notesAppend.trim(),
          })
          .eq("id", orderId);
      }

      // Phase A (gap 8): snapshot des coûts Printful pour affichage ADMIN
      // uniquement. Best-effort : si la colonne printful_costs n'existe pas
      // encore (migration 20261016 non exécutée), la création réussit quand
      // même. Les coûts à la création sont ESTIMÉS (calcul async Printful).
      try {
        const r = pfData.result || {};
        if (r.costs || r.retail_costs || r.pricing_breakdown) {
          await supabaseAdmin
            .from("orders")
            .update({
              printful_costs: {
                costs: r.costs || null,
                retail_costs: r.retail_costs || null,
                pricing_breakdown: r.pricing_breakdown || null,
                currency: r.currency || null,
                estimated_at: new Date().toISOString(),
              },
            })
            .eq("id", orderId);
        }
      } catch (e) {
        console.warn("printful_costs snapshot skipped:", e);
      }

      // marquer les items fulfillable
      for (const pf of printfulItems) {
        // on ne connaît pas l'id exact, on marque tout non-bloqué comme fulfillable
      }
      for (const it of orderItems) {
        const isBlocked = blockedItems.some((b) => b.item.id === it.id);
        if (!isBlocked) {
          try {
            await supabaseAdmin
              .from("order_items")
              .update({ print_status: "fulfillable" })
              .eq("id", it.id);
          } catch {}
        }
      }
      if (hasBlocked) {
        try {
          await supabaseAdmin.from("notifications").insert({
            title: `Commande ${orderId} partielle — ${blockedItems.length} article(s) non imprimé(s)`,
            description: blockedItems
              .map(
                (b) =>
                  `${b.item.product_title || b.item.product_id}: ${b.block_reason}`,
              )
              .join("; ")
              .slice(0, 300),
            category: "orders",
            priority: "high",
            status: "unread",
            metadata: {
              orderId,
              blockedCount: blockedItems.length,
              fulfillableCount: printfulItems.length,
              linkTo: "/admin/orders",
              source: "Printful",
            },
            action_label: "Voir la commande",
          });
        } catch {}
      }

      // 6. Envoyer l'email "in production" si le client a un email
      // (moule canonique : stepper + items + totaux + CTA, comme confirmed).
      if (order.client_email) {
        try {
          let currencySymbol = "$";
          try {
            const { data: ss } = await supabaseAdmin
              .from("store_settings")
              .select("currency")
              .eq("id", true)
              .maybeSingle();
            const symbols: Record<string, string> = {
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
            currencySymbol =
              symbols[String((ss as any)?.currency || "USD").toUpperCase()] || "$";
          } catch {}
          const blockedNote = hasBlocked
            ? `Note: ${blockedItems.length} article(s) de votre commande est/sont indisponible(s) (supprimé/rupture) et n'a/ont pas été envoyé(s) à l'impression. Les ${printfulItems.length} autre(s) sont en cours. Un remboursement partiel sera traité si nécessaire.`
            : null;
          const built = buildInProductionEmail(
            order,
            orderItems.map((it: any) => ({
              product_title: it.product_title,
              product_image: it.product_image,
              selected_color: it.selected_color,
              selected_size: it.selected_size,
              quantity: it.quantity,
              unit_price: it.unit_price,
            })),
            currencySymbol,
            { blockedNote },
          );
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
            },
            body: JSON.stringify({
              to: order.client_email,
              subject: built.subject,
              html: built.html,
            }),
          });
        } catch (err) {
          console.error("In-production email error:", logSafe(err));
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          externalOrderId,
          partial: hasBlocked,
          blockedCount: blockedItems.length,
          fulfillableCount: printfulItems.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );

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
