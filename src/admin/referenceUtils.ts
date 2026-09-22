// src/admin/referenceUtils.ts
// Helpers purs des listes de référence (Vague B item 10) : AUCUNE dépendance
// (ni React, ni API) → importables en node/tests. La source des listes
// reste useReferenceLists (adminHooks) ; ici seulement le formatage.

/**
 * Libellé FR d'un slug de liste de référence : fini les slugs bruts
 * affichés (QuickView, facettes). Insensible à la casse, repli = slug
 * brut (jamais vide).
 */
export function referenceLabel(
  items: Array<{ value: string; label: string }>,
  value: unknown,
): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const found = (items ?? []).find(
    (r) => r.value === raw || r.value?.toLowerCase() === raw.toLowerCase(),
  );
  return found?.label || raw;
}

/**
 * Clé de regroupement insensible à la casse/espaces : "Street" vs "street"
 * fusionnent dans les facettes ; les valeurs legacy non mappées restent
 * visibles sous leur clé normalisée au lieu de disparaître.
 */
export function normalizeRefKey(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Libellé vide matière UNIQUE des deux formulaires produit (item 10). */
export const EMPTY_MATERIAL_LABEL = "— Non renseigné (auto au prochain sync) —";
