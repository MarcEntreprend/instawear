// src/api/supabaseApi.ts

import { supabase } from "../lib/supabaseClient";
import type {
  AdminProduct,
  Customer,
  Order,
  OrderStatus,
  PodSettings,
  SyncLog,
  AdminUser,
  StoreSettings,
  DashboardStats,
  Favourite,
  AdminCartItem,
  ApiConnection,
  HeroPromotion,
} from "../admin/adminTypes";

// ═══════════════════════════════════════════════════════════════════════════
// Type représentant EXACTEMENT les colonnes de la table "products" en base.
// Toute propriété envoyée à .insert() / .update() doit être de ce type.
// Si vous ajoutez une colonne dans la DB, ajoutez-la ici.
// ═══════════════════════════════════════════════════════════════════════════
interface ProductRow {
  is_active: boolean;
  title: string;
  brand: string;
  description: string;
  full_description?: string | null;
  image: string;
  gallery: string[];
  mockup_preset?: string | null;
  price: number;
  original_price?: number | null;
  in_stock: boolean;
  stock_quantity?: number | null;
  colors: string[];
  color_names?: string[] | null;
  sizes: string[];
  size_surcharge?: Record<string, number> | null;
  size_guide?: Record<string, { bust: number; length: number }> | null;
  category: "tshirt" | "hoodie" | "accessory" | "mug";
  event_type: "live" | "sport" | "culture" | "saisonnier";
  style: "cute" | "street" | "commute" | "cozy" | "retro";
  material?: string | null;
  tags: string[];
  is_best_seller?: boolean | null;
  is_limited_time?: boolean | null;
  deal_active?: boolean | null;
  deal_ends_at?: string | null;
  deal_price?: number | null;
  external_product_id?: string | null;
  external_variant_id?: string | null;
  last_external_sync?: string | null;
  ratings_score?: number | null;
  ratings_count?: number | null;
  bought_last_month?: number | null;
}

// ─── Helpers de mapping ──────────────────────────────────────────────────
const mapProduct = (row: any): AdminProduct => ({
  id: row.id,
  isActive: row.is_active,
  title: row.title,
  brand: row.brand,
  description: row.description,
  fullDescription: row.full_description,
  image: row.image,
  gallery: row.gallery,
  mockupPreset: row.mockup_preset,
  price: row.price,
  originalPrice: row.original_price,
  inStock: row.in_stock,
  stockQuantity: row.stock_quantity,
  colors: row.colors,
  colorNames: row.color_names,
  sizes: row.sizes,
  sizeSurcharge: row.size_surcharge,
  sizeGuide: row.size_guide,
  category: row.category,
  eventType: row.event_type,
  style: row.style,
  material: row.material,
  tags: row.tags,
  isBestSeller: row.is_best_seller,
  isLimitedTime: row.is_limited_time,
  dealActive: row.deal_active,
  dealEndsAt: row.deal_ends_at,
  dealPrice: row.deal_price,
  // affiliateMode: row.affiliate_mode,
  // affiliateUrl: row.affiliate_url,
  externalProductId: row.external_product_id,
  externalVariantId: row.external_variant_id,
  lastExternalSync: row.last_external_sync,
  ratings: {
    score: row.ratings_score ?? 0,
    count: row.ratings_count ?? 0,
  },
  boughtLastMonth: row.bought_last_month,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapOrder = (row: any): Order => ({
  id: row.id,
  clientId: row.client_id ?? "guest",
  clientName: row.client_name,
  clientEmail: row.client_email,
  createdAt: row.created_at,
  status: row.status as OrderStatus,
  totalAmount: row.total_amount,
  shippingCost: row.shipping_cost,
  shippingAddress: {
    fullName: row.shipping_address_full_name || "",
    address: row.shipping_address_address || "",
    city: row.shipping_address_city || "",
    zip: row.shipping_address_zip || "",
    country: row.shipping_address_country || "FR",
    phone: row.shipping_address_phone || "",
  },
  externalOrderId: row.external_order_id,
  notes: row.notes,
  items: [], // à remplir séparément
});

//  fonction helper
const mapHeroPromotion = (row: any): HeroPromotion => ({
  id: row.id,
  productId: row.product_id,
  title: row.title,
  headline: row.headline,
  sub: row.sub,
  cta: row.cta,
  bgGradient: row.bg_gradient,
  tag: row.tag,
  image: row.image,
  order: row.order,
  showTag: row.show_tag,
  showTitle: row.show_title,
});

// ─── API ──────────────────────────────────────────────────────────────────
export const productApi = {
  async list(): Promise<AdminProduct[]> {
    const { data, error } = await supabase.from("products").select("*");
    if (error) throw error;
    return (data ?? []).map(mapProduct);
  },
  async get(id: string): Promise<AdminProduct | null> {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return mapProduct(data);
  },

  async create(
    product: Omit<AdminProduct, "id" | "createdAt" | "updatedAt">,
  ): Promise<AdminProduct> {
    const row: ProductRow = {
      is_active: product.isActive,
      title: product.title,
      brand: product.brand,
      description: product.description,
      full_description: product.fullDescription,
      image: product.image,
      gallery: product.gallery,
      mockup_preset: product.mockupPreset,
      price: product.price,
      original_price: product.originalPrice,
      in_stock: product.inStock,
      stock_quantity: product.stockQuantity,
      colors: product.colors,
      color_names: product.colorNames,
      sizes: product.sizes,
      size_surcharge: product.sizeSurcharge,
      size_guide: product.sizeGuide,
      category: product.category,
      event_type: product.eventType,
      style: product.style,
      material: product.material,
      tags: product.tags,
      is_best_seller: product.isBestSeller,
      is_limited_time: product.isLimitedTime,
      deal_active: product.dealActive,
      deal_ends_at: product.dealEndsAt,
      deal_price: product.dealPrice,
      external_product_id: product.externalProductId,
      external_variant_id: product.externalVariantId,
      last_external_sync: product.lastExternalSync,
      ratings_score: product.ratings?.score ?? 5,
      ratings_count: product.ratings?.count ?? 0,
      bought_last_month: product.boughtLastMonth ?? 0,
    };
    const { data, error } = await supabase
      .from("products")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  },
  // async create(
  //   product: Omit<AdminProduct, "id" | "createdAt" | "updatedAt">,
  // ): Promise<AdminProduct> {
  //   const { data, error } = await supabase
  //     .from("products")
  //     .insert({
  //       ...product,
  //       is_active: product.isActive,
  //       full_description: product.fullDescription,
  //       original_price: product.originalPrice,
  //       in_stock: product.inStock,
  //       stock_quantity: product.stockQuantity,
  //       color_names: product.colorNames,
  //       size_surcharge: product.sizeSurcharge,
  //       size_guide: product.sizeGuide,
  //       event_type: product.eventType,
  //       is_best_seller: product.isBestSeller,
  //       is_limited_time: product.isLimitedTime,
  //       deal_active: product.dealActive,
  //       deal_ends_at: product.dealEndsAt,
  //       deal_price: product.dealPrice,
  //       // affiliate_mode: product.affiliateMode,
  //       // affiliate_url: product.affiliateUrl,
  //       external_product_id: product.externalProductId,
  //       external_variant_id: product.externalVariantId,
  //       last_external_sync: product.lastExternalSync,
  //       ratings_score: product.ratings?.score ?? 5,
  //       ratings_count: product.ratings?.count ?? 0,
  //       bought_last_month: product.boughtLastMonth ?? 0,
  //     })
  //     .select()
  //     .single();
  //   if (error) throw error;
  //   return mapProduct(data);
  // },

  // ⚠️ Ne pas utiliser de spread ici – mapper explicitement chaque colonne
  // pour éviter les erreurs "Could not find the column".
  async update(
    id: string,
    updates: Partial<AdminProduct>,
  ): Promise<AdminProduct> {
    const row: Partial<ProductRow> = {
      is_active: updates.isActive,
      title: updates.title,
      brand: updates.brand,
      description: updates.description,
      full_description: updates.fullDescription,
      image: updates.image,
      gallery: updates.gallery,
      mockup_preset: updates.mockupPreset,
      price: updates.price,
      original_price: updates.originalPrice,
      in_stock: updates.inStock,
      stock_quantity: updates.stockQuantity,
      colors: updates.colors,
      color_names: updates.colorNames,
      sizes: updates.sizes,
      size_surcharge: updates.sizeSurcharge,
      size_guide: updates.sizeGuide,
      category: updates.category,
      event_type: updates.eventType,
      style: updates.style,
      material: updates.material,
      tags: updates.tags,
      is_best_seller: updates.isBestSeller,
      is_limited_time: updates.isLimitedTime,
      deal_active: updates.dealActive,
      deal_ends_at: updates.dealEndsAt,
      deal_price: updates.dealPrice,
      external_product_id: updates.externalProductId,
      external_variant_id: updates.externalVariantId,
      last_external_sync: updates.lastExternalSync,
      ratings_score: updates.ratings?.score,
      ratings_count: updates.ratings?.count,
      bought_last_month: updates.boughtLastMonth,
    };
    const { data, error } = await supabase
      .from("products")
      .update(row)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  },

  // async update(
  //   id: string,
  //   updates: Partial<AdminProduct>,
  // ): Promise<AdminProduct> {
  //   const { data, error } = await supabase
  //     .from("products")
  //     .update({
  //       is_active: updates.isActive,
  //       title: updates.title,
  //       brand: updates.brand,
  //       description: updates.description,
  //       full_description: updates.fullDescription,
  //       image: updates.image,
  //       gallery: updates.gallery,
  //       mockup_preset: updates.mockupPreset,
  //       price: updates.price,
  //       original_price: updates.originalPrice,
  //       in_stock: updates.inStock,
  //       stock_quantity: updates.stockQuantity,
  //       colors: updates.colors,
  //       color_names: updates.colorNames,
  //       sizes: updates.sizes,
  //       size_surcharge: updates.sizeSurcharge,
  //       size_guide: updates.sizeGuide,
  //       category: updates.category,
  //       event_type: updates.eventType,
  //       style: updates.style,
  //       material: updates.material,
  //       tags: updates.tags,
  //       is_best_seller: updates.isBestSeller,
  //       is_limited_time: updates.isLimitedTime,
  //       deal_active: updates.dealActive,
  //       deal_ends_at: updates.dealEndsAt,
  //       deal_price: updates.dealPrice,
  //       // affiliate_mode: updates.affiliateMode,
  //       // affiliate_url: updates.affiliateUrl,
  //       external_product_id: updates.externalProductId,
  //       external_variant_id: updates.externalVariantId,
  //       last_external_sync: updates.lastExternalSync,
  //       ratings_score: updates.ratings?.score,
  //       ratings_count: updates.ratings?.count,
  //       bought_last_month: updates.boughtLastMonth,
  //     })
  //     .eq("id", id)
  //     .select()
  //     .single();
  //   if (error) throw error;
  //   return mapProduct(data);
  // },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },
  async bulkDelete(ids: string[]): Promise<void> {
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) throw error;
  },
  async bulkSetActive(ids: string[], isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from("products")
      .update({ is_active: isActive })
      .in("id", ids);
    if (error) throw error;
  },
  async duplicate(id: string): Promise<AdminProduct> {
    const orig = await this.get(id);
    if (!orig) throw new Error("Product not found");
    const { id: _, createdAt: _c, updatedAt: _u, ...rest } = orig;
    return this.create({
      ...rest,
      title: `${orig.title} (copie)`,
      isActive: false,
    });
  },
};

export const customerApi = {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase.from("customers").select("*");
    if (error) throw error;
    return (data ?? []).map((c: any) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      registrationDate: c.registration_date,
      lastLoginDate: c.last_login_date,
    }));
  },
  async get(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      registrationDate: data.registration_date,
      lastLoginDate: data.last_login_date,
    };
  },
  // ── Favoris ──────────────────────────────────────────────────────────
  async addFavourite(clientId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from("favourites")
      .upsert(
        { client_id: clientId, product_id: productId },
        { onConflict: "client_id, product_id" },
      );
    if (error) throw error;
  },
  async removeFavourite(clientId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from("favourites")
      .delete()
      .eq("client_id", clientId)
      .eq("product_id", productId);
    if (error) throw error;
  },
  async getFavourites(clientId: string): Promise<Favourite[]> {
    // Récupérer les favoris d'un client depuis Supabase
    const { data, error } = await supabase
      .from("favourites")
      .select("id, client_id, product_id, created_at")
      .eq("client_id", clientId);
    if (error) throw error;
    return (data ?? []).map((fav: any) => ({
      id: fav.id,
      clientId: fav.client_id,
      productId: fav.product_id,
      createdAt: fav.created_at,
      // On ne joint pas le produit complet ici pour simplifier
    }));
  },
  // ── Panier ───────────────────────────────────────────────────────────
  async clearCart(clientId: string): Promise<void> {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("client_id", clientId);
    if (error) throw error;
  },
  async addCartItem(
    clientId: string,
    item: {
      productId: string;
      selectedColor: string;
      selectedSize: string;
      quantity: number;
    },
  ): Promise<void> {
    const { error } = await supabase.from("cart_items").upsert(
      {
        client_id: clientId,
        product_id: item.productId,
        selected_color: item.selectedColor,
        selected_size: item.selectedSize,
        quantity: item.quantity,
      },
      { onConflict: "client_id, product_id, selected_color, selected_size" },
    );
    if (error) throw error;
  },
  async getCart(clientId: string): Promise<AdminCartItem[]> {
    const { data, error } = await supabase
      .from("cart_items")
      .select(
        "id, client_id, product_id, selected_color, selected_size, quantity, added_at",
      )
      .eq("client_id", clientId);
    if (error) throw error;
    return (data ?? []).map((item: any) => ({
      id: item.id,
      clientId: item.client_id,
      productId: item.product_id,
      selectedColor: item.selected_color,
      selectedSize: item.selected_size,
      quantity: item.quantity,
      addedAt: item.added_at,
    }));
  },
  async getOrders(clientId: string): Promise<Order[]> {
    // Utiliser orderApi pour obtenir les commandes d'un client
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("client_id", clientId);
    if (error) throw error;
    const ordersMapped = (orders ?? []).map(mapOrder);
    for (const order of ordersMapped) {
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);
      order.items = (items ?? []).map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        productTitle: item.product_title,
        productImage: item.product_image,
        selectedColor: item.selected_color,
        selectedSize: item.selected_size,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      }));
    }
    return ordersMapped;
  },
};

export const orderApi = {
  async list(): Promise<Order[]> {
    const { data: orders, error } = await supabase.from("orders").select("*");
    if (error) throw error;
    const ordersMapped = (orders ?? []).map(mapOrder);
    // Récupérer les items pour chaque commande
    for (const order of ordersMapped) {
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);
      order.items = (items ?? []).map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        productTitle: item.product_title,
        productImage: item.product_image,
        selectedColor: item.selected_color,
        selectedSize: item.selected_size,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      }));
    }
    return ordersMapped;
  },
  async get(id: string): Promise<Order | null> {
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !order) return null;
    const mapped = mapOrder(order);
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id);
    mapped.items = (items ?? []).map((item: any) => ({
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id,
      productTitle: item.product_title,
      productImage: item.product_image,
      selectedColor: item.selected_color,
      selectedSize: item.selected_size,
      quantity: item.quantity,
      unitPrice: item.unit_price,
    }));
    return mapped;
  },
  async create(order: Order): Promise<Order> {
    const { error } = await supabase.from("orders").insert({
      id: order.id,
      client_id: order.clientId,
      client_name: order.clientName,
      client_email: order.clientEmail,
      created_at: order.createdAt,
      status: order.status,
      total_amount: order.totalAmount,
      shipping_cost: order.shippingCost,
      shipping_address_full_name: order.shippingAddress.fullName,
      shipping_address_address: order.shippingAddress.address,
      shipping_address_city: order.shippingAddress.city,
      shipping_address_zip: order.shippingAddress.zip,
      shipping_address_country: order.shippingAddress.country,
      shipping_address_phone: order.shippingAddress.phone,
      notes: order.notes,
      external_order_id: order.externalOrderId,
    });
    if (error) throw error;
    // Insérer les items
    for (const item of order.items) {
      await supabase.from("order_items").insert({
        id: item.id,
        order_id: item.orderId,
        product_id: item.productId,
        product_title: item.productTitle,
        product_image: item.productImage,
        selected_color: item.selectedColor,
        selected_size: item.selectedSize,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      });
    }
    return order;
  },
  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);
    if (error) throw error;
  },
  async exportCsv(): Promise<string> {
    const orders = await this.list();
    const header = "ID,Client,Date,Statut,Montant,Livraison\n";
    const rows = orders
      .map((o) =>
        [
          o.id,
          o.clientEmail ?? o.clientId,
          o.createdAt.split("T")[0],
          o.status,
          o.totalAmount,
          o.shippingCost,
        ].join(","),
      )
      .join("\n");
    return header + rows;
  },
};

export const podApi = {
  async getSettings(): Promise<PodSettings> {
    const { data, error } = await supabase
      .from("pod_settings")
      .select("*")
      .limit(1)
      .maybeSingle(); // ne jette pas d'erreur si aucune ligne
    if (error) throw error;
    // Si aucune ligne, retourner les valeurs par défaut
    if (!data) {
      return {
        id: "pod-main",
        apiKey: "",
        storeId: undefined,
        storeName: "InstaWear Boutique",
        isConnected: false,
        lastSyncAt: undefined,
        productsSyncedCount: 0,
        syncStatus: "idle",
      };
    }
    return {
      id: data.id,
      apiKey: data.api_key,
      storeId: data.store_id,
      storeName: data.store_name,
      isConnected: data.is_connected,
      lastSyncAt: data.last_sync_at,
      productsSyncedCount: data.products_synced_count,
      syncStatus: data.sync_status,
    };
  },
  async saveSettings(partial: Partial<PodSettings>): Promise<PodSettings> {
    const { data, error } = await supabase
      .from("pod_settings")
      .upsert({
        id: "pod-main",
        api_key: partial.apiKey ?? "",
        store_id: partial.storeId,
        store_name: partial.storeName ?? "InstaWear Boutique",
        is_connected: partial.isConnected ?? false,
        last_sync_at: partial.lastSyncAt,
        products_synced_count: partial.productsSyncedCount ?? 0,
        sync_status: partial.syncStatus ?? "idle",
      })
      .select()
      .single();
    if (error) throw error;
    return this.getSettings();
  },
  async sync(): Promise<{ settings: PodSettings; log: SyncLog }> {
    const start = Date.now();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-printful`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Erreur Edge Function");
    }
    const result = await res.json();

    const settings = await this.getSettings();
    const log: SyncLog = {
      id: `log-${Date.now()}`,
      syncDate: new Date().toISOString(),
      status: "success",
      message: `${result.syncedCount} produits synchronisés avec Printful.`,
      duration: Date.now() - start,
    };
    await supabase.from("sync_logs").insert({
      id: log.id,
      sync_date: log.syncDate,
      status: log.status,
      message: log.message,
      duration: log.duration,
    });
    return { settings, log };
  },
  async getSyncLogs(): Promise<SyncLog[]> {
    const { data, error } = await supabase
      .from("sync_logs")
      .select("*")
      .order("sync_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((log: any) => ({
      id: log.id,
      syncDate: log.sync_date,
      status: log.status,
      message: log.message,
      productId: log.product_id,
      duration: log.duration,
    }));
  },
};

export const storeSettingsApi = {
  async get(): Promise<StoreSettings> {
    const { data, error } = await supabase
      .from("store_settings")
      .select("*")
      .eq("id", true)
      .single();
    if (error || !data) {
      // Valeurs par défaut si la ligne n'existe pas encore
      return {
        storeName: "InstaWear",
        currency: "EUR",
        country: "FR",
        freeShippingThreshold: 35,
        shippingCost: 4.99,
        shippingDelay: "3-5 jours ouvrés",
        globalCountdownEnd: undefined,
      };
    }
    return {
      storeName: data.store_name,
      currency: data.currency,
      country: data.country,
      freeShippingThreshold: data.free_shipping_threshold,
      shippingCost: data.shipping_cost,
      shippingDelay: data.shipping_delay,
      globalCountdownEnd: data.global_countdown_end,
    };
  },
  async save(partial: Partial<StoreSettings>): Promise<StoreSettings> {
    const { error } = await supabase.from("store_settings").upsert({
      id: true,
      store_name: partial.storeName ?? "InstaWear",
      currency: partial.currency ?? "EUR",
      country: partial.country ?? "FR",
      free_shipping_threshold: partial.freeShippingThreshold ?? 35,
      shipping_cost: partial.shippingCost ?? 4.99,
      shipping_delay: partial.shippingDelay ?? "3-5 jours ouvrés",
      global_countdown_end: partial.globalCountdownEnd,
    });
    if (error) throw error;
    return this.get();
  },
};

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const [products, customers, orders, pod] = await Promise.all([
      productApi.list(),
      customerApi.list(),
      orderApi.list(),
      podApi.getSettings(),
    ]);
    const today = new Date().toDateString();
    const ordersToday = orders.filter(
      (o) => new Date(o.createdAt).toDateString() === today,
    );
    return {
      productsOnline: products.filter((p) => p.isActive).length,
      productsOffline: products.filter((p) => !p.isActive).length,
      totalCustomers: customers.length,
      ordersToday: ordersToday.length,
      revenueEstimate: orders.reduce((acc, o) => acc + o.totalAmount, 0),
      podConnected: pod.isConnected,
      recentOrders: orders.slice(0, 5),
      recentProducts: products.slice(0, 4),
    };
  },

  async getOrdersByDay(
    days: number,
  ): Promise<{ date: string; count: number }[]> {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data, error } = await supabase
      .from("orders")
      .select("created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const counts: Record<string, number> = {};
    (data ?? []).forEach((o: any) => {
      const day = o.created_at.split("T")[0]; // extraire YYYY-MM-DD
      counts[day] = (counts[day] || 0) + 1;
    });
    // Remplir tous les jours sur la période, même sans commande
    const result: { date: string; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split("T")[0];
      result.push({ date: key, count: counts[key] || 0 });
    }
    return result;
  },
};

export const adminUserApi = {
  async list(): Promise<AdminUser[]> {
    const { data, error } = await supabase.from("admin_users").select("*");
    if (error) throw error;
    return (data ?? []).map((u: any) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      createdAt: u.created_at,
      lastLoginDate: u.last_login_date,
    }));
  },
  async create(
    admin: Omit<AdminUser, "id" | "createdAt"> & { passwordHash?: string },
  ): Promise<AdminUser> {
    // Créer d'abord un utilisateur auth via Supabase (si nécessaire)
    // Pour simplifier, nous faisons l'insertion directe dans admin_users (le mot de passe doit être géré via Auth).
    const { data, error } = await supabase
      .from("admin_users")
      .insert({
        email: admin.email,
        role: admin.role,
        password_hash: admin.passwordHash ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      email: data.email,
      role: data.role,
      createdAt: data.created_at,
      lastLoginDate: data.last_login_date,
    };
  },
  async update(id: string, partial: Partial<AdminUser>): Promise<AdminUser> {
    const { data, error } = await supabase
      .from("admin_users")
      .update(partial)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("admin_users").delete().eq("id", id);
    if (error) throw error;
  },
};
// ─── Hero Promotions ───────────────────────────────────────────────────
export const heroPromotionsApi = {
  async list(): Promise<HeroPromotion[]> {
    const { data, error } = await supabase
      .from("hero_promotions")
      .select("*")
      .order("order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapHeroPromotion);
  },
  async create(promo: Omit<HeroPromotion, "id">): Promise<HeroPromotion> {
    const { data, error } = await supabase
      .from("hero_promotions")
      .insert({
        product_id: promo.productId,
        title: promo.title,
        headline: promo.headline,
        sub: promo.sub,
        cta: promo.cta,
        bg_gradient: promo.bgGradient,
        tag: promo.tag,
        image: promo.image,
        order: promo.order,
        show_tag: promo.showTag,
        show_title: promo.showTitle,
      })
      .select()
      .single();
    if (error) throw error;
    return mapHeroPromotion(data);
  },
  async update(
    id: string,
    promo: Partial<HeroPromotion>,
  ): Promise<HeroPromotion> {
    const { data, error } = await supabase
      .from("hero_promotions")
      .update({
        product_id: promo.productId,
        title: promo.title,
        headline: promo.headline,
        sub: promo.sub,
        cta: promo.cta,
        bg_gradient: promo.bgGradient,
        tag: promo.tag,
        image: promo.image,
        order: promo.order,
        show_tag: promo.showTag,
        show_title: promo.showTitle,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapHeroPromotion(data);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("hero_promotions")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
  async reorder(ids: string[]): Promise<void> {
    for (let i = 0; i < ids.length; i++) {
      await supabase
        .from("hero_promotions")
        .update({ order: i })
        .eq("id", ids[i]);
    }
  },
};

export const apiConnectionsApi = {
  async list(): Promise<ApiConnection[]> {
    const { data, error } = await supabase
      .from("api_connections")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      service: row.service,
      baseUrl: row.base_url,
      apiKey: row.api_key,
      apiSecret: row.api_secret,
      enabled: row.enabled,
      lastSyncAt: row.last_sync_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
  async create(
    api: Omit<ApiConnection, "id" | "createdAt" | "updatedAt">,
  ): Promise<ApiConnection> {
    const { data, error } = await supabase
      .from("api_connections")
      .insert({
        name: api.name,
        type: api.type,
        service: api.service,
        base_url: api.baseUrl,
        api_key: api.apiKey,
        api_secret: api.apiSecret,
        enabled: api.enabled ?? true,
        last_sync_at: api.lastSyncAt,
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      service: data.service,
      baseUrl: data.base_url,
      apiKey: data.api_key,
      apiSecret: data.api_secret,
      enabled: data.enabled,
      lastSyncAt: data.last_sync_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
  async update(
    id: string,
    updates: Partial<ApiConnection>,
  ): Promise<ApiConnection> {
    const { data, error } = await supabase
      .from("api_connections")
      .update({
        name: updates.name,
        type: updates.type,
        service: updates.service,
        base_url: updates.baseUrl,
        api_key: updates.apiKey,
        api_secret: updates.apiSecret,
        enabled: updates.enabled,
        last_sync_at: updates.lastSyncAt,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      type: data.type,
      service: data.service,
      baseUrl: data.base_url,
      apiKey: data.api_key,
      apiSecret: data.api_secret,
      enabled: data.enabled,
      lastSyncAt: data.last_sync_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("api_connections")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
