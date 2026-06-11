// src\components\Header.tsx

import React, { useState, useEffect, useRef } from "react";
import { ShoppingCart, Search, Heart, User, X, Menu, Zap } from "lucide-react";
import { CartItem, NavLink } from "../types";

interface HeaderProps {
  cart: CartItem[];
  favoriteCount: number;
  onOpenCart: () => void;
  onOpenFavorites: () => void;
  onSearch: (term: string) => void;
  currentSearchTerm: string;
  onSelectCategory: (cat: string | null) => void;
  onSelectEventType: (type: string | null) => void;
  currentEventType: string | null;
  currentCategory: string | null;
  onOpenAdmin: () => void;
  isAdminActive: boolean;
  onScrollToSection: (
    section:
      | "catalog"
      | "about"
      | "testimonials"
      | "faq"
      | "contact"
      | "filters",
  ) => void;
  searchSuggestions?: string[];
}

// Définition structurée de la navigation (logique v3)
const NAV_LINKS: NavLink[] = [
  { label: "Collections", section: "catalog", eventType: null, category: null },
  // { label: "Sport", section: "catalog", eventType: "sport", category: null },
  // {
  //   label: "Festivals",
  //   section: "catalog",
  //   eventType: "culture",
  //   category: null,
  // },
  // {
  //   label: "Saisons",
  //   section: "catalog",
  //   eventType: "saisonnier",
  //   category: null,
  // },
  { label: "À propos", section: "about", eventType: null, category: null },
  { label: "FAQ", section: "faq", eventType: null, category: null },
];

const CATEGORY_PILLS = [
  { label: "Tout voir", eventType: null, category: null },
  { label: "⚡ Live 2026", eventType: "live", category: null },
  { label: "🏆 Sport", eventType: "sport", category: null },
  { label: "🎉 Festivals", eventType: "culture", category: null },
  { label: "🍂 Saisons", eventType: "saisonnier", category: null },
  { divider: true },
  { label: "T-Shirts", eventType: null, category: "tshirt" },
  { label: "Hoodies", eventType: null, category: "hoodie" },
  { label: "Accessoires", eventType: null, category: "accessory" },
  { label: "Mugs", eventType: null, category: "mug" },
];

export default function Header({
  cart,
  favoriteCount,
  onOpenCart,
  onOpenFavorites,
  onSearch,
  currentSearchTerm,
  onSelectCategory,
  onSelectEventType,
  currentEventType,
  currentCategory,
  onOpenAdmin,
  isAdminActive,
  onScrollToSection,
  searchSuggestions,
}: HeaderProps) {
  const [searchVal, setSearchVal] = useState(currentSearchTerm);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  // États pour l'animation de frappe
  const [currentSuggestion, setCurrentSuggestion] = useState("");
  const [typedText, setTypedText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const totalQty = cart.reduce((a, b) => a + b.quantity, 0);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setSearchVal(currentSearchTerm);
  }, [currentSearchTerm]);

  // Effet de frappe pour le placeholder
  useEffect(() => {
    const suggestionsList =
      searchSuggestions && searchSuggestions.length > 0
        ? searchSuggestions
        : ["T-shirt Ligue des Champions", "Hoodie Halloween 2026"];

    if (!currentSuggestion) {
      const randomSuggestion =
        suggestionsList[Math.floor(Math.random() * suggestionsList.length)];
      setCurrentSuggestion(randomSuggestion);
      return;
    }

    let timeout: NodeJS.Timeout;

    if (!isDeleting && charIndex < currentSuggestion.length) {
      timeout = setTimeout(
        () => {
          setTypedText(currentSuggestion.substring(0, charIndex + 1));
          setCharIndex(charIndex + 1);
        },
        60 + Math.random() * 40,
      );
    } else if (isDeleting && charIndex > 0) {
      timeout = setTimeout(() => {
        setTypedText(currentSuggestion.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      }, 30);
    } else {
      timeout = setTimeout(
        () => {
          if (!isDeleting) {
            setIsDeleting(true);
          } else {
            setIsDeleting(false);
            const newSuggestion =
              suggestionsList[
                Math.floor(Math.random() * suggestionsList.length)
              ];
            setCurrentSuggestion(newSuggestion);
            setCharIndex(0);
            setTypedText("");
          }
        },
        isDeleting ? 800 : 2000,
      );
    }

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, currentSuggestion, searchSuggestions]);

  // Logique de soumission de la recherche
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
    inputRef.current?.blur();
  };

  // Logique de navigation structurée (v3)
  const handleNavLink = (link: NavLink) => {
    // Ne mettre à jour les filtres que si le lien en porte explicitement
    if (link.eventType != null) onSelectEventType(link.eventType);
    if (link.category != null) onSelectCategory(link.category);
    // Scroll vers la section appropriée
    if (link.eventType || link.category) {
      onScrollToSection("filters");
    } else {
      onScrollToSection(link.section);
    }
    setMobileMenuOpen(false);
  };

  const handlePill = (pill: any) => {
    onSelectCategory(pill.category ?? null);
    onSelectEventType(pill.eventType ?? null);
    // Si un filtre est activé → scroll vers les filtres, sinon vers le catalogue
    if (pill.eventType || pill.category) {
      onScrollToSection("filters");
    } else {
      onScrollToSection("catalog");
    }
  };

  const isPillActive = (pill: any) => {
    if (pill.category) return currentCategory === pill.category;
    if (pill.eventType) return currentEventType === pill.eventType;
    return currentEventType === null && currentCategory === null;
  };

  return (
    <>
      {/* Promo bar (visuel v2) */}
      <div
        className="w-full py-2 px-4 text-center text-xs font-semibold"
        style={{
          background: "var(--color-accent)",
          color: "white",
          letterSpacing: "0.03em",
        }}
      >
        <span className="inline-flex items-center gap-2">
          <Zap size={12} strokeWidth={2.5} />
          Livraison gratuite dès 35 € — Impression sous 24h, zéro stock gaspillé
          <Zap size={12} strokeWidth={2.5} />
        </span>
      </div>

      {/* Main header (visuel v2) */}
      <header
        className="sticky top-0 z-30 w-full transition-all duration-300"
        style={{
          background: isScrolled ? "rgba(250,250,248,0.92)" : "var(--color-bg)",
          backdropFilter: isScrolled ? "blur(20px) saturate(160%)" : "none",
          WebkitBackdropFilter: isScrolled
            ? "blur(20px) saturate(160%)"
            : "none",
          borderBottom: `1px solid ${isScrolled ? "var(--color-border)" : "transparent"}`,
          boxShadow: isScrolled ? "var(--shadow-sm)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* Logo (visuel v2)  */}
          <button
            onClick={() => {
              onSelectCategory(null);
              onSelectEventType(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 shrink-0 group"
            aria-label="InstaWear — Accueil"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg text-gray-900 transition-transform duration-200 group-hover:scale-105 relative overflow-hidden"
              style={{
                background: "var(--color-accent)",
                boxShadow: "var(--shadow-accent)",
              }}
            >
              <img
                src="/InstaWear-logo.png"
                alt="InstaWear"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                  (el.nextElementSibling as HTMLElement).style.display = "flex";
                }}
              />
              <span className="hidden absolute inset-0 items-center justify-center">
                I
              </span>
            </div>
            <span
              className="font-black text-xl tracking-tight hidden sm:block"
              style={{
                color: "var(--color-ink)",
                fontFamily: "var(--font-sans)",
              }}
            >
              Insta<span style={{ color: "var(--color-accent)" }}>Wear</span>
            </span>
          </button>

          {/* Nav links — desktop (logique v3, visuel v2) */}
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavLink(link)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  color: "var(--color-ink2)",
                  background: "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--color-surface2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Search — center (visuel v2) */}
          <form onSubmit={handleSubmit} className="flex-1 max-w-md mx-auto">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200"
              style={{
                background: searchFocused
                  ? "var(--color-surface)"
                  : "var(--color-surface2)",
                border: `1.5px solid ${searchFocused ? "var(--color-accent)" : "var(--color-border)"}`,
                boxShadow: searchFocused
                  ? "0 0 0 3px rgba(255,92,53,.1)"
                  : "none",
              }}
            >
              {/* icône de recherche animée */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  color: "var(--color-ink4)",
                  flexShrink: 0,
                  overflow: "visible",
                }}
              >
                {/* Loupe */}
                <circle cx="10.5" cy="10.5" r="5.5" />
                <line x1="14.5" y1="14.5" x2="20" y2="20" />
                {/* Étoiles animées */}
                <g className="search-star search-star-1">
                  <path
                    d="M17.5 2L18.2 4.2L20.5 4.9L18.2 5.6L17.5 7.8L16.8 5.6L14.5 4.9L16.8 4.2Z"
                    fill="currentColor"
                    stroke="none"
                    transform="translate(-13, -1) scale(0.8)"
                  />
                </g>
                <g className="search-star search-star-2">
                  <path
                    d="M17.5 2L18.2 4.2L20.5 4.9L18.2 5.6L17.5 7.8L16.8 5.6L14.5 4.9L16.8 4.2Z"
                    fill="currentColor"
                    stroke="none"
                    transform="translate(-8, 14) scale(0.6)"
                  />
                </g>
                <g className="search-star search-star-3">
                  <path
                    d="M17.5 2L18.2 4.2L20.5 4.9L18.2 5.6L17.5 7.8L16.8 5.6L14.5 4.9L16.8 4.2Z"
                    fill="currentColor"
                    stroke="none"
                    transform="translate(2, -8) scale(0.7)"
                  />
                </g>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder={searchFocused || searchVal ? "" : typedText}
                className="flex-1 bg-transparent border-none outline-none text-sm transition-all duration-300"
                style={{
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-sans)",
                }}
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchVal("");
                    onSearch("");
                  }}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: "var(--color-ink4)" }}
                >
                  <X size={13} strokeWidth={2} />
                </button>
              )}
            </div>
          </form>

          {/* Actions (visuel v2) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Favorites */}
            <button
              onClick={onOpenFavorites}
              className="relative p-2 rounded-xl transition-all duration-150"
              style={{ color: "var(--color-ink2)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-surface2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              aria-label="Mes favoris"
            >
              <Heart size={20} strokeWidth={1.8} />
              {favoriteCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-gray-900 font-bold"
                  style={{ fontSize: "9px", background: "var(--color-accent)" }}
                >
                  {favoriteCount}
                </span>
              )}
            </button>

            {/* Admin */}
            <button
              onClick={onOpenAdmin}
              className="hidden md:flex p-2 rounded-xl transition-all duration-150"
              style={{
                color: isAdminActive
                  ? "var(--color-accent)"
                  : "var(--color-ink2)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-surface2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              aria-label="Admin Studio"
              title={isAdminActive ? "Voir le store" : "Admin Studio"}
            >
              <User size={20} strokeWidth={1.8} />
            </button>

            {/* Cart */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-all duration-200"
              style={{
                background: "var(--color-accent)",
                boxShadow: "var(--shadow-accent)",
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 40px rgba(255,92,53,.28)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-accent)";
              }}
              aria-label={`Panier — ${totalQty} article(s)`}
            >
              <ShoppingCart size={17} strokeWidth={2} />
              <span className="hidden sm:inline">Panier</span>
              {totalQty > 0 && (
                <span
                  className="flex items-center justify-center rounded-full font-black text-gray-900"
                  style={{
                    minWidth: 20,
                    height: 20,
                    padding: "0 5px",
                    fontSize: "11px",
                    background: "rgba(0,0,0,0.2)",
                  }}
                >
                  {totalQty}
                </span>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl transition-all duration-150"
              style={{ color: "var(--color-ink2)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-surface2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <X size={20} strokeWidth={2} />
              ) : (
                <Menu size={20} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        {/* Category pills sub-nav (visuel v2, logique v3) */}
        <div
          className="border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-start lg:justify-center gap-2 overflow-x-auto scrollbar-none">
            {CATEGORY_PILLS.map((pill: any, i) => {
              if (pill.divider) {
                return (
                  <span key={i} className="text-gray-300 shrink-0">
                    |
                  </span>
                );
              }
              const active = isPillActive(pill);
              return (
                <button
                  key={i}
                  onClick={() => handlePill(pill)}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
                  style={{
                    background: active ? "var(--color-accent)" : "transparent",
                    color: active ? "white" : "var(--color-ink3)",
                    border: `1.5px solid ${active ? "var(--color-accent)" : "transparent"}`,
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      e.currentTarget.style.background =
                        "var(--color-surface2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile menu overlay (visuel v2, logique v3) */}
        {mobileMenuOpen && (
          <div
            className="absolute top-full left-0 right-0 z-20 lg:hidden animate-fade-in"
            style={{
              background: "rgba(26,25,22,.5)",
              backdropFilter: "blur(4px)",
              height: "calc(100vh - 100%)",
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="animate-fade-up p-6 pt-4"
              style={{
                background: "var(--color-surface)",
                borderBottom: "1px solid var(--color-border)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <span
                  className="font-black text-lg"
                  style={{ color: "var(--color-ink)" }}
                >
                  Menu
                </span>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X size={22} style={{ color: "var(--color-ink2)" }} />
                </button>
              </div>
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link, i) => (
                  <button
                    key={link.label}
                    onClick={() => handleNavLink(link)}
                    className="text-left px-4 py-3 rounded-xl font-semibold text-base animate-fade-up"
                    style={{
                      color: "var(--color-ink)",
                      animationDelay: `${i * 0.05}s`,
                      fontFamily: "var(--font-sans)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--color-surface2)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    {link.label}
                  </button>
                ))}
                <div
                  className="h-px my-2"
                  style={{ background: "var(--color-border)" }}
                />
                <button
                  onClick={() => {
                    onOpenAdmin();
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-4 py-3 rounded-xl font-semibold text-base animate-fade-up delay-5"
                  style={{
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--color-surface2)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  {isAdminActive ? "← Voir le store" : "⚙️ Admin Studio"}
                </button>
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
