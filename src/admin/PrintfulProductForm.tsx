// src/admin/PrintfulProductForm.tsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { podApi } from "../api/supabaseApi";
import { storageApi } from "../api/storageApi";
import { Upload } from "lucide-react";
import { AdminProduct } from "./adminTypes";
import { useReferenceLists } from "./adminHooks";
import TagInput from "../components/TagInput";
import { PLACEHOLDER_IMG, LOGO_URL } from "../constants/assets";

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
  const [catalogVariants, setCatalogVariants] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Champs du formulaire
  const [price, setPrice] = useState<number>(29.99);
  const [category, setCategory] = useState<string>("tshirt");
  const [eventType, setEventType] = useState<string>("culture");
  const [style, setStyle] = useState<string>("street");
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isLimitedTime, setIsLimitedTime] = useState(false);
  // Image et galerie éditables
  const [mainImageUrl, setMainImageUrl] = useState<string>("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  const [colors, setColors] = useState<string[]>([]);
  const [colorNames, setColorNames] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colorImages, setColorImages] = useState<string[]>([]);

  // Pricing
  const [printfulCost, setPrintfulCost] = useState<number>(0); // Printful price (non modifiable)
  const [shippingEstimate, setShippingEstimate] = useState<number>(48.99); // Printful shipping price (modifiable)
  const [marginPercent, setMarginPercent] = useState<number>(30); // marge en %
  const [shippingRange, setShippingRange] = useState<{
    min: number;
    max: number;
  } | null>(null);
  const [pfCurrency, setPfCurrency] = useState<string>("BRL");
  const [costLoading, setCostLoading] = useState(false);

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
      setPrintfulCost(0);
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
          const currency = first.currency || data.currency || "BRL";
          setPfCurrency(currency);

          // Détection automatique catégorie / eventType / style
          const productName = (data.name || "").toLowerCase();
          const productType = (data.type || "").toLowerCase();
          const combined = `${productName} ${productType}`;

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

          // Pré-remplir les images depuis les données enrichies

          setMainImageUrl(data.color_images?.[0] || data.thumbnail_url || "");

          const colorGallery = (data.color_images || []) as string[];

          const catalogGallery = (data.catalog_variants || [])

            .map((v: any) => v.image as string)
            .filter(Boolean) as string[];
          const initialGallery = [
            ...new Set([...colorGallery, ...catalogGallery]),
          ].slice(0, 12);
          setGalleryImages(initialGallery.length > 0 ? initialGallery : []);
        }
        // Pré-remplir les couleurs, noms de couleurs, tailles et images par couleur
        setColors((data.colors as string[]) || []);
        setColorNames((data.color_names as string[]) || []);
        setSizes(
          (data.sizes as string[]).filter((s) => s && s.trim().length > 0) ||
            [],
        );
        setColorImages((data.color_images as string[]) || []);
        setCatalogVariants((data.catalog_variants as any[]) || []);
      })
      .catch(() => setError("Erreur chargement variantes."))
      .finally(() => setLoadingVariants(false));
  }, [selectedProductId]);

  // Récupérer le Printful price (retail_price) depuis les données déjà chargées
  useEffect(() => {
    if (!selectedVariantId || variants.length === 0) return;
    const v = variants.find((v: any) => v.id.toString() === selectedVariantId);
    if (v && v.retail_price) {
      setPrintfulCost(parseFloat(v.retail_price));
    }
  }, [selectedVariantId, variants]);

  // Récupérer l'estimation des frais de port Printful pour la variante sélectionnée
  useEffect(() => {
    if (!selectedVariantId || variants.length === 0) return;
    const v = variants.find((v: any) => v.id.toString() === selectedVariantId);
    if (!v || !v.product || !v.product.variant_id) return;
    const catalogVariantId = v.product.variant_id.toString(); // ex: "12829"
    podApi
      .getShippingEstimate(catalogVariantId)
      .then(({ min, max }) => {
        setShippingEstimate(max); // pré-remplit avec la valeur haute
        setShippingRange({ min, max });
      })
      .catch((err) => console.warn("Estimation shipping non récupérée", err));
  }, [selectedVariantId, variants]);

  // Recalcul dynamique du Retail price
  useEffect(() => {
    const newPrice =
      (printfulCost + shippingEstimate) * (1 + marginPercent / 100);
    setPrice(parseFloat(newPrice.toFixed(2)));
  }, [printfulCost, shippingEstimate, marginPercent]);

  // Revenue = retail - (printful cost + shipping)
  const revenue = price - (printfulCost + shippingEstimate);

  // Helper : retrouve un code hex pour une couleur, même si Printful ne renvoie que le nom
  const findHexForColor = (colorNameOrCode: string): string => {
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(colorNameOrCode))
      return colorNameOrCode;
    const normalized = colorNameOrCode.toLowerCase().replace(/\s+/g, "_");
    const staticMap: Record<string, string> = {
      black: "#1A1A1A",
      white: "#FFFFFF",
      red: "#CC0000",
      navy: "#000080",
      dark_heather: "#3E3E3E",
      heather: "#C0C0C0",
      light_blue: "#ADD8E6",
      royal: "#4169E1",
      sport_grey: "#808080",
      sand: "#C2B280",
      light_pink: "#FFB6C1",
      ash: "#B2BEB5",
      charcoal: "#36454F",
      forest: "#228B22",
      purple: "#800080",
      gold: "#FFD700",
      orange: "#FFA500",
      yellow: "#FFFF00",
      green: "#008000",
      blue: "#0000FF",
      pink: "#FFC0CB",
      grey: "#808080",
      gray: "#808080",
      brown: "#A52A2A",
      beige: "#F5F5DC",
      silver: "#C0C0C0",
      maroon: "#800000",
      olive: "#808000",
      teal: "#008080",
      heather_grey: "#9B9B9B",
      sport_gray: "#808080",
      dark_grey: "#A9A9A9",
      dark_gray: "#A9A9A9",
      dark_chocolate: "#4A3728",
      blush: "#DE5D83",
      baby_blue: "#89CFF0",
      mustard: "#FFDB58",
      burgundy: "#800020",
      mint: "#98FF98",
      lavender: "#E6E6FA",
      khaki: "#C3B091",
    };
    const staticHex =
      staticMap[normalized] || staticMap[colorNameOrCode.toLowerCase()] || null;
    if (staticHex) return staticHex;
    const match = (catalogVariants || []).find(
      (v: any) =>
        v.color_code2 &&
        /^#/.test(v.color_code2) &&
        (v.color || "").toLowerCase() === colorNameOrCode.toLowerCase(),
    );
    if (match?.color_code2) return match.color_code2;
    const match2 = (variants || []).find(
      (v: any) =>
        v.color_code &&
        /^#/.test(v.color_code) &&
        (v.color || "").toLowerCase() === colorNameOrCode.toLowerCase(),
    );
    return match2?.color_code || "#CCCCCC";
  };

  const handleImport = async () => {
    setError(null);
    if (!selectedProductId || !selectedVariantId) {
      setError("Sélectionnez un produit et une variante.");
      return;
    }
    if (printfulCost <= 0) {
      setError(
        "Le coût d'impression (Printful price) doit être supérieur à 0 avant d'importer.",
      );
      return;
    }
    setImporting(true);
    try {
      const pfData = await podApi.getProductDetails(selectedProductId);
      const title = pfData.name || "";
      const mainImage = mainImageUrl || pfData.thumbnail_url || "";

      const allImages: string[] =
        galleryImages.length > 0
          ? galleryImages.filter((url) => url && url.trim().length > 0)
          : (
              [
                ...new Set(
                  (pfData.color_images || []).concat(
                    (pfData.catalog_variants || []).map(
                      (v: any) => v.image as string,
                    ),
                  ),
                ),
              ].filter(Boolean) as string[]
            ).slice(0, 12);

      const cleanColorImgs = colorImages.filter(
        (url) => url && url.trim().length > 0,
      );

      const newProduct: Omit<AdminProduct, "id" | "createdAt" | "updatedAt"> = {
        isActive: true,
        title,
        brand: "INSTAWEAR",
        description: title,
        fullDescription: "",
        image: mainImage,
        gallery: allImages,
        mockupPreset: "",
        price: price, // Retail price calculé
        originalPrice: undefined,
        inStock: true,
        stockQuantity: 100,
        colors: colors.filter((c) => c && c.trim().length > 0),
        colorNames: colorNames.slice(0, colors.length),
        colorImages: cleanColorImgs.length > 0 ? cleanColorImgs : null,
        sizes: sizes.filter((s) => s && s.trim().length > 0),
        sizeSurcharge: {},
        sizeGuide: undefined,
        category: category as AdminProduct["category"],
        eventType: eventType as AdminProduct["eventType"],
        style: style as AdminProduct["style"],
        material: "",
        tags: [],
        isBestSeller: isBestSeller,
        isLimitedTime: isLimitedTime,
        dealActive: false,
        dealEndsAt: undefined,
        dealPrice: undefined,
        affiliateMode: false,
        affiliateUrl: undefined,
        externalProductId: selectedProductId,
        externalVariantId: selectedVariantId,
        lastExternalSync: new Date().toISOString(),
        printfulPrice: printfulCost, // coût d'impression réel
        printfulCurrency: pfCurrency,
        shippingEstimate: shippingEstimate,
        ratings: { score: 5, count: 0 },
        boughtLastMonth: 0,
      };

      const savedProduct = await onSave(newProduct as AdminProduct);
      // Notification avec productId
      import("../api/supabaseApi").then(({ notificationApi }) => {
        notificationApi
          .create({
            title: `Produit Printful importé`,
            description: `"${title}" importé avec succès`,
            category: "products",
            priority: "low",
            metadata: {
              productId: savedProduct.id,
              productTitle: title,
              linkTo: "/admin/products",
              source: "Printful",
            },
            action_label: "Voir le produit",
          })
          .catch(() => {});
      });
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

  const cleanGallery = galleryImages.filter(
    (url) => url && url.trim().length > 0,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* En-tête */}
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
                  {v.size} / {v.color}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Image principale */}
        <div>
          <label style={labelStyle}>Image principale (URL)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="url"
                value={mainImageUrl}
                onChange={(e) => setMainImageUrl(e.target.value)}
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
                      setMainImageUrl(url);
                    } catch (err) {
                      console.error("Upload failed", err);
                      setError("Erreur lors de l'upload de l'image.");
                    }
                  }}
                />
              </label>
            </div>
            {mainImageUrl && (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "var(--color-surface2)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <img
                  src={mainImageUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Galerie d'images */}
        <div>
          <label style={labelStyle}>
            Galerie d'images ({galleryImages.length}/12)
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {galleryImages
              .filter((url) => url && url.trim().length > 0)
              .map((url, idx) => (
                <span
                  key={idx}
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
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <img
                        src={url}
                        alt=""
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </span>
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
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setGalleryImages(
                        galleryImages.filter((_, i) => i !== idx),
                      )
                    }
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
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="url"
              placeholder="https://..."
              style={{ ...inputStyle, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const input = e.currentTarget;
                  const url = input.value.trim();
                  if (
                    url &&
                    !galleryImages.includes(url) &&
                    galleryImages.length < 12
                  ) {
                    setGalleryImages([...galleryImages, url]);
                    input.value = "";
                  }
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                const input = document.querySelector(
                  'input[placeholder="https://..."]',
                ) as HTMLInputElement;
                const url = input?.value?.trim();
                if (
                  url &&
                  !galleryImages.includes(url) &&
                  galleryImages.length < 12
                ) {
                  setGalleryImages([...galleryImages, url]);
                  input.value = "";
                }
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid var(--color-accent)",
                background: "transparent",
                color: "var(--color-accent)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
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
              }}
            >
              <Upload size={16} />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                multiple
                style={{ display: "none" }}
                onChange={async (e) => {
                  const files = e.target.files;
                  if (!files || files.length === 0) return;
                  let newUrls: string[] = [];
                  for (let i = 0; i < files.length; i++) {
                    if (galleryImages.length + newUrls.length >= 12) break;
                    try {
                      const url = await storageApi.uploadImage(
                        files[i],
                        "gallery",
                      );
                      if (
                        !galleryImages.includes(url) &&
                        !newUrls.includes(url)
                      ) {
                        newUrls.push(url);
                      }
                    } catch (err) {
                      console.error("Upload failed", err);
                      setError("Erreur lors de l'upload d'une image.");
                    }
                  }
                  if (newUrls.length > 0) {
                    setGalleryImages([...galleryImages, ...newUrls]);
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* ── Variantes : tableau couleurs × tailles ────────────────── */}
        {colors.length > 0 && sizes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={labelStyle}>
              Variantes – {colors.length} couleur{colors.length > 1 ? "s" : ""}{" "}
              × {sizes.length} taille{sizes.length > 1 ? "s" : ""}
            </label>

            {/* Tableau */}
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
                    <th
                      style={{
                        padding: "8px 10px",
                        textAlign: "left",
                        fontWeight: 700,
                        color: "var(--color-ink3)",
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      Taille ↓ / Couleur →
                    </th>
                    {colors.map((colorCode, i) => (
                      <th
                        key={i}
                        style={{
                          padding: "6px 8px",
                          textAlign: "center",
                          borderBottom: "1px solid var(--color-border)",
                          minWidth: 80,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              background: findHexForColor(colorCode),
                              border: "1px solid var(--color-border)",
                              display: "inline-block",
                            }}
                          />
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: "var(--color-ink2)",
                            }}
                          >
                            {colorNames[i] || colorCode}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((size, rowIdx) => (
                    <tr
                      key={size}
                      style={{
                        background:
                          rowIdx % 2 === 0
                            ? "var(--color-surface)"
                            : "var(--color-surface2)",
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 10px",
                          fontWeight: 700,
                          color: "var(--color-ink2)",
                          borderBottom: "1px solid var(--color-border)",
                        }}
                      >
                        {size}
                      </td>
                      {colors.map((_, colIdx) => {
                        const colorName = (
                          colorNames[colIdx] ||
                          colors[colIdx] ||
                          ""
                        ).toLowerCase();
                        const catVar = (catalogVariants || []).find(
                          (v: any) =>
                            (v.color || v.color_code || "").toLowerCase() ===
                              colorName && v.size === size,
                        );
                        const synVar = (variants || []).find(
                          (v: any) =>
                            (v.color || v.color_code || "").toLowerCase() ===
                              colorName && v.size === size,
                        );
                        const imgSrc =
                          [
                            catVar?.image,
                            synVar?.product?.image,
                            synVar?.product_image,
                            colorImages[colIdx],
                          ].find((url) => url && url.trim().length > 0) ||
                          PLACEHOLDER_IMG;
                        const variantPrice =
                          catVar?.price != null
                            ? parseFloat(catVar.price)
                            : synVar?.price != null
                              ? parseFloat(synVar.price)
                              : synVar?.retail_price != null
                                ? parseFloat(synVar.retail_price)
                                : null;
                        const variantCost =
                          variantPrice != null && variantPrice > 0
                            ? variantPrice
                            : null;
                        return (
                          <td
                            key={colIdx}
                            style={{
                              padding: 4,
                              textAlign: "center",
                              borderBottom: "1px solid var(--color-border)",
                            }}
                          >
                            <img
                              src={imgSrc}
                              alt={`${colorNames[colIdx] || colors[colIdx]} - ${size}`}
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: 6,
                                objectFit: "cover",
                                border: "1px solid var(--color-border)",
                              }}
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  PLACEHOLDER_IMG;
                              }}
                            />
                            {variantCost != null && (
                              <div
                                style={{
                                  fontSize: 9,
                                  color: "var(--color-ink4)",
                                  marginTop: 2,
                                  fontWeight: 600,
                                }}
                              >
                                {pfCurrency} {variantCost.toFixed(2)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Édition rapide des listes */}
            <details style={{ marginTop: 8 }}>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--color-ink4)",
                }}
              >
                Modifier les listes
              </summary>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginTop: 8,
                }}
              >
                <div>
                  <label style={labelStyle}>Couleurs (hex)</label>
                  <TagInput
                    value={colors}
                    onChange={(v) => setColors(v)}
                    placeholder="#FF0000"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Noms des couleurs</label>
                  <TagInput
                    value={colorNames}
                    onChange={(v) => setColorNames(v)}
                    placeholder="Rouge"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tailles</label>
                  <TagInput
                    value={sizes}
                    onChange={(v) => setSizes(v)}
                    placeholder="M"
                  />
                </div>
              </div>
            </details>
          </div>
        )}

        {/* ── Pricing ────────────────────────────────────────────── */}
        <div
          style={{
            background: "var(--color-surface2)",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            border: "1px solid var(--color-border)",
          }}
        >
          <h3
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "var(--color-ink)",
              letterSpacing: "-0.02em",
              marginBottom: 4,
            }}
          >
            💰 Pricing
          </h3>

          {/* Printful price (non modifiable) */}
          <div>
            <label style={labelStyle}>Printful price</label>
            <div
              style={{
                ...inputStyle,
                background: "var(--color-surface)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {costLoading ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <strong>
                  {printfulCost.toFixed(2)} {pfCurrency}
                </strong>
              )}
            </div>
            <p
              style={{ fontSize: 11, color: "var(--color-ink4)", marginTop: 4 }}
            >
              (Retail price défini dans Printful)
            </p>
          </div>

          {/* Printful shipping price (modifiable) */}
          <div>
            <label style={labelStyle}>Printful shipping price</label>
            <input
              type="number"
              value={shippingEstimate}
              onChange={(e) =>
                setShippingEstimate(parseFloat(e.target.value) || 0)
              }
              style={inputStyle}
              min={0}
              step={0.01}
            />
            {shippingRange ? (
              shippingRange.min === shippingRange.max ? (
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-ink4)",
                    marginTop: 4,
                  }}
                >
                  Frais de port estimés : {shippingRange.min.toFixed(2)}{" "}
                  {pfCurrency}
                </p>
              ) : (
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--color-ink4)",
                    marginTop: 4,
                  }}
                >
                  Plage estimée : {shippingRange.min.toFixed(2)} –{" "}
                  {shippingRange.max.toFixed(2)} {pfCurrency}
                </p>
              )
            ) : (
              <p
                style={{
                  fontSize: 11,
                  color: "var(--color-ink4)",
                  marginTop: 4,
                }}
              >
                (estimation en cours…)
              </p>
            )}
          </div>

          {/* Marge souhaitée (%) */}
          <div>
            <label style={labelStyle}>Marge souhaitée (%)</label>
            <input
              type="number"
              value={marginPercent}
              onChange={(e) =>
                setMarginPercent(parseFloat(e.target.value) || 0)
              }
              style={inputStyle}
              min={0}
              step={1}
            />
          </div>

          {/* Retail price (calculé) */}
          <div
            style={{
              background: "var(--color-success-bg)",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: "var(--color-accent)",
              }}
            >
              Retail price
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: "var(--color-accent)",
              }}
            >
              {price.toFixed(2)} {pfCurrency}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "var(--color-ink4)" }}>
            Retail price = (Printful price + Shipping) × (1 + Marge%)
          </p>

          {/* Revenue */}
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: 10,
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid var(--color-border)",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                fontSize: 13,
                color: "var(--color-ink)",
              }}
            >
              Revenue
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: revenue >= 0 ? "var(--color-success)" : "#ef4444",
              }}
            >
              {revenue <= 0 ? "⚠️ " : ""}
              {revenue.toFixed(2)} {pfCurrency}
            </span>
          </div>
          <p style={{ fontSize: 11, color: "var(--color-ink4)" }}>
            Revenue = Retail price – (Printful price + Shipping)
          </p>
        </div>

        {/* Champs manuels (catégorie, etc.) */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
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
              checked={isBestSeller}
              onChange={(e) => setIsBestSeller(e.target.checked)}
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
              checked={isLimitedTime}
              onChange={(e) => setIsLimitedTime(e.target.checked)}
            />
            Offre limitée
          </label>
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
