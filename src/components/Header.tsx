import React, { useState, useEffect, useRef } from "react";
import {
  ShoppingCart,
  Search,
  Heart,
  User,
  X,
  Menu,
  ChevronDown,
  Zap,
} from "lucide-react";
import { CartItem } from "../types";

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
    section: "catalog" | "about" | "testimonials" | "faq" | "contact",
  ) => void;
}

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
}: HeaderProps) {
  const [searchVal, setSearchVal] = useState(currentSearchTerm);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
    inputRef.current?.blur();
  };

  const navLinks = [
    {
      label: "Collections",
      action: () => {
        onSelectCategory(null);
        onSelectEventType(null);
        onScrollToSection("catalog");
      },
    },
    {
      label: "Sport",
      action: () => {
        onSelectEventType("sport");
        onScrollToSection("catalog");
      },
    },
    {
      label: "Festivals",
      action: () => {
        onSelectEventType("culture");
        onScrollToSection("catalog");
      },
    },
    {
      label: "Saisons",
      action: () => {
        onSelectEventType("saisonnier");
        onScrollToSection("catalog");
      },
    },
    { label: "À propos", action: () => onScrollToSection("about") },
    { label: "FAQ", action: () => onScrollToSection("faq") },
  ];

  return (
    <>
      {/* Promo bar */}
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

      {/* Main header */}
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
          {/* Logo */}
          <button
            onClick={() => {
              onSelectCategory(null);
              onSelectEventType(null);
            }}
            className="flex items-center gap-2 shrink-0 group"
            aria-label="InstaWear — Accueil"
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg text-gray-900 transition-transform duration-200 group-hover:scale-105"
              style={{
                background: "var(--color-accent)",
                boxShadow: "var(--shadow-accent)",
              }}
            >
              I
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

          {/* Nav links — desktop */}
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={link.action}
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

          {/* Search — center */}
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
              <Search
                size={15}
                strokeWidth={2}
                style={{ color: "var(--color-ink4)", flexShrink: 0 }}
              />
              <input
                ref={inputRef}
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Rechercher un événement, un design..."
                className="flex-1 bg-transparent border-none outline-none text-sm"
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

          {/* Actions */}
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
              className="relative flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-gray-900 transition-all duration-200"
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

        {/* Category pills sub-nav */}
        <div
          className="border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {[
              { label: "Tout voir", eventType: null, category: null },
              { label: "⚡ Live 2026", eventType: "live", category: null },
              { label: "🏆 Sport", eventType: "sport", category: null },
              { label: "🎉 Festivals", eventType: "culture", category: null },
              { label: "🍂 Saisons", eventType: "saisonnier", category: null },
              { label: "—", divider: true },
              { label: "T-Shirts", eventType: null, category: "tshirt" },
              { label: "Hoodies", eventType: null, category: "hoodie" },
              { label: "Accessoires", eventType: null, category: "accessory" },
              { label: "Mugs", eventType: null, category: "mug" },
            ].map((item, i) => {
              if ((item as any).divider) {
                return (
                  <span key={i} className="text-gray-300 shrink-0">
                    |
                  </span>
                );
              }
              const isActive = item.category
                ? currentCategory === item.category
                : item.eventType === null
                  ? currentEventType === null && currentCategory === null
                  : currentEventType === item.eventType;
              return (
                <button
                  key={i}
                  onClick={() => {
                    onSelectCategory(item.category ?? null);
                    onSelectEventType(item.eventType ?? null);
                    onScrollToSection("catalog");
                  }}
                  className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150"
                  style={{
                    background: isActive
                      ? "var(--color-accent)"
                      : "transparent",
                    color: isActive ? "white" : "var(--color-ink3)",
                    border: `1.5px solid ${isActive ? "var(--color-accent)" : "transparent"}`,
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background =
                        "var(--color-surface2)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden animate-fade-in"
          style={{
            background: "rgba(26,25,22,.5)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-0 left-0 right-0 animate-fade-up p-6 pt-4"
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
              {navLinks.map((link, i) => (
                <button
                  key={link.label}
                  onClick={() => {
                    link.action();
                    setMobileMenuOpen(false);
                  }}
                  className="text-left px-4 py-3 rounded-xl font-semibold text-base animate-fade-up"
                  style={{
                    color: "var(--color-ink)",
                    animationDelay: `${i * 0.05}s`,
                    fontFamily: "var(--font-sans)",
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
    </>
  );
}
