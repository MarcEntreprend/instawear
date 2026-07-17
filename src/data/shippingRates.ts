// src/data/shippingRates.ts

// Shipping rates by country code (cost, freeThreshold)
export const SHIPPING_RATES: Record<
  string,
  { cost: number; freeThreshold: number }
> = {
  US: { cost: 4.99, freeThreshold: 35 },
  CA: { cost: 6.99, freeThreshold: 50 },
  GB: { cost: 5.99, freeThreshold: 40 },
  FR: { cost: 4.99, freeThreshold: 35 },
  CH: { cost: 7.99, freeThreshold: 60 },
  BE: { cost: 4.99, freeThreshold: 35 },
  BR: { cost: 9.99, freeThreshold: 80 },
  JP: { cost: 8.99, freeThreshold: 70 },
};

export const DEFAULT_SHIPPING = { cost: 4.99, freeThreshold: 35 };
