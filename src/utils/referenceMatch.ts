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
