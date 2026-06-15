// src/admin/ProductFormModal.tsx

import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { AdminProduct } from "./adminTypes";

const PLACEHOLDER_IMG =
  "https://cdn.pixabay.com/photo/2026/01/26/22/44/cat-10089737_1280.png";

interface ProductFormModalProps {
  // Pass null to create a new product, or an existing product to edit
  product: AdminProduct | null;
  onClose: () => void;
  onSave: (data: Omit<AdminProduct, "id" | "createdAt" | "updatedAt">) => void;
}

const EMPTY_FORM: Omit<AdminProduct, "id" | "createdAt" | "updatedAt"> = {
  isActive: true,
  title: "",
  brand: "INSTAWEAR",
  description: "",
  fullDescription: "",
  image: PLACEHOLDER_IMG,
  gallery: [PLACEHOLDER_IMG],
  mockupPreset: "",
  price: 24.99,
  originalPrice: undefined,
  inStock: true,
  stockQuantity: 100,
  colors: ["#000000", "#FFFFFF"],
  colorNames: ["Noir", "Blanc"],
  sizes: ["S", "M", "L", "XL"],
  sizeSurcharge: {},
  sizeGuide: undefined,
  category: "tshirt",
  eventType: "culture",
  style: "street",
  material: "coton-bio",
  tags: [],
  isBestSeller: false,
  isLimitedTime: false,
  dealActive: false,
  dealEndsAt: undefined,
  dealPrice: undefined,
  affiliateMode: false,
  affiliateUrl: undefined,
  externalProductId: undefined,
  externalVariantId: undefined,
  lastExternalSync: undefined,
  ratings: { score: 5, count: 0 },
  boughtLastMonth: 0,
};

export default function ProductFormModal({
  product,
  onClose,
  onSave,
}: ProductFormModalProps) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (product) {
      // Edit mode: fill form with existing product data, keeping EMPTY_FORM as fallback for missing fields
      setForm({
        isActive: product.isActive,
        title: product.title,
        brand: product.brand,
        description: product.description,
        fullDescription: product.fullDescription || "",
        image: product.image || PLACEHOLDER_IMG,
        gallery: product.gallery || [PLACEHOLDER_IMG],
        mockupPreset: product.mockupPreset || "",
        price: product.price,
        originalPrice: product.originalPrice,
        inStock: product.inStock,
        stockQuantity: product.stockQuantity ?? 0,
        colors: product.colors,
        colorNames: product.colorNames || product.colors.map(() => ""),
        sizes: product.sizes,
        sizeSurcharge: product.sizeSurcharge || {},
        sizeGuide: product.sizeGuide,
        category: product.category,
        eventType: product.eventType,
        style: product.style,
        material: product.material || "coton-bio",
        tags: product.tags,
        isBestSeller: product.isBestSeller || false,
        isLimitedTime: product.isLimitedTime || false,
        dealActive: product.dealActive || false,
        dealEndsAt: product.dealEndsAt,
        dealPrice: product.dealPrice,
        affiliateMode: product.affiliateMode || false,
        affiliateUrl: product.affiliateUrl,
        externalProductId: product.externalProductId,
        externalVariantId: product.externalVariantId,
        lastExternalSync: product.lastExternalSync,
        ratings: product.ratings || { score: 5, count: 0 },
        boughtLastMonth: product.boughtLastMonth || 0,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [product]);

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      // Ensure ratings and boughtLastMonth are sent, but they are not stored on creation (handled by backend)
      ratings: form.ratings || { score: 5, count: 0 },
      boughtLastMonth: form.boughtLastMonth || 0,
    });
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

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--color-ink2)",
    display: "block",
    marginBottom: 4,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 250,
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
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          zIndex: 251,
          background: "var(--color-surface)",
          borderRadius: 20,
          maxWidth: 800,
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
            style={{ fontWeight: 700, fontSize: 18, color: "var(--color-ink)" }}
          >
            {product ? "Modifier le produit" : "Nouveau produit"}
          </h3>
          <button
            onClick={onClose}
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
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Basics */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div>
              <label style={labelStyle}>Titre *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Marque</label>
              <input
                type="text"
                value={form.brand}
                onChange={(e) => update("brand", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Catégorie *</label>
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                style={inputStyle}
              >
                <option value="tshirt">T-shirt</option>
                <option value="hoodie">Hoodie</option>
                <option value="accessory">Accessoire</option>
                <option value="mug">Mug</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Type d'événement *</label>
              <select
                value={form.eventType}
                onChange={(e) => update("eventType", e.target.value)}
                style={inputStyle}
              >
                <option value="live">Live</option>
                <option value="sport">Sport</option>
                <option value="culture">Culture</option>
                <option value="saisonnier">Saisonnier</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Style *</label>
              <select
                value={form.style}
                onChange={(e) => update("style", e.target.value)}
                style={inputStyle}
              >
                <option value="street">Street</option>
                <option value="retro">Retro</option>
                <option value="cute">Cute</option>
                <option value="cozy">Cozy</option>
                <option value="commute">Commute</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Matériau</label>
              <input
                type="text"
                value={form.material || ""}
                onChange={(e) => update("material", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Visibilité</label>
              <select
                value={form.isActive ? "active" : "inactive"}
                onChange={(e) =>
                  update("isActive", e.target.value === "active")
                }
                style={inputStyle}
              >
                <option value="active">Actif</option>
                <option value="inactive">Inactif</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>En stock</label>
              <select
                value={form.inStock ? "yes" : "no"}
                onChange={(e) => update("inStock", e.target.value === "yes")}
                style={inputStyle}
              >
                <option value="yes">Oui</option>
                <option value="no">Non (sur commande)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Quantité en stock</label>
              <input
                type="number"
                value={form.stockQuantity}
                onChange={(e) =>
                  update("stockQuantity", Number(e.target.value))
                }
                style={inputStyle}
                min={0}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description courte *</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              style={{ ...inputStyle, minHeight: 60 }}
              required
            />
          </div>
          <div>
            <label style={labelStyle}>Description longue (markdown)</label>
            <textarea
              value={form.fullDescription}
              onChange={(e) => update("fullDescription", e.target.value)}
              style={{ ...inputStyle, minHeight: 80 }}
            />
          </div>

          {/* Price & deals */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
            }}
          >
            <div>
              <label style={labelStyle}>Prix (€) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => update("price", Number(e.target.value))}
                style={inputStyle}
                step="0.01"
                min={0}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Prix barré (€)</label>
              <input
                type="number"
                value={form.originalPrice || ""}
                onChange={(e) =>
                  update(
                    "originalPrice",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                style={inputStyle}
                step="0.01"
                min={0}
              />
            </div>
            <div>
              <label style={labelStyle}>Deal actif</label>
              <select
                value={form.dealActive ? "yes" : "no"}
                onChange={(e) => update("dealActive", e.target.value === "yes")}
                style={inputStyle}
              >
                <option value="no">Non</option>
                <option value="yes">Oui</option>
              </select>
            </div>
            {form.dealActive && (
              <>
                <div>
                  <label style={labelStyle}>Prix deal (€)</label>
                  <input
                    type="number"
                    value={form.dealPrice || ""}
                    onChange={(e) =>
                      update(
                        "dealPrice",
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    style={inputStyle}
                    step="0.01"
                    min={0}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Fin du deal</label>
                  <input
                    type="datetime-local"
                    value={form.dealEndsAt ? form.dealEndsAt.slice(0, 16) : ""}
                    onChange={(e) =>
                      update(
                        "dealEndsAt",
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : undefined,
                      )
                    }
                    style={inputStyle}
                  />
                </div>
              </>
            )}
          </div>

          {/* Colors */}
          <div>
            <label style={labelStyle}>
              Couleurs (hex) – séparées par des virgules
            </label>
            <input
              type="text"
              value={form.colors.join(", ")}
              onChange={(e) =>
                update(
                  "colors",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              style={inputStyle}
              placeholder="#000000, #FFFFFF"
            />
          </div>
          <div>
            <label style={labelStyle}>
              Noms des couleurs – séparés par des virgules
            </label>
            <input
              type="text"
              value={(form.colorNames || []).join(", ")}
              onChange={(e) =>
                update(
                  "colorNames",
                  e.target.value.split(",").map((s) => s.trim()),
                )
              }
              style={inputStyle}
              placeholder="Noir, Blanc"
            />
          </div>

          {/* Sizes */}
          <div>
            <label style={labelStyle}>
              Tailles (séparées par des virgules)
            </label>
            <input
              type="text"
              value={form.sizes.join(", ")}
              onChange={(e) =>
                update(
                  "sizes",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              style={inputStyle}
              placeholder="S, M, L, XL"
            />
          </div>
          <div>
            <label style={labelStyle}>
              Surcharge par taille (JSON : {"{"}"XXL": 2{"}"})
            </label>
            <input
              type="text"
              value={JSON.stringify(form.sizeSurcharge || {})}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  update("sizeSurcharge", parsed);
                } catch {
                  // keep old value
                }
              }}
              style={inputStyle}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags (séparés par des virgules)</label>
            <input
              type="text"
              value={(form.tags || []).join(", ")}
              onChange={(e) =>
                update(
                  "tags",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
              style={inputStyle}
              placeholder="Carnaval, Rio, Neon"
            />
          </div>

          {/* Image & Gallery */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div>
              <label style={labelStyle}>Image principale (URL)</label>
              <input
                type="url"
                value={form.image}
                onChange={(e) => update("image", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                Galerie (URLs séparées par des virgules)
              </label>
              <input
                type="text"
                value={(form.gallery || []).join(", ")}
                onChange={(e) =>
                  update(
                    "gallery",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                style={inputStyle}
              />
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", gap: 24 }}>
            <label
              style={{
                ...labelStyle,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <input
                type="checkbox"
                checked={form.isBestSeller}
                onChange={(e) => update("isBestSeller", e.target.checked)}
              />
              Best seller
            </label>
            <label
              style={{
                ...labelStyle,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <input
                type="checkbox"
                checked={form.isLimitedTime}
                onChange={(e) => update("isLimitedTime", e.target.checked)}
              />
              Offre limitée
            </label>
          </div>

          {/* Affiliation */}
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <label
              style={{
                ...labelStyle,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <input
                type="checkbox"
                checked={form.affiliateMode}
                onChange={(e) => update("affiliateMode", e.target.checked)}
              />
              Mode affiliation
            </label>
            {form.affiliateMode && (
              <input
                type="url"
                value={form.affiliateUrl || ""}
                onChange={(e) => update("affiliateUrl", e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="URL d'affiliation"
              />
            )}
          </div>

          {/* External POD IDs */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div>
              <label style={labelStyle}>External Product ID</label>
              <input
                type="text"
                value={form.externalProductId || ""}
                onChange={(e) => update("externalProductId", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>External Variant ID</label>
              <input
                type="text"
                value={form.externalVariantId || ""}
                onChange={(e) => update("externalVariantId", e.target.value)}
                style={inputStyle}
              />
            </div>
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
              onClick={onClose}
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
              {product ? "Mettre à jour" : "Créer le produit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
