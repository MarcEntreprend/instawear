// src/lib/heroImages.ts — PUR (importé aussi par le prerender Node) : largeurs d'image du hero et
// construction d'URL Supabase render/image. SOURCE UNIQUE : HeroSlideView et le prerender doivent
// produire la même URL octet pour octet (sinon l'image est téléchargée deux fois).
export interface HeroRenderOpts {
  width?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png";
}

export const HERO_IMG_OPTS = {
  fill: { width: 1280, quality: 75 },
  mobile: { width: 800, quality: 75 },
  tile: { width: 400, quality: 70 },
} as const;

/** `host` = hostname Supabase en minuscules (null = pas de transformation). */
export function buildSupabaseRenderUrl(
  host: string | null,
  sourceUrl: string,
  opts: HeroRenderOpts = {},
): string {
  if (!sourceUrl || typeof sourceUrl !== "string") return sourceUrl;
  if (!host) return sourceUrl;
  const h = host.toLowerCase();
  let u: URL;
  try {
    u = new URL(sourceUrl);
  } catch {
    return sourceUrl;
  }
  if (u.hostname.toLowerCase() !== h) return sourceUrl;
  const m = u.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
  if (!m) return sourceUrl;
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.quality) params.set("quality", String(opts.quality));
  params.set("format", opts.format ?? "webp");
  return `https://${h}/storage/v1/render/image/public/${m[1]}?${params.toString()}`;
}

/** Fond « full » historique (image + voile gauche) : URL brute, pour partager le cache avec le prerender.
 *  SOURCE UNIQUE de la règle : HeroSlideView, scripts/hero-lead.ts et le contrôle de poids du studio. */
export function heroImageIsRaw(l: { scrim: string; dim: number }): boolean {
  return l.scrim === "left" && l.dim < 1;
}
