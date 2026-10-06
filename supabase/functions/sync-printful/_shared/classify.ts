// supabase/functions/sync-printful/_shared/classify.ts
// Classification catégorie/event/style par mots-clés (reference_lists).
// Même sémantique que detectReference côté front (premier match, "" sinon).
// Les listes vivent en base (éditées admin) : le sync les lit via
// service_role, jamais de vocabulaire en dur ici.
// Replis honnêtes : category "other", event "casual" (défaut by design),
// style "" (non renseigné, exclu des facettes). Jamais de valeur fantôme.

export interface KeywordEntry {
  value: string;
  keywords?: string[] | null;
}

export function classifyByKeywords(
  text: string | null | undefined,
  entries: KeywordEntry[] | null | undefined,
): string {
  const hay = (text || "").toLowerCase();
  if (!hay) return "";
  for (const e of entries || []) {
    for (const kw of e.keywords || []) {
      const k = String(kw || "").toLowerCase().trim();
      if (k && hay.includes(k)) return e.value;
    }
  }
  return "";
}

export interface ClassifiedTaxonomy {
  category: string;
  event_type: string;
  style: string;
}

/**
 * Classifie un produit depuis ses noms (sync + catalogue : le nom sync porte
 * le thème du design — ex. "Halloween Tee" —, le nom catalogue le vêtement
 * — ex. "Classic T-Shirt"). Ne choisit jamais à la place de l'admin côté
 * import : le formulaire pré-remplit depuis les mêmes listes.
 */
export function classifyProduct(
  input: { name?: string | null; type?: string | null },
  refs: {
    category: KeywordEntry[];
    event_type: KeywordEntry[];
    style: KeywordEntry[];
  },
): ClassifiedTaxonomy {
  const combined = `${input.name || ""} ${input.type || ""}`;
  return {
    category: classifyByKeywords(combined, refs.category) || "other",
    event_type: classifyByKeywords(combined, refs.event_type) || "casual",
    style: classifyByKeywords(combined, refs.style) || "",
  };
}

/** Garde : une valeur classifiée doit exister dans les refs (ou ""/repli). */
export function isKnownRefValue(
  value: string,
  entries: KeywordEntry[] | null | undefined,
): boolean {
  if (!value) return true;
  return (entries || []).some((e) => e.value === value);
}
