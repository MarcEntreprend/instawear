// src/hooks/useProductAvailability.ts
/**
 * Source unique de la disponibilité d'un produit.
 *
 * Règle de cohérence :
 * - Frontstore (catalogue) : un produit indisponible n'est PAS visible
 *   (rankProducts exclut déjà les produits inactifs).
 * - Favoris / panier : un produit indisponible reste visible mais grisé,
 *   avec la possibilité de le retirer.
 * - Compte client : une commande passée reste accessible même si le produit
 *   n'est plus disponible (données figées dans la commande).
 * - Les boutons d'achat et d'ajout aux favoris sont désactivés pour les
 *   produits indisponibles.
 *
 * `isProductUnavailable(product)` décide du statut. `useProductAvailability`
 * expose ce statut sous forme de hook réutilisable.
 */

export type AvailabilityStatus = "available" | "inactive" | "out_of_stock";

export interface ProductLike {
  isActive?: boolean;
  inStock?: boolean;
}

/**
 * Détermine le statut de disponibilité d'un produit.
 * Un produit est "unavailable" s'il est inactif OU explicitement en rupture.
 */
export function getProductAvailability(
  product: ProductLike | null | undefined,
): AvailabilityStatus {
  if (!product) return "inactive";
  if (product.isActive === false) return "inactive";
  if (product.inStock === false) return "out_of_stock";
  return "available";
}

/** Raccourci : le produit est-il indisponible (inactif ou en rupture) ? */
export function isProductUnavailable(
  product: ProductLike | null | undefined,
): boolean {
  return getProductAvailability(product) !== "available";
}

export function useProductAvailability(
  product: ProductLike | null | undefined,
): AvailabilityStatus {
  return getProductAvailability(product);
}
