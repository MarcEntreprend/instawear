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
  category: "tshirt" | "hoodie" | "accessory" | "mug";
  eventType: "live" | "sport" | "culture" | "saisonnier";
  style: "cute" | "street" | "commute" | "cozy" | "retro";
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

// ─── Admin User (§2.9) ────────────────────────────────────────────────────
export type AdminRole = "super_admin" | "editor";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  createdAt: string;
  lastLoginDate?: string;
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
