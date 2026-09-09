// tests/printful-rates.test.ts
// Helper partagé _shared/printfulRates.ts :
// - construction des candidats sync_variant_id -> variant_id
// - détection "Invalid variant ID"
// - retry automatique (fetch mocké)
// - normalisation des tarifs Printful

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  buildRateItemCandidates,
  isInvalidVariantError,
  fetchPrintfulShippingRates,
  normalizePrintfulRates,
} from "../supabase/functions/_shared/printfulRates.ts";

// ─── buildRateItemCandidates ────────────────────────────────────────────────

test("candidats: ID numérique → sync_variant_id d'abord, variant_id ensuite", () => {
  const c = buildRateItemCandidates({ variant_id: "5414335924", quantity: 1 });
  assert.equal(c.length, 2);
  assert.deepEqual(c[0], { sync_variant_id: 5414335924, quantity: 1 });
  assert.deepEqual(c[1], { variant_id: 5414335924, quantity: 1 });
});

test("candidats: ID catalogue numérique → même ordre", () => {
  const c = buildRateItemCandidates({ variant_id: "202", quantity: 5 });
  assert.equal(c.length, 2);
  assert.deepEqual(c[0], { sync_variant_id: 202, quantity: 5 });
  assert.deepEqual(c[1], { variant_id: 202, quantity: 5 });
});

test("candidats: ID non numérique → external_variant_id uniquement", () => {
  const c = buildRateItemCandidates({ variant_id: "TSHIRT-BLK-M", quantity: 2 });
  assert.equal(c.length, 1);
  assert.deepEqual(c[0], { external_variant_id: "TSHIRT-BLK-M", quantity: 2 });
});

// ─── isInvalidVariantError ──────────────────────────────────────────────────

test("détecte 'Invalid variant ID' (result string)", () => {
  assert.equal(
    isInvalidVariantError({ code: 400, result: "Invalid variant ID: 123" }),
    true,
  );
});

test("détecte 'Invalid variant ID' (error.message, casse mixte)", () => {
  assert.equal(
    isInvalidVariantError({ error: { message: "Invalid Variant ID" } }),
    true,
  );
});

test("ne détecte pas les autres erreurs", () => {
  assert.equal(isInvalidVariantError({ result: "Invalid state code" }), false);
  assert.equal(isInvalidVariantError({ error: { message: "Unauthorized" } }), false);
  assert.equal(isInvalidVariantError(null), false);
  assert.equal(isInvalidVariantError({}), false);
});

// ─── fetchPrintfulShippingRates (fetch mocké) ───────────────────────────────

const realFetch = globalThis.fetch;
let calls: any[];

function mockFetch(responses: { ok: boolean; status: number; body: any }[]) {
  calls = [];
  let i = 0;
  (globalThis as any).fetch = async (_url: string, init: any) => {
    calls.push(JSON.parse(init.body));
    const r = responses[Math.min(i++, responses.length - 1)];
    return {
      ok: r.ok,
      status: r.status,
      json: async () => r.body,
    };
  };
}

afterEach(() => {
  (globalThis as any).fetch = realFetch;
});

const RECIPIENT = { country_code: "US", state_code: "CA" };

test("succès au 1er essai via sync_variant_id", async () => {
  mockFetch([
    {
      ok: true,
      status: 200,
      body: {
        code: 200,
        result: [{ id: "STANDARD", name: "Flat", rate: "4.99", currency: "USD" }],
      },
    },
  ]);
  const r = await fetchPrintfulShippingRates({
    apiKey: "k",
    storeId: "1",
    recipient: RECIPIENT,
    items: [{ variant_id: "5414335924", quantity: 1 }],
  });
  assert.equal(r.ok, true);
  assert.equal(r.rates.length, 1);
  assert.equal(r.usedField, "sync_variant_id");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].items, [{ sync_variant_id: 5414335924, quantity: 1 }]);
});

test("Invalid variant → 2e essai via variant_id qui réussit", async () => {
  mockFetch([
    { ok: false, status: 400, body: { code: 400, result: "Invalid variant ID: 202" } },
    {
      ok: true,
      status: 200,
      body: {
        code: 200,
        result: [{ id: "STANDARD", name: "Flat", rate: "4.99", currency: "USD" }],
      },
    },
  ]);
  const r = await fetchPrintfulShippingRates({
    apiKey: "k",
    recipient: RECIPIENT,
    items: [{ variant_id: "202", quantity: 1 }],
  });
  assert.equal(r.ok, true);
  assert.equal(r.usedField, "variant_id");
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].items, [{ variant_id: 202, quantity: 1 }]);
});

test("erreur non-variant → pas de 2e essai", async () => {
  mockFetch([
    { ok: false, status: 400, body: { code: 400, result: "Invalid state code" } },
  ]);
  const r = await fetchPrintfulShippingRates({
    apiKey: "k",
    recipient: RECIPIENT,
    items: [{ variant_id: "202", quantity: 1 }],
  });
  assert.equal(r.ok, false);
  assert.equal(calls.length, 1);
  assert.match(r.error || "", /Invalid state code/);
});

test("double échec variant → ok:false avec le dernier message", async () => {
  mockFetch([
    { ok: false, status: 400, body: { code: 400, result: "Invalid variant ID: 999" } },
    { ok: false, status: 400, body: { code: 400, result: "Invalid variant ID: 999" } },
  ]);
  const r = await fetchPrintfulShippingRates({
    apiKey: "k",
    recipient: RECIPIENT,
    items: [{ variant_id: "999", quantity: 1 }],
  });
  assert.equal(r.ok, false);
  assert.equal(calls.length, 2);
  assert.match(r.error || "", /Invalid variant/);
});

test("header X-PF-Store-Id envoyé quand storeId fourni", async () => {
  let sentHeaders: any = null;
  (globalThis as any).fetch = async (_url: string, init: any) => {
    sentHeaders = init.headers;
    return { ok: true, status: 200, json: async () => ({ code: 200, result: [] }) };
  };
  await fetchPrintfulShippingRates({
    apiKey: "k",
    storeId: "12345",
    recipient: RECIPIENT,
    items: [{ variant_id: "202", quantity: 1 }],
  });
  assert.equal(sentHeaders["X-PF-Store-Id"], "12345");
  assert.match(sentHeaders["Authorization"], /Bearer k/);
});

// ─── normalizePrintfulRates ─────────────────────────────────────────────────

test("normalise rate string '13.60' → 13.6", () => {
  const out = normalizePrintfulRates([
    { id: "STANDARD", name: "Flat Rate", rate: "13.60", currency: "EUR" },
  ]);
  assert.equal(out[0].rate, 13.6);
  assert.equal(out[0].currency, "EUR");
  assert.equal(out[0].minDeliveryDays, null);
});

test("valeurs par défaut quand champs absents", () => {
  const out = normalizePrintfulRates([{}]);
  assert.equal(out[0].id, "STANDARD");
  assert.equal(out[0].name, "Standard Shipping");
  assert.equal(out[0].rate, 0);
  assert.equal(out[0].currency, "USD");
});

test("tableau vide → tableau vide", () => {
  assert.deepEqual(normalizePrintfulRates([]), []);
});
