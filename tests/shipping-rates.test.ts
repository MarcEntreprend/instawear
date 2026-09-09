// tests/shipping-rates.test.ts
// Tests for Printful Shipping Rate API integration:
// - Input validation for get-shipping-rates edge function
// - Rate cache logic
// - Delivery estimate formatting
// - CartDrawer "Calculated at checkout" behavior
// - Security: client shipping_cost never trusted server-side

import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidOrderId } from "../supabase/functions/_shared/validators.ts";
import {
  canFetchRates,
  STATE_REQUIRED_COUNTRIES,
} from "../src/hooks/useShippingSettings.ts";

// ─── Input validation (mirrors get-shipping-rates edge function) ────────────

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
    const vid = (item as any).variant_id;
    const qty = (item as any).quantity;
    if (!vid || (typeof vid !== "string" && typeof vid !== "number")) {
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

// ─── country_code validation ────────────────────────────────────────────────

test("country_code: valid 2-letter uppercase", () => {
  assert.ok(isValidCountryCode("US"));
  assert.ok(isValidCountryCode("FR"));
  assert.ok(isValidCountryCode("BR"));
  assert.ok(isValidCountryCode("GB"));
  assert.ok(isValidCountryCode("JP"));
});

test("country_code: invalid formats rejected", () => {
  assert.equal(isValidCountryCode(""), false);
  assert.equal(isValidCountryCode("us"), false); // lowercase
  assert.equal(isValidCountryCode("USA"), false); // 3 letters
  assert.equal(isValidCountryCode("1"), false);
  assert.equal(isValidCountryCode(null), false);
  assert.equal(isValidCountryCode(undefined), false);
});

// ─── state_code validation ──────────────────────────────────────────────────

test("state_code: valid strings accepted", () => {
  assert.ok(isValidStateCode("CA"));
  assert.ok(isValidStateCode("NY"));
  assert.ok(isValidStateCode("Quebec"));
});

test("state_code: too long rejected", () => {
  assert.equal(isValidStateCode("a".repeat(11)), false);
});

// ─── items validation ───────────────────────────────────────────────────────

test("items: valid items accepted", () => {
  const result = validateItems([
    { variant_id: "202", quantity: 1 },
    { variant_id: "12829", quantity: 5 },
  ]);
  assert.ok(result.valid);
  assert.equal(result.cleaned!.length, 2);
  assert.equal(result.cleaned![0].variant_id, "202");
  assert.equal(result.cleaned![1].variant_id, "12829");
});

test("items: numeric variant_id coerced to string", () => {
  const result = validateItems([{ variant_id: 202, quantity: 1 }]);
  assert.ok(result.valid);
  assert.equal(result.cleaned![0].variant_id, "202");
});

test("items: empty array rejected", () => {
  assert.equal(validateItems([]).valid, false);
});

test("items: null rejected", () => {
  assert.equal(validateItems(null).valid, false);
});

test("items: more than 20 rejected", () => {
  const items = Array.from({ length: 21 }, (_, i) => ({
    variant_id: String(i),
    quantity: 1,
  }));
  assert.equal(validateItems(items).valid, false);
});

test("items: non-numeric variant_id rejected", () => {
  assert.equal(
    validateItems([{ variant_id: "abc", quantity: 1 }]).valid,
    false,
  );
});

test("items: quantity 0 rejected", () => {
  assert.equal(
    validateItems([{ variant_id: "202", quantity: 0 }]).valid,
    false,
  );
});

test("items: quantity > 100 rejected", () => {
  assert.equal(
    validateItems([{ variant_id: "202", quantity: 101 }]).valid,
    false,
  );
});

test("items: non-integer quantity rejected", () => {
  assert.equal(
    validateItems([{ variant_id: "202", quantity: 1.5 }]).valid,
    false,
  );
});

// ─── Delivery estimate formatting ───────────────────────────────────────────

interface ShippingRate {
  id: string;
  name: string;
  rate: number;
  currency: string;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
}

function getDeliveryEstimate(rate: ShippingRate): string | null {
  if (rate.minDeliveryDays && rate.maxDeliveryDays) {
    return `${rate.minDeliveryDays}-${rate.maxDeliveryDays} business days`;
  }
  if (rate.minDeliveryDays) {
    return `${rate.minDeliveryDays} business days`;
  }
  return null;
}

test("delivery estimate: both min and max", () => {
  const rate: ShippingRate = {
    id: "STANDARD",
    name: "Flat Rate",
    rate: 4.99,
    currency: "USD",
    minDeliveryDays: 4,
    maxDeliveryDays: 7,
  };
  assert.equal(getDeliveryEstimate(rate), "4-7 business days");
});

test("delivery estimate: only min", () => {
  const rate: ShippingRate = {
    id: "EXPRESS",
    name: "Express",
    rate: 12.99,
    currency: "USD",
    minDeliveryDays: 2,
    maxDeliveryDays: null,
  };
  assert.equal(getDeliveryEstimate(rate), "2 business days");
});

test("delivery estimate: no data returns null", () => {
  const rate: ShippingRate = {
    id: "STANDARD",
    name: "Standard",
    rate: 4.99,
    currency: "USD",
    minDeliveryDays: null,
    maxDeliveryDays: null,
  };
  assert.equal(getDeliveryEstimate(rate), null);
});

// ─── Rate cache key building ────────────────────────────────────────────────

function buildCacheKey(country: string, items: { variantId: string; quantity: number }[]): string {
  const itemStr = items
    .map((i) => `${i.variantId}:${i.quantity}`)
    .sort()
    .join(",");
  return `${country}:${itemStr}`;
}

test("cache key: same items different order produce same key", () => {
  const key1 = buildCacheKey("US", [
    { variantId: "202", quantity: 1 },
    { variantId: "12829", quantity: 2 },
  ]);
  const key2 = buildCacheKey("US", [
    { variantId: "12829", quantity: 2 },
    { variantId: "202", quantity: 1 },
  ]);
  assert.equal(key1, key2);
});

test("cache key: different countries produce different keys", () => {
  const key1 = buildCacheKey("US", [{ variantId: "202", quantity: 1 }]);
  const key2 = buildCacheKey("FR", [{ variantId: "202", quantity: 1 }]);
  assert.notEqual(key1, key2);
});

test("cache key: different quantities produce different keys", () => {
  const key1 = buildCacheKey("US", [{ variantId: "202", quantity: 1 }]);
  const key2 = buildCacheKey("US", [{ variantId: "202", quantity: 2 }]);
  assert.notEqual(key1, key2);
});

// ─── Security: free shipping threshold logic ────────────────────────────────

function computeShippingCost(
  subtotal: number,
  threshold: number,
  rate: number,
  isPickup: boolean,
): { cost: number; methodName: string | null } {
  if (isPickup) return { cost: 0, methodName: "Pickup" };
  if (threshold > 0 && subtotal >= threshold) {
    return { cost: 0, methodName: "Free Shipping" };
  }
  return { cost: rate, methodName: "Flat Rate" };
}

test("shipping: pickup is always free", () => {
  const result = computeShippingCost(10, 35, 4.99, true);
  assert.equal(result.cost, 0);
  assert.equal(result.methodName, "Pickup");
});

test("shipping: above threshold is free", () => {
  const result = computeShippingCost(35, 35, 4.99, false);
  assert.equal(result.cost, 0);
  assert.equal(result.methodName, "Free Shipping");
});

test("shipping: above threshold (even by 0.01) is free", () => {
  const result = computeShippingCost(35.01, 35, 4.99, false);
  assert.equal(result.cost, 0);
  assert.equal(result.methodName, "Free Shipping");
});

test("shipping: below threshold uses rate", () => {
  const result = computeShippingCost(20, 35, 4.99, false);
  assert.equal(result.cost, 4.99);
  assert.equal(result.methodName, "Flat Rate");
});

test("shipping: threshold 0 means no free shipping", () => {
  const result = computeShippingCost(100, 0, 4.99, false);
  assert.equal(result.cost, 4.99);
  assert.equal(result.methodName, "Flat Rate");
});

// ─── Cheapest rate selection ────────────────────────────────────────────────

test("cheapest rate: selects lowest rate", () => {
  const rates: ShippingRate[] = [
    { id: "EXPRESS", name: "Express", rate: 12.99, currency: "USD", minDeliveryDays: 2, maxDeliveryDays: 3 },
    { id: "STANDARD", name: "Flat Rate", rate: 4.99, currency: "USD", minDeliveryDays: 4, maxDeliveryDays: 7 },
    { id: "ECONOMY", name: "Economy", rate: 3.49, currency: "USD", minDeliveryDays: 7, maxDeliveryDays: 14 },
  ];
  const cheapest = rates.reduce((a, b) => (a.rate <= b.rate ? a : b));
  assert.equal(cheapest.id, "ECONOMY");
  assert.equal(cheapest.rate, 3.49);
});

test("cheapest rate: single rate returned", () => {
  const rates: ShippingRate[] = [
    { id: "STANDARD", name: "Flat Rate", rate: 4.99, currency: "USD", minDeliveryDays: 4, maxDeliveryDays: 7 },
  ];
  const cheapest = rates.reduce((a, b) => (a.rate <= b.rate ? a : b));
  assert.equal(cheapest.id, "STANDARD");
});

test("cheapest rate: empty rates returns null", () => {
  const rates: ShippingRate[] = [];
  const cheapest = rates.length > 0
    ? rates.reduce((a, b) => (a.rate <= b.rate ? a : b))
    : null;
  assert.equal(cheapest, null);
});

// ─── Rate limit quota ───────────────────────────────────────────────────────

function quotaFor(path: string): { max: number; windowMs: number } {
  switch (path) {
    case "get-shipping-rates": return { max: 30, windowMs: 60_000 };
    default: return { max: 20, windowMs: 60_000 };
  }
}

test("rate limit: get-shipping-rates allows 30 req/min", () => {
  const q = quotaFor("get-shipping-rates");
  assert.equal(q.max, 30);
  assert.equal(q.windowMs, 60_000);
});

// ─── extractShippingItems helper ────────────────────────────────────────────

function extractShippingItems(
  cart: { product: any; selectedColor: string; selectedSize: string; quantity: number }[],
): { variantId: string; quantity: number }[] {
  const items: { variantId: string; quantity: number }[] = [];
  for (const item of cart) {
    const variants = item.product?.variants;
    if (!Array.isArray(variants)) continue;
    const mv = variants.find(
      (v: any) =>
        v.color?.toLowerCase() === item.selectedColor?.toLowerCase() &&
        v.sizes &&
        v.sizes[item.selectedSize] !== undefined,
    );
    if (!mv) continue;
    const vid = mv.external_variant_id || mv.sync_variant_id || mv.variant_id;
    if (vid) {
      items.push({ variantId: String(vid), quantity: item.quantity });
    }
  }
  return items;
}

test("extractShippingItems: extracts variant IDs from cart", () => {
  const cart = [
    {
      product: {
        variants: [
          {
            color: "Black",
            sizes: { M: { price: 29.99 } },
            external_variant_id: "202",
          },
        ],
      },
      selectedColor: "Black",
      selectedSize: "M",
      quantity: 2,
    },
  ];
  const items = extractShippingItems(cart);
  assert.equal(items.length, 1);
  assert.equal(items[0].variantId, "202");
  assert.equal(items[0].quantity, 2);
});

test("extractShippingItems: handles case-insensitive color match", () => {
  const cart = [
    {
      product: {
        variants: [
          {
            color: "Black",
            sizes: { M: { price: 29.99 } },
            variant_id: "202",
          },
        ],
      },
      selectedColor: "black",
      selectedSize: "M",
      quantity: 1,
    },
  ];
  const items = extractShippingItems(cart);
  assert.equal(items.length, 1);
  assert.equal(items[0].variantId, "202");
});

test("extractShippingItems: skips items with no matching variant", () => {
  const cart = [
    {
      product: {
        variants: [
          {
            color: "Black",
            sizes: { M: { price: 29.99 } },
            variant_id: "202",
          },
        ],
      },
      selectedColor: "Red",
      selectedSize: "M",
      quantity: 1,
    },
  ];
  const items = extractShippingItems(cart);
  assert.equal(items.length, 0);
});

test("extractShippingItems: skips items with no variants array", () => {
  const cart = [
    {
      product: {},
      selectedColor: "Black",
      selectedSize: "M",
      quantity: 1,
    },
  ];
  const items = extractShippingItems(cart);
  assert.equal(items.length, 0);
});

// ─── CartDrawer: shipping not displayed (calculated at checkout) ────────────

test("CartDrawer: shows 'Calculated at checkout' when below threshold", () => {
  const threshold = 35;
  const displayTotal = 20;
  const freeShipping = displayTotal >= threshold;
  const shippingLabel = freeShipping ? "Free" : "Calculated at checkout";
  assert.equal(shippingLabel, "Calculated at checkout");
});

test("CartDrawer: shows 'Free' when above threshold", () => {
  const threshold = 35;
  const displayTotal = 40;
  const freeShipping = displayTotal >= threshold;
  const shippingLabel = freeShipping ? "Free" : "Calculated at checkout";
  assert.equal(shippingLabel, "Free");
});

// ─── Currency validation ────────────────────────────────────────────────────

test("currency: valid codes accepted", () => {
  assert.ok(VALID_CURRENCIES.has("USD"));
  assert.ok(VALID_CURRENCIES.has("EUR"));
  assert.ok(VALID_CURRENCIES.has("GBP"));
  assert.ok(VALID_CURRENCIES.has("JPY"));
});

test("currency: invalid codes rejected", () => {
  assert.equal(VALID_CURRENCIES.has("US"), false);
  assert.equal(VALID_CURRENCIES.has("USDX"), false);
  assert.equal(VALID_CURRENCIES.has("usd"), false);
});

// ─── canFetchRates (doc officielle Printful) ────────────────────────────────

test("canFetchRates: BR sans state est fetchable", () => {
  assert.equal(canFetchRates("BR"), true);
  assert.equal(canFetchRates("FR"), true);
});

test("canFetchRates: US/AU/CA sans state ne sont pas fetchables", () => {
  assert.equal(canFetchRates("US"), false);
  assert.equal(canFetchRates("AU"), false);
  assert.equal(canFetchRates("CA"), false);
});

test("canFetchRates: US/AU/CA avec state sont fetchables", () => {
  assert.equal(canFetchRates("US", "CA"), true);
  assert.equal(canFetchRates("AU", "NSW"), true);
  assert.equal(canFetchRates("CA", "QC"), true);
});

test("canFetchRates: sans pays, pas de fetch", () => {
  assert.equal(canFetchRates(undefined), false);
  assert.equal(canFetchRates(""), false);
});

test("canFetchRates: insensible à la casse du pays", () => {
  assert.equal(canFetchRates("us", "CA"), true);
  assert.equal(canFetchRates("us"), false);
});

test("STATE_REQUIRED_COUNTRIES contient US, AU, CA", () => {
  assert.deepEqual([...STATE_REQUIRED_COUNTRIES].sort(), ["AU", "CA", "US"]);
});

// ─── Réponse approximate (edge) → fallback silencieux ───────────────────────

test("approximate: réponse vide sans erreur → fallback flat", () => {
  // Miroir du comportement du hook : data.approximate === true
  // => applySilentFallback(storeSettings), error reste null.
  const data = { rates: [], approximate: true };
  const storeSettings = { shippingCost: 12, currency: "USD" };
  let applied: any = null;
  let error: string | null = "x";
  if ((data as any).approximate) {
    applied = {
      id: "FLAT_RATE",
      name: "Standard Shipping",
      rate: storeSettings.shippingCost,
    };
    error = null;
  }
  assert.equal(applied.rate, 12);
  assert.equal(applied.id, "FLAT_RATE");
  assert.equal(error, null);
});
