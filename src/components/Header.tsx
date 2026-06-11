import React, { useState, useEffect, useRef } from "react";
import { ShoppingCart, Search, Heart, X, Menu, Zap, User } from "lucide-react";
import { CartItem } from "../types";
import { NavLink } from "../types";

const LOGO_URL =
  "https://static.vecteezy.com/system/resources/previews/007/434/967/non_2x/clothing-store-icon-style-vector.jpg";

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
  // onScrollToSection: (section: string) => void;
  onScrollToSection: (
    section: "catalog" | "about" | "testimonials" | "faq" | "contact",
  ) => void;
}

const NAV_LINKS: NavLink[] = [
  { label: "Collections", section: "catalog", eventType: null, category: null },
  { label: "Sport", section: "catalog", eventType: "sport", category: null },
  {
    label: "Festivals",
    section: "catalog",
    eventType: "culture",
    category: null,
  },
  {
    label: "Saisons",
    section: "catalog",
    eventType: "saisonnier",
    category: null,
  },
  { label: "À propos", section: "about", eventType: null, category: null },
  { label: "FAQ", section: "faq", eventType: null, category: null },
];

const CATEGORY_PILLS = [
  { label: "Tout", eventType: null, category: null },
  { label: "⚡ Live", eventType: "live", category: null },
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
}: HeaderProps) {
  const [searchVal, setSearchVal] = useState(currentSearchTerm);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const totalQty = cart.reduce((a, b) => a + b.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
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

  const handleNavLink = (link: NavLink) => {
    if (link.eventType !== undefined) onSelectEventType(link.eventType);
    if (link.category !== undefined) onSelectCategory(link.category);
    onScrollToSection(link.section);
    setMobileOpen(false);
  };

  const handlePill = (pill: any) => {
    onSelectCategory(pill.category ?? null);
    onSelectEventType(pill.eventType ?? null);
    onScrollToSection("catalog");
  };

  const isPillActive = (pill: any) => {
    if (pill.category) return currentCategory === pill.category;
    if (pill.eventType) return currentEventType === pill.eventType;
    return currentEventType === null && currentCategory === null;
  };

  return (
    <>
      {/* Promo bar */}
      <div
        style={{
          background: "var(--color-accent)",
          color: "#fff",
          padding: "8px 16px",
          textAlign: "center",
          fontSize: "12px",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Zap size={11} strokeWidth={2.5} />
          Livraison gratuite dès 35 € — Impression sous 24h, zéro gaspillage
          <Zap size={11} strokeWidth={2.5} />
        </span>
      </div>

      {/* Main header */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: "var(--z-sticky)",
          background: scrolled ? "rgba(250,248,245,0.94)" : "var(--color-bg)",
          backdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(160%)" : "none",
          borderBottom: `1px solid ${scrolled ? "var(--color-border)" : "transparent"}`,
          boxShadow: scrolled ? "var(--shadow-sm)" : "none",
          transition: "all 0.3s var(--ease-smooth)",
        }}
      >
        <div
          className="section-container"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            paddingTop: 14,
            paddingBottom: 14,
          }}
        >
          {/* Logo */}
          <button
            onClick={() => {
              onSelectCategory(null);
              onSelectEventType(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexShrink: 0,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
            aria-label="InstaWear — Accueil"
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                overflow: "hidden",
                border: "1.5px solid var(--color-border2)",
                boxShadow: "var(--shadow-sm)",
                flexShrink: 0,
              }}
            >
              <img
                src={LOGO_URL}
                alt="InstaWear logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontWeight: 800,
                fontSize: 20,
                letterSpacing: "-0.04em",
                color: "var(--color-ink)",
                display: "none",
              }}
              className="sm-show"
            >
              Insta<span style={{ color: "var(--color-accent)" }}>Wear</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              marginLeft: 12,
            }}
            className="desktop-nav"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavLink(link)}
                style={{
                  padding: "7px 14px",
                  borderRadius: "var(--radius-pill)",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-ink2)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 500,
                  fontSize: 13.5,
                  cursor: "pointer",
                  transition: "background 0.18s, color 0.18s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--color-surface2)";
                  e.currentTarget.style.color = "var(--color-ink)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--color-ink2)";
                }}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Search */}
          <form
            onSubmit={handleSubmit}
            style={{ flex: 1, maxWidth: 400, marginInline: "auto" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "9px 14px",
                borderRadius: "var(--radius-pill)",
                background: searchFocused
                  ? "var(--color-surface)"
                  : "var(--color-surface2)",
                border: `1.5px solid ${searchFocused ? "var(--color-accent)" : "var(--color-border)"}`,
                boxShadow: searchFocused
                  ? "0 0 0 3px var(--color-accent-soft)"
                  : "none",
                transition: "all 0.2s",
              }}
            >
              <Search
                size={14}
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
                placeholder="Rechercher un design..."
                style={{
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontFamily: "var(--font-body)",
                  fontSize: 13.5,
                  color: "var(--color-ink)",
                }}
              />
              {searchVal && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchVal("");
                    onSearch("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--color-ink4)",
                    padding: 2,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={12} strokeWidth={2} />
                </button>
              )}
            </div>
          </form>

          {/* Actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            {/* Favorites */}
            <button
              onClick={onOpenFavorites}
              style={{
                position: "relative",
                padding: 9,
                borderRadius: "var(--radius-md)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink2)",
                display: "flex",
                alignItems: "center",
                transition: "background 0.18s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-surface2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
              aria-label={`Favoris — ${favoriteCount}`}
            >
              <Heart size={19} strokeWidth={1.8} />
              {favoriteCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--color-accent)",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {favoriteCount}
                </span>
              )}
            </button>

            {/* Admin */}
            <button
              onClick={onOpenAdmin}
              className="desktop-only"
              style={{
                padding: 9,
                borderRadius: "var(--radius-md)",
                background: isAdminActive
                  ? "var(--color-accent-soft)"
                  : "transparent",
                border: "none",
                cursor: "pointer",
                color: isAdminActive
                  ? "var(--color-accent)"
                  : "var(--color-ink2)",
                display: "flex",
                alignItems: "center",
                transition: "background 0.18s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-surface2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = isAdminActive
                  ? "var(--color-accent-soft)"
                  : "transparent")
              }
              aria-label="Admin"
              title={isAdminActive ? "Voir le store" : "Admin Studio"}
            >
              <User size={19} strokeWidth={1.8} />
            </button>

            {/* Cart */}
            <button
              onClick={onOpenCart}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 18px",
                borderRadius: "var(--radius-pill)",
                background: "var(--color-accent)",
                border: "none",
                color: "#fff",
                fontFamily: "var(--font-body)",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: "var(--shadow-accent)",
                transition:
                  "transform 0.25s var(--ease-spring), box-shadow 0.25s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-accent-lg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-accent)";
              }}
              aria-label={`Panier — ${totalQty} article(s)`}
            >
              <ShoppingCart size={16} strokeWidth={2} />
              <span className="cart-label">Panier</span>
              {totalQty > 0 && (
                <span
                  style={{
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "var(--radius-pill)",
                    padding: "1px 7px",
                    fontSize: 11,
                    fontWeight: 800,
                    minWidth: 22,
                    textAlign: "center",
                  }}
                >
                  {totalQty}
                </span>
              )}
            </button>

            {/* Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="hamburger-btn"
              style={{
                padding: 9,
                borderRadius: "var(--radius-md)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink2)",
                display: "none",
                alignItems: "center",
              }}
              aria-label="Menu"
            >
              {mobileOpen ? (
                <X size={20} strokeWidth={2} />
              ) : (
                <Menu size={20} strokeWidth={2} />
              )}
            </button>
          </div>
        </div>

        {/* Category pills sub-nav */}
        <div
          style={{
            borderTop: "1px solid var(--color-border)",
          }}
        >
          <div
            className="section-container scrollbar-none"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingTop: 8,
              paddingBottom: 8,
              overflowX: "auto",
            }}
          >
            {CATEGORY_PILLS.map((pill: any, i) => {
              if (pill.divider) {
                return (
                  <span
                    key={i}
                    style={{
                      color: "var(--color-border2)",
                      flexShrink: 0,
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    |
                  </span>
                );
              }
              const active = isPillActive(pill);
              return (
                <button
                  key={i}
                  onClick={() => handlePill(pill)}
                  style={{
                    flexShrink: 0,
                    padding: "5px 14px",
                    borderRadius: "var(--radius-pill)",
                    border: `1.5px solid ${active ? "var(--color-accent)" : "transparent"}`,
                    background: active ? "var(--color-accent)" : "transparent",
                    color: active ? "#fff" : "var(--color-ink3)",
                    fontFamily: "var(--font-body)",
                    fontWeight: active ? 700 : 500,
                    fontSize: 12.5,
                    cursor: "pointer",
                    transition: "all 0.18s var(--ease-smooth)",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background =
                        "var(--color-surface2)";
                      e.currentTarget.style.color = "var(--color-ink2)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--color-ink3)";
                    }
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: "var(--z-modal)",
            background: "rgba(26,20,10,0.5)",
            backdropFilter: "blur(4px)",
          }}
          className="animate-fade-in"
          onClick={() => setMobileOpen(false)}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              background: "var(--color-surface)",
              borderBottom: "1px solid var(--color-border)",
              padding: "20px 24px",
            }}
            className="animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  color: "var(--color-ink)",
                  letterSpacing: "-0.03em",
                }}
              >
                Menu
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink2)",
                }}
              >
                <X size={22} strokeWidth={2} />
              </button>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {NAV_LINKS.map((link, i) => (
                <button
                  key={link.label}
                  onClick={() => handleNavLink(link)}
                  className={`animate-fade-up delay-${(i + 1) * 100 > 500 ? 500 : (i + 1) * 100}`}
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    background: "transparent",
                    color: "var(--color-ink)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: 16,
                    cursor: "pointer",
                    transition: "background 0.18s",
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
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid var(--color-border)",
                  margin: "8px 0",
                }}
              />
              <button
                onClick={() => {
                  onOpenAdmin();
                  setMobileOpen(false);
                }}
                style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "transparent",
                  color: "var(--color-ink)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                {isAdminActive ? "← Retour au Store" : "⚙ Admin Studio"}
              </button>
            </nav>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 640px) {
          .sm-show { display: inline !important; }
        }
        @media (min-width: 1024px) {
          .desktop-nav { display: flex !important; }
          .hamburger-btn { display: none !important; }
          .desktop-only { display: flex !important; }
          .cart-label { display: inline !important; }
        }
        @media (max-width: 1023px) {
          .desktop-nav { display: none !important; }
          .hamburger-btn { display: flex !important; }
          .desktop-only { display: none !important; }
        }
        @media (max-width: 639px) {
          .cart-label { display: none !important; }
        }
      `}</style>
    </>
  );
}
