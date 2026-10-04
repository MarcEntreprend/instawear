// src/lib/supabaseImage.ts — variantes dimensionnées via les transformations
// Supabase Storage (render/image) : buckets publics, SANS signature.
// Sondé en prod : PNG hero 1.56 Mo -> webp 34 Ko (?width=320&quality=70).
// Passthrough gracieux hors Supabase / URLs relatives / déjà-render :
// jamais d'image cassée (même philosophie qu'imageKitUrl).
import { envVar } from "../config/imagekit";

export interface SupabaseImageOptions {
  width?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png";
}

function storageHost(): string | null {
  try {
    const base = envVar("VITE_SUPABASE_URL");
    if (!base) return null;
    return new URL(base).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** URL render/image dimensionnée, ou l'originale si non applicable. */
export function supabaseImageUrl(
  sourceUrl: string,
  opts: SupabaseImageOptions = {},
): string {
  if (!sourceUrl || typeof sourceUrl !== "string") return sourceUrl;
  const host = storageHost();
  if (!host) return sourceUrl;
  let u: URL;
  try {
    u = new URL(sourceUrl);
  } catch {
    return sourceUrl;
  }
  if (u.hostname.toLowerCase() !== host) return sourceUrl;
  const m = u.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
  if (!m) return sourceUrl;
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.quality) params.set("quality", String(opts.quality));
  params.set("format", opts.format ?? "webp");
  return `https://${host}/storage/v1/render/image/public/${m[1]}?${params.toString()}`;
}
