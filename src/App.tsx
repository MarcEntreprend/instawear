// src/App.tsx — démo de câblage de la Home avec le nouveau design system

import React, { useState, useMemo } from "react";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import DealsSection from "./components/DealsSection";
import CatalogSection from "./components/CatalogSection";
import AboutSection from "./components/AboutSection";
import ReassuranceBar from "./components/ReassuranceBar";
import FaqSection from "./components/FaqSection";
import Footer from "./components/Footer";
import type { Product, CartItem } from "./types";

// TODO: remplacer par tes vraies données Supabase (productApi.list(), etc.)
const MOCK_PRODUCTS: Product[] = [];

export default function App() {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [loadingProducts] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  React.useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light",
    );
  }, [darkMode]);

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        if (!p.isActive) return false;
        const matchSearch = p.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchCat = selectedCategory
          ? p.category === selectedCategory
          : true;
        return matchSearch && matchCat;
      }),
    [products, searchTerm, selectedCategory],
  );

  const toggleFavorite = (id: string) =>
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );

  const addToCart = (product: Product, color: string, size: string) => {
    setCart((prev) => [
      ...prev,
      {
        product,
        selectedColor: color,
        selectedSize: size,
        quantity: 1,
        unitPrice: product.price,
      },
    ]);
  };

  const scrollTo = (section: string) => {
    document
      .getElementById(`section-${section}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="grain-overlay" />
      <Header
        cart={cart}
        favoriteCount={favorites.length}
        onOpenCart={() => {}}
        onOpenFavorites={() => {}}
        onOpenAuth={() => {}}
        isLoggedIn={false}
        onOpenAccount={() => {}}
        onSearch={setSearchTerm}
        currentSearchTerm={searchTerm}
        onSelectCategory={setSelectedCategory}
        onSelectEventType={() => {}}
        currentCategory={selectedCategory}
        currentEventType={null}
        onScrollToSection={scrollTo}
        products={products}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
      />

      <main className="flex-1 flex flex-col gap-14 pb-10">
        <HeroSection onShopNow={() => scrollTo("catalog")} />

        <DealsSection
          products={products}
          countdownString="04:12:36"
          dealExpired={false}
          currencySymbol="$"
          onSelectEventType={() => scrollTo("catalog")}
          onSelectProduct={() => {}}
        />

        <CatalogSection
          filteredProducts={filteredProducts}
          loadingProducts={loadingProducts}
          favorites={favorites}
          currencySymbol="$"
          onToggleFavorite={toggleFavorite}
          onAddToCart={addToCart}
          onSelectProduct={() => {}}
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          setSearchTerm={setSearchTerm}
          setSelectedCategory={setSelectedCategory}
        />

        <AboutSection />
        <ReassuranceBar />
        <FaqSection />
      </main>

      <Footer isAdmin={false} />
    </div>
  );
}
