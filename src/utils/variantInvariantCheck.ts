// src/utils/variantInvariantCheck.ts
// P0 - Harnais non-régression POD
// Garantit que l'enrichissement stock_status (P2) ne casse PAS prix/couleurs/sizes.
// À utiliser en dev ou dans un test manuel: import { assertVariantInvariant } ...
//
// Règle d'or POD: on n'a pas de stock réel, Printful gère. On enrichit seulement.

import type { Product } from "../types";

export interface InvariantResult {
  productId: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Vérifie qu'un produit après sync P2 reste compatible avec le code frontstore
 * existant (ProductDetailModal, App.tsx, CartDrawer).
 * - chaque variants[i].sizes[size].price existe et est un number >0
 * - colors.length === variants.length (si variants présent)
 * - inStock dérivé cohérent avec stock_status
 */
export function assertVariantInvariant(
  before: Product | null,
  after: Product,
): InvariantResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const id = after.id;

  // 1. prix intact
  if (after.variants && after.variants.length > 0) {
    for (const v of after.variants) {
      if (!v.color) errors.push(`variant sans color (${JSON.stringify(v).slice(0, 80)})`);
      const sizes = v.sizes || {};
      if (Object.keys(sizes).length === 0) warnings.push(`variant ${v.color} sans tailles`);
      for (const [sz, data] of Object.entries(sizes as Record<string, any>)) {
        if (data == null || typeof (data as any).price !== "number") {
          errors.push(`variant ${v.color} size ${sz} prix manquant/cassé`);
        } else if ((data as any).price <= 0) {
          warnings.push(`variant ${v.color} size ${sz} prix <=0`);
        }
        const st = (data as any).stock_status;
        if (st && !["available", "out_of_stock", "discontinued"].includes(st)) {
          errors.push(`variant ${v.color} size ${sz} stock_status invalide: ${st}`);
        }
      }
    }
  }

  // 2. couleurs cohérentes
  if (after.variants && after.variants.length > 0) {
    if (after.colors.length !== after.variants.length) {
      warnings.push(`colors.length ${after.colors.length} !== variants.length ${after.variants.length}`);
    }
    if (after.colorNames && after.colorNames.length !== after.variants.length) {
      warnings.push(`colorNames length mismatch`);
    }
  }

  // 3. prix avant/après si before fourni
  if (before?.variants && after.variants) {
    const beforeMap = new Map<string, number>();
    for (const v of before.variants) {
      for (const [sz, d] of Object.entries(v.sizes as Record<string, any>)) {
        beforeMap.set(`${v.color}|${sz}`, (d as any).price);
      }
    }
    for (const v of after.variants) {
      for (const [sz, d] of Object.entries(v.sizes as Record<string, any>)) {
        const key = `${v.color}|${sz}`;
        const prev = beforeMap.get(key);
        if (prev != null && Math.abs(prev - (d as any).price) > 0.01) {
          // prix modifié = warning (peut être legit si Printful change retail_price)
          warnings.push(`prix changé ${key}: ${prev} -> ${(d as any).price}`);
        }
      }
    }
  }

  // 4. inStock dérivé: si tous discontinued/out_of_stock alors inStock devrait être false
  if (after.variants) {
    const hasAvailable = after.variants.some((v) =>
      Object.values(v.sizes as Record<string, any>).some(
        (s: any) => (s.stock_status || "available") === "available",
      ),
    );
    if (!hasAvailable && after.inStock) {
      warnings.push(`inStock=true mais aucune variante available (devrait être false)`);
    }
    if (hasAvailable && !after.inStock) {
      // pas une erreur bloquante: inStock peut rester true pour POD, mais signaler
      warnings.push(`inStock=false alors qu'au moins une variante est available`);
    }
  }

  return { productId: id, ok: errors.length === 0, errors, warnings };
}

/** Check lot */
export function checkAllProducts(
  befores: Map<string, Product>,
  afters: Product[],
): InvariantResult[] {
  return afters.map((after) => assertVariantInvariant(befores.get(after.id) || null, after));
}
