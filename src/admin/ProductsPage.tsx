// src/admin/ProductsPage.tsx
import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Edit3,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Package,
} from "lucide-react";
import { useProducts } from "./adminHooks";
import { AdminProduct, ProductFilterState } from "./adminTypes";
import { PLACEHOLDER_IMG } from "../constants/assets";
import ProductFormPanel from "./ProductFormPanel";
import ProductQuickViewModal from "./ProductQuickViewModal";

const CATEGORIES = ["tshirt", "hoodie", "accessory", "mug"];
const EVENT_TYPES = ["live", "sport", "culture", "saisonnier"];
const STYLES = ["cute", "street", "commute", "cozy", "retro"];

const BADGE_STYLE: Record<string, React.CSSProperties> = {
  bestseller: { background: "#fde68a", color: "#92400e" },
  live: { background: "#ede9fe", color: "#5b21b6" },
  limited: { background: "#fee2e2", color: "#991b1b" },
  inactive: { background: "#f3f4f6", color: "#6b7280" },
  outofstock: { background: "#fff7ed", color: "#c2410c" },
  deal: { background: "#d1fae5", color: "#065f46" },
};

function Badge({
  label,
  style,
}: {
  label: string;
  style: React.CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        ...style,
      }}
    >
      {label}
    </span>
  );
}

export default function ProductsPage() {
  const {
    products: allProducts,
    loading,
    saving,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkDelete,
    bulkSetActive,
    duplicateProduct,
  } = useProducts();

  // List state
  const [filters, setFilters] = useState<ProductFilterState>({
    search: "",
    category: null,
    eventType: null,
    style: null,
    material: null,
    priceMin: 0,
    priceMax: 200,
    inStockOnly: false,
    size: null,
    color: null,
    showInactive: true,
  });
  const [sortKey, setSortKey] = useState<keyof AdminProduct>("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  // Ordre manuel (réorganisation visuelle uniquement, pas de persistance)
  const [manualOrder, setManualOrder] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Product form navigation
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<AdminProduct | null>(
    null,
  );

  // The product being edited (if any)
  const editingProduct = useMemo(() => {
    if (!editingProductId || !allProducts) return null;
    return allProducts.find((p) => p.id === editingProductId) ?? null;
  }, [editingProductId, allProducts]);

  // ── Filter & sort ──────────────────────────────────────────────────────
  const products = useMemo(() => {
    if (!allProducts) return [];
    let list = [...allProducts];

    if (!filters.showInactive) list = list.filter((p) => p.isActive);

    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          p.brand.toLowerCase().includes(s) ||
          p.tags.some((t: string) => t.toLowerCase().includes(s)),
      );
    }
    if (filters.category)
      list = list.filter((p) => p.category === filters.category);
    if (filters.eventType)
      list = list.filter((p) => p.eventType === filters.eventType);
    if (filters.style) list = list.filter((p) => p.style === filters.style);
    if (filters.material)
      list = list.filter((p) => p.material === filters.material);
    if (filters.priceMin > 0)
      list = list.filter((p) => p.price >= filters.priceMin);
    if (filters.priceMax < 200)
      list = list.filter((p) => p.price <= filters.priceMax);
    if (filters.inStockOnly) list = list.filter((p) => p.inStock);
    if (filters.size)
      list = list.filter((p) => p.sizes.includes(filters.size!));
    if (filters.color)
      list = list.filter((p) => p.colors.includes(filters.color!));

    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === "string" && typeof vb === "string")
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      if (typeof va === "number" && typeof vb === "number")
        return sortDir === "asc" ? va - vb : vb - va;
      return 0;
    });
    return list;
  }, [allProducts, filters, sortKey, sortDir]);

  // Synchroniser l'ordre manuel avec la liste filtrée (IDs uniquement, sans boucle)
  useEffect(() => {
    const newIds = products.map((p) => p.id);
    setManualOrder((prev) => {
      // Éviter les mises à jour inutiles si l'ordre n'a pas changé
      const filteredPrev = prev.filter((id) => newIds.includes(id));
      const missing = newIds.filter((id) => !filteredPrev.includes(id));
      if (
        missing.length === 0 &&
        filteredPrev.length === prev.length &&
        filteredPrev.every((id, i) => id === prev[i])
      ) {
        return prev; // Aucun changement → ne pas trigger de re-render
      }
      return [...filteredPrev, ...missing];
    });
  }, [products.map((p) => p.id).join(",")]); // Dépendance stable : une string d'IDs

  // Réordonne les produits selon manualOrder
  const orderedProducts = useMemo(() => {
    if (manualOrder.length === 0) return products;
    return [...products].sort((a, b) => {
      const ia = manualOrder.indexOf(a.id);
      const ib = manualOrder.indexOf(b.id);
      return ia - ib;
    });
  }, [products, manualOrder]);

  const toggleSort = (key: keyof AdminProduct) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortIcon = (key: keyof AdminProduct) => {
    if (sortKey !== key) return null;
    return sortDir === "asc" ? (
      <ChevronUp size={11} />
    ) : (
      <ChevronDown size={11} />
    );
  };

  // ── Selection ──────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (selected.size === orderedProducts.length) setSelected(new Set());
    else setSelected(new Set(orderedProducts.map((p) => p.id)));
  };

  // Annuler la sélection avec Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelected(new Set());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingProductId(null);
  };

  const handleEdit = (product: AdminProduct) => {
    setEditingProductId(product.id);
    setIsCreating(false);
  };

  const handleBackToList = () => {
    setIsCreating(false);
    setEditingProductId(null);
  };

  // Comme on utilise directement createProduct/updateProduct dans le onSave inline ci‑dessus, on peut supprimer l’ancienne handleSaveProduct ou la laisser (elle ne sera plus utilisée pour l’import).
  // const handleSaveProduct = async (
  //   data: Omit<AdminProduct, "id" | "createdAt" | "updatedAt">,
  // ) => {
  //   if (editingProductId) {
  //     await updateProduct(editingProductId, data);
  //   } else {
  //     await createProduct(data);
  //   }
  //   handleBackToList();
  // };

  const handleDuplicate = async (id: string) => {
    await duplicateProduct(id);
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await bulkSetActive([id], active);
  };

  const handleBulkActivate = async (active: boolean) => {
    if (selected.size === 0) return;
    await bulkSetActive(Array.from(selected), active);
    setSelected(new Set());
  };

  const moveProduct = (id: string, direction: -1 | 1) => {
    setManualOrder((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const updated = [...prev];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      return updated;
    });
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Supprimer ${selected.size} produit(s) ?`)) return;
    await bulkDelete(Array.from(selected));
    setSelected(new Set());
  };

  const handleDeleteSingle = async (id: string) => {
    if (!window.confirm("Supprimer définitivement ce produit ?")) return;
    await deleteProduct(id);
  };

  // ── Render form panel if editing or creating ──────────────────────────
  if (isCreating || editingProductId) {
    return (
      <ProductFormPanel
        product={isCreating ? null : editingProduct}
        onBack={handleBackToList}
        onSave={async (data) => {
          const savedProduct = isCreating
            ? await createProduct(data)
            : await updateProduct(editingProductId!, data);
          handleBackToList();
          // Ouvre la QuickView du produit importé
          setQuickViewProduct(savedProduct);
          return savedProduct;
        }}
      />
    );
  }

  // ── List view ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", minHeight: 200 }}
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 22,
      }}
    >
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
            style={{ fontSize: 20, fontWeight: 700, color: "var(--color-ink)" }}
          >
            Produits
          </h2>
          <p style={{ fontSize: 13, color: "var(--color-ink3)" }}>
            {orderedProducts.length} produit
            {orderedProducts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          style={{
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
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          Nouveau produit
        </button>
      </div>

      {/* Filter bar – sticky on scroll within admin content */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          padding: "14px 16px",
          borderRadius: 16,
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 10,
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            flex: "1 1 200px",
          }}
        >
          <Search
            size={14}
            strokeWidth={2}
            style={{ color: "var(--color-ink4)" }}
          />
          <input
            type="text"
            placeholder="Rechercher…"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              flex: 1,
              fontSize: 13,
              color: "var(--color-ink)",
              fontFamily: "var(--font-body)",
            }}
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ ...filters, search: "" })}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink4)",
                padding: 0,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {(["category", "eventType", "style"] as const).map((key) => {
          const options =
            key === "category"
              ? CATEGORIES
              : key === "eventType"
                ? EVENT_TYPES
                : STYLES;
          const label =
            key === "category"
              ? "Catégorie"
              : key === "eventType"
                ? "Événement"
                : "Style";
          return (
            <select
              key={key}
              value={filters[key] ?? ""}
              onChange={(e) =>
                setFilters({ ...filters, [key]: e.target.value || null })
              }
              style={{
                padding: "7px 12px",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface2)",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-ink2)",
                cursor: "pointer",
              }}
            >
              <option value="">{label}</option>
              {options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          );
        })}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-ink3)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={filters.inStockOnly}
            onChange={(e) =>
              setFilters({ ...filters, inStockOnly: e.target.checked })
            }
            style={{ accentColor: "var(--color-accent)" }}
          />
          En stock uniquement
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--color-ink3)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={filters.showInactive}
            onChange={(e) =>
              setFilters({ ...filters, showInactive: e.target.checked })
            }
            style={{ accentColor: "var(--color-accent)" }}
          />
          Voir les inactifs
        </label>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            padding: "10px 16px",
            borderRadius: 12,
            background: "var(--color-accent-soft2)",
            border: "1px solid var(--color-accent)",
            color: "var(--color-accent)",
            fontSize: 12.5,
            fontWeight: 600,
            alignItems: "center",
          }}
        >
          <span>
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
          </span>
          <button onClick={() => handleBulkActivate(true)} style={quickBtn}>
            Activer
          </button>
          <button onClick={() => handleBulkActivate(false)} style={quickBtn}>
            Désactiver
          </button>
          <button
            onClick={handleBulkDelete}
            style={{
              ...quickBtn,
              color: "#ef4444",
              borderColor: "#fecaca",
              background: "#fef2f2",
            }}
          >
            Supprimer
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{
              ...quickBtn,
              marginLeft: "auto",
              color: "var(--color-ink3)",
              borderColor: "var(--color-border)",
              background: "var(--color-surface2)",
            }}
          >
            <X size={14} style={{ marginRight: 4 }} />
            Annuler la sélection
          </button>
        </div>
      )}

      {/* Table */}
      <div
        style={{
          overflowX: "auto",
          borderRadius: 16,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead
            style={{
              background: "var(--color-surface2)",
              fontWeight: 700,
              color: "var(--color-ink2)",
            }}
          >
            <tr>
              {selected.size === 0 && (
                <th style={{ padding: "12px 14px", textAlign: "center" }}></th>
              )}
              <th style={{ padding: "12px 14px", textAlign: "left" }}>
                <input
                  type="checkbox"
                  checked={
                    selected.size === orderedProducts.length &&
                    orderedProducts.length > 0
                  }
                  onChange={toggleAll}
                  style={{ accentColor: "var(--color-accent)" }}
                />
              </th>
              <th style={{ padding: "12px 14px", textAlign: "left" }}>Image</th>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
                onClick={() => toggleSort("title")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Titre {sortIcon("title")}
                </div>
              </th>
              <th
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
                onClick={() => toggleSort("price")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  Prix {sortIcon("price")}
                </div>
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Stock
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Badges
              </th>
              <th style={{ padding: "12px 14px", textAlign: "center" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {orderedProducts.map((p) => {
              const discount =
                p.originalPrice && p.originalPrice > p.price
                  ? Math.round(
                      ((p.originalPrice - p.price) / p.originalPrice) * 100,
                    )
                  : null;
              const idxInManual = manualOrder.indexOf(p.id);
              const isFirst = idxInManual === 0;
              const isLast = idxInManual === manualOrder.length - 1;
              return (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    opacity: p.isActive ? 1 : 0.55,
                  }}
                >
                  {/* Flèches de réorganisation (masquées si sélection active) */}
                  {selected.size === 0 && (
                    <td style={{ padding: "10px 14px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <button
                          onClick={() => moveProduct(p.id, -1)}
                          style={{
                            ...arrowBtn,
                            visibility: isFirst ? "hidden" : "visible",
                          }}
                          disabled={isFirst}
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button
                          onClick={() => moveProduct(p.id, 1)}
                          style={{
                            ...arrowBtn,
                            visibility: isLast ? "hidden" : "visible",
                          }}
                          disabled={isLast}
                        >
                          <ChevronDown size={12} />
                        </button>
                      </div>
                    </td>
                  )}
                  <td style={{ padding: "10px 14px" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      style={{ accentColor: "var(--color-accent)" }}
                    />
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <button
                      onClick={() => setQuickViewProduct(p)}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        overflow: "hidden",
                        background: "var(--color-surface2)",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <img
                        src={p.image || PLACEHOLDER_IMG}
                        alt={p.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </button>
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      color: "var(--color-ink)",
                      maxWidth: 220,
                    }}
                  >
                    <button
                      onClick={() => setQuickViewProduct(p)}
                      style={{
                        fontWeight: 600,
                        color: "var(--color-ink)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        padding: 0,
                        textDecoration: "underline",
                        textUnderlineOffset: 3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "block",
                        maxWidth: "100%",
                      }}
                    >
                      {p.title}
                    </button>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-ink4)",
                        fontWeight: 400,
                        marginTop: 2,
                      }}
                    >
                      {p.brand}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "10px 14px",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 700,
                      color: "var(--color-ink)",
                    }}
                  >
                    {p.price.toFixed(2)} $
                    {discount && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          color: "var(--color-accent)",
                          fontWeight: 600,
                        }}
                      >
                        -{discount}%
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    {p.inStock ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--color-success)",
                        }}
                      >
                        En stock
                      </span>
                    ) : (
                      <Badge
                        label="Sur commande"
                        style={BADGE_STYLE.outofstock}
                      />
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {p.isBestSeller && (
                        <Badge
                          label="Best seller"
                          style={BADGE_STYLE.bestseller}
                        />
                      )}
                      {p.eventType === "live" && (
                        <Badge label="Live" style={BADGE_STYLE.live} />
                      )}
                      {(p.isLimitedTime || p.dealActive) && (
                        <Badge
                          label="Offre limitée"
                          style={BADGE_STYLE.limited}
                        />
                      )}
                      {p.dealActive && (
                        <Badge label="Deal" style={BADGE_STYLE.deal} />
                      )}
                      {!p.isActive && (
                        <Badge label="Inactif" style={BADGE_STYLE.inactive} />
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        justifyContent: "center",
                      }}
                    >
                      <button
                        title="Modifier"
                        style={iconBtn}
                        onClick={() => handleEdit(p)}
                      >
                        <Edit3 size={14} strokeWidth={2} />
                      </button>
                      <button
                        title="Dupliquer"
                        style={iconBtn}
                        onClick={() => handleDuplicate(p.id)}
                      >
                        <Copy size={14} strokeWidth={2} />
                      </button>
                      <button
                        title={p.isActive ? "Désactiver" : "Activer"}
                        style={iconBtn}
                        onClick={() => handleToggleActive(p.id, !p.isActive)}
                      >
                        {p.isActive ? (
                          <EyeOff size={14} strokeWidth={2} />
                        ) : (
                          <Eye size={14} strokeWidth={2} />
                        )}
                      </button>
                      <button
                        title="Supprimer"
                        style={{ ...iconBtn, color: "#ef4444" }}
                        onClick={() => handleDeleteSingle(p.id)}
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orderedProducts.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 32,
              color: "var(--color-ink4)",
            }}
          >
            <Package
              size={28}
              style={{ margin: "0 auto 10px", opacity: 0.5 }}
            />
            Aucun produit trouvé.
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

const iconBtn: React.CSSProperties = {
  background: "var(--color-surface2)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  padding: 6,
  cursor: "pointer",
  color: "var(--color-ink2)",
  display: "flex",
  alignItems: "center",
};

const quickBtn: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: 8,
  border: "1px solid var(--color-accent)",
  background: "transparent",
  color: "var(--color-accent)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
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
