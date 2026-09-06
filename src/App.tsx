//src/App.tsx — frontstore

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import AccountPage from "./components/AccountPage";
import CheckoutFlow from "./components/CheckoutFlow";
import OrderTrackingModal from "./components/OrderTrackingModal";
import ProfileModal from "./components/ProfileModal";
import ToastContainer, { type Toast } from "./components/ToastContainer";
import LegalPage from "./pages/LegalPage";
import FaqPage from "./pages/FaqPage";
import ContactPage from "./pages/ContactPage";
import PromotionsPage from "./pages/PromotionsPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import { useRecentlyViewed } from "./hooks/useRecentlyViewed";
import MobileTabBar from "./components/MobileTabBar";
import BackToTopButton from "./components/BackToTopButton";
import CookieConsentBanner from "./components/CookieConsentBanner";
import AdminDashboardNew from "./admin/AdminDashboardNew";
import { useCurrencySymbol } from "./hooks/useCurrencySymbol";
import { useTabBadge } from "./hooks/useTabBadge";
import { useCookieConsent } from "./hooks/useCookieConsent";
import { Product, CartItem } from "./types";
import { getVariantAvailability } from "./hooks/useProductAvailability";
import { supabase } from "./lib/supabaseClient";
import {
  productApi,
  heroPromotionsApi,
  customerApi,
  orderApi,
} from "./api/supabaseApi";
import ProductPage from "./pages/ProductPage";
import HeroCarousel from "./components/HeroCarousel";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import type { HeroPromotion, Favourite } from "./admin/adminTypes";
import { rankProducts } from "./utils/productRanking";
import CatalogSection from "./components/CatalogSection";
import { PLACEHOLDER_IMG } from "./constants/assets";
import DealsSection from "./components/DealsSection";
import AboutSection from "./components/AboutSection";
import ReassuranceBar from "./components/ReassuranceBar";
import FaqSection from "./components/FaqSection";
import TestimonialsSection from "./components/TestimonialsSection";
import NotFound from "./components/NotFound";

// ── Product delivery info visibility switch ──
const SHOW_PRODUCT_DELIVERY_INFO = false; // set to true to show delivery info on cards

export default function App() {
  // Store States
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  // Auth, Admin & Profile States
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState<
    "login" | "signup" | "resetPassword"
  >("login");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUser, setIsUser] = useState(false);
  const [userName, setUserName] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAccountPage, setShowAccountPage] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);

  // Selection/Filtering States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(
    null,
  );

  // Layout View States
  const [activeTab, setActiveTab] = useState<"store" | "admin">("store");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [selectedProductInitialColor, setSelectedProductInitialColor] =
    useState<string | null>(null);
  const [selectedProductInitialSize, setSelectedProductInitialSize] = useState<
    string | null
  >(null);

  // Keep manual restore without forcing scroll (hero placeholder keeps layout stable)
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  // V2 routing: /produit/:id → product page (pushState + popstate)
  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    const match = path.match(/^\/produit\/([^/]+)/);
    if (match && products.length > 0) {
      const p = products.find((x) => x.id === match[1]);
      if (p) setSelectedProduct(p);
    }
    if (path.startsWith("/legal/")) setLegalSlug(path.split("/")[2] || "cgv");
    else if (path === "/faq") setShowFaqPage(true);
    else if (path === "/contact") setShowContactPage(true);
    else if (path === "/promotions") setShowPromotionsPage(true);
    else if (path === "/recherche") {
      const q = new URLSearchParams(search).get("q") || "";
      if (q) setSearchPageQuery(q);
    } else if (path === "/suivi") {
      const c = new URLSearchParams(search).get("code") || "";
      setTrackingPageCode(c);
    }
  }, [products]);
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      const m = path.match(/^\/produit\/([^/]+)/);
      if (m) {
        const p = products.find((x) => x.id === m[1]);
        if (p) setSelectedProduct(p);
        else setSelectedProduct(null);
      } else {
        setSelectedProduct(null);
      }
      if (path.startsWith("/legal/")) setLegalSlug(path.split("/")[2] || "cgv");
      else setLegalSlug(null);
      setShowFaqPage(path === "/faq");
      setShowContactPage(path === "/contact");
      setShowPromotionsPage(path === "/promotions");
      if (path === "/recherche")
        setSearchPageQuery(new URLSearchParams(search).get("q") || "");
      else setSearchPageQuery(null);
      if (path === "/suivi")
        setTrackingPageCode(new URLSearchParams(search).get("code") || "");
      else setTrackingPageCode(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [products]);
  const openProduct = (
    p: Product,
    color?: string | null,
    size?: string | null,
  ) => {
    setSelectedProductInitialColor(color || null);
    setSelectedProductInitialSize(size || null);
    setSelectedProduct(p);
    addViewed(p.id);
    try {
      history.pushState({}, "", `/produit/${p.id}`);
    } catch {}
  };

  // ── Pages (V2) ──
  const [legalSlug, setLegalSlug] = useState<string | null>(null);
  const [showFaqPage, setShowFaqPage] = useState(false);
  const [showContactPage, setShowContactPage] = useState(false);
  const [showPromotionsPage, setShowPromotionsPage] = useState(false);
  const [searchPageQuery, setSearchPageQuery] = useState<string | null>(null);
  const [trackingPageCode, setTrackingPageCode] = useState<string | null>(null);
  const openLegal = (slug: string) => {
    setLegalSlug(slug);
    try {
      history.pushState({}, "", `/legal/${slug}`);
    } catch {}
  };
  const openFaqPage = () => {
    setShowFaqPage(true);
    try {
      history.pushState({}, "", "/faq");
    } catch {}
  };
  const openContactPage = () => {
    setShowContactPage(true);
    try {
      history.pushState({}, "", "/contact");
    } catch {}
  };
  const openPromotionsPage = () => {
    setShowPromotionsPage(true);
    try {
      history.pushState({}, "", "/promotions");
    } catch {}
  };
  const openSearchPage = (q: string) => {
    setSearchPageQuery(q);
    try {
      history.pushState({}, "", `/recherche?q=${encodeURIComponent(q)}`);
    } catch {}
  };
  const openTrackingPage = (code?: string) => {
    setTrackingPageCode(code || "");
    try {
      history.pushState(
        {},
        "",
        code ? `/suivi?code=${encodeURIComponent(code)}` : "/suivi",
      );
    } catch {}
  };

  // Cart Drawer State
  const [cartOpen, setCartOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [stripeConfirmOrderId, setStripeConfirmOrderId] = useState<
    string | null
  >(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingInitialCode, setTrackingInitialCode] = useState<string | null>(
    null,
  );

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const currencySymbol = useCurrencySymbol();
  const cookieConsent = useCookieConsent();
  const { addViewed } = useRecentlyViewed();

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
  // P-B anti-race panier (Business Logic Abuse: double clic -> 2 items)
  const addToCartLock = useRef(false);

  // Local caches to avoid 406 errors on admin_users and customers
  // const [adminEmails, setAdminEmails] = useState<string[]>([]);f
  const [allCustomers, setAllCustomers] = useState<
    { id: string; email: string }[]
  >([]);
  const [cacheReady, setCacheReady] = useState(false);

  // Charger le panier de l'utilisateur connecté depuis Supabase
  useEffect(() => {
    const loadCart = async () => {
      // ⛔ Ne pas recharger le panier depuis Supabase pendant un retour Stripe
      if (window.location.search.includes("order=success")) {
        setCartLoaded(true); // évite aussi la synchro
        return;
      }

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
                if (!product) return null;
                // P3 POD: on garde même les produits inactifs/variantes supprimées en panier (grisé, non bloquant)
                let unitPrice =
                  product.price +
                  (product.sizeSurcharge?.[item.selectedSize] ?? 0);
                if (product.variants?.length) {
                  const variant = product.variants.find(
                    (v) => v.color === item.selectedColor,
                  );
                  if (variant?.sizes?.[item.selectedSize]?.price != null) {
                    unitPrice = variant.sizes[item.selectedSize].price;
                  }
                }
                return {
                  product,
                  selectedColor: item.selectedColor,
                  selectedSize: item.selectedSize,
                  quantity: item.quantity,
                  unitPrice,
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
          unitPrice: item.unitPrice,
        });
      }
    };
    syncCart();
  }, [cart, isAdmin, isUser]);

  const [dealExpired, setDealExpired] = useState(false);
  const [dealFadingOut, setDealFadingOut] = useState(false);

  // afficher AdminDashboardNew en plein écran lorsqu'il est actif
  const [showNewAdmin, setShowNewAdmin] = useState(false);

  const [showNotFound, setShowNotFound] = useState(false); // not found

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

  // Ouvre la modale en mode reset si on arrive depuis un lien de réinitialisation
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("resetPassword") ===
      "true"
    ) {
      setAuthInitialMode("resetPassword");
      setShowAuthModal(true);
    }
  }, []);

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
  const hasScrolledOnLoad = useRef(false);

  //
  useEffect(() => {
    const loadCaches = async () => {
      try {
        const { customerApi } = await import("./api/supabaseApi");
        const customers = await customerApi.list();
        setAllCustomers(customers.map((c) => ({ id: c.id, email: c.email })));
        setCacheReady(true);
      } catch (e) {
        // silent
      }
    };
    loadCaches();
  }, []);

  const checkAdminEmail = async (_email: string) => {
    try {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    } catch {
      return false;
    }
  };

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email) {
        // Vérifier localement puis côté serveur si l'utilisateur est admin
        const isAdminUser = await checkAdminEmail(session.user.email);
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
          // Vérifier localement puis côté serveur si l'utilisateur est admin
          checkAdminEmail(session.user.email).then((isAdminUser) => {
            if (isAdminUser) {
              setIsAdmin(true);
              setIsUser(false);
            } else {
              setIsUser(true);
              setIsAdmin(false);
            }
          });
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

  // Compte à rebours basé sur le deal le plus proche
  const dealEndTime = useMemo(() => {
    const activeDeals = products.filter((p) => p.dealActive && p.dealEndsAt);
    if (activeDeals.length === 0) return null;
    // Prend la date la plus proche
    const timestamps = activeDeals.map((p) =>
      new Date(p.dealEndsAt!).getTime(),
    );
    return Math.min(...timestamps);
  }, [products]);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [countdownString, setCountdownString] = useState("");

  useEffect(() => {
    if (!dealEndTime) {
      setTimeLeft(null);
      setCountdownString("");
      // Ne pas réinitialiser dealExpired si déjà true (évite le flash)
      return;
    }

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((dealEndTime - now) / 1000));
      setTimeLeft(remaining);
      const h = Math.floor(remaining / 3600);
      const m = Math.floor((remaining % 3600) / 60);
      const s = remaining % 60;
      setCountdownString(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
      if (remaining <= 0 && !dealExpired) {
        setDealFadingOut(true);
        setTimeout(() => {
          setDealExpired(true);
          setDealFadingOut(false);
        }, 900);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [dealEndTime]);

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
  const filteredProducts = rankProducts(
    products.filter((product) => {
      if (showFavoritesOnly && !favorites.includes(product.id)) return false;
      if (selectedCategory === "deals" && !product.dealActive) return false;
      return true;
    }),
    {
      search: searchTerm,
      category: selectedCategory === "deals" ? null : selectedCategory,
      eventType: selectedEventType,
      style: null,
      inStockOnly: false,
      keepInactive: showFavoritesOnly,
    },
  );

  // Shopping cart managers
  const addToCart = (product: Product, color: string, size: string) => {
    // P-B anti-race: debounced lock 400ms (évite race TOCTOU double-clic → 2 items)
    if (addToCartLock.current) return;
    addToCartLock.current = true;
    setTimeout(() => {
      addToCartLock.current = false;
    }, 400);

    const targetColor = color || product.colors[0];
    const targetSize = size || product.sizes[0];
    // P3 POD: bloquer ajout si variante indisponible (admin désactivé ou Printful)
    const avail = getVariantAvailability(
      product as any,
      targetColor,
      targetSize,
    );
    if (avail !== "available") {
      const msg =
        avail === "inactive"
          ? "Produit désactivé"
          : avail === "discontinued"
            ? "Variante supprimée par le fournisseur"
            : "Rupture temporaire par le fournisseur";
      showToast(`⛔ ${msg} — ${targetColor} / ${targetSize}`, "error");
      return;
    }
    const basePrice =
      product.dealActive && !dealExpired && product.dealPrice
        ? product.dealPrice
        : product.price;
    let unitPrice = basePrice + (product.sizeSurcharge?.[targetSize] ?? 0);

    if (product.variants?.length) {
      const variant = product.variants.find((v) => v.color === targetColor);
      if (variant?.sizes?.[targetSize]?.price != null) {
        const variantPrice = variant.sizes[targetSize].price;
        // Appliquer le même ratio de réduction
        if (
          product.dealActive &&
          !dealExpired &&
          product.dealPrice &&
          product.price > 0
        ) {
          const discountRatio = product.dealPrice / product.price;
          unitPrice = variantPrice * discountRatio;
        } else {
          unitPrice = variantPrice;
        }
      }
    }

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
          unitPrice,
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
      about: "about",
      testimonials: "testimonials",
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
          // Récupère le statut via la RPC publique (aucune donnée sensible exposée)
          const order = await orderApi.get(orderId);

          if (!order) {
            showToast("Order not found.", "error");
            return;
          }

          const successStatuses = [
            "paid",
            "pending",
            "in_production",
            "shipped",
            "delivered",
          ];
          if (!successStatuses.includes(order.status)) {
            showToast(
              "Payment not confirmed. Please contact support.",
              "error",
            );
            return;
          }

          // Vider le panier localement
          setCart([]);
          setCartLoaded(false);

          // Vider le panier dans Supabase (indépendant du cache)
          const {
            data: { user: currentUser },
          } = await supabase.auth.getUser();
          if (currentUser?.email) {
            const { data: customerData } = await supabase
              .from("customers")
              .select("id")
              .eq("email", currentUser.email)
              .maybeSingle();
            if (customerData) {
              await customerApi.clearCart(customerData.id);
            }
          }

          // Afficher l'écran de confirmation
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

  // Ouverture directe du suivi via ?track=ORD-... (liens « View order details »
  // envoyés dans les emails). Le modal effectue la recherche automatiquement.
  useEffect(() => {
    const trackId = new URLSearchParams(window.location.search).get("track");
    if (trackId) {
      setTrackingInitialCode(trackId.trim());
      setTrackingOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("track");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  // Detect user country via IP (free, no API key, CORS-friendly)
  useEffect(() => {
    fetch("https://api.country.is/")
      .then((res) => res.json())
      .then((data) => {
        if (data?.country) {
          setDetectedCountry(data.country);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-scroll to filters or catalog when a filter changes
  useEffect(() => {
    // Ignorer le scroll automatique au premier chargement
    if (!hasScrolledOnLoad.current && window.scrollY < 10) {
      hasScrolledOnLoad.current = true;
      return;
    }

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

  // Détecter les URLs inconnues pour afficher la page 404
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      // Routes connues
      const knownPaths = ["/", "/unsubscribe", "/index.html"];
      // Chemins statiques (fichiers dans /public)
      const isStaticFile =
        path.startsWith("/flags/") ||
        path.startsWith("/InstaWear-") ||
        path === "/globe-off.svg" ||
        path === "/unsubscribe.html";

      if (!knownPaths.includes(path) && !isStaticFile && path !== "/") {
        setShowNotFound(true);
      } else {
        setShowNotFound(false);
      }
    };

    checkRoute();
    window.addEventListener("popstate", checkRoute);
    return () => window.removeEventListener("popstate", checkRoute);
  }, []);

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
        isHomePage={
          activeTab === "store" &&
          !selectedProduct &&
          !legalSlug &&
          !showFaqPage &&
          !showContactPage &&
          !showPromotionsPage &&
          !searchPageQuery &&
          !trackingPageCode
        }
        onNavigateHome={() => {
          setSelectedProduct(null);
          setLegalSlug(null);
          setShowFaqPage(false);
          setShowContactPage(false);
          setShowPromotionsPage(false);
          setSearchPageQuery(null);
          setTrackingPageCode(null);
          setActiveTab("store");
          history.pushState({}, "", "/");
        }}
        onOpenFaqPage={openFaqPage}
        onOpenContactPage={openContactPage}
        cart={cart}
        detectedCountry={detectedCountry}
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
      {activeTab === "store" && !stripeConfirmOrderId && (
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
                if (target) openProduct(target);
              }
            }}
          />
          <ReassuranceBar />

          <DealsSection
            favorites={favorites}
            onSelectCategory={setSelectedCategory}
            onToggleFavorite={toggleFavorite}
            onAddToCart={addToCart}
            dealExpired={dealExpired}
            dealFadingOut={dealFadingOut}
            countdownString={countdownString}
            currencySymbol={currencySymbol}
            products={products}
            onSelectEventType={setSelectedEventType}
            onSelectProduct={(product) => openProduct(product)}
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
            onSelectProduct={(product) => openProduct(product)}
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
            isFavoritesMode={showFavoritesOnly}
            onClearFavorites={() => setShowFavoritesOnly(false)}
          />

          <AboutSection />

          <TestimonialsSection />

          <FaqSection />
        </main>
      )}

      {/* Admin Creator Dashboard Screen 2 */}
      {activeTab === "admin" && (
        <AdminDashboardNew onReturnToStore={() => setActiveTab("store")} />
      )}

      {/* Product Page (V2) — replaces modal, with URL pushState */}
      {selectedProduct && (
        <ProductPage
          product={selectedProduct}
          products={products}
          currencySymbol={currencySymbol}
          favorites={favorites}
          dealExpired={dealExpired}
          dealFadingOut={dealFadingOut}
          countdownString={countdownString}
          onClose={() => {
            history.pushState({}, "", "/");
            setSelectedProduct(null);
            setSelectedProductInitialColor(null);
            setSelectedProductInitialSize(null);
          }}
          initialColor={selectedProductInitialColor || undefined}
          initialSize={selectedProductInitialSize || undefined}
          onToggleFavorite={toggleFavorite}
          onAddToCart={(p: Product, c: string, s: string) => {
            addToCart(p, c, s);
          }}
          onBuyNow={(p: Product, c: string, s: string) => {
            addToCart(p, c, s);
            setCheckoutOpen(true);
            history.pushState({}, "", "/");
            setSelectedProduct(null);
          }}
          onSelectProduct={(p: Product) => openProduct(p)}
          getDeliverEstimateString={getDeliverEstimateString}
        />
      )}

      {/* Pages (V2) */}
      {legalSlug && (
        <LegalPage
          slug={legalSlug}
          onBack={() => {
            setLegalSlug(null);
            history.pushState({}, "", "/");
          }}
        />
      )}
      {showFaqPage && (
        <FaqPage
          onBack={() => {
            setShowFaqPage(false);
            history.pushState({}, "", "/");
          }}
        />
      )}
      {showContactPage && (
        <ContactPage
          onBack={() => {
            setShowContactPage(false);
            history.pushState({}, "", "/");
          }}
        />
      )}
      {showPromotionsPage && (
        <PromotionsPage
          products={products}
          favorites={favorites}
          dealExpired={dealExpired}
          dealFadingOut={dealFadingOut}
          countdownString={countdownString}
          currencySymbol={currencySymbol}
          onToggleFavorite={toggleFavorite}
          onAddToCart={addToCart}
          onSelectProduct={(p) => openProduct(p)}
          onBack={() => {
            setShowPromotionsPage(false);
            history.pushState({}, "", "/");
          }}
        />
      )}
      {searchPageQuery !== null && (
        <SearchResultsPage
          query={searchPageQuery}
          products={products}
          favouriteIds={favorites}
          onBack={() => {
            setSearchPageQuery(null);
            history.pushState({}, "", "/");
          }}
          onSearch={(q) => openSearchPage(q)}
          onSelectProduct={(p) => {
            setSearchPageQuery(null);
            openProduct(p);
          }}
          onToggleFavourite={(p) => toggleFavorite(p.id)}
          onQuickAdd={(p) => addToCart(p, p.colors?.[0] || "#000000", "M")}
        />
      )}
      {trackingPageCode !== null && (
        <OrderTrackingPage
          initialCode={trackingPageCode || ""}
          onBack={() => {
            setTrackingPageCode(null);
            history.pushState({}, "", "/");
          }}
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
            if (product) openProduct(product);
          }}
        />
      )}

      {/* Global Brand Footer */}
      <Footer
        isAdmin={isAdmin}
        onSelectEventType={setSelectedEventType}
        onNavigate={setActiveTab}
        onOpenAdmin={() => setShowNewAdmin(true)}
        onOpenLegal={openLegal}
        onOpenFaq={openFaqPage}
        onOpenContact={openContactPage}
        onOpenPromotions={openPromotionsPage}
      />

      {showAuthModal && (
        <AuthModal
          initialMode={authInitialMode}
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
          onClose={() => setShowAccountPage(false)}
          onViewProduct={(productId, initialColor, initialSize) => {
            const product = products.find((p) => p.id === productId);
            if (product) {
              setSelectedProductInitialColor(initialColor || null);
              setSelectedProductInitialSize(initialSize || null);
              setSelectedProduct(product);
            }
          }}
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
          detectedCountry={detectedCountry}
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
          detectedCountry={detectedCountry}
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
          initialCode={trackingInitialCode || undefined}
          onSelectProduct={(productId, initialColor, initialSize) => {
            const product = products.find((p) => p.id === productId);
            if (product) {
              setSelectedProductInitialColor(initialColor || null);
              setSelectedProductInitialSize(initialSize || null);
              setSelectedProduct(product);
            }
          }}
        />
      )}

      {showNotFound && (
        <NotFound
          onBack={() => {
            window.location.href = "/";
          }}
        />
      )}

      {/* V2: Back to top + Cookie banner */}
      <BackToTopButton />
      <CookieConsentBanner
        isVisible={!cookieConsent.hasResponded}
        onAcceptAll={cookieConsent.acceptAll}
        onRejectNonEssential={cookieConsent.rejectNonEssential}
        onSavePreferences={cookieConsent.savePreferences}
        onNavigateLegal={() => openLegal("cookies")}
      />

      {/* V2: Mobile tab bar (store view only) */}
      {activeTab === "store" && !showNewAdmin && !selectedProduct && (
        <MobileTabBar
          favouritesCount={favorites.length}
          cartCount={cart.reduce((a, b) => a + b.quantity, 0)}
          onTabChange={(tab) => {
            if (tab === "home") {
              setActiveTab("store");
              setShowFavoritesOnly(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else if (tab === "catalog") {
              setActiveTab("store");
              setShowFavoritesOnly(false);
              document
                .getElementById("section-catalog")
                ?.scrollIntoView({ behavior: "smooth" });
            } else if (tab === "favourites") {
              handleOpenFavorites();
            } else if (tab === "cart") {
              setCartOpen(true);
            } else if (tab === "account") {
              if (isUser) setShowAccountPage(true);
              else if (isAdmin) setShowProfileModal(true);
              else setShowAuthModal(true);
            }
          }}
        />
      )}
    </div>
  );
}
