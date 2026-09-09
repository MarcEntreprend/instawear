// src/hooks/useShippingSettings.ts
// Source de vérité: Printful Shipping Rate API (coûts réels) +
// store_settings (seuil free shipping, fallback flat rate).
// Le client ne calcule JAMAIS les frais — le backend vérifie via l'edge function.

import { useState, useEffect, useRef, useMemo } from "react";

export interface ShippingRate {
  id: string;
  name: string;
  rate: number;
  currency: string;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  minDeliveryDate: string | null;
  maxDeliveryDate: string | null;
}

interface ShippingSettings {
  /** Cheapest rate price (0 if free or loading) */
  cost: number;
  /** Free shipping threshold from store_settings */
  threshold: number;
  /** Fallback flat rate from store_settings (used when Printful API unavailable) */
  fallbackCost: number;
  /** Currency code (from store_settings) */
  currencyCode: string;
  /** All rates returned by Printful */
  rates: ShippingRate[];
  /** The cheapest rate */
  selectedRate: ShippingRate | null;
  /** Delivery estimate string, e.g. "4-7 business days" */
  deliveryEstimate: string | null;
  /** True while fetching rates */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** True once initial data is loaded */
  ready: boolean;
}

interface CartItemForShipping {
  variantId: string;
  quantity: number;
}

interface AddressFields {
  stateCode?: string;
  city?: string;
  zip?: string;
  address?: string;
}

// In-memory cache: key = "country:variant1:qty1,variant2:qty2"
const rateCache = new Map<
  string,
  { data: ShippingRate[]; expiresAt: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 min

function buildCacheKey(
  country: string,
  items: CartItemForShipping[],
  address?: AddressFields,
): string {
  const itemStr = items
    .map((i) => `${i.variantId}:${i.quantity}`)
    .sort()
    .join(",");
  const addrStr = address
    ? `${address.stateCode || ""}:${address.city || ""}:${address.zip || ""}`
    : "";
  return `${country}:${addrStr}:${itemStr}`;
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

/**
 * Mémorise l'objet adresse à partir de sa clé debouncée : l'effet ne se
 * redéclenche qu'une fois la frappe stabilisée (pas à chaque touche).
 */
function useDebouncedAddress(
  address: AddressFields | undefined,
  debouncedKey: string,
): AddressFields | undefined {
  const ref = useRef<AddressFields | undefined>(address);
  ref.current = address;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ref.current, [debouncedKey]);
}

/**
 * Pays pour lesquels Printful exige state_code (doc officielle
 * POST /shipping/rates — ShippingRatesAddress). Sans lui, aucun tarif
 * exact n'est possible : on utilise le fallback silencieux.
 */
export const STATE_REQUIRED_COUNTRIES = ["US", "AU", "CA"];

/** True si on peut interroger Printful (sinon fallback silencieux). */
export function canFetchRates(
  countryCode?: string,
  stateCode?: string,
): boolean {
  if (!countryCode) return false;
  if (
    STATE_REQUIRED_COUNTRIES.includes(countryCode.toUpperCase()) &&
    !stateCode
  ) {
    return false;
  }
  return true;
}

/**
 * @param countryCode - ISO 3166-1 alpha-2 (e.g. "US", "FR")
 * @param cartItems - Array of { variantId, quantity } for Printful rate lookup.
 *                    Pass [] or omit for threshold-only mode (CartDrawer).
 * @param address - Optional address fields for more accurate rates.
 */
export function useShippingSettings(
  countryCode?: string,
  cartItems?: CartItemForShipping[],
  address?: AddressFields,
): ShippingSettings {
  const [settings, setSettings] = useState<ShippingSettings>({
    cost: 0,
    threshold: 35,
    fallbackCost: 4.99,
    currencyCode: "usd",
    rates: [],
    selectedRate: null,
    deliveryEstimate: null,
    loading: false,
    error: null,
    ready: false,
  });

  const abortRef = useRef<AbortController | null>(null);
  const addressKey = address
    ? `${address.stateCode || ""}:${address.city || ""}:${address.zip || ""}:${address.address || ""}`
    : "";

  // Debounce la frappe dans les champs d'adresse (700ms) pour ne pas
  // spammer l'API à chaque touche — le calcul reste "smooth".
  const [debouncedAddressKey, setDebouncedAddressKey] = useState(addressKey);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAddressKey(addressKey), 700);
    return () => clearTimeout(t);
  }, [addressKey]);
  const debouncedAddress = useDebouncedAddress(address, debouncedAddressKey);

  useEffect(() => {
    let cancelled = false;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Step 1: immediately load store_settings (threshold + currency + fallback cost)
    import("../api/supabaseApi").then(({ storeSettingsApi }) => {
      storeSettingsApi
        .get()
        .then((s) => {
          if (cancelled) return;
          const fallback = s.shippingCost ?? 4.99;
          setSettings((prev) => ({
            ...prev,
            threshold: s.freeShippingThreshold ?? 35,
            fallbackCost: fallback,
            currencyCode: (s.currency || "usd").toLowerCase(),
            ready: true,
          }));

          // Step 2: if we have country + items, fetch Printful rates
          if (countryCode && cartItems && cartItems.length > 0) {
            if (
              canFetchRates(countryCode, debouncedAddress?.stateCode)
            ) {
              fetchPrintfulRates(
                countryCode,
                cartItems,
                s,
                cancelled,
                debouncedAddress,
              );
            } else {
              // US/AU/CA sans state : Printful ne peut pas répondre —
              // fallback silencieux (pas de requête = pas d'erreur console).
              applySilentFallback(s);
            }
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSettings((prev) => ({ ...prev, ready: true }));
            // Still try to fetch rates even if store_settings fails
            if (countryCode && cartItems && cartItems.length > 0) {
              if (canFetchRates(countryCode, debouncedAddress?.stateCode)) {
                fetchPrintfulRates(
                  countryCode,
                  cartItems,
                  null,
                  cancelled,
                  debouncedAddress,
                );
              }
            }
          }
        });
    });

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [
    countryCode,
    cartItems ? JSON.stringify(cartItems) : "",
    debouncedAddressKey,
  ]);

  async function fetchPrintfulRates(
    country: string,
    items: CartItemForShipping[],
    storeSettings: any,
    cancelled: boolean,
    addr?: AddressFields,
  ) {
    if (cancelled) return;

    // Check cache
    const cacheKeyStr = buildCacheKey(country, items, addr);
    const cached = rateCache.get(cacheKeyStr);
    if (cached && Date.now() < cached.expiresAt) {
      if (!cancelled) applyRates(cached.data, storeSettings);
      return;
    }

    setSettings((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      const payload: any = {
        country_code: country,
        items: items.map((i) => ({
          variant_id: i.variantId,
          quantity: i.quantity,
        })),
      };
      if (addr?.stateCode) payload.state_code = addr.stateCode;
      if (addr?.city) payload.city = addr.city;
      if (addr?.zip) payload.zip = addr.zip;
      if (addr?.address) payload.address = addr.address;

      const res = await fetch(
        `${supabaseUrl}/functions/v1/get-shipping-rates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
          },
          body: JSON.stringify(payload),
          signal: abortRef.current?.signal,
        },
      );

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        // Diagnostic : affiche la raison exacte du refus (validation edge
        // vs erreur Printful relayée) + le payload envoyé. Coller cette
        // ligne dans le chat permet d'identifier la cause en 1 message.
        console.warn("[shipping] get-shipping-rates refusé", {
          status: res.status,
          error: errBody?.error,
          details: errBody?.details,
          country,
          items,
        });
        throw new Error(errBody?.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // Réponse "approximate" (ex: US sans state) : pas de tarifs exacts
      // possibles — fallback silencieux, sans erreur.
      if (data.approximate) {
        if (!cancelled) applySilentFallback(storeSettings);
        return;
      }

      const rates: ShippingRate[] = data.rates || [];

      // Cache the result
      rateCache.set(cacheKeyStr, {
        data: rates,
        expiresAt: Date.now() + CACHE_TTL,
      });

      if (!cancelled) applyRates(rates, storeSettings);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (!cancelled) {
        // Fallback: use store_settings flat rate when API unavailable
        const fallbackRate: ShippingRate | null = storeSettings?.shippingCost
          ? {
              id: "FLAT_RATE",
              name: "Standard Shipping",
              rate: storeSettings.shippingCost,
              currency: (storeSettings.currency || "USD").toUpperCase(),
              minDeliveryDays: null,
              maxDeliveryDays: null,
              minDeliveryDate: null,
              maxDeliveryDate: null,
            }
          : null;
        setSettings((prev) => ({
          ...prev,
          rates: fallbackRate ? [fallbackRate] : [],
          selectedRate: fallbackRate,
          cost: fallbackRate?.rate ?? 0,
          deliveryEstimate: null,
          loading: false,
          error: err?.message || "Failed to fetch shipping rates",
        }));
      }
    }
  }

  function applyRates(rates: ShippingRate[], storeSettings: any) {
    const cheapest = rates.length > 0
      ? rates.reduce((a, b) => (a.rate <= b.rate ? a : b))
      : null;

    setSettings((prev) => ({
      ...prev,
      rates,
      selectedRate: cheapest,
      cost: cheapest?.rate ?? 0,
      deliveryEstimate: cheapest ? getDeliveryEstimate(cheapest) : null,
      loading: false,
      error: null,
    }));
  }

  /**
   * Fallback silencieux : tarif forfaitaire du store, sans état d'erreur.
   * Utilisé quand Printful ne peut pas répondre (ex: US sans state_code)
   * pour garder un affichage smooth, sans spam d'erreurs console.
   */
  function applySilentFallback(storeSettings: any) {
    const flat = storeSettings?.shippingCost ?? 4.99;
    const fallbackRate: ShippingRate = {
      id: "FLAT_RATE",
      name: "Standard Shipping",
      rate: flat,
      currency: (storeSettings?.currency || "USD").toUpperCase(),
      minDeliveryDays: null,
      maxDeliveryDays: null,
      minDeliveryDate: null,
      maxDeliveryDate: null,
    };
    setSettings((prev) => ({
      ...prev,
      rates: [fallbackRate],
      selectedRate: fallbackRate,
      cost: flat,
      deliveryEstimate: null,
      loading: false,
      error: null,
    }));
  }

  return settings;
}

/**
 * Helper: extract variant IDs from cart items for the shipping rate API.
 * Call this in CheckoutFlow/CartDrawer to build the items array.
 */
export function extractShippingItems(
  cart: { product: any; selectedColor: string; selectedSize: string; quantity: number }[],
): CartItemForShipping[] {
  const items: CartItemForShipping[] = [];
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
