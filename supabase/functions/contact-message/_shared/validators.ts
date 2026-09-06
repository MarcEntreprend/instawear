// supabase/functions/contact-message/_shared/validators.ts
// Copie locale (le bundler n'inclut que le dossier de la fonction).
// Miroir de supabase/functions/_shared/validators.ts

export const ORDER_ID_RE = /^ORD-[0-9]{4}-[0-9]{6}$/;
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const SIZE_RE = /^(XS|S|M|L|XL|XXL|2XL|3XL)$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_PAYLOAD_BYTES = 100 * 1024;

export function isValidOrderId(v: unknown): boolean {
  return typeof v === "string" && ORDER_ID_RE.test((v as string).trim());
}
export function isValidQuantity(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v as number) && (v as number) > 0 && (v as number) <= 100;
}
export function isValidEmail(v: unknown): boolean {
  return typeof v === "string" && EMAIL_RE.test((v as string).trim()) && (v as string).length <= 254;
}
export function isValidHexColor(v: unknown): boolean {
  return typeof v === "string" && HEX_COLOR_RE.test((v as string).trim());
}
export function isValidSize(v: unknown): boolean {
  return typeof v === "string" && SIZE_RE.test(String(v).trim().toUpperCase());
}
export function isPayloadTooLarge(jsonStr: string): boolean {
  return jsonStr.length > MAX_PAYLOAD_BYTES;
}

export function normalizeQuantity(v: unknown): number | null {
  if (typeof v === "number") return isValidQuantity(v) ? v : null;
  if (typeof v === "string") {
    const n = Number(v);
    return isValidQuantity(n) ? n : null;
  }
  return null;
}
