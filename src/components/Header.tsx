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
} from "lucide-react";
import { IconButton } from "./ui/Button";
import { CartItem, Product, NavLink } from "../types";

interface HeaderProps {
  cart: CartItem[];
  favoriteCount: number;
  onOpenCart: () => void;
  onOpenFavorites: () => void;
  onOpenAuth: () => void;
  isLoggedIn: boolean;
  onOpenAccount: () => void;
  onSearch: (term: string) => void;
  currentSearchTerm: string;
  onSelectCategory: (cat: string | null) => void;
  onSelectEventType: (type: string | null) => void;
  currentCategory: string | null;
  currentEventType: string | null;
  onScrollToSection: (section: NavLink["section"]) => void;
  onOpenTracking: () => void;
  products: Product[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  detectedCountry?: string | null; // 👈 nouveau
}

const NAV_LINKS: NavLink[] = [
  { label: "Home", section: "catalog", eventType: null, category: null },
  { label: "About", section: "about", eventType: null, category: null },
  { label: "Collection", section: "catalog", eventType: null, category: null },
  { label: "FAQ", section: "faq", eventType: null, category: null },
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
        <div className="section-container flex items-center justify-between gap-4 py-4">
          {/* Logo avec image + drapeau */}
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
              {/* Drapeau */}
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
            <IconButton
              onClick={() => setSearchOpen((s) => !s)}
              active={searchOpen}
              aria-label="Search"
            >
              <Search size={19} strokeWidth={1.8} />
            </IconButton>

            <IconButton onClick={onToggleDarkMode} aria-label="Toggle theme">
              {darkMode ? (
                <Sun size={18} strokeWidth={1.8} />
              ) : (
                <Moon size={18} strokeWidth={1.8} />
              )}
            </IconButton>

            <IconButton
              onClick={onOpenFavorites}
              aria-label="Favorites"
              className="hidden sm:flex"
            >
              <Heart size={19} strokeWidth={1.8} />
              {favoriteCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black text-white"
                  style={{ background: "var(--color-accent)" }}
                >
                  {favoriteCount}
                </span>
              )}
            </IconButton>

            <IconButton
              onClick={isLoggedIn ? onOpenAccount : onOpenAuth}
              aria-label="Account"
              className="hidden sm:flex"
            >
              <User size={19} strokeWidth={1.8} />
            </IconButton>

            <button
              onClick={onOpenCart}
              className="pill flex items-center gap-2 pl-3.5 pr-2 py-2 rounded-full font-bold text-xs uppercase tracking-wide transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "var(--color-cta-bg)",
                color: "var(--color-cta-ink)",
              }}
              aria-label={`Cart — ${totalQty} item(s)`}
            >
              <ShoppingBag size={16} strokeWidth={2} />
              <span
                className="w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                {totalQty}
              </span>
            </button>

            <IconButton
              onClick={() => setMobileOpen(true)}
              className="lg:hidden"
              aria-label="Menu"
            >
              <Menu size={20} strokeWidth={1.8} />
            </IconButton>
          </div>
        </div>

        {/* Search bar dropdown */}
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

        {/* Pills sub-nav */}
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
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in"
            style={{
              background: "rgba(11,11,10,.5)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute top-0 right-0 h-full w-[82%] max-w-sm p-6 flex flex-col gap-2 animate-slide-right"
            style={{ background: "var(--color-surface)" }}
          >
            <div className="flex items-center justify-between mb-6">
              <span
                className="font-display font-black text-lg"
                style={{ color: "var(--color-ink)" }}
              >
                Menu
              </span>
              <IconButton onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </IconButton>
            </div>
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  onScrollToSection(link.section);
                  setMobileOpen(false);
                }}
                className="text-left px-4 py-3.5 rounded-xl font-bold text-lg"
                style={{ color: "var(--color-ink)" }}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => {
                onOpenTracking();
                setMobileOpen(false);
              }}
              className="flex items-center gap-2.5 text-left px-4 py-3.5 rounded-xl font-bold text-lg"
              style={{ color: "var(--color-ink)" }}
            >
              <Package size={19} strokeWidth={1.8} />
              My Order
            </button>
            <div
              className="h-px my-2"
              style={{ background: "var(--color-border)" }}
            />
            <button
              onClick={() => {
                isLoggedIn ? onOpenAccount() : onOpenAuth();
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-base"
              style={{ color: "var(--color-ink)" }}
            >
              <User size={18} />{" "}
              {isLoggedIn ? "My account" : "Sign in / Sign up"}
            </button>
            <button
              onClick={() => {
                onOpenFavorites();
                setMobileOpen(false);
              }}
              className="flex items-center gap-3 text-left px-4 py-3.5 rounded-xl font-bold text-base"
              style={{ color: "var(--color-ink)" }}
            >
              <Heart size={18} /> Favorites
            </button>
          </div>
        </div>
      )}
    </>
  );
}
