// src/data/currency.ts — V2 port
export type CurrencyCode = "EUR" | "CHF" | "CAD";
export interface CurrencyInfo { code: CurrencyCode; locale: string; rateFromEur: number; }
export const COUNTRY_CURRENCY: Record<string, CurrencyInfo> = {
  France: { code: "EUR", locale: "fr-FR", rateFromEur: 1 },
  Belgique: { code: "EUR", locale: "fr-BE", rateFromEur: 1 },
  Suisse: { code: "CHF", locale: "fr-CH", rateFromEur: 0.95 },
  Canada: { code: "CAD", locale: "fr-CA", rateFromEur: 1.47 },
};
export function getCurrencyForCountry(country: string): CurrencyInfo { return COUNTRY_CURRENCY[country] ?? COUNTRY_CURRENCY.France; }
export function formatPrice(amountInEur: number, currency: CurrencyInfo): string {
  const converted = amountInEur * currency.rateFromEur;
  return new Intl.NumberFormat(currency.locale, { style: "currency", currency: currency.code }).format(converted);
}

/**
 * Formatage piloté par les settings boutique (source de vérité) : AUCUNE
 * conversion — les prix en base sont déjà dans la devise du store.
 * @param amount montant dans la devise du store
 * @param symbol symbole issu de useCurrencySymbol() (ex: "$")
 */
export function formatAmount(amount: number, symbol: string): string {
  const n = Number(amount);
  const safe = Number.isFinite(n) ? n : 0;
  return `${safe.toFixed(2)} ${symbol}`;
}
