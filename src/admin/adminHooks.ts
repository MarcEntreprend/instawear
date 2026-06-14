import { useState, useEffect, useCallback } from "react";
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
  productApi,
  customerApi,
  orderApi,
  podApi,
  adminUserApi,
  storeSettingsApi,
  dashboardApi,
} from "./adminApi";

// ─── Generic async hook ───────────────────────────────────────────────────
function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export function useDashboard() {
  return useAsync<DashboardStats>(() => dashboardApi.getStats());
}

// ─── Products ─────────────────────────────────────────────────────────────
export function useProducts() {
  const { data, loading, error, refetch } = useAsync<AdminProduct[]>(() =>
    productApi.list(),
  );
  const [saving, setSaving] = useState(false);

  const createProduct = useCallback(
    async (data: Omit<AdminProduct, "id" | "createdAt" | "updatedAt">) => {
      setSaving(true);
      try {
        const p = await productApi.create(data);
        refetch();
        return p;
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const updateProduct = useCallback(
    async (id: string, patch: Partial<AdminProduct>) => {
      setSaving(true);
      try {
        const p = await productApi.update(id, patch);
        refetch();
        return p;
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await productApi.delete(id);
      refetch();
    },
    [refetch],
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      await productApi.bulkDelete(ids);
      refetch();
    },
    [refetch],
  );

  const bulkSetActive = useCallback(
    async (ids: string[], isActive: boolean) => {
      await productApi.bulkSetActive(ids, isActive);
      refetch();
    },
    [refetch],
  );

  const duplicateProduct = useCallback(
    async (id: string) => {
      await productApi.duplicate(id);
      refetch();
    },
    [refetch],
  );

  return {
    products: data ?? [],
    loading,
    error,
    saving,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkDelete,
    bulkSetActive,
    duplicateProduct,
  };
}

export function useProduct(id: string | null) {
  return useAsync<AdminProduct | null>(
    () => (id ? productApi.get(id) : Promise.resolve(null)),
    [id],
  );
}

// ─── Customers ────────────────────────────────────────────────────────────
export function useCustomers() {
  return useAsync<Customer[]>(() => customerApi.list());
}

export function useCustomerDetail(id: string | null) {
  const [data, setData] = useState<{
    customer: Customer | null;
    favourites: Favourite[];
    cart: AdminCartItem[];
    orders: Order[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [customer, favourites, cart, orders] = await Promise.all([
        customerApi.get(id),
        customerApi.getFavourites(id),
        customerApi.getCart(id),
        customerApi.getOrders(id),
      ]);
      setData({ customer, favourites, cart, orders });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Orders ───────────────────────────────────────────────────────────────
export function useOrders() {
  const { data, loading, error, refetch } = useAsync<Order[]>(() =>
    orderApi.list(),
  );
  const [saving, setSaving] = useState(false);

  const updateStatus = useCallback(
    async (id: string, status: OrderStatus) => {
      setSaving(true);
      try {
        await orderApi.updateStatus(id, status);
        refetch();
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const exportCsv = useCallback(async () => {
    const csv = await orderApi.exportCsv();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-instawear-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    orders: data ?? [],
    loading,
    error,
    saving,
    refetch,
    updateStatus,
    exportCsv,
  };
}

// ─── POD ─────────────────────────────────────────────────────────────────
export function usePod() {
  const { data, loading, error, refetch } = useAsync<PodSettings>(() =>
    podApi.getSettings(),
  );
  const logsResult = useAsync<SyncLog[]>(() => podApi.getSyncLogs());
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveSettings = useCallback(
    async (patch: Partial<PodSettings>) => {
      setSaving(true);
      try {
        await podApi.saveSettings(patch);
        refetch();
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const triggerSync = useCallback(async () => {
    setSyncing(true);
    try {
      await podApi.sync();
      refetch();
      logsResult.refetch();
    } finally {
      setSyncing(false);
    }
  }, [refetch, logsResult]);

  return {
    settings: data,
    logs: logsResult.data ?? [],
    loading,
    error,
    syncing,
    saving,
    saveSettings,
    triggerSync,
  };
}

// ─── Admin Users ──────────────────────────────────────────────────────────
export function useAdminUsers() {
  const { data, loading, error, refetch } = useAsync<AdminUser[]>(() =>
    adminUserApi.list(),
  );
  const [saving, setSaving] = useState(false);

  const createUser = useCallback(
    async (d: Omit<AdminUser, "id" | "createdAt">) => {
      setSaving(true);
      try {
        await adminUserApi.create(d);
        refetch();
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const updateUser = useCallback(
    async (id: string, d: Partial<AdminUser>) => {
      setSaving(true);
      try {
        await adminUserApi.update(id, d);
        refetch();
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  const deleteUser = useCallback(
    async (id: string) => {
      await adminUserApi.delete(id);
      refetch();
    },
    [refetch],
  );

  return {
    users: data ?? [],
    loading,
    error,
    saving,
    createUser,
    updateUser,
    deleteUser,
  };
}

// ─── Store Settings ───────────────────────────────────────────────────────
export function useStoreSettings() {
  const { data, loading, error, refetch } = useAsync<StoreSettings>(() =>
    storeSettingsApi.get(),
  );
  const [saving, setSaving] = useState(false);

  const save = useCallback(
    async (patch: Partial<StoreSettings>) => {
      setSaving(true);
      try {
        await storeSettingsApi.save(patch);
        refetch();
      } finally {
        setSaving(false);
      }
    },
    [refetch],
  );

  return { settings: data, loading, error, saving, save };
}
