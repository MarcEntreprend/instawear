// src/App.tsx — frontstore

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import AccountPage from "./components/AccountPage";
import CheckoutFlow from "./components/CheckoutFlow";
import OrderTrackingModal from "./components/OrderTrackingModal";
import ProfileModal from "./components/ProfileModal";
import ToastContainer, { type Toast } from "./components/ToastContainer";
import AdminDashboardNew from "./admin/AdminDashboardNew";
import { useCurrencySymbol } from "./hooks/useCurrencySymbol";
import { useTabBadge } from "./hooks/useTabBadge";
import { Product, CartItem } from "./types";
import { supabase } from "./lib/supabaseClient";
import { productApi, heroPromotionsApi, customerApi } from "./api/supabaseApi";
import ProductDetailModal from "./components/ProductDetailModal";
import HeroCarousel from "./components/HeroCarousel";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import type { HeroPromotion, Favourite } from "./admin/adminTypes";
import CatalogSection from "./components/CatalogSection";
import { PLACEHOLDER_IMG } from "./constants/assets";
import DealsSection from "./components/DealsSection";
import AboutSection from "./components/AboutSection";
import ReassuranceBar from "./components/ReassuranceBar";
import FaqSection from "./components/FaqSection";

// ── Product delivery info visibility switch ──
const SHOW_PRODUCT_DELIVERY_INFO = false; // set to true to show delivery info on cards

export default function App() {
  // Store States
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  // Auth, Admin & Profile States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUser, setIsUser] = useState(false);
  const [userName, setUserName] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);

  // Selection/Filtering States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(
    null,
  );

  // Layout View States
  const [activeTab, setActiveTab] = useState<"store" | "admin">("store");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Cart Drawer State
  const [cartOpen, setCartOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [stripeConfirmOrderId, setStripeConfirmOrderId] = useState<
    string | null
  >(null);
  const [trackingOpen, setTrackingOpen] = useState(false);

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const currencySymbol = useCurrencySymbol();

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light",
    );
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // Promotions
  const [heroPromotions, setHeroPromotions] = useState<HeroPromotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  useTabBadge(cart, isAdmin);

  const [cartLoaded, setCartLoaded] = useState(false);

  // Local caches to avoid 406 errors on admin_users and customers
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [allCustomers, setAllCustomers] = useState<
    { id: string; email: string }[]
  >([]);
  const [cacheReady, setCacheReady] = useState(false);

  // Charger le panier de l'utilisateur connecté depuis Supabase
  useEffect(() => {
    const loadCart = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        // Recherche locale pour éviter l'erreur 406
        const customer = allCustomers.find((c) => c.email === user.email);
        if (customer) {
          const cartItems = await customerApi.getCart(customer.id);
          setCart(
            cartItems
              .map((item) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product || !product.isActive) return null;
                return {
                  product,
                  selectedColor: item.selectedColor,
                  selectedSize: item.selectedSize,
                  quantity: item.quantity,
                };
              })
              .filter((ci): ci is CartItem => ci !== null),
          );
          setCartLoaded(true);
        }
      }
    };
    loadCart();
  }, [isAdmin, isUser, products]);

  // Save cart to Supabase
  useEffect(() => {
    if (!cartLoaded) return;
    const syncCart = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return;
      // Recherche locale pour éviter l'erreur 406
      const customer = allCustomers.find((c) => c.email === user.email);
      if (!customer) return;
      // Remplacement complet : on vide puis on réinsère
      await customerApi.clearCart(customer.id);
      for (const item of cart) {
        await customerApi.addCartItem(customer.id, {
          productId: item.product.id,
          selectedColor: item.selectedColor,
          selectedSize: item.selectedSize,
          quantity: item.quantity,
        });
      }
    };
    syncCart();
  }, [cart, isAdmin, isUser]);

  const [dealExpired, setDealExpired] = useState(false);
  const [dealFadingOut, setDealFadingOut] = useState(false);

  // afficher AdminDashboardNew en plein écran lorsqu'il est actif
  const [showNewAdmin, setShowNewAdmin] = useState(false);

  useEffect(() => {
    if (showNewAdmin) {
      setShowProfileModal(false);
      setShowFavoritesOnly(false);
    }
  }, [showNewAdmin]);

  // Force back to store if a non‑admin tries to access admin
  useEffect(() => {
    if (activeTab === "admin" && !isAdmin) {
      setActiveTab("store");
    }
  }, [activeTab, isAdmin]);

  // Favorites
  const [favorites, setFavorites] = useState<string[]>([]);
  // Charger les favoris de l'utilisateur connecté
  useEffect(() => {
    const loadFavorites = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        // Recherche locale pour éviter l'erreur 406
        const customer = allCustomers.find((c) => c.email === user.email);
        if (customer) {
          const favs = await customerApi.getFavourites(customer.id);
          setFavorites(favs.map((f: Favourite) => f.productId));
        }
      }
    };
    loadFavorites();
  }, [isAdmin, isUser, allCustomers]);

  // Toast system
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastIdCounter = useRef(0);
  const isInitialMount = useRef(true);

  // Load admin + customer list once to avoid 406 errors
  useEffect(() => {
    const loadCaches = async () => {
      try {
        const { adminUserApi, customerApi } = await import("./api/supabaseApi");
        const [admins, customers] = await Promise.all([
          adminUserApi.list(),
          customerApi.list(),
        ]);
        setAdminEmails(admins.map((u) => u.email));
        setAllCustomers(customers.map((c) => ({ id: c.id, email: c.email })));
        setCacheReady(true);
      } catch (e) {
        // silent
      }
    };
    loadCaches();
  }, []);

  // Promotions
  useEffect(() => {
    fetchProducts();
    // fetchSettings();
    heroPromotionsApi
      .list()
      .then(setHeroPromotions)
      .catch(() => setHeroPromotions([]))
      .finally(() => setPromotionsLoading(false));
  }, []);

  // Refresh catalog when admin modifies a product
  useEffect(() => {
    const handler = () => {
      fetchProducts();
    };
    window.addEventListener("storefront:invalidate", handler);
    return () => window.removeEventListener("storefront:invalidate", handler);
  }, []);

  // Listen to Supabase session changes (authentication)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        // Vérifier localement si l'utilisateur est admin (évite erreur 406)
        const isAdminUser = adminEmails.includes(session.user.email);
        if (isAdminUser) {
          setIsAdmin(true);
          setIsUser(false);
        } else {
          setIsUser(true);
          setIsAdmin(false);
        }
      } else {
        // Aucune session : vider les données locales
        setIsAdmin(false);
        setIsUser(false);
        setCart([]);
        setFavorites([]);
        setCartLoaded(false);
        setShowFavoritesOnly(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user?.email) {
          // Vérifier localement si l'utilisateur est admin (évite erreur 406)
          const isAdminUser = adminEmails.includes(session.user.email);
          if (isAdminUser) {
            setIsAdmin(true);
            setIsUser(false);
          } else {
            setIsUser(true);
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
          setIsUser(false);
          setCart([]);
          setFavorites([]);
          setCartLoaded(false);
          setShowFavoritesOnly(false);
        }
      },
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [cacheReady]);

  // Close profile and reset when switching to admin
  useEffect(() => {
    if (activeTab === "admin") {
      setShowProfileModal(false);
      setShowFavoritesOnly(false);
    }
  }, [activeTab]);

  // Test countdown — 10 seconds
  const [countdownString, setCountdownString] = useState("00:00:10");
  const [timeLeft, setTimeLeft] = useState(10);

  // useEffect du compte à rebours
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!dealFadingOut && !dealExpired) {
        setDealFadingOut(true);
        setTimeout(() => {
          setDealExpired(true);
          setDealFadingOut(false);
        }, 900);
      }
      return;
    }
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, dealFadingOut, dealExpired]);

  useEffect(() => {
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    setCountdownString(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
    );
  }, [timeLeft]);

  const showToast = (
    text: string,
    type: "success" | "info" | "error" | "warning" = "success",
    duration?: number,
  ) => {
    const id = ++toastIdCounter.current;
    setToasts((prev) => [...prev, { id, text, type, duration }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch products from Supabase
  const fetchProducts = async () => {
    setLoadingProducts(true);
    setNetworkError(false);
    try {
      const data = await productApi.list();
      setProducts(data);
    } catch (err) {
      console.warn("Error loading products from Supabase:", err);
      setProducts([]);
      setNetworkError(true);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Filter products by all selection constraints
  const filteredProducts = products.filter((product) => {
    // Exclure les produits inactifs du catalogue
    if (!product.isActive) return false;

    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tags.some((t) =>
        t.toLowerCase().includes(searchTerm.toLowerCase()),
      ) ||
      product.style.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory
      ? product.category === selectedCategory
      : true;
    const matchesEventType = selectedEventType
      ? product.eventType === selectedEventType
      : true;

    const matchesFavorites = showFavoritesOnly
      ? favorites.includes(product.id)
      : true;
    return (
      matchesSearch && matchesCategory && matchesEventType && matchesFavorites
    );
  });

  // Shopping cart managers
  const addToCart = (product: Product, color: string, size: string) => {
    const targetColor = color || product.colors[0];
    const targetSize = size || product.sizes[0];

    const existingIndex = cart.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.selectedColor === targetColor &&
        item.selectedSize === targetSize,
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          product,
          selectedColor: targetColor,
          selectedSize: targetSize,
          quantity: 1,
        },
      ]);
    }

    showToast(`🛒 "${product.title}" added to cart!`, "success");
  };

  const removeFromCart = (index: number) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  const updateCartQty = (index: number, delta: number) => {
    const updated = [...cart];
    updated[index].quantity += delta;
    if (updated[index].quantity <= 0) {
      removeFromCart(index);
    } else {
      setCart(updated);
    }
  };

  // Helper date generators for delivery estimates
  const getDeliverEstimateString = (daysOffset: number) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "short",
      day: "numeric",
    };
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);
    return targetDate.toLocaleDateString("en-US", options);
  };

  // Hero Carousel banners content
  const heroBanners = React.useMemo(() => {
    return [...heroPromotions]
      .filter((promo) => {
        if (promo.isActive === false) return false;
        const product = products.find((p) => p.id === promo.productId);
        if (!product || product.isActive === false) return false;
        return true;
      })
      .sort((a, b) => a.order - b.order)
      .map((promo) => {
        const product = products.find((p) => p.id === promo.productId);
        return {
          title: promo.title || product?.title || promo.headline || "Promotion",
          headline: promo.headline || product?.title || "",
          sub: promo.sub || product?.description || "",
          cta: promo.cta || "Discover",
          bgGradient: promo.bgGradient || "from-white via-indigo-50 to-white",
          image: promo.image || product?.image || PLACEHOLDER_IMG,
          tag: promo.tag || "⚡ PROMOTION",
          productId: promo.productId,
          showTag: promo.showTag !== false,
          showTitle: promo.showTitle !== false,
        };
      });
  }, [heroPromotions, products]);

  const scrollToSection = (
    section:
      | "catalog"
      | "about"
      | "testimonials"
      | "faq"
      | "contact"
      | "filters",
  ) => {
    const idMap: Record<string, string> = {
      catalog: "section-catalog",
      about: "section-about",
      faq: "section-faq",
      filters: "section-filters",
    };
    const id = idMap[section];
    if (!id) return;

    const tryScroll = (attempts: number) => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (attempts < 20) {
        // Jusqu'à 1 seconde (20 × 50ms)
        setTimeout(() => tryScroll(attempts + 1), 50);
      }
    };

    tryScroll(0);
  };

  // Stripe Checkout return handling (success / cancel)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderStatus = params.get("order");
    const orderId = params.get("id");

    if (!orderStatus || !orderId) return;

    const handleReturn = async () => {
      if (orderStatus === "success") {
        try {
          const { data: order, error } = await supabase
            .from("orders")
            .select("status, client_email")
            .eq("id", orderId)
            .single();

          if (error || !order) {
            showToast("Order not found.", "error");
            return;
          }

          if (order.status !== "paid" && order.status !== "pending") {
            showToast(
              "Payment not confirmed. Please contact support.",
              "error",
            );
            return;
          }

          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (
            user?.email &&
            order.client_email &&
            order.client_email !== user.email
          ) {
            showToast("This order does not belong to you.", "error");
            return;
          }

          // Clear cart and show confirmation screen
          setCart([]);
          setCartLoaded(false);
          setStripeConfirmOrderId(orderId);
        } catch (e) {
          console.error("Error verifying Stripe order", e);
          showToast("Error verifying payment.", "error");
        }
      } else if (orderStatus === "cancelled") {
        showToast("Payment cancelled. Your cart is saved.", "info");
      }

      // Clean URL parameters without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("order");
      url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());
    };

    handleReturn();
  }, []);

  // Auto-scroll to filters or catalog when a filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const hasActiveFilter =
      searchTerm.trim() || selectedCategory || selectedEventType;

    const targetId = hasActiveFilter ? "section-filters" : "section-catalog";

    const tryScroll = (attempts: number) => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (attempts < 20) {
        setTimeout(() => tryScroll(attempts + 1), 50);
      }
    };

    const timer = setTimeout(() => tryScroll(0), 100);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, selectedEventType]);

  const handleOpenFavorites = () => {
    setShowFavoritesOnly(true);
    setActiveTab("store");
    setTimeout(() => {
      const el = document.getElementById("section-catalog");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const toggleFavorite = async (productId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      // Pas connecté : on bascule juste en local (perdu au rechargement)
      setFavorites((prev) =>
        prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId],
      );
      return;
    }

    // Recherche locale pour éviter l'erreur 406
    const customer = allCustomers.find((c) => c.email === user.email);
    const clientId = customer?.id;
    if (!clientId) return;

    const isFav = favorites.includes(productId);
    try {
      if (isFav) {
        await customerApi.removeFavourite(clientId, productId);
        setFavorites((prev) => prev.filter((id) => id !== productId));
      } else {
        await customerApi.addFavourite(clientId, productId);
        setFavorites((prev) => [...prev, productId]);
      }
    } catch (e) {
      console.warn("Error saving favorite", e);
    }
  };

  // Exclude inactive products from suggestions
  const productTitles = products.filter((p) => p.isActive).map((p) => p.title);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* App Header */}
      <Header
        cart={cart}
        favoriteCount={favorites.length}
        onOpenCart={() => setCartOpen(true)}
        onOpenFavorites={handleOpenFavorites}
        onSearch={(term) => {
          setSearchTerm(term);
          setActiveTab("store");
        }}
        currentSearchTerm={searchTerm}
        onSelectCategory={(cat) => {
          setShowFavoritesOnly(false);
          setSelectedCategory(cat);
          setActiveTab("store");
        }}
        onSelectEventType={(type) => {
          setShowFavoritesOnly(false);
          setSelectedEventType(type);
          setActiveTab("store");
        }}
        currentEventType={selectedEventType}
        currentCategory={selectedCategory}
        onOpenAuth={() => setShowAuthModal(true)}
        isAdminLoggedIn={isAdmin}
        isUserLoggedIn={isUser}
        onOpenProfile={() => {
          if (activeTab === "store") setShowProfileModal(true);
        }}
        onLogout={async () => {
          await supabase.auth.signOut();
          setIsAdmin(false);
          setIsUser(false);
          setUserName("");
          setCart([]);
          setFavorites([]);
          setCartLoaded(false);
          setShowFavoritesOnly(false);
          setActiveTab("store");
        }}
        onOpenAccount={() => setShowAccountPage(true)}
        onScrollToSection={scrollToSection}
        onOpenTracking={() => setTrackingOpen(true)}
        searchSuggestions={productTitles}
        products={products}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        // onSelectProduct={(product) => setSelectedProduct(product)}
      />

      {/* Toast system */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Client Customer Main Storefront View */}
      {activeTab === "store" && (
        <main
          className="flex-1 flex flex-col gap-8 pb-16"
          id="view-customer-storefront"
        >
          {/* Dynamic Hero Carousel Banner */}
          <HeroCarousel
            banners={heroBanners}
            loading={promotionsLoading}
            onBannerAction={(banner) => {
              if (banner.productId) {
                const target = products.find((p) => p.id === banner.productId);
                if (target) {
                  setSelectedProduct(target);
                }
              }
            }}
          />

          <DealsSection
            dealExpired={dealExpired}
            dealFadingOut={dealFadingOut}
            countdownString={countdownString}
            currencySymbol={currencySymbol}
            products={products}
            onSelectEventType={setSelectedEventType}
            onSelectProduct={(product) => setSelectedProduct(product)}
          />

          <CatalogSection
            filteredProducts={filteredProducts}
            loadingProducts={loadingProducts}
            networkError={networkError}
            favorites={favorites}
            dealExpired={dealExpired}
            dealFadingOut={dealFadingOut}
            countdownString={countdownString}
            currencySymbol={currencySymbol}
            showDeliveryInfo={SHOW_PRODUCT_DELIVERY_INFO}
            getDeliverEstimateString={getDeliverEstimateString}
            onToggleFavorite={toggleFavorite}
            onAddToCart={addToCart}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onClearFilters={() => {
              setSearchTerm("");
              setSelectedCategory(null);
              setSelectedEventType(null);
            }}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            selectedEventType={selectedEventType}
            setSearchTerm={setSearchTerm}
            setSelectedCategory={setSelectedCategory}
            setSelectedEventType={setSelectedEventType}
          />

          <AboutSection />
          <ReassuranceBar />
          <FaqSection />
        </main>
      )}

      {/* Admin Creator Dashboard Screen 2 */}
      {activeTab === "admin" && (
        <AdminDashboardNew onReturnToStore={() => setActiveTab("store")} />
      )}

      {/* Product Detailed Sheet Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          currencySymbol={currencySymbol}
          favorites={favorites}
          onClose={() => setSelectedProduct(null)}
          onToggleFavorite={toggleFavorite}
          onAddToCart={(p, c, s) => {
            addToCart(p, c, s);
          }}
          onBuyNow={(p, c, s) => {
            addToCart(p, c, s);
            setCartOpen(true);
            setSelectedProduct(null);
          }}
          dealExpired={dealExpired}
          dealFadingOut={dealFadingOut}
          getDeliverEstimateString={getDeliverEstimateString}
        />
      )}

      {/* Slide-over Shopping Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateCartQty}
          onRemove={removeFromCart}
          onCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
          onSelectProduct={(productId: string) => {
            const product = products.find((p) => p.id === productId);
            if (product) {
              setSelectedProduct(product);
            }
          }}
        />
      )}

      {/* Global Brand Footer */}
      <Footer
        isAdmin={isAdmin}
        onSelectEventType={setSelectedEventType}
        onNavigate={setActiveTab}
        onOpenAdmin={() => setShowNewAdmin(true)}
      />

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={(isAdminLogin, name) => {
            if (isAdminLogin) {
              setIsAdmin(true);
              setActiveTab("admin");
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              setIsUser(true);
              setUserName(name || "");
            }
            setShowAuthModal(false);
          }}
          onSignUpSuccess={(name) => {
            setIsUser(true);
            setUserName(name);
            setShowAuthModal(false);
            showToast(`Welcome, ${name}! Your account has been created.`);
          }}
        />
      )}

      {showProfileModal && activeTab === "store" && (
        <ProfileModal
          isAdmin={isAdmin}
          userName={userName}
          allCustomers={allCustomers}
          onClose={() => setShowProfileModal(false)}
          onLogout={async () => {
            await supabase.auth.signOut();
            setIsAdmin(false);
            setIsUser(false);
            setUserName("");
            setCart([]);
            setFavorites([]);
            setCartLoaded(false);
            setShowFavoritesOnly(false);
            setActiveTab("store");
          }}
        />
      )}

      {showAccountPage && (
        <AccountPage
          allCustomers={allCustomers}
          onClose={() => setShowAccountPage(false)}
        />
      )}

      {/*  rendu du nouveau Admin en dehors du flux normal */}
      {/* empêche le modal d’être dans le DOM quand on est dans l’admin. */}
      {showNewAdmin && isAdmin && (
        <AdminDashboardNew onReturnToStore={() => setShowNewAdmin(false)} />
      )}

      {/* Checkout Flow (Cart → Shipping → Payment → Confirmation) */}
      {checkoutOpen && (
        <CheckoutFlow
          cart={cart}
          onUpdateQty={updateCartQty}
          onRemoveItem={removeFromCart}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCart([]);
            showToast(
              "🎉 Order confirmed! A confirmation email has been sent.",
              "success",
            );
          }}
        />
      )}

      {/* Confirmation mode after Stripe return */}
      {stripeConfirmOrderId && (
        <CheckoutFlow
          cart={[]}
          onUpdateQty={() => {}}
          onRemoveItem={() => {}}
          onClose={() => setStripeConfirmOrderId(null)}
          onSuccess={() => {}}
          confirmModeOrderId={stripeConfirmOrderId}
        />
      )}

      {/* Order Tracking Modal */}
      {trackingOpen && (
        <OrderTrackingModal
          onClose={() => setTrackingOpen(false)}
          onSelectProduct={(productId) => {
            const product = products.find((p) => p.id === productId);
            if (product) {
              setSelectedProduct(product);
            }
          }}
        />
      )}
    </div>
  );
}
