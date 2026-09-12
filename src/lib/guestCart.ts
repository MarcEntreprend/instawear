// src/lib/guestCart.ts — persistance panier invité (localStorage).
// On ne stocke que des RÉFÉRENCES de lignes (productId/couleur/taille/qté) :
// prix et objets produits sont re-résolus depuis le catalogue frais à
// l'hydratation (jamais de prix périmé). Toute donnée invalide est ignorée.
// Fonctions pures et testées (tests/guest-cart.test.ts) ; le stockage est
// best-effort (quota/mode privé → silencieux).
import type { CartItem, Product } from "../types";

export const GUEST_CART_KEY = "instawear-cart";
const GUEST_CART_VERSION = 1;
const MAX_QTY = 99;

export interface GuestCartLine {
  productId: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

interface StoredCart {
  v: number;
  items: unknown;
}

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function isValidLine(raw: any): raw is GuestCartLine {
  if (!raw || typeof raw !== "object") return false;
  if (typeof raw.productId !== "string" || !raw.productId) return false;
  if (typeof raw.selectedColor !== "string") return false;
  if (typeof raw.selectedSize !== "string") return false;
  const q = Number(raw.quantity);
  return Number.isInteger(q) && q >= 1 && q <= MAX_QTY;
}

/** Lit + valide le panier invité stocké ([] si absent/corrompu). */
export function loadGuestCart(): GuestCartLine[] {
  if (!storageAvailable()) return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredCart;
    if (!parsed || parsed.v !== GUEST_CART_VERSION || !Array.isArray(parsed.items)) {
      return [];
    }
    return (parsed.items as unknown[])
      .filter(isValidLine)
      .map((l) => ({
        productId: l.productId,
        selectedColor: l.selectedColor,
        selectedSize: l.selectedSize,
        quantity: Math.min(MAX_QTY, Math.max(1, Math.floor(Number(l.quantity)))),
      }));
  } catch {
    return [];
  }
}

/** Sérialise un panier en lignes stockables (sans objets produits). */
export function toGuestLines(cart: CartItem[]): GuestCartLine[] {
  return (Array.isArray(cart) ? cart : [])
    .filter(
      (it) =>
        it &&
        typeof it.product?.id === "string" &&
        typeof it.selectedColor === "string" &&
        typeof it.selectedSize === "string",
    )
    .map((it) => ({
      productId: it.product.id,
      selectedColor: it.selectedColor,
      selectedSize: it.selectedSize,
      quantity: Math.min(MAX_QTY, Math.max(1, Math.floor(Number(it.quantity) || 1))),
    }));
}

/** Sauvegarde best-effort (jamais d'exception vers l'appelant). */
export function saveGuestCart(cart: CartItem[]): void {
  if (!storageAvailable()) return;
  try {
    const payload: StoredCart = { v: GUEST_CART_VERSION, items: toGuestLines(cart) };
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(payload));
  } catch {
    /* quota/mode privé : on ignore */
  }
}

/** Vide le stockage invité (commande aboutie, logout). Best-effort. */
export function clearGuestCart(): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Résout des lignes (serveur ou invité, même forme) en CartItems avec prix
 * frais du catalogue. Les lignes sans produit sont écartées.
 * (Logique historiquement inline dans App.tsx, extraite sans changement.)
 */
export function resolveCartLines(
  items: { productId: string; selectedColor: string; selectedSize: string; quantity: number }[],
  products: Product[],
): CartItem[] {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      let unitPrice =
        product.price + (product.sizeSurcharge?.[item.selectedSize] ?? 0);
      if (product.variants?.length) {
        const variant = product.variants.find(
          (v) => v.color === item.selectedColor,
        );
        if (variant?.sizes?.[item.selectedSize]?.price != null) {
          unitPrice = variant.sizes[item.selectedSize].price;
        }
      }
      return {
        product,
        selectedColor: item.selectedColor,
        selectedSize: item.selectedSize,
        quantity: item.quantity,
        unitPrice,
      };
    })
    .filter((ci): ci is CartItem => ci !== null);
}
