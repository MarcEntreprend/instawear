// src/components/CatalogSection.tsx

import React, {
  useState,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  X,
  LayoutGrid,
  List,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import StoreProductCard from "./StoreProductCard";
import { Chip } from "./ui/Button";
import type { Product, FilterState } from "../types";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { useReferenceLists } from "../admin/adminHooks";

interface CatalogSectionProps {
  filteredProducts: Product[];
  loadingProducts: boolean;
  favorites: string[];
  currencySymbol: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onSelectProduct: (product: Product) => void;
  searchTerm: string;
  selectedCategory: string | null;
  setSearchTerm: (v: string) => void;
  setSelectedCategory: (v: string | null) => void;
}

// ── Fallback data for reference lists ──
const FALLBACK_EVENT_TYPES = [
  { value: "sport", label: "Sport", icon: () => <span>⚽</span> },
  { value: "culture", label: "Festival", icon: () => <span>🎉</span> },
  { value: "saisonnier", label: "Seasonal", icon: () => <span>🍂</span> },
];

const FALLBACK_CATEGORIES = [
  { value: "tshirt", label: "T‑Shirt", icon: () => <span>👕</span> },
  { value: "hoodie", label: "Hoodie", icon: () => <span>🧥</span> },
  { value: "accessory", label: "Accessory", icon: () => <span>🧢</span> },
  { value: "mug", label: "Mug", icon: () => <span>☕</span> },
];

const SORT_OPTIONS = [
  { value: "popular", label: "Popularity" },
  { value: "price-asc", label: "Price Low to High" },
  { value: "price-desc", label: "Price High to Low" },
  { value: "rating", label: "Rating" },
  { value: "new", label: "Newest" },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const COLOR_LIST = [
  { key: "black", name: "Black", hex: "#1a1a1a" },
  { key: "white", name: "White", hex: "#ffffff" },
  { key: "gray", name: "Gray", hex: "#6b7280" },
  { key: "red", name: "Red", hex: "#dc2626" },
  { key: "blue", name: "Blue", hex: "#2563eb" },
  { key: "green", name: "Green", hex: "#16a34a" },
  { key: "yellow", name: "Yellow", hex: "#eab308" },
  { key: "pink", name: "Pink", hex: "#ec4899" },
];

const DEFAULT_FILTERS: FilterState = {
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
};

const CATEGORIES = [
  { label: "All", value: null },
  { label: "T-Shirts", value: "tshirt" },
  { label: "Hoodies", value: "hoodie" },
  { label: "Accessories", value: "accessory" },
  { label: "Mugs", value: "mug" },
];

export default function CatalogSection({
  filteredProducts,
  loadingProducts,
  favorites,
  currencySymbol,
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
  searchTerm,
  selectedCategory,
  setSearchTerm,
  setSelectedCategory,
}: CatalogSectionProps) {
  // ── Fetch reference lists from Supabase ──
  const { items: referenceItems } = useReferenceLists();

  const eventTypes = useMemo(() => {
    const items = referenceItems.filter((r) => r.type === "event_type");
    if (items.length === 0) return FALLBACK_EVENT_TYPES;
    return items.map((item) => ({
      value: item.value,
      label: item.label,
      icon: () => <span>📌</span>,
    }));
  }, [referenceItems]);

  const productCategories = useMemo(() => {
    const items = referenceItems.filter((r) => r.type === "category");
    if (items.length === 0) return FALLBACK_CATEGORIES;
    return items.map((item) => ({
      value: item.value,
      label: item.label,
      icon: () => <span>📁</span>,
    }));
  }, [referenceItems]);

  // ── Local state ──
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    category: selectedCategory,
  });
  const [sort, setSort] = useState<SortValue>("popular");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // ── Apply filters ──
  const finalProducts = useMemo(() => {
    let list = filteredProducts;

    if (filters.priceMin > 0) {
      list = list.filter((p) => p.price >= filters.priceMin);
    }
    if (filters.priceMax < 200) {
      list = list.filter((p) => p.price <= filters.priceMax);
    }
    if (filters.size) {
      list = list.filter((p) => p.sizes.includes(filters.size!));
    }
    if (filters.color) {
      list = list.filter((p) => p.colors.includes(filters.color!));
    }
    if (filters.style) {
      list = list.filter((p) => p.style === filters.style);
    }
    if (filters.material) {
      list = list.filter((p) => p.material === filters.material);
    }
    if (filters.inStockOnly) {
      list = list.filter((p) => p.inStock !== false);
    }

    switch (sort) {
      case "price-asc":
        list = [...list].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list = [...list].sort((a, b) => b.price - a.price);
        break;
      case "rating":
        list = [...list].sort((a, b) => b.ratings.score - a.ratings.score);
        break;
      case "new":
        list = [...list].sort(
          (a, b) => (b.isLimitedTime ? 1 : 0) - (a.isLimitedTime ? 1 : 0),
        );
        break;
      default:
        list = [...list].sort((a, b) => b.boughtLastMonth - a.boughtLastMonth);
    }

    return list;
  }, [filteredProducts, filters, sort]);

  const activeFilterCount = [
    filters.eventType,
    filters.category,
    filters.style,
    filters.material,
    filters.size,
    filters.color,
    filters.inStockOnly ? "stock" : null,
  ].filter(Boolean).length;

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedCategory(null);
    setSearchTerm("");
  };

  const handleCategoryChange = (cat: string | null) => {
    setSelectedCategory(cat);
    setFilters((f) => ({ ...f, category: cat }));
  };

  return (
    <section
      id="section-catalog"
      className="section-container max-w-7xl w-full mx-auto scroll-mt-28"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest"
            style={{ color: "var(--color-accent)" }}
          >
            <Sparkles size={13} /> New Arrivals
          </span>
          <h2
            className="font-display font-black text-2xl sm:text-4xl mt-1"
            style={{ color: "var(--color-ink)" }}
          >
            2026 Collection
          </h2>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((c) => (
            <Chip
              key={c.label}
              active={selectedCategory === c.value}
              onClick={() => handleCategoryChange(c.value)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      </div>

      {searchTerm && (
        <div className="flex items-center gap-2 mb-4">
          <span
            className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full"
            style={{
              background: "var(--color-surface2)",
              color: "var(--color-ink2)",
            }}
          >
            <SlidersHorizontal size={12} /> "{searchTerm}"
            <button
              onClick={() => setSearchTerm("")}
              style={{ color: "var(--color-ink4)" }}
            >
              ✕
            </button>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-6">
        <button
          onClick={() => setIsFilterDrawerOpen(true)}
          className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
          style={{
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            color: "var(--color-ink2)",
          }}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeFilterCount > 0 && (
            <span
              className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black text-white"
              style={{ background: "var(--color-accent)" }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>

        <div
          className="hidden sm:flex items-center rounded-full p-1 border"
          style={{ borderColor: "var(--color-border)" }}
        >
          <button
            onClick={() => setView("grid")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              background:
                view === "grid" ? "var(--color-surface)" : "transparent",
              boxShadow: view === "grid" ? "var(--shadow-sm)" : "none",
            }}
          >
            <LayoutGrid size={14} style={{ color: "var(--color-ink)" }} />
          </button>
          <button
            onClick={() => setView("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              background:
                view === "list" ? "var(--color-surface)" : "transparent",
              boxShadow: view === "list" ? "var(--shadow-sm)" : "none",
            }}
          >
            <List size={14} style={{ color: "var(--color-ink)" }} />
          </button>
        </div>

        <div className="relative ml-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortValue)}
            className="appearance-none rounded-full pl-4 pr-9 h-11 text-sm font-semibold outline-none"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-ink)",
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Sort: {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-ink3)" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        <aside className="hidden lg:block">
          <div className="h-[calc(100vh-140px)] sticky top-24 overflow-y-auto pr-2 scrollbar-thin">
            <FilterPanel
              filters={filters}
              setFilters={setFilters}
              activeFilterCount={activeFilterCount}
              onReset={resetFilters}
              currencySymbol={currencySymbol}
              eventTypes={eventTypes}
              productCategories={productCategories}
            />
          </div>
        </aside>

        <div>
          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[22px] overflow-hidden">
                  <div className="skeleton aspect-square" />
                  <div className="p-3.5 flex flex-col gap-2">
                    <div className="skeleton h-3 w-3/4 rounded-full" />
                    <div className="skeleton h-3 w-1/3 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : finalProducts.length === 0 ? (
            <div
              className="py-20 text-center rounded-[28px] border border-dashed"
              style={{ borderColor: "var(--color-border2)" }}
            >
              <img
                src={PLACEHOLDER_IMG}
                alt=""
                className="w-14 h-14 mx-auto mb-3 opacity-40"
              />
              <p className="font-bold" style={{ color: "var(--color-ink)" }}>
                No items match your criteria
              </p>
              <p
                className="text-sm mt-1"
                style={{ color: "var(--color-ink3)" }}
              >
                Try adjusting your filters.
              </p>
              <button onClick={resetFilters} className="btn btn-accent mt-4">
                <RotateCcw size={14} /> Reset filters
              </button>
            </div>
          ) : (
            <div
              className={
                view === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4"
                  : "flex flex-col gap-4"
              }
            >
              {finalProducts.map((p) => (
                <StoreProductCard
                  key={p.id}
                  product={p}
                  isFavorite={favorites.includes(p.id)}
                  currencySymbol={currencySymbol}
                  onToggleFavorite={onToggleFavorite}
                  onAddToCart={onAddToCart}
                  onSelectProduct={onSelectProduct}
                />
              ))}
            </div>
          )}

          {loadingProducts && (
            <div
              className="flex items-center justify-center gap-2 mt-6 text-sm"
              style={{ color: "var(--color-ink3)" }}
            >
              <RefreshCw size={14} className="animate-spin" /> Loading…
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in"
            style={{ background: "rgba(15,13,10,.5)" }}
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl animate-fade-up"
            style={{
              background: "var(--color-bg)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div
              className="sticky top-0 flex items-center justify-between px-5 h-16"
              style={{
                background: "var(--color-bg)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <span
                className="text-base font-bold"
                style={{ color: "var(--color-ink)" }}
              >
                Filters
              </span>
              <button
                aria-label="Close filters"
                onClick={() => setIsFilterDrawerOpen(false)}
              >
                <X size={20} style={{ color: "var(--color-ink2)" }} />
              </button>
            </div>
            <div className="p-5">
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                activeFilterCount={activeFilterCount}
                onReset={resetFilters}
                currencySymbol={currencySymbol}
                eventTypes={eventTypes}
                productCategories={productCategories}
              />
            </div>
            <div
              className="sticky bottom-0 p-4 safe-bottom"
              style={{
                background: "var(--color-bg)",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <button
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-full py-3.5 rounded-full font-black text-sm text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent), var(--color-accent2))",
                  boxShadow: "var(--shadow-accent)",
                }}
              >
                View {finalProducts.length} item
                {finalProducts.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Filter Panel ────────────────────────────────────────────

interface FilterPanelProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  activeFilterCount: number;
  onReset: () => void;
  currencySymbol: string;
  eventTypes: { value: string; label: string; icon: () => React.ReactNode }[];
  productCategories: {
    value: string;
    label: string;
    icon: () => React.ReactNode;
  }[];
}

function FilterPanel({
  filters,
  setFilters,
  activeFilterCount,
  onReset,
  currencySymbol,
  eventTypes,
  productCategories,
}: FilterPanelProps) {
  return (
    <div className="flex flex-col gap-6 pb-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>
          Filters
        </h3>
        {activeFilterCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: "var(--color-accent)" }}
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      <FilterGroup title="Event">
        {eventTypes.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className="flex items-center gap-2.5 py-1.5 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={filters.eventType === value}
              onChange={() =>
                setFilters((f) => ({
                  ...f,
                  eventType: f.eventType === value ? null : value,
                }))
              }
              className="w-4 h-4 accent-(--color-accent)"
            />
            <Icon />
            <span className="text-sm" style={{ color: "var(--color-ink2)" }}>
              {label}
            </span>
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title="Category">
        {productCategories.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className="flex items-center gap-2.5 py-1.5 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={filters.category === value}
              onChange={() =>
                setFilters((f) => ({
                  ...f,
                  category: f.category === value ? null : value,
                }))
              }
              className="w-4 h-4 accent-(--color-accent)"
            />
            <Icon />
            <span className="text-sm" style={{ color: "var(--color-ink2)" }}>
              {label}
            </span>
          </label>
        ))}
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center rounded-xl px-3 h-10 flex-1"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <span
              className="text-xs mr-1"
              style={{ color: "var(--color-ink4)" }}
            >
              {currencySymbol}
            </span>
            <input
              type="number"
              min={0}
              value={filters.priceMin}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  priceMin: Number(e.target.value) || 0,
                }))
              }
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "var(--color-ink)" }}
            />
          </div>
          <span style={{ color: "var(--color-ink4)" }}>—</span>
          <div
            className="flex items-center rounded-xl px-3 h-10 flex-1"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <span
              className="text-xs mr-1"
              style={{ color: "var(--color-ink4)" }}
            >
              {currencySymbol}
            </span>
            <input
              type="number"
              min={0}
              value={filters.priceMax}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  priceMax: Number(e.target.value) || 0,
                }))
              }
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "var(--color-ink)" }}
            />
          </div>
        </div>
      </FilterGroup>

      <FilterGroup title="Size">
        <div className="flex flex-wrap gap-2">
          {["XS", "S", "M", "L", "XL", "XXL"].map((size) => (
            <button
              key={size}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  size: f.size === size ? null : size,
                }))
              }
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
              style={{
                background:
                  filters.size === size
                    ? "var(--color-accent)"
                    : "var(--color-surface2)",
                color: filters.size === size ? "#fff" : "var(--color-ink3)",
                border: `1px solid ${filters.size === size ? "var(--color-accent)" : "var(--color-border)"}`,
              }}
            >
              {size}
            </button>
          ))}
          <button
            key="One Size"
            onClick={() =>
              setFilters((f) => ({
                ...f,
                size: f.size === "One Size" ? null : "One Size",
              }))
            }
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-colors"
            style={{
              background:
                filters.size === "One Size"
                  ? "var(--color-accent)"
                  : "var(--color-surface2)",
              color: filters.size === "One Size" ? "#fff" : "var(--color-ink3)",
              border: `1px solid ${filters.size === "One Size" ? "var(--color-accent)" : "var(--color-border)"}`,
            }}
          >
            One Size
          </button>
        </div>
      </FilterGroup>

      <FilterGroup title="Color">
        <div className="flex flex-wrap gap-2.5">
          {COLOR_LIST.map((c) => (
            <button
              key={c.key}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  color: f.color === c.hex ? null : c.hex,
                }))
              }
              aria-label={c.name}
              title={c.name}
              className="w-8 h-8 rounded-full"
              style={{
                background: c.hex,
                border:
                  filters.color === c.hex
                    ? "2px solid var(--color-accent)"
                    : "1px solid var(--color-border2)",
                boxShadow:
                  filters.color === c.hex ? "var(--shadow-sm)" : "none",
              }}
            />
          ))}
        </div>
      </FilterGroup>

      <label className="flex items-center justify-between cursor-pointer">
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-ink)" }}
        >
          In stock only
        </span>
        <span
          onClick={() =>
            setFilters((f) => ({ ...f, inStockOnly: !f.inStockOnly }))
          }
          className="w-11 h-6 rounded-full relative transition-colors"
          style={{
            background: filters.inStockOnly
              ? "var(--color-accent)"
              : "var(--color-border2)",
          }}
        >
          <span
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
            style={{
              transform: filters.inStockOnly
                ? "translateX(22px)"
                : "translateX(2px)",
            }}
          />
        </span>
      </label>
    </div>
  );
}

// ─── Filter Group ──────────────────────────────────────────

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4
        className="text-xs font-bold uppercase tracking-wider mb-3"
        style={{ color: "var(--color-ink3)" }}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}
