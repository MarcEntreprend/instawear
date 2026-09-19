// supabase/functions/sync-printful/_shared/gallery.ts
// Curation galerie : quelles images restent, dans quel ordre, et pourquoi.
// Règles par FORME (aucun produit en dur), pures et totales :
// - AUCUN aperçu brut (artwork seul) : jamais un visuel galerie ;
// - AUCUN doublon des fronts déjà en section Color (variants[].image) ;
// - AUCUN blank de couleur non importée (avatars fantômes) ;
// - kept=false (retiré par l'admin) n'est JAMAIS ré-ajouté auto ;
// - blanks : gardés seulement si aucune image générée pour leur couleur
//   (plancher pré-génération), sinon écartés au profit du généré ;
// - galerie plafonnée (défaut 12) ; jamais vidée par un lot vide.

export type GallerySource = "generated" | "blank" | "custom" | "raw";

export interface GalleryCandidate {
  url: string;
  color?: string | null;
  placement?: string | null;
  source: GallerySource;
}

export interface GalleryMetaItem {
  url: string;
  color: string | null;
  placement: string | null;
  source: Exclude<GallerySource, "raw">;
  kept: boolean;
}

interface BuildOpts {
  /** Méta précédente (mémoire des choix admin). */
  existingMeta?: unknown;
  /** Galerie existante (droits acquis : customs conservés). */
  existingGallery?: unknown;
  /** Fronts déjà en section Color (jamais dupliqués). */
  variantFronts?: unknown;
  /** Couleurs importées (hex, insensible casse) : blanks hors-set exclus. */
  importedColors?: unknown;
  /**
   * Identité stable d'une URL pour dédupliquer/matcher au-delà des formes
   * (ex. RAW storage vs version signée ImageKit du même fichier).
   * Défaut : la chaîne telle quelle.
   */
  identity?: (url: string) => string;
}

function asUrlList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const u of v) {
    if (typeof u === "string" && u.trim().length > 0) out.push(u.trim());
  }
  return out;
}

function normColor(c: unknown): string {
  return String(c ?? "").trim().toLowerCase();
}function sanitizeCandidate(c: unknown): GalleryCandidate | null {
  if (c == null || typeof c !== "object") return null;
  const r = c as Record<string, unknown>;
  if (typeof r.url !== "string" || r.url.trim().length === 0) return null;
  const source: GallerySource =
    r.source === "generated" ||
    r.source === "blank" ||
    r.source === "custom" ||
    r.source === "raw"
      ? r.source
      : "custom";
  return {
    url: r.url.trim(),
    color: typeof r.color === "string" ? r.color : null,
    placement: typeof r.placement === "string" ? r.placement : null,
    source,
  };
}

/** Construit la méta complète (curation). */
export function buildGalleryMeta(
  candidates: unknown,
  opts: BuildOpts = {},
): GalleryMetaItem[] {
  const idOf = (u: string): string => {
    try {
      return opts.identity ? opts.identity(u) : u;
    } catch {
      return u;
    }
  };
  const prev = new Map<string, GalleryMetaItem>();
  if (Array.isArray(opts.existingMeta)) {
    for (const m of opts.existingMeta) {
      if (m == null || typeof m !== "object") continue;
      const r = m as Record<string, unknown>;
      if (typeof r.url !== "string" || !r.url) continue;
      prev.set(idOf(r.url), {
        url: r.url,
        color: typeof r.color === "string" ? r.color : null,
        placement: typeof r.placement === "string" ? r.placement : null,
        source:
          r.source === "generated" ||
          r.source === "blank" ||
          r.source === "custom"
            ? r.source
            : "custom",
        kept: r.kept !== false,
      });
    }
  }
  const fronts = new Set(asUrlList(opts.variantFronts).map(idOf));
  const imported = new Set(
    asUrlList(opts.importedColors).map((c) => normColor(c)),
  );
  const hasImportedSet = imported.size > 0;

  const seen = new Set<string>();
  const items: GalleryMetaItem[] = [];
  const push = (it: GalleryMetaItem) => {
    const k = idOf(it.url);
    if (seen.has(k)) return;
    seen.add(k);
    items.push(it);
  };

  const list: GalleryCandidate[] = Array.isArray(candidates)
    ? (candidates.map(sanitizeCandidate).filter(Boolean) as GalleryCandidate[])
    : [];
  // Couleurs ayant au moins un généré dans CE lot (règle blanks).
  const generatedColors = new Set<string>();
  for (const c of list) {
    if (c.source === "generated" && c.color) generatedColors.add(normColor(c.color));
  }

  for (const c of list) {
    // `src` en string simple : après le `continue` raw ci-dessous, seules
    // les trois sources méta subsistent (le cast est sûr).
    const src: string = c.source;
    if (src === "raw") continue; // jamais d'artwork brut en galerie
    if (fronts.has(idOf(c.url))) continue; // déjà en section Color
    if (
      src === "blank" &&
      hasImportedSet &&
      (!c.color || !imported.has(normColor(c.color)))
    ) {
      continue; // avatars fantômes (couleurs non importées)
    }
    const old = prev.get(idOf(c.url));
    if (old) {
      push({ ...old, color: old.color ?? c.color ?? null, placement: old.placement ?? c.placement ?? null });
      continue;
    }
    let kept = src === "generated" || src === "custom";
    if (src === "blank") {
      kept = !c.color || !generatedColors.has(normColor(c.color));
    }
    push({
      url: c.url,
      color: c.color ?? null,
      placement: c.placement ?? null,
      source: src as GalleryMetaItem["source"],
      kept,
    });
  }

  // Droits acquis : customs existants non re-proposés (posters admin).
  for (const u of asUrlList(opts.existingGallery)) {
    if (fronts.has(idOf(u))) continue;
    if (prev.has(idOf(u))) continue;
    push({ url: u, color: null, placement: null, source: "custom", kept: true });
  }
  // Anciennes entrées meta conservées (mémoire kept:false y compris :
  // un retiré ne revient jamais).
  for (const [, m] of prev) {
    if (!seen.has(idOf(m.url))) push(m);
  }
  return items;
}

/** URLs d'affichage : kept uniquement, dans l'ordre, dédupliquées, plafonnées. */
export function galleryUrls(
  meta: unknown,
  cap = 12,
): string[] {
  if (!Array.isArray(meta)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of meta) {
    if (m == null || typeof m !== "object") continue;
    const r = m as Record<string, unknown>;
    if (r.kept === false) continue;
    if (typeof r.url !== "string" || !r.url || seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r.url);
    if (out.length >= Math.max(1, Math.floor(cap) || 12)) break;
  }
  return out;
}
