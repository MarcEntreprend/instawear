// src\admin\PromotionsPage.tsx

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Tag,
  ArrowUp,
  ArrowDown,
  Save,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
import { productApi, heroPromotionsApi } from "../api/supabaseApi";
import { useCurrencySymbol } from "../hooks/useCurrencySymbol";
// Styles formulaire canoniques (Vague C3 réduit : fini la copie locale).
import { formInputStyle, formLabelStyle } from "./adminStyles";
import ProductQuickViewModal from "./ProductQuickViewModal";
import { HERO_BG_FALLBACK, heroBackground, isLightHeroBg, normalizeHeroLink } from "../components/HeroCarousel";
import AdminImageInput from "./ui/AdminImageInput";
import type { HeroPromotion, AdminProduct } from "./adminTypes";

// Presets de fond hero (Phase 1 : fini le CSS technique à la main —
// le champ libre reste en "avancé"). Noms humains, valeurs testées.
// `light` = texte sombre dans l'aperçu (et lisibilité du slide réel).
const HERO_BG_PRESETS: Array<{ label: string; value: string }> = [
  { label: "Sombre", value: HERO_BG_FALLBACK },
  { label: "Crème", value: "linear-gradient(135deg, #faf7f0 0%, #f3ece0 60%, #faf7f0 100%)" },
  { label: "Terracotta", value: "linear-gradient(135deg, #c2452a 0%, #e07a4e 60%, #c2452a 100%)" },
  { label: "Sauge", value: "linear-gradient(135deg, #5b6b4f 0%, #8a9b7a 60%, #5b6b4f 100%)" },
  { label: "Nuit bleue", value: "linear-gradient(135deg, #1c2340 0%, #3a4a7a 60%, #1c2340 100%)" },
  { label: "Sable doré", value: "linear-gradient(135deg, #f0b13d 0%, #f7d789 60%, #f0b13d 100%)" },
];

export default function PromotionsPage() {
  // Devise du store (Vague B item 7/11 : fini le "$" en dur).
  const currencySymbol = useCurrencySymbol();
  const [promotions, setPromotions] = useState<HeroPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<AdminProduct[]>([]);
  const [quickViewProduct, setQuickViewProduct] = useState<AdminProduct | null>(
    null,
  );

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<HeroPromotion>>({
    productId: "",
    title: "",
    headline: "",
    sub: "",
    cta: "Voir",
    bgGradient: HERO_BG_FALLBACK,
    tag: "Promotion",
    order: 0,
    isActive: true,
    showTag: true,
    showTitle: true,
  });

  // Charger les promotions et les produits depuis Supabase
  useEffect(() => {
    Promise.all([heroPromotionsApi.list(), productApi.list()])
      .then(([promos, prods]) => {
        setPromotions(promos);
        setAllProducts(prods);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // rafraîchir
  const refresh = async () => {
    try {
      const promos = await heroPromotionsApi.list();
      for (const promo of promos) {
        const product = allProducts.find((p) => p.id === promo.productId);
        if (
          (!product || product.isActive === false) &&
          promo.isActive !== false
        ) {
          await heroPromotionsApi.update(promo.id, { isActive: false } as any);
          promo.isActive = false;
        }
      }
      setPromotions(promos);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId) return;
    // Garde prix promo (Vague B item 11) : un deal actif exige un prix
    // valide (< prix normal), sinon la promo est sans effet en boutique.
    const formDealActive = (form as any).dealActive ?? false;
    const formDealPrice = (form as any).dealPrice;
    if (formDealActive) {
      const normalPrice = getProductById(form.productId!)?.price;
      if (
        formDealPrice == null ||
        !(formDealPrice > 0) ||
        (normalPrice != null && formDealPrice >= normalPrice)
      ) {
        alert(
          "Prix promo invalide : il doit être supérieur à 0 et inférieur au prix normal du produit.",
        );
        return;
      }
    }

    try {
      if (editingId) {
        await heroPromotionsApi.update(editingId, form);
        // Synchroniser les champs deal sur le produit
        const dealActive = (form as any).dealActive ?? false;
        await syncProductDeal(
          form.productId!,
          dealActive,
          (form as any).dealPrice,
          (form as any).dealEndsAt,
        );
        // Notification
        import("../api/supabaseApi").then(({ notificationApi }) => {
          notificationApi
            .create({
              title: "Promotion modifiée",
              description: `"${form.headline || form.title || "Sans titre"}" mise à jour`,
              category: "bonus",
              priority: "low",
              metadata: { linkTo: "/admin/promotions", source: "Système" },
              action_label: "Voir les promotions",
            })
            .catch(() => {});
        });
      } else {
        const created = await heroPromotionsApi.create({
          ...form,
          productId: form.productId!,
          order: promotions.length,
        } as HeroPromotion);
        // Notification
        import("../api/supabaseApi").then(({ notificationApi }) => {
          notificationApi
            .create({
              title: "Nouvelle promotion créée",
              description: `"${created.headline || created.title || "Sans titre"}" ajoutée au carrousel`,
              category: "bonus",
              priority: "medium",
              metadata: { linkTo: "/admin/promotions", source: "Système" },
              action_label: "Voir les promotions",
            })
            .catch(() => {});
        });
        // Activer dealActive sur le produit
        await syncProductDeal(
          created.productId,
          true,
          (form as any).dealPrice,
          (form as any).dealEndsAt,
        );
      }
      await refresh();
      resetForm();
    } catch (err) {
      console.error("Erreur sauvegarde promotion", err);
    }
  };

  const handleDelete = async (id: string) => {
    const promo = promotions.find((p) => p.id === id);
    if (window.confirm("Supprimer cette promotion du carrousel ?")) {
      await heroPromotionsApi.delete(id);

      // Désactiver dealActive si aucune autre promo n'utilise ce produit
      if (!hasOtherActivePromo(promo!.productId, id)) {
        await syncProductDeal(promo!.productId, false);
      }

      // Notification
      import("../api/supabaseApi").then(({ notificationApi }) => {
        notificationApi
          .create({
            title: "Promotion supprimée",
            description: `"${promo?.headline || promo?.title || "Sans titre"}" retirée du carrousel`,
            category: "bonus",
            priority: "medium",
            metadata: { linkTo: "/admin/promotions", source: "Système" },
            action_label: "Voir les promotions",
          })
          .catch(() => {});
      });
      await refresh();
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const list = [...promotions];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= list.length) return;
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    const reordered = list.map((p, i) => ({ ...p, order: i }));
    setPromotions(reordered);
    try {
      await heroPromotionsApi.reorder(reordered.map((p) => p.id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleEdit = (promo: HeroPromotion) => {
    const product = getProductById(promo.productId);
    setForm({
      ...promo,
      dealActive: product?.dealActive ?? false,
      dealPrice: product?.dealPrice,
      dealEndsAt: product?.dealEndsAt,
    } as any);
    setEditingId(promo.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      productId: "",
      title: "",
      headline: "",
      sub: "",
      cta: "Voir",
      bgGradient: HERO_BG_FALLBACK,
      tag: "Promotion",
      order: promotions.length,
      isActive: true,
      showTag: true,
      showTitle: true,
      layout: "full",
      kind: "product",
      linkUrl: "",
      image: "",
      tiles: [],
    } as any);
    setEditingId(null);
    setShowForm(false);
  };

  const getProductById = (id: string) => allProducts.find((p) => p.id === id);

  // Synchronise dealActive sur le produit (Vague B item 11) :
  // - isLimitedTime suit TOUJOURS active (fini le jamais-remis-à-false) ;
  // - null explicites pour effacer (undefined = ignoré par l'API) ;
  // - jamais de deal actif sans prix (garde dans les appelants).
  const syncProductDeal = async (
    productId: string,
    active: boolean,
    dealPrice?: number,
    dealEndsAt?: string,
  ) => {
    try {
      await productApi.update(productId, {
        dealActive: active,
        isLimitedTime: active,
        dealPrice: active ? (dealPrice ?? null) : null,
        dealEndsAt: active ? (dealEndsAt ?? null) : null,
      } as any);

      window.dispatchEvent(new Event("storefront:invalidate"));

      const prods = await productApi.list();
      setAllProducts(prods);
    } catch (e) {
      console.error("Erreur synchro deal produit", e);
    }
  };

  // Vérifie si un produit est encore utilisé par une autre promo active
  const hasOtherActivePromo = (productId: string, excludeId?: string) => {
    return promotions.some(
      (p) =>
        p.productId === productId && p.isActive !== false && p.id !== excludeId,
    );
  };

  if (loading) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              Promotions & Deals
            </h2>
            <button
              onClick={refresh}
              title="Rafraîchir les promotions"
              style={{
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: "4px 8px",
                cursor: "pointer",
                color: "var(--color-ink2)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <RefreshCw size={14} strokeWidth={2} />
            </button>
          </div>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            Gérez les produits affichés dans le carrousel Hero de la boutique.
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setForm({
              productId: "",
              title: "",
              headline: "",
              sub: "",
              cta: "Voir",
              bgGradient: HERO_BG_FALLBACK,
              tag: "Promotion",
              order: promotions.length,
              showTag: true,
              showTitle: true,
            });
          }}
          style={primaryBtn}
        >
          <Plus size={15} strokeWidth={2.5} />
          Nouvelle promotion
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <div style={cardStyle}>
          <h3
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "var(--color-ink)",
              marginBottom: 16,
            }}
          >
            {editingId ? "Modifier la promotion" : "Nouvelle promotion"}
          </h3>
          <form
            onSubmit={handleSave}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div>
                <label style={labelStyle}>Produit à promouvoir *</label>
                <select
                  value={form.productId}
                  onChange={(e) =>
                    setForm({ ...form, productId: e.target.value })
                  }
                  style={inputStyle}
                  required
                >
                  <option value="">-- Sélectionner un produit --</option>
                  {allProducts
                    .filter((p) => p.isActive)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Titre (override)</label>
                <input
                  type="text"
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={inputStyle}
                  placeholder="Laisse vide pour utiliser le titre du produit"
                />
              </div>
              <div>
                <label style={labelStyle}>Tag (badge)</label>
                <input
                  type="text"
                  value={form.tag || ""}
                  onChange={(e) => setForm({ ...form, tag: e.target.value })}
                  style={inputStyle}
                  placeholder="Promotion"
                />
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                <label
                  style={{
                    ...labelStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.showTag !== false}
                    onChange={(e) =>
                      setForm({ ...form, showTag: e.target.checked })
                    }
                  />
                  Afficher le badge
                </label>
                <label
                  style={{
                    ...labelStyle,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 0,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.showTitle !== false}
                    onChange={(e) =>
                      setForm({ ...form, showTitle: e.target.checked })
                    }
                  />
                  Afficher le titre du produit
                </label>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Accroche — double style</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div>
                  <input
                    type="text"
                    value={(form.headline || "").split("\n")[0] || ""}
                    onChange={(e) => {
                      const parts = (form.headline || "").split("\n");
                      const p2 = parts[1] || "";
                      const v1 = e.target.value;
                      setForm({ ...form, headline: p2 ? `${v1}\n${p2}` : v1 });
                    }}
                    style={inputStyle}
                    placeholder='Ligne 1 — normal (ex: "Franchissez")'
                  />
                  <span style={{ fontSize: 10, color: "var(--color-ink4)" }}>
                    Style normal
                  </span>
                </div>
                <div>
                  <input
                    type="text"
                    value={(form.headline || "").split("\n")[1] || ""}
                    onChange={(e) => {
                      const parts = (form.headline || "").split("\n");
                      const p1 = parts[0] || "";
                      const v2 = e.target.value;
                      setForm({ ...form, headline: v2 ? `${p1}\n${v2}` : p1 });
                    }}
                    style={{
                      ...inputStyle,
                      fontStyle: "italic",
                      fontFamily: "var(--font-serif)",
                    }}
                    placeholder='Ligne 2 — italique (ex: "la ligne.")'
                  />
                  <span style={{ fontSize: 10, color: "var(--color-ink4)" }}>
                    Italique / emphase
                  </span>
                </div>
              </div>
              {form.headline && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--color-ink4)",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    Aperçu
                  </span>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      lineHeight: 1,
                      marginTop: 4,
                      color: "var(--color-ink)",
                    }}
                  >
                    {(form.headline || "")
                      .split("\n")
                      .map((line: string, i: number) => (
                        <span
                          key={i}
                          style={{
                            display: "block",
                            fontStyle: i === 1 ? "italic" : "normal",
                            fontFamily:
                              i === 1 ? "var(--font-serif)" : undefined,
                          }}
                        >
                          {line || (i === 0 ? "—" : "")}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              <p
                style={{
                  fontSize: 11,
                  color: "var(--color-ink4)",
                  marginTop: 6,
                }}
              >
                Laisse la 2e ligne vide pour un seul style. Exemples :
                “Franchissez” + “la ligne.” → <b>Franchissez</b>{" "}
                <i style={{ fontFamily: "var(--font-serif)" }}>la ligne.</i>
              </p>
            </div>
            <div>
              <label style={labelStyle}>Sous-texte</label>
              <input
                type="text"
                value={form.sub || ""}
                onChange={(e) => setForm({ ...form, sub: e.target.value })}
                style={inputStyle}
                placeholder="Description courte"
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div>
                <label style={labelStyle}>Texte du bouton (CTA)</label>
                <input
                  type="text"
                  value={form.cta || ""}
                  onChange={(e) => setForm({ ...form, cta: e.target.value })}
                  style={inputStyle}
                  placeholder="Voir"
                />
              </div>
              <div>
                <label style={labelStyle}>Dégradé de fond</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {HERO_BG_PRESETS.map((p) => {
                    const selected =
                      (form.bgGradient || HERO_BG_FALLBACK) === p.value;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        title={p.label}
                        onClick={() =>
                          setForm({ ...form, bgGradient: p.value })
                        }
                        style={{
                          width: 40,
                          height: 28,
                          borderRadius: 8,
                          background: p.value,
                          border: selected
                            ? "2px solid var(--color-accent)"
                            : "1px solid var(--color-border)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      />
                    );
                  })}
                </div>
                <input
                  type="text"
                  value={form.bgGradient || ""}
                  onChange={(e) =>
                    setForm({ ...form, bgGradient: e.target.value })
                  }
                  style={{ ...inputStyle, marginTop: 8 }}
                  placeholder="Personnalisé (CSS avancé)"
                />
              </div>
            </div>

            {/* ── Visuel hero (standardisé : lien + import + DnD + Ctrl+V) ── */}
            <AdminImageInput
              label="Visuel du slide (optionnel)"
              value={(form as any).image || ""}
              onChange={(url) => setForm({ ...form, image: url } as any)}
              folder="hero"
              placeholder="https://… (vide = image du produit)"
            />

            {/* ── Type de slide (Phase 2) ── */}
            <div>
              <label style={labelStyle}>Type de slide</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    { value: "product", label: "Produit", desc: "Fiche produit : image + titre + prix du produit choisi." },
                    { value: "image", label: "Visuel", desc: "Ta propre image plein cadre (ex. créa jaune) + bouton." },
                    { value: "grid", label: "Grille", desc: "Visuel principal + tuiles cliquables (style Shein)." },
                  ] as const
                ).map((o) => {
                  const selected =
                    ((form as any).kind ?? "product") === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      title={o.desc}
                      onClick={() =>
                        setForm({ ...form, kind: o.value } as any)
                      }
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: selected
                          ? "2px solid var(--color-accent)"
                          : "1px solid var(--color-border)",
                        background: selected
                          ? "var(--color-accent-bg)"
                          : "var(--color-surface2)",
                        color: "var(--color-ink)",
                        fontWeight: selected ? 700 : 500,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--color-border)",
                  background:
                    ((form as any).kind ?? "product") === "image" &&
                    !(form as any).image
                      ? "var(--color-accent-bg)"
                      : "var(--color-surface2)",
                  fontSize: 11,
                  color: "var(--color-ink2)",
                  lineHeight: 1.5,
                }}
              >
                {((form as any).kind ?? "product") === "product" && (
                  <span>
                    <strong>Mode Produit :</strong> tout vient du produit choisi
                    ci-dessus (image, titre, prix). Seul le bouton peut suivre
                    ton lien ci-dessous.
                  </span>
                )}
                {((form as any).kind ?? "product") === "image" && (
                  <span>
                    <strong>Mode Visuel :</strong>{" "}
                    {!(form as any).image
                      ? "⚠️ ajoute ton image dans « Visuel du slide » plus haut — sans elle, ce slide est identique au mode Produit."
                      : "ton image s'affiche en grand ; le bouton suit ton lien ci-dessous."}
                  </span>
                )}
                {((form as any).kind ?? "product") === "grid" && (
                  <span>
                    <strong>Mode Grille :</strong> visuel principal +
                    tuiles cliquables ci-dessous.
                  </span>
                )}
              </div>
            </div>

            {/* ── Lien au clic (tous kinds : vide = fiche produit) ── */}
            <div>
              <label style={labelStyle}>Lien au clic (vide = fiche produit)</label>
              <input
                type="text"
                value={(form as any).linkUrl || ""}
                onChange={(e) =>
                  setForm({ ...form, linkUrl: e.target.value } as any)
                }
                onBlur={(e) => {
                  const v = normalizeHeroLink(e.target.value);
                  if (v !== e.target.value)
                    setForm({ ...form, linkUrl: v } as any);
                }}
                style={inputStyle}
                placeholder="/promotions ou URL complète du site"
              />
              <p style={{ fontSize: 11, color: "var(--color-ink3)", marginTop: 4 }}>
                Ex. <code>/promotions</code>, <code>/recherche?q=robe</code> ou l'URL complète copiée du navigateur (convertie auto). Les liens externes sont refusés.
              </p>
            </div>

            {/* ── Tuiles (grid, max 3) ── */}
            {(form as any).kind === "grid" && (
              <div>
                <label style={labelStyle}>
                  Tuiles ({((form as any).tiles || []).length}/3)
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {((form as any).tiles || []).map((t: any, ti: number) => (
                    <div
                      key={ti}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "flex-start",
                        padding: 10,
                        borderRadius: 10,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface2)",
                      }}
                    >
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                        <AdminImageInput
                          value={t.image || ""}
                          onChange={(url) => {
                            const tiles = [...((form as any).tiles || [])];
                            tiles[ti] = { ...tiles[ti], image: url };
                            setForm({ ...form, tiles } as any);
                          }}
                          folder="hero"
                          placeholder="Image https://… (lien, import, dépôt, Ctrl+V)"
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            type="text"
                            value={t.label || ""}
                            onChange={(e) => {
                              const tiles = [...((form as any).tiles || [])];
                              tiles[ti] = { ...tiles[ti], label: e.target.value };
                              setForm({ ...form, tiles } as any);
                            }}
                            style={{ ...inputStyle, flex: 1 }}
                            placeholder="Libellé"
                          />
                          <input
                            type="text"
                            value={t.link || ""}
                            onChange={(e) => {
                              const tiles = [...((form as any).tiles || [])];
                              tiles[ti] = { ...tiles[ti], link: e.target.value };
                              setForm({ ...form, tiles } as any);
                            }}
                            onBlur={(e) => {
                              const v = normalizeHeroLink(e.target.value);
                              if (v !== e.target.value) {
                                const tiles = [...((form as any).tiles || [])];
                                tiles[ti] = { ...tiles[ti], link: v };
                                setForm({ ...form, tiles } as any);
                              }
                            }}
                            style={{ ...inputStyle, flex: 1 }}
                            placeholder="Lien /… (URL complète acceptée)"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const tiles = ((form as any).tiles || []).filter(
                            (_: any, i: number) => i !== ti,
                          );
                          setForm({ ...form, tiles } as any);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          fontSize: 16,
                          padding: 4,
                          flexShrink: 0,
                        }}
                        title="Retirer"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {((form as any).tiles || []).length < 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          tiles: [...((form as any).tiles || []), { image: "", label: "", link: "" }],
                        } as any)
                      }
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px dashed var(--color-border2)",
                        background: "transparent",
                        color: "var(--color-ink2)",
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      + Ajouter une tuile
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Mise en page du slide ── */}
            <div>
              <label style={labelStyle}>Mise en page</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    { value: "full", label: "Plein écran (image de fond)" },
                    { value: "split", label: "Partagé (fond + visuel cadré)" },
                  ] as const
                ).map((o) => {
                  const selected =
                    ((form as any).layout ?? "full") === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() =>
                        setForm({ ...form, layout: o.value } as any)
                      }
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: selected
                          ? "2px solid var(--color-accent)"
                          : "1px solid var(--color-border)",
                        background: selected
                          ? "var(--color-accent-bg)"
                          : "var(--color-surface2)",
                        color: "var(--color-ink)",
                        fontWeight: selected ? 700 : 500,
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Aperçu live du slide (fidèle au choix) ── */}
            {((form as any).layout ?? "full") === "full" ? (
              <div
                style={{
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid var(--color-border)",
                  minHeight: 140,
                  padding: "20px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: "#1a1712",
                  backgroundImage:
                    ((form as any).image ||
                      getProductById(form.productId!)?.image)
                      ? `linear-gradient(90deg, rgba(15,13,10,.68) 0%, rgba(15,13,10,.28) 55%, transparent 100%), url(${(form as any).image || getProductById(form.productId!)?.image})`
                      : heroBackground(form.bgGradient),
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {(form.showTag !== false) && (
                  <span
                    style={{
                      display: "inline-block",
                      alignSelf: "flex-start",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: "#fff",
                      background: "rgba(255,255,255,.14)",
                      borderRadius: 999,
                      padding: "3px 10px",
                    }}
                  >
                    {(form.tag || "Promotion").slice(0, 24)}
                  </span>
                )}
                <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: "#fff" }}>
                  {((form.headline || "").split("\n")[0] || form.title || "Titre") as string}
                </div>
                <div
                  style={{
                    display: "inline-block",
                    alignSelf: "flex-start",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fff",
                    background: "var(--color-accent)",
                    borderRadius: 999,
                    padding: "7px 16px",
                  }}
                >
                  {form.cta || "Voir"}
                </div>
              </div>
            ) : (
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid var(--color-border)",
                background: heroBackground(form.bgGradient),
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "20px 24px",
                minHeight: 140,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {(form.showTag !== false) && (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      color: "var(--color-accent)",
                      background: "var(--color-accent-bg)",
                      borderRadius: 999,
                      padding: "3px 10px",
                      marginBottom: 8,
                    }}
                  >
                    {(form.tag || "Promotion").slice(0, 24)}
                  </span>
                )}
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    color: isLightHeroBg(form.bgGradient)
                      ? "var(--color-ink)"
                      : "#fff",
                  }}
                >
                  {((form.headline || "").split("\n")[0] ||
                    form.title ||
                    "Titre") as string}
                </div>
                {(form.sub || "") && (
                  <div
                    style={{
                      fontSize: 12,
                      color: isLightHeroBg(form.bgGradient)
                        ? "var(--color-ink2)"
                        : "rgba(255,255,255,.75)",
                      marginTop: 6,
                    }}
                  >
                    {(form.sub || "").slice(0, 80)}
                  </div>
                )}
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#fff",
                    background: "var(--color-accent)",
                    borderRadius: 999,
                    padding: "7px 16px",
                  }}
                >
                  {form.cta || "Voir"}
                </div>
              </div>
              {(form as any).image ||
              getProductById(form.productId!)?.image ? (
                <img
                  src={
                    ((form as any).image ||
                      getProductById(form.productId!)?.image) as string
                  }
                  alt=""
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: "cover",
                    borderRadius: 12,
                    flexShrink: 0,
                  }}
                />
              ) : null}
            </div>
            )}

            {/* ── Options Deal ── */}
            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                paddingTop: 14,
                marginTop: 4,
              }}
            >
              <label style={{ ...labelStyle, marginBottom: 10 }}>
                🏷️ Options du deal
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 14,
                }}
              >
                <div>
                  <label style={labelStyle}>Deal actif</label>
                  <select
                    value={(form as any).dealActive ? "yes" : "no"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        dealActive: e.target.value === "yes",
                      } as any)
                    }
                    style={inputStyle}
                  >
                    <option value="no">Non</option>
                    <option value="yes">Oui</option>
                  </select>
                </div>
                {(form as any).dealActive && (
                  <>
                    <div>
                      <label style={labelStyle}>
                        Prix normal (qui sera barré)
                      </label>
                      <input
                        type="text"
                        value={`${(getProductById(form.productId!) as any)?.price?.toFixed(2) ?? "—"} ${currencySymbol}`}
                        readOnly
                        style={{
                          ...inputStyle,
                          opacity: 0.7,
                          cursor: "not-allowed",
                        }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>
                        Prix promo (doit être inférieur au prix normal, en{" "}
                        {currencySymbol})
                      </label>
                      <input
                        type="number"
                        value={(form as any).dealPrice || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            dealPrice: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          } as any)
                        }
                        style={inputStyle}
                        step="0.01"
                        min={0}
                        placeholder="Optionnel"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Fin du deal</label>
                      <input
                        type="datetime-local"
                        value={
                          (form as any).dealEndsAt
                            ? (form as any).dealEndsAt.slice(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            dealEndsAt: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : undefined,
                          } as any)
                        }
                        style={inputStyle}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div
              style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}
            >
              <button type="button" onClick={resetForm} style={secondaryBtn}>
                Annuler
              </button>
              <button type="submit" style={primaryBtn}>
                <Save size={15} strokeWidth={2} />
                {editingId ? "Mettre à jour" : "Créer"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Liste des promotions */}
      <div style={cardStyle}>
        <h3
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: "var(--color-ink)",
            marginBottom: 16,
          }}
        >
          Promotions actives ({promotions.length})
        </h3>
        {promotions.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: "var(--color-ink4)",
              textAlign: "center",
              padding: 20,
            }}
          >
            Aucune promotion. Créez-en une pour qu'elle apparaisse dans le
            carrousel.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {promotions
              .sort((a, b) => a.order - b.order)
              .map((promo, idx) => {
                const product = getProductById(promo.productId);
                return (
                  <div
                    key={promo.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "12px 0",
                      borderBottom: "1px solid var(--color-border)",
                      opacity: promo.isActive !== false ? 1 : 0.5,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <button
                        onClick={() => move(idx, -1)}
                        style={arrowBtn}
                        disabled={idx === 0}
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => move(idx, 1)}
                        style={arrowBtn}
                        disabled={idx === promotions.length - 1}
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                    <button
                      onClick={() => product && setQuickViewProduct(product)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "var(--color-surface2)",
                        flexShrink: 0,
                        border: "none",
                        padding: 0,
                        cursor: product ? "pointer" : "default",
                      }}
                      disabled={!product}
                    >
                      <img
                        src={product?.image || promo.image || ""}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button
                        onClick={() => product && setQuickViewProduct(product)}
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "var(--color-ink)",
                          background: "none",
                          border: "none",
                          cursor: product ? "pointer" : "default",
                          textAlign: "left",
                          padding: 0,
                          textDecoration: "underline",
                          textUnderlineOffset: 3,
                        }}
                        disabled={!product}
                      >
                        {promo.headline || product?.title || "Sans produit"}
                      </button>
                      <p style={{ fontSize: 12, color: "var(--color-ink3)" }}>
                        {promo.sub || product?.description?.slice(0, 80)}
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: "var(--color-accent)",
                          marginTop: 2,
                        }}
                      >
                        <Tag
                          size={12}
                          style={{ verticalAlign: "middle", marginRight: 4 }}
                        />
                        {product ? product.title : "Produit introuvable"}
                      </p>
                    </div>
                    <div
                      style={{ display: "flex", gap: 6, alignItems: "center" }}
                    >
                      {(!product || product.isActive === false) && (
                        <span title="Produit indisponible">
                          <AlertTriangle
                            size={12}
                            style={{ color: "var(--color-ink4)" }}
                          />
                        </span>
                      )}
                      {/* Bouton Activer/Désactiver (œil) */}
                      <button
                        onClick={async () => {
                          const product = getProductById(promo.productId);
                          if (!product || product.isActive === false) {
                            alert(
                              "Produit introuvable ou inactif. Réactivez-le d'abord.",
                            );
                            return;
                          }
                          const newActive = !(promo.isActive ?? true);
                          await heroPromotionsApi.update(promo.id, {
                            isActive: newActive,
                          } as any);
                          // Synchroniser dealActive — jamais sans prix
                          // (Vague B item 11 : un deal actif sans prix
                          // promo est sans effet côté boutique).
                          if (newActive) {
                            const dp = product.dealPrice;
                            if (
                              dp == null ||
                              !(dp > 0) ||
                              dp >= product.price
                            ) {
                              await heroPromotionsApi.update(promo.id, {
                                isActive: false,
                              } as any);
                              alert(
                                "Activation annulée : le produit n'a pas de prix promo valide (doit être > 0 et < prix normal). Ouvrez « Modifier » pour le renseigner.",
                              );
                              await refresh();
                              return;
                            }
                            await syncProductDeal(
                              promo.productId,
                              true,
                              dp,
                              product.dealEndsAt ?? undefined,
                            );
                          } else if (
                            !hasOtherActivePromo(promo.productId, promo.id)
                          ) {
                            await syncProductDeal(promo.productId, false);
                          }
                          await refresh();
                        }}
                        title={
                          promo.isActive !== false ? "Désactiver" : "Activer"
                        }
                        style={{
                          ...iconBtn,
                          padding: "4px 8px",
                        }}
                      >
                        {promo.isActive !== false ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </button>
                      <button onClick={() => handleEdit(promo)} style={iconBtn}>
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
                        style={{ ...iconBtn, color: "#ef4444" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
};

const labelStyle = formLabelStyle;

const inputStyle = formInputStyle;

const primaryBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 16px",
  borderRadius: 10,
  border: "none",
  background: "var(--color-accent)",
  color: "white",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "var(--font-body)",
};

const secondaryBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 10,
  border: "1.5px solid var(--color-border2)",
  background: "var(--color-surface)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const iconBtn: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  color: "var(--color-ink2)",
  fontSize: 12,
  fontWeight: 600,
};

const arrowBtn: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--color-border)",
  borderRadius: 4,
  padding: 2,
  cursor: "pointer",
  color: "var(--color-ink4)",
  display: "flex",
};
