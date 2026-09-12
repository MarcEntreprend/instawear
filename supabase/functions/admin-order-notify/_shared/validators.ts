// supabase/functions/admin-order-notify/_shared/validators.ts
// Copie locale (le bundler n'inclut que le dossier de la fonction).
// Miroir de supabase/functions/_shared/validators.ts

export const MAX_PAYLOAD_BYTES = 100 * 1024;

export function isPayloadTooLarge(jsonStr: string): boolean {
  return jsonStr.length > MAX_PAYLOAD_BYTES;
}
