// supabase/functions/sync-printful/_shared/productImages.ts
// Durabilité des mockups générés : un resync (complet ou repair) ne doit
// JAMAIS écraser un visuel généré (storage "product-mockups", design sur
// vêtement) par une valeur matrice (mockup vierge ou aperçu brut).
// Sans ça, chaque synchronisation annule le travail Mockup Studio et la
// boutique oscille indéfiniment entre mockups et visuels par défaut.
//
// Règles par FORME (aucun produit en dur), toutes pures et totales
// (jamais d'exception, entrées hostiles ignorées) :
// - variants : substitution par clé couleur (hex insensible à la casse,
//   repli color_name, comme la fusion P2c) quand le frais n'est pas storage
//   et l'ancien l'est ;
// - color_images : substitution alignée par index via colors[] (même ordre
//   que variants[], par construction de la matrice) ;
// - gallery : union frais + anciens storage absents, plafonnée (jamais vidée
//   par un frais vide) ;
// - image principale : storage existant conservé sauf si le frais en est un.

export function isStorageMockupUrl(u: unknown): boolean {
  return typeof u === "string" && u.includes("/product-mockups/");
}

function colorKey(c: unknown): string {
  return String(c ?? "").trim().toLowerCase();
}

/** Anciens visuels storage indexés par couleur (hex puis nom). */
export function oldImagesByColor(
  existingVariants: unknown,
): Map<string, string> {
  const m = new Map<string, string>();
  if (!Array.isArray(existingVariants)) return m;
  for (const v of existingVariants) {
    if (v == null || typeof v !== "object") continue;
    const rec = v as Record<string, unknown>;
    const img = rec.image;
    if (!isStorageMockupUrl(img)) continue;
    for (const k of [rec.color, rec.color_name]) {
      const key = colorKey(k);
      if (key && !m.has(key)) m.set(key, img as string);
    }
  }
  return m;
}

/** Substitue les visuels non-storage par l'ancien storage de même couleur. */
export function substituteVariantImages(
  freshVariants: unknown,
  oldByColor: Map<string, string>,
): unknown[] {
  if (!Array.isArray(freshVariants)) return [];
  return freshVariants.map((v) => {
    if (v == null || typeof v !== "object") return v;
    const rec = v as Record<string, unknown>;
    if (isStorageMockupUrl(rec.image)) return v;
    const old =
      oldByColor.get(colorKey(rec.color)) ??
      oldByColor.get(colorKey(rec.color_name));
    if (!old) return v;
    return { ...rec, image: old };
  });
}

/** Substitution alignée (color_images[i] <-> colors[i], ordre matrice). */
export function substituteAlignedImages(
  freshUrls: unknown,
  freshColors: unknown,
  oldByColor: Map<string, string>,
): string[] {
  if (!Array.isArray(freshUrls)) return [];
  const colors: unknown[] = Array.isArray(freshColors) ? freshColors : [];
  return freshUrls
    .map((u, i) => {
      if (isStorageMockupUrl(u)) return u as string;
      const old = oldByColor.get(colorKey(colors[i]));
      if (old) return old;
      return typeof u === "string" ? u : "";
    })
    .filter((u): u is string => typeof u === "string" && u.length > 0);
}

/** Union galerie : frais d'abord, anciens storage manquants ensuite,
 *  plafonnée. Frais vide -> null (l'appelant garde l'existant : on ne
 *  vide JAMAIS une galerie). */
export function mergeGalleries(
  fresh: unknown,
  existing: unknown,
  cap: number,
): string[] | null {
  const f = Array.isArray(fresh)
    ? fresh.filter((u): u is string => typeof u === "string" && u.length > 0)
    : [];
  if (f.length === 0) return null;
  const seen = new Set<string>(f);
  const out = [...f];
  if (Array.isArray(existing)) {
    for (const u of existing) {
      if (typeof u !== "string" || u.length === 0) continue;
      if (!isStorageMockupUrl(u)) continue;
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
    }
  }
  return out.slice(0, Math.max(1, Math.floor(cap) || 20));
}

/** Image principale : storage (frais ou existant) gagne toujours. Retourne
 *  null si rien à changer (l'appelant garde sa valeur). */
export function preferStoredMain(
  fresh: unknown,
  existing: unknown,
): string | null {
  if (isStorageMockupUrl(fresh)) return fresh as string;
  if (
    typeof fresh === "string" &&
    fresh.length > 0 &&
    isStorageMockupUrl(existing)
  ) {
    return existing as string;
  }
  return null;
}

export interface MockupResultItem {
  variant_ids?: unknown;
  mockup_url?: unknown;
}

/**
 * Styles de mockups par défaut (vues demandées à Printful quand l'appelant
 * n'en précise pas) : flat (plat, stable = image variante) + lifestyle
 * (modèle porté). Doc : sans `option_groups`, Printful ne génère que le
 * premier mockup dispo (flat front) — d'où des galeries sans vues portées.
 */
export const DEFAULT_MOCKUP_STYLES: readonly string[] = [
  "Flat",
  "Flat Lifestyle",
];

/**
 * Intersection demandés ∩ dispo (insensible à la casse, casse d'origine
 * Printful conservée pour la requête). Vide = legacy (aucun option_groups
 * envoyé, comportement strictement identique à avant). Capé à 4 (temps de
 * tâche + rate limits Printful).
 */
export function selectMockupStyles(
  desired: unknown,
  available: unknown,
): string[] {
  const wantSrc = Array.isArray(desired) ? desired : [...DEFAULT_MOCKUP_STYLES];
  const want = wantSrc
    .filter(
      (s): s is string =>
        typeof s === "string" && s.trim().length > 0 && s.trim().length <= 40,
    )
    .map((s) => s.trim());
  if (!Array.isArray(available) || available.length === 0) return [];
  const byLower = new Map<string, string>();
  for (const a of available) {
    if (typeof a !== "string" || a.trim().length === 0) continue;
    const k = a.trim().toLowerCase();
    if (!byLower.has(k)) byLower.set(k, a.trim());
  }
  const out: string[] = [];
  for (const w of want) {
    const hit = byLower.get(w.toLowerCase());
    if (hit && !out.includes(hit)) out.push(hit);
    if (out.length >= 4) break;
  }
  return out;
}

/**
 * Placements "front" (seule vue autorisée en section couleur).
 * Normalisé : casse/espaces ignorées.
 */
export function isFrontPlacement(p: unknown): boolean {
  return typeof p === "string" && p.trim().toLowerCase() === "front";
}

/**
 * URL temporaire Printful (pourrissante : `.../tmp/...`, aucune garantie
 * de durée). Ne doit JAMAIS rester en galerie ni en variante — le storage
 * est la seule forme persistante.
 */
export function isPrintfulTmpUrl(u: unknown): boolean {
  if (typeof u !== "string" || u.length === 0) return false;
  let path = "";
  try {
    path = new URL(u).pathname;
  } catch {
    return false;
  }
  return path.includes("/tmp/");
}

/**
 * Compte les applications réellement STOCKÉES (vs repli temporaire Printful).
 * `applied[].url` est l'URL storage BRUTE au stade finalize (avant
 * displayImageUrl) : seules celles reconnues par isStorageMockupUrl
 * éteindront le dot "mockups manquants" côté admin. Un repli thumb
 * (upload storage échoué) s'affiche mais ne compte pas comme stocké —
 * l'alerte UI doit lire ce champ, pas `applied` seul.
 */
export function countStoredApplications(
  applied: Array<{ color: string; url: string }>,
): number {
  if (!Array.isArray(applied)) return 0;
  return applied.filter(
    (a) => a && typeof a.url === "string" && isStorageMockupUrl(a.url),
  ).length;
}

export interface MockupResultItem {
  variant_ids?: unknown;
  mockup_url?: unknown;
  placement?: unknown;
}

export interface StorageApplication {
  /** Copies des variants : `image` = URL storage BRUTE là où apparié. */
  variants: any[];
  /** Couleurs appariées : { color, url, stored }. `stored=false` = repli
   *  brut (pas de storage pour ce hex) : visible mais non compté (dot) et
   *  pourrissant (tmp/) — à régénérer, jamais à considérer comme acquis. */
  applied: Array<{ color: string; url: string; stored: boolean }>;
  /** Ids résultat sans variante DB (forensique, capés). */
  unmatchedVids: string[];
  /** Hexes génération sans variante DB (forensique, capés). */
  unmatchedHexes: string[];
}

/**
 * Applique les mockups générés aux variants EXISTANTS par IDs STABLES
 * (catalog_variant_id par taille, repli external_variant_id = sync id),
 * avec repli exact sur les hexes génération (comportement historique).
 *
 * Pourquoi pas les hexes seuls : ce sont des valeurs DÉRIVÉES
 * (resolveHexColor sur des codes qui dérivent entre imports/époques :
 * "#1a1a1a" stocké vs "313438" généré pour la même couleur) — l'appariement
 * exact rate alors 100% des cas en silence. Les IDs catalogue/sync sont
 * stables. Normalisation String() des deux côtés (1 vs "1" en Map).
 */
export function applyStorageToVariants(
  existingVariants: unknown,
  mockups: unknown,
  hexOfVid: (vid: string) => string | null,
  hexToStorage: Record<string, string>,
): StorageApplication {
  const out: StorageApplication = {
    variants: [],
    applied: [],
    unmatchedVids: [],
    unmatchedHexes: [],
  };
  const list: any[] = Array.isArray(existingVariants) ? existingVariants : [];
  const items: MockupResultItem[] = Array.isArray(mockups)
    ? (mockups as MockupResultItem[])
    : [];

  // Index : id stable (string normalisé) -> index variante existante.
  const byVid = new Map<string, number>();
  list.forEach((v, i) => {
    if (v == null || typeof v !== "object") return;
    const rec = v as Record<string, unknown>;
    const ids: unknown[] = [rec.external_variant_id];
    const sizes = rec.sizes;
    if (sizes != null && typeof sizes === "object") {
      for (const sd of Object.values(sizes as Record<string, unknown>)) {
        if (sd != null && typeof sd === "object") {
          const r = sd as Record<string, unknown>;
          ids.push(r.catalog_variant_id, r.sync_variant_id);
        }
      }
    }
    for (const id of ids) {
      if (id == null || id === "") continue;
      const k = String(id);
      if (!byVid.has(k)) byVid.set(k, i);
    }
  });

  // URL par vid résultat : STORAGE d'abord (hexOfVid + hexToStorage),
  // repli brut tracé (stored:false) si pas de storage pour ce hex.
  // FRONT-ONLY (décision) : seules les vues front alimentent les slots
  // variantes — les autres placements (back…) vont en galerie uniquement,
  // jamais en section couleur. Sans front pour ce vid : slot non pourvu
  // (ancienne image gardée, shortfall visible dans applied/stored).
  const vidToStorage = new Map<
    string,
    { url: string; stored: boolean; front: boolean }
  >();
  for (const m of items) {
    if (m == null || typeof m !== "object") continue;
    const rec = m as Record<string, unknown>;
    const url = rec.mockup_url;
    if (typeof url !== "string" || url.length === 0) continue;
    // Placement absent = front (même défaut que colorMockups : les vieux
    // résultats sans champ nourrissent toujours les slots, pas de régression).
    const front =
      rec.placement == null || isFrontPlacement(rec.placement);
    const vids = rec.variant_ids;
    if (!Array.isArray(vids)) continue;
    for (const rawVid of vids) {
      if (rawVid == null || rawVid === "") continue;
      const k = String(rawVid);
      // Front-only strict : les vues non-front ne nourrissent aucun slot.
      if (!front) continue;
      const cur = vidToStorage.get(k);
      let hex: string | null = null;
      try {
        hex = hexOfVid(k);
      } catch {
        hex = null;
      }
      const storedUrl =
        typeof hex === "string" && hex.length > 0
          ? (hexToStorage as Record<string, string>)[hex]
          : undefined;
      const cand =
        typeof storedUrl === "string" && storedUrl.length > 0
          ? { url: storedUrl, stored: true, front }
          : { url, stored: false, front };
      if (!cur) {
        vidToStorage.set(k, cand);
        continue;
      }
      if (cand.stored && !cur.stored) {
        vidToStorage.set(k, cand);
        continue;
      }
      if (cand.stored === cur.stored && cand.front && !cur.front) {
        vidToStorage.set(k, cand);
      }
    }
  }

  const assigned = new Set<number>();
  const consumedVids = new Set<string>();
  const variants = list.map((v) => {
    if (v == null || typeof v !== "object") return v;
    return { ...(v as Record<string, unknown>) };
  });

  // Passe 1 : IDs stables.
  for (const [vid, entry] of vidToStorage) {
    const idx = byVid.get(vid);
    if (idx == null) {
      if (out.unmatchedVids.length < 20) out.unmatchedVids.push(vid);
      continue;
    }
    consumedVids.add(vid);
    if (assigned.has(idx)) continue;
    assigned.add(idx);
    const rec = variants[idx] as Record<string, unknown>;
    rec.image = entry.url;
    out.applied.push({
      color: String(rec.color ?? ""),
      url: entry.url,
      stored: entry.stored,
    });
  }

  // Passe 2 : repli hex exact (historique) pour les non-appariées.
  const consumedHexes = new Set<string>();
  variants.forEach((v, i) => {
    if (assigned.has(i)) return;
    if (v == null || typeof v !== "object") return;
    const rec = v as Record<string, unknown>;
    if (isStorageMockupUrl(rec.image)) return;
    const url = hexToStorage[String(rec.color ?? "")];
    if (!url) return;
    assigned.add(i);
    consumedHexes.add(String(rec.color ?? ""));
    rec.image = url;
    out.applied.push({ color: String(rec.color ?? ""), url, stored: true });
  });
  for (const h of Object.keys(hexToStorage || {})) {
    if (!consumedHexes.has(h) && out.unmatchedHexes.length < 20) {
      out.unmatchedHexes.push(h);
    }
  }
  out.variants = variants;
  return out;
}
