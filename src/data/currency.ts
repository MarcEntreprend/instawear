// src/data/currency.ts — boutique mono-devise (USD, settings source de vérité).
// Le pays de livraison (useCurrency) ne pilote QUE le shipping, jamais les
// montants : affichage = devise settings = devise de charge Stripe.

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
