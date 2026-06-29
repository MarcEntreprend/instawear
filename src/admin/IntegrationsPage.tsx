// src/admin/IntegrationsPage.tsx

import React, { useState, useEffect } from "react";
import {
  Link2,
  Package,
  ExternalLink,
  Wifi,
  WifiOff,
  RefreshCw,
  Save,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { apiConnectionsApi } from "../api/supabaseApi";

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

interface IntegrationsPageProps {
  onNavigateToPrintfulSettings?: () => void;
}

export default function IntegrationsPage({
  onNavigateToPrintfulSettings,
}: IntegrationsPageProps) {
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

  // Charger les connexions depuis Supabase au montage
  useEffect(() => {
    apiConnectionsApi
      .list()
      .then(setApiConnections)
      .catch(console.error)
      .finally(() => setApiLoading(false));
  }, []);

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

        // NOTIFICATION
        import("../api/supabaseApi").then(({ notificationApi }) => {
          notificationApi
            .create({
              title: `Connexion API ajoutée`,
              description: `"${apiForm.name}" (${apiForm.service}) configurée`,
              category: "api",
              priority: "medium",
              metadata: { source: "Système", linkTo: "/admin/integrations" },
              action_label: "Voir les intégrations",
            })
            .catch(() => {});
        });
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

      //notification
      import("../api/supabaseApi").then(({ notificationApi }) => {
        notificationApi
          .create({
            title: `Connexion API supprimée`,
            description: `La connexion a été retirée`,
            category: "api",
            priority: "high",
            metadata: { source: "Système", linkTo: "/admin/integrations" },
            action_label: "Voir les intégrations",
          })
          .catch(() => {});
      });

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--color-ink)",
              marginBottom: 4,
            }}
          >
            Intégrations
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            Connectez vos services externes : Print-on-Demand, affiliation,
            marketing.
          </p>
        </div>
      </div>
      {/* ─── Section : Gestion des API ────────────────────────────────────── */}
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
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Wifi
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
              Gestion des API
            </h3>
            <span
              style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                background: "var(--color-surface2)",
                color: "var(--color-ink3)",
              }}
            >
              {apiConnections.filter((a) => a.enabled).length}/
              {apiConnections.length} actives
            </span>
          </div>
          <button
            onClick={handleAddApi}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "var(--color-accent)",
              color: "white",
              fontFamily: "var(--font-body)",
              fontWeight: 700,
              fontSize: 12.5,
              cursor: "pointer",
            }}
          >
            + Nouvelle API
          </button>
        </div>

        <div style={{ padding: "0 0 8px" }}>
          {apiLoading ? (
            <div
              style={{ display: "flex", justifyContent: "center", padding: 40 }}
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
          ) : apiConnections.length === 0 ? (
            <div
              style={{
                padding: 24,
                textAlign: "center",
                color: "var(--color-ink4)",
                fontSize: 13,
              }}
            >
              {apiConnections.length === 0
                ? "Aucune API configurée. Ajoutez une plateforme Print-on-Demand ou d'affiliation."
                : "Toutes les API sont affichées ci-dessus."}
            </div>
          ) : (
            apiConnections.map((api) => (
              <div
                key={api.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 22px",
                  borderBottom: "1px solid var(--color-border)",
                  gap: 14,
                  opacity: api.enabled ? 1 : 0.55,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: api.enabled
                        ? "var(--color-accent-soft)"
                        : "var(--color-surface2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {api.type === "pod" ? (
                      <Package
                        size={17}
                        strokeWidth={2}
                        style={{
                          color: api.enabled
                            ? "var(--color-accent)"
                            : "var(--color-ink4)",
                        }}
                      />
                    ) : (
                      <ExternalLink
                        size={17}
                        strokeWidth={2}
                        style={{
                          color: api.enabled
                            ? "var(--color-accent)"
                            : "var(--color-ink4)",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13.5,
                          color: "var(--color-ink)",
                        }}
                      >
                        {api.name}
                      </span>
                      {api.enabled ? (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "var(--color-success)",
                            background: "var(--color-success-bg)",
                            padding: "1px 6px",
                            borderRadius: 999,
                          }}
                        >
                          Actif
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: "var(--color-ink4)",
                            background: "var(--color-surface2)",
                            padding: "1px 6px",
                            borderRadius: 999,
                          }}
                        >
                          Inactif
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink3)",
                        marginTop: 2,
                      }}
                    >
                      {api.type === "pod" ? "Print-on-Demand" : "Affiliation"} ·{" "}
                      {api.service}
                    </p>
                    {api.lastSyncAt && (
                      <p
                        style={{
                          fontSize: 10,
                          color: "var(--color-ink4)",
                          marginTop: 1,
                        }}
                      >
                        Dernière synchro :{" "}
                        {new Date(api.lastSyncAt).toLocaleString("fr-FR")}
                      </p>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={() => handleToggleApi(api.id)}
                    title={api.enabled ? "Désactiver" : "Activer"}
                    style={{
                      padding: "5px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      background: api.enabled
                        ? "var(--color-surface2)"
                        : "var(--color-surface)",
                      color: api.enabled
                        ? "var(--color-ink3)"
                        : "var(--color-success)",
                      fontWeight: 600,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {api.enabled ? "Désactiver" : "Activer"}
                  </button>

                  {api.type === "pod" && api.enabled && (
                    <button
                      onClick={() => handleSyncApi(api.id)}
                      title="Synchroniser"
                      style={{
                        padding: "5px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-ink2)",
                        fontWeight: 600,
                        fontSize: 11,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <RefreshCw size={11} strokeWidth={2} />
                      Sync
                    </button>
                  )}

                  <button
                    onClick={() => handleEditApi(api)}
                    title="Modifier"
                    style={{
                      padding: "5px 10px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-ink2)",
                      fontWeight: 600,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Modifier
                  </button>

                  <button
                    onClick={() => handleDeleteApi(api.id)}
                    title="Supprimer"
                    style={{
                      padding: "5px 10px",
                      borderRadius: 8,
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#ef4444",
                      fontWeight: 600,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Modale Ajout/Modification API ────────────────────────────────── */}
      {showApiModal && (
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
            onClick={() => setShowApiModal(false)}
          />
          <div
            style={{
              position: "relative",
              zIndex: 201,
              background: "var(--color-surface)",
              borderRadius: 20,
              maxWidth: 560,
              width: "90%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "28px",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--color-ink)",
                }}
              >
                {editingApi ? "Modifier l'API" : "Nouvelle connexion API"}
              </h3>
              <button
                onClick={() => setShowApiModal(false)}
                style={{
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: "4px 8px",
                  cursor: "pointer",
                  color: "var(--color-ink2)",
                }}
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={handleSaveApi}
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
                  Nom de la connexion
                </label>
                <input
                  type="text"
                  value={apiForm.name}
                  onChange={(e) =>
                    setApiForm({ ...apiForm, name: e.target.value })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="Ex: Printful, Printify, Amazon Merch..."
                  required
                />
              </div>
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
                    Type
                  </label>
                  <select
                    value={apiForm.type}
                    onChange={(e) =>
                      setApiForm({
                        ...apiForm,
                        type: e.target.value as "pod" | "affiliate",
                      })
                    }
                    className="input-base"
                    style={{ width: "100%", cursor: "pointer" }}
                  >
                    <option value="pod">Print-on-Demand</option>
                    <option value="affiliate">Affiliation</option>
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
                    Service
                  </label>
                  <input
                    type="text"
                    value={apiForm.service}
                    onChange={(e) =>
                      setApiForm({ ...apiForm, service: e.target.value })
                    }
                    className="input-base"
                    style={{ width: "100%" }}
                    placeholder="Printful, Printify, Awin..."
                    required
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
                  URL de l'API / Endpoint
                </label>
                <input
                  type="url"
                  value={apiForm.baseUrl}
                  onChange={(e) =>
                    setApiForm({ ...apiForm, baseUrl: e.target.value })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="https://api.printful.com"
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
                  Clé API
                </label>
                <input
                  type="password"
                  value={apiForm.apiKey}
                  onChange={(e) =>
                    setApiForm({ ...apiForm, apiKey: e.target.value })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="sk_..."
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
                  Clé secrète / Token supplémentaire (optionnel)
                </label>
                <input
                  type="password"
                  value={apiForm.apiSecret}
                  onChange={(e) =>
                    setApiForm({ ...apiForm, apiSecret: e.target.value })
                  }
                  className="input-base"
                  style={{ width: "100%" }}
                  placeholder="..."
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
                  onClick={() => setShowApiModal(false)}
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
                  {editingApi ? "Mettre à jour" : "Ajouter l'API"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive grid */}
      <style>{`
        @media (max-width: 600px) {
          .settings-grid-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {[
          {
            name: "Printful",
            desc: "Print-on-Demand",
            connected: true,
            onClick: onNavigateToPrintfulSettings,
          },
          { name: "Printify", desc: "Print-on-Demand", connected: false },
          { name: "Awin", desc: "Affiliation", connected: false },
          { name: "Google Analytics", desc: "Statistiques", connected: false },
        ].map((integration) => (
          <div key={integration.name} style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--color-surface2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {integration.desc.includes("Print") ? (
                  <Package size={18} />
                ) : (
                  <Link2 size={18} />
                )}
              </div>
              <div>
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--color-ink)",
                  }}
                >
                  {integration.name}
                </p>
                <p style={{ fontSize: 11, color: "var(--color-ink3)" }}>
                  {integration.desc}
                </p>
              </div>
            </div>
            <button
              onClick={integration.onClick}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 10,
                border: "1.5px solid var(--color-border2)",
                background: "var(--color-surface)",
                color: "var(--color-ink2)",
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <ExternalLink size={13} /> Configurer
            </button>
          </div>
        ))}
      </div>
      <p
        style={{
          fontSize: 12,
          color: "var(--color-ink4)",
          textAlign: "center",
        }}
      >
        Les intégrations seront fonctionnelles après la mise en place de
        Supabase et des API externes.
      </p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
};
