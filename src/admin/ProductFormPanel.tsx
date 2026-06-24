// src/admin/ProductFormPanel.tsx

import React, { useState, useEffect } from "react";
import { ArrowLeft, Save, Upload, RefreshCw, ExternalLink } from "lucide-react";
import TagInput from "../components/TagInput";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";
import { storageApi } from "../api/storageApi";
import { podApi } from "../api/supabaseApi";
import { AdminProduct } from "./adminTypes";

interface ProductFormPanelProps {
  product: AdminProduct | null; // null = création
  onBack: () => void;
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

// ─── GalleryInput component (inline in the same file) ────────────────────
function GalleryInput({
  value,
  onChange,
  max,
}: {
  value: string[];
  onChange: (items: string[]) => void;
  max: number;
}) {
  const [input, setInput] = useState("");

  const addItem = (url?: string) => {
    const trimmed = (url || input).trim();
    if (trimmed && !value.includes(trimmed) && value.length < max) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  const removeItem = (url: string) => onChange(value.filter((v) => v !== url));

  return (
    <div>
      {/* Chips */}
      {value.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
        >
          {value.map((url) => (
            <span
              key={url}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 999,
                background: "var(--color-surface2)",
                border: "1px solid var(--color-border)",
                fontSize: 12,
                color: "var(--color-ink2)",
                maxWidth: "100%",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  maxWidth: 200,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {url}
              </span>
              <button
                type="button"
                onClick={() => removeItem(url)}
                style={{
                  background: "var(--color-accent-soft)",
                  border: "none",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  cursor: "pointer",
                  color: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input + Add button + Upload button */}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="https://..."
          disabled={value.length >= max}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background:
              value.length >= max
                ? "var(--color-surface2)"
                : "var(--color-surface2)",
            fontSize: 13,
            color: "var(--color-ink)",
            fontFamily: "var(--font-body)",
            outline: "none",
            opacity: value.length >= max ? 0.5 : 1,
          }}
        />
        <button
          type="button"
          onClick={() => addItem()}
          disabled={value.length >= max || !input.trim()}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid var(--color-accent)",
            background:
              value.length >= max || !input.trim()
                ? "var(--color-surface2)"
                : "transparent",
            color:
              value.length >= max || !input.trim()
                ? "var(--color-ink4)"
                : "var(--color-accent)",
            fontWeight: 700,
            fontSize: 13,
            cursor:
              value.length >= max || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          + Ajouter
        </button>
        <label
          title="Uploader une image"
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            color: "var(--color-ink3)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
            opacity: value.length >= max ? 0.5 : 1,
            pointerEvents: value.length >= max ? "none" : "auto",
          }}
        >
          <Upload size={16} />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const url = await storageApi.uploadImage(file, "gallery");
                addItem(url);
              } catch (err) {
                console.error("Upload failed", err);
                alert("Erreur lors de l'upload de l'image.");
              }
            }}
          />
        </label>
      </div>
    </div>
  );
}

export default function ProductFormPanel({
  product,
  onBack,
  onSave,
}: ProductFormPanelProps) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (product) {
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

  //  fonction d'import et un état de chargement
  const [importingPrintful, setImportingPrintful] = useState(false);

  const [importError, setImportError] = useState<string | null>(null);

  const handleImportFromPrintful = async () => {
    setImportError(null);
    if (!form.externalProductId) {
      setImportError("Veuillez d'abord saisir un External Product ID.");
      return;
    }
    setImportingPrintful(true);
    try {
      console.log("[Printful] Récupération du produit", form.externalProductId);
      const pfProduct = await podApi.getProductDetails(form.externalProductId);
      console.log("[Printful] Données reçues :", pfProduct);

      const title = (pfProduct.name || pfProduct.title || "") as string;
      const description = (pfProduct.description || "") as string;
      const mainImage = (pfProduct.thumbnail_url ||
        pfProduct.image ||
        form.image) as string;

      const variants: any[] = pfProduct.variants || [];
      const matchedVariant = form.externalVariantId
        ? variants.find(
            (v: any) =>
              v.external_id === form.externalVariantId ||
              v.id?.toString() === form.externalVariantId,
          )
        : variants[0];

      const price = matchedVariant?.retail_price
        ? parseFloat(matchedVariant.retail_price)
        : form.price;

      const colors = variants
        .map((v: any) => (v.color_code || v.color) as string)
        .filter(Boolean) as string[];
      const colorNames = variants
        .map((v: any) => v.color as string)
        .filter(Boolean) as string[];
      const sizes = variants
        .map((v: any) => v.size as string)
        .filter(Boolean) as string[];

      const galleryImages = variants
        .map(
          (v: any) =>
            (v.preview_url || v.image || v.file?.preview_url) as string,
        )
        .filter(Boolean)
        .slice(0, 6) as string[];

      const updatedForm = {
        ...form,
        title: title || form.title,
        description: description || form.description,
        image: mainImage || form.image,
        price: price || form.price,
        colors: colors.length > 0 ? [...new Set(colors)] : form.colors,
        colorNames:
          colorNames.length > 0 ? [...new Set(colorNames)] : form.colorNames,
        sizes: sizes.length > 0 ? [...new Set(sizes)] : form.sizes,
        gallery: galleryImages.length > 0 ? galleryImages : form.gallery,
        lastExternalSync: new Date().toISOString(),
        printfulPrice: price || undefined,
        printfulCurrency: (matchedVariant?.currency ||
          pfProduct.currency ||
          "USD") as string,
      };

      setForm(updatedForm);
      setImportError(null);
      setImportingPrintful(false);

      // Enregistrer automatiquement le produit
      console.log("[Printful] Sauvegarde automatique du produit...");
      await onSave(updatedForm);
      console.log("[Printful] Produit sauvegardé.");
    } catch (err: any) {
      console.error("[Printful] Erreur :", err);
      setImportError(err.message || "Erreur lors de l'import Printful");
      setImportingPrintful(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            padding: 8,
            cursor: "pointer",
            color: "var(--color-ink2)",
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} />
        </button>
        <h2
          style={{ fontWeight: 700, fontSize: 20, color: "var(--color-ink)" }}
        >
          {product ? "Modifier le produit" : "Nouveau produit"}
        </h2>

        {importError && (
          <div
            style={{
              background: "#fee2e2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: "12px 16px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {importError}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 900,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          padding: 24,
        }}
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
              onChange={(e) => update("isActive", e.target.value === "active")}
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
              onChange={(e) => update("stockQuantity", Number(e.target.value))}
              style={inputStyle}
              min={0}
            />
          </div>
        </div>

        {/* Descriptions */}
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
            <label style={labelStyle}>Prix ($) *</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                value={form.price}
                onChange={(e) => update("price", Number(e.target.value))}
                style={{ ...inputStyle, flex: 1 }}
                step="0.01"
                min={0}
                required
              />
              <span style={{ fontWeight: 700, color: "var(--color-ink2)" }}>
                $
              </span>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Prix barré ($)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="number"
                value={form.originalPrice || ""}
                onChange={(e) =>
                  update(
                    "originalPrice",
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                style={{ ...inputStyle, flex: 1 }}
                step="0.01"
                min={0}
              />
              <span style={{ fontWeight: 700, color: "var(--color-ink2)" }}>
                $
              </span>
            </div>
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
                <label style={labelStyle}>Prix deal ($)</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    value={form.dealPrice || ""}
                    onChange={(e) =>
                      update(
                        "dealPrice",
                        e.target.value ? Number(e.target.value) : undefined,
                      )
                    }
                    style={{ ...inputStyle, flex: 1 }}
                    step="0.01"
                    min={0}
                  />
                  <span style={{ fontWeight: 700, color: "var(--color-ink2)" }}>
                    $
                  </span>
                </div>
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

        {/* Colors & Tags with TagInput */}
        <div>
          <label style={labelStyle}>Couleurs (hex)</label>
          <TagInput
            value={form.colors}
            onChange={(v) => update("colors", v)}
            placeholder="#000000"
          />
        </div>
        <div>
          <label style={labelStyle}>Noms des couleurs</label>
          <TagInput
            value={form.colorNames || []}
            onChange={(v) => update("colorNames", v)}
            placeholder="Noir"
          />
        </div>
        <div>
          <label style={labelStyle}>Tailles</label>
          <TagInput
            value={form.sizes}
            onChange={(v) => update("sizes", v)}
            placeholder="S"
          />
        </div>
        <div>
          <label style={labelStyle}>Tags</label>
          <TagInput
            value={form.tags || []}
            onChange={(v) => update("tags", v)}
            placeholder="Carnaval"
          />
        </div>

        {/* Size surcharge: keep as text for now, could be enhanced */}
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

        {/* Image & Gallery */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div>
            <label style={labelStyle}>Image principale (URL)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="url"
                value={form.image}
                onChange={(e) => update("image", e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="https://..."
              />
              <label
                title="Uploader une image"
                style={{
                  ...inputStyle,
                  width: 40,
                  padding: "8px 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  border: "1px solid var(--color-border)",
                  borderRadius: 10,
                  background: "var(--color-surface2)",
                  color: "var(--color-ink3)",
                  flexShrink: 0,
                }}
              >
                <Upload size={16} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const url = await storageApi.uploadImage(
                        file,
                        "products",
                      );
                      update("image", url);
                    } catch (err) {
                      console.error("Upload failed", err);
                      alert("Erreur lors de l'upload de l'image.");
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div>
            <label style={labelStyle}>
              Galerie d'images ({form.gallery?.length || 0}/6)
            </label>
            <GalleryInput
              value={form.gallery || []}
              onChange={(v) => update("gallery", v)}
              max={12}
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

        {/* External POD IDs + Import Printful */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={handleImportFromPrintful}
              disabled={importingPrintful || !form.externalProductId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 10,
                border: "1.5px solid var(--color-accent)",
                background: "transparent",
                color: "var(--color-accent)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                opacity: importingPrintful ? 0.6 : 1,
              }}
            >
              {importingPrintful ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Import...
                </>
              ) : (
                <>
                  <ExternalLink size={14} />
                  Importer depuis Printful
                </>
              )}
            </button>
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
            onClick={onBack}
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
  );
}
