// src\admin\adminApi.ts

/**
 * adminApi.ts
 * Simulated API layer. Each function mirrors the shape it would have
 * against a real REST/GraphQL backend. Replace the bodies with real
 * fetch() calls when the backend is ready.
 */

import {
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
} from "./adminTypes";

import {
  MOCK_PRODUCTS,
  MOCK_CUSTOMERS,
  MOCK_ORDERS,
  MOCK_POD_SETTINGS,
  MOCK_SYNC_LOGS,
  MOCK_ADMIN_USERS,
  MOCK_STORE_SETTINGS,
} from "./adminMocks";

// ─── Utility ──────────────────────────────────────────────────────────────
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

const PLACEHOLDER_IMG =
  "https://cdn.pixabay.com/photo/2026/01/26/22/44/cat-10089737_1280.png";

// ─── Products ─────────────────────────────────────────────────────────────
export const productApi = {
  async list(): Promise<AdminProduct[]> {
    await delay();
    const stored = localStorage.getItem("admin_products");
    return stored ? JSON.parse(stored) : MOCK_PRODUCTS;
  },

  async get(id: string): Promise<AdminProduct | null> {
    const list = await productApi.list();
    return list.find((p) => p.id === id) ?? null;
  },

  async create(
    data: Omit<AdminProduct, "id" | "createdAt" | "updatedAt">,
  ): Promise<AdminProduct> {
    await delay();
    const list = await productApi.list();
    const now = new Date().toISOString();
    const product: AdminProduct = {
      ...data,
      id: `prod-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [product, ...list];
    localStorage.setItem("admin_products", JSON.stringify(updated));
    return product;
  },

  async update(id: string, data: Partial<AdminProduct>): Promise<AdminProduct> {
    await delay();
    const list = await productApi.list();
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error("Product not found");
    const updated = {
      ...list[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    localStorage.setItem("admin_products", JSON.stringify(list));
    return updated;
  },

  async delete(id: string): Promise<void> {
    await delay();
    const list = await productApi.list();
    localStorage.setItem(
      "admin_products",
      JSON.stringify(list.filter((p) => p.id !== id)),
    );
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await delay();
    const list = await productApi.list();
    localStorage.setItem(
      "admin_products",
      JSON.stringify(list.filter((p) => !ids.includes(p.id))),
    );
  },

  async bulkSetActive(ids: string[], isActive: boolean): Promise<void> {
    await delay();
    const list = await productApi.list();
    const updated = list.map((p) =>
      ids.includes(p.id)
        ? { ...p, isActive, updatedAt: new Date().toISOString() }
        : p,
    );
    localStorage.setItem("admin_products", JSON.stringify(updated));
  },

  async duplicate(id: string): Promise<AdminProduct> {
    const orig = await productApi.get(id);
    if (!orig) throw new Error("Product not found");
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = orig;
    return productApi.create({
      ...rest,
      title: `${orig.title} (copie)`,
      isActive: false,
    });
  },
};

// ─── Customers ────────────────────────────────────────────────────────────
export const customerApi = {
  async list(): Promise<Customer[]> {
    await delay();
    return MOCK_CUSTOMERS;
  },

  async get(id: string): Promise<Customer | null> {
    const list = await customerApi.list();
    return list.find((c) => c.id === id) ?? null;
  },

  async getFavourites(clientId: string): Promise<Favourite[]> {
    await delay();
    const products = await productApi.list();
    return products.slice(0, 3).map((p, i) => ({
      id: `fav-${i}`,
      clientId,
      productId: p.id,
      createdAt: new Date().toISOString(),
      product: p,
    }));
  },

  async getCart(clientId: string): Promise<AdminCartItem[]> {
    await delay();
    const products = await productApi.list();
    return products.slice(0, 2).map((p, i) => ({
      id: `cart-${i}`,
      clientId,
      productId: p.id,
      selectedColor: p.colors[0],
      selectedSize: p.sizes[0] ?? "M",
      quantity: i + 1,
      addedAt: new Date().toISOString(),
      product: p,
    }));
  },

  async getOrders(clientId: string): Promise<Order[]> {
    await delay();
    return MOCK_ORDERS.filter((o) => o.clientId === clientId);
  },
};

// ─── Orders ───────────────────────────────────────────────────────────────
//  fonction orderApi.list()
export const orderApi = {
  async list(): Promise<Order[]> {
    await delay();
    // Fusionne les commandes mockées avec les commandes locales (passées par le checkout)
    const localOrders: Order[] = [];
    try {
      const stored = localStorage.getItem("instawear-orders");
      if (stored) {
        const raw = JSON.parse(stored);
        localOrders.push(
          ...raw.map((o: any) => ({
            id: o.id,
            clientId: o.clientEmail || o.clientPhone || "guest",
            clientName: o.clientName,
            clientEmail: o.clientEmail || null,
            createdAt: o.createdAt,
            status: o.status as OrderStatus,
            totalAmount: o.totalAmount,
            shippingCost: o.shippingCost,
            shippingAddress: {
              fullName: o.clientName,
              address: o.address || "Non renseignée",
              city: "",
              zip: "",
              country: "FR",
              phone: o.clientPhone,
            },
            notes: o.message || "",
            items: (o.items || []).map((item: any) => ({
              id: item.productId,
              orderId: o.id,
              productId: item.productId,
              productTitle: item.title,
              productImage: PLACEHOLDER_IMG,
              selectedColor: item.selectedColor,
              selectedSize: item.selectedSize,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          })),
        );
      }
    } catch (e) {
      /* ignore */
    }
    return [...localOrders, ...MOCK_ORDERS];
  },

  async get(id: string): Promise<Order | null> {
    const list = await orderApi.list();
    return list.find((o) => o.id === id) ?? null;
  },

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    await delay();
    const order = MOCK_ORDERS.find((o) => o.id === id);
    if (!order) throw new Error("Order not found");
    order.status = status;
    return order;
  },

  async exportCsv(): Promise<string> {
    await delay();
    const orders = await orderApi.list();
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

// ─── POD Settings ─────────────────────────────────────────────────────────
export const podApi = {
  async getSettings(): Promise<PodSettings> {
    await delay();
    const stored = localStorage.getItem("admin_pod_settings");
    return stored ? JSON.parse(stored) : MOCK_POD_SETTINGS;
  },

  async saveSettings(data: Partial<PodSettings>): Promise<PodSettings> {
    await delay();
    const current = await podApi.getSettings();
    const updated: PodSettings = {
      ...current,
      ...data,
      isConnected: (data.apiKey ?? current.apiKey).length > 5,
    };
    localStorage.setItem("admin_pod_settings", JSON.stringify(updated));
    return updated;
  },

  async sync(): Promise<{ settings: PodSettings; log: SyncLog }> {
    await delay(1800);
    const settings = await podApi.getSettings();
    const products = await productApi.list();
    const updated: PodSettings = {
      ...settings,
      syncStatus: "synced",
      lastSyncAt: new Date().toISOString(),
      productsSyncedCount: products.length,
    };
    localStorage.setItem("admin_pod_settings", JSON.stringify(updated));
    const log: SyncLog = {
      id: `log-${Date.now()}`,
      syncDate: new Date().toISOString(),
      status: "success",
      message: `${products.length} produits synchronisés avec succès.`,
      duration: 1843,
    };
    return { settings: updated, log };
  },

  async getSyncLogs(): Promise<SyncLog[]> {
    await delay();
    return MOCK_SYNC_LOGS;
  },
};

// ─── Admin Users ──────────────────────────────────────────────────────────
export const adminUserApi = {
  async list(): Promise<AdminUser[]> {
    await delay();
    return MOCK_ADMIN_USERS;
  },

  async create(data: Omit<AdminUser, "id" | "createdAt">): Promise<AdminUser> {
    await delay();
    return {
      ...data,
      id: `admin-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
  },

  async update(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    await delay();
    const user = MOCK_ADMIN_USERS.find((u) => u.id === id);
    if (!user) throw new Error("User not found");
    return { ...user, ...data };
  },

  async delete(id: string): Promise<void> {
    await delay();
    const idx = MOCK_ADMIN_USERS.findIndex((u) => u.id === id);
    if (idx !== -1) MOCK_ADMIN_USERS.splice(idx, 1);
  },
};

// ─── Store Settings ───────────────────────────────────────────────────────
export const storeSettingsApi = {
  async get(): Promise<StoreSettings> {
    await delay();
    const stored = localStorage.getItem("admin_store_settings");
    return stored ? JSON.parse(stored) : MOCK_STORE_SETTINGS;
  },

  async save(data: Partial<StoreSettings>): Promise<StoreSettings> {
    await delay();
    const current = await storeSettingsApi.get();
    const updated = { ...current, ...data };
    localStorage.setItem("admin_store_settings", JSON.stringify(updated));
    return updated;
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────
export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    await delay();
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
};
