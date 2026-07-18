//src\admin\adminTypes.ts

// ─── Extended Product type for admin (all fields from spec §2.1) ───────────
export interface AdminProduct {
  id: string;
  isActive: boolean;
  title: string;
  brand: string;
  description: string;
  fullDescription?: string;
  image: string;
  gallery: string[];
  mockupPreset?: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  stockQuantity?: number;
  colors: string[];
  colorNames?: string[];
  sizes: string[];
  sizeSurcharge?: Record<string, number>;
  // Stores per-size measurements. Keys must match entries in sizes[].
  // Example: { "M": { "bust": 51, "length": 72 }, "L": { "bust": 54, "length": 74 } }
  sizeGuide?: Record<string, { bust: number; length: number }>;
  category: string;
  eventType: string;
  style: string;
  material?: string;
  tags: string[];
  isBestSeller?: boolean;
  isLimitedTime?: boolean;
  dealActive?: boolean;
  dealEndsAt?: string; // ISO datetime
  dealPrice?: number;
  affiliateMode?: boolean;
  affiliateUrl?: string;
  externalProductId?: string;
  externalVariantId?: string;
  lastExternalSync?: string; // ISO datetime
  printfulPrice?: number; // Coût de base Printful
  printfulCurrency?: string | null;
  shippingEstimate?: number | null; // frais de port estimés pour ce produit
  ratings: { score: number; count: number };
  boughtLastMonth: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Customer (§2.2) ───────────────────────────────────────────────────────
export interface Customer {
  id: string;
  email: string;
  name?: string;
  registrationDate: string;
  lastLoginDate?: string;
  emailPreferences?: {
    order_confirmation: boolean;
    shipping_update: boolean;
    promotions: boolean;
  };
}

// Payload for creating a customer. passwordHash is required during creation
// but is never stored in the Customer type returned by the API.
export interface CreateCustomerPayload {
  email: string;
  passwordHash: string;
  name?: string;
}

// ─── Favourite (§2.3) ─────────────────────────────────────────────────────
export interface Favourite {
  id: string;
  clientId: string;
  productId: string;
  createdAt: string;
  product?: Partial<AdminProduct>;
}

// ─── Cart Item (§2.4) ─────────────────────────────────────────────────────
export interface AdminCartItem {
  id: string;
  clientId: string;
  productId: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  addedAt: string;
  product?: Partial<AdminProduct>;
}

// ─── Order (§2.5) ─────────────────────────────────────────────────────────
export type OrderStatus =
  | "pending"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface ShippingAddress {
  fullName: string;
  address: string;
  city: string;
  zip: string;
  country: string;
  state_code?: string;
  tax_number?: string;
  phone: string;
}

export interface Order {
  id: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  createdAt: string;
  status: OrderStatus;
  totalAmount: number;
  shippingCost: number;
  shippingAddress: ShippingAddress;
  externalOrderId?: string;
  notes?: string;
  items: OrderItem[];
}

// ─── Order Item (§2.6) ────────────────────────────────────────────────────
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productTitle?: string;
  productImage?: string;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  unitPrice: number;
}

// ─── POD Integration settings (§2.7) ─────────────────────────────────────
export interface PodSettings {
  id: string;
  apiKey: string;
  storeId?: string;
  storeName: string;
  isConnected: boolean;
  lastSyncAt?: string;
  productsSyncedCount: number;
  syncStatus: "idle" | "syncing" | "synced" | "error";
}

// ─── POD Sync Log (§2.8) ─────────────────────────────────────────────────
export interface SyncLog {
  id: string;
  syncDate: string;
  status: "success" | "partial" | "error";
  message?: string;
  productId?: string;
  duration?: number; // ms
}

// ─── API Connection (multi-provider support: POD + affiliation) ──────────
export interface ApiConnection {
  id: string;
  name: string;
  type: "pod" | "affiliate";
  service: string;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
  lastSyncAt?: string; // ISO datetime
  createdAt: string;
  updatedAt: string;
}

// ─── Admin User (§2.9) ────────────────────────────────────────────────────
export type AdminRole = "super_admin" | "editor";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  createdAt: string;
  lastLoginDate?: string;
}

// Payload for creating an admin user. passwordHash is required during creation
// but is never stored in the AdminUser type returned by the API.
export interface CreateAdminUserPayload {
  email: string;
  passwordHash?: string;
  role: AdminRole;
}

// ─── Reference List (dynamic categories, event types, styles) ────────────
export interface ReferenceItem {
  id: string;
  type: "category" | "event_type" | "style";
  value: string;
  label: string;
  keywords: string[];
  sortOrder: number;
}

// ─── Store Settings (§2.10) ───────────────────────────────────────────────
export interface StoreSettings {
  storeName: string;
  currency: string;
  country: string;
  freeShippingThreshold: number;
  shippingCost: number;
  shippingDelay: string;
  globalCountdownEnd?: string; // ISO datetime
}

// ─── Dashboard stats ──────────────────────────────────────────────────────
export interface DashboardStats {
  productsOnline: number;
  productsOffline: number;
  totalCustomers: number;
  ordersToday: number;
  revenueEstimate: number;
  podConnected: boolean;
  recentOrders: Order[];
  recentProducts: AdminProduct[];
}

// ─── Hero Promotion (links a product to a hero carousel slot) ────────────
export interface HeroPromotion {
  id: string;
  productId: string;
  title?: string; // override product title (optional)
  headline?: string;
  sub?: string;
  cta?: string;
  bgGradient?: string;
  tag?: string;
  image?: string;
  order: number;
  showTag?: boolean; // whether to display the tag/badge
  showTitle?: boolean; // whether to display the product title
  isActive?: Boolean;
}
// ─── Shared filter / sort types ───────────────────────────────────────────
export interface ProductFilters {
  search: string;
  category: string;
  eventType: string;
  style: string;
  material: string;
  priceMin: number;
  priceMax: number;
  inStockOnly: boolean;
  isActive: string; // "all" | "active" | "inactive"
  isBestSeller: boolean;
  dealActive: boolean;
}

export interface OrderFilters {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  clientId: string;
}

export type SortDirection = "asc" | "desc";

export interface SortState<T extends string = string> {
  field: T;
  direction: SortDirection;
}

export interface ProductFilterState {
  /** Recherche textuelle (title, brand, tags, style, description) */
  search: string;
  /** Filtre par catégorie (null = toutes) */
  category: string | null;
  /** Filtre par type d'événement (null = tous) */
  eventType: string | null;
  /** Filtre par style (null = tous) */
  style: string | null;
  /** Filtre par matériau (null = tous) */
  material: string | null;
  /** Prix minimum (inclus) */
  priceMin: number;
  /** Prix maximum (inclus) */
  priceMax: number;
  /** Afficher uniquement les produits en stock */
  inStockOnly: boolean;
  /** Filtre par taille (le produit doit contenir cette taille) */
  size: string | null;
  /** Filtre par couleur (le produit doit contenir cette couleur) */
  color: string | null;
  /** Afficher aussi les produits inactifs (isActive = false) */
  showInactive: boolean;
}
