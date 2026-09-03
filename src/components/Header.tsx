// src/components/Header.tsx — V2 exact UI + V1 logic (Supabase live, no mock)
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  Sun,
  Moon,
  Truck,
  ShieldCheck,
  RotateCcw,
  ChevronDown,
  MapPin,
  PartyPopper,
  Trophy,
  Music,
  Snowflake,
  Gift,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { CartItem, NavLink, Product } from "../types";
import { CART_PLUS_ICON } from "../constants/assets";
import { useTheme } from "../hooks/useTheme";
import { useCurrency } from "../hooks/useCurrency";
import { EVENT_TYPES, PRODUCT_CATEGORIES } from "../data/categories";

interface HeaderProps {
  cart: CartItem[];
  detectedCountry?: string | null;
  favoriteCount: number;
  onOpenCart: () => void;
  onOpenFavorites: () => void;
  onOpenAuth: () => void;
  isAdminLoggedIn: boolean;
  isUserLoggedIn: boolean;
  onLogout: () => void;
  onOpenProfile: () => void;
  onSearch: (term: string) => void;
  currentSearchTerm: string;
  onSelectCategory: (cat: string | null) => void;
  onSelectEventType: (type: string | null) => void;
  currentEventType: string | null;
  currentCategory: string | null;
  onOpenAccount?: () => void;
  onScrollToSection: (
    section:
      | "catalog"
      | "about"
      | "testimonials"
      | "faq"
      | "contact"
      | "filters",
  ) => void;
  onOpenTracking: () => void;
  products: Product[];
  searchSuggestions?: string[];
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  isHomePage?: boolean;
}

type CategoryLink = NavLink & { icon: LucideIcon };
const MAIN_NAV_LINKS: NavLink[] = [
  { label: "Catalogue", section: "catalog", eventType: null, category: null },
  { label: "À propos", section: "about", eventType: null, category: null },
  {
    label: "Avis clients",
    section: "testimonials",
    eventType: null,
    category: null,
  },
  { label: "FAQ", section: "faq", eventType: null, category: null },
  { label: "Contact", section: "contact", eventType: null, category: null },
];
const CATEGORY_LINKS: CategoryLink[] = [
  {
    label: "Festivals",
    section: "catalog",
    eventType: "festival",
    category: null,
    icon: PartyPopper,
  },
  {
    label: "Sport",
    section: "catalog",
    eventType: "sport",
    category: null,
    icon: Trophy,
  },
  {
    label: "Concerts",
    section: "catalog",
    eventType: "concert",
    category: null,
    icon: Music,
  },
  {
    label: "Saisonnier",
    section: "catalog",
    eventType: "saisonnier",
    category: null,
    icon: Snowflake,
  },
  {
    label: "Anniversaires",
    section: "catalog",
    eventType: "anniversaire",
    category: null,
    icon: Gift,
  },
  {
    label: "Nouveautés",
    section: "catalog",
    eventType: null,
    category: null,
    icon: Sparkles,
  },
];
const SHIP_LOCATIONS = ["France", "Belgique", "Suisse", "Canada"];
interface CategorySuggestion {
  kind: "event" | "category";
  value: string;
  label: string;
  icon: LucideIcon;
}
const ALL_CATEGORY_SUGGESTIONS: CategorySuggestion[] = [
  ...EVENT_TYPES.map((e) => ({
    kind: "event" as const,
    value: e.value,
    label: e.label,
    icon: e.icon,
  })),
  ...PRODUCT_CATEGORIES.map((c) => ({
    kind: "category" as const,
    value: c.value,
    label: c.label,
    icon: c.icon,
  })),
];
function normalizeText(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
function getSuggestions(
  query: string,
  products: Product[],
): { categories: CategorySuggestion[]; products: Product[] } {
  const q = normalizeText(query.trim());
  if (!q) return { categories: [], products: [] };
  return {
    categories: ALL_CATEGORY_SUGGESTIONS.filter((c) =>
      normalizeText(c.label).includes(q),
    ).slice(0, 4),
    products: products
      .filter((p) => p.isActive && normalizeText(p.title).includes(q))
      .slice(0, 5),
  };
}
function SuggestionsList({
  categories,
  products,
  onPickCategory,
  onPickProduct,
}: {
  categories: CategorySuggestion[];
  products: Product[];
  onPickCategory: (s: CategorySuggestion) => void;
  onPickProduct: (p: Product) => void;
}) {
  if (categories.length === 0 && products.length === 0) return null;
  return (
    <div className="flex flex-col py-2">
      {categories.length > 0 && (
        <div className="px-2 pb-1">
          <p
            className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-ink4)" }}
          >
            Catégories
          </p>
          {categories.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={`${c.kind}-${c.value}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPickCategory(c)}
                className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-(--color-surface2)"
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: "var(--color-accent-bg)",
                    color: "var(--color-accent)",
                  }}
                >
                  <Icon size={14} />
                </span>
                <span
                  className="text-sm font-semibold flex-1 truncate"
                  style={{ color: "var(--color-ink)" }}
                >
                  {c.label}
                </span>
                <span
                  className="text-[10px] font-semibold shrink-0"
                  style={{ color: "var(--color-ink4)" }}
                >
                  Catégorie
                </span>
              </button>
            );
          })}
        </div>
      )}
      {products.length > 0 && (
        <div
          className="px-2 pt-1"
          style={
            categories.length > 0
              ? { borderTop: "1px solid var(--color-border)" }
              : undefined
          }
        >
          <p
            className="px-2.5 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: "var(--color-ink4)" }}
          >
            Produits
          </p>
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onPickProduct(p)}
              className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-(--color-surface2)"
            >
              <span
                className="w-8 h-8 rounded-lg overflow-hidden shrink-0"
                style={{ border: "1px solid var(--color-border)" }}
              >
                <img
                  src={p.image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className="block text-sm font-semibold truncate"
                  style={{ color: "var(--color-ink)" }}
                >
                  {p.title}
                </span>
              </span>
              <span
                className="text-[10px] font-semibold shrink-0"
                style={{ color: "var(--color-ink4)" }}
              >
                Produit
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header({
  cart,
  detectedCountry,
  favoriteCount,
  onOpenCart,
  onOpenFavorites,
  onOpenAuth,
  isAdminLoggedIn,
  isUserLoggedIn,
  onLogout,
  onOpenProfile,
  onOpenAccount,
  onScrollToSection,
  onOpenTracking,
  products,
  darkMode,
  onToggleDarkMode,
  onSearch,
  currentSearchTerm,
  onSelectCategory,
  onSelectEventType,
  currentEventType,
  currentCategory,
  isHomePage = true,
}: HeaderProps) {
  const { theme: themeHook, toggleTheme: toggleHook } = useTheme();
  const {
    country: shipTo,
    setCountry: onShipToChange,
    currency,
  } = useCurrency();
  const isControlledDark =
    typeof darkMode === "boolean" && typeof onToggleDarkMode === "function";
  const theme = isControlledDark ? (darkMode ? "dark" : "light") : themeHook;
  const toggleTheme = isControlledDark ? onToggleDarkMode! : toggleHook;
  const totalQty = cart.reduce((a, b) => a + b.quantity, 0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShipMenuOpen, setIsShipMenuOpen] = useState(false);
  const [isDesktopSuggestOpen, setIsDesktopSuggestOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [query, setQuery] = useState(currentSearchTerm);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestions = useMemo(
    () => getSuggestions(query, products),
    [query, products],
  );

  useEffect(() => setQuery(currentSearchTerm), [currentSearchTerm]);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const [isQuickNavVisible, setIsQuickNavVisible] = useState(true);
  useEffect(() => {
    if (!isHomePage) return;
    const occasionEl = document.getElementById("section-occasion");
    const catalogEl = document.getElementById("section-catalog");
    if (!occasionEl || !catalogEl) return;
    let lastScrollY = window.scrollY;
    let ticking = false;
    const updateVisibility = () => {
      ticking = false;
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY;
      const occasionRect = occasionEl.getBoundingClientRect();
      const isOccasionVisible = occasionRect.bottom > 0;
      const catalogRect = catalogEl.getBoundingClientRect();
      const isCatalogVisible =
        catalogRect.top < window.innerHeight && catalogRect.bottom > 0;
      if (isOccasionVisible) {
        setIsQuickNavVisible(true);
        lastScrollY = currentY;
        return;
      }
      if (isCatalogVisible) {
        setIsQuickNavVisible(false);
        lastScrollY = currentY;
        return;
      }
      if (Math.abs(delta) > 15) {
        setIsQuickNavVisible(delta < 0);
        lastScrollY = currentY;
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateVisibility);
      }
    };
    updateVisibility();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomePage]);
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);
  useEffect(() => {
    if (isSearchOpen) searchInputRef.current?.focus();
  }, [isSearchOpen]);
  const handleSubmitSearch = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
    setIsSearchOpen(false);
    setIsDesktopSuggestOpen(false);
  };
  const handleNavClick = (link: NavLink) => {
    if (link.section === "contact") {
      onScrollToSection("contact");
      setIsMobileMenuOpen(false);
      return;
    }
    if (link.section === "faq") {
      onScrollToSection("faq");
      setIsMobileMenuOpen(false);
      return;
    }
    if (link.eventType != null) onSelectEventType(link.eventType);
    if (link.category != null) onSelectCategory(link.category);
    if (link.eventType || link.category) onScrollToSection("filters");
    else onScrollToSection(link.section as any);
    setIsMobileMenuOpen(false);
  };
  const handlePickCategorySuggestion = (s: CategorySuggestion) => {
    onSelectEventType(s.kind === "event" ? s.value : null);
    onSelectCategory(s.kind === "category" ? s.value : null);
    onScrollToSection("catalog");
    setQuery("");
    onSearch("");
    setIsDesktopSuggestOpen(false);
    setIsSearchOpen(false);
  };
  const handlePickProductSuggestion = (p: Product) => {
    setQuery("");
    setIsDesktopSuggestOpen(false);
    setIsSearchOpen(false);
    const el = document.getElementById(`product-card-${p.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };
  const handleAccountClick = () => {
    if (isUserLoggedIn && onOpenAccount) onOpenAccount();
    else if (isAdminLoggedIn) onOpenProfile();
    else onOpenAuth();
  };

  return (
    <>
      <div
        className="hidden md:block text-xs"
        style={{ background: "var(--color-ink)", color: "var(--color-ink4)" }}
      >
        <div className="max-w-350 mx-auto px-6 h-10 flex items-center justify-between">
          <div className="relative">
            <button
              onClick={() => setIsShipMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 font-medium"
              style={{ color: "var(--color-bg)" }}
            >
              <MapPin size={13} strokeWidth={2} /> Livraison vers {shipTo}{" "}
              <ChevronDown size={13} strokeWidth={2} />
            </button>
            {isShipMenuOpen && (
              <div
                className="absolute top-full left-0 mt-2 w-44 rounded-xl overflow-hidden animate-scale-in origin-top-left"
                style={{
                  background: "var(--color-surface)",
                  boxShadow: "var(--shadow-lg)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {SHIP_LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      onShipToChange(loc);
                      setIsShipMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-3"
                    style={{
                      color:
                        loc === shipTo
                          ? "var(--color-accent)"
                          : "var(--color-ink2)",
                    }}
                  >
                    {loc}{" "}
                    {loc === shipTo && (
                      <span
                        className="text-[10px] font-bold font-mono-num"
                        style={{ color: "var(--color-ink4)" }}
                      >
                        {currency.code}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <Truck size={13} /> Livraison rapide
            </span>
            <span className="flex items-center gap-1.5">
              <RotateCcw size={13} /> Retours sous 30 jours
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} /> Paiement sécurisé
            </span>
          </div>
        </div>
      </div>

      <header
        className="sticky top-0 z-40 transition-shadow duration-300"
        style={{
          background: "var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: isScrolled ? "var(--shadow-md)" : "none",
        }}
      >
        <div className="max-w-350 mx-auto px-4 sm:px-6 h-16 md:h-(--header-h) flex items-center gap-3 sm:gap-6">
          <button
            className="flex lg:hidden! btn-icon shrink-0"
            aria-label="Ouvrir le menu"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={19} />
          </button>
          <button
            onClick={() =>
              handleNavClick({
                label: "Accueil",
                section: "catalog",
                eventType: null,
                category: null,
              })
            }
            className="flex items-center gap-2 shrink-0"
            aria-label="InstaWear — accueil"
          >
            <span
              className="w-9 h-9 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ background: "var(--color-accent)" }}
            >
              <img
                src="/InstaWear-logo.png"
                alt="InstaWear"
                className="w-full h-full object-cover"
              />
            </span>
            <span
              className="hidden sm:block text-lg font-extrabold tracking-tight"
              style={{ color: "var(--color-ink)" }}
            >
              Insta<span style={{ color: "var(--color-accent)" }}>Wear</span>
            </span>
          </button>
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {MAIN_NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className="px-3.5 py-2 rounded-full text-sm font-semibold transition-colors hover:text-(--color-ink) hover:bg-(--color-surface2)"
                style={{ color: "var(--color-ink2)" }}
              >
                {link.label}
              </button>
            ))}
          </nav>
          <div className="hidden md:block relative flex-1 max-w-md ml-auto">
            <form
              onSubmit={handleSubmitSearch}
              className={`flex items-center rounded-full px-4 h-11 transition-all duration-200 ${!isSearchFocused ? "search-rainbow" : ""}`}
              style={{
                background: isSearchFocused
                  ? "var(--color-surface)"
                  : "var(--color-surface2)",
                border: `1.5px solid ${isSearchFocused ? "var(--color-accent)" : "var(--color-border)"}`,
              }}
            >
              <Search size={17} style={{ color: "var(--color-ink3)" }} />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsDesktopSuggestOpen(true);
                }}
                onFocus={() => {
                  setIsSearchFocused(true);
                  setIsDesktopSuggestOpen(true);
                }}
                onBlur={() => {
                  setIsSearchFocused(false);
                  setTimeout(() => setIsDesktopSuggestOpen(false), 120);
                }}
                type="search"
                placeholder="Rechercher un article, un événement…"
                className="flex-1 bg-transparent outline-none px-3 text-sm"
                style={{ color: "var(--color-ink)", outline: "none" }}
              />
            </form>
            {isDesktopSuggestOpen && query.trim().length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden animate-scale-in origin-top z-50 max-h-96 overflow-y-auto"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {suggestions.categories.length === 0 &&
                suggestions.products.length === 0 ? (
                  <p
                    className="px-4 py-4 text-sm text-center"
                    style={{ color: "var(--color-ink3)" }}
                  >
                    Aucun résultat
                  </p>
                ) : (
                  <SuggestionsList
                    categories={suggestions.categories}
                    products={suggestions.products}
                    onPickCategory={handlePickCategorySuggestion}
                    onPickProduct={handlePickProductSuggestion}
                  />
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto md:ml-0">
            <button
              className="flex lg:hidden! btn-icon shrink-0"
              aria-label="Rechercher"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search size={18} />
            </button>
            <button
              className="btn-icon"
              aria-label="Changer de thème"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="btn-icon"
              aria-label="Favoris"
              onClick={onOpenFavorites}
            >
              <Heart size={18} />
              {favoriteCount > 0 && (
                <span className="icon-count">{favoriteCount}</span>
              )}
            </button>
            <button
              className="btn-icon"
              aria-label="Panier"
              onClick={onOpenCart}
            >
              <ShoppingBag size={18} />
              {totalQty > 0 && <span className="icon-count">{totalQty}</span>}
            </button>
            <button
              className="hidden sm:flex items-center gap-2 pl-2 pr-3.5 h-11 rounded-full transition-colors hover:border-(--color-ink)"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-ink)",
              }}
              onClick={handleAccountClick}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: "var(--color-accent-bg)",
                  color: "var(--color-accent)",
                }}
              >
                <User size={15} />
              </span>
              <span className="text-sm font-semibold max-w-26 truncate">
                {isUserLoggedIn
                  ? "Compte"
                  : isAdminLoggedIn
                    ? "Admin"
                    : "Connexion"}
              </span>
            </button>
          </div>
        </div>
        {isHomePage && (
          <div
            className="overflow-hidden"
            style={{
              borderTop: isQuickNavVisible
                ? "1px solid var(--color-border)"
                : "1px solid transparent",
              maxHeight: isQuickNavVisible ? "3.25rem" : "0px",
              opacity: isQuickNavVisible ? 1 : 0,
              transition:
                "max-height .35s var(--ease-smooth), opacity .25s var(--ease-smooth), border-color .35s var(--ease-smooth)",
            }}
          >
            <div className="max-w-350 mx-auto px-4 sm:px-6 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 py-2.5 min-w-max">
                {CATEGORY_LINKS.map((link) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.label}
                      onClick={() => handleNavClick(link)}
                      className="chip"
                    >
                      <Icon size={15} />
                      {link.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      {isSearchOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden animate-fade-in flex flex-col"
          style={{ background: "var(--color-bg)" }}
        >
          <div
            className="flex items-center gap-3 px-4 h-16 shrink-0"
            style={{ borderBottom: "1px solid var(--color-border)" }}
          >
            <form
              onSubmit={handleSubmitSearch}
              className={`flex-1 flex items-center rounded-full px-4 h-11 transition-all duration-200`}
              style={{
                background: isSearchFocused
                  ? "var(--color-surface)"
                  : "var(--color-surface2)",
                border: `1.5px solid ${isSearchFocused ? "var(--color-accent)" : "var(--color-border)"}`,
              }}
            >
              <Search size={17} style={{ color: "var(--color-ink3)" }} />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                type="search"
                placeholder="Rechercher un article, un événement…"
                className="flex-1 bg-transparent outline-none px-3 text-sm [&::-webkit-search-cancel-button]:hidden"
                style={{
                  color: "var(--color-ink)",
                  outline: "none",
                }}
              />
            </form>
            <button
              className="btn-icon shrink-0"
              aria-label="Fermer la recherche"
              onClick={() => {
                setIsSearchOpen(false);
                setIsSearchFocused(false);
              }}
            >
              <X size={20} style={{ color: "var(--color-ink2)" }} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {query.trim().length > 0 && (
              <SuggestionsList
                categories={suggestions.categories}
                products={suggestions.products}
                onPickCategory={handlePickCategorySuggestion}
                onPickProduct={handlePickProductSuggestion}
              />
            )}
          </div>
        </div>
      )}

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in"
            style={{ background: "rgba(15,13,10,.5)" }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="absolute top-0 left-0 h-full w-[84%] max-w-sm flex flex-col animate-slide-right"
            style={{
              background: "var(--color-bg)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            <div
              className="flex items-center justify-between px-5 h-16"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <span style={{ color: "var(--color-ink)" }}>
                Insta<span style={{ color: "var(--color-accent)" }}>Wear</span>
              </span>
              <button
                aria-label="Fermer le menu"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={22} style={{ color: "var(--color-ink2)" }} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-1">
              {MAIN_NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link)}
                  className="text-left py-3 text-base font-semibold border-b"
                  style={{
                    color: "var(--color-ink)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  {link.label}
                </button>
              ))}
              <div className="pt-5">
                <span className="eyebrow">Événements</span>
                <div className="flex flex-wrap gap-2 mt-3">
                  {CATEGORY_LINKS.map((link) => {
                    const Icon = link.icon;
                    return (
                      <button
                        key={link.label}
                        onClick={() => handleNavClick(link)}
                        className="chip"
                      >
                        <Icon size={14} /> {link.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <button
                onClick={handleAccountClick}
                className="btn btn-secondary flex-1"
              >
                <User size={16} />{" "}
                {isUserLoggedIn
                  ? "Mon compte"
                  : isAdminLoggedIn
                    ? "Admin"
                    : "Connexion"}
              </button>
              <button
                className="btn-icon"
                aria-label="Changer de thème"
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
