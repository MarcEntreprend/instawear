// supabase/functions/email-preferences/_shared/prefs.ts
// Logique pure (aucune dépendance Deno/Supabase) : testée par tests/email-preferences.test.ts.
// - normalizeEmail : trim + minuscules (clé de comparaison unique)
// - validateSaveBody : op/save strict (booléens uniquement, clés connues uniquement)
// - mergePrefs : fusionne avec les prefs existantes (ne supprime jamais une clé)
// - describeChanges : résumé lisible pour le journal admin

export const PREF_KEYS = [
  "newsletter",
  "order_confirmation",
  "shipping_update",
  "promotions",
] as const;
export type PrefKey = (typeof PREF_KEYS)[number];
export type Prefs = Partial<Record<PrefKey, boolean>>;

export function normalizeEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) return null;
  return e;
}

export function isStrictBool(v: unknown): v is boolean {
  return v === true || v === false;
}

/** Valide le body d'un op=save. Retourne les prefs à appliquer ou une erreur. */
export function validateSaveBody(body: any): { prefs: Prefs } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid request body" };
  const prefs: Prefs = {};
  for (const k of PREF_KEYS) {
    if (body[k] === undefined) continue;
    if (!isStrictBool(body[k])) return { error: `Invalid value for "${k}" (boolean required)` };
    prefs[k] = body[k];
  }
  if (Object.keys(prefs).length === 0) return { error: "Nothing to save (no preference provided)" };
  return { prefs };
}

/** Prefs effectives client : stockées, sinon défauts d'affichage (tout coché). */
export function displayPrefs(stored: Record<string, unknown> | null): Record<string, boolean> {
  return {
    order_confirmation: stored?.order_confirmation !== false,
    shipping_update: stored?.shipping_update !== false,
    promotions: stored?.promotions !== false,
  };
}

/** Fusion : seules les clés fournies sont écrasées, les autres sont conservées. */
export function mergePrefs(
  stored: Record<string, unknown> | null,
  patch: Partial<Record<string, boolean>>,
): Record<string, boolean> {
  const base = displayPrefs(stored);
  const out: Record<string, boolean> = { ...base };
  if (patch.order_confirmation !== undefined) out.order_confirmation = patch.order_confirmation;
  if (patch.shipping_update !== undefined) out.shipping_update = patch.shipping_update;
  if (patch.promotions !== undefined) out.promotions = patch.promotions;
  return out;
}

/** Résumé des changements réellement appliqués (pour le journal admin). */
export function describeChanges(before: {
  newsletter: boolean;
  prefs: Record<string, boolean>;
  isCustomer: boolean;
}, after: { newsletter: boolean; prefs: Record<string, boolean> }): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  if (before.newsletter !== after.newsletter) {
    changes.newsletter = { from: before.newsletter, to: after.newsletter };
  }
  for (const k of ["order_confirmation", "shipping_update", "promotions"] as const) {
    if (before.isCustomer && before.prefs[k] !== after.prefs[k]) {
      changes[k] = { from: before.prefs[k], to: after.prefs[k] };
    }
  }
  return changes;
}
