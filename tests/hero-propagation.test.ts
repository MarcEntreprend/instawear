// tests/hero-propagation.test.ts — Hero Studio lot 5 : fraîcheur boutique
// (polling version), redéploiement à la demande (edge admin-only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HERO_VERSION_POLL_MS,
  shouldRefreshHero,
} from "../src/lib/heroSelect.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(root, f), "utf-8");

test("shouldRefreshHero : cale au premier appel, recharge au bump", () => {
  assert.equal(shouldRefreshHero(null, 3), false);
  assert.equal(shouldRefreshHero(3, null), false);
  assert.equal(shouldRefreshHero(3, 3), false);
  assert.equal(shouldRefreshHero(3, 4), true);
});

test("polling : 45 s, jamais onglet caché", () => {
  assert.equal(HERO_VERSION_POLL_MS, 45000);
  const app = read("src/App.tsx");
  assert.ok(app.includes("HERO_VERSION_POLL_MS"), "intervalle nommé");
  assert.ok(app.includes("visibilitychange"), "re-sonde au retour visible");
  assert.ok(app.includes("document.hidden"), "jamais onglet caché");
  assert.ok(app.includes("getVersion()"), "sonde le compteur");
  assert.ok(app.includes("shouldRefreshHero"), "recharge au bump seul");
});

test("invalidate : promos rechargées avec le catalogue", () => {
  const app = read("src/App.tsx");
  assert.ok(app.includes("fetchPromos"), "fetch promos factorisé");
  const handler = app.match(
    /storefront:invalidate[\s\S]{0,400}?fetchPromos/,
  );
  assert.ok(handler, "le handler invalidate recharge les promos");
});

test("getVersion : 2 colonnes publiques, ligne unique", () => {
  const api = read("src/api/supabaseApi.ts");
  assert.ok(api.includes("async getVersion("), "compteur exposé");
  assert.ok(
    api.includes('select("version,updated_at")'),
    "colonnes GRANTées seules",
  );
});

test("requestDeploy : invoke edge dédiée", () => {
  const api = read("src/api/supabaseApi.ts");
  assert.ok(api.includes("async requestDeploy("), "déclencheur exposé");
  assert.ok(api.includes('"hero-deploy-hook"'), "edge dédiée");
  const page = read("src/admin/PromotionsPage.tsx");
  assert.ok(page.includes("requestDeploy"), "bouton Republier branché");
  assert.ok(page.includes("Republier le site"), "libellé explicite");
});

test("studio : save propage en instantané même onglet", () => {
  const ed = read("src/admin/HeroStudioEditor.tsx");
  assert.ok(
    ed.includes('dispatchEvent(new Event("storefront:invalidate"))'),
    "dispatch au save",
  );
});

test("edge hero-deploy-hook : admin-only, secrets, acquittement", () => {
  const edge = read("supabase/functions/hero-deploy-hook/index.ts");
  assert.ok(edge.includes('req.method !== "POST"'), "POST uniquement");
  assert.ok(edge.includes("HERO_DEPLOY_HOOK_URL"), "secret jamais en repo");
  assert.ok(edge.includes("missingEnv"), "fail-closed 503");
  assert.ok(edge.includes("admin_users"), "garde admin (pattern health)");
  assert.ok(edge.includes("401"), "non admin refusé");
  assert.ok(edge.includes("hook_pending"), "acquitte le compteur");
  assert.ok(edge.includes("last_hook_at"), "horodate le rebuild");
  assert.ok(
    !edge.includes("Deno.env.get(\"HERO_DEPLOY_HOOK_URL\")!") ||
      edge.includes("missingEnv"),
    "pas de secret déréférencé sans garde",
  );
});
