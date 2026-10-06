// src/utils/referenceMatch.ts — appariement par mots-clés (pur, testable).
//
// Même sémantique que detectMaterial (PrintfulProductForm) : premier match
// dans l'ordre des entrées, "" si rien. Les listes vivent en base
// (reference_lists.keywords, éditables admin) ; ce module ne fait que matcher.
// Utilisé par : pré-remplissage formulaires (client) + facettes front.

export interface RefEntry {
  value: string;
  label?: string | null;
  keywords?: string[] | null;
  sortOrder?: number | null;
}

/**
 * Première entrée dont un mot-clé apparaît dans le texte (insensible casse).
 * "" si rien (l'appelant applique son fallback : autre/casual/vide).
 */
export function detectReference(
  text: string | null | undefined,
  entries: RefEntry[] | null | undefined,
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

/** Libellé d'une valeur (repli : slug préttifié). */
export function refLabel(
  entries: RefEntry[] | null | undefined,
  value: string,
): string {
  const found = (entries || []).find((e) => e.value === value);
  const label = found?.label?.trim();
  if (label) return label;
  const clean = value.replace(/[_-]+/g, " ").trim();
  if (!clean) return "Other";
  return clean
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Valeurs présentes triées par sort_order ref puis popularité. */
export function orderRefValues(
  entries: RefEntry[],
  counts: Map<string, number>,
): string[] {
  const order = new Map(entries.map((e, i) => [e.value, e.sortOrder ?? i]));
  return [...counts.keys()]
    .filter((v) => counts.get(v)! > 0)
    .sort(
      (a, b) =>
        (order.get(a) ?? 9999) - (order.get(b) ?? 9999) ||
        counts.get(b)! - counts.get(a)!,
    );
}

/**
 * Top-N pour nav/grilles (même source que les facettes : zéro liste en dur).
 * Tri : popularité d'abord (le catalogue pilote), sort_order ref en égalité,
 * valeur en dernier (stabilité). Zéro produit -> liste vide (l'appelant
 * utilise son repli statique en attendant le chargement).
 */
export function topRefValues(
  entries: RefEntry[],
  counts: Map<string, number>,
  limit: number,
): string[] {
  // Sans référentiel (chargement), on ne devine rien : l'appelant garde son
  // repli statique plutôt qu'une liste brute sans libellés.
  if (entries.length === 0) return [];
  const order = new Map(entries.map((e, i) => [e.value, e.sortOrder ?? i]));
  return [...counts.keys()]
    .filter((v) => counts.get(v)! > 0)
    .sort(
      (a, b) =>
        counts.get(b)! - counts.get(a)! ||
        (order.get(a) ?? 9999) - (order.get(b) ?? 9999) ||
        (a < b ? -1 : 1),
    )
    .slice(0, Math.max(0, limit));
}

/** Compte les produits actifs par valeur d'un champ (category/eventType). */
export function countByField(
  products: { category?: string | null; eventType?: string | null; isActive?: boolean }[],
  field: "category" | "eventType",
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of products) {
    if (p.isActive === false) continue;
    const v = field === "category" ? p.category : p.eventType;
    if (v) counts.set(v, (counts.get(v) || 0) + 1);
  }
  return counts;
}

/**
 * Libellé storefront depuis un libellé ref (retire les emojis de tête :
 * la nav utilise des icônes Lucide, pas d'emoji inline).
 */
export function cleanTaxLabel(label: string | null | undefined): string {
  return String(label || "")
    .replace(/^(\p{Extended_Pictographic}\uFE0F?\s*)+/u, "")
    .replace(/\s+/g, " ")
    .trim();
}
