// supabase/functions/_shared/env.ts
// Validation des secrets au démarrage des edges (item 15
// missing-before-launch) : fini les `Deno.env.get(...)!` qui explosent en
// erreurs cryptiques. Fail-closed 503 avec la liste des NOMS manquants
// (jamais de valeurs — les noms ne sont pas des secrets).
// Pur et testable en node : le lecteur est injectable (Deno en prod,
// map en tests). AUCUN I/O, AUCUN secret.

export type EnvReader = (name: string) => string | undefined;

function defaultReader(name: string): string | undefined {
  try {
    const d = (globalThis as any).Deno;
    if (d?.env?.get) {
      const v = d.env.get(name);
      return typeof v === "string" ? v : undefined;
    }
  } catch {
    /* ignore */
  }
  try {
    const p = (globalThis as any).process;
    const v = p?.env?.[name];
    return typeof v === "string" ? v : undefined;
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Noms requis absents ou vides (espaces seules = absent). */
export function missingEnv(names: string[], read: EnvReader = defaultReader): string[] {
  const out: string[] = [];
  for (const n of names ?? []) {
    const v = read(n);
    if (typeof v !== "string" || v.trim().length === 0) out.push(n);
  }
  return out;
}

/**
 * Variante "l'un OU l'autre" (ex. STRIPE_SECRET_KEY_TEST ou
 * STRIPE_SECRET_KEY : fallback TEST-d'abord côté edges). Vide si au moins
 * un présent, sinon la liste complète (pour le message 503).
 */
export function missingEnvOneOf(
  names: string[],
  read: EnvReader = defaultReader,
): string[] {
  const list = names ?? [];
  for (const n of list) {
    const v = read(n);
    if (typeof v === "string" && v.trim().length > 0) return [];
  }
  return [...list];
}

/**
 * Réponse 503 fail-closed : erreur actionnable (noms + remède), jamais les
 * valeurs. `hint` = commande exacte côté opérateur (ex. supabase secrets).
 */
export function envMissingResponse(missing: string[], hint?: string): Response {
  const body = {
    error: `Configuration serveur incomplète : ${missing.length} secret(s) manquant(s) (${missing.join(", ")}).`,
    missing,
    hint:
      hint ??
      "Ajoutez-les puis redéployez (ex. `supabase secrets set NOM=valeur`).",
  };
  return new Response(JSON.stringify(body), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Socle requis par (presque) toutes les edges : client Supabase admin.
 * Les secrets métier (Stripe, Resend, Printful…) s'ajoutent par edge.
 */
export const BASE_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
