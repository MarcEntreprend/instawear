// src/data/categories.ts — V2 port (for Header suggestions)
import { Shirt, CloudSnow, Watch, Coffee, PartyPopper, Trophy, Music, Snowflake, Gift, type LucideIcon } from "lucide-react";
export interface CategoryOption { value: string; label: string; icon: LucideIcon; }
export const PRODUCT_CATEGORIES: CategoryOption[] = [
  { value: "t-shirts", label: "T-Shirts", icon: Shirt },
  { value: "hoodies", label: "Sweats & Hoodies", icon: CloudSnow },
  { value: "accessories", label: "Accessoires", icon: Watch },
  { value: "mugs", label: "Mugs", icon: Coffee },
];
export interface EventTypeOption { value: string; label: string; icon: LucideIcon; }
export const EVENT_TYPES: EventTypeOption[] = [
  { value: "festival", label: "Festival", icon: PartyPopper },
  { value: "sport", label: "Sport", icon: Trophy },
  { value: "concert", label: "Concert", icon: Music },
  { value: "saisonnier", label: "Saisonnier", icon: Snowflake },
  { value: "anniversaire", label: "Anniversaire", icon: Gift },
];
export const STYLE_OPTIONS = ["streetwear", "graphique", "typographique", "minimaliste", "rétro", "rave", "festif"] as const;
export const MATERIAL_OPTIONS = ["Coton bio", "Coton peigné", "Polyester recyclé", "Molleton bio", "Céramique"] as const;
export const SORT_OPTIONS = [
  { value: "popular", label: "Popularité" },
  { value: "new", label: "Nouveautés" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "rating", label: "Mieux notés" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
