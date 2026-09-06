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
