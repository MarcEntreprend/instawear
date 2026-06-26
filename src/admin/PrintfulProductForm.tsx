// src/admin/PrintfulProductForm.tsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, Package, RefreshCw, ExternalLink } from "lucide-react";
import { podApi } from "../api/supabaseApi";
import { AdminProduct } from "./adminTypes";
import { useReferenceLists } from "./adminHooks";

interface PrintfulProductFormProps {
  onBack: () => void;
  onSave: (product: AdminProduct) => Promise<AdminProduct>;
}

export default function PrintfulProductForm({
  onBack,
  onSave,
}: PrintfulProductFormProps) {
  const { getByType } = useReferenceLists();
  const [pfProducts, setPfProducts] = useState<
    { id: number; name: string; thumbnail_url: string }[]
  >([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Champs du formulaire
  const [price, setPrice] = useState<number>(29.99);
  const [category, setCategory] = useState<string>("tshirt");
  const [eventType, setEventType] = useState<string>("culture");
  const [style, setStyle] = useState<string>("street");

  // Infos Printful affichées à titre informatif
  const [pfPrice, setPfPrice] = useState<number | null>(null);
  const [pfCurrency, setPfCurrency] = useState<string>("USD");

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger la liste Printful
  useEffect(() => {
    podApi
      .listPrintfulProducts()
      .then(setPfProducts)
      .catch(() => setError("Erreur chargement produits Printful."))
      .finally(() => setLoadingList(false));
  }, []);

  // Charger les variantes quand un produit est sélectionné
  useEffect(() => {
    if (!selectedProductId) {
      setVariants([]);
      setSelectedVariantId("");
      setPfPrice(null);
      return;
    }
    setLoadingVariants(true);
    podApi
      .getProductDetails(selectedProductId)
      .then((data) => {
        const vars = data.variants || [];
        setVariants(vars);
        if (vars.length > 0) {
          setSelectedVariantId(vars[0].id.toString());
          const first = vars[0];
          if (first.retail_price) {
            setPfPrice(parseFloat(first.retail_price));
            setPrice(parseFloat(first.retail_price) * 2);
          }
          setPfCurrency(first.currency || data.currency || "BRL");

          // Préparation du texte pour la détection des mots-clés
          const productName = (data.name || "").toLowerCase();
          const productType = (data.type || "").toLowerCase();
          const combined = `${productName} ${productType}`;

          // --- Catégorie dynamique basée sur reference_lists ---
          const categories = getByType("category");
          let matchedCat = "other";
          for (const cat of categories) {
            for (const kw of cat.keywords) {
              if (combined.includes(kw.toLowerCase())) {
                matchedCat = cat.value;
                break;
              }
            }
            if (matchedCat !== "other") break;
          }
          setCategory(matchedCat);

          // --- Type d'événement dynamique ---
          const eventTypes = getByType("event_type");
          let matchedEvt = "";
          for (const evt of eventTypes) {
            for (const kw of evt.keywords) {
              if (combined.includes(kw.toLowerCase())) {
                matchedEvt = evt.value;
                break;
              }
            }
            if (matchedEvt) break;
          }
          if (matchedEvt) setEventType(matchedEvt);

          // --- Style dynamique ---
          const styles = getByType("style");
          let matchedSty = "";
          for (const sty of styles) {
            for (const kw of sty.keywords) {
              if (combined.includes(kw.toLowerCase())) {
                matchedSty = sty.value;
                break;
              }
            }
            if (matchedSty) break;
          }
          if (matchedSty) setStyle(matchedSty);
        }
      })
      .catch(() => setError("Erreur chargement variantes."))
      .finally(() => setLoadingVariants(false));
  }, [selectedProductId]);

  // Mettre à jour les infos quand la variante sélectionnée change
  useEffect(() => {
    if (!selectedVariantId || variants.length === 0) return;
    const v = variants.find((v: any) => v.id.toString() === selectedVariantId);
    if (v) {
      if (v.retail_price) {
        const cost = parseFloat(v.retail_price);
        setPfPrice(cost);
        // Si le prix n'a pas été modifié manuellement, on le recalcule
        setPrice(cost * 2);
      }
      setPfCurrency(v.currency || pfCurrency || "BRL");
    }
  }, [selectedVariantId, variants]);

  const handleImport = async () => {
    setError(null);
    if (!selectedProductId || !selectedVariantId) {
      setError("Sélectionnez un produit et une variante.");
      return;
    }
    setImporting(true);
    try {
      const pfData = await podApi.getProductDetails(selectedProductId);
      const title = pfData.name || "";
      const mainImage = pfData.thumbnail_url || "";
      const variant =
        pfData.variants.find(
          (v: any) => v.id.toString() === selectedVariantId,
        ) || pfData.variants[0];

      // Logs de débogage temporaires
      console.log("[Printful] Données brutes reçues :", pfData);
      console.log("[Printful] Variant sélectionné :", variant);

      const retailPrice = variant?.retail_price
        ? parseFloat(variant.retail_price)
        : 0;

      const colors = pfData.variants
        .map((v: any) => v.color_code as string)
        .filter(Boolean) as string[];
      const colorNames = pfData.variants
        .map((v: any) => v.color as string)
        .filter(Boolean) as string[];
      const sizes = pfData.variants
        .map((v: any) => v.size as string)
        .filter(Boolean) as string[];
      const gallery = pfData.variants
        .map((v: any) => v.preview_url as string)
        .filter(Boolean)
        .slice(0, 12) as string[];

      const newProduct: Omit<AdminProduct, "id" | "createdAt" | "updatedAt"> = {
        isActive: true,
        title,
        brand: "INSTAWEAR",
        description: title,
        fullDescription: "",
        image: mainImage,
        gallery,
        mockupPreset: "",
        price: price,
        originalPrice: undefined,
        inStock: true,
        stockQuantity: 100,
        colors: [...new Set(colors)],
        colorNames: [...new Set(colorNames)] as string[],
        sizes: [...new Set(sizes)],
        sizeSurcharge: {},
        sizeGuide: undefined,
        category: category as AdminProduct["category"],
        eventType: eventType as AdminProduct["eventType"],
        style: style as AdminProduct["style"],
        material: "",
        tags: [],
        isBestSeller: false,
        isLimitedTime: false,
        dealActive: false,
        dealEndsAt: undefined,
        dealPrice: undefined,
        affiliateMode: false,
        affiliateUrl: undefined,
        externalProductId: selectedProductId,
        externalVariantId: selectedVariantId,
        lastExternalSync: new Date().toISOString(),
        printfulPrice: retailPrice,
        printfulCurrency: variant?.currency || pfData.currency || "BRL",
        ratings: { score: 5, count: 0 },
        boughtLastMonth: 0,
      };

      const saved = await onSave(newProduct as AdminProduct);
    } catch (err: any) {
      setError(err.message || "Erreur import");
    } finally {
      setImporting(false);
    }
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
          Nouveau produit Printful
        </h2>
        <button
          onClick={() => {
            setError(null);
            setLoadingList(true);
            podApi
              .listPrintfulProducts()
              .then(setPfProducts)
              .catch(() => setError("Erreur chargement produits Printful."))
              .finally(() => setLoadingList(false));
          }}
          title="Rafraîchir la liste"
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

      {error && (
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
          {error}
        </div>
      )}

      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: 18,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 700,
        }}
      >
        {/* Sélecteur produit Printful */}
        <div>
          <label style={labelStyle}>Produit Printful</label>
          {loadingList ? (
            <div
              className="animate-spin"
              style={{
                width: 20,
                height: 20,
                border: "2px solid var(--color-border)",
                borderTopColor: "var(--color-accent)",
                borderRadius: "50%",
              }}
            />
          ) : (
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Choisir un produit --</option>
              {pfProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Variante */}
        <div>
          <label style={labelStyle}>Variante</label>
          {loadingVariants ? (
            <div
              className="animate-spin"
              style={{
                width: 20,
                height: 20,
                border: "2px solid var(--color-border)",
                borderTopColor: "var(--color-accent)",
                borderRadius: "50%",
              }}
            />
          ) : (
            <select
              value={selectedVariantId}
              onChange={(e) => setSelectedVariantId(e.target.value)}
              style={inputStyle}
              disabled={!selectedProductId}
            >
              {variants.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.size} / {v.color} ({v.retail_price} {v.currency || "BRL"})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Prix Printful informatif */}
        {pfPrice !== null && (
          <div
            style={{
              background: "var(--color-surface2)",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              color: "var(--color-ink3)",
            }}
          >
            💰 Prix Printful :{" "}
            <strong>
              {pfPrice.toFixed(2)} {pfCurrency}
            </strong>
            <span
              style={{
                fontSize: 11,
                marginLeft: 8,
                color: "var(--color-ink4)",
              }}
            >
              (prix de base, hors frais de port)
            </span>
          </div>
        )}

        {/* Champs manuels */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div>
            <label style={labelStyle}>Prix de vente ($, €, R$,...)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              style={inputStyle}
              min={0}
              step={0.01}
            />
          </div>
          <div>
            <label style={labelStyle}>Catégorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={inputStyle}
            >
              {getByType("category").map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type d'événement</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              style={inputStyle}
            >
              {getByType("event_type").map((et) => (
                <option key={et.value} value={et.value}>
                  {et.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              style={inputStyle}
            >
              {getByType("style").map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
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
            onClick={handleImport}
            disabled={importing || !selectedProductId}
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
              opacity: importing ? 0.7 : 1,
            }}
          >
            {importing ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <ExternalLink size={15} />
            )}
            Importer et créer
          </button>
        </div>
      </div>
    </div>
  );
}
