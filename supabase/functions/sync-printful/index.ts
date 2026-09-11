// supabase\functions\sync-printful\index.ts

// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { safeFetch } from "./_shared/safeUrl.ts";
import { logSafe, safeTruncate } from "./_shared/logSafe.ts";
import { isRateLimited, rateLimitKey, quotaFor } from "./_shared/rateLimit.ts";
import { fetchWithRetry, reportError } from "./_shared/opsUtils.ts";
import {
  displayImageUrl,
  imagekitEndpoint,
} from "./_shared/imagekit.ts";
import {
  buildCatalogPriceIndex,
  resolveUnitPrice as resolveUnitPriceShared,
} from "./_shared/variantPricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Rate limiting simple (en mémoire, par IP) ──────────────────────────
// P-F rate limit distribué importé depuis _shared/rateLimit.ts

// ─── Fallback color name → hex (Printful n'a pas toujours un color_code2) ──
const COLOR_NAME_TO_HEX: Record<string, string> = {
  black: "#1a1a1a",
  white: "#ffffff",
  red: "#cc0000",
  navy: "#000080",
  "dark heather": "#3e3e3e",
  heather: "#c0c0c0",
  "light blue": "#add8e6",
  royal: "#4169e1",
  "sport grey": "#808080",
  sand: "#c2b280",
  "light pink": "#ffb6c1",
  ash: "#b2beb5",
  charcoal: "#36454f",
  forest: "#228b22",
  purple: "#800080",
  gold: "#ffd700",
  orange: "#ffa500",
  yellow: "#ffff00",
  green: "#008000",
  blue: "#0000ff",
  pink: "#ffc0cb",
  grey: "#808080",
  gray: "#808080",
  brown: "#a52a2a",
  beige: "#f5f5dc",
  silver: "#c0c0c0",
  maroon: "#800000",
  olive: "#808000",
  teal: "#008080",
  aqua: "#00ffff",
  coral: "#ff7f50",
  mint: "#98ff98",
  lavender: "#e6e6fa",
  khaki: "#c3b091",
  mustard: "#ffdb58",
  burgundy: "#800020",
  blush: "#de5d83",
  "baby blue": "#89cff0",
  lime: "#00ff00",
  cream: "#fffdd0",
  tan: "#d2b48c",
  chocolate: "#7b3f00",
  indigo: "#4b0082",
  violet: "#8f00ff",
  crimson: "#dc143c",
  "dark chocolate": "#4a3728",
  "heather grey": "#9b9b9b",
  "sport gray": "#808080",
  "dark grey": "#a9a9a9",
  "dark gray": "#a9a9a9",
  // ── Printful-specific color names (sync variants often have null color_code) ──
  "washed black": "#1a1a1a",
  "light washed denim": "#7b8fa1",
  "vintage white": "#f5f0e8",
  spruce: "#2e4a1a",
  stone: "#8b8682",
  "green camo": "#4a5d23",
  "dark heather grey": "#3e3e3e",
  "heather midnight navy": "#1a2035",
  "heather olive": "#4a5032",
  // ── Noms catalogue courants sans color_code (dernier recours : le
  // color_code catalogue reste prioritaire via catalogIdToHex) ──
  natural: "#e8e0d0",
  "yellow haze": "#efe0a8",
  "ice grey": "#d8dee3",
  "ice gray": "#d8dee3",
  "athletic heather": "#9aa0a6",
};

// ─── Résout un hex de couleur à partir des champs Printful natifs ──────────
function resolveHexColor(
  rawColor: string,
  rawCode?: string,
  rawCode2?: string,
): string {
  // Normalise TOUS les hex en lowercase : Store API → "#ffffff",
  // Catalog API → "#FFFFFF", COLOR_NAME_TO_HEX → "#FFFFFF"
  // Sans normalisation le matching Map échoue
  if (rawCode2 && /^#/.test(rawCode2)) return rawCode2.toLowerCase();
  if (rawCode && /^#/.test(rawCode)) return rawCode.toLowerCase();
  const key = (rawColor || "").toLowerCase().replace(/\s+/g, "_");
  const fromMap =
    COLOR_NAME_TO_HEX[key] || COLOR_NAME_TO_HEX[(rawColor || "").toLowerCase()];
  if (fromMap) return fromMap.toLowerCase();
  return rawCode?.toLowerCase() || rawColor || "#cccccc";
}

// ─── Helper POD: statut stock Printful -> stock_status interne ─────────────
function resolveCatalogStockStatus(cv: any): string {
  const statuses: string[] = (cv.availability_status || []).map((a: any) =>
    String(a.status || "").toLowerCase(),
  );
  if (statuses.length === 0 && cv.in_stock === false) return "out_of_stock";
  if (statuses.includes("discontinued")) return "discontinued";
  if (statuses.includes("out_of_stock")) return "out_of_stock";
  return "available";
}
function resolveSyncStockStatus(sv: any): string | null {
  if (sv.discontinued === true) return "discontinued";
  if (sv.out_of_stock === true) return "out_of_stock";
  if (sv.is_discontinued === true) return "discontinued";
  if (sv.availability_status) {
    const s = String(sv.availability_status).toLowerCase();
    if (s === "discontinued") return "discontinued";
    if (s === "out_of_stock") return "out_of_stock";
  }
  return null;
}

// ─── Source de vérité unique couleur × taille × prix + stock_status ───────
// POD additif: sizes[size] = {price, stock_status?} ; absent = available
function buildVariantMatrix(syncVariants: any[], catalogVariants: any[]) {
  const byColor = new Map<
    string,
    {
      name: string;
      sizes: Map<string, { price: number; stock_status: string }>;
      /** Meilleur visuel : aperçu avec design si dispo, sinon mockup vierge. */
      image: string;
      /** Mockup vierge catalogue (sans design), pour la galerie. */
      mockup_image: string;
      id: number | null;
    }
  >();

  // Couleur|taille EXPLICITEMENT discontinued dans ce sync (non importées ;
  // la fusion P2c ne doit pas les ressusciter — voir appelant).
  const explicitlyDiscontinued = new Set<string>();

  const catalogIdToHex = new Map<number, string>();
  for (const cv of catalogVariants || []) {
    const cvId = cv.id;
    if (!cvId) continue;
    const cvHex = resolveHexColor(cv.color, cv.color_code, cv.color_code2);
    if (cvHex.startsWith("#")) {
      catalogIdToHex.set(cvId, cvHex);
    }
  }

  const catalogIdToStatus = new Map<number, string>();
  for (const cv of catalogVariants || []) {
    if (!cv.id) continue;
    catalogIdToStatus.set(Number(cv.id), resolveCatalogStockStatus(cv));
  }
  // Prix catalogue par variant (fallback quand le sync n'a pas de retail_price :
  // doc API Printful : le sync porte retail_price, le catalogue porte price).
  // Logique pure externalisée (testée) : _shared/variantPricing.ts.
  const catalogIdToPrice = buildCatalogPriceIndex(catalogVariants);
  /** Prix unitaire : retail sync → prix catalogue → null (taille conservée). */
  const resolveUnitPrice = (v: any): number | null =>
    resolveUnitPriceShared(v, catalogIdToPrice);
  const syncIdToStatus = new Map<number, string>();
  for (const sv of syncVariants || []) {
    const vid = sv.variant_id || sv.product?.variant_id;
    const st = resolveSyncStockStatus(sv);
    if (vid && st) syncIdToStatus.set(Number(vid), st);
  }

  for (const v of syncVariants || []) {
    let hex = resolveHexColor(v.color, v.color_code, v.color_code2);
    if (!hex.startsWith("#")) {
      const catalogVid = v.variant_id || v.product?.variant_id;
      if (catalogVid && catalogIdToHex.has(catalogVid)) {
        hex = catalogIdToHex.get(catalogVid)!;
      }
    }
    const name = (v.color || hex || "").trim();
    if (!byColor.has(hex))
      byColor.set(hex, { name, sizes: new Map(), image: "", mockup_image: "", id: null });
    const entry = byColor.get(hex)!;
    if (!entry.id && v.id) entry.id = v.id;
    const unitPrice = v.size ? resolveUnitPrice(v) : null;
    if (v.size && unitPrice != null) {
      const catalogVid = v.variant_id || v.product?.variant_id;
      let stockStatus = "available";
      if (catalogVid && catalogIdToStatus.has(Number(catalogVid))) {
        stockStatus = catalogIdToStatus.get(Number(catalogVid))!;
      } else if (catalogVid && syncIdToStatus.has(Number(catalogVid))) {
        stockStatus = syncIdToStatus.get(Number(catalogVid))!;
      } else {
        const svStatus = resolveSyncStockStatus(v);
        if (svStatus) stockStatus = svStatus;
      }
      // Règle d'import : une taille EXPLICITEMENT discontinued côté
      // Printful n'est pas importée (ni prix, ni entrée). Les tailles
      // absentes des données (trou API ponctuel) restent gérées par la
      // fusion P2c plus bas. out_of_stock est conservé (temporaire).
      if (stockStatus === "discontinued") {
        explicitlyDiscontinued.add(`${hex.toLowerCase()}|${v.size}`);
        continue;
      }
      const existing = entry.sizes.get(v.size);
      if (!existing) {
        // IDs tracés par taille (additifs, ignorés par l'affichage) : le
        // webhook stock_updated les utilise pour MAJ temps réel (Phase B).
        // v.id = sync variant ID ; catalogVid = catalogue variant ID.
        const syncId = v.id != null ? Number(v.id) : NaN;
        const catId = catalogVid != null ? Number(catalogVid) : NaN;
        entry.sizes.set(v.size, {
          price: unitPrice,
          stock_status: stockStatus,
          ...(Number.isFinite(syncId) ? { sync_variant_id: syncId } : {}),
          ...(Number.isFinite(catId) ? { catalog_variant_id: catId } : {}),
        });
      } else {
        const order: Record<string, number> = { available: 0, out_of_stock: 1, discontinued: 2 };
        if ((order[stockStatus] ?? 0) > (order[existing.stock_status] ?? 0)) {
          entry.sizes.set(v.size, { price: existing.price, stock_status: stockStatus });
        }
      }
    }
    if (!entry.mockup_image && v.product?.image) entry.mockup_image = v.product.image;
  }

  for (const cv of catalogVariants || []) {
    const hex = resolveHexColor(cv.color, cv.color_code, cv.color_code2);
    const entry = byColor.get(hex);
    // Mockup vierge uniquement : ne jamais écraser l'aperçu avec design.
    if (entry && cv.image) entry.mockup_image = cv.image;
  }

  for (const v of syncVariants || []) {
    let hex = resolveHexColor(v.color, v.color_code, v.color_code2);
    if (!hex.startsWith("#")) {
      const catalogVid = v.variant_id || v.product?.variant_id;
      if (catalogVid && catalogIdToHex.has(catalogVid)) {
        hex = catalogIdToHex.get(catalogVid)!;
      }
    }
    const entry = byColor.get(hex);
    // Aperçu avec design prioritaire (fichiers d'impression du merchant).
    if (entry && !entry.image) {
      entry.image = v.files?.[0]?.preview_url || v.files?.[0]?.thumbnail_url || "";
    }
  }

  // Garantie : image toujours renseignée si une source existe.
  for (const entry of byColor.values()) {
    if (!entry.image) entry.image = entry.mockup_image;
  }

  const variants = [...byColor.entries()]
    // Couleur sans aucune taille importable (tout discontinued) : on ne
    // l'importe pas (ni prix, ni entrée). L'UX reste identique côté
    // boutique (taille absente = "discontinued" via getVariantAvailability).
    .filter(([, entry]) => entry.sizes.size > 0)
    .map(([hex, entry]) => ({
      color: hex,
      color_name: entry.name,
      // Affichage uniquement (files[] d'impression restent intacts) : WebP
      // côté serveur quand IMAGEKIT_URL_ENDPOINT est configuré, sinon original.
      image: displayImageUrl(entry.image),
      mockup_image: entry.mockup_image ? displayImageUrl(entry.mockup_image) : undefined,
      external_variant_id: entry.id ? String(entry.id) : undefined,
      sizes: Object.fromEntries(
        [...entry.sizes.entries()].map(([size, data]) => [
          size,
          {
            price: data.price,
            stock_status: data.stock_status,
            // IDs Phase B (webhook stock_updated) — préservés ici.
            ...((data as any).sync_variant_id != null
              ? { sync_variant_id: (data as any).sync_variant_id }
              : {}),
            ...((data as any).catalog_variant_id != null
              ? { catalog_variant_id: (data as any).catalog_variant_id }
              : {}),
          },
        ]),
      ),
    }));

  // Déduplique les couleurs insensibles à la casse (Printful remonte parfois
  // "Natural" et "natural" pour le même produit) : fusionne tailles/images
  // dans la 1re entrée. La clé d'identité (casse d'origine) est préservée
  // pour ne pas casser paniers/commandes en cours. La DB s'auto-nettoie
  // au prochain resync.
  const seenColor = new Map<string, any>();
  const deduped: any[] = [];
  for (const v of variants) {
    const k = (v.color || "").toLowerCase();
    const prev = seenColor.get(k);
    if (!prev) {
      seenColor.set(k, v);
      deduped.push(v);
      continue;
    }
    prev.sizes = { ...(v.sizes || {}), ...(prev.sizes || {}) };
    if (!prev.image && v.image) prev.image = v.image;
    if (!prev.mockup_image && v.mockup_image) prev.mockup_image = v.mockup_image;
    if (!prev.external_variant_id && v.external_variant_id) {
      prev.external_variant_id = v.external_variant_id;
    }
    if ((!prev.color_name || prev.color_name === prev.color) && v.color_name) {
      prev.color_name = v.color_name;
    }
  }

  const colors = deduped.map((v) => v.color);
  const colorNames = deduped.map((v) => v.color_name);
  const colorImages = deduped.map((v) => v.image).filter(Boolean);
  const mockupImages = [
    ...new Set(
      deduped.map((v) => v.mockup_image).filter(Boolean).map(displayImageUrl),
    ),
  ];
  const sizesSet = new Set<string>();
  deduped.forEach((v) => Object.keys(v.sizes).forEach((s) => sizesSet.add(s)));

  return { colors, colorNames, colorImages, mockupImages, sizes: [...sizesSet], variants: deduped, discontinuedKeys: explicitlyDiscontinued };
}

// ─── Maps catalog_variant_id → hex_color for mockup result matching ──────
function buildVariantIdToColorMap(syncVariants: any[], catalogVariants: any[]) {
  const map = new Map<number, string>();

  // First pass: catalog variants (always have reliable color codes)
  for (const cv of catalogVariants || []) {
    if (!cv.id) continue;
    const hex = resolveHexColor(cv.color, cv.color_code, cv.color_code2);
    if (map.has(cv.id)) continue; // already set
    map.set(cv.id, hex.startsWith("#") ? hex : hex);
  }

  // Second pass: sync variants (fill gaps where catalog variant was missing)
  for (const v of syncVariants || []) {
    const catalogVariantId = v.variant_id || v.product?.variant_id;
    if (!catalogVariantId) continue;
    if (map.has(catalogVariantId)) continue; // catalog already set, prefer it
    const hex = resolveHexColor(v.color, v.color_code, v.color_code2);
    if (hex.startsWith("#")) map.set(catalogVariantId, hex);
  }

  return map;
}

// ─── Polls mockup generation task until complete or timeout ─────────────
async function pollMockupTask(
  apiKey: string,
  storeId: string | undefined,
  taskKey: string,
  maxAttempts = 20,
  intervalMs = 3000,
) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    if (storeId) headers["X-PF-Store-Id"] = storeId;

    const res = await fetch(
      `https://api.printful.com/mockup-generator/task?task_key=${taskKey}`,
      { headers },
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Poll mockup task failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const result = data?.result;
    if (!result) continue;

    if (result.status === "completed") return result;
    if (result.status === "failed") {
      throw new Error(
        `Mockup generation failed: ${result.error || "Unknown error"}`,
      );
    }
  }
  throw new Error(
    `Mockup generation timed out after ${(maxAttempts * intervalMs) / 1000}s`,
  );
}

// ─── Mockup Studio : pipeline partagé (Phases 1+2) ─────────────────────
// Même pipeline que l'action legacy "generate-mockups", découpé pour le
// bulk : prepare (données, sans attente) -> create (tâche Printful, rapide)
// -> poll/finalize (lent). La file (mockup_jobs) ne stocke que des tâches
// CRÉÉES côté Printful : aucun poll bloquant de 60s dans les appels file.
// Les écritures DB finales (finalizeMockupTask) sont IDENTIQUES au flux
// legacy : variants[].image, color_images, gallery, product_mockups,
// image principale. Ne pas les modifier sans test de non-régression.

const MOCKUP_CREATE_PACING_MS = 7000; // ≤8 créations/min (limite Printful 10/60s)
const MOCKUP_WORKER_POLL_SLEEP_MS = 1000; // polling léger entre jobs
const MOCKUP_STUCK_MINUTES = 15; // processing plus vieux = repris (crash-safe)
const MOCKUP_MAX_PER_QUEUE_CALL = 5; // borne un appel (temps d'exécution edge)
const MOCKUP_MAX_PER_WORKER_RUN = 25; // polls unitaires rapides, pas de boucle 60s

// Cache syncProductId -> catalogue ID pour mockup-templates (24h).
const templateCatalogCache = new Map<string, { id: number; expiresAt: number }>();

function mockupSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

interface MockupPrepare {
  ok: boolean;
  status?: number;
  error?: string;
  dbProduct?: any;
  catalogProductId?: number;
  uniqueVariantIds?: number[];
  printFileUrl?: string;
  placement?: string;
  printAreaWidth?: number;
  printAreaHeight?: number;
  variantIdToColor?: Map<number, string>;
  /** Entrées printfiles brutes (géométrie par placement, Phase 3). */
  printfiles?: any[];
}

// Étapes 1-7 du flux legacy : produit DB, détail store, catalogue,
// printfiles, 1 variant catalogue par couleur + print file. Sans attente.
async function prepareMockupTask(
  supabaseAdmin: any,
  apiKey: string,
  storeId: string | undefined,
  productId: string,
): Promise<MockupPrepare> {
  const fail = (error: string, status: number): MockupPrepare => ({ ok: false, error, status });

  const { data: dbProduct, error: dbErr } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();
  if (dbErr || !dbProduct) return fail("Produit introuvable.", 404);
  if (!dbProduct.external_product_id) {
    return fail("Ce produit n'est pas importé de Printful.", 400);
  }

  const { res: storeRes } = await fetchWithRetry(
    `https://api.printful.com/store/products/${dbProduct.external_product_id}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
    { attempts: 3, baseMs: 500, idempotent: true },
  );
  if (!storeRes || !storeRes.ok) {
    return fail(
      `Erreur Printful Store: ${storeRes ? await storeRes.text() : "injoignable"}`,
      502,
    );
  }
  const storeData = await storeRes.json();
  const detail = storeData.result;
  const syncVariants: any[] = detail.sync_variants ?? [];
  const mainVariant = syncVariants[0];
  if (!mainVariant) return fail("Aucun variant Printful trouvé.", 404);

  const catalogProductId =
    mainVariant?.product?.product_id || mainVariant?.product_id;
  if (!catalogProductId) {
    return fail("Impossible de déterminer le produit catalogue.", 400);
  }

  let catalogVariants: any[] = [];
  try {
    const { res: catalogRes } = await fetchWithRetry(
      `https://api.printful.com/products/${catalogProductId}`,
      {},
      { attempts: 2, baseMs: 400, idempotent: true },
    );
    if (catalogRes && catalogRes.ok) {
      const catalogData = await catalogRes.json();
      const catalogResult = catalogData?.result?.product || catalogData?.result;
      catalogVariants = catalogResult?.variants || [];
    }
  } catch {
    // fallback — will use sync variants only
  }

  const variantIdToColor = buildVariantIdToColorMap(syncVariants, catalogVariants);

  const seenColors = new Set<string>();
  const uniqueVariantIds: number[] = [];
  let printFileUrl = "";
  for (const v of syncVariants) {
    const catalogVid = v.variant_id || v.product?.variant_id;
    if (!catalogVid) continue;
    const hex = resolveHexColor(v.color, v.color_code, v.color_code2);
    if (!seenColors.has(hex)) {
      seenColors.add(hex);
      uniqueVariantIds.push(catalogVid);
    }
    if (!printFileUrl) {
      printFileUrl = v.files?.[0]?.preview_url || v.files?.[0]?.thumbnail_url || "";
    }
  }

  try {
    printFileUrl = (await safeFetch(printFileUrl, { method: "HEAD" })).url;
  } catch (e) {
    console.warn("P-D printFileUrl SSRF check failed", safeTruncate(String((e as any)?.message || e), 200));
  }
  if (uniqueVariantIds.length === 0) {
    return fail("Aucun variant catalogue trouvé.", 400);
  }
  if (!printFileUrl) {
    return fail("Aucun fichier d'impression (print file) trouvé.", 400);
  }

  let printAreaWidth = 1800;
  let printAreaHeight = 2400;
  let placement = "front";
  let printfiles: any[] = [];
  try {
    const pfHeaders: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
    };
    if (storeId) pfHeaders["X-PF-Store-Id"] = storeId;
    const { res: pfRes } = await fetchWithRetry(
      `https://api.printful.com/mockup-generator/printfiles/${catalogProductId}`,
      { headers: pfHeaders },
      { attempts: 2, baseMs: 400, idempotent: true },
    );
    if (pfRes && pfRes.ok) {
      const pfData = await pfRes.json();
      const result = pfData?.result || {};
      const availablePlacements: Record<string, string> =
        result.available_placements || {};
      const placementKeys = Object.keys(availablePlacements);
      if (placementKeys.length > 0) placement = placementKeys[0];
      printfiles = result.printfiles ?? [];
      if (printfiles.length > 0) {
        const firstPf = printfiles[0];
        if (firstPf.width) printAreaWidth = firstPf.width;
        if (firstPf.height) printAreaHeight = firstPf.height;
        if (firstPf.placement) placement = firstPf.placement;
      }
    }
  } catch {
    // fallback: use "front" with default DTG dimensions (12"×16" @ 150 DPI)
  }

  return {
    ok: true,
    dbProduct,
    catalogProductId,
    uniqueVariantIds,
    printFileUrl,
    placement,
    printAreaWidth,
    printAreaHeight,
    variantIdToColor,
    printfiles,
  };
}

interface MockupCreated {
  ok: boolean;
  status?: number;
  error?: string;
  taskKey?: string;
  raw?: any;
}

// Construit les entrées files[] d'une tâche (Phase 3) : un placement =
// un visuel généré (ex: front + back dans la même tâche).
// requested vide/absent → [fallback] (legacy exact : 1 fichier front).
// Forme validée en amont (queue-mockups) : strings non vides, max 5.
export function buildMockupFiles(
  printFileUrl: string,
  requested: string[] | undefined,
  printfiles: any[],
  fallback: { placement: string; width: number; height: number },
): { placement: string; image_url: string; position: Record<string, number> }[] {
  const wanted =
    requested && requested.length > 0
      ? [...new Set(requested)].slice(0, 5)
      : [fallback.placement];
  return wanted.map((placement) => {
    const entry = (printfiles || []).find((p: any) => p?.placement === placement);
    const width = Number(entry?.width) > 0 ? Number(entry.width) : fallback.width;
    const height = Number(entry?.height) > 0 ? Number(entry.height) : fallback.height;
    return {
      placement,
      image_url: printFileUrl,
      position: {
        area_width: width,
        area_height: height,
        width,
        height,
        top: 0,
        left: 0,
      },
    };
  });
}

export interface MockupTaskOverrides {
  format?: "jpg" | "png";
  width?: number;
  files?: { placement: string; image_url: string; position: Record<string, number> }[];
  productTemplateId?: number;
}

// Étape 8 : crée la tâche Printful (rapide, sans poll).
// overrides (Phase 3, validés par l'appelant) : format/width, files
// multi-placements, ou productTemplateId (remplace files, cf. doc).
// Sans overrides : corps legacy EXACT (jpg, lifelike, 1 fichier).
async function createMockupTask(
  supabaseAdmin: any,
  apiKey: string,
  storeId: string | undefined,
  catalogProductId: number,
  uniqueVariantIds: number[],
  printFileUrl: string,
  placement: string,
  printAreaWidth: number,
  printAreaHeight: number,
  overrides?: MockupTaskOverrides,
): Promise<MockupCreated> {
  const createHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (storeId) createHeaders["X-PF-Store-Id"] = storeId;
  const createBody: Record<string, any> = {
    variant_ids: uniqueVariantIds,
    format: overrides?.format || "jpg",
    ...(overrides?.width ? { width: overrides.width } : {}),
    product_options: { lifelike: true },
    ...(overrides?.productTemplateId
      ? { product_template_id: overrides.productTemplateId }
      : {
          files: overrides?.files || [
            {
              placement,
              image_url: printFileUrl,
              position: {
                area_width: printAreaWidth,
                area_height: printAreaHeight,
                width: printAreaWidth,
                height: printAreaHeight,
                top: 0,
                left: 0,
              },
            },
          ],
        }),
  };

  // Tâche NON idempotente : retry 429 + réseau uniquement (gap 14).
  const { res: createRes, error: netError } = await fetchWithRetry(
    `https://api.printful.com/mockup-generator/create-task/${catalogProductId}`,
    { method: "POST", headers: createHeaders, body: JSON.stringify(createBody) },
    { attempts: 3, baseMs: 600, idempotent: false },
  );
  if (!createRes) {
    await reportError(supabaseAdmin, {
      fn: "sync-printful",
      action: "mockup-create",
      error: netError || "Printful injoignable",
      severity: "high",
    });
    return { ok: false, error: `Échec création tâche mockup: ${netError}`, status: 502 };
  }
  if (!createRes.ok) {
    const errText = await createRes.text();
    return { ok: false, error: `Échec création tâche mockup (${createRes.status}): ${errText}`, status: 502 };
  }
  const createData = await createRes.json();
  const taskKey = createData?.result?.task_key;
  if (!taskKey) {
    return { ok: false, error: "Pas de task_key reçue de Printful.", status: 502, raw: createData };
  }
  return { ok: true, taskKey };
}

interface MockupPolled {
  ok: boolean;
  state: "completed" | "pending" | "failed";
  result?: any;
  error?: string;
}

// Poll UNITAIRE (un seul GET, jamais de boucle) : pour le worker.
// Le legacy garde pollMockupTask (boucle 60s) pour le 1-produit synchrone.
async function pollMockupOnce(
  apiKey: string,
  storeId: string | undefined,
  taskKey: string,
): Promise<MockupPolled> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (storeId) headers["X-PF-Store-Id"] = storeId;
  try {
    const { res, error } = await fetchWithRetry(
      `https://api.printful.com/mockup-generator/task?task_key=${taskKey}`,
      { headers },
      { attempts: 2, baseMs: 500, idempotent: true },
    );
    if (!res) return { ok: false, state: "pending", error: error || "injoignable" };
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, state: "failed", error: `Poll task (${res.status}): ${t.slice(0, 200)}` };
    }
    const data = await res.json();
    const result = data?.result;
    if (!result) return { ok: true, state: "pending" };
    if (result.status === "completed") return { ok: true, state: "completed", result };
    if (result.status === "failed") {
      return { ok: true, state: "failed", error: `Mockup generation failed: ${result.error || "Unknown error"}` };
    }
    return { ok: true, state: "pending", result };
  } catch (e: any) {
    return { ok: false, state: "pending", error: e?.message || "poll error" };
  }
}

interface MockupFinalized {
  ok: boolean;
  status?: number;
  error?: string;
  taskKey?: string;
  mockupCount?: number;
  mockupsGenerated?: number;
  colors?: string[];
  storageUrls?: Record<string, string>;
}

// Étapes 9-13 IDENTIQUES au flux legacy : download, upload Storage,
// product_mockups, variants[].image, color_images, gallery, image.
// CONTRAT DE NON-RÉGRESSION : toute modification ici exige une mise à jour
// des tests + validation visuelle boutique/admin.
export interface MockupFinalizeOpts {
  /** Ajoute aux galeries existantes au lieu de remplacer (défaut: legacy). */
  appendGallery?: boolean;
  /** Ne touche pas à l'image principale (défaut legacy: premier mockup). */
  keepMainImage?: boolean;
}

async function finalizeMockupTask(
  supabaseAdmin: any,
  dbProduct: any,
  productId: string,
  taskResult: any,
  uniqueVariantIds: number[],
  variantIdToColor: Map<number, string>,
  taskKey: string,
  opts?: MockupFinalizeOpts,
): Promise<MockupFinalized> {
  const mockups: any[] = taskResult?.mockups ?? [];
  if (mockups.length === 0) {
    return { ok: false, error: "Aucun mockup généré.", status: 502, taskKey };
  }

  // Par couleur : liste des {url, placement} (Phase 3 : une tâche peut
  // générer front + back...). Legacy (1 placement/tâche) : une seule
  // entrée par couleur → comportement strictement identique.
  const colorMockups = new Map<string, { url: string; placement: string }[]>();
  for (const m of mockups) {
    const variantIds: number[] = m.variant_ids ?? [];
    const mockupUrl: string = m.mockup_url || "";
    if (!mockupUrl) continue;
    const placement = m.placement || "front";
    for (const vid of variantIds) {
      const hex = variantIdToColor.get(vid);
      if (!hex) continue;
      const list = colorMockups.get(hex) || [];
      if (!list.some((e) => e.url === mockupUrl)) {
        list.push({ url: mockupUrl, placement });
      }
      colorMockups.set(hex, list);
    }
  }

  if (colorMockups.size === 0) {
    return {
      ok: false,
      error: "Impossible d'associer les mockups aux couleurs.",
      status: 502,
      taskKey,
      mockupCount: mockups.length,
    };
  }

  try {
    await supabaseAdmin.storage.createBucket("product-mockups", {
      public: true,
    });
  } catch {
    // bucket likely already exists
  }

  const storageUrls: Record<string, string> = {};
  const mockupInserts: any[] = [];
  // Visuels secondaires (2e placement et +) : ajoutés à la galerie après
  // les visuels principaux (legacy : tableau toujours vide).
  const extraGalleryUrls: string[] = [];

  for (const [hex, entries] of colorMockups) {
    for (const { url: mockupUrl, placement } of entries) {
      try {
        const imgRes = await safeFetch(mockupUrl, { headers: { Accept: "image/*" } });
        if (!imgRes.ok) {
          console.error(`Failed to download mockup for ${hex}: ${imgRes.status}`);
          continue;
        }
        const imgBuffer = await imgRes.arrayBuffer();
        const safeHex = hex.replace("#", "");
        // Chemin stable legacy pour front (URLs existantes préservées) ;
        // suffixé par placement sinon (front+back cohabitent, pas d'écrasement).
        const storagePath =
          placement === "front"
            ? `${productId}/${safeHex}.jpg`
            : `${productId}/${safeHex}-${placement}.jpg`;

        const { error: uploadErr } = await supabaseAdmin.storage
          .from("product-mockups")
          .upload(storagePath, imgBuffer, {
            contentType: "image/jpeg",
            upsert: true,
          });
        if (uploadErr) {
          console.error(`Failed to upload mockup for ${hex}: ${uploadErr.message}`);
          continue;
        }

        const { data: publicUrlData } = supabaseAdmin.storage
          .from("product-mockups")
          .getPublicUrl(storagePath);

        const storageUrl = publicUrlData?.publicUrl || "";
        if (storageUrl) {
          // Premier visuel par couleur = image variante (legacy exact).
          if (!storageUrls[hex]) {
            storageUrls[hex] = storageUrl;
          } else {
            extraGalleryUrls.push(storageUrl);
          }
          mockupInserts.push({
            product_id: productId,
            color: hex,
            catalog_variant_ids: uniqueVariantIds.filter(
              (vid) => variantIdToColor.get(vid) === hex,
            ),
            mockup_url: mockupUrl,
            storage_url: storageUrl,
            placement,
          });
        }
      } catch (downloadErr: any) {
        console.error(`Error processing mockup for ${hex}: ${downloadErr.message}`);
      }
    }
  }

  if (Object.keys(storageUrls).length === 0) {
    return {
      ok: false,
      error: "Échec du téléchargement et stockage des mockups.",
      status: 502,
      taskKey,
    };
  }

  const existingVariants: any[] = dbProduct.variants ?? [];
  const newGallery: string[] = [];
  const newColorImages: string[] = [];

  const updatedVariants = existingVariants.map((v: any) => {
    const hex = v.color;
    const storageUrl = storageUrls[hex];
    if (storageUrl) {
      newColorImages.push(storageUrl);
      newGallery.push(storageUrl);
      return { ...v, image: storageUrl };
    }
    if (v.image) newGallery.push(v.image);
    return v;
  });
  // Visuels secondaires (multi-placements) après les principaux.
  for (const u of extraGalleryUrls) {
    if (!newGallery.includes(u)) newGallery.push(u);
  }

  // Legacy : galerie reconstruite (cap 20). Opt-in appendGallery (Phase 4) :
  // conserve la galerie existante et ajoute (dédupliqué, sans plafond bas
  // pour ne pas perdre les visuels manuels).
  const updatedGallery = opts?.appendGallery
    ? [...new Set([...(dbProduct.gallery || []), ...newGallery])]
    : [...new Set(newGallery)].slice(0, 20);
  const firstMockupUrl = Object.values(storageUrls)[0] || "";

  const updatePayload: Record<string, any> = {
    variants: updatedVariants,
    gallery: updatedGallery.length > 0 ? updatedGallery : dbProduct.gallery,
  };
  if (newColorImages.length > 0) {
    updatePayload.color_images = newColorImages;
  }
  // Legacy : image principale = premier mockup. Opt-in keepMainImage.
  if (firstMockupUrl && !opts?.keepMainImage) {
    updatePayload.image = firstMockupUrl;
  }

  try {
    await supabaseAdmin
      .from("products")
      .update(updatePayload)
      .eq("id", productId);
  } catch (updateErr: any) {
    console.error(logSafe(`Failed to update product: ${updateErr.message}`));
  }

  if (mockupInserts.length > 0) {
    try {
      await supabaseAdmin.from("product_mockups").insert(mockupInserts);
    } catch (insertErr: any) {
      console.error(`Failed to insert mockup records: ${insertErr.message}`);
    }
  }

  return {
    ok: true,
    mockupsGenerated: Object.keys(storageUrls).length,
    colors: Object.keys(storageUrls),
    storageUrls,
  };
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (await isRateLimited(req, rateLimitKey(req, "sync-printful"))) {
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
      // Toutes les actions (sync, webhook, mockups, shipping, produits)
      // sont réservées à l'administrateur. Même pattern que
      // create-printful-order : JWT utilisateur + appartenance à admin_users.
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

      const body = await req.json().catch(() => ({}));

      // ─── Mode "list-products" ──────────────────────────────────────
      if (body.action === "list-products") {
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
        const pfRes = await fetch("https://api.printful.com/store/products", {
          headers: { Authorization: `Bearer ${settings.api_key}` },
        });
        if (!pfRes.ok) {
          const errText = await pfRes.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${errText}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }
        const pfData = await pfRes.json();
        const items = (pfData.result || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          thumbnail_url: p.thumbnail_url,
        }));
        return new Response(JSON.stringify(items), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Mode "get-product-sizes" ─────────────────────────────────
      // L'appelant (PrintfulProductForm) donne un id produit STORE (sync,
      // ex: 452127947) alors que /products/{id}/sizes attend un id CATALOGUE
      // (ex: 438). Sans résolution → 404 Printful systématique.
      // Chaîne : direct (id catalogue) → résolution store→catalogue → 404
      // finale = état légitime (mugs, posters… : pas de guide) → 200 vide.
      if (body.action === "get-product-sizes" && body.productId) {
        try {
          const { data: podSettings } = await supabaseAdmin
            .from("pod_settings")
            .select("api_key")
            .single();
          const pfHeaders: Record<string, string> = podSettings?.api_key
            ? { Authorization: `Bearer ${podSettings.api_key}` }
            : {};
          const sizesUrl = (id: string | number) =>
            `https://api.printful.com/products/${id}/sizes`;

          let res = await fetch(sizesUrl(body.productId), {
            headers: pfHeaders,
          });

          if (res.status === 404 && podSettings?.api_key) {
            try {
              const storeRes = await fetch(
                `https://api.printful.com/store/products/${body.productId}`,
                { headers: pfHeaders },
              );
              if (storeRes.ok) {
                const storeData = await storeRes.json();
                const catalogId =
                  storeData?.result?.sync_variants?.[0]?.product?.product_id;
                if (catalogId) {
                  res = await fetch(sizesUrl(catalogId), {
                    headers: pfHeaders,
                  });
                }
              }
            } catch {
              /* ignore → gestion ci-dessous */
            }
          }

          if (res.status === 404) {
            return new Response(
              JSON.stringify({ size_tables: [], _no_size_guide: true }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
              },
            );
          }
          if (!res.ok) {
            return new Response(
              JSON.stringify({
                error: `Printful sizes API error ${res.status}`,
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 502,
              },
            );
          }
          const data = await res.json();
          return new Response(JSON.stringify(data.result ?? {}), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }
      }

      // ─── Mode "get-product" ────────────────────────────────────────
      if (body.action === "get-product" && body.productId) {
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

        const pfRes = await fetch(
          `https://api.printful.com/store/products/${body.productId}`,
          { headers: { Authorization: `Bearer ${settings.api_key}` } },
        );

        if (!pfRes.ok) {
          const errText = await pfRes.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${errText}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        const pfData = await pfRes.json();
        const detail = pfData.result;
        const syncProduct = detail.sync_product;
        const syncVariants = detail.sync_variants ?? [];
        const mainVariant = syncVariants[0];

        let catalogVariants: any[] = [];
        let catalogProductName = "";
        let catalogProductImage = "";
        const catalogProductId =
          mainVariant?.product?.product_id || mainVariant?.product_id;

        if (catalogProductId) {
          try {
            const catalogRes = await fetch(
              `https://api.printful.com/products/${catalogProductId}`,
            );
            if (catalogRes.ok) {
              const catalogData = await catalogRes.json();
              const catalogResult =
                catalogData?.result?.product || catalogData?.result;
              if (catalogResult) {
                catalogProductName = catalogResult.name || "";
                catalogProductImage = catalogResult.image || "";
                catalogVariants = (catalogResult.variants || []).map(
                  (v: any) => ({
                    id: v.id,
                    product_id: v.product_id,
                    name: v.name,
                    color: v.color || "",
                    color_code: v.color_code || "",
                    color_code2: v.color_code2 || "",
                    size: v.size || "",
                    price: v.price,
                    currency: v.currency,
                    image: v.image ? displayImageUrl(v.image) : "",
                    availability_status: v.availability_status,
                  }),
                );
              }
            }
          } catch {
            // fallback to sync variants only
          }
        }

        const { colors, colorNames, colorImages, sizes, variants } =
          buildVariantMatrix(syncVariants, catalogVariants);

        const productData = {
          id: syncProduct?.id || detail.id,
          name: syncProduct?.name || detail.name || catalogProductName || "",
          description: syncProduct?.description || "",
          thumbnail_url: displayImageUrl(
            syncProduct?.thumbnail_url ||
              catalogProductImage ||
              mainVariant?.files?.[0]?.preview_url ||
              "",
          ),
          currency: mainVariant?.currency || "USD",
          // Traçabilité admin : l'import stocke-t-il déjà des URLs ImageKit ?
          imagekit_enabled: imagekitEndpoint().length > 0,
          colors,
          color_names: colorNames,
          color_images: colorImages,
          sizes,
          retail_price: mainVariant?.retail_price || null,
          original_price: mainVariant?.retail_price
            ? Math.round(parseFloat(mainVariant.retail_price) * 1.3 * 100) / 100
            : null,
          variants,
          sync_variants: syncVariants.map((v: any) => ({
            id: v.id,
            external_id: v.external_id || v.sku,
            size: v.size,
            color: v.color,
            color_code: v.color_code,
            retail_price: v.retail_price,
            price: v.price,
            currency: v.currency,
            files: v.files || [],
            preview_url:
              v.files?.[0]?.preview_url || v.files?.[0]?.thumbnail_url || "",
            product_image: v.product?.image || "",
            product: v.product || {},
          })),
          catalog_variants: catalogVariants,
        };

        return new Response(JSON.stringify(productData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Mode "repair-product" ─────────────────────────────────────
      // Répare un produit importé avec variantes sans tailles/prix (bug
      // d'import pré-fix) et/ou images non-WebP : rejoue get-product +
      // get-product-sizes côté serveur puis patch la ligne products.
      // Admin uniquement (même gate que les autres actions, plus haut).
      // Body : { productId: <uuid DB>, fix?: ("sizes"|"images"|"sizeguide")[] }
      if (body.action === "repair-product" && body.productId) {
        try {
          const dbId = String(body.productId);
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dbId)) {
            return new Response(JSON.stringify({ error: "productId invalide (uuid attendu)" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            });
          }
          const wanted: string[] = Array.isArray(body.fix) && body.fix.length > 0
            ? body.fix.filter((f: any) => ["sizes", "images", "sizeguide"].includes(f))
            : ["sizes", "images", "sizeguide"];
          if (wanted.length === 0) {
            return new Response(JSON.stringify({ error: "fix vide (sizes|images|sizeguide)" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            });
          }

          const { data: row, error: rowError } = await supabaseAdmin
            .from("products")
            .select("id, title, external_product_id, variants, image, gallery, color_images")
            .eq("id", dbId)
            .maybeSingle();
          if (rowError || !row) {
            return new Response(JSON.stringify({ error: "Produit introuvable" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 404,
            });
          }
          if (!row.external_product_id) {
            return new Response(
              JSON.stringify({ error: "Produit non lié à Printful (pas d'external_product_id)" }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 422,
              },
            );
          }

          // Self-call avec la clé service_role (contourne le gate admin :
          // on est déjà authentifié admin ici). Même logique exacte que l'import.
          const selfBase = Deno.env.get("SUPABASE_URL")!;
          const selfKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const callSelf = async (payload: unknown) => {
            const r = await fetch(`${selfBase}/functions/v1/sync-printful`, {
              method: "POST",
              headers: { "Content-Type": "application/json", apikey: selfKey },
              body: JSON.stringify(payload),
            });
            if (!r.ok) {
              const t = await r.text().catch(() => "");
              throw new Error(`self-call ${JSON.stringify(payload).slice(0, 60)} → ${r.status} ${t.slice(0, 120)}`);
            }
            return r.json();
          };
          const fresh: any = await callSelf({
            action: "get-product",
            productId: String(row.external_product_id),
          });

          const patch: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
            last_external_sync: new Date().toISOString(),
          };
          const fixed: Record<string, unknown> = {};
          const warnings: string[] = [];

          if (wanted.includes("sizes")) {
            const freshVariants = Array.isArray(fresh.variants) ? fresh.variants : [];
            const freshSizes: string[] = Array.isArray(fresh.sizes) ? fresh.sizes : [];
            const withSizes = freshVariants.filter(
              (v: any) => v.sizes && Object.keys(v.sizes).length > 0,
            );
            if (withSizes.length > 0) {
              patch.variants = freshVariants;
              patch.sizes = freshSizes;
              patch.colors = Array.isArray(fresh.colors) ? fresh.colors : undefined;
              patch.color_names = Array.isArray(fresh.color_names) ? fresh.color_names : undefined;
              if (patch.colors === undefined) delete patch.colors;
              if (patch.color_names === undefined) delete patch.color_names;
              fixed.sizes = {
                variants: freshVariants.length,
                sizes: freshSizes,
              };
            } else {
              warnings.push("Printful ne renvoie aucune taille avec prix pour ce produit (rien écrasé)");
            }
          }

          if (wanted.includes("images")) {
            const imgs: Record<string, unknown> = {};
            if (typeof fresh.thumbnail_url === "string" && fresh.thumbnail_url) {
              imgs.image = fresh.thumbnail_url;
            }
            if (Array.isArray(fresh.color_images) && fresh.color_images.length > 0) {
              const gallery = [
                ...(Array.isArray(fresh.color_images) ? fresh.color_images : []),
                ...((fresh.mockupImages || []) as string[]),
              ].filter(Boolean);
              if (gallery.length > 0) {
                imgs.gallery = [...new Set(gallery)].slice(0, 12);
                imgs.color_images = fresh.color_images;
              }
            }
            if (Object.keys(imgs).length > 0) {
              Object.assign(patch, imgs);
              fixed.images = {
                imagekit: !!fresh.imagekit_enabled,
                fields: Object.keys(imgs),
              };
              if (!fresh.imagekit_enabled) {
                warnings.push("IMAGEKIT_URL_ENDPOINT non configuré : images réparées sans conversion WebP");
              }
            } else {
              warnings.push("Aucune image fraîche renvoyée (rien écrasé)");
            }
          }

          if (wanted.includes("sizeguide")) {
            try {
              const guide: any = await callSelf({
                action: "get-product-sizes",
                productId: String(row.external_product_id),
              });
              if (guide && (Array.isArray(guide.size_tables) ? guide.size_tables.length > 0 : Object.keys(guide).length > 0)) {
                patch.size_guide = guide;
                fixed.sizeguide = true;
              } else {
                warnings.push("Pas de guide des tailles côté Printful (normal hors textile)");
              }
            } catch (e: any) {
              warnings.push(`Guide des tailles illisible : ${String(e?.message || e).slice(0, 120)}`);
            }
          }

          const keys = Object.keys(patch).filter((k) => k !== "updated_at" && k !== "last_external_sync");
          if (keys.length === 0) {
            return new Response(JSON.stringify({ ok: true, fixed: {}, warnings, noop: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const { error: upError } = await supabaseAdmin
            .from("products")
            .update(patch)
            .eq("id", dbId);
          if (upError) {
            console.error("repair-product update:", logSafe(upError));
            return new Response(JSON.stringify({ error: "Écriture impossible" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            });
          }

          // Traçabilité admin (best-effort)
          try {
            await supabaseAdmin.from("notifications").insert({
              title: `Produit réparé — ${row.title || dbId}`,
              description: `Réparation Printful : ${Object.keys(fixed).join(", ") || "rien à réparer"}${warnings.length ? ` (${warnings.length} avertissement(s))` : ""}`.slice(0, 300),
              category: "products",
              priority: "low",
              status: "unread",
              timestamp: new Date().toISOString(),
              metadata: { productId: dbId, fixed, warnings, source: "repair-product" },
            });
          } catch { /* ignore */ }

          return new Response(JSON.stringify({ ok: true, fixed, warnings }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err: any) {
          console.error("repair-product fatal:", logSafe(err));
          return new Response(
            JSON.stringify({ error: String(err?.message || "Réparation impossible").slice(0, 200) }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            },
          );
        }
      }

      // ─── Mode "get-catalog-product" ─────────────────────────────────
      if (body.action === "get-catalog-product") {
        const { productId, variantId } = body;
        if (!productId || !variantId) {
          return new Response(
            JSON.stringify({ error: "productId et variantId requis" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        try {
          const res = await fetch(
            `https://api.printful.com/products/${productId}`,
          );
          if (!res.ok)
            throw new Error(`Printful catalogue error ${res.status}`);
          const data = await res.json();
          const catalogResult = data?.result?.product || data?.result;
          const variants = catalogResult?.variants;
          if (!Array.isArray(variants))
            throw new Error("Variants introuvables");
          const target = variants.find((v: any) => v.id == variantId);
          if (!target) throw new Error("Variant non trouvé");
          const price = target.price;
          return new Response(JSON.stringify({ price }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 502,
          });
        }
      }

      // ─── Mode "setup-webhook" ─────────────────────────────────────────
      if (body.action === "setup-webhook") {
        const { apiKey, storeId, webhookUrl, types } = body;
        if (!apiKey || !webhookUrl || !types) {
          return new Response(
            JSON.stringify({ error: "apiKey, webhookUrl, types requis" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Allowlist : seuls les types Printful connus sont transmis
        // (Printful rejetterait le reste en 400 ; on échoue proprement ici).
        const PRINTFUL_WEBHOOK_TYPES = new Set([
          "package_shipped",
          "package_returned",
          "order_created",
          "order_updated",
          "order_failed",
          "order_canceled",
          "order_put_hold",
          "order_put_hold_approval",
          "order_remove_hold",
          "order_refunded",
          "stock_updated",
          "product_synced",
          "product_updated",
          "product_deleted",
        ]);
        const cleanTypes = [
          ...new Set(
            (Array.isArray(types) ? types : []).filter(
              (t: unknown) =>
                typeof t === "string" && PRINTFUL_WEBHOOK_TYPES.has(t),
            ),
          ),
        ];
        if (cleanTypes.length === 0) {
          return new Response(
            JSON.stringify({ error: "Aucun type d'événement valide" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (storeId) headers["X-PF-Store-Id"] = storeId;

        // stock_updated exige params.stock_updated.product_ids côté
        // Printful ("Missing product ids for stock sync" sinon). On envoie
        // nos sync product IDs (products.external_product_id).
        let params: Record<string, unknown> | undefined;
        if (cleanTypes.includes("stock_updated")) {
          const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          );
          let productIds: number[] = [];
          try {
            const { data: prods } = await supabaseAdmin
              .from("products")
              .select("external_product_id")
              .not("external_product_id", "is", null);
            productIds = [
              ...new Set(
                (prods || [])
                  .map((p: any) => Number(p.external_product_id))
                  .filter((n: number) => Number.isFinite(n) && n > 0),
              ),
            ];
          } catch (e) {
            console.warn("setup-webhook: lecture products impossible", e);
          }
          if (productIds.length === 0) {
            return new Response(
              JSON.stringify({
                error:
                  "Aucun produit synchronisé : synchronisez d'abord le catalogue avant d'activer « Stock mis à jour » (Printful exige la liste des produits à surveiller).",
              }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              },
            );
          }
          params = { stock_updated: { product_ids: productIds } };
        }

        // Secret webhook obligatoire (gap 18) : ajouté à l'URL Printful
        // AUTOMATIQUEMENT depuis l'Edge Secret — l'admin n'a qu'à cliquer
        // "Enregistrer dans Printful". Sans secret configuré, on échoue
        // proprement plutôt que de déployer une URL non authentifiée.
        let webhookSecret = "";
        try {
          webhookSecret = Deno.env.get("PRINTFUL_WEBHOOK_SECRET") || "";
        } catch {}
        if (!webhookSecret) {
          return new Response(
            JSON.stringify({
              error:
                "Secret webhook manquant côté serveur : supabase secrets set PRINTFUL_WEBHOOK_SECRET=<64 hex> puis réessayez.",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }
        let finalUrl = webhookUrl;
        try {
          const u = new URL(webhookUrl);
          u.searchParams.set("secret", webhookSecret);
          finalUrl = u.toString();
        } catch {
          return new Response(
            JSON.stringify({ error: "webhookUrl invalide" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        // Remplace la config : POST idempotent, retry 429/5xx (gap 14).
        const { res } = await fetchWithRetry("https://api.printful.com/webhooks", {
          method: "POST",
          headers,
          body: JSON.stringify({
            url: finalUrl,
            types: cleanTypes,
            ...(params ? { params } : {}),
          }),
        }, { attempts: 3, baseMs: 500, idempotent: true });

        if (!res || !res.ok) {
          const err = res ? await res.text() : "Printful injoignable";
          await reportError(supabaseAdmin, {
            fn: "sync-printful",
            action: "setup-webhook",
            error: err.slice(0, 300),
            severity: "high",
          });
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${err}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Mode "get-webhook-config" ────────────────────────────────────
      if (body.action === "get-webhook-config") {
        const { apiKey, storeId } = body;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "apiKey requis" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (storeId) headers["X-PF-Store-Id"] = storeId;

        const { res } = await fetchWithRetry("https://api.printful.com/webhooks", {
          method: "GET",
          headers,
        }, { attempts: 3, baseMs: 400, idempotent: true });

        if (!res || !res.ok) {
          const err = res ? await res.text() : "Printful injoignable";
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${err}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        const data = await res.json();
        return new Response(
          JSON.stringify({
            url: data.result?.url || "",
            types: data.result?.types || [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Mode "disable-webhook" ───────────────────────────────────────
      if (body.action === "disable-webhook") {
        const { apiKey, storeId } = body;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "apiKey requis" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        };
        if (storeId) headers["X-PF-Store-Id"] = storeId;

        const { res } = await fetchWithRetry("https://api.printful.com/webhooks", {
          method: "DELETE",
          headers,
        }, { attempts: 3, baseMs: 400, idempotent: true });

        if (!res || !res.ok) {
          const err = res ? await res.text() : "Printful injoignable";
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${err}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ─── Mode "get-shipping-estimate" ───────────────────────────────
      if (body.action === "get-shipping-estimate") {
        const { variantId } = body;
        if (!variantId) {
          return new Response(JSON.stringify({ error: "variantId requis" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const { data: podSettings, error: podError } = await supabaseAdmin
          .from("pod_settings")
          .select("*")
          .single();

        if (podError || !podSettings?.api_key) {
          return new Response(
            JSON.stringify({ error: "Clé API Printful non configurée." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        const { data: storeSettings } = await supabaseAdmin
          .from("store_settings")
          .select("country")
          .eq("id", true)
          .single();

        const country = storeSettings?.country || "BR";

        const shippingRes = await fetch(
          "https://api.printful.com/shipping/rates",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${podSettings.api_key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipient: {
                address1: "",
                city: "",
                country_code: country,
                state_code: country === "US" ? "CA" : undefined,
                zip: "",
              },
              items: [{ variant_id: Number(variantId), quantity: 1 }],
            }),
          },
        );

        if (!shippingRes.ok) {
          const errText = await shippingRes.text();
          return new Response(
            JSON.stringify({ error: `Erreur Printful Shipping: ${errText}` }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 502,
            },
          );
        }

        const shippingData = await shippingRes.json();
        const rates = shippingData.result || [];
        if (rates.length === 0) {
          return new Response(JSON.stringify({ error: "Aucun tarif trouvé" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 404,
          });
        }

        const costs = rates.map((r: any) => parseFloat(r.rate));
        const minCost = Math.min(...costs);
        const maxCost = Math.max(...costs);
        const currency = rates[0].currency || "BRL";

        return new Response(
          JSON.stringify({ min: minCost, max: maxCost, currency }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      // ─── Mode "mockup-templates" (Phase 3) ──────────────────────────
      // Découverte des placements disponibles pour un produit Printful
      // (front/back/...) via templates/{catalogId} (cache 24h) : alimente
      // le sélecteur de placements du Mockup Studio. syncProductId =
      // external_product_id (sync product ID).
      if (body.action === "mockup-templates") {
        const syncProductId = body.syncProductId != null ? String(body.syncProductId) : "";
        if (!syncProductId) {
          return new Response(
            JSON.stringify({ error: "syncProductId requis" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
          );
        }
        const { data: prodSettings, error: podErr } = await supabaseAdmin
          .from("pod_settings")
          .select("*")
          .single();
        if (podErr || !prodSettings?.api_key) {
          return new Response(
            JSON.stringify({ error: "Clé API Printful non configurée." }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
          );
        }
        const apiKey = prodSettings.api_key;
        const storeId = prodSettings.store_id;
        const pfHeaders: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
        };
        if (storeId) pfHeaders["X-PF-Store-Id"] = String(storeId);

        // Résout le catalogue ID (cache 24h, même stratégie que les tarifs).
        let catalogProductId: number | null = templateCatalogCache.get(syncProductId) || null;
        if (!catalogProductId) {
          const { res: detailRes } = await fetchWithRetry(
            `https://api.printful.com/store/products/${encodeURIComponent(syncProductId)}`,
            { headers: pfHeaders },
            { attempts: 2, baseMs: 400, idempotent: true },
          );
          if (!detailRes || !detailRes.ok) {
            return new Response(
              JSON.stringify({ error: "Produit Printful introuvable." }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
            );
          }
          const detailData = await detailRes.json();
          const vars = detailData?.result?.sync_variants || [];
          catalogProductId =
            Number(vars[0]?.product?.product_id || vars[0]?.product_id) || null;
          if (!catalogProductId) {
            return new Response(
              JSON.stringify({ error: "Produit catalogue introuvable." }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
            );
          }
          templateCatalogCache.set(syncProductId, {
            id: catalogProductId,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          });
        }

        const technique =
          typeof body.technique === "string" && body.technique.trim()
            ? body.technique.trim().slice(0, 40)
            : undefined;
        const tplUrl =
          `https://api.printful.com/mockup-generator/templates/${catalogProductId}` +
          (technique ? `?technique=${encodeURIComponent(technique)}` : "");
        const { res: tplRes, error: tplErr } = await fetchWithRetry(
          tplUrl,
          { headers: pfHeaders },
          { attempts: 2, baseMs: 400, idempotent: true },
        );
        if (!tplRes) {
          return new Response(
            JSON.stringify({ error: `Printful injoignable: ${tplErr}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
          );
        }
        if (!tplRes.ok) {
          const t = await tplRes.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: `Erreur Printful: ${t.slice(0, 200)}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
          );
        }
        const tplData = await tplRes.json();
        // Normalise : placements distincts + variantes concernées.
        const byPlacement = new Map<string, { placement: string; template_ids: number[]; variant_ids: number[] }>();
        const items = tplData?.result?.items || tplData?.result || [];
        const list = Array.isArray(items) ? items : [];
        for (const entry of list) {
          const vids: number[] = Array.isArray(entry?.variant_ids)
            ? entry.variant_ids
            : entry?.variant_id != null
              ? [entry.variant_id]
              : [];
          const tpls = Array.isArray(entry?.templates) ? entry.templates : [];
          for (const t of tpls) {
            const placement = String(t?.placement || "front");
            const cur = byPlacement.get(placement) || { placement, template_ids: [], variant_ids: [] };
            if (t?.template_id != null && !cur.template_ids.includes(Number(t.template_id))) {
              cur.template_ids.push(Number(t.template_id));
            }
            for (const v of vids) {
              if (!cur.variant_ids.includes(Number(v))) cur.variant_ids.push(Number(v));
            }
            byPlacement.set(placement, cur);
          }
        }
        // Repli : si la forme est inattendue, au moins front.
        if (byPlacement.size === 0) {
          byPlacement.set("front", { placement: "front", template_ids: [], variant_ids: [] });
        }
        return new Response(
          JSON.stringify({
            catalog_product_id: catalogProductId,
            placements: [...byPlacement.values()],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Mode "queue-mockups" (Mockup Studio, Phase 1) ─────────────
      // Met en file 1..N produits : prepare + create TASK Printful par
      // produit (rapide, SANS poll), insert mockup_jobs. Pacé (7s entre
      // créations, limite Printful 10 req/60s). productIds omis →
      // auto-sélection des plus anciens produits sans mockups complets.
      // body.options (Phase 3, tout optionnel, validé ci-dessous) :
      // placements (front/back...), format (jpg/png), width (50-2000),
      // colors (clés variantes), product_template_id, appendGallery,
      // keepMainImage.
      if (body.action === "queue-mockups") {
        const { data: prodSettings, error: podErr } = await supabaseAdmin
          .from("pod_settings")
          .select("*")
          .single();
        if (podErr || !prodSettings?.api_key) {
          return new Response(
            JSON.stringify({ error: "Clé API Printful non configurée." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }
        const apiKey = prodSettings.api_key;
        const storeId = prodSettings.store_id;

        // Validation des options (défense : rien d'arbitraire vers Printful).
        const rawOpts = (body.options || {}) as any;
        const optPlacements: string[] | undefined = Array.isArray(rawOpts.placements)
          ? [...new Set(
              rawOpts.placements
                .filter((x: any) => typeof x === "string" && x.trim().length > 0 && x.trim().length <= 40)
                .map((x: string) => x.trim()),
            )].slice(0, 5)
          : undefined;
        const optFormat: "jpg" | "png" | undefined =
          rawOpts.format === "png" ? "png" : rawOpts.format === "jpg" ? "jpg" : undefined;
        if (rawOpts.format !== undefined && !optFormat) {
          return new Response(
            JSON.stringify({ error: "format invalide (jpg|png)" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
          );
        }
        const optWidth: number | undefined =
          rawOpts.width !== undefined ? Number(rawOpts.width) : undefined;
        if (optWidth !== undefined && (!Number.isInteger(optWidth) || optWidth < 50 || optWidth > 2000)) {
          return new Response(
            JSON.stringify({ error: "width invalide (50-2000)" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
          );
        }
        const optColors: string[] | undefined = Array.isArray(rawOpts.colors)
          ? [...new Set(
              rawOpts.colors
                .filter((x: any) => typeof x === "string" && x.trim().length > 0 && x.trim().length <= 100)
                .map((x: string) => x.trim()),
            )].slice(0, 50)
          : undefined;
        const optTemplateId: number | undefined =
          rawOpts.product_template_id !== undefined ? Number(rawOpts.product_template_id) : undefined;
        if (optTemplateId !== undefined && (!Number.isInteger(optTemplateId) || optTemplateId <= 0)) {
          return new Response(
            JSON.stringify({ error: "product_template_id invalide" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
          );
        }
        const optAppendGallery = rawOpts.appendGallery === true;
        const optKeepMain = rawOpts.keepMainImage === true;
        const hasOverrides =
          optPlacements !== undefined ||
          optFormat !== undefined ||
          optWidth !== undefined ||
          optColors !== undefined ||
          optTemplateId !== undefined ||
          optAppendGallery ||
          optKeepMain;

        const requested: string[] = Array.isArray(body.productIds)
          ? [...new Set(body.productIds.map((x: any) => String(x)))]
          : [];
        let targetIds = requested.slice(0, MOCKUP_MAX_PER_QUEUE_CALL);
        if (targetIds.length === 0) {
          const { data: openJobs } = await supabaseAdmin
            .from("mockup_jobs")
            .select("product_id")
            .in("status", ["queued", "processing"]);
          const openSet = new Set((openJobs || []).map((j: any) => j.product_id));
          const { data: prods } = await supabaseAdmin
            .from("products")
            .select("id, external_product_id, variants")
            .not("external_product_id", "is", null)
            .eq("is_active", true)
            .limit(200);
          targetIds = (prods || [])
            .filter((p: any) => {
              if (openSet.has(p.id)) return false;
              const variants = Array.isArray(p.variants) ? p.variants : [];
              if (variants.length === 0) return true;
              return !variants.every(
                (v: any) => v.image && String(v.image).trim().length > 0,
              );
            })
            .slice(0, MOCKUP_MAX_PER_QUEUE_CALL)
            .map((p: any) => p.id);
          if (targetIds.length === 0) {
            return new Response(
              JSON.stringify({ queued: 0, done: true, message: "Aucun produit sans mockups." }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }
        }

        const queued: any[] = [];
        const failed: any[] = [];
        const skipped: any[] = [];
        for (let i = 0; i < targetIds.length; i++) {
          const pid = targetIds[i];
          try {
            const { data: open } = await supabaseAdmin
              .from("mockup_jobs")
              .select("id,status")
              .eq("product_id", pid)
              .in("status", ["queued", "processing"])
              .maybeSingle();
            if (open) {
              skipped.push({ productId: pid, reason: `déjà en file (${open.status})` });
              continue;
            }
            const prep = await prepareMockupTask(supabaseAdmin, apiKey, storeId, pid);
            if (!prep.ok) {
              failed.push({ productId: pid, error: prep.error });
              await supabaseAdmin.from("mockup_jobs").insert({
                product_id: pid, status: "failed", result: { error: prep.error },
              });
              continue;
            }
            // Ciblage couleurs (Phase 3) : filtre les variant IDs sur les
            // clés demandées ; vide → job en échec explicite (pas d'appel).
            let vids = prep.uniqueVariantIds!;
            if (optColors !== undefined) {
              const wanted = new Set(optColors);
              vids = vids.filter((vid) => wanted.has(prep.variantIdToColor!.get(vid) || ""));
              if (vids.length === 0) {
                failed.push({ productId: pid, error: "aucune variante pour ces couleurs" });
                await supabaseAdmin.from("mockup_jobs").insert({
                  product_id: pid, status: "failed",
                  result: { error: "aucune variante pour ces couleurs" },
                });
                continue;
              }
            }
            const files = hasOverrides && !optTemplateId
              ? buildMockupFiles(prep.printFileUrl!, optPlacements, prep.printfiles || [], {
                  placement: prep.placement!,
                  width: prep.printAreaWidth!,
                  height: prep.printAreaHeight!,
                })
              : undefined;
            const created = await createMockupTask(
              supabaseAdmin, apiKey, storeId,
              prep.catalogProductId!, vids, prep.printFileUrl!,
              prep.placement!, prep.printAreaWidth!, prep.printAreaHeight!,
              hasOverrides
                ? {
                    ...(optFormat ? { format: optFormat } : {}),
                    ...(optWidth ? { width: optWidth } : {}),
                    ...(files ? { files } : {}),
                    ...(optTemplateId ? { productTemplateId: optTemplateId } : {}),
                  }
                : undefined,
            );
            if (!created.ok) {
              failed.push({ productId: pid, error: created.error });
              await supabaseAdmin.from("mockup_jobs").insert({
                product_id: pid, status: "failed", result: { error: created.error },
              });
              continue;
            }
            const { data: job, error: jobErr } = await supabaseAdmin
              .from("mockup_jobs")
              .insert({
                product_id: pid,
                status: "queued",
                task_key: created.taskKey,
                options: {
                  catalog_product_id: prep.catalogProductId,
                  unique_variant_ids: vids,
                  variant_id_to_color: Object.fromEntries(prep.variantIdToColor!),
                  ...(optPlacements ? { placements: optPlacements } : {}),
                  ...(optFormat ? { format: optFormat } : {}),
                  ...(optWidth ? { width: optWidth } : {}),
                  ...(optColors ? { colors: optColors } : {}),
                  ...(optTemplateId ? { product_template_id: optTemplateId } : {}),
                  ...(optAppendGallery ? { appendGallery: true } : {}),
                  ...(optKeepMain ? { keepMainImage: true } : {}),
                },
                attempts: 0,
              })
              .select("id")
              .single();
            if (jobErr || !job) {
              if (String((jobErr as any)?.code) === "23505") {
                skipped.push({ productId: pid, reason: "déjà en file (course)" });
              } else {
                failed.push({ productId: pid, error: "insert job impossible" });
              }
              continue;
            }
            queued.push({ productId: pid, jobId: job.id, taskKey: created.taskKey });
          } catch (e: any) {
            failed.push({ productId: pid, error: e?.message || "erreur" });
          }
          if (i < targetIds.length - 1) await mockupSleep(MOCKUP_CREATE_PACING_MS);
        }
        return new Response(
          JSON.stringify({
            queued: queued.length,
            failed: failed.length,
            skipped: skipped.length,
            details: { queued, failed, skipped },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Mode "mockup-status" ───────────────────────────────────────
      if (body.action === "mockup-status") {
        const counts: Record<string, number> = { queued: 0, processing: 0, done: 0, failed: 0 };
        for (const s of Object.keys(counts)) {
          const { count } = await supabaseAdmin
            .from("mockup_jobs")
            .select("id", { count: "exact", head: true })
            .eq("status", s);
          counts[s] = count || 0;
        }
        const { data: jobs } = await supabaseAdmin
          .from("mockup_jobs")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(50);
        const ids = [...new Set((jobs || []).map((j: any) => j.product_id))];
        const titles: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: prods } = await supabaseAdmin
            .from("products")
            .select("id,title")
            .in("id", ids);
          for (const p of prods || []) titles[p.id] = p.title;
        }
        return new Response(
          JSON.stringify({
            counts,
            jobs: (jobs || []).map((j: any) => ({
              ...j,
              product_title: titles[j.product_id] || null,
            })),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Mode "mockup-worker" (Phase 2) ─────────────────────────────
      // Poll UNITAIRE par job (jamais de boucle 60s) : runs courts,
      // cron-compatibles. Revendique les queued + processing périmés,
      // finalise les completed, échoue les failed, repose les pending.
      if (body.action === "mockup-worker") {
        const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 50);
        const { data: prodSettings, error: podErr } = await supabaseAdmin
          .from("pod_settings")
          .select("*")
          .single();
        if (podErr || !prodSettings?.api_key) {
          return new Response(
            JSON.stringify({ error: "Clé API Printful non configurée." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }
        const apiKey = prodSettings.api_key;
        const storeId = prodSettings.store_id;
        const stuckCutoff = new Date(
          Date.now() - MOCKUP_STUCK_MINUTES * 60000,
        ).toISOString();
        const { data: q1 } = await supabaseAdmin
          .from("mockup_jobs")
          .select("*")
          .eq("status", "queued")
          .order("updated_at", { ascending: true })
          .limit(limit);
        const { data: q2 } = await supabaseAdmin
          .from("mockup_jobs")
          .select("*")
          .eq("status", "processing")
          .lt("updated_at", stuckCutoff)
          .order("updated_at", { ascending: true })
          .limit(limit);
        const jobs = [...(q1 || []), ...(q2 || [])].slice(0, limit);

        let done = 0;
        let failed = 0;
        let pending = 0;
        const details: any[] = [];
        for (const job of jobs) {
          try {
            await supabaseAdmin
              .from("mockup_jobs")
              .update({
                status: "processing",
                attempts: (job.attempts || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", job.id);
            const polled = await pollMockupOnce(apiKey, storeId, job.task_key);
            if (polled.state === "completed") {
              const { data: dbProduct } = await supabaseAdmin
                .from("products")
                .select("*")
                .eq("id", job.product_id)
                .single();
              if (!dbProduct) {
                await supabaseAdmin.from("mockup_jobs").update({
                  status: "failed",
                  result: { error: "Produit introuvable." },
                  updated_at: new Date().toISOString(),
                }).eq("id", job.id);
                failed++;
                details.push({ jobId: job.id, productId: job.product_id, status: "failed", error: "Produit introuvable." });
              } else {
                const opts = job.options || {};
                const uids: number[] = Array.isArray(opts.unique_variant_ids)
                  ? opts.unique_variant_ids
                  : [];
                const vmap = new Map<number, string>(
                  Object.entries(opts.variant_id_to_color || {}).map(([k, v]) => [Number(k), String(v)]),
                );
                const fin = await finalizeMockupTask(
                  supabaseAdmin, dbProduct, job.product_id, polled.result,
                  uids, vmap, job.task_key,
                  {
                    appendGallery: opts.appendGallery === true,
                    keepMainImage: opts.keepMainImage === true,
                  },
                );
                if (fin.ok) {
                  await supabaseAdmin.from("mockup_jobs").update({
                    status: "done",
                    result: {
                      mockupsGenerated: fin.mockupsGenerated,
                      colors: fin.colors,
                      storageUrls: fin.storageUrls || {},
                      placements: opts.placements || ["front"],
                      format: opts.format || "jpg",
                    },
                    updated_at: new Date().toISOString(),
                  }).eq("id", job.id);
                  done++;
                  details.push({ jobId: job.id, productId: job.product_id, status: "done", mockupsGenerated: fin.mockupsGenerated });
                } else {
                  await supabaseAdmin.from("mockup_jobs").update({
                    status: "failed",
                    result: { error: fin.error },
                    updated_at: new Date().toISOString(),
                  }).eq("id", job.id);
                  failed++;
                  details.push({ jobId: job.id, productId: job.product_id, status: "failed", error: fin.error });
                }
              }
            } else if (polled.state === "failed") {
              await supabaseAdmin.from("mockup_jobs").update({
                status: "failed",
                result: { error: polled.error },
                updated_at: new Date().toISOString(),
              }).eq("id", job.id);
              failed++;
              details.push({ jobId: job.id, productId: job.product_id, status: "failed", error: polled.error });
            } else {
              await supabaseAdmin.from("mockup_jobs").update({
                status: "queued",
                updated_at: new Date().toISOString(),
              }).eq("id", job.id);
              pending++;
            }
          } catch (e: any) {
            failed++;
            details.push({ jobId: job.id, productId: job.product_id, status: "failed", error: e?.message || "erreur" });
            try {
              await supabaseAdmin.from("mockup_jobs").update({
                status: "failed",
                result: { error: e?.message || "erreur" },
                updated_at: new Date().toISOString(),
              }).eq("id", job.id);
            } catch {}
          }
          await mockupSleep(MOCKUP_WORKER_POLL_SLEEP_MS);
        }
        if (failed > 0) {
          await reportError(supabaseAdmin, {
            fn: "sync-printful",
            action: "mockup-worker",
            error: `${failed} job(s) mockup en échec sur ce run`,
            meta: { failed, done, pending },
            severity: "high",
          });
        }
        return new Response(
          JSON.stringify({ polled: jobs.length, done, failed, pending, details }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Mode "generate-mockups" ────────────────────────────────────
      if (body.action === "generate-mockups" && body.productId) {
        const { data: prodSettings, error: podErr } = await supabaseAdmin
          .from("pod_settings")
          .select("*")
          .single();
        if (podErr || !prodSettings?.api_key) {
          return new Response(
            JSON.stringify({ error: "Clé API Printful non configurée." }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        const apiKey = prodSettings.api_key;
        const storeId = prodSettings.store_id;
        // Legacy 1-produit synchrone : même pipeline, mêmes réponses.
        const prep = await prepareMockupTask(supabaseAdmin, apiKey, storeId, body.productId);
        if (!prep.ok) {
          return new Response(
            JSON.stringify({ error: prep.error }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: prep.status || 500 },
          );
        }
        const created = await createMockupTask(
          supabaseAdmin, apiKey, storeId,
          prep.catalogProductId!, prep.uniqueVariantIds!, prep.printFileUrl!,
          prep.placement!, prep.printAreaWidth!, prep.printAreaHeight!,
        );
        if (!created.ok) {
          return new Response(
            JSON.stringify({
              error: created.error,
              ...(created.raw !== undefined ? { raw: created.raw } : {}),
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: created.status || 502 },
          );
        }
        let taskResult: any;
        try {
          taskResult = await pollMockupTask(apiKey, storeId, created.taskKey!);
        } catch (pollErr: any) {
          return new Response(
            JSON.stringify({ error: pollErr.message, taskKey: created.taskKey }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 502 },
          );
        }
        const fin = await finalizeMockupTask(
          supabaseAdmin, prep.dbProduct, body.productId, taskResult,
          prep.uniqueVariantIds!, prep.variantIdToColor!, created.taskKey!,
        );
        if (!fin.ok) {
          return new Response(
            JSON.stringify({
              error: fin.error,
              ...(fin.taskKey ? { taskKey: fin.taskKey } : {}),
              ...(fin.mockupCount !== undefined ? { mockupCount: fin.mockupCount } : {}),
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: fin.status || 502 },
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            taskKey: created.taskKey,
            mockupsGenerated: fin.mockupsGenerated,
            colors: fin.colors,
            storageUrls: fin.storageUrls,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // ─── Mode par défaut : synchronisation complète ────────────────
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

      const { res: listRes } = await fetchWithRetry(
        "https://api.printful.com/store/products",
        {
          headers: { Authorization: `Bearer ${settings.api_key}` },
        },
        { attempts: 3, baseMs: 600, idempotent: true },
      );

      if (!listRes || !listRes.ok) {
        const errText = listRes ? await listRes.text() : "Printful injoignable";
        if (listRes && listRes.status === 401) {
          await supabaseAdmin
            .from("pod_settings")
            .update({ is_connected: false, sync_status: "error" })
            .eq("id", settings.id);
        }
        await reportError(supabaseAdmin, {
          fn: "sync-printful",
          action: "sync",
          error: errText.slice(0, 300),
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

      const listData = await listRes.json();
      const printfulProducts = listData.result ?? [];
      let syncedCount = 0;
      const errors: string[] = [];

      for (const pfProduct of printfulProducts) {
        try {
          const { res: detailRes } = await fetchWithRetry(
            `https://api.printful.com/store/products/${pfProduct.id}`,
            { headers: { Authorization: `Bearer ${settings.api_key}` } },
            { attempts: 3, baseMs: 500, idempotent: true },
          );

          if (!detailRes || !detailRes.ok) {
            errors.push(
              `Erreur détails produit ${pfProduct.id}: ${detailRes ? detailRes.status : "injoignable"}`,
            );
            continue;
          }

          const detailData = await detailRes.json();
          const detail = detailData.result;
          const syncProduct = detail.sync_product;
          const syncVariants = detail.sync_variants ?? [];
          const mainVariant = syncVariants[0];

          const imageUrl =
            syncProduct?.thumbnail_url ||
            mainVariant?.files?.[0]?.thumbnail_url ||
            "";

          const catalogProductId =
            mainVariant?.product?.product_id || mainVariant?.product_id;
          let catalogVariants: any[] = [];
          if (catalogProductId) {
            try {
              const { res: catalogRes } = await fetchWithRetry(
                `https://api.printful.com/products/${catalogProductId}`,
                {},
                { attempts: 2, baseMs: 400, idempotent: true },
              );
              if (catalogRes && catalogRes.ok) {
                const catalogData = await catalogRes.json();
                const catalogResult =
                  catalogData?.result?.product || catalogData?.result;
                catalogVariants = catalogResult?.variants || [];
              }
            } catch {
              // fallback
            }
          }

          // Récupérer le size guide Printful pour ce produit catalogue
          let sizeGuideData: any = undefined;
          if (catalogProductId) {
            try {
              const { res: sizesRes } = await fetchWithRetry(
                `https://api.printful.com/products/${catalogProductId}/sizes`,
                {},
                { attempts: 2, baseMs: 400, idempotent: true },
              );
              if (sizesRes && sizesRes.ok) {
                const sizesData = await sizesRes.json();
                sizeGuideData = sizesData.result || undefined;
              }
            } catch {
              // fallback
            }
          }

          let { colors, colorNames, colorImages, mockupImages, sizes, variants, discontinuedKeys } =
            buildVariantMatrix(syncVariants, catalogVariants);
          const skippedDiscontinued: Set<string> =
            discontinuedKeys instanceof Set ? discontinuedKeys : new Set();

          // P2c: Conserver les variantes disparues comme discontinued (garde prix/couleurs)
          try {
            const { data: existingForMerge } = await supabaseAdmin
              .from("products")
              .select("variants")
              .eq("external_product_id", pfProduct.id.toString())
              .maybeSingle();
            const oldVariants: any[] = existingForMerge?.variants || [];
            if (oldVariants.length > 0 && variants.length > 0) {
              const key = (c: string, s: string) => `${c.toLowerCase()}|${s}`;
              // Clés fraîches par couleur ET par nom (migration clés-noms →
              // clés-hex : une ancienne entrée "Natural|S" est couverte par
              // la nouvelle entrée hex de même nom — pas de résurrection).
              const newKeySet = new Set<string>();
              for (const v of variants) {
                for (const sz of Object.keys(v.sizes || {})) {
                  newKeySet.add(key(v.color, sz));
                  if (v.color_name && v.color_name.toLowerCase() !== (v.color || "").toLowerCase()) {
                    newKeySet.add(key(v.color_name, sz));
                  }
                }
              }
              const newByColor = new Map<string, any>();
              for (const v of variants) newByColor.set(v.color.toLowerCase(), v);
              for (const ov of oldVariants) {
                const ovColor: string = ov.color || "";
                if (!ovColor) continue;
                const ovSizes: Record<string, any> = ov.sizes || {};
                for (const [sz, szData] of Object.entries(ovSizes)) {
                  const k = key(ovColor, sz);
                  if (newKeySet.has(k)) continue;
                  // Règle d'import : une taille EXPLICITEMENT discontinued
                  // dans ce sync n'est pas réimportée (même pas pour
                  // l'historique — les commandes figent déjà leurs données).
                  if (skippedDiscontinued.has(k)) continue;
                  const price: number = typeof szData === "object" && szData !== null && "price" in szData ? Number((szData as any).price) || 0 : Number(szData) || 0;
                  if (!price) continue;
                  let target = newByColor.get(ovColor.toLowerCase());
                  if (!target) {
                    target = { color: ovColor, color_name: ov.color_name || ovColor, image: ov.image || "", mockup_image: ov.mockup_image || undefined, external_variant_id: ov.external_variant_id, sizes: {} };
                    variants.push(target);
                    newByColor.set(ovColor.toLowerCase(), target);
                    colors.push(ovColor);
                    colorNames.push(ov.color_name || ovColor);
                    if (ov.image) colorImages.push(ov.image);
                    if (!sizes.includes(sz)) sizes.push(sz);
                  }
                  if (!target.sizes[sz]) {
                    target.sizes[sz] = { price, stock_status: "discontinued" };
                    newKeySet.add(k);
                    if (!sizes.includes(sz)) sizes.push(sz);
                  }
                }
              }
            }
          } catch {}

          const sizeSurcharge: Record<string, number> = {};
          const allPrices = variants.flatMap((v) =>
            Object.entries(v.sizes).map(
              ([size, s]: any) => [size, s.price] as [string, number],
            ),
          );
          if (allPrices.length > 0) {
            const minPrice = Math.min(...allPrices.map(([, p]) => p));
            for (const [size, p] of allPrices) {
              const surcharge = Math.round((p - minPrice) * 100) / 100;
              if (
                surcharge > 0 &&
                (!sizeSurcharge[size] || surcharge < sizeSurcharge[size])
              ) {
                sizeSurcharge[size] = surcharge;
              }
            }
          }

          // Galerie = mockups vierges uniquement (les aperçus avec design
          // vivent sur chaque variante). Replis : colorImages puis fichiers.
          const catalogGallery = [...new Set(mockupImages)].slice(0, 12);
          const colorGallery = [...new Set(colorImages)].slice(0, 12);
          const fileGallery = (
            mainVariant?.files?.map((f: any) => f.thumbnail_url) || []
          ).filter((u: string) => u && u.trim().length > 0);
          const gallery =
            catalogGallery.length > 0
              ? catalogGallery
              : colorGallery.length > 0
                ? colorGallery
                : fileGallery;

          const price = mainVariant?.retail_price
            ? parseFloat(mainVariant.retail_price)
            : null;

          // P2: in_stock dérivé POD (au moins une taille available)
          const hasAvailableVariant = variants.some((v: any) =>
            Object.values(v.sizes || {}).some((s: any) => (s?.stock_status || "available") === "available"),
          );

          const productPayload: Record<string, any> = {
            title: syncProduct?.name || pfProduct.name || "Sans titre",
            image: imageUrl,
            gallery,
            price: price ?? 0,
            original_price: price ? Math.round(price * 1.3 * 100) / 100 : null,
            colors,
            color_names: colorNames.length > 0 ? colorNames : null,
            sizes,
            size_surcharge:
              Object.keys(sizeSurcharge).length > 0 ? sizeSurcharge : null,
            size_guide: sizeGuideData || null,
            variants: variants.length > 0 ? variants : null,
            in_stock: hasAvailableVariant,
            last_external_sync: new Date().toISOString(),
            external_variant_id: mainVariant?.id?.toString() || null,
          };

          // audit léger debug admin
          try {
            const availabilityAudit: Record<string, string> = {};
            for (const v of variants) for (const [sz, sd] of Object.entries(v.sizes || {})) {
              const st = (sd as any)?.stock_status || "available";
              if (st !== "available") availabilityAudit[`${v.color}|${sz}`] = st;
            }
            productPayload.variant_availability = Object.keys(availabilityAudit).length > 0 ? availabilityAudit : null;
          } catch {}

          try {
            productPayload.color_images =
              colorImages.length > 0 ? colorImages : null;
          } catch {
            // column may not exist yet
          }

          const { data: existing } = await supabaseAdmin
            .from("products")
            .select("id")
            .eq("external_product_id", pfProduct.id.toString())
            .maybeSingle();

          if (existing) {
            const updatePayload: any = { ...productPayload };
            const { error: updErr } = await supabaseAdmin.from("products").update(updatePayload).eq("id", existing.id);
            if (updErr) {
              // fallback si colonnes P1 pas encore migrées
              delete updatePayload.color_images;
              delete updatePayload.variant_availability;
              const { error: retryErr } = await supabaseAdmin.from("products").update(updatePayload).eq("id", existing.id);
              if (retryErr) {
                delete updatePayload.in_stock;
                await supabaseAdmin.from("products").update(updatePayload).eq("id", existing.id);
              }
            }
          } else {
            const productId = `prod-printful-${pfProduct.id}`;
            const insertPayload: any = { ...productPayload };
            const { error: insErr } = await supabaseAdmin.from("products").insert({
              id: productId,
              is_active: true,
              brand: "INSTAWEAR",
              description: syncProduct?.name || "",
              category: "tshirt",
              event_type: "culture",
              style: "street",
              tags: [],
              external_product_id: pfProduct.id.toString(),
              ...insertPayload,
            });
            if (insErr) {
              delete insertPayload.color_images;
              delete insertPayload.variant_availability;
              const { error: retryErr } = await supabaseAdmin.from("products").insert({
                id: productId,
                is_active: true,
                brand: "INSTAWEAR",
                description: syncProduct?.name || "",
                category: "tshirt",
                event_type: "culture",
                style: "street",
                tags: [],
                external_product_id: pfProduct.id.toString(),
                ...insertPayload,
              });
              if (retryErr) {
                delete insertPayload.in_stock;
                await supabaseAdmin.from("products").insert({
                  id: productId,
                  is_active: true,
                  brand: "INSTAWEAR",
                  description: syncProduct?.name || "",
                  category: "tshirt",
                  event_type: "culture",
                  style: "street",
                  tags: [],
                  external_product_id: pfProduct.id.toString(),
                  ...insertPayload,
                });
              }
            }
          }

          syncedCount++;
        } catch (e: any) {
          errors.push(`Exception produit ${pfProduct.id}: ${e.message}`);
        }
      }

      const now = new Date().toISOString();
      const syncStatus = errors.length > 0 ? "partial" : "synced";
      await supabaseAdmin
        .from("pod_settings")
        .update({
          last_sync_at: now,
          products_synced_count: syncedCount,
          sync_status: syncStatus,
          is_connected: true,
        })
        .eq("id", settings.id);

      await supabaseAdmin.from("sync_logs").insert({
        id: `log-${Date.now()}`,
        sync_date: now,
        status: syncStatus,
        message: `${syncedCount} produits synchronisés.${errors.length > 0 ? ` ${errors.length} erreur(s).` : ""}`,
        duration: 0,
      });

      return new Response(
        JSON.stringify({
          success: true,
          syncedCount,
          errors: errors.length > 0 ? errors.slice(0, 5) : undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (error) {
      // Gap 13 : échec fatal du handler = CRITICAL. Client reconstruit
      // (supabaseAdmin du try hors scope ici). Best-effort, jamais bloquant.
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await reportError(admin, {
          fn: "sync-printful",
          action: "handler",
          error,
          severity: "critical",
        });
      } catch {}
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
