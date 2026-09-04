// src/components/CatalogSection.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Sparkles,
  RefreshCw,
  X,
  LayoutGrid,
  List,
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import StoreProductCard from "./StoreProductCard";
import ProductCardSkeleton from "./skeletons/ProductCardSkeleton";
import type { Product } from "../types";
import { PLACEHOLDER_IMG, NO_INTERNET } from "../constants/assets";
import { EVENT_TYPES, PRODUCT_CATEGORIES } from "../data/categories";

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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(200);
  const [filterSize, setFilterSize] = useState<string | null>(null);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const extraFiltered = filteredProducts.filter((p) => {
    if (p.price < priceMin || p.price > priceMax) return false;
    if (filterSize && !p.sizes.includes(filterSize)) return false;
    if (filterColor && !p.colors.includes(filterColor)) return false;
    if (inStockOnly && p.inStock === false) return false;
    return true;
  });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [extraFiltered.length]);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting)
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, extraFiltered.length));
      },
      { rootMargin: "400px" },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [extraFiltered.length, visibleCount]);

  const displayed = extraFiltered.slice(0, visibleCount);
  const hasMore = visibleCount < extraFiltered.length;
  const activeFilterCount = [
    selectedEventType,
    selectedCategory,
    filterSize,
    filterColor,
    inStockOnly ? "stock" : null,
    priceMin !== 0 || priceMax !== 200 ? "price" : null,
  ].filter(Boolean).length;

  const resetExtra = () => {
    setPriceMin(0);
    setPriceMax(200);
    setFilterSize(null);
    setFilterColor(null);
    setInStockOnly(false);
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
          <span className="eyebrow mb-2 block">La boutique</span>
          <h2
            className="text-2xl sm:text-3xl font-extrabold"
            style={{ color: "var(--color-ink)" }}
          >
            {extraFiltered.length} article{extraFiltered.length > 1 ? "s" : ""}{" "}
            pour votre prochain événement
          </h2>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[260px_1fr] gap-8 w-full lg:items-start">
        <aside className="hidden lg:block sticky top-24 self-start">
          <div
            className="flex flex-col gap-7 max-h-[calc(100vh-7rem)] overflow-y-auto pr-1 scrollbar-thin"
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
                  <RotateCcw size={12} /> Réinitialiser
                </button>
              )}
            </div>
            <FilterGroup title="Événement">
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
            <FilterGroup title="Catégorie">
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
            <FilterGroup title="Prix">
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
                    value={priceMin}
                    onChange={(e) => setPriceMin(Number(e.target.value) || 0)}
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
                    value={priceMax}
                    onChange={(e) => setPriceMax(Number(e.target.value) || 0)}
                    className="w-full bg-transparent outline-none text-sm"
                    style={{ color: "var(--color-ink)" }}
                  />
                </div>
              </div>
            </FilterGroup>
            <FilterGroup title="Taille">
              <div className="flex flex-wrap gap-1.5">
                {SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      setFilterSize(filterSize === size ? null : size)
                    }
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors"
                    style={{
                      background:
                        filterSize === size
                          ? "var(--color-accent)"
                          : "var(--color-surface2)",
                      color: filterSize === size ? "#fff" : "var(--color-ink3)",
                      border: `1px solid ${filterSize === size ? "var(--color-accent)" : "var(--color-border)"}`,
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </FilterGroup>
            <FilterGroup title="Couleur">
              <ColorPicker
                colors={COLOR_OPTIONS}
                selectedColor={filterColor}
                onSelect={(hex) => setFilterColor(hex)}
              />
            </FilterGroup>
            <label className="flex items-center justify-between cursor-pointer">
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-ink)" }}
              >
                En stock uniquement
              </span>
              <span
                onClick={() => setInStockOnly(!inStockOnly)}
                className="w-11 h-6 rounded-full relative transition-colors"
                style={{
                  background: inStockOnly
                    ? "var(--color-accent)"
                    : "var(--color-border2)",
                }}
              >
                <span
                  className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                  style={{
                    transform: inStockOnly
                      ? "translateX(22px)"
                      : "translateX(2px)",
                  }}
                />
              </span>
            </label>
          </div>
        </aside>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between gap-3 mb-6">
            <button
              onClick={() => setIsFilterDrawerOpen(true)}
              className="lg:hidden btn btn-secondary"
            >
              <SlidersHorizontal size={15} /> Filtres{" "}
              {activeFilterCount > 0 && (
                <span className="badge badge-accent">{activeFilterCount}</span>
              )}
            </button>
            <div className="flex items-center gap-2 ml-auto">
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
            </div>
          </div>

          {(searchTerm ||
            selectedCategory ||
            selectedEventType ||
            filterSize ||
            filterColor ||
            inStockOnly ||
            priceMin !== 0 ||
            priceMax !== 200) && (
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
                  Filtres actifs:
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
                {filterSize && (
                  <span
                    className="chip"
                    data-active="true"
                    onClick={() => setFilterSize(null)}
                    style={{ cursor: "pointer" }}
                  >
                    {filterSize} <X size={12} />
                  </span>
                )}
                {filterColor && (
                  <span
                    className="chip"
                    data-active="true"
                    onClick={() => setFilterColor(null)}
                    style={{ cursor: "pointer" }}
                  >
                    Color <X size={12} />
                  </span>
                )}
                {inStockOnly && (
                  <span
                    className="chip"
                    data-active="true"
                    onClick={() => setInStockOnly(false)}
                    style={{ cursor: "pointer" }}
                  >
                    En stock <X size={12} />
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
                Aucun article ne correspond à ces filtres
              </p>
              <p
                className="text-sm mb-5"
                style={{ color: "var(--color-ink3)" }}
              >
                Essayez d'élargir votre recherche.
              </p>
              <button
                onClick={handleResetAll}
                className="btn btn-secondary mx-auto"
              >
                <RotateCcw size={14} /> Réinitialiser les filtres
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
                    {visibleCount} sur {extraFiltered.length} articles
                  </p>
                  <button
                    onClick={() =>
                      setVisibleCount((c) =>
                        Math.min(c + PAGE_SIZE, extraFiltered.length),
                      )
                    }
                    className="btn btn-secondary"
                  >
                    Charger plus
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
                Filtres
              </span>
              <button
                aria-label="Fermer"
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
                  Filtres
                </h3>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleResetAll}
                    className="text-xs font-semibold flex items-center gap-1"
                    style={{ color: "var(--color-accent)" }}
                  >
                    <RotateCcw size={12} /> Réinitialiser
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map((size) => (
                  <button
                    key={size}
                    onClick={() =>
                      setFilterSize(filterSize === size ? null : size)
                    }
                    className="chip"
                    data-active={filterSize === size}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5">
                <FilterGroup title="Couleur">
                  <ColorPicker
                    colors={COLOR_OPTIONS}
                    selectedColor={filterColor}
                    onSelect={(hex) => setFilterColor(hex)}
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
                Voir {extraFiltered.length} articles
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown au clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleSwatches = colors.slice(0, 3);
  const extraSwatches = colors.length - 3;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Affichage compact : 3 couleurs + cercle multicolore */}
      <div className="flex items-center gap-1.5">
        {visibleSwatches.map((c) => (
          <button
            key={c.hex}
            onClick={() => {
              onSelect(selectedColor === c.hex ? null : c.hex);
              setIsOpen(false);
            }}
            className="w-4 h-4 rounded-full transition-transform hover:scale-110"
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
        {extraSwatches > 0 && (
          <>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="color-wheel transition-transform hover:scale-110"
              title={`+${extraSwatches} colors`}
            />
            <span
              className="text-[11px] font-semibold cursor-pointer hover:underline"
              style={{ color: "var(--color-ink4)" }}
              onClick={() => setIsOpen(!isOpen)}
            >
              +{extraSwatches}
            </span>
          </>
        )}
      </div>

      {/* Dropdown scrollable */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 z-50 w-48 max-h-48 overflow-y-auto rounded-xl shadow-lg border p-2 animate-fade-up"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div className="flex flex-wrap gap-1.5">
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
