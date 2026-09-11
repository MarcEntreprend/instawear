// supabase/functions/email-preferences/_shared/validators.ts
// Copie locale (le bundler n'inclut que le dossier de la fonction).
// Miroir de supabase/functions/_shared/validators.ts

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_PAYLOAD_BYTES = 100 * 1024;

export function isValidEmail(v: unknown): boolean {
  return typeof v === "string" && EMAIL_RE.test((v as string).trim()) && (v as string).length <= 254;
}

export function isPayloadTooLarge(jsonStr: string): boolean {
  return jsonStr.length > MAX_PAYLOAD_BYTES;
}
