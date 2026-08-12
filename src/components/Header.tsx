// src/components/Header.tsx

import React, { useEffect, useState } from "react";
import {
  Search,
  Heart,
  User,
  ShoppingBag,
  Menu,
  X,
  Sun,
  Moon,
  Package,
  PartyPopper,
  Trophy,
  Music,
  Snowflake,
  Gift,
  Sparkles,
  LogOut,
} from "lucide-react";
import type { CartItem, Product, NavLink } from "../types";

interface HeaderProps {
  cart: CartItem[];
  favoriteCount: number;
  onOpenCart: () => void;
  onOpenFavorites: () => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
  isAdmin?: boolean;
  onLogout?: () => void;
  onOpenAccount: () => void;
  onSearch: (term: string) => void;
  currentSearchTerm: string;
  onSelectCategory: (cat: string | null) => void;
  onSelectEventType?: (type: string | null) => void;
  currentCategory: string | null;
  currentEventType?: string | null;
  onScrollToSection: (section: NavLink["section"]) => void;
  onOpenTracking: () => void;
  products: Product[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  detectedCountry?: string | null;
}

const NAV_LINKS: NavLink[] = [
  { label: "Collection", section: "catalog", eventType: null, category: null },
  { label: "About", section: "about", eventType: null, category: null },
  { label: "FAQ", section: "faq", eventType: null, category: null },
  { label: "Contact", section: "contact", eventType: null, category: null },
];

const EVENT_BUTTONS = [
  { label: "Festivals", icon: PartyPopper },
  { label: "Sport", icon: Trophy },
  { label: "Concerts", icon: Music },
  { label: "Saisonnier", icon: Snowflake },
  { label: "Anniversaires", icon: Gift },
  { label: "Nouveautés", icon: Sparkles },
];

const PILLS = [
  { label: "All", category: null },
  { label: "Sport", category: "tshirt" },
  { label: "Hoodies", category: "hoodie" },
  { label: "Accessories", category: "accessory" },
];

export default function Header({
  cart,
  favoriteCount,
  onOpenCart,
  onOpenFavorites,
  onOpenAuth,
  isLoggedIn,
  isAdmin = false,
  onLogout,
  onOpenAccount,
  onSearch,
  currentSearchTerm,
  onSelectCategory,
  currentCategory,
  onScrollToSection,
  onOpenTracking,
  darkMode,
  onToggleDarkMode,
  detectedCountry,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [val, setVal] = useState(currentSearchTerm);
  const totalQty = cart.reduce((a, b) => a + b.quantity, 0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className="sticky top-0 z-40 transition-all duration-300"
        style={{
          background: scrolled ? "var(--color-bg)" : "transparent",
          borderBottom: `1px solid ${scrolled ? "var(--color-border)" : "transparent"}`,
          boxShadow: scrolled ? "var(--shadow-sm)" : "none",
        }}
      >
        {/* ── Ligne principale ── */}
        <div className="section-container flex items-center justify-between gap-4 py-4">
          {/* Logo + drapeau */}
          <button
            onClick={() => onScrollToSection("catalog")}
            className="flex items-center gap-2 shrink-0 group"
            aria-label="InstaWear — Accueil"
          >
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base text-gray-900 transition-transform duration-200 group-hover:scale-105 relative overflow-hidden"
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
                    (el.nextElementSibling as HTMLElement).style.display =
                      "flex";
                  }}
                />
                <span className="hidden absolute inset-0 items-center justify-center text-white">
                  I
                </span>
              </div>
              <img
                src={`/flags/${(detectedCountry || "us").toLowerCase()}.svg`}
                alt={detectedCountry || "US"}
                className="absolute -top-0.5 -right-0.5 w-4 h-3 rounded-sm object-cover border border-white"
                style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                title={`Shipping to ${detectedCountry || "US"}`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <span
              className="font-display font-black text-xl hidden sm:block"
              style={{ color: "var(--color-ink)" }}
            >
              Insta<span style={{ color: "var(--color-accent)" }}>Wear</span>
            </span>
          </button>

          {/* Nav desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => onScrollToSection(link.section)}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-150"
                style={{ color: "var(--color-ink2)" }}
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
            <button
              onClick={onOpenTracking}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-150"
              style={{ color: "var(--color-ink2)" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "var(--color-surface2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
              }
            >
              <Package size={16} strokeWidth={1.8} />
              My Order
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={() => setSearchOpen((s) => !s)}
              className={`btn-icon relative ${searchOpen ? "active" : ""}`}
              aria-label="Search"
            >
              <Search size={19} strokeWidth={1.8} />
            </button>

            <button
              onClick={onToggleDarkMode}
              className="btn-icon relative"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun size={18} strokeWidth={1.8} />
              ) : (
                <Moon size={18} strokeWidth={1.8} />
              )}
            </button>

            <button
              onClick={onOpenFavorites}
              className="btn-icon relative hidden sm:flex"
              aria-label="Favorites"
            >
              <Heart size={19} strokeWidth={1.8} />
              {favoriteCount > 0 && (
                <span className="icon-count">{favoriteCount}</span>
              )}
            </button>

            <button
              onClick={isLoggedIn ? onOpenAccount : onOpenAuth}
              className={`btn-icon relative hidden sm:flex ${isLoggedIn ? "active" : ""}`}
              aria-label="Account"
            >
              <User size={19} strokeWidth={1.8} />
            </button>

            <button
              onClick={onOpenCart}
              className="btn-icon relative"
              style={{
                background: "var(--color-cta-bg)",
                color: "var(--color-cta-ink)",
                borderColor: "var(--color-cta-bg)",
              }}
              aria-label={`Cart — ${totalQty} item(s)`}
            >
              <ShoppingBag size={18} strokeWidth={2} />
              <span className="icon-count">{totalQty}</span>
            </button>

            <button
              onClick={() => setMobileOpen(true)}
              className="btn-icon relative lg:hidden"
              aria-label="Menu"
            >
              <Menu size={20} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* ── Barre de recherche ── */}
        {searchOpen && (
          <div
            className="border-t animate-fade-up"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-bg)",
            }}
          >
            <div className="section-container py-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSearch(val);
                  setSearchOpen(false);
                }}
                className="flex items-center gap-3 px-5 py-3 rounded-xl"
                style={{
                  background: "var(--color-surface2)",
                  border: "1.5px solid var(--color-border2)",
                }}
              >
                <Search size={18} style={{ color: "var(--color-ink4)" }} />
                <input
                  autoFocus
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  placeholder="Search hoodies, tees, accessories…"
                  className="flex-1 bg-transparent outline-none border-none text-sm"
                  style={{ color: "var(--color-ink)" }}
                />
                {val && (
                  <button
                    type="button"
                    onClick={() => {
                      setVal("");
                      onSearch("");
                    }}
                    style={{ color: "var(--color-ink4)" }}
                  >
                    <X size={16} />
                  </button>
                )}
              </form>
            </div>
          </div>
        )}

        {/* ── Pills catégories ── */}
        <div
          className="border-t"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="section-container flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-none">
            {PILLS.map((p) => {
              const active = currentCategory === p.category;
              return (
                <button
                  key={p.label}
                  onClick={() => onSelectCategory(p.category)}
                  className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-150"
                  style={{
                    background: active ? "var(--color-cta-bg)" : "transparent",
                    color: active
                      ? "var(--color-cta-ink)"
                      : "var(--color-ink3)",
                    border: `1.5px solid ${active ? "var(--color-cta-bg)" : "var(--color-border)"}`,
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Barre événements desktop (style Beta) ── */}
        <div
          className="hidden lg:block"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div className="section-container overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 py-2.5">
              {EVENT_BUTTONS.map(({ label, icon: Icon }) => (
                <button key={label} className="chip">
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── Menu mobile (glissière gauche style Beta) ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in"
            style={{ background: "rgba(15,13,10,.5)" }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute top-0 right-0 h-full w-[84%] max-w-sm flex flex-col animate-drawer-right"
            style={{
              background: "var(--color-surface)",
              boxShadow: "var(--shadow-xl)",
            }}
          >
            {/* Entête du drawer */}
            <div
              className="flex items-center justify-between h-16 shrink-0"
              style={{
                borderBottom: "1px solid var(--color-border)",
                paddingLeft: "clamp(20px, 5vw, 64px)",
                paddingRight: "clamp(20px, 5vw, 64px)",
                paddingTop: "6px",
              }}
            >
              <button
                onClick={() => {
                  onScrollToSection("catalog");
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm text-white relative overflow-hidden"
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
                      (el.nextElementSibling as HTMLElement).style.display =
                        "flex";
                    }}
                  />
                  <span className="hidden absolute inset-0 items-center justify-center text-white">
                    I
                  </span>
                </div>
                <span
                  className="font-display font-black text-lg"
                  style={{ color: "var(--color-ink)" }}
                >
                  Insta
                  <span style={{ color: "var(--color-accent)" }}>Wear</span>
                </span>
              </button>
              <button
                onClick={() => setMobileOpen(false)}
                className="btn-icon relative"
                aria-label="Fermer le menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation principale */}
            <nav className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => {
                    onScrollToSection(link.section);
                    setMobileOpen(false);
                  }}
                  className="text-left py-3 text-base font-semibold border-b"
                  style={{
                    color: "var(--color-ink)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  {link.label}
                </button>
              ))}

              <button
                onClick={() => {
                  onOpenTracking();
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2.5 text-left py-3 text-base font-semibold border-b"
                style={{
                  color: "var(--color-ink)",
                  borderColor: "var(--color-border)",
                }}
              >
                <Package size={19} strokeWidth={1.8} />
                My Order
              </button>

              {/* Section Événements */}
              <div className="pt-5">
                <span
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--color-ink3)" }}
                >
                  Événements
                </span>
                <div className="flex flex-wrap gap-2 mt-3">
                  {EVENT_BUTTONS.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      className="chip"
                      onClick={() => {
                        // Action à définir plus tard
                      }}
                    >
                      <Icon size={14} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </nav>

            {/* Pied du drawer */}
            <div
              className="px-5 py-4 flex items-center gap-3 shrink-0"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              {isAdmin ? (
                <button
                  onClick={() => {
                    onLogout?.();
                    setMobileOpen(false);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  <LogOut size={16} /> Sign out
                </button>
              ) : isLoggedIn ? (
                <button
                  onClick={() => {
                    onOpenAccount();
                    setMobileOpen(false);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  <User size={16} /> My account
                </button>
              ) : (
                <button
                  onClick={() => {
                    onOpenAuth();
                    setMobileOpen(false);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  <User size={16} /> Sign in / Sign up
                </button>
              )}

              <button
                onClick={onToggleDarkMode}
                className="btn-icon relative"
                aria-label="Changer de thème"
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
