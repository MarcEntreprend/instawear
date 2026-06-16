import React, { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Tag, ArrowUp, ArrowDown, Save, X } from "lucide-react";
import type { HeroPromotion, AdminProduct } from "./adminTypes";
import { productApi, heroPromotionsApi } from "../api/supabaseApi";

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<HeroPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [allProducts, setAllProducts] = useState<AdminProduct[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<HeroPromotion>>({
    productId: "",
    title: "",
    headline: "",
    sub: "",
    cta: "Découvrir",
    bgGradient: "from-white via-indigo-50 to-white",
    tag: "⚡ PROMOTION",
    order: 0,
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

  // Persister dans Supabase ET rafraîchir l'état local
  const refresh = async () => {
    try {
      const promos = await heroPromotionsApi.list();
      setPromotions(promos);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId) return;

    try {
      if (editingId) {
        await heroPromotionsApi.update(editingId, form);
      } else {
        await heroPromotionsApi.create({
          ...form,
          productId: form.productId!,
          order: promotions.length,
        } as HeroPromotion);
      }
      await refresh();
      resetForm();
    } catch (err) {
      console.error("Erreur sauvegarde promotion", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Supprimer cette promotion du carrousel ?")) {
      await heroPromotionsApi.delete(id);
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
    setForm(promo);
    setEditingId(promo.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setForm({
      productId: "",
      title: "",
      headline: "",
      sub: "",
      cta: "Découvrir",
      bgGradient: "from-white via-indigo-50 to-white",
      tag: "⚡ PROMOTION",
      order: promotions.length,
      showTag: true,
      showTitle: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getProductById = (id: string) => allProducts.find((p) => p.id === id);

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
          justifyContent: "space-between",
          alignItems: "center",
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
            Promotions & Deals
          </h2>
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
              cta: "Découvrir",
              bgGradient: "from-white via-indigo-50 to-white",
              tag: "⚡ PROMOTION",
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
                  {allProducts.map((p) => (
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
                  placeholder="⚡ PROMOTION"
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
              <label style={labelStyle}>Accroche (headline)</label>
              <input
                type="text"
                value={form.headline || ""}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                style={inputStyle}
                placeholder="Phrase d'accroche percutante"
              />
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
                  placeholder="Découvrir"
                />
              </div>
              <div>
                <label style={labelStyle}>Dégradé de fond</label>
                <input
                  type="text"
                  value={form.bgGradient || ""}
                  onChange={(e) =>
                    setForm({ ...form, bgGradient: e.target.value })
                  }
                  style={inputStyle}
                  placeholder="from-white via-indigo-50 to-white"
                />
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
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "var(--color-surface2)",
                        flexShrink: 0,
                      }}
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
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontWeight: 700,
                          fontSize: 14,
                          color: "var(--color-ink)",
                        }}
                      >
                        {promo.headline || product?.title || "Sans produit"}
                      </p>
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
                    <div style={{ display: "flex", gap: 8 }}>
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
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-ink2)",
  display: "block",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  fontSize: 13,
  color: "var(--color-ink)",
  fontFamily: "var(--font-body)",
  outline: "none",
};

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
