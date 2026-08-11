// src/App.tsx — version stabilisée avec les appels corrigés (props alignées)

import React, { useState, useEffect, useRef, useMemo } from "react";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
import AccountPage from "./components/AccountPage";
import CheckoutFlow from "./components/CheckoutFlow";
import OrderTrackingModal from "./components/OrderTrackingModal";
import ProfileModal from "./components/ProfileModal";
import ToastContainer, { type Toast } from "./components/ToastContainer";
import AdminDashboardNew from "./admin/AdminDashboardNew";
import { useCurrencySymbol } from "./hooks/useCurrencySymbol";
import { useShippingSettings } from "./hooks/useShippingSettings";
import { useTabBadge } from "./hooks/useTabBadge";
import { supabase } from "./lib/supabaseClient";
import {
  productApi,
  heroPromotionsApi,
  customerApi,
  orderApi,
} from "./api/supabaseApi";
import type { Product, CartItem } from "./types";
import type { HeroPromotion, Favourite } from "./admin/adminTypes";
import { PLACEHOLDER_IMG } from "./constants/assets";
import ProductDetailModal from "./components/ProductDetailModal";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import HeroCarousel from "./components/HeroCarousel";
import CatalogSection from "./components/CatalogSection";
import DealsSection from "./components/DealsSection";
import AboutSection from "./components/AboutSection";
import ReassuranceBar from "./components/ReassuranceBar";
import FaqSection from "./components/FaqSection";
import NotFound from "./components/NotFound";

// ── Product delivery info visibility switch ──
const SHOW_PRODUCT_DELIVERY_INFO = false;

export default function App() {
  // ── Store States ──────────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  // ── Auth, Admin & Profile States ────────────────────────────────────
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

  // ── Selection/Filtering States ──────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(
    null,
  );

  // ── Layout/UI States ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"store" | "admin">("store");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductInitialColor, setSelectedProductInitialColor] =
    useState<string | null>(null);
  const [selectedProductInitialSize, setSelectedProductInitialSize] = useState<
    string | null
  >(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [stripeConfirmOrderId, setStripeConfirmOrderId] = useState<
    string | null
  >(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showNewAdmin, setShowNewAdmin] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);

  // ── Cart & Favorites ─────────────────────────────────────────────────
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // ── Promotions ──────────────────────────────────────────────────────
  const [heroPromotions, setHeroPromotions] = useState<HeroPromotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);

  // ── Deals ────────────────────────────────────────────────────────────
  const [dealExpired, setDealExpired] = useState(false);
  const [dealFadingOut, setDealFadingOut] = useState(false);

  // ── Dark Mode ────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem("theme") === "dark";
    } catch {
      return false;
    }
  });

  // ── Local Cache (customers) ─────────────────────────────────────────
  const [allCustomers, setAllCustomers] = useState<
    { id: string; email: string }[]
  >([]);
  const [cacheReady, setCacheReady] = useState(false);

  // ── Toast System ────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdCounter = useRef(0);
  const isInitialMount = useRef(true);

  // ── Hooks ────────────────────────────────────────────────────────────
  const currencySymbol = useCurrencySymbol();
  const { cost: shippingCost, threshold: freeShippingThreshold } =
    useShippingSettings();
  useTabBadge(cart, isAdmin);

  // ── Dark mode sync ──────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      darkMode ? "dark" : "light",
    );
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // ── Load customers cache ────────────────────────────────────────────
  useEffect(() => {
    const loadCaches = async () => {
      try {
        const customers = await customerApi.list();
        setAllCustomers(customers.map((c) => ({ id: c.id, email: c.email })));
        setCacheReady(true);
      } catch (e) {
        console.warn("Failed to load customers cache", e);
        setCacheReady(true);
      }
    };
    loadCaches();
  }, []);

  // ── Check admin role ────────────────────────────────────────────────
  const checkAdminEmail = async (_email: string) => {
    try {
      const { data } = await supabase.rpc("is_admin");
      return !!data;
    } catch {
      return false;
    }
  };

  // ── Auth state listener ─────────────────────────────────────────────
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user?.email) {
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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.email) {
        const isAdminUser = await checkAdminEmail(session.user.email);
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
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [cacheReady]);

  // ── Fetch products ──────────────────────────────────────────────────
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

  useEffect(() => {
    fetchProducts();
    heroPromotionsApi
      .list()
      .then(setHeroPromotions)
      .catch(() => setHeroPromotions([]))
      .finally(() => setPromotionsLoading(false));
  }, []);

  useEffect(() => {
    const handler = () => fetchProducts();
    window.addEventListener("storefront:invalidate", handler);
    return () => window.removeEventListener("storefront:invalidate", handler);
  }, []);

  // ── Load cart ──────────────────────────────────────────────────────
  useEffect(() => {
    const loadCart = async () => {
      if (window.location.search.includes("order=success")) {
        setCartLoaded(true);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const customer = allCustomers.find((c) => c.email === user.email);
        if (customer) {
          const cartItems = await customerApi.getCart(customer.id);
          const mapped = cartItems
            .map((item) => {
              const product = products.find((p) => p.id === item.productId);
              if (!product || !product.isActive) return null;
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
            .filter((ci): ci is CartItem => ci !== null);
          setCart(mapped);
          setCartLoaded(true);
        }
      }
    };
    loadCart();
  }, [isAdmin, isUser, products, allCustomers]);

  // ── Sync cart ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!cartLoaded) return;
    const syncCart = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) return;
      const customer = allCustomers.find((c) => c.email === user.email);
      if (!customer) return;
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
  }, [cart, isAdmin, isUser, allCustomers, cartLoaded]);

  // ── Load favorites ──────────────────────────────────────────────────
  useEffect(() => {
    const loadFavorites = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const customer = allCustomers.find((c) => c.email === user.email);
        if (customer) {
          const favs = await customerApi.getFavourites(customer.id);
          setFavorites(favs.map((f: Favourite) => f.productId));
        }
      }
    };
    loadFavorites();
  }, [isAdmin, isUser, allCustomers]);

  // ── Deals countdown ──────────────────────────────────────────────────
  const dealEndTime = useMemo(() => {
    const activeDeals = products.filter((p) => p.dealActive && p.dealEndsAt);
    if (activeDeals.length === 0) return null;
    const timestamps = activeDeals.map((p) =>
      new Date(p.dealEndsAt!).getTime(),
    );
    return Math.min(...timestamps);
  }, [products]);

  const [countdownString, setCountdownString] = useState("");

  useEffect(() => {
    if (!dealEndTime) {
      setCountdownString("");
      return;
    }
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.floor((dealEndTime - Date.now()) / 1000),
      );
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
  }, [dealEndTime, dealExpired]);

  // ── Stripe return ──────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderStatus = params.get("order");
    const orderId = params.get("id");
    if (!orderStatus || !orderId) return;

    const handleReturn = async () => {
      if (orderStatus === "success") {
        try {
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
          setCart([]);
          setCartLoaded(false);
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
          setStripeConfirmOrderId(orderId);
        } catch (e) {
          console.error("Error verifying Stripe order", e);
          showToast("Error verifying payment.", "error");
        }
      } else if (orderStatus === "cancelled") {
        showToast("Payment cancelled. Your cart is saved.", "info");
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("order");
      url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());
    };
    handleReturn();
  }, []);

  // ── Detect country ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("https://api.country.is/")
      .then((res) => res.json())
      .then((data) => {
        if (data?.country) setDetectedCountry(data.country);
      })
      .catch(() => {});
  }, []);

  // ── Auto‑scroll ──────────────────────────────────────────────────
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

  // ── 404 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const knownPaths = ["/", "/unsubscribe", "/index.html"];
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

  // ── Toast helpers ──────────────────────────────────────────────────
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

  // ── Cart actions ──────────────────────────────────────────────────
  const addToCart = (product: Product, color: string, size: string) => {
    const targetColor = color || product.colors[0];
    const targetSize = size || product.sizes[0];
    const basePrice =
      product.dealActive && !dealExpired && product.dealPrice
        ? product.dealPrice
        : product.price;
    let unitPrice = basePrice + (product.sizeSurcharge?.[targetSize] ?? 0);
    if (product.variants?.length) {
      const variant = product.variants.find((v) => v.color === targetColor);
      if (variant?.sizes?.[targetSize]?.price != null) {
        const variantPrice = variant.sizes[targetSize].price;
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
    setCart((prev) => prev.filter((_, i) => i !== index));
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

  // ── Favorites actions ──────────────────────────────────────────────
  const toggleFavorite = async (productId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      setFavorites((prev) =>
        prev.includes(productId)
          ? prev.filter((id) => id !== productId)
          : [...prev, productId],
      );
      return;
    }
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

  const handleOpenFavorites = () => {
    setShowFavoritesOnly(true);
    setActiveTab("store");
    setTimeout(() => {
      const el = document.getElementById("section-catalog");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // ── Scroll helper ──────────────────────────────────────────────────
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
        setTimeout(() => tryScroll(attempts + 1), 50);
      }
    };
    tryScroll(0);
  };

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

  // ── Hero banners ──────────────────────────────────────────────────
  const heroBanners = useMemo(() => {
    return heroPromotions
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

  // ── Filtered products ──────────────────────────────────────────────
  const filteredProducts = products.filter((product) => {
    if (!product.isActive) return false;
    const matchesSearch =
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tags.some((t) =>
        t.toLowerCase().includes(searchTerm.toLowerCase()),
      ) ||
      product.style.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory && selectedCategory !== "deals"
        ? product.category === selectedCategory
        : true;
    const matchesEventType = selectedEventType
      ? product.eventType === selectedEventType
      : true;
    const matchesFavorites = showFavoritesOnly
      ? favorites.includes(product.id)
      : true;
    const matchesDeals =
      selectedCategory === "deals" ? product.dealActive === true : true;
    return (
      matchesSearch &&
      matchesCategory &&
      matchesEventType &&
      matchesFavorites &&
      matchesDeals
    );
  });

  const productTitles = products.filter((p) => p.isActive).map((p) => p.title);

  useEffect(() => {
    if (activeTab === "admin" && !isAdmin) setActiveTab("store");
  }, [activeTab, isAdmin]);

  // ── Handlers pour AuthModal ─────────────────────────────────────────
  const handleLogin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    // Après login, on récupère le rôle admin
    const isAdminUser = await checkAdminEmail(email);
    return { isAdmin: isAdminUser, name: data.user?.user_metadata?.full_name };
  };

  const handleSignUp = async (
    name: string,
    email: string,
    password: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw new Error(error.message);
  };

  const handleSendResetEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw new Error(error.message);
  };

  const handleResetPassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  };

  // ── Handler pour CheckoutFlow ──────────────────────────────────────
  const handleSubmitOrder = async (payload: {
    name: string;
    phone: string;
    email: string;
    reception: "pickup" | "delivery";
    address: string;
    city: string;
    zip: string;
    country: string;
    message: string;
  }): Promise<{ orderId: string }> => {
    // Générer un ID de commande
    const orderId = `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;
    // Créer la commande dans Supabase
    const { error } = await supabase.from("orders").insert({
      id: orderId,
      client_name: payload.name,
      client_email: payload.email,
      client_phone: payload.phone,
      status: "pending",
      total_amount: cart.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
      shipping_cost: shippingCost,
      shipping_address:
        payload.reception === "delivery"
          ? {
              full_name: payload.name,
              address: payload.address,
              city: payload.city,
              zip: payload.zip,
              country: payload.country,
              phone: payload.phone,
            }
          : null,
      notes: payload.message,
      items: cart.map((item) => ({
        product_id: item.product.id,
        product_title: item.product.title,
        product_image: getVariantImage(item.product, item.selectedColor),
        selected_color: item.selectedColor,
        selected_size: item.selectedSize,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
    });
    if (error) throw new Error(error.message);
    // Vider le panier
    setCart([]);
    return { orderId };
  };

  // ── Helper pour l'image ─────────────────────────────────────────────
  const getVariantImage = (product: Product, selectedColor: string): string => {
    if (product.variants?.length) {
      const v = product.variants.find((x) => x.color === selectedColor);
      if (v?.image) return v.image;
    }
    if (product.colorImages?.length && product.colors) {
      const idx = product.colors.indexOf(selectedColor);
      if (idx >= 0 && product.colorImages[idx]) return product.colorImages[idx];
    }
    return product.image || PLACEHOLDER_IMG;
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-bg)" }}
    >
      <div className="grain-overlay" />

      {/* Header – sans onOpenTracking */}
      <Header
        cart={cart}
        favoriteCount={favorites.length}
        onOpenCart={() => setCartOpen(true)}
        onOpenFavorites={handleOpenFavorites}
        onOpenAuth={() => setShowAuthModal(true)}
        isLoggedIn={isAdmin || isUser}
        onOpenAccount={() => setShowAccountPage(true)}
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
        currentCategory={selectedCategory}
        currentEventType={selectedEventType}
        onScrollToSection={scrollToSection}
        products={products}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Main content */}
      {activeTab === "store" && !stripeConfirmOrderId && (
        <main className="flex-1 flex flex-col gap-8 pb-16">
          <HeroCarousel
            banners={heroBanners}
            loading={promotionsLoading}
            onBannerAction={(banner) => {
              if (banner.productId) {
                const target = products.find((p) => p.id === banner.productId);
                if (target) setSelectedProduct(target);
              }
            }}
          />

          <DealsSection
            dealExpired={dealExpired}
            countdownString={countdownString}
            currencySymbol={currencySymbol}
            products={products}
            onSelectEventType={setSelectedEventType}
            onSelectProduct={(product) => setSelectedProduct(product)}
          />

          <CatalogSection
            filteredProducts={filteredProducts}
            loadingProducts={loadingProducts}
            favorites={favorites}
            currencySymbol={currencySymbol}
            onToggleFavorite={toggleFavorite}
            onAddToCart={addToCart}
            onSelectProduct={(product) => setSelectedProduct(product)}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            setSearchTerm={setSearchTerm}
            setSelectedCategory={setSelectedCategory}
          />

          <AboutSection />
          <ReassuranceBar />
          <FaqSection />
        </main>
      )}

      {/* Admin Dashboard */}
      {activeTab === "admin" && (
        <AdminDashboardNew onReturnToStore={() => setActiveTab("store")} />
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          currencySymbol={currencySymbol}
          favorites={favorites}
          onClose={() => {
            setSelectedProduct(null);
            setSelectedProductInitialColor(null);
            setSelectedProductInitialSize(null);
          }}
          initialColor={selectedProductInitialColor || undefined}
          initialSize={selectedProductInitialSize || undefined}
          onToggleFavorite={toggleFavorite}
          onAddToCart={addToCart}
          onBuyNow={(p, c, s) => {
            addToCart(p, c, s);
            setCheckoutOpen(true);
            setSelectedProduct(null);
          }}
          getDeliverEstimateString={getDeliverEstimateString}
        />
      )}

      {/* Cart drawer */}
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
          onSelectProduct={(productId) => {
            const product = products.find((p) => p.id === productId);
            if (product) setSelectedProduct(product);
          }}
          currencySymbol={currencySymbol}
          shippingCost={shippingCost}
          freeShippingThreshold={freeShippingThreshold}
        />
      )}

      {/* Footer – sans onOpenAdmin */}
      <Footer isAdmin={isAdmin} onNavigateAdmin={() => setActiveTab("admin")} />

      {/* AuthModal – avec les bons callbacks */}
      {showAuthModal && (
        <AuthModal
          initialMode={authInitialMode}
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onSendResetEmail={handleSendResetEmail}
          onResetPassword={handleResetPassword}
        />
      )}

      {/* Profile modal */}
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

      {showNewAdmin && isAdmin && (
        <AdminDashboardNew onReturnToStore={() => setShowNewAdmin(false)} />
      )}

      {/* CheckoutFlow – avec onSubmitOrder */}
      {checkoutOpen && (
        <CheckoutFlow
          cart={cart}
          currencySymbol={currencySymbol}
          shippingCost={shippingCost}
          freeShippingThreshold={freeShippingThreshold}
          onClose={() => setCheckoutOpen(false)}
          onUpdateQty={updateCartQty}
          onRemoveItem={removeFromCart}
          onSubmitOrder={handleSubmitOrder}
        />
      )}

      {/* Mode confirmation Stripe */}
      {stripeConfirmOrderId && (
        <CheckoutFlow
          cart={[]}
          currencySymbol={currencySymbol}
          shippingCost={shippingCost}
          freeShippingThreshold={freeShippingThreshold}
          onClose={() => setStripeConfirmOrderId(null)}
          onUpdateQty={() => {}}
          onRemoveItem={() => {}}
          onSubmitOrder={async () => ({ orderId: stripeConfirmOrderId })}
          confirmModeOrderId={stripeConfirmOrderId}
        />
      )}

      {/* Order Tracking Modal */}
      {trackingOpen && (
        <OrderTrackingModal
          onClose={() => setTrackingOpen(false)}
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
    </div>
  );
}
