// src/admin/SettingsPage.tsx

import React, { useState, useEffect } from "react";
import {
  Store,
  Truck,
  Package,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Save,
  ExternalLink,
  Clock,
  Tag,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { usePod, useStoreSettings, useReferenceLists } from "./adminHooks";
import { StoreSettings, SyncLog } from "./adminTypes";
import { apiConnectionsApi, referenceListApi } from "../api/supabaseApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (value: number) =>
  value.toFixed(2).replace(".", ",") + " $";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const LOG_STATUS_ICON: Record<
  string,
  { icon: React.ReactNode; color: string }
> = {
  success: {
    icon: <CheckCircle size={14} strokeWidth={2} />,
    color: "var(--color-success)",
  },
  partial: {
    icon: <AlertCircle size={14} strokeWidth={2} />,
    color: "#d97706",
  },
  error: {
    icon: <AlertCircle size={14} strokeWidth={2} />,
    color: "#ef4444",
  },
};

// ─── Types locaux pour la gestion des API ────────────────────────────────────
interface ApiConnection {
  id: string;
  name: string;
  type: "pod" | "affiliate";
  service: string;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  enabled: boolean;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  // ═══════════════════════════════════════════════════════════════════════
  // Tous les hooks doivent être appelés avant tout return conditionnel
  // ═══════════════════════════════════════════════════════════════════════

  // Hooks de données
  const {
    settings: podSettings,
    loading: podLoading,
    saving: podSaving,
    syncing,
    saveSettings,
    triggerSync,
    logs,
  } = usePod();
  const {
    settings: storeSettings,
    loading: storeLoading,
    saving: storeSaving,
    save: saveStore,
  } = useStoreSettings();

  // States pour les formulaires
  const [podForm, setPodForm] = useState<{ apiKey: string; storeId: string }>({
    apiKey: "",
    storeId: "",
  });
  const [storeForm, setStoreForm] = useState<StoreSettings>({
    storeName: "",
    currency: "EUR",
    country: "FR",
    freeShippingThreshold: 35,
    shippingCost: 4.99,
    shippingDelay: "5-7 jours ouvrés",
    globalCountdownEnd: "",
  });

  //
  const [apiConnections, setApiConnections] = useState<ApiConnection[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  const [showApiModal, setShowApiModal] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiConnection | null>(null);
  const [apiForm, setApiForm] = useState<
    Omit<ApiConnection, "id" | "enabled" | "createdAt" | "updatedAt">
  >({
    name: "",
    type: "pod",
    service: "",
    baseUrl: "",
    apiKey: "",
    apiSecret: "",
  });

  //Charger les connexions depuis Supabase au montage
  useEffect(() => {
    apiConnectionsApi
      .list()
      .then(setApiConnections)
      .catch(console.error)
      .finally(() => setApiLoading(false));
  }, []);

  // Effets
  React.useEffect(() => {
    if (podSettings) {
      setPodForm({
        apiKey: podSettings.apiKey || "",
        storeId: podSettings.storeId || "",
      });
    }
  }, [podSettings]);

  React.useEffect(() => {
    if (storeSettings) {
      setStoreForm(storeSettings);
    }
  }, [storeSettings]);

  // Handlers Pod / Store
  const handleSavePod = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({
      apiKey: podForm.apiKey,
      storeId: podForm.storeId,
      isConnected: true,
    });

    import("../api/supabaseApi").then(({ notificationApi }) => {
      notificationApi
        .create({
          title: "Clé API Printful enregistrée",
          description: `Store ID: ${podForm.storeId || "N/A"}`,
          category: "api",
          priority: "low",
          metadata: { source: "Printful", linkTo: "/admin/settings" },
          action_label: "Voir les paramètres",
        })
        .catch(() => {});
    });
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveStore(storeForm);
    // Notifie tous les composants qu'ils doivent relire la devise / les paramètres
    window.dispatchEvent(new Event("store-settings-updated"));

    import("../api/supabaseApi").then(({ notificationApi }) => {
      notificationApi
        .create({
          title: "Paramètres boutique mis à jour",
          description: `Devise: ${storeForm.currency}, Pays: ${storeForm.country}, Livraison gratuite: ${storeForm.freeShippingThreshold}`,
          category: "api",
          priority: "low",
          metadata: { source: "Système", linkTo: "/admin/settings" },
          action_label: "Voir les paramètres",
        })
        .catch(() => {});
    });
  };

  const handleSync = async () => {
    await triggerSync();
  };

  // Handlers API

  const handleAddApi = () => {
    setEditingApi(null);
    setApiForm({
      name: "",
      type: "pod",
      service: "",
      baseUrl: "",
      apiKey: "",
      apiSecret: "",
    });
    setShowApiModal(true);
  };

  const handleEditApi = (api: ApiConnection) => {
    setEditingApi(api);
    setApiForm({
      name: api.name,
      type: api.type,
      service: api.service,
      baseUrl: api.baseUrl,
      apiKey: api.apiKey,
      apiSecret: api.apiSecret,
    });
    setShowApiModal(true);
  };

  const handleSaveApi = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingApi) {
        const updated = await apiConnectionsApi.update(editingApi.id, apiForm);
        setApiConnections((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a)),
        );
      } else {
        const created = await apiConnectionsApi.create(apiForm as any);
        setApiConnections((prev) => [...prev, created]);
      }
      setShowApiModal(false);
    } catch (err) {
      console.error("Erreur sauvegarde API connection", err);
    }
  };

  const handleDeleteApi = async (id: string) => {
    if (window.confirm("Supprimer définitivement cette connexion API ?")) {
      await apiConnectionsApi.delete(id);
      setApiConnections((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleToggleApi = async (id: string) => {
    const api = apiConnections.find((a) => a.id === id);
    if (!api) return;
    const updated = await apiConnectionsApi.update(id, {
      enabled: !api.enabled,
    });
    setApiConnections((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  };

  const handleSyncApi = async (id: string) => {
    const updated = await apiConnectionsApi.update(id, {
      lastSyncAt: new Date().toISOString(),
    });
    setApiConnections((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
  };

  // Handlers pour les listes de référence
  const handleAddRef = (type: string) => {
    setEditingRef({ type, value: "", label: "", keywords: [] });
    setKeywordsInput("");
    setShowRefModal(true);
  };
  const handleEditRef = (item: (typeof referenceItems)[0]) => {
    setEditingRef({
      id: item.id,
      type: item.type,
      value: item.value,
      label: item.label,
      keywords: item.keywords,
    });
    setKeywordsInput(item.keywords.join(", "));
    setShowRefModal(true);
  };
  const handleSaveRef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRef) return;
    // Parser les mots-clés depuis l'input brut
    const parsedKeywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    try {
      if (editingRef.id) {
        await referenceListApi.update(editingRef.id, {
          label: editingRef.label,
          keywords: parsedKeywords,
        });
      } else {
        await referenceListApi.create({
          type: editingRef.type as any,
          value: editingRef.value,
          label: editingRef.label,
          keywords: parsedKeywords,
        });
      }
      setShowRefModal(false);
      refetchRefs();
    } catch (err) {
      console.error(err);
    }
  };
  const handleDeleteRef = async (id: string) => {
    if (window.confirm("Supprimer cet élément ?")) {
      await referenceListApi.delete(id);
      refetchRefs();
    }
  };

  const isPodConnected = podSettings?.isConnected ?? false;

  // hook et  states
  const { items: referenceItems, refetch: refetchRefs } = useReferenceLists();
  const [showRefModal, setShowRefModal] = useState(false);
  const [editingRef, setEditingRef] = useState<{
    id?: string;
    type: string;
    value: string;
    label: string;
    keywords: string[];
  } | null>(null);
  const [keywordsInput, setKeywordsInput] = useState("");
  const [showSyncLogs, setShowSyncLogs] = useState(false); // true or false : open or closed by default
  const [showRefLists, setShowRefLists] = useState(false); // true or false : open or closed by default
  const [showStoreSettings, setShowStoreSettings] = useState(false); // true or false : open or closed by default
  const [visibleLogsCount, setVisibleLogsCount] = useState(10);

  // ═══════════════════════════════════════════════════════════════════════
  // Rendu (possible après tous les hooks)
  // ═══════════════════════════════════════════════════════════════════════
  if (podLoading || storeLoading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}
      >
        <div
          className="animate-spin"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-accent)",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Page Header */}
      <div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--color-ink)",
            marginBottom: 4,
          }}
        >
          Paramètres
        </h2>
        <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
          Configuration de la boutique, gestion des API et intégration
          Print‑on‑Demand.
        </p>
      </div>

      {/* ─── Section 1 : Paramètres de la boutique ────────────────────────── */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div
          style={{
            padding: "16px 22px",
            borderBottom: showStoreSettings
              ? "1px solid var(--color-border)"
              : "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Store
            size={18}
            strokeWidth={2}
            style={{ color: "var(--color-accent)" }}
          />
          <h3
            onClick={() => setShowStoreSettings((prev) => !prev)}
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Paramètres de la boutique
          </h3>
          <button
            onClick={() => setShowStoreSettings((prev) => !prev)}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--color-surface2)",
              color: "var(--color-ink3)",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "transform 0.2s",
              transform: showStoreSettings ? "rotate(180deg)" : "rotate(0deg)",
            }}
            title={
              showStoreSettings
                ? "Masquer les paramètres"
                : "Afficher les paramètres"
            }
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        {showStoreSettings && (
          <form
            onSubmit={handleSaveStore}
            style={{
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
              className="settings-grid-2col"
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Nom de la boutique
                </label>
                <input
                  type="text"
                  value={storeForm.storeName}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, storeName: e.target.value })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="InstaWear"
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Devise
                </label>
                <select
                  value={storeForm.currency}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, currency: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface2)",
                    fontSize: 13,
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-body)",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="USD">USD ($)</option>
                  <option value="BRL">BRL (R$)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (CA$)</option>
                  <option value="CHF">CHF (CHF)</option>
                  <option value="JPY">JPY (¥)</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Pays
                </label>
                <select
                  value={storeForm.country}
                  onChange={(e) =>
                    setStoreForm({ ...storeForm, country: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-surface2)",
                    fontSize: 13,
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-body)",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="US">États-Unis (USD)</option>
                  <option value="BR">Brésil (BRL)</option>
                  <option value="CA">Canada (CAD)</option>
                  <option value="GB">Royaume-Uni (GBP)</option>
                  <option value="CH">Suisse (CHF)</option>
                  <option value="FR">France (EUR)</option>
                  <option value="JP">Japon (JPY)</option>
                  <option value="BE">Belgique (EUR)</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Seuil livraison gratuite ({storeForm.currency})
                </label>
                <input
                  type="number"
                  value={storeForm.freeShippingThreshold}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      freeShippingThreshold: Number(e.target.value),
                    })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Frais de port forfaitaires ({storeForm.currency})
                </label>
                <input
                  type="number"
                  value={storeForm.shippingCost}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      shippingCost: Number(e.target.value),
                    })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  min={0}
                  step={0.01}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Délai de livraison estimé
                </label>
                <input
                  type="text"
                  value={storeForm.shippingDelay}
                  onChange={(e) =>
                    setStoreForm({
                      ...storeForm,
                      shippingDelay: e.target.value,
                    })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="5-7 jours ouvrés"
                />
              </div>
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink2)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Compte à rebours global (fin des offres limitées)
              </label>
              <input
                type="datetime-local"
                value={
                  storeForm.globalCountdownEnd
                    ? storeForm.globalCountdownEnd.slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setStoreForm({
                    ...storeForm,
                    globalCountdownEnd: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  })
                }
                className="input-base"
                style={{ maxWidth: 320 }}
              />
              <p
                style={{
                  fontSize: 11,
                  color: "var(--color-ink4)",
                  marginTop: 4,
                }}
              >
                Laissez vide pour désactiver le compte à rebours global.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={storeSaving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 22px",
                  borderRadius: 12,
                  border: "none",
                  background: "var(--color-accent)",
                  color: "white",
                  fontFamily: "var(--font-body)",
                  fontWeight: 700,
                  fontSize: 13.5,
                  cursor: "pointer",
                  boxShadow: "var(--shadow-accent)",
                  opacity: storeSaving ? 0.7 : 1,
                }}
              >
                {storeSaving ? (
                  <>
                    <RefreshCw
                      size={15}
                      strokeWidth={2}
                      className="animate-spin"
                    />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save size={15} strokeWidth={2} />
                    Enregistrer les paramètres
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ─── Section : Listes de référence (catégories, événements, styles) ─ */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div
          style={{
            padding: "16px 22px",
            borderBottom: showRefLists
              ? "1px solid var(--color-border)"
              : "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Tag
            size={18}
            strokeWidth={2}
            style={{ color: "var(--color-accent)" }}
          />
          <h3
            onClick={() => setShowRefLists((prev) => !prev)}
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Listes de référence
          </h3>
          <button
            onClick={() => setShowRefLists((prev) => !prev)}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--color-surface2)",
              color: "var(--color-ink3)",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "transform 0.2s",
              transform: showRefLists ? "rotate(180deg)" : "rotate(0deg)",
            }}
            title={showRefLists ? "Masquer les listes" : "Afficher les listes"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        {showRefLists && (
          <div
            style={{
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {(["category", "event_type", "style"] as const).map((type) => {
              const items = referenceItems.filter((r) => r.type === type);
              const typeLabel =
                type === "category"
                  ? "Catégories"
                  : type === "event_type"
                    ? "Types d'événement"
                    : "Styles";
              return (
                <div key={type}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <h4
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: "var(--color-ink)",
                      }}
                    >
                      {typeLabel}
                    </h4>
                    <button
                      onClick={() => handleAddRef(type)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--color-accent)",
                        background: "transparent",
                        color: "var(--color-accent)",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      + Ajouter
                    </button>
                  </div>
                  {items.length === 0 ? (
                    <p style={{ fontSize: 12, color: "var(--color-ink4)" }}>
                      Aucun élément.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {items.map((item) => (
                        <div
                          key={item.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px 10px",
                            borderRadius: 8,
                            background: "var(--color-surface2)",
                            border: "1px solid var(--color-border)",
                            fontSize: 12,
                            color: "var(--color-ink2)",
                          }}
                        >
                          <span>{item.label}</span>
                          <button
                            onClick={() => handleEditRef(item)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-ink4)",
                              fontSize: 12,
                              padding: 0,
                              lineHeight: 1,
                            }}
                          >
                            <Pencil size={12} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => handleDeleteRef(item.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#ef4444",
                              fontSize: 12,
                              padding: 0,
                              lineHeight: 1,
                            }}
                          >
                            <Trash2 size={12} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modale pour ajouter/modifier un élément de référence */}
      {showRefModal && editingRef && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(26,20,10,0.5)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setShowRefModal(false)}
          />
          <div
            style={{
              position: "relative",
              zIndex: 201,
              background: "var(--color-surface)",
              borderRadius: 20,
              maxWidth: 500,
              width: "90%",
              padding: "28px",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <form
              onSubmit={handleSaveRef}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Valeur (identifiant unique)
                </label>
                <input
                  type="text"
                  value={editingRef.value}
                  disabled={!!editingRef.id}
                  onChange={(e) =>
                    setEditingRef({ ...editingRef, value: e.target.value })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="ex: tshirt"
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Libellé affiché
                </label>
                <input
                  type="text"
                  value={editingRef.label}
                  onChange={(e) =>
                    setEditingRef({ ...editingRef, label: e.target.value })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="ex: T-Shirt"
                  required
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--color-ink2)",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Mots-clés (séparés par des virgules)
                </label>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="ex: t-shirt, tee, chemise"
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowRefModal(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 12,
                    border: "1.5px solid var(--color-border2)",
                    background: "var(--color-surface)",
                    color: "var(--color-ink2)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 22px",
                    borderRadius: 12,
                    border: "none",
                    background: "var(--color-accent)",
                    color: "white",
                    fontFamily: "var(--font-body)",
                    fontWeight: 700,
                    fontSize: 13.5,
                    cursor: "pointer",
                  }}
                >
                  <Save size={15} strokeWidth={2} />
                  {editingRef.id ? "Mettre à jour" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Section 2 : Connexion Printful ──────────────────────────────── */}
      <div
        id="printful-settings-section"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Package
            size={18}
            strokeWidth={2}
            style={{ color: "var(--color-accent)" }}
          />
          <h3
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
            }}
          >
            Connexion Printful (Print‑on‑Demand)
          </h3>
          {isPodConnected ? (
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "var(--color-success-bg)",
                color: "var(--color-success)",
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Wifi size={13} strokeWidth={2} />
              Connecté
            </span>
          ) : (
            <span
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "var(--color-surface2)",
                color: "var(--color-ink3)",
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <WifiOff size={13} strokeWidth={2} />
              Non connecté
            </span>
          )}
        </div>
        <form
          onSubmit={handleSavePod}
          style={{
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
            className="settings-grid-2col"
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink2)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Clé API Printful
              </label>
              <input
                type="password"
                value={podForm.apiKey}
                onChange={(e) =>
                  setPodForm({ ...podForm, apiKey: e.target.value })
                }
                className="input-base"
                style={{ width: "100%" }}
                placeholder="pr_..."
              />
              <p
                style={{
                  fontSize: 11,
                  color: "var(--color-ink4)",
                  marginTop: 4,
                }}
              >
                <a
                  href="https://developers.printful.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--color-accent)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  Obtenir votre clé API <ExternalLink size={11} />
                </a>
              </p>
            </div>
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink2)",
                  display: "block",
                  marginBottom: 4,
                }}
              >
                ID du store (optionnel)
              </label>
              <input
                type="text"
                value={podForm.storeId}
                onChange={(e) =>
                  setPodForm({ ...podForm, storeId: e.target.value })
                }
                className="input-base"
                style={{ width: "100%" }}
                placeholder="store_..."
              />
            </div>
          </div>
          {podSettings && (
            <div
              style={{
                display: "flex",
                gap: 14,
                padding: "12px 16px",
                borderRadius: 12,
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                fontSize: 12,
                color: "var(--color-ink2)",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span>
                <strong>{podSettings.productsSyncedCount}</strong> produits
                synchronisés
              </span>
              <span style={{ color: "var(--color-ink4)" }}>|</span>
              <span>
                Dernière synchro :{" "}
                {podSettings.lastSyncAt
                  ? formatDate(podSettings.lastSyncAt)
                  : "Jamais"}
              </span>
              <span style={{ color: "var(--color-ink4)" }}>|</span>
              <span>Statut : {podSettings.syncStatus}</span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing || !podForm.apiKey}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 18px",
                  borderRadius: 12,
                  border: "1.5px solid var(--color-border2)",
                  background: "var(--color-surface)",
                  color: "var(--color-ink2)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                  opacity: syncing || !podForm.apiKey ? 0.6 : 1,
                }}
              >
                {syncing ? (
                  <>
                    <RefreshCw
                      size={15}
                      strokeWidth={2}
                      className="animate-spin"
                    />
                    Synchronisation...
                  </>
                ) : (
                  <>
                    <RefreshCw size={15} strokeWidth={2} />
                    Synchroniser maintenant
                  </>
                )}
              </button>
            </div>
            <button
              type="submit"
              disabled={podSaving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 22px",
                borderRadius: 12,
                border: "none",
                background: "var(--color-accent)",
                color: "white",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: 13.5,
                cursor: "pointer",
                boxShadow: "var(--shadow-accent)",
                opacity: podSaving ? 0.7 : 1,
              }}
            >
              {podSaving ? (
                <>
                  <RefreshCw
                    size={15}
                    strokeWidth={2}
                    className="animate-spin"
                  />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save size={15} strokeWidth={2} />
                  Enregistrer la clé
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Section 3 : Journal de synchronisation ───────────────────────── */}
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "var(--shadow-xs)",
          marginBottom: 80,
        }}
      >
        <div
          style={{
            padding: "16px 22px",
            borderBottom: showSyncLogs
              ? "1px solid var(--color-border)"
              : "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Clock
            size={18}
            strokeWidth={2}
            style={{ color: "var(--color-ink3)" }}
          />
          <h3
            onClick={() => {
              setShowSyncLogs((prev) => {
                if (prev) setVisibleLogsCount(10);
                return !prev;
              });
            }}
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            Journal de synchronisation
          </h3>
          <button
            onClick={() => {
              setShowSyncLogs((prev) => {
                if (prev) setVisibleLogsCount(10);
                return !prev;
              });
            }}
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--color-surface2)",
              color: "var(--color-ink3)",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              transition: "transform 0.2s",
              transform: showSyncLogs ? "rotate(180deg)" : "rotate(0deg)",
            }}
            title={showSyncLogs ? "Masquer le journal" : "Afficher le journal"}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
        {showSyncLogs &&
          (logs && logs.length > 0 ? (
            <div style={{ padding: "0 0 8px" }}>
              {logs.slice(0, visibleLogsCount).map((log: SyncLog) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "10px 22px",
                    borderBottom: "1px solid var(--color-border)",
                    fontSize: 12.5,
                    color: "var(--color-ink2)",
                  }}
                >
                  <span
                    style={{
                      color: LOG_STATUS_ICON[log.status]?.color,
                      marginTop: 2,
                    }}
                  >
                    {LOG_STATUS_ICON[log.status]?.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                      {log.status === "success"
                        ? "Succès"
                        : log.status === "partial"
                          ? "Partiel"
                          : "Erreur"}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--color-ink3)" }}>
                      {log.message}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: "var(--color-ink4)",
                        marginTop: 2,
                      }}
                    >
                      {formatDate(log.syncDate)}
                      {log.duration !== undefined && ` · ${log.duration} ms`}
                      {log.productId && ` · Produit ${log.productId}`}
                    </p>
                  </div>
                </div>
              ))}
              {visibleLogsCount < logs.length && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "12px 0 4px",
                  }}
                >
                  <button
                    onClick={() =>
                      setVisibleLogsCount((prev) =>
                        Math.min(prev + 10, logs.length),
                      )
                    }
                    style={{
                      padding: "5px 16px",
                      borderRadius: 999,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-ink2)",
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Afficher plus ({logs.length - visibleLogsCount} restants)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--color-ink4)",
                fontSize: 13,
              }}
            >
              Aucune synchronisation enregistrée.
            </div>
          ))}
      </div>

      {/* Responsive grid */}
      <style>{`
        @media (max-width: 600px) {
          .settings-grid-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
