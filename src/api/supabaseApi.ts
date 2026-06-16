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
} from "../admin/adminTypes";

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
  affiliateMode: row.affiliate_mode,
  affiliateUrl: row.affiliate_url,
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
    const { data, error } = await supabase
      .from("products")
      .insert({
        ...product,
        is_active: product.isActive,
        full_description: product.fullDescription,
        original_price: product.originalPrice,
        in_stock: product.inStock,
        stock_quantity: product.stockQuantity,
        color_names: product.colorNames,
        size_surcharge: product.sizeSurcharge,
        size_guide: product.sizeGuide,
        event_type: product.eventType,
        is_best_seller: product.isBestSeller,
        is_limited_time: product.isLimitedTime,
        deal_active: product.dealActive,
        deal_ends_at: product.dealEndsAt,
        deal_price: product.dealPrice,
        affiliate_mode: product.affiliateMode,
        affiliate_url: product.affiliateUrl,
        external_product_id: product.externalProductId,
        external_variant_id: product.externalVariantId,
        last_external_sync: product.lastExternalSync,
        ratings_score: product.ratings?.score ?? 5,
        ratings_count: product.ratings?.count ?? 0,
        bought_last_month: product.boughtLastMonth ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  },
  async update(
    id: string,
    updates: Partial<AdminProduct>,
  ): Promise<AdminProduct> {
    const { data, error } = await supabase
      .from("products")
      .update({
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
        affiliate_mode: updates.affiliateMode,
        affiliate_url: updates.affiliateUrl,
        external_product_id: updates.externalProductId,
        external_variant_id: updates.externalVariantId,
        last_external_sync: updates.lastExternalSync,
        ratings_score: updates.ratings?.score,
        ratings_count: updates.ratings?.count,
        bought_last_month: updates.boughtLastMonth,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return mapProduct(data);
  },
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
    // Simule une synchronisation (pourra être améliorée plus tard)
    const settings = await this.getSettings();
    const updated = await this.saveSettings({
      ...settings,
      syncStatus: "synced",
      lastSyncAt: new Date().toISOString(),
      productsSyncedCount: (await productApi.list()).length,
      isConnected: settings.apiKey.length > 5,
    });
    const log: SyncLog = {
      id: `log-${Date.now()}`,
      syncDate: new Date().toISOString(),
      status: "success",
      message: `${updated.productsSyncedCount} produits synchronisés.`,
      duration: 1200,
    };
    // Insérer le log dans la table sync_logs (optionnel)
    await supabase.from("sync_logs").insert({
      id: log.id,
      sync_date: log.syncDate,
      status: log.status,
      message: log.message,
      duration: log.duration,
    });
    return { settings: updated, log };
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
    admin: Omit<AdminUser, "id" | "createdAt"> & { passwordHash: string },
  ): Promise<AdminUser> {
    // Créer d'abord un utilisateur auth via Supabase (si nécessaire)
    // Pour simplifier, nous faisons l'insertion directe dans admin_users (le mot de passe doit être géré via Auth).
    const { data, error } = await supabase
      .from("admin_users")
      .insert({
        email: admin.email,
        role: admin.role,
        password_hash: admin.passwordHash, // temporaire, à terme géré par Auth
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
