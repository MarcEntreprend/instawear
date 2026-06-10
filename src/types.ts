/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  title: string;
  brand: string;
  description: string;
  fullDescription?: string;
  price: number;
  originalPrice?: number;
  image: string;
  gallery: string[];
  colors: string[];
  colorNames?: string[];
  sizes: string[];
  ratings: {
    score: number;
    count: number;
  };
  boughtLastMonth: number;
  isBestSeller?: boolean;
  isLimitedTime?: boolean;
  material?: string;
  inStock?: boolean;
  tags: string[];
  eventType: "sport" | "culture" | "saisonnier" | "live";
  category: "tshirt" | "hoodie" | "accessory" | "mug";
  style: "cute" | "street" | "commute" | "cozy" | "retro";
}

export interface CartItem {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

export interface OrderForm {
  name: string;
  phone: string;
  email: string;
  date: string;
  reception: "retrait" | "livraison";
  address: string;
  message: string;
}

export interface Testimonial {
  id: string;
  name: string;
  avatar: string;
  location: string;
  rating: number;
  text: string;
  product: string;
  date: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: "livraison" | "commande" | "produit" | "retour";
}

export interface FilterState {
  search: string;
  category: string | null;
  eventType: string | null;
  material: string | null;
  priceMin: number;
  priceMax: number;
  inStockOnly: boolean;
}

export interface DesignInput {
  title: string;
  prompt: string;
  description: string;
  eventType: "sport" | "culture" | "saisonnier" | "live";
  category: "tshirt" | "hoodie" | "accessory" | "mug";
  style: "cute" | "street" | "commute" | "cozy" | "retro";
  tags: string[];
  basePrice: number;
  mockImage: string;
}

export interface PrintfulSettings {
  apiKey: string;
  isConnected: boolean;
  storeName: string;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  lastSynced?: string;
  productsSyncedCount: number;
}
