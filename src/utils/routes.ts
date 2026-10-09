// src/utils/routes.ts — routes SPA (purs, testables en node).
//
// L'admin (/admin) et le compte (/account) sont des pages à part entière
// (refresh-safe) : l'URL est la source de vérité, jamais un état volatil seul.
// Public anglophone : pas de /compte.

/** Vrai si et seulement si le chemin est la page admin (strict, sans PII). */
export function isAdminPath(path: string): boolean {
  return path === "/admin";
}

/**
 * Page Hero Studio (maquette Versatile Engine, fichier séparé
 * src/admin/herostudio/HeroStudioPage.tsx). Volontairement distincte de
 * /admin : pas un tab AdminSidebar, URL propre refresh-safe.
 */
export function isHeroStudioPath(path: string): boolean {
  return path === "/admin/herostudio";
}

/** Page compte (strict, sans PII). /compte gardé en alias (anciens liens). */
export function isAccountPath(path: string): boolean {
  return path === "/account" || path === "/compte";
}
