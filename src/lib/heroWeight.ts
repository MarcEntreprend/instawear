// src/lib/heroWeight.ts — PUR : pesée des images servies d'un slide (contrôle qualité du studio).
import type { HeroConfig } from "./heroSchema.ts";
import { heroImageIsRaw } from "./heroImages.ts";

export const HERO_WEIGHT_WARN_FIRST = 250 * 1024; // slide n°1 : porte le LCP
export const HERO_WEIGHT_WARN_OTHER = 500 * 1024;

export interface WeightResponse {
  ok: boolean;
  headers: { get(name: string): string | null };
  blob?: () => Promise<{ size: number }>;
}
export type WeightFetch = (
  url: string,
  init?: { method?: string },
) => Promise<WeightResponse>;

/** Octets servis : HEAD (Content-Length), sinon GET + taille du blob. null = impossible à mesurer. */
export async function weighImage(
  url: string,
  f: WeightFetch,
): Promise<number | null> {
  try {
    const head = await f(url, { method: "HEAD" });
    const len = head.ok ? Number(head.headers.get("content-length")) : NaN;
    if (Number.isFinite(len) && len > 0) return len;
  } catch {
    /* repli GET */
  }
  try {
    const res = await f(url, { method: "GET" });
    if (!res.ok || !res.blob) return null;
    return (await res.blob()).size;
  } catch {
    return null;
  }
}

export function weightLevel(bytes: number, isFirst: boolean): "ok" | "warn" {
  return bytes > (isFirst ? HERO_WEIGHT_WARN_FIRST : HERO_WEIGHT_WARN_OTHER)
    ? "warn"
    : "ok";
}

export const fmtKo = (bytes: number): string =>
  `${Math.round(bytes / 1024)} Ko`;

/** Sources d'image « plein format » d'un slide (couches image, carte, visuel principal des tuiles).
 *  raw = URL brute (fond « full » historique), sinon variante dimensionnée. Dédoublonné, œil fermé ignoré. */
export function heroImageSources(
  c: HeroConfig,
  productImage: string | null,
): { src: string; raw: boolean }[] {
  const out: { src: string; raw: boolean }[] = [];
  const add = (src: string | null | undefined, raw: boolean) => {
    const s = (src || productImage || "").trim();
    if (!s || out.some((o) => o.src === s && o.raw === raw)) return;
    out.push({ src: s, raw });
  };
  for (const l of c.layers) {
    if (l.off) continue;
    if (l.type === "image") add(l.src, heroImageIsRaw(l));
    else if (l.type === "card") add(l.src, false);
    else if (l.type === "tiles" && l.main) add(l.main.src, false);
  }
  return out;
}
