// src/lib/imagekit.ts
// Helper central ImageKit (fetch + transformations WebP).
// - URLs originales conservées en DB ; transformation au rendu / à l'import.
// - Whitelist par HOSTNAME exact (pas de startsWith : évite
//   https://printful.com.evil.com). Hôtes réels constatés en DB :
//   files.cdn.printful.com (mockups) + hôte Supabase Storage (uploads).
// - Idempotent : une URL déjà ImageKit est renvoyée telle quelle
//   (jamais de fetch-dans-fetch).
// - Gracieux : si l'endpoint n'est pas configuré ou si l'URL est rejetée,
//   l'originale est renvoyée (pas d'image cassée).
import { imageKitConfig, envVar, isDevEnv } from "../config/imagekit";

// Hôtes Printful autorisés (mockups, CDN catalogue)
const PRINTFUL_HOSTS = new Set([
  "files.cdn.printful.com",
  "images.printful.com",
  "printful.com",
  "www.printful.com",
]);

/** Hôte Supabase Storage du projet (uploads/miroirs) — jamais null en pratique. */
function supabaseHost(): string | null {
  try {
    const base = envVar("VITE_SUPABASE_URL");
    if (!base) return null;
    return new URL(base).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Hôte de l'endpoint ImageKit configuré (pour l'idempotence). */
function endpointHost(): string | null {
  try {
    if (!imageKitConfig.urlEndpoint) return null;
    return new URL(imageKitConfig.urlEndpoint).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const DANGEROUS_SCHEMES = ["file:", "ftp:", "javascript:", "data:", "blob:"];
const PRIVATE_IP_REGEX =
  /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|localhost|\[?::1\]?)/i;

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: "webp" | "jpeg" | "png" | "auto"; // auto = négociation navigateur
  blur?: number;
  // NOTE : pas de "fit" — ImageKit conserve le ratio par défaut dans la boîte
  // w/h, ce qui convient aux visuels produits (pas de crop surprise).
}

/** Vrai si l'URL source peut passer par ImageKit (http(s) + hôte autorisé). */
export const validateSourceUrl = (url: string): boolean => {
  if (!url || typeof url !== "string") return false;
  const lower = url.toLowerCase();
  if (DANGEROUS_SCHEMES.some((s) => lower.startsWith(s))) return false;
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    host = parsed.hostname.toLowerCase();
  } catch {
    return false; // URL relative ou invalide → pas de fetch distant
  }
  if (!host || PRIVATE_IP_REGEX.test(host)) return false; // anti-SSRF
  if (PRINTFUL_HOSTS.has(host)) return true;
  const sb = supabaseHost();
  if (sb && host === sb) return true;
  return false;
};

/** Vrai si l'URL est déjà une URL ImageKit (notre endpoint) → passthrough. */
export const isImageKitUrl = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    const ep = endpointHost();
    return !!ep && (host === ep || host.endsWith(".imagekit.io"));
  } catch {
    return false;
  }
};

/**
 * URL ImageKit (mode fetch) : <endpoint>/tr:<transforms>/<source-encodée>.
 * Retourne l'originale si : endpoint non configuré, URL déjà ImageKit,
 * ou source rejetée par la whitelist.
 *
 * POLITIQUE PROD (incidents 401 constatés, ne pas assouplir sans signer
 * côté serveur) : le frontend ne détient pas la clé privée (par design) et
 * le compte a la restriction "unsigned" active. Donc TOUTE URL construite
 * ici répond 401 — nouveau tr: sur source brute comme réenrobage d'URL non
 * signée (ex. tr:w-480 sans ik-s -> 401). Seules les URLs octets-identiques
 * servies par le backend (signées serveur) chargent. En conséquence cette
 * fonction est un passthrough pour toute URL distante : les appels avec
 * options restent en place (les sondes `!== src` désactivent les srcSet
 * factices d'elles-mêmes) et se réactiveront si le backend fournit un jour
 * des variantes dimensionnées signées. Seul le serveur signe
 * (cf. sync-printful/_shared/imagekit.ts + productImages.ts).
 */
export const imageKitUrl = (
  sourceUrl: string,
  options: ImageTransformOptions = {},
): string => {
  if (!sourceUrl || typeof sourceUrl !== "string") return sourceUrl;
  if (!imageKitConfig.enabled) return imagekitOriginal(sourceUrl); // kill-switch : restaure les originales
  if (!validateSourceUrl(sourceUrl) && !isImageKitUrl(sourceUrl)) {
    if (isDevEnv()) {
      console.warn(`[imageKit] source rejetée, original conservé: ${sourceUrl}`);
    }
    return sourceUrl;
  }
  void options; // réservé : compatibilité d'API (sondes, réactivation future)
  return sourceUrl;
};

/**
 * Retrouve l'URL originale embarquée dans une URL ImageKit (fetch).
 * Gère l'ancien format encodé (%3A%2F%2F) et le format brut. Sinon : inchangé.
 * Utilisé pour les fallbacks (endpoint en panne) et la normalisation.
 */
export function imagekitOriginal(url: string): string {
  if (!url || typeof url !== "string") return url;
  if (!isImageKitUrl(url)) return url;
  const m = url.match(/\/((?:https?)(?::\/\/|%3A%2F%2F).*)$/i);
  if (!m) return url;
  const tail = m[1];
  try {
    const decoded = decodeURIComponent(tail);
    if (/^https?:\/\//i.test(decoded)) return decoded;
  } catch {
    /* ignore */
  }
  if (/^https?:\/\//i.test(tail)) return tail;
  return url;
}

/** Reconstruit une URL ImageKit au format courant (répare l'ancien encodé). */
export function normalizeImagekitUrl(
  url: string,
  options: ImageTransformOptions = {},
): string {
  // Voir POLITIQUE PROD sur imageKitUrl : aucun réenrobage côté client,
  // signé ou non (les deux répondent 401 dès que l'URL diffère d'un octet).
  // Passthrough total ; conservé pour compatibilité d'API.
  void options;
  return url;
}

/** srcSet WebP responsive (largeurs en px, descripteurs `w`). */
export const imageKitSrcSet = (
  sourceUrl: string,
  options: Omit<ImageTransformOptions, "width"> = {},
  widths = [480, 768, 1024, 1600],
): string => {
  return widths
    .map((w) => `${imageKitUrl(sourceUrl, { ...options, width: w })} ${w}w`)
    .join(", ");
};

/** Raccourci Printful : WebP q80 par défaut. */
export const printfulImageUrl = (
  imageUrl: string,
  options: ImageTransformOptions = { quality: 80, format: "webp" },
): string => {
  return imageKitUrl(imageUrl, options);
};

export default imageKitUrl;
