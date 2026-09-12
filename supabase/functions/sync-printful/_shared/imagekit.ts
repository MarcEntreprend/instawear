// supabase/functions/sync-printful/_shared/imagekit.ts
// Conversion d'affichage WebP via ImageKit (mode fetch, pure URL rewriting).
// - AUCUN téléchargement côté serveur (pas de SSRF possible par construction).
// - Seules les images d'AFFICHAGE sont converties (jamais files[] : Printful
//   exige les originaux pour l'impression).
// - Whitelist par hostname exact + passthrough si déjà ImageKit + gracieux
//   (endpoint absent → originale). Miroir de src/lib/imagekit.ts.

const PRINTFUL_HOSTS = new Set([
  "files.cdn.printful.com",
  "images.printful.com",
  "printful.com",
  "www.printful.com",
]);

function readEnv(name: string): string {
  try {
    const d = (globalThis as any).Deno;
    if (d && d.env && typeof d.env.get === "function") {
      const v = d.env.get(name);
      if (typeof v === "string" && v) return v;
    }
  } catch { /* ignore */ }
  try {
    const p = (globalThis as any).process;
    if (p && p.env && typeof p.env[name] === "string") return p.env[name];
  } catch { /* ignore */ }
  return "";
}

/** Endpoint ImageKit normalisé ("" = non configuré → passthrough). */
export function imagekitEndpoint(): string {
  return readEnv("IMAGEKIT_URL_ENDPOINT").trim().replace(/\/+$/, "");
}

/**
 * Coupe-circuit : IMAGEKIT_ENABLED=false (ou 0/off) désactive toute conversion.
 * Défaut : activé dès qu'un endpoint est configuré.
 */
export function imagekitEnabledFlag(): boolean {
  const v = readEnv("IMAGEKIT_ENABLED").trim().toLowerCase();
  return v !== "false" && v !== "0" && v !== "off";
}

/** Faux si endpoint absent OU coupe-circuit → passthrough. */
export function imagekitEnabled(): boolean {
  return imagekitEnabledFlag() && imagekitEndpoint().length > 0;
}

function supabaseHost(): string | null {
  try {
    const base = readEnv("SUPABASE_URL");
    if (!base) return null;
    return new URL(base).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function endpointHost(): string | null {
  try {
    const ep = imagekitEndpoint();
    if (!ep) return null;
    return new URL(ep).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const DANGEROUS = ["file:", "ftp:", "javascript:", "data:", "blob:"];
const PRIVATE_IP =
  /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|localhost|\[?::1\]?)/i;

export function validateImageSource(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase();
  if (DANGEROUS.some((s) => lower.startsWith(s))) return false;
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    host = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }
  if (!host || PRIVATE_IP.test(host)) return false;
  if (PRINTFUL_HOSTS.has(host)) return true;
  const sb = supabaseHost();
  if (sb && host === sb) return true;
  return false;
}

export function isImagekitUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const ep = endpointHost();
    return !!ep && (host === ep || host.endsWith(".imagekit.io"));
  } catch {
    return false;
  }
}

export interface IkOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png" | "auto";
}

/** URL fetch ImageKit ou originale (jamais d'image cassée). */
export function imagekitUrl(sourceUrl: string, options: IkOptions = {}): string {
  if (!sourceUrl || typeof sourceUrl !== "string") return sourceUrl;
  const endpoint = imagekitEndpoint();
  // Coupe-circuit : on restaure les originales (répare les URLs IK stockées).
  if (!endpoint || !imagekitEnabledFlag()) return imagekitOriginal(sourceUrl);
  if (isImagekitUrl(sourceUrl)) return normalizeImagekitUrl(sourceUrl, options);
  if (!validateImageSource(sourceUrl)) return sourceUrl;
  const parts: string[] = [];
  if (options.width && options.width > 0) parts.push(`w-${Math.round(options.width)}`);
  if (options.height && options.height > 0) parts.push(`h-${Math.round(options.height)}`);
  if (options.quality) {
    const q = Math.min(100, Math.max(1, Math.round(options.quality)));
    parts.push(`q-${q}`);
  }
  if (options.format && options.format !== "auto") parts.push(`f-${options.format}`);
  const tr = parts.length > 0 ? `tr:${parts.join(",")}/` : "";
  // Format fetch doc officielle : source NON encodée (l'encodage systématique
  // donne des 404), sauf ?/# qui tronqueraient le parsing → encodées.
  const needsEncoding = /[?#]/.test(sourceUrl);
  const src = needsEncoding ? encodeURIComponent(sourceUrl) : sourceUrl;
  return `${endpoint}/${tr}${src}`;
}

/** Originale embarquée dans une URL ImageKit (ancien format encodé + brut). */
export function imagekitOriginal(url: string): string {
  if (!url || typeof url !== "string") return url;
  if (!isImagekitUrl(url)) return url;
  const m = url.match(/\/((?:https?)(?::\/\/|%3A%2F%2F).*)$/i);
  if (!m) return url;
  const tail = m[1];
  try {
    const decoded = decodeURIComponent(tail);
    if (/^https?:\/\//i.test(decoded)) return decoded;
  } catch { /* ignore */ }
  if (/^https?:\/\//i.test(tail)) return tail;
  return url;
}

/** Reconstruit une URL ImageKit au format courant (répare l'ancien encodé). */
export function normalizeImagekitUrl(url: string, options: IkOptions = {}): string {
  const original = imagekitOriginal(url);
  if (original === url) return url; // pas une URL IK reconnue
  const endpoint = imagekitEndpoint();
  if (!endpoint || !imagekitEnabledFlag()) return original;
  if (!validateImageSource(original)) return original;
  return imagekitUrl(original, options);
}

/** Convertit une URL d'AFFICHAGE (WebP q80). Les originaux Printful restent intacts. */
export function displayImageUrl(url: string): string {
  if (!url) return url;
  return imagekitUrl(url, { quality: 80, format: "webp" });
}

/** Mappe un tableau d'URLs d'affichage (filtre les vides). */
export function displayImageList(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u) => typeof u === "string" && (u as string).trim().length > 0)
    .map((u) => displayImageUrl(u as string));
}

// ─── Signatures (restriction "unsigned URLs" active côté ImageKit) ─────
// Schéma doc officielle : HMAC-SHA1(private_key, chemin_sans_endpoint + expiry?),
// en minuscules, ajouté en ?ik-s= (+ ?ik-t= si expiry). SANS expiry les URLs
// signées ne périment pas (adapté au stockage DB). Clé UNIQUEMENT serveur.

function readPrivateKey(): string {
  try {
    const d = (globalThis as any).Deno;
    if (d && d.env && typeof d.env.get === "function") {
      const v = d.env.get("IMAGEKIT_PRIVATE_KEY");
      if (typeof v === "string" && v) return v;
    }
  } catch { /* ignore */ }
  try {
    const p = (globalThis as any).process;
    if (p && p.env && typeof p.env.IMAGEKIT_PRIVATE_KEY === "string") {
      return p.env.IMAGEKIT_PRIVATE_KEY;
    }
  } catch { /* ignore */ }
  return "";
}

export function hasImagekitPrivateKey(): boolean {
  return readPrivateKey().length > 0;
}

async function hmacSha1Hex(key: string, msg: string): Promise<string> {
  const cryptoObj = (globalThis as any).crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("WebCrypto indisponible");
  }
  const enc = new TextEncoder();
  const cryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await cryptoObj.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Signe une URL ImageKit (ik-s + ik-t TOUJOURS : vérifié live, la restriction
 * "unsigned" exige ik-t même si la doc le dit optionnel). Sans clé → inchangée.
 * Expiry défaut 10 ans (URLs stockées permanentes ; anti-abus préservé : la
 * signature prouve que l'URL vient de nous).
 */
const DEFAULT_EXPIRY_SEC = 10 * 365 * 86400;
export async function signImagekitUrl(url: string, expiresInSec = DEFAULT_EXPIRY_SEC): Promise<string> {
  if (/[?&]ik-s=/.test(url)) return url; // déjà signée : ne jamais re-signer
  const key = readPrivateKey();
  const endpoint = imagekitEndpoint();
  if (!key || !endpoint || !isImagekitUrl(url)) return url;
  let base = endpoint.endsWith("/") ? endpoint : endpoint + "/";
  const path = url.startsWith(base) ? url.slice(base.length) : url;
  const exp = Math.floor(Date.now() / 1000) + Math.floor(expiresInSec > 0 ? expiresInSec : DEFAULT_EXPIRY_SEC);
  const str = path + String(exp);
  const sig = await hmacSha1Hex(key, str);
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}ik-t=${exp}&ik-s=${sig}`;
}

/** Signe récursivement toutes les URLs ImageKit d'un objet (payloads DB). */
export async function signImagekitDeep<T>(value: T): Promise<T> {
  if (typeof value === "string") {
    if (isImagekitUrl(value)) return (await signImagekitUrl(value)) as unknown as T;
    return value;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const v of value) out.push(await signImagekitDeep(v));
    return out as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = await signImagekitDeep(v);
    return out as unknown as T;
  }
  return value;
}
