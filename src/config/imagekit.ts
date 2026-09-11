// src/config/imagekit.ts
// Config ImageKit côté navigateur (Vite : seules les vars VITE_* sont exposées).
// NOTE SÉCURITÉ : aucune clé secrète ici. La transformation par URL (fetch)
// n'a besoin que de l'endpoint public. La clé privée ne doit JAMAIS apparaître
// dans le frontend (ni dans .env avec un préfixe VITE_).
/** Lecture d'env compatible Vite (navigateur/build) + node (tests/scripts). */
export function envVar(name: string): string {
  try {
    const viteEnv = (import.meta as any)?.env;
    if (viteEnv && typeof viteEnv[name] === "string") return viteEnv[name];
  } catch {
    /* import.meta indisponible hors Vite */
  }
  try {
    const nodeEnv = (globalThis as any)?.process?.env;
    if (nodeEnv && typeof nodeEnv[name] === "string") return nodeEnv[name];
  } catch {
    /* pas d'env node */
  }
  return "";
}

/** Vrai en dev Vite uniquement (jamais de warn en prod/tests). */
export function isDevEnv(): boolean {
  return envVar("DEV") === "true" || envVar("MODE") === "development";
}

/**
 * Lecture LAZY (à chaque appel, pas au chargement du module) : robuste au
 * HMR, aux tests (env modifiée entre les tests) et aux contextes node.
 */
export function getEndpoint(): string {
  return envVar("VITE_IMAGEKIT_URL_ENDPOINT").trim().replace(/\/+$/, "");
}

/** Faux tant que l'endpoint n'est pas configuré → les helpers renvoient l'original. */
export function isEnabled(): boolean {
  return getEndpoint().length > 0;
}

export const imageKitConfig = {
  /** ex: https://ik.imagekit.io/<id> (sans slash final). Vide = désactivé. */
  get urlEndpoint(): string {
    return getEndpoint();
  },
  /** Faux tant que l'endpoint n'est pas configuré → les helpers renvoient l'original. */
  get enabled(): boolean {
    return isEnabled();
  },
};
