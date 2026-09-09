// supabase/functions/_shared/printfulRates.ts
// Helper partagé pour l'appel Printful POST /shipping/rates (doc officielle :
// https://api.printful.com/shipping/rates — pas de store_id dans l'URL, le
// store passe par le header X-PF-Store-Id).
//
// Subtilité IDs (cf. docs-API/Orders API printful.txt) :
// - Notre DB stocke dans variants[].external_variant_id le **sync variant id**
//   Printful (ex: 5414335924, voir sync-printful/index.ts ligne 219).
// - La création de commande (/orders) accepte `sync_variant_id` — c'est
//   pourquoi create-printful-order fonctionne avec ces IDs.
// - Le schéma ItemInfo de /shipping/rates ne liste que `variant_id`
//   (catalogue), `external_variant_id` et `warehouse_product_variant_id`.
//   En pratique un sync ID passé en `variant_id` répond
//   "Invalid variant ID". On tente donc `sync_variant_id` d'abord, puis
//   `variant_id` en repli si Printful rejette l'ID.

export const PRINTFUL_SHIPPING_RATES_URL =
  "https://api.printful.com/shipping/rates";

export interface RateItemInput {
  variant_id: string;
  quantity: number;
}

/** Candidats d'item Printful, dans l'ordre d'essai. */
export function buildRateItemCandidates(
  item: RateItemInput,
): Record<string, unknown>[] {
  const qty = item.quantity;
  const idNum = Number(item.variant_id);
  const candidates: Record<string, unknown>[] = [];
  if (Number.isFinite(idNum)) {
    // 1) sync variant id (cas réel de notre DB — cf. sync-printful)
    candidates.push({ sync_variant_id: idNum, quantity: qty });
    // 2) catalog variant id (au cas où l'ID stocké serait un catalogue ID)
    candidates.push({ variant_id: idNum, quantity: qty });
  } else {
    // ID non numérique : uniquement external_variant_id possible
    candidates.push({
      external_variant_id: String(item.variant_id),
      quantity: qty,
    });
  }
  return candidates;
}

/** Détecte l'erreur "Invalid variant ID" dans une réponse Printful. */
export function isInvalidVariantError(pfData: any): boolean {
  const msg = String(
    pfData?.result ?? pfData?.error?.message ?? pfData?.error ?? "",
  ).toLowerCase();
  return msg.includes("invalid variant");
}

export interface FetchRatesResult {
  ok: boolean;
  rates: any[];
  /** Message d'erreur Printful (si ok === false). */
  error?: string;
  /** Quel candidat a fonctionné : "sync_variant_id" | "variant_id" | "external_variant_id" | null */
  usedField?: string | null;
}

/**
 * Appelle Printful /shipping/rates avec repli automatique sync -> catalogue.
 * Ne lance jamais d'exception : en cas d'échec, { ok: false, error }.
 */
export async function fetchPrintfulShippingRates(opts: {
  apiKey: string;
  storeId?: string | number | null;
  recipient: Record<string, unknown>;
  items: RateItemInput[];
  currency?: string;
}): Promise<FetchRatesResult> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.apiKey}`,
    "Content-Type": "application/json",
  };
  if (opts.storeId !== undefined && opts.storeId !== null && opts.storeId !== "") {
    headers["X-PF-Store-Id"] = String(opts.storeId);
  }

  // Nombre d'essais = nombre max de candidats parmi les items (1 ou 2).
  const maxAttempts = Math.max(
    ...opts.items.map((i) => buildRateItemCandidates(i).length),
    1,
  );

  let lastError = "Erreur Printful inconnue";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pfItems = opts.items.map((i) => {
      const c = buildRateItemCandidates(i);
      return c[Math.min(attempt, c.length - 1)];
    });
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
      lastError = e?.message || "Erreur réseau Printful";
      break; // réseau HS : inutile de réessayer l'autre candidat
    }

    let pfData: any = null;
    try {
      pfData = await pfRes.json();
    } catch {
      pfData = null;
    }

    if (pfRes.ok) {
      const usedKeys = Object.keys(pfItems[0] || {}).filter(
        (k) => k !== "quantity",
      );
      return {
        ok: true,
        rates: Array.isArray(pfData?.result) ? pfData.result : [],
        usedField: usedKeys[0] ?? null,
      };
    }

    lastError = String(
      pfData?.result ?? pfData?.error?.message ?? `HTTP ${pfRes.status}`,
    );
    // Repli uniquement sur "Invalid variant ID" : les autres erreurs
    // (adresse invalide, auth, quota…) ne changeront pas au 2e essai.
    if (!isInvalidVariantError(pfData)) break;
  }

  return { ok: false, rates: [], error: lastError, usedField: null };
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
