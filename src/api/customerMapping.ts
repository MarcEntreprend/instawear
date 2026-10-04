// src/api/customerMapping.ts — mapping pur (testable en node, aucun import
// valeur : import.meta.env de supabaseClient ne passe pas en node).
import type { Customer } from "../admin/adminTypes";

/**
 * Ligne profil depuis le retour RPC get_my_customer_profile.
 * Le RPC renvoie un TABLEAU de lignes ([{...}]) : on prend la première.
 * Sans ça, data.date_of_birth vaut undefined sur le tableau → DOB effacée
 * à chaque lecture alors que la base a la valeur (bug DOB constaté).
 */
export function mapCustomerProfile(data: unknown): Customer | null {
  const row: any = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    registrationDate: row.registration_date,
    lastLoginDate: row.last_login_date,
    emailPreferences: row.email_preferences || {
      order_confirmation: true,
      shipping_update: true,
      promotions: false,
    },
    date_of_birth: row.date_of_birth || null,
  };
}
