// src/lib/validators.ts
// P-A (1+7) validators partagés front+Edge (sans dépendance zod, pas de casse)
// Validations positives (whitelist) - rejette tout ce qui n'est pas explicitement autorisé

export const ORDER_ID_RE = /^ORD-[0-9]{4}-[0-9]{6}$/;
export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
export const SIZE_RE = /^(XS|S|M|L|XL|XXL|2XL|3XL)$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const COUNTRY_RE = /^[A-Z]{2}$/;

export function isValidOrderId(v: unknown): boolean {
  return typeof v === "string" && ORDER_ID_RE.test(v.trim());
}
export function isValidHexColor(v: unknown): boolean {
  return typeof v === "string" && HEX_COLOR_RE.test(v.trim());
}
export function isValidSize(v: unknown): boolean {
  return typeof v === "string" && SIZE_RE.test(String(v).trim().toUpperCase());
}
export function isValidQuantity(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v <= 100;
}
export function isValidEmail(v: unknown): boolean {
  return typeof v === "string" && EMAIL_RE.test(v.trim()) && v.length <= 254;
}
export function normalizeQuantity(v: unknown): number | null {
  const n = typeof v === "string" ? parseInt(v as string, 10) : (v as number);
  if (!Number.isInteger(n) || n <= 0 || n > 100) return null;
  return n;
}
export function isValidUrlHttps(v: unknown): boolean {
  if (typeof v !== "string") return false;
  try {
    const u = new URL(v);
    return u.protocol === "https:";
  } catch { return false; }
}
export const MAX_PAYLOAD_BYTES = 100 * 1024; // 100KB

// helper pour limiter la taille du JSON reçu côté Edge (sans RLS)
export function isPayloadTooLarge(jsonStr: string): boolean {
  return jsonStr.length > MAX_PAYLOAD_BYTES;
}
