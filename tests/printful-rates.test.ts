// tests/printful-rates.test.ts
// Helper partagé _shared/printfulRates.ts :
// - résolution sync variant ID -> catalogue variant ID (GET /store/variants/{id})
// - appel POST /shipping/rates avec les catalogue IDs (doc officielle)
// - normalisation des tarifs Printful

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  resolveCatalogVariantId,
  clearCatalogIdCache,
  fetchPrintfulShippingRates,
  normalizePrintfulRates,
} from "../supabase/functions/_shared/printfulRates.ts";

const realFetch = globalThis.fetch;
let calls: { url: string; body: any; headers: any }[];

function mockFetch(
  handler: (url: string, init: any) => { ok: boolean; status: number; body: any },
) {
  calls = [];
  (globalThis as any).fetch = async (url: string, init: any) => {
    calls.push({
      url: String(url),
      body: init?.body ? JSON.parse(init.body) : null,
      headers: init?.headers ?? {},
    });
    const r = handler(String(url), init);
    return {
      ok: r.ok,
      status: r.status,
      json: async () => r.body,
    };
  };
}

afterEach(() => {
  (globalThis as any).fetch = realFetch;
  clearCatalogIdCache();
});

const RECIPIENT = { country_code: "US", state_code: "CA" };

// ─── resolveCatalogVariantId ────────────────────────────────────────────────

test("résout le sync ID vers le catalogue ID", async () => {
  mockFetch((url) => {
    assert.match(url, /\/store\/variants\/5414335924/);
    return { ok: true, status: 200, body: { code: 200, result: { id: 5414335924, variant_id: 4012 } } };
  });
  const id = await resolveCatalogVariantId("k", "1", "5414335924");
  assert.equal(id, 4012);
});

test("résolution mise en cache (1 seul appel pour 2 demandes)", async () => {
  let hits = 0;
  (globalThis as any).fetch = async () => {
    hits++;
    return { ok: true, status: 200, json: async () => ({ result: { variant_id: 4012 } }) };
  };
  assert.equal(await resolveCatalogVariantId("k", "1", "5414335924"), 4012);
  assert.equal(await resolveCatalogVariantId("k", "1", "5414335924"), 4012);
  assert.equal(hits, 1);
});

test("404 sur la résolution → null (l'ID est peut-être déjà catalogue)", async () => {
  mockFetch(() => ({ ok: false, status: 404, body: { code: 404, result: "Not found" } }));
  assert.equal(await resolveCatalogVariantId("k", "1", "202"), null);
});

// ─── fetchPrintfulShippingRates ─────────────────────────────────────────────

test("POST /shipping/rates avec le catalogue ID résolu", async () => {
  mockFetch((url) => {
    if (url.includes("/store/variants/")) {
      return { ok: true, status: 200, body: { result: { id: 5414335924, variant_id: 4012 } } };
    }
    return {
      ok: true,
      status: 200,
      body: { code: 200, result: [{ id: "STANDARD", name: "Flat", rate: "4.99", currency: "USD" }] },
    };
  });
  const r = await fetchPrintfulShippingRates({
    apiKey: "k",
    storeId: "1",
    recipient: RECIPIENT,
    items: [{ variant_id: "5414335924", quantity: 1 }],
  });
  assert.equal(r.ok, true);
  assert.equal(r.rates.length, 1);
  const post = calls.find((c) => c.url.endsWith("/shipping/rates"));
  assert.deepEqual(post?.body.items, [{ variant_id: 4012, quantity: 1 }]);
});

test("ID non résolu (404) → envoyé tel quel en variant_id", async () => {
  mockFetch((url) => {
    if (url.includes("/store/variants/")) {
      return { ok: false, status: 404, body: { result: "Not found" } };
    }
    return { ok: true, status: 200, body: { code: 200, result: [] } };
  });
  const r = await fetchPrintfulShippingRates({
    apiKey: "k",
    recipient: RECIPIENT,
    items: [{ variant_id: "202", quantity: 2 }],
  });
  assert.equal(r.ok, true);
  const post = calls.find((c) => c.url.endsWith("/shipping/rates"));
  assert.deepEqual(post?.body.items, [{ variant_id: 202, quantity: 2 }]);
});

test("ID non numérique → external_variant_id (schéma officiel)", async () => {
  mockFetch(() => ({
    ok: true,
    status: 200,
    body: { code: 200, result: [] },
  }));
  await fetchPrintfulShippingRates({
    apiKey: "k",
    recipient: RECIPIENT,
    items: [{ variant_id: "TSHIRT-BLK-M", quantity: 1 }],
  });
  const post = calls.find((c) => c.url.endsWith("/shipping/rates"));
  assert.deepEqual(post?.body.items, [
    { external_variant_id: "TSHIRT-BLK-M", quantity: 1 },
  ]);
  // Aucune tentative de résolution pour un ID non numérique
  assert.ok(!calls.some((c) => c.url.includes("/store/variants/")));
});

test("échec Printful → ok:false avec le message", async () => {
  mockFetch((url) => {
    if (url.includes("/store/variants/")) {
      return { ok: true, status: 200, body: { result: { variant_id: 4012 } } };
    }
    return { ok: false, status: 400, body: { code: 400, result: "Invalid state code" } };
  });
  const r = await fetchPrintfulShippingRates({
    apiKey: "k",
    recipient: RECIPIENT,
    items: [{ variant_id: "5414335924", quantity: 1 }],
  });
  assert.equal(r.ok, false);
  assert.match(r.error || "", /Invalid state code/);
});

test("header X-PF-Store-Id envoyé quand storeId fourni", async () => {
  mockFetch(() => ({ ok: true, status: 200, body: { code: 200, result: [] } }));
  await fetchPrintfulShippingRates({
    apiKey: "k",
    storeId: "12345",
    recipient: RECIPIENT,
    items: [{ variant_id: "202", quantity: 1 }],
  });
  const post = calls.find((c) => c.url.endsWith("/shipping/rates"));
  assert.equal(post?.headers["X-PF-Store-Id"], "12345");
  assert.match(post?.headers["Authorization"], /Bearer k/);
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
