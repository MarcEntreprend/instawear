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
  if (!endpoint) return sourceUrl;
  if (isImagekitUrl(sourceUrl)) return sourceUrl;
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
  return `${endpoint}/${tr}${encodeURIComponent(sourceUrl)}`;
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
