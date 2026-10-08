// supabase/functions/hero-deploy-hook/index.ts
// Lot 5 Hero Studio — redéploiement à la demande (rebuild prerender/lead).
// POST admin-only → appelle le Deploy Hook d'hébergement (URL en secret
// HERO_DEPLOY_HOOK_URL, jamais en repo) → acquitte hero_version
// (last_hook_at, hook_pending=false). La fraîcheur boutique SANS rebuild
// est assurée par le polling hero_version (lot 5 client) ; le rebuild ne
// sert qu'au shell prerender + SEO.
// Sécurité : garde admin (pattern health : apikey service_role OU JWT
// d'un admin_users), rate-limit mémoire 5/min/IP, fail-closed 503 si
// secret manquant, jamais l'URL ni le verdict dans les erreurs.
// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  BASE_ENV,
  envMissingResponse,
  missingEnv,
} from "../_shared/env.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HOOK_TIMEOUT_MS = 15000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 5;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || now >= cur.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  cur.count += 1;
  return cur.count > RATE_MAX;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "POST uniquement." }, 405);
  }

  const missing = missingEnv([...BASE_ENV, "HERO_DEPLOY_HOOK_URL"]);
  if (missing.length > 0) {
    return envMissingResponse(
      missing,
      "Ajoutez HERO_DEPLOY_HOOK_URL (Deploy Hook Vercel) via `supabase secrets set`, puis redéployez la fonction.",
    );
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const hookUrl = Deno.env.get("HERO_DEPLOY_HOOK_URL")!;

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  if (rateLimited(ip)) {
    return json({ error: "Trop de requêtes." }, 429);
  }

  // Garde admin (même pattern que health) : service_role OU JWT admin_users.
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  const apikey = req.headers.get("apikey") || "";
  const admin = createClient(supabaseUrl, serviceRoleKey);
  let isAdmin = apikey === serviceRoleKey;
  if (!isAdmin && token) {
    const { data: userData } = await admin.auth.getUser(token);
    if (userData?.user?.email) {
      const { data: row } = await admin
        .from("admin_users")
        .select("id")
        .eq("email", userData.user.email)
        .maybeSingle();
      isAdmin = !!row;
    }
  }
  if (!isAdmin) {
    return json({ error: "Admin requis." }, 401);
  }

  // Déclenche le rebuild (timeout 15 s, jamais plus).
  let hookOk = false;
  try {
    const res = await Promise.race([
      fetch(hookUrl, { method: "POST" }),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), HOOK_TIMEOUT_MS),
      ),
    ]);
    hookOk = res.ok;
  } catch {
    hookOk = false;
  }
  if (!hookOk) {
    return json(
      { error: "Deploy Hook injoignable ou refusé (réessayez)." },
      502,
    );
  }

  // Acquitte le compteur (service_role : hors RLS, colonnes réservées).
  await admin
    .from("hero_version")
    .update({ last_hook_at: new Date().toISOString(), hook_pending: false })
    .eq("id", true);

  return json({ ok: true, deployed: true });
});
