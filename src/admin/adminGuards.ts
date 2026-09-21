// src/admin/adminGuards.ts — gardes anti-lockout 100% pures (testées).
// Règles (fail-closed, jamais de compromis) :
// - on ne supprime jamais son propre compte ;
// - on ne supprime/rétrograde jamais le dernier super_admin ;
// - toute comparaison d'email est insensible à la casse (les emails Auth
//   et DB peuvent différer en casse).
// Ces gardes protègent des ERREURS, pas des attaquants : la vraie
// protection est la RLS (writes admin_users = super_admin, voir migration
// 20261025_admin_security.sql). Les deux couches sont requises.

import type { AdminRole, AdminUser } from "./adminTypes";

export interface GuardResult {
  ok: boolean;
  reason?: string;
}

function normEmail(e: unknown): string {
  return String(e ?? "").trim().toLowerCase();
}

function superAdminsExcept(
  users: AdminUser[],
  excludeId?: string,
): AdminUser[] {
  return (users || []).filter(
    (u) => u.role === "super_admin" && u.id !== excludeId,
  );
}

/** Suppression d'un admin : jamais soi-même, jamais le dernier super_admin. */
export function canDeleteAdmin(
  users: AdminUser[],
  currentEmail: unknown,
  target: AdminUser,
): GuardResult {
  if (normEmail(target.email) === normEmail(currentEmail)) {
    return {
      ok: false,
      reason: "Vous ne pouvez pas supprimer votre propre compte.",
    };
  }
  if (
    target.role === "super_admin" &&
    superAdminsExcept(users || [], target.id).length === 0
  ) {
    return {
      ok: false,
      reason:
        "Refusé : c'est le dernier super-administrateur. Promouvez d'abord un autre compte.",
    };
  }
  return { ok: true };
}

/** Changement de rôle : jamais sa propre rétrogradation, jamais le dernier. */
export function canChangeRole(
  users: AdminUser[],
  currentEmail: unknown,
  target: AdminUser,
  newRole: AdminRole,
): GuardResult {
  if (newRole === target.role) return { ok: true };
  if (normEmail(target.email) === normEmail(currentEmail)) {
    return {
      ok: false,
      reason:
        "Vous ne pouvez pas modifier votre propre rôle (risque de lockout). Demandez à un autre super-administrateur.",
    };
  }
  if (
    target.role === "super_admin" &&
    newRole !== "super_admin" &&
    superAdminsExcept(users || [], target.id).length === 0
  ) {
    return {
      ok: false,
      reason:
        "Refusé : c'est le dernier super-administrateur. Promouvez d'abord un autre compte.",
    };
  }
  return { ok: true };
}

/** Création : l'email ne doit pas déjà exister (insensible à la casse). */
export function emailExists(
  users: AdminUser[],
  email: unknown,
): boolean {
  const want = normEmail(email);
  if (!want) return false;
  return (users || []).some((u) => normEmail(u.email) === want);
}
