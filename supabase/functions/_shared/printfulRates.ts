// supabase/functions/_shared/printfulRates.ts
// Helper partagé pour Printful POST /shipping/rates (doc officielle :
// https://api.printful.com/shipping/rates — pas de store_id dans l'URL, le
// store passe par le header X-PF-Store-Id).
//
// Chaîne d'IDs (cf. docs-API) :
// - Notre DB stocke dans variants[].external_variant_id le **sync variant id**
//   Printful (ex: 5414335924, voir sync-printful/index.ts ligne 219).
// - Le schéma ItemInfo de /shipping/rates n'accepte que `variant_id`
//   (catalogue), `external_variant_id` ou `warehouse_product_variant_id` :
//   un sync ID passé en `variant_id` répond "Invalid variant ID".
// - Solution conforme : résoudre chaque sync ID vers son catalogue ID via
//   GET /store/variants/{id} (réponse SyncVariant contient `variant_id`),
//   avec cache mémoire 24h. Si la résolution échoue (404 = l'ID est déjà
//   un catalogue ID), on garde l'ID tel quel.

export const PRINTFUL_API = "https://api.printful.com";
export const PRINTFUL_SHIPPING_RATES_URL = `${PRINTFUL_API}/shipping/rates`;

// Cache sync ID -> catalogue ID (les IDs ne changent jamais : TTL 24h).
const catalogIdCache = new Map<string, { id: number; expiresAt: number }>();
const CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface RateItemInput {
  variant_id: string;
  quantity: number;
}

function pfHeaders(apiKey: string, storeId?: string | number | null) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (storeId !== undefined && storeId !== null && storeId !== "") {
    headers["X-PF-Store-Id"] = String(storeId);
  }
  return headers;
}

/**
 * Résout un sync variant ID vers son catalogue variant ID.
 * Retourne null si non résolu (l'appelant garde alors l'ID d'origine).
 */
export async function resolveCatalogVariantId(
  apiKey: string,
  storeId: string | number | null | undefined,
  syncId: string,
): Promise<number | null> {
  const key = String(syncId);
  const cached = catalogIdCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.id;

  try {
    const res = await fetch(
      `${PRINTFUL_API}/store/variants/${encodeURIComponent(key)}`,
      { headers: pfHeaders(apiKey, storeId) },
    );
    if (!res.ok) return null; // 404 = pas un sync ID (peut-être déjà catalogue)
    const data = await res.json().catch(() => null);
    const catalogId = Number(data?.result?.variant_id);
    if (!Number.isFinite(catalogId) || catalogId <= 0) return null;
    catalogIdCache.set(key, { id: catalogId, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS });
    return catalogId;
  } catch {
    return null;
  }
}

/** Vide le cache de résolution (utile en test). */
export function clearCatalogIdCache(): void {
  catalogIdCache.clear();
}

export interface FetchRatesResult {
  ok: boolean;
  rates: any[];
  /** Message d'erreur Printful (si ok === false). */
  error?: string;
}

/**
 * Appelle Printful /shipping/rates :
 * 1. résout chaque ID numérique vers son catalogue ID (parallèle, caché),
 * 2. POST avec [{ variant_id: catalogueId, quantity }],
 * 3. les IDs non numériques partent en `external_variant_id` (schéma OK).
 * Ne lance jamais d'exception : en cas d'échec, { ok: false, error }.
 */
export async function fetchPrintfulShippingRates(opts: {
  apiKey: string;
  storeId?: string | number | null;
  recipient: Record<string, unknown>;
  items: RateItemInput[];
  currency?: string;
}): Promise<FetchRatesResult> {
  const headers = pfHeaders(opts.apiKey, opts.storeId);

  const pfItems = await Promise.all(
    opts.items.map(async (i) => {
      const raw = String(i.variant_id).trim();
      if (!/^\d+$/.test(raw)) {
        return { external_variant_id: raw, quantity: i.quantity };
      }
      const catalogId =
        (await resolveCatalogVariantId(opts.apiKey, opts.storeId, raw)) ??
        Number(raw);
      return { variant_id: catalogId, quantity: i.quantity };
    }),
  );

  const payload: Record<string, unknown> = {
    recipient: opts.recipient,
    items: pfItems,
  };
  if (opts.currency) payload.currency = String(opts.currency).toUpperCase();

  let pfRes: Response;
  try {
    pfRes = await fetch(PRINTFUL_SHIPPING_RATES_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch (e: any) {
    return { ok: false, rates: [], error: e?.message || "Erreur réseau Printful" };
  }

  const pfData: any = await pfRes.json().catch(() => null);
  if (!pfRes.ok) {
    return {
      ok: false,
      rates: [],
      error: String(
        pfData?.result ?? pfData?.error?.message ?? `HTTP ${pfRes.status}`,
      ),
    };
  }
  return { ok: true, rates: Array.isArray(pfData?.result) ? pfData.result : [] };
}

/** Normalise result[] Printful vers notre forme { id, name, rate, ... }. */
export function normalizePrintfulRates(pfResult: any[]): {
  id: string;
  name: string;
  rate: number;
  currency: string;
  minDeliveryDays: number | null;
  maxDeliveryDays: number | null;
  minDeliveryDate: string | null;
  maxDeliveryDate: string | null;
}[] {
  return (pfResult || []).map((r: any) => ({
    id: r.id || "STANDARD",
    name: r.name || "Standard Shipping",
    rate: parseFloat(r.rate) || 0,
    currency: r.currency || "USD",
    minDeliveryDays: r.minDeliveryDays ?? null,
    maxDeliveryDays: r.maxDeliveryDays ?? null,
    minDeliveryDate: r.minDeliveryDate ?? null,
    maxDeliveryDate: r.maxDeliveryDate ?? null,
  }));
}
