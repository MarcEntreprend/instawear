// src/components/CatalogSection.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  X,
  LayoutGrid,
  List,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import StoreProductCard from "./StoreProductCard";
import ProductCardSkeleton from "./skeletons/ProductCardSkeleton";
import type { Product } from "../types";
import { PLACEHOLDER_IMG, NO_INTERNET } from "../constants/assets";
import { EVENT_TYPES, PRODUCT_CATEGORIES, STYLE_OPTIONS, MATERIAL_OPTIONS, SORT_OPTIONS, type SortValue } from "../data/categories";

interface CatalogSectionProps {
  filteredProducts: Product[];
  loadingProducts: boolean;
  networkError?: boolean;
  favorites: string[];
  dealExpired: boolean;
  dealFadingOut: boolean;
  countdownString: string;
  currencySymbol: string;
  onToggleFavorite: (id: string) => void;
  onAddToCart: (product: Product, color: string, size: string) => void;
  onSelectProduct: (product: Product) => void;
  onClearFilters: () => void;
  searchTerm: string;
  selectedCategory: string | null;
  selectedEventType: string | null;
  setSearchTerm: (v: string) => void;
  setSelectedCategory: (v: string | null) => void;
  setSelectedEventType: (v: string | null) => void;
  showDeliveryInfo?: boolean;
  getDeliverEstimateString?: (days: number) => string;
  isFavoritesMode?: boolean;
  onClearFavorites?: () => void;
}
const PAGE_SIZE = 12;
type FilterState = {
  search: string; category: string | null; eventType: string | null; style: string | null; material: string | null;
  priceMin: number; priceMax: number; inStockOnly: boolean; size: string | null; color: string | null;
};
const DEFAULT_FILTERS: FilterState = { search: "", category: null, eventType: null, style: null, material: null, priceMin: 0, priceMax: 200, inStockOnly: false, size: null, color: null };
const DEFAULT_SORT: SortValue = "popular";
const DEFAULT_VIEW: "grid" | "list" = "grid";
function parseFiltersFromSearch(search: string, fallbackEventType: string | null, fallbackCategory: string | null): { filters: FilterState; sort: SortValue; view: "grid" | "list" } {
  const params = new URLSearchParams(search);
  const filters: FilterState = {
    search: params.get("q") ?? "", eventType: params.get("event") ?? fallbackEventType, category: params.get("cat") ?? fallbackCategory,
    style: params.get("style") ?? null, material: params.get("material") ?? null,
    priceMin: params.has("pmin") ? Number(params.get("pmin")) : 0, priceMax: params.has("pmax") ? Number(params.get("pmax")) : 200,
    inStockOnly: params.get("stock") === "1", size: params.get("size") ?? null, color: params.get("color") ? `#${params.get("color")}` : null,
  };
  const sortParam = params.get("sort");
  const sort = SORT_OPTIONS.some((o) => o.value === sortParam) ? (sortParam as SortValue) : DEFAULT_SORT;
  const view = params.get("view") === "list" ? "list" : DEFAULT_VIEW;
  return { filters, sort, view };
}
function serializeFiltersToSearch(filters: FilterState, sort: SortValue, view: "grid" | "list"): string {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.eventType) params.set("event", filters.eventType);
  if (filters.category) params.set("cat", filters.category);
  if (filters.style) params.set("style", filters.style);
  if (filters.material) params.set("material", filters.material);
  if (filters.priceMin !== 0) params.set("pmin", String(filters.priceMin));
  if (filters.priceMax !== 200) params.set("pmax", String(filters.priceMax));
  if (filters.inStockOnly) params.set("stock", "1");
  if (filters.size) params.set("size", filters.size);
  if (filters.color) params.set("color", filters.color.replace("#", ""));
  if (sort !== DEFAULT_SORT) params.set("sort", sort);
  if (view !== DEFAULT_VIEW) params.set("view", view);
  return params.toString();
}
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL"];
const COLOR_OPTIONS = [
  { hex: "#000000", name: "Black" },
  { hex: "#ffffff", name: "White" },
  { hex: "#ff0000", name: "Red" },
  { hex: "#0000ff", name: "Blue" },
  { hex: "#00ff00", name: "Green" },
  { hex: "#ffff00", name: "Yellow" },
  { hex: "#ff00ff", name: "Pink" },
  { hex: "#ffa500", name: "Orange" },
];

export default function CatalogSection({
  filteredProducts,
  loadingProducts,
  networkError = false,
  favorites,
  dealExpired,
  dealFadingOut,
  countdownString,
  currencySymbol,
  onToggleFavorite,
  onAddToCart,
  onSelectProduct,
  onClearFilters,
  searchTerm,
  selectedCategory,
  selectedEventType,
  setSearchTerm,
  setSelectedCategory,
  setSelectedEventType,
  isFavoritesMode = false,
  onClearFavorites,
}: CatalogSectionProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined" && window.location.search.length > 1) return parseFiltersFromSearch(window.location.search, selectedEventType, selectedCategory).view;
    return DEFAULT_VIEW;
  });
  const [sort, setSort] = useState<SortValue>(() => {
    if (typeof window !== "undefined" && window.location.search.length > 1) return parseFiltersFromSearch(window.location.search, selectedEventType, selectedCategory).sort;
    return DEFAULT_SORT;
  });
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window !== "undefined" && window.location.search.length > 1) return parseFiltersFromSearch(window.location.search, selectedEventType, selectedCategory).filters;
    return { ...DEFAULT_FILTERS, eventType: selectedEventType, category: selectedCategory, search: searchTerm };
  });
  // Sync App's search/category/event into local filters when they change externally (header)
  useEffect(() => { setFilters((f) => ({ ...f, search: searchTerm, category: selectedCategory, eventType: selectedEventType })); }, [searchTerm, selectedCategory, selectedEventType]);
  useEffect(() => {
    const qs = serializeFiltersToSearch(filters, sort, viewMode);
    const url = qs ? `/?${qs}` : "/";
    window.history.replaceState(window.history.state, "", url);
  }, [filters, sort, viewMode]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const extraFiltered = useMemo(() => {
    let list = filteredProducts.filter((p) => {
      if (p.price < filters.priceMin || p.price > filters.priceMax) return false;
      if (filters.size && !p.sizes.includes(filters.size)) return false;
      if (filters.color && !p.colors.includes(filters.color)) return false;
      if (filters.inStockOnly && p.inStock === false) return false;
      if (filters.style && p.style !== filters.style) return false;
      if (filters.material && p.material !== filters.material) return false;
      return true;
    });
    switch (sort) {
      case "price-asc": list = [...list].sort((a, b) => a.price - b.price); break;
      case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break;
      case "rating": list = [...list].sort((a, b) => b.ratings.score - a.ratings.score); break;
      case "new": list = [...list].sort((a, b) => (b.isLimitedTime ? 1 : 0) - (a.isLimitedTime ? 1 : 0)); break;
      default: list = [...list].sort((a, b) => b.boughtLastMonth - a.boughtLastMonth);
    }
    return list;
  }, [filteredProducts, filters, sort]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [extraFiltered.length]);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [extraFiltered.length, visibleCount]);

  const displayed = extraFiltered.slice(0, visibleCount);
  const hasMore = visibleCount < extraFiltered.length;
  const activeFilterCount = [
    filters.eventType,
    filters.category,
    filters.style,
    filters.material,
    filters.size,
    filters.color,
    filters.inStockOnly ? "stock" : null,
    filters.priceMin !== 0 || filters.priceMax !== 200 ? "price" : null,
  ].filter(Boolean).length;

  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((v) => Math.min(extraFiltered.length, v + PAGE_SIZE));
      setIsLoadingMore(false);
    }, 250);
  };

  const resetExtra = () => {
    setFilters(DEFAULT_FILTERS);
  };
  const handleResetAll = () => {
    onClearFilters();
    resetExtra();
    if (isFavoritesMode && onClearFavorites) onClearFavorites();
  };

  return (
    <section
      id="section-catalog"
      className="w-full max-w-350 mx-auto px-4 sm:px-6 py-14 sm:py-20 scroll-mt-24"
    >
      <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
        <div>
          <span className="eyebrow mb-2 block">The Shop</span>
          <h2
            className="text-2xl sm:text-3xl font-extrabold"
            style={{ color: "var(--color-ink)" }}
          >
            {extraFiltered.length} item{extraFiltered.length > 1 ? "s" : ""}{" "}
            for your next event
          </h2>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[260px_1fr] gap-8 w-full lg:items-start">
        <aside className="hidden lg:block sticky top-24 self-start">
          <div
            className="flex flex-col gap-2 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 scrollbar-thin"
            style={{ scrollbarWidth: "thin" }}
          >
            <div className="flex items-center justify-between">
              {/* <h3
                className="text-sm font-bold"
                style={{ color: "var(--color-ink)" }}
              >
                Filtres
              </h3> */}
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetAll}
                  className="text-xs font-semibold flex items-center gap-1"
                  style={{ color: "var(--color-accent)" }}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>
            <FilterGroup title="Event">
              <div className="flex flex-col gap-0.5">
                {EVENT_TYPES.map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2.5 py-1.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEventType === value}
                      onChange={() =>
                        setSelectedEventType(
                          selectedEventType === value ? null : value,
                        )
                      }
                      className="w-4 h-4 accent-(--color-accent)"
                    />
                    <Icon size={14} style={{ color: "var(--color-ink3)" }} />
                    <span
                      className="text-sm"
                      style={{ color: "var(--color-ink2)" }}
                    >
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </FilterGroup>
            <FilterGroup title="Category">
              <div className="flex flex-col gap-0.5">
                {PRODUCT_CATEGORIES.map(({ value, label, icon: Icon }) => (
                  <label
                    key={value}
                    className="flex items-center gap-2.5 py-1.5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedCategory === value ||
                        selectedCategory ===
                          value
                            .replace("t-shirts", "tshirt")
                            .replace("hoodies", "hoodie")
                            .replace("accessories", "accessory")
                      }
                      onChange={() =>
                        setSelectedCategory(
                          selectedCategory === value ? null : value,
                        )
                      }
                      className="w-4 h-4 accent-(--color-accent)"
                    />
                    <Icon size={14} style={{ color: "var(--color-ink3)" }} />
                    <span
                      className="text-sm"
                      style={{ color: "var(--color-ink2)" }}
                    >
                      {label}
                    </span>
                  </label>
                ))}
              </div>
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
                    €
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={filters.priceMin}
                    onChange={(e) => setFilters((f) => ({ ...f, priceMin: Number(e.target.value) || 0 }))}
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
                    €
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={filters.priceMax}
                    onChange={(e) => setFilters((f) => ({ ...f, priceMax: Number(e.target.value) || 0 }))}
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: "var(--color-ink)" }}
                  />
                </div>
              </div>
            </FilterGroup>
            <FilterGroup title="Style">
              <div className="flex flex-wrap gap-1.5">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilters((f) => ({ ...f, style: f.style === s ? null : s }))}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors"
                    style={{
                      background: filters.style === s ? "var(--color-accent)" : "var(--color-surface2)",
                      color: filters.style === s ? "#fff" : "var(--color-ink3)",
                      border: `1px solid ${filters.style === s ? "var(--color-accent)" : "var(--color-border)"}`,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </FilterGroup>
            <FilterGroup title="Material">
              <div className="flex flex-wrap gap-1.5">
                {MATERIAL_OPTIONS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilters((f) => ({ ...f, material: f.material === m ? null : m }))}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors"
                    style={{
                      background: filters.material === m ? "var(--color-accent)" : "var(--color-surface2)",
                      color: filters.material === m ? "#fff" : "var(--color-ink3)",
                      border: `1px solid ${filters.material === m ? "var(--color-accent)" : "var(--color-border)"}`,
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </FilterGroup>
            <FilterGroup title="Size">
              <div className="flex flex-wrap gap-1.5">
                {SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      setFilters((f) => ({ ...f, size: f.size === size ? null : size }))
                    }
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors"
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
              </div>
            </FilterGroup>
            <FilterGroup title="Color">
              <ColorPicker
                colors={COLOR_OPTIONS}
                selectedColor={filters.color}
                onSelect={(hex) => setFilters((f) => ({ ...f, color: hex }))}
              />
            </FilterGroup>
            <label className="flex items-center justify-between cursor-pointer">
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                In stock only
              </span>
              <span
                onClick={() => setFilters((f) => ({ ...f, inStockOnly: !f.inStockOnly }))}
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
        </aside>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between gap-3">
            {useIsMobile() && (
              <button
                onClick={() => setIsFilterDrawerOpen(true)}
                className="btn btn-secondary flex items-center gap-2"
              >
                <SlidersHorizontal size={15} /> Filters{" "}
                {activeFilterCount > 0 && (
                  <span className="badge badge-accent">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-2">
                <div
                  className="hidden sm:flex items-center rounded-full p-1"
                  style={{
                    background: "var(--color-surface2)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <button
                    onClick={() => setViewMode("grid")}
                  aria-pressed={viewMode === "grid"}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      viewMode === "grid"
                        ? "var(--color-surface)"
                        : "transparent",
                    boxShadow:
                      viewMode === "grid" ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <LayoutGrid size={14} style={{ color: "var(--color-ink)" }} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  aria-pressed={viewMode === "list"}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      viewMode === "list"
                        ? "var(--color-surface)"
                        : "transparent",
                    boxShadow:
                      viewMode === "list" ? "var(--shadow-sm)" : "none",
                  }}
                >
                  <List size={14} style={{ color: "var(--color-ink)" }} />
                </button>
                </div>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortValue)}
                    className="appearance-none rounded-full pl-4 pr-9 h-9 text-xs font-semibold outline-none"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-ink)" }}
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-ink3)" }}>▼</span>
                </div>
              </div>
            </div>
          </div>

          {(searchTerm ||
            selectedCategory ||
            selectedEventType ||
            filters.size ||
            filters.color ||
            filters.style ||
            filters.material ||
            filters.inStockOnly ||
            filters.priceMin !== 0 ||
            filters.priceMax !== 200) && (
            <div
              className="mb-6 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Active filters:
                </span>
                {searchTerm && (
                  <span
                    className="chip"
                    data-active="true"
                    onClick={() => setSearchTerm("")}
                    style={{ cursor: "pointer" }}
                  >
                    Search: "{searchTerm}" <X size={12} />
                  </span>
                )}
                {selectedCategory && (
                  <span
                    className="chip"
                    data-active="true"
                    onClick={() => setSelectedCategory(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {selectedCategory} <X size={12} />
                  </span>
                )}
                {selectedEventType && (
                  <span
                    className="chip"
                    data-active="true"
                    onClick={() => setSelectedEventType(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {selectedEventType} <X size={12} />
                  </span>
                )}
                {filters.size && (
                  <span
                    className="chip"
                    data-active="true"
                    onClick={() => setFilters((f) => ({ ...f, size: null }))}
                    style={{ cursor: "pointer" }}
                  >
                    {filters.size} <X size={12} />
                  </span>
                )}
                {filters.color && (
                  <span
                    className="chip"
                    data-active="true"
                    onClick={() => setFilters((f) => ({ ...f, color: null }))}
                    style={{ cursor: "pointer" }}
                  >
                    Color <X size={12} />
                  </span>
                )}
                {filters.style && (
                  <span className="chip" data-active="true" onClick={() => setFilters((f) => ({ ...f, style: null }))} style={{ cursor: "pointer" }}>
                    {filters.style} <X size={12} />
                  </span>
                )}
                {filters.material && (
                  <span className="chip" data-active="true" onClick={() => setFilters((f) => ({ ...f, material: null }))} style={{ cursor: "pointer" }}>
                    {filters.material} <X size={12} />
                  </span>
                )}
                {filters.inStockOnly && (
                  <span
                    className="chip"
                    data-active="true"
                    onClick={() => setFilters((f) => ({ ...f, inStockOnly: false }))}
                    style={{ cursor: "pointer" }}
                  >
                    In stock <X size={12} />
                  </span>
                )}
              </div>
              <button
                onClick={handleResetAll}
                className="text-xs font-bold hover:underline"
                style={{ color: "var(--color-accent)" }}
              >
                Clear all
              </button>
            </div>
          )}

          {loadingProducts ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : extraFiltered.length === 0 ? (
            <div
              className="text-center py-24 rounded-3xl w-full"
              style={{ background: "var(--color-surface2)" }}
            >
              <p
                className="text-base font-bold mb-2"
                style={{ color: "var(--color-ink)" }}
              >
                No items match these filters
              </p>
              <p
                className="text-sm mb-5"
                style={{ color: "var(--color-ink3)" }}
              >
                Try broadening your search.
              </p>
              <button
                onClick={handleResetAll}
                className="btn btn-secondary mx-auto"
              >
                <RotateCcw size={14} /> Reset filters
              </button>
            </div>
          ) : (
            <>
              <div
                className={
                  viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 w-full"
                    : "flex flex-col gap-4 w-full"
                }
              >
                {displayed.map((product) => (
                  <StoreProductCard
                    key={product.id}
                    product={product}
                    isFavorite={favorites.includes(product.id)}
                    dealExpired={dealExpired}
                    dealFadingOut={dealFadingOut}
                    countdownStr={countdownString}
                    currencySymbol={currencySymbol}
                    onToggleFavorite={onToggleFavorite}
                    onAddToCart={onAddToCart}
                    onSelectProduct={onSelectProduct}
                  />
                ))}
              </div>
              {hasMore && (
                <div
                  ref={sentinelRef}
                  className="flex flex-col items-center gap-3 mt-10"
                >
                  <p className="text-xs" style={{ color: "var(--color-ink4)" }}>
                    {visibleCount} of {extraFiltered.length} items
                  </p>
                  <button
                    onClick={() =>
                      setVisibleCount((c) =>
                        Math.min(c + PAGE_SIZE, extraFiltered.length),
                      )
                    }
                    className="btn btn-secondary"
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in"
            style={{ background: "rgba(15,13,10,.5)" }}
            onClick={() => setIsFilterDrawerOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-4xl animate-fade-up"
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
                aria-label="Close"
                onClick={() => setIsFilterDrawerOpen(false)}
              >
                <X size={20} style={{ color: "var(--color-ink2)" }} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3
                  className="text-sm font-bold"
                  style={{ color: "var(--color-ink)" }}
                >
                  Filters
                </h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleResetAll}
                    className="text-xs font-semibold flex items-center gap-1"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <RotateCcw size={12} /> Reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      setFilters((f) => ({ ...f, size: f.size === size ? null : size }))
                    }
                    className="chip"
                    data-active={filters.size === size}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5">
            <FilterGroup title="Color">
                  <ColorPicker
                    colors={COLOR_OPTIONS}
                    selectedColor={filters.color}
                    onSelect={(hex) => setFilters((f) => ({ ...f, color: hex }))}
                  />
                </FilterGroup>
              </div>
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
                className="btn btn-accent w-full"
              >
                View {extraFiltered.length} items
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Sélecteur de couleurs compact ──────────────────────────────────
function ColorPicker({
  colors,
  selectedColor,
  onSelect,
}: {
  colors: { hex: string; name: string }[];
  selectedColor: string | null;
  onSelect: (hex: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"top" | "bottom">(
    "bottom",
  );
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const MAX_VISIBLE = 6;

  const visibleColors = colors.slice(0, MAX_VISIBLE);
  const extraCount = colors.length - MAX_VISIBLE;

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setDropdownPosition(spaceBelow < 200 ? "top" : "bottom");
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const spaceBelow = window.innerHeight - rect.bottom;
          setDropdownPosition(spaceBelow < 200 ? "top" : "bottom");
        }
      };
      window.addEventListener("resize", updatePosition);
      return () => window.removeEventListener("resize", updatePosition);
    }
  }, [isOpen]);

  const getDropdownStyle = (): React.CSSProperties => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    const left = rect.left;
    const top =
      dropdownPosition === "bottom" ? rect.bottom + 8 : rect.top - 8 - 200; // 200 = max-height du dropdown
    return {
      position: "fixed",
      top: top,
      left: left,
      width: Math.max(200, rect.width * 1.2),
      maxHeight: 200,
      overflowY: "auto",
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "0.75rem",
      boxShadow: "var(--shadow-lg)",
      padding: "0.5rem",
      zIndex: 9999,
    };
  };

  return (
    <div ref={buttonRef} className="inline-block">
      <div className="flex flex-wrap items-center gap-1.5">
        {visibleColors.map((c) => (
          <button
            key={c.hex}
            onClick={() => {
              onSelect(selectedColor === c.hex ? null : c.hex);
              setIsOpen(false);
            }}
            className="w-5 h-5 rounded-full transition-transform hover:scale-110"
            style={{
              background: c.hex,
              border:
                selectedColor === c.hex
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-border2)",
              boxShadow: selectedColor === c.hex ? "var(--shadow-sm)" : "none",
            }}
            title={c.name}
          />
        ))}
        {extraCount > 0 && (
          <>
            <button
              onClick={toggleOpen}
              className="color-wheel transition-transform hover:scale-110"
              title={`+${extraCount} colors`}
            />
            <span
              className="text-[11px] font-semibold cursor-pointer hover:underline"
              style={{ color: "var(--color-ink4)" }}
              onClick={toggleOpen}
            >
              +{extraCount}
            </span>
          </>
        )}
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          style={getDropdownStyle()}
          className="flex flex-wrap gap-1.5 p-2"
        >
          {colors.map((c) => (
            <button
              key={c.hex}
              onClick={() => {
                onSelect(selectedColor === c.hex ? null : c.hex);
                setIsOpen(false);
              }}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                background: c.hex,
                border:
                  selectedColor === c.hex
                    ? "2px solid var(--color-accent)"
                    : "1px solid var(--color-border2)",
              }}
              title={c.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
