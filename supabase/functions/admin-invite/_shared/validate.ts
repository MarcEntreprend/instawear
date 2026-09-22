// supabase/functions/admin-invite/_shared/validate.ts
// Validation pure de l'invitation admin (importable en tests node : aucun
// import Deno, aucune I/O). Règles :
// - email requis, normalisé (trim + minuscules : la comparaison
//   admin_users passe par lower()) ;
// - forme RFC raisonnable + longueur capée (anti abus) ;
// - rôle en liste blanche fermée (jamais de rôle libre depuis le client).

export type InvitableRole = "super_admin" | "editor";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface ValidInvite {
  email: string;
  role: InvitableRole;
}

export function validateInvite(input: unknown): ValidInvite | null {
  if (input == null || typeof input !== "object") return null;
  const rec = input as Record<string, unknown>;
  const rawEmail = typeof rec.email === "string" ? rec.email.trim().toLowerCase() : "";
  if (rawEmail.length === 0 || rawEmail.length > 254) return null;
  if (!EMAIL_RE.test(rawEmail)) return null;
  const role = rec.role === "super_admin" || rec.role === "editor" ? rec.role : null;
  if (!role) return null;
  return { email: rawEmail, role };
}
