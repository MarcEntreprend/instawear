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
  tags: string[];
  eventType: 'sport' | 'culture' | 'saisonnier' | 'live';
  category: 'tshirt' | 'hoodie' | 'accessory' | 'mug';
  style: 'cute' | 'street' | 'commute' | 'cozy' | 'retro';
}

export interface CartItem {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
}

export interface DesignInput {
  title: string;
  prompt: string;
  description: string;
  eventType: 'sport' | 'culture' | 'saisonnier' | 'live';
  category: 'tshirt' | 'hoodie' | 'accessory' | 'mug';
  style: 'cute' | 'street' | 'commute' | 'cozy' | 'retro';
  tags: string[];
  basePrice: number;
  mockImage: string;
}

export interface PrintfulSettings {
  apiKey: string;
  isConnected: boolean;
  storeName: string;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSynced?: string;
  productsSyncedCount: number;
}
