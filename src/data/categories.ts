// src/data/categories.ts — V2 port (for Header suggestions)
import { Shirt, CloudSnow, Watch, Coffee, PartyPopper, Trophy, Gift, Ghost, Sun, type LucideIcon } from "lucide-react";
export interface CategoryOption { value: string; label: string; icon: LucideIcon; }
export const PRODUCT_CATEGORIES: CategoryOption[] = [
  { value: "tshirt", label: "T-Shirts", icon: Shirt },
  { value: "hoodie", label: "Sweats & Hoodies", icon: CloudSnow },
  { value: "accessory", label: "Accessories", icon: Watch },
  { value: "mug", label: "Mugs", icon: Coffee },
];
export interface EventTypeOption { value: string; label: string; icon: LucideIcon; }
export interface EventTypeOption { value: string; label: string; icon: LucideIcon; }
// Sous-ensemble curé pour la nav/éditorial. VALEURS = slugs reference_lists
// (le filtre est exact : toute valeur inventée donne un résultat vide).
// Garde : tests/taxonomy-guard.test.ts (valeurs ⊆ seed migration).
export const EVENT_TYPES: EventTypeOption[] = [
  { value: "musicfestival", label: "Music Festivals", icon: PartyPopper },
  { value: "sport", label: "Sports", icon: Trophy },
  { value: "birthday", label: "Birthdays", icon: Gift },
  { value: "halloween", label: "Halloween", icon: Ghost },
  { value: "summer", label: "Summer", icon: Sun },
];
// Alias d'anciennes URLs (?event=festival, ?cat=t-shirts) : résolus vers les
// slugs réels au lieu d'un vide. Inconnu -> inchangé (vide assumé).
export const LEGACY_EVENT_ALIAS: Record<string, string> = {
  festival: "musicfestival",
  concert: "musicfestival",
  anniversaire: "birthday",
};
export const LEGACY_CATEGORY_ALIAS: Record<string, string> = {
  "t-shirts": "tshirt",
  hoodies: "hoodie",
  accessories: "accessory",
  mugs: "mug",
};
/** Résout un slug legacy vers le slug réel (ou la valeur telle quelle). */
export function resolveLegacySlug(
  value: string | null,
  aliases: Record<string, string>,
): string | null {
  if (!value) return null;
  return aliases[value] ?? value;
}
export const SORT_OPTIONS = [
  { value: "popular", label: "Popularity" },
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
] as const;

/**
 * eventType réservé aux promos/deals (Vague B item 10 : fini le "discount"
 * en dur dispersé — ProductsPage, StoreProductCard, sync promo).
 */
export const DISCOUNT_EVENT_TYPE = "discount";
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
