// src/utils/routes.ts — routes SPA (purs, testables en node).
//
// L'admin (/admin) et le compte (/compte) sont des pages à part entière
// (refresh-safe) : l'URL est la source de vérité, jamais un état volatil seul.

/** Vrai si et seulement si le chemin est la page admin (strict, sans PII). */
export function isAdminPath(path: string): boolean {
  return path === "/admin";
}

/** Vrai si et seulement si le chemin est la page compte (strict, sans PII). */
export function isAccountPath(path: string): boolean {
  return path === "/compte";
}
