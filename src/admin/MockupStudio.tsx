// src/admin/MockupStudio.tsx
// Mockup Studio (Phases 1+2) : file d'attente découplée pour la génération
// de mockups Printful. Fini le 1-produit-par-clic synchrone : on met en file
// (création des tâches, rapide), puis un worker poll/finalise en arrière-plan
// (manuel ici, cron pg_cron en option — voir migration 20261019).
// Les écritures produit sont IDENTIQUES au flux legacy (variants[].image,
// color_images, gallery, product_mockups) : rien d'autre n'est touché.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RefreshCw, Play, ListPlus, RotateCcw, Download, ChevronDown, Settings2 } from "lucide-react";
import type { AdminProduct } from "./adminTypes";
import type {
  MockupJob,
  MockupStatus,
  MockupQueueOptions,
  MockupTemplatePlacement,
} from "../api/supabaseApi";

/** Un produit a besoin de mockups si importé Printful sans visuels complets. */
export function needsMockups(p: {
  externalProductId?: string | null;
  variants?: { image?: string }[] | null;
}): boolean {
  if (!p.externalProductId) return false;
  const variants = Array.isArray(p.variants) ? p.variants : [];
  if (variants.length === 0) return true;
  return !variants.every(
    (v) => v.image && String(v.image).trim().length > 0,
  );
}

/** Couverture mockups d'un produit : X/Y variantes imagées. */
export function mockupCoverage(p: {
  variants?: { image?: string }[] | null;
}): { total: number; imaged: number } {
  const variants = Array.isArray(p?.variants) ? p.variants : [];
  const imaged = variants.filter(
    (v) => v.image && String(v.image).trim().length > 0,
  ).length;
  return { total: variants.length, imaged };
}

interface ProductCfg {
  open: boolean;
  placements: string[];
  format: "jpg" | "png";
  width: number | undefined;
  colors: string[];
  appendGallery: boolean;
  keepMainImage: boolean;
  templates: MockupTemplatePlacement[] | null;
  templatesLoading: boolean;
  templatesError: string | null;
}

const defaultCfg = (): ProductCfg => ({
  open: false,
  placements: [],
  format: "jpg",
  width: undefined,
  colors: [],
  appendGallery: false,
  keepMainImage: false,
  templates: null,
  templatesLoading: false,
  templatesError: null,
});

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  queued: { color: "#1e40af", bg: "#dbeafe", label: "En file" },
  processing: { color: "#92400e", bg: "#fef3c7", label: "En cours" },
  done: { color: "#065f46", bg: "#d1fae5", label: "Terminé" },
  failed: { color: "#991b1b", bg: "#fee2e2", label: "Échoué" },
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MockupStudio({
  products,
  onBack,
  onChanged,
}: {
  products: AdminProduct[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<MockupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueing, setQueueing] = useState(false);
  const [queueProgress, setQueueProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [working, setWorking] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const missing = useMemo(
    () => (products || []).filter((p) => needsMockups(p as any)),
    [products],
  );

  const printfulProducts = useMemo(
    () => (products || []).filter((p) => !!(p as any).externalProductId),
    [products],
  );

  const [cfg, setCfg] = useState<Record<string, ProductCfg>>({});
  const getCfg = (id: string): ProductCfg => cfg[id] || defaultCfg();
  const patchCfg = (id: string, patch: Partial<ProductCfg>) =>
    setCfg((prev) => ({ ...prev, [id]: { ...getCfg(id), ...patch } }));

  const loadStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { podApi } = await import("../api/supabaseApi");
      setStatus(await podApi.mockupStatus());
      if (!silent) setError(null);
    } catch (e: any) {
      if (!silent) {
        setError(
          e?.message ||
            "Table mockup_jobs introuvable — exécutez la migration 20261019_mockup_jobs.sql",
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    loadStatus(false);
    // Rafraîchit la file toutes les 15s pendant la surveillance.
    const t = setInterval(() => {
      loadStatus(true);
    }, 15000);
    return () => {
      cancelledRef.current = true;
      clearInterval(t);
    };
  }, [loadStatus]);

  const openCount =
    (status?.counts.queued || 0) + (status?.counts.processing || 0);

  // Met en file TOUS les manquants, par vagues (l'edge borne à 5/appel).
  const handleQueueMissing = async () => {
    if (queueing || missing.length === 0) return;
    setQueueing(true);
    setNotice(null);
    setQueueProgress({ done: 0, total: missing.length });
    try {
      const { podApi } = await import("../api/supabaseApi");
      let remaining = missing.map((p) => p.id);
      let queuedTotal = 0;
      let failedTotal = 0;
      let guard = 0;
      while (remaining.length > 0 && guard < 300) {
        if (cancelledRef.current) break;
        guard++;
        const r = await podApi.queueMockups(remaining);
        queuedTotal += r.queued || 0;
        failedTotal += r.failed || 0;
        if (r.done) break;
        // Retire ce qui est désormais en file/échoué pour avancer.
        const settled = new Set([
          ...(r.details?.queued || []).map((q: any) => q.productId),
          ...(r.details?.failed || []).map((q: any) => q.productId),
          ...(r.details?.skipped || []).map((q: any) => q.productId),
        ]);
        const next = remaining.filter((id) => !settled.has(id));
        if (next.length === remaining.length) break; // aucun progrès → stop
        remaining = next;
        setQueueProgress({ done: missing.length - remaining.length, total: missing.length });
      }
      setNotice(
        `File alimentée : ${queuedTotal} mis en file, ${failedTotal} en échec.`,
      );
      await loadStatus(true);
    } catch (e: any) {
      setNotice(`Erreur mise en file : ${e?.message || e}`);
    } finally {
      setQueueing(false);
      setQueueProgress(null);
    }
  };

  // Fait tourner le worker une fois (poll + finalise, ~25 jobs max).
  const handleRunWorker = async () => {
    if (working) return;
    setWorking(true);
    setNotice(null);
    try {
      const { podApi } = await import("../api/supabaseApi");
      const r = await podApi.runMockupWorker();
      setLastRun(
        `Dernier traitement : ${r.done} terminé(s), ${r.failed} échoué(s), ${r.pending} en attente.`,
      );
      if (r.failed > 0) {
        setNotice(
          `${r.failed} job(s) en échec — détail ci-dessous (relance possible).`,
        );
      }
      await loadStatus(true);
      onChanged();
    } catch (e: any) {
      setNotice(`Erreur worker : ${e?.message || e}`);
    } finally {
      setWorking(false);
    }
  };

  const handleRetry = async (productId: string) => {
    try {
      const { podApi } = await import("../api/supabaseApi");
      await podApi.queueMockups([productId]);
      await loadStatus(true);
    } catch (e: any) {
      setNotice(`Erreur relance : ${e?.message || e}`);
    }
  };

  // Charge les placements disponibles (templates Printful) pour un produit.
  const handleLoadTemplates = async (p: AdminProduct) => {
    const syncId = (p as any).externalProductId;
    if (!syncId) return;
    patchCfg(p.id, { templatesLoading: true, templatesError: null });
    try {
      const { podApi } = await import("../api/supabaseApi");
      const r = await podApi.mockupTemplates(String(syncId));
      patchCfg(p.id, { templates: r.placements || [], templatesLoading: false });
    } catch (e: any) {
      patchCfg(p.id, {
        templatesLoading: false,
        templatesError: e?.message || "Erreur templates",
      });
    }
  };

  // Met un produit en file avec sa configuration (défauts si vide).
  const handleQueueOne = async (p: AdminProduct) => {
    const c = getCfg(p.id);
    const options: MockupQueueOptions = {};
    if (c.placements.length > 0) options.placements = c.placements;
    if (c.format !== "jpg") options.format = c.format;
    if (c.width) options.width = c.width;
    if (c.colors.length > 0) options.colors = c.colors;
    if (c.appendGallery) options.appendGallery = true;
    if (c.keepMainImage) options.keepMainImage = true;
    try {
      const { podApi } = await import("../api/supabaseApi");
      await podApi.queueMockups(
        [p.id],
        Object.keys(options).length > 0 ? options : undefined,
      );
      setNotice(`« ${p.title} » mis en file.`);
      await loadStatus(true);
    } catch (e: any) {
      setNotice(`Erreur mise en file : ${e?.message || e}`);
    }
  };

  // Export CSV des jobs (rapport).
  const handleExportJobs = () => {
    const rows = [
      "job_id;produit;statut;tentatives;task_key;erreur;mockups;mis_a_jour",
    ];
    for (const j of status?.jobs || []) {
      const r = (j.result || {}) as any;
      rows.push(
        [
          j.id,
          `"${(j.product_title || j.product_id).replace(/"/g, '""')}"`,
          j.status,
          j.attempts,
          j.task_key || "",
          `"${String(r.error || "").replace(/"/g, '""')}"`,
          r.mockupsGenerated ?? "",
          j.updated_at,
        ].join(";"),
      );
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mockup-jobs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btnPrimary: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    borderRadius: 12,
    border: "none",
    background: "var(--color-accent)",
    color: "white",
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer",
    boxShadow: "var(--shadow-accent)",
  };
  const btnGhost: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 20px",
    borderRadius: 12,
    border: "1.5px solid var(--color-border2)",
    background: "var(--color-surface)",
    color: "var(--color-ink2)",
    fontFamily: "var(--font-body)",
    fontWeight: 700,
    fontSize: 13.5,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* En-tête */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          title="Retour aux produits"
          style={{
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            padding: "8px 10px",
            cursor: "pointer",
            color: "var(--color-ink2)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Mockup Studio
          </h2>
          <p style={{ fontSize: 12, color: "var(--color-ink3)", margin: "2px 0 0" }}>
            {printfulProducts.length} produit{printfulProducts.length !== 1 ? "s" : ""} Printful
            {" · "}
            {missing.length} sans mockups complets
            {" · "}
            {openCount} job{openCount !== 1 ? "s" : ""} en file
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleQueueMissing}
          disabled={queueing || missing.length === 0}
          style={{
            ...btnPrimary,
            opacity: queueing || missing.length === 0 ? 0.6 : 1,
            cursor:
              queueing || missing.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          <ListPlus size={15} strokeWidth={2.5} />
          {queueing ? "Mise en file…" : "Mettre en file les manquants"}
        </button>
        <button
          type="button"
          onClick={handleRunWorker}
          disabled={working || openCount === 0}
          style={{
            ...btnGhost,
            opacity: working || openCount === 0 ? 0.6 : 1,
            cursor: working || openCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Play size={15} strokeWidth={2.5} />
          {working ? "Traitement…" : "Traiter la file"}
        </button>
        <button
          type="button"
          onClick={() => loadStatus(false)}
          disabled={loading}
          style={btnGhost}
        >
          <RefreshCw
            size={14}
            strokeWidth={2.5}
            className={loading ? "animate-spin" : ""}
          />
          Actualiser
        </button>
      </div>

      {/* Progression mise en file */}
      {queueProgress && (
        <div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "var(--color-surface2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.round(
                  (queueProgress.done / Math.max(1, queueProgress.total)) * 100,
                )}%`,
                background: "var(--color-accent)",
                transition: "width 0.3s",
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: "var(--color-ink3)", marginTop: 6 }}>
            {queueProgress.done} / {queueProgress.total} produits mis en file…
          </p>
        </div>
      )}

      {notice && (
        <p
          style={{
            fontSize: 13,
            color: "var(--color-ink2)",
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            padding: "10px 14px",
            margin: 0,
          }}
        >
          {notice}
        </p>
      )}
      {lastRun && !notice && (
        <p style={{ fontSize: 12, color: "var(--color-ink3)", margin: 0 }}>
          {lastRun}
        </p>
      )}
      {error && (
        <p style={{ fontSize: 13, color: "var(--color-negative)", margin: 0 }}>
          {error}
        </p>
      )}

      {/* Compteurs */}
      {status && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {(
            [
              ["queued", "En file"],
              ["processing", "En cours"],
              ["done", "Terminés"],
              ["failed", "Échoués"],
            ] as const
          ).map(([key, label]) => (
            <div
              key={key}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "10px 14px",
              }}
            >
              <p
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color:
                    key === "failed" && status.counts.failed > 0
                      ? "#991b1b"
                      : "var(--color-ink)",
                  margin: 0,
                }}
              >
                {status.counts[key] ?? 0}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--color-ink3)",
                  margin: "2px 0 0",
                  textTransform: "uppercase",
                  fontWeight: 700,
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table des produits (couverture mockups) */}
      <div>
        <p
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "var(--color-ink)",
            margin: "0 0 10px",
          }}
        >
          Produits Printful ({printfulProducts.length})
        </p>
        <div
          style={{
            overflowX: "auto",
            borderRadius: 12,
            border: "1px solid var(--color-border)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              color: "var(--color-ink)",
            }}
          >
            <thead>
              <tr style={{ background: "var(--color-surface2)" }}>
                {["Produit", "Couverture", "File", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      fontSize: 11,
                      textTransform: "uppercase",
                      color: "var(--color-ink3)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {printfulProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "var(--color-ink3)" }}>
                    Aucun produit Printful importé.
                  </td>
                </tr>
              ) : (
                printfulProducts.map((p) => {
                  const cov = mockupCoverage(p as any);
                  const complete = cov.total > 0 && cov.imaged === cov.total;
                  const c = getCfg(p.id);
                  const variants = ((p as any).variants || []) as {
                    color: string;
                    color_name?: string;
                    image?: string;
                  }[];
                  return (
                    <React.Fragment key={p.id}>
                      <tr style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                          {p.title}
                        </td>
                        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 800,
                              color: complete ? "#065f46" : "#92400e",
                              background: complete ? "#d1fae5" : "#fef3c7",
                            }}
                          >
                            {cov.imaged}/{cov.total}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            type="button"
                            onClick={() => handleQueueOne(p)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 8,
                              border: "1px solid var(--color-border2)",
                              background: "var(--color-surface)",
                              color: "var(--color-ink2)",
                              fontWeight: 700,
                              fontSize: 11,
                              cursor: "pointer",
                            }}
                          >
                            Mettre en file
                          </button>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              patchCfg(p.id, { open: !c.open });
                              if (!c.open && !c.templates && !c.templatesLoading) {
                                handleLoadTemplates(p);
                              }
                            }}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-ink3)",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {c.open ? "Masquer" : "Configurer"}
                          </button>
                        </td>
                      </tr>
                      {c.open && (
                        <tr style={{ background: "var(--color-surface2)" }}>
                          <td colSpan={4} style={{ padding: "12px" }}>
                            {c.templatesLoading ? (
                              <p style={{ fontSize: 12, color: "var(--color-ink3)", margin: 0 }}>
                                Chargement des placements Printful…
                              </p>
                            ) : c.templatesError ? (
                              <p style={{ fontSize: 12, color: "var(--color-negative)", margin: 0 }}>
                                {c.templatesError}
                              </p>
                            ) : (
                              <>
                                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink3)", textTransform: "uppercase", margin: "0 0 8px" }}>
                                  Placements {c.templates && c.templates.length > 0 ? "" : "(défaut : front)"}
                                </p>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                                  {(c.templates || []).map((t) => {
                                    const on = c.placements.includes(t.placement);
                                    return (
                                      <label
                                        key={t.placement}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          fontSize: 12,
                                          color: "var(--color-ink2)",
                                          cursor: "pointer",
                                          padding: "4px 10px",
                                          borderRadius: 8,
                                          border: "1px solid var(--color-border)",
                                          background: on ? "var(--color-accent-bg)" : "var(--color-surface)",
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={on}
                                          onChange={() =>
                                            patchCfg(p.id, {
                                              placements: on
                                                ? c.placements.filter((x) => x !== t.placement)
                                                : [...c.placements, t.placement],
                                            })
                                          }
                                          style={{ accentColor: "var(--color-accent)" }}
                                        />
                                        {t.placement}
                                      </label>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
                              <label style={{ fontSize: 12, color: "var(--color-ink2)" }}>
                                Format{" "}
                                <select
                                  value={c.format}
                                  onChange={(e) =>
                                    patchCfg(p.id, { format: e.target.value as "jpg" | "png" })
                                  }
                                  style={{
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: 8,
                                    padding: "4px 8px",
                                    fontSize: 12,
                                  }}
                                >
                                  <option value="jpg">JPG</option>
                                  <option value="png">PNG</option>
                                </select>
                              </label>
                              <label style={{ fontSize: 12, color: "var(--color-ink2)" }}>
                                Largeur{" "}
                                <select
                                  value={c.width || ""}
                                  onChange={(e) =>
                                    patchCfg(p.id, {
                                      width: e.target.value ? Number(e.target.value) : undefined,
                                    })
                                  }
                                  style={{
                                    background: "var(--color-surface)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: 8,
                                    padding: "4px 8px",
                                    fontSize: 12,
                                  }}
                                >
                                  <option value="">1000 (défaut)</option>
                                  <option value="1500">1500</option>
                                  <option value="2000">2000 (max)</option>
                                </select>
                              </label>
                              <label style={{ fontSize: 12, color: "var(--color-ink2)", display: "flex", alignItems: "center", gap: 6 }}>
                                <input
                                  type="checkbox"
                                  checked={c.appendGallery}
                                  onChange={(e) => patchCfg(p.id, { appendGallery: e.target.checked })}
                                  style={{ accentColor: "var(--color-accent)" }}
                                />
                                Ajouter à la galerie (sinon remplace)
                              </label>
                              <label style={{ fontSize: 12, color: "var(--color-ink2)", display: "flex", alignItems: "center", gap: 6 }}>
                                <input
                                  type="checkbox"
                                  checked={c.keepMainImage}
                                  onChange={(e) => patchCfg(p.id, { keepMainImage: e.target.checked })}
                                  style={{ accentColor: "var(--color-accent)" }}
                                />
                                Garder l'image principale
                              </label>
                            </div>
                            <div style={{ marginTop: 12 }}>
                              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--color-ink3)", textTransform: "uppercase", margin: "0 0 8px" }}>
                                Couleurs (vide = toutes)
                              </p>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {variants.length === 0 ? (
                                  <span style={{ fontSize: 12, color: "var(--color-ink4)" }}>
                                    Aucune variante connue.
                                  </span>
                                ) : (
                                  variants.map((v, vi) => {
                                    const key = v.color;
                                    const label = v.color_name || v.color;
                                    const on = c.colors.includes(key);
                                    return (
                                      <label
                                        key={`${key}-${vi}`}
                                        title={label}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          fontSize: 12,
                                          color: "var(--color-ink2)",
                                          cursor: "pointer",
                                          padding: "4px 10px",
                                          borderRadius: 8,
                                          border: "1px solid var(--color-border)",
                                          background: on ? "var(--color-accent-bg)" : "var(--color-surface)",
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={on}
                                          onChange={() =>
                                            patchCfg(p.id, {
                                              colors: on
                                                ? c.colors.filter((x) => x !== key)
                                                : [...c.colors, key],
                                            })
                                          }
                                          style={{ accentColor: "var(--color-accent)" }}
                                        />
                                        {v.image ? (
                                          <img
                                            src={v.image}
                                            alt={label}
                                            style={{ width: 22, height: 22, borderRadius: 6, objectFit: "cover" }}
                                          />
                                        ) : null}
                                        {label}
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table des jobs */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 12,
          border: "1px solid var(--color-border)",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 12,
            color: "var(--color-ink)",
          }}
        >
          <thead>
            <tr style={{ background: "var(--color-surface2)" }}>
              {["Produit", "Statut", "Tent.", "Détail", "MAJ", ""].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 11,
                    textTransform: "uppercase",
                    color: "var(--color-ink3)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && !status ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--color-ink3)" }}>
                  Chargement de la file…
                </td>
              </tr>
            ) : !status || status.jobs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--color-ink3)" }}>
                  File vide — mettez des produits en file pour commencer.
                </td>
              </tr>
            ) : (
              status.jobs.map((j: MockupJob) => {
                const st = STATUS_STYLE[j.status] || STATUS_STYLE.queued;
                const detail =
                  j.status === "done"
                    ? `${(j.result as any)?.mockupsGenerated ?? "?"} mockup(s)`
                    : j.status === "failed"
                      ? String((j.result as any)?.error || "Échec")
                      : j.task_key
                        ? `task ${String(j.task_key).slice(0, 8)}…`
                        : "—";
                return (
                  <tr
                    key={j.id}
                    style={{ borderTop: "1px solid var(--color-border)" }}
                  >
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      {j.product_title || j.product_id}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 10,
                          fontWeight: 800,
                          color: st.color,
                          background: st.bg,
                        }}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{j.attempts}</td>
                    <td
                      style={{
                        padding: "10px 12px",
                        maxWidth: 320,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        color: "var(--color-ink2)",
                      }}
                      title={typeof detail === "string" ? detail : ""}
                    >
                      {detail}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: "var(--color-ink3)" }}>
                      {fmtDate(j.updated_at)}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {j.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => handleRetry(j.product_id)}
                          title="Remettre en file"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid var(--color-border2)",
                            background: "var(--color-surface)",
                            color: "var(--color-ink2)",
                            fontWeight: 700,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          <RotateCcw size={12} /> Relancer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {/* Rapport (Phase 4) */}
      {status && status.jobs.length > 0 && (
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: "12px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "var(--color-ink)",
                margin: 0,
              }}
            >
              Rapport —{" "}
              {status.jobs
                .filter((j) => j.status === "done")
                .reduce(
                  (s, j) =>
                    s + Number((j.result as any)?.mockupsGenerated || 0),
                  0,
                )}{" "}
              mockup(s) généré(s) sur {status.jobs.length} job(s) listé(s)
              <span
                style={{ fontWeight: 400, color: "var(--color-ink3)" }}
              >
                {" "}
                (plafond Printful ~20 000 fichiers/jour)
              </span>
            </p>
            <button
              type="button"
              onClick={handleExportJobs}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border2)",
                background: "var(--color-surface2)",
                color: "var(--color-ink2)",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              <Download size={13} /> CSV
            </button>
          </div>
        </div>
      )}
      <p style={{ fontSize: 11, color: "var(--color-ink4)", margin: 0 }}>
        Limite Printful : ~8 créations/min (file pacée automatiquement).
        Astuce : le bouton Traiter peut être remplacé par un cron toutes les
        3 min (voir migration 20261019).
      </p>
    </div>
  );
}
