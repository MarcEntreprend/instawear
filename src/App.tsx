//src/App.tsx — frontstore

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  lazy,
  Suspense,
} from "react";
import Header from "./components/Header";
import AuthModal from "./components/AuthModal";
// Blocs lourds en lazy : chargés uniquement à l'ouverture (admin jamais
// téléchargé pour un visiteur non-admin, Stripe uniquement au checkout).
const AccountPage = lazy(() => import("./components/AccountPage"));
const CheckoutFlow = lazy(() => import("./components/CheckoutFlow"));
import OrderTrackingModal from "./components/OrderTrackingModal";
import ProfileModal from "./components/ProfileModal";
import ToastContainer, {
  type Toast,
  MAX_TOASTS,
} from "./components/ToastContainer";
import LegalPage from "./pages/LegalPage";
import FaqPage from "./pages/FaqPage";
import ContactPage from "./pages/ContactPage";
import PromotionsPage from "./pages/PromotionsPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import { useRecentlyViewed } from "./hooks/useRecentlyViewed";
import MobileTabBar from "./components/MobileTabBar";
import BackToTopButton from "./components/BackToTopButton";
import CookieConsentBanner from "./components/CookieConsentBanner";
// Admin : chunk séparé, téléchargé si et seulement si un admin est loggué.
const AdminDashboardNew = lazy(() => import("./admin/AdminDashboardNew"));

// Fallback unique pour les chunks lazy (spinner léger, pas de dépendance lourde).
function LazyFallback() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "var(--color-bg)" }}
      aria-label="Loading"
    >
      <div
        className="w-10 h-10 rounded-full border-2 animate-spin"
        style={{
          borderColor: "var(--color-border)",
          borderTopColor: "var(--color-accent)",
        }}
      />
    </div>
  );
}
import { useCurrencySymbol } from "./hooks/useCurrencySymbol";
import { useTabBadge } from "./hooks/useTabBadge";
import { useCookieConsent } from "./hooks/useCookieConsent";
import { applyConsent } from "./lib/analytics";
import { track, initSectionTracking, getVariant } from "./lib/engagement";
import { Product, CartItem } from "./types";
import {
  getVariantAvailability,
  pickAvailableVariant,
} from "./hooks/useProductAvailability";
import { supabase } from "./lib/supabaseClient";
import {
  loadGuestCart,
  saveGuestCart,
  clearGuestCart,
  resolveCartLines,
} from "./lib/guestCart";
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
import ForYouSection from "./components/ForYouSection";
import SitewideCountdownBanner from "./components/SitewideCountdownBanner";
import { PLACEHOLDER_IMG } from "./constants/assets";
import DealsSection from "./components/DealsSection";
import AboutSection from "./components/AboutSection";
import ReassuranceBar from "./components/ReassuranceBar";
import FaqSection from "./components/FaqSection";
import TestimonialsSection from "./components/TestimonialsSection";
import NotFound from "./components/NotFound";
import ProductUnavailable from "./components/ProductUnavailable";

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
  const [userEmail, setUserEmail] = useState("");

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
      // Q2.1 : les inactifs sont invisibles (même en URL directe).
      const p = products.find((x) => x.id === match[1] && x.isActive !== false);
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
    } else if (
      path.startsWith("/order/success/") ||
      path.startsWith("/orderResult/") ||
      path.startsWith("/orderResult/success/")
    ) {
      const parts = path.split("/").filter(Boolean);
      const id = parts[parts.length - 1];
      if (id && id !== "success" && id.startsWith("ORD-"))
        setOrderSuccessId(id);
      else {
        const qId =
          new URLSearchParams(search).get("id") ||
          new URLSearchParams(search).get("orderId");
        if (qId) setOrderSuccessId(qId);
      }
    } else if (path === "/order/success" || path === "/orderResult") {
      const qId = new URLSearchParams(search).get("id");
      if (qId) setOrderSuccessId(qId);
    }
  }, [products]);
  useEffect(() => {
    const onPop = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      const m = path.match(/^\/produit\/([^/]+)/);
      if (m) {
        const p = products.find((x) => x.id === m[1] && x.isActive !== false);
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
    track("product_click", "product", p.id, { v: getVariant() });
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
  const [orderSuccessId, setOrderSuccessId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const path = window.location.pathname;
    const search = window.location.search;
    if (
      path.startsWith("/order/success/") ||
      path.startsWith("/orderResult/")
    ) {
      const parts = path.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last.startsWith("ORD-")) return last;
    }
    const params = new URLSearchParams(search);
    if (params.get("order") === "success" && params.get("id"))
      return params.get("id");
    if (path === "/order/success" && params.get("id")) return params.get("id");
    return null;
  });
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingInitialCode, setTrackingInitialCode] = useState<string | null>(
    null,
  );

  // Garantir panier vidé dès que la page de succès est affichée (comme le flux carte)
  useEffect(() => {
    if (orderSuccessId) {
      setCart([]);
      clearGuestCart();
      setCartLoaded(true);
    }
  }, [orderSuccessId]);

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const currencySymbol = useCurrencySymbol();
  const cookieConsent = useCookieConsent();
  const { ids: recentlyIds, addViewed } = useRecentlyViewed();

  // Traceurs : chargés uniquement après consentement non-essentiels
  useEffect(() => {
    applyConsent(cookieConsent.consent);
  }, [cookieConsent.consent]);

  // Phase 2 Merchandising : capteurs silencieux (aucun changement visuel,
  // batch + beacon, gate consentement interne — voir src/lib/engagement.ts)
  useEffect(() => {
    initSectionTracking();
  }, []);

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

  // Hydratation invité : une seule fois par session (jamais d'écrasement
  // des modifications ultérieures).
  const guestHydrated = useRef(false);

  // Charger le panier de l'utilisateur connecté depuis Supabase
  useEffect(() => {
    const loadCart = async () => {
      // ⛔ Ne pas recharger le panier pendant un retour Stripe (ou si confirmation affichée)
      if (
        window.location.pathname.startsWith("/order/success/") ||
        window.location.pathname.startsWith("/orderResult/") ||
        window.location.search.includes("order=success") ||
        stripeConfirmOrderId ||
        orderSuccessId
      ) {
        setCartLoaded(true);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        guestHydrated.current = false;
        const customer = allCustomers.find((c) => c.email === user.email);
        if (customer) {
          const cartItems = await customerApi.getCart(customer.id);
          setCart(resolveCartLines(cartItems, products));
          setCartLoaded(true);
        }
      } else if (!guestHydrated.current && products.length > 0) {
        // Invité : restaure le panier localStorage (lignes validées, prix frais).
        guestHydrated.current = true;
        const lines = loadGuestCart();
        if (lines.length > 0) {
          setCart(resolveCartLines(lines, products));
        }
        setCartLoaded(true);
      }
    };
    loadCart();
  }, [isAdmin, isUser, products, stripeConfirmOrderId, orderSuccessId]);

  // Save cart to Supabase (connecté) ou localStorage (invité, best-effort).
  // cartLoaded garde-fou : jamais d'écriture avant hydratation (sinon on
  // écraserait le stockage avec []).
  useEffect(() => {
    if (!cartLoaded) return;
    const syncCart = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.email) {
        saveGuestCart(cart);
        return;
      }
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

  // Block background swipe/scroll when any fullscreen modal/page is open (mobile)
  useEffect(() => {
    const isAnyModalOpen =
      showAuthModal ||
      showProfileModal ||
      showAccountPage ||
      !!selectedProduct ||
      !!legalSlug ||
      showFaqPage ||
      showContactPage ||
      showPromotionsPage ||
      searchPageQuery !== null ||
      trackingPageCode !== null ||
      cartOpen ||
      checkoutOpen ||
      !!stripeConfirmOrderId ||
      !!orderSuccessId ||
      trackingOpen ||
      showNotFound ||
      showNewAdmin;
    if (isAnyModalOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevOverscroll = (document.documentElement.style as any)
        .overscrollBehavior;
      document.body.style.overflow = "hidden";
      (document.documentElement.style as any).overscrollBehavior = "contain";
      const onTouchMove = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('[class*="fixed inset-0"]')) return;
        e.preventDefault();
      };
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      return () => {
        document.body.style.overflow = prevOverflow;
        (document.documentElement.style as any).overscrollBehavior =
          prevOverscroll;
        document.removeEventListener("touchmove", onTouchMove);
      };
    } else {
      document.body.style.overflow = "";
      (document.documentElement.style as any).overscrollBehavior = "";
    }
  }, [
    showAuthModal,
    showProfileModal,
    showAccountPage,
    selectedProduct,
    legalSlug,
    showFaqPage,
    showContactPage,
    showPromotionsPage,
    searchPageQuery,
    trackingPageCode,
    cartOpen,
    checkoutOpen,
    stripeConfirmOrderId,
    orderSuccessId,
    trackingOpen,
    showNotFound,
    showNewAdmin,
  ]);

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

  // Keep header display name in sync with DB (first name if available)
  useEffect(() => {
    if (!isUser) {
      setUserEmail("");
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      const email = session?.user?.email || "";
      if (email) setUserEmail(email);
      const uid = session?.user?.id;
      if (!uid) return;
      try {
        const c = await customerApi.get(uid);
        if (cancelled) return;
        if (c?.name && c.name.trim()) {
          setUserName(c.name.trim());
        } else {
          const meta = (session?.user?.user_metadata as any)?.full_name;
          if (meta && meta.trim()) setUserName(meta.trim());
          else if (email && !userName) setUserName(email);
        }
      } catch {
        const meta = (session?.user?.user_metadata as any)?.full_name;
        if (meta && !cancelled) setUserName(meta.trim());
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        if (!cancelled) {
          setUserEmail("");
        }
        return;
      }
      if (session.user.email) setUserEmail(session.user.email);
      const uid = session.user.id;
      customerApi
        .get(uid)
        .then((c) => {
          if (cancelled) return;
          if (c?.name && c.name.trim()) setUserName(c.name.trim());
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [isUser, cacheReady]);

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
    action?: { label: string; onClick: () => void },
  ) => {
    const id = ++toastIdCounter.current;
    // Plafond anti-spam visuel : on garde les plus récents.
    setToasts((prev) =>
      [...prev, { id, text, type, duration, action }].slice(-MAX_TOASTS),
    );
  };

  const viewCartAction = () => ({
    label: "View cart",
    onClick: () => setCartOpen(true),
  });

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
  // Résout une ligne de panier (variante + prix) ou le motif de blocage.
  // Partagé par addToCart (1 item) et addManyToCart (bundle) pour un
  // calcul de prix strictement identique.
  const resolveCartLine = (
    product: Product,
    color?: string,
    size?: string,
    quantity = 1,
  ):
    | {
        line: {
          product: Product;
          selectedColor: string;
          selectedSize: string;
          quantity: number;
          unitPrice: number;
        };
      }
    | { blocked: string; targetColor: string; targetSize: string } => {
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
          ? "Product unavailable"
          : avail === "discontinued"
            ? "Variant removed by the supplier"
            : "Temporarily out of stock from the supplier";
      return { blocked: msg, targetColor, targetSize };
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

    return {
      line: {
        product,
        selectedColor: targetColor,
        selectedSize: targetSize,
        quantity,
        unitPrice,
      },
    };
  };

  const mergeLinesIntoCart = (
    prev: CartItem[],
    lines: {
      product: Product;
      selectedColor: string;
      selectedSize: string;
      quantity: number;
      unitPrice: number;
    }[],
  ): CartItem[] => {
    const next = [...prev];
    for (const line of lines) {
      const existingIndex = next.findIndex(
        (item) =>
          item.product.id === line.product.id &&
          item.selectedColor === line.selectedColor &&
          item.selectedSize === line.selectedSize,
      );
      if (existingIndex > -1) {
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + line.quantity,
        };
      } else {
        next.push({ ...line });
      }
    }
    return next;
  };

  const addToCart = (product: Product, color: string, size: string) => {
    // P-B anti-race: debounced lock 400ms (évite race TOCTOU double-clic → 2 items)
    if (addToCartLock.current) return;
    addToCartLock.current = true;
    setTimeout(() => {
      addToCartLock.current = false;
    }, 400);

    const resolved = resolveCartLine(product, color, size);
    if ("blocked" in resolved) {
      showToast(
        `⛔ ${resolved.blocked} — ${resolved.targetColor} / ${resolved.targetSize}`,
        "error",
      );
      return;
    }
    setCart((prev) => mergeLinesIntoCart(prev, [resolved.line]));
    track("add_to_cart", "product", product.id, { v: getVariant() });

    showToast(
      `🛒 "${product.title}" added to cart!`,
      "success",
      undefined,
      viewCartAction(),
    );
  };

  // Ajout en lot (ex. Frequently Bought Together) : UN SEUL passage par le
  // lock anti-race. Sans ça, N appels synchrones à addToCart ne laissent
  // passer que le 1er — les autres sont silencieusement ignorés.
  const addManyToCart = (
    items: {
      product: Product;
      color?: string;
      size?: string;
      quantity?: number;
    }[],
  ): { addedIds: string[]; blockedCount: number } => {
    if (addToCartLock.current)
      return { addedIds: [], blockedCount: items.length };
    addToCartLock.current = true;
    setTimeout(() => {
      addToCartLock.current = false;
    }, 400);

    const lines: {
      product: Product;
      selectedColor: string;
      selectedSize: string;
      quantity: number;
      unitPrice: number;
    }[] = [];
    let blockedCount = 0;
    for (const it of items) {
      // Défauts intelligents : première variante dispo (pas "M" en dur,
      // qui n'existe pas sur mugs/accessoires).
      const fallback = pickAvailableVariant(it.product as any);
      const resolved = resolveCartLine(
        it.product,
        it.color || fallback?.color,
        it.size || fallback?.size,
        it.quantity ?? 1,
      );
      if ("blocked" in resolved) {
        blockedCount += 1;
      } else {
        lines.push(resolved.line);
      }
    }
    if (lines.length === 0) {
      showToast("⛔ These items are currently unavailable.", "error");
      return { addedIds: [], blockedCount };
    }
    setCart((prev) => mergeLinesIntoCart(prev, lines));
    const addedIds = lines.map((l) => l.product.id);
    for (const id of addedIds)
      track("add_to_cart", "product", id, { v: getVariant() });
    showToast(
      `🛒 ${lines.length} item${lines.length > 1 ? "s" : ""} added to cart!`,
      "success",
      undefined,
      viewCartAction(),
    );
    if (blockedCount > 0) {
      showToast(
        `⚠️ ${blockedCount} item${blockedCount > 1 ? "s" : ""} unavailable — skipped.`,
        "warning",
      );
    }
    return { addedIds, blockedCount };
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

  // LCP : précharge la 1re image hero dès qu'elle est connue (découverte plus
  // tôt que le rendu <img>, sans attendre le paint). Rien si placeholder.
  useEffect(() => {
    const first = heroBanners[0]?.image;
    if (!first || first === PLACEHOLDER_IMG) return;
    const KEY = "data-hero-preload";
    let link = document.head.querySelector<HTMLLinkElement>(`link[${KEY}]`);
    if (!link) {
      link = document.createElement("link");
      link.rel = "preload";
      link.setAttribute("as", "image");
      link.setAttribute(KEY, "");
      try {
        (link as HTMLLinkElement & { fetchPriority?: string }).fetchPriority =
          "high";
      } catch {
        /* navigateurs sans support : preload simple */
      }
      // href AVANT append : sinon le navigateur log
      // "<link rel=preload> has an invalid href value".
      link.setAttribute("href", first);
      document.head.appendChild(link);
    } else if (link.getAttribute("href") !== first) {
      link.setAttribute("href", first);
    }
  }, [heroBanners]);

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
  //
  // ⚠️ RÈGLE ABSOLUE : l'affichage de la confirmation et le vidage local
  // du panier ne doivent JAMAIS dépendre de la réussite d'un appel réseau.
  // C'est ce couplage qui causait le bug (clearCart pouvait lever une
  // exception et bloquait tout ce qui suivait, y compris la confirmation).
  // Chaque appel annexe est maintenant isolé dans son propre try/catch,
  // en "best effort", après coup.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderStatus = params.get("order");
    const orderId = params.get("id");

    if (!orderStatus || !orderId) return;

    const cleanUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete("order");
      url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());
    };

    if (orderStatus === "cancelled") {
      showToast("Payment cancelled. Your cart is saved.", "info");
      cleanUrl();
      return;
    }

    if (orderStatus !== "success") {
      cleanUrl();
      return;
    }

    // 1️⃣ Garanti, synchrone, sans aucune dépendance réseau : la confirmation
    // s'affiche et le panier local se vide quoi qu'il arrive ensuite.
    // Force la nouvelle page dédiée /order/success/:id pour garantir l'affichage
    setCart([]);
    clearGuestCart();
    setCartLoaded(false);
    setStripeConfirmOrderId(orderId);
    setOrderSuccessId(orderId);
    // Pousse la nouvelle URL si on est encore sur l'ancienne forme ?order=success
    if (
      window.location.pathname === "/" &&
      window.location.search.includes("order=success")
    ) {
      window.history.replaceState({}, "", `/order/success/${orderId}`);
    } else {
      cleanUrl();
    }

    // 2️⃣ Vidage du panier serveur — best effort, isolé. Un échec ici
    // (session pas encore réhydratée après le rechargement complet, réseau,
    // etc.) ne doit plus jamais pouvoir annuler le point 1.
    (async () => {
      try {
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
      } catch (e) {
        console.error("Stripe return: échec du vidage du panier serveur", e);
      }
    })();

    // 3️⃣ Vérification du statut — best effort, isolée elle aussi.
    (async () => {
      try {
        const order = await orderApi.get(orderId);
        if (order) {
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
          }
        }
      } catch (e) {
        console.warn("Order fetch failed for", orderId, e);
        showToast(
          "Your order has been placed. You can track it with the reference below.",
          "info",
        );
      }
    })();
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

  // Lien intelligent commande (?order=ORD-...) : connecté → compte + détail,
  // invité → suivi pré-rempli. Param nettoyé après lecture (une seule fois).
  const [pendingAccountOrderId, setPendingAccountOrderId] = useState<
    string | null
  >(null);
  useEffect(() => {
    const orderId = new URLSearchParams(window.location.search).get("order");
    if (!orderId || !orderId.trim()) return;
    const code = orderId.trim();
    const url = new URL(window.location.href);
    url.searchParams.delete("order");
    window.history.replaceState({}, "", url.toString());
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user?.email) {
          setPendingAccountOrderId(code);
          setShowAccountPage(true);
        } else {
          setTrackingInitialCode(code);
          setTrackingOpen(true);
        }
      })
      .catch(() => {
        setTrackingInitialCode(code);
        setTrackingOpen(true);
      });
  }, []);

  // Order success dedicated page — handle /order/success/:id and legacy ?order=success
  // Garanti: ne jamais écraser /order/success/:id vers "/"
  useEffect(() => {
    const checkOrderSuccess = () => {
      const path = window.location.pathname;
      const search = window.location.search;
      let id: string | null = null;
      if (
        path.startsWith("/order/success/") ||
        path.startsWith("/orderResult/")
      ) {
        const parts = path.split("/").filter(Boolean);
        const last = parts[parts.length - 1];
        if (last && last.startsWith("ORD-")) id = last;
        else id = new URLSearchParams(search).get("id");
      } else {
        const params = new URLSearchParams(search);
        if (params.get("order") === "success" && params.get("id")) {
          id = params.get("id");
        }
      }
      if (id && id.startsWith("ORD-")) {
        setCart([]);
        clearGuestCart();
        setCartLoaded(true);
        setOrderSuccessId(id);
        setStripeConfirmOrderId(id);
        // Force l'URL canonique si on vient de l'ancien ?order=success (évite le flash "/")
        if (window.location.search.includes("order=success")) {
          window.history.replaceState({}, "", `/order/success/${id}`);
        }
      } else if (
        !window.location.pathname.startsWith("/order/success/") &&
        !window.location.pathname.startsWith("/orderResult/")
      ) {
        // Ne clear que si on n'est pas déjà sur la page de succès (évite le rebond vers "/")
        // On ne clear pas automatiquement ici — laisse onClose le faire
      }
    };
    checkOrderSuccess();
    window.addEventListener("popstate", checkOrderSuccess);
    return () => window.removeEventListener("popstate", checkOrderSuccess);
  }, []);

  // Detect user country via IP (free, no API key, CORS-friendly)
  // Cache 7j en localStorage + fallback silencieux (CheckoutFlow utilise
  // store_settings.country si detectedCountry est null).
  useEffect(() => {
    const KEY = "instawear-country";
    const TTL = 7 * 86400000;
    try {
      const cached = window.localStorage.getItem(KEY);
      if (cached) {
        const { code, at } = JSON.parse(cached);
        if (code && Date.now() - at < TTL) {
          setDetectedCountry(code);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    let cancelled = false;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetch("https://api.country.is/", { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`geo ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data?.country) {
          setDetectedCountry(data.country);
          try {
            window.localStorage.setItem(
              KEY,
              JSON.stringify({ code: data.country, at: Date.now() }),
            );
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {
        // Fallback silencieux : detectedCountry reste null,
        // CheckoutFlow utilisera store_settings.country.
      })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      clearTimeout(timer);
      ctrl.abort();
    };
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
      // Routes connues (SPA : pages produit / légales / aide / suivi)
      const knownPaths = [
        "/",
        "/unsubscribe",
        "/index.html",
        "/faq",
        "/contact",
        "/promotions",
        "/recherche",
        "/suivi",
        "/order/success",
        "/orderResult",
        "/orderResult/success",
      ];
      const knownPrefixes = [
        "/produit/",
        "/legal/",
        "/order/success/",
        "/orderResult/",
      ];
      // Chemins statiques (fichiers dans /public)
      const isStaticFile =
        path.startsWith("/flags/") ||
        path.startsWith("/InstaWear-") ||
        path === "/globe-off.svg" ||
        path === "/unsubscribe.html" ||
        path === "/robots.txt" ||
        path === "/sitemap.xml" ||
        path === "/llms.txt" ||
        path === "/ai.txt" ||
        path === "/site.webmanifest" ||
        path === "/manifest.json" ||
        path === "/favicon.ico" ||
        /\.(png|jpe?g|svg|webp|ico|css|js|map|json|webmanifest)$/.test(path);

      const isKnown =
        knownPaths.includes(path) ||
        knownPrefixes.some((p) => path.startsWith(p)) ||
        isStaticFile ||
        path === "/";

      setShowNotFound(!isKnown);
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
      setFavorites((prev) => {
        const adding = !prev.includes(productId);
        track("favourite", "product", productId, {
          state: adding ? "added" : "removed",
        });
        return adding
          ? [...prev, productId]
          : prev.filter((id) => id !== productId);
      });
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
        track("favourite", "product", productId, { state: "removed" });
      } else {
        await customerApi.addFavourite(clientId, productId);
        setFavorites((prev) => [...prev, productId]);
        track("favourite", "product", productId, { state: "added" });
      }
    } catch (e) {
      console.warn("Error saving favorite", e);
    }
  };

  // Exclude inactive products from suggestions
  const productTitles = products.filter((p) => p.isActive).map((p) => p.title);

  // Tick forcé : pushState seul ne re-rend pas. Sans ça, goHome() depuis un
  // écran d'erreur (états déjà null) ne repeindrait rien (URL changée, UI figée).
  const [, setUiTick] = useState(0);

  // Retour accueil (même reset que le logo, factorisé pour les écrans d'erreur).
  const goHome = () => {
    setUiTick((t) => t + 1);
    setSelectedProduct(null);
    setLegalSlug(null);
    setShowFaqPage(false);
    setShowContactPage(false);
    setShowPromotionsPage(false);
    setSearchPageQuery(null);
    setTrackingPageCode(null);
    setActiveTab("store");
    history.pushState({}, "", "/");
  };

  // Garde deep-route /produit/:id lue AU RENDU (l'URL ne ment jamais) :
  // - chargement → spinner (pas de faux accueil)
  // - fetch échoué → erreur + retry (pas de home silencieux)
  // - id inconnu → "deleted", inactif → "inactive" (Q2.1 + Q2.2)
  const livePath =
    typeof window !== "undefined" ? window.location.pathname : "/";
  const bootProductMatch = livePath.match(/^\/produit\/([^/]+)/);
  const bootProductId = bootProductMatch ? bootProductMatch[1] : null;
  const bootProduct = bootProductId
    ? products.find((x) => x.id === bootProductId)
    : undefined;
  const showBootSpinner =
    !!bootProductId && loadingProducts && !networkError && !selectedProduct;
  const showBootLoadError =
    !!bootProductId && !loadingProducts && networkError && !selectedProduct;
  const showBadProduct =
    !!bootProductId &&
    !loadingProducts &&
    !networkError &&
    !bootProduct &&
    !selectedProduct;
  const showInactiveProduct =
    !!bootProduct &&
    bootProduct.isActive === false &&
    !selectedProduct &&
    !loadingProducts;

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
          !trackingPageCode &&
          !orderSuccessId &&
          !stripeConfirmOrderId
        }
        onNavigateHome={() => {
          window.location.href = "/";
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
          if (term.trim())
            track("search", "section", "search", {
              query: term.trim().slice(0, 80),
            });
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
        userName={userName}
        userEmail={userEmail}
        onOpenProfile={() => {
          if (activeTab === "store") setShowProfileModal(true);
        }}
        onLogout={async () => {
          await supabase.auth.signOut();
          setIsAdmin(false);
          setIsUser(false);
          setUserName("");
          setUserEmail("");
          setCart([]);
          clearGuestCart();
          setFavorites([]);
          setCartLoaded(false);
          setShowFavoritesOnly(false);
          setActiveTab("store");
        }}
        onOpenAccount={() => setShowAccountPage(true)}
        onScrollToSection={scrollToSection}
        onSelectProduct={(p) => openProduct(p)}
        onOpenTracking={() => setTrackingOpen(true)}
        searchSuggestions={productTitles}
        products={products}
        networkError={networkError}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        // onSelectProduct={(product) => setSelectedProduct(product)}
      />

      {/* Toast system */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Client Customer Main Storefront View */}
      {activeTab === "store" && !stripeConfirmOrderId && !orderSuccessId && (
        <main
          className="flex-1 flex flex-col gap-8 pb-16"
          id="view-customer-storefront"
        >
          <SitewideCountdownBanner />
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
            onRetry={() => fetchProducts()}
            onNavigateHome={() => {
              window.location.href = "/";
            }}
          />

          {isUser && (
            <ForYouSection
              products={products}
              favoriteIds={favorites}
              recentlyIds={recentlyIds}
              favorites={favorites}
              dealExpired={dealExpired}
              dealFadingOut={dealFadingOut}
              countdownString={countdownString}
              currencySymbol={currencySymbol}
              onToggleFavorite={toggleFavorite}
              onAddToCart={addToCart}
              onSelectProduct={(product) => openProduct(product)}
            />
          )}

          <AboutSection />

          <TestimonialsSection />

          <FaqSection />
        </main>
      )}

      {/* Admin Creator Dashboard Screen 2 (lazy + réservé aux admins) */}
      {activeTab === "admin" && isAdmin && (
        <Suspense fallback={<LazyFallback />}>
          <AdminDashboardNew onReturnToStore={() => setActiveTab("store")} />
        </Suspense>
      )}

      {/* Deep-route /produit/:id : chargement, erreur fetch, id inconnu/inactif.
          Jamais de faux accueil silencieux (diagnostic deep-link + Q2.1/Q2.2). */}
      {showBootSpinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-(--color-bg)">
          <div
            className="animate-spin"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "3px solid var(--color-border)",
              borderTopColor: "var(--color-accent)",
            }}
          />
        </div>
      )}
      {showBootLoadError && (
        <ProductUnavailable
          reason="load-error"
          onBackHome={goHome}
          onRetry={() => fetchProducts()}
        />
      )}
      {showBadProduct && (
        <ProductUnavailable reason="deleted" onBackHome={goHome} />
      )}
      {showInactiveProduct && (
        <ProductUnavailable reason="inactive" onBackHome={goHome} />
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
          onAddMany={addManyToCart}
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
          networkError={networkError}
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
          detectedCountry={detectedCountry}
        />
      )}

      {/* Global Brand Footer */}
      <Footer
        isAdmin={isAdmin}
        onSelectEventType={setSelectedEventType}
        onSelectCategory={setSelectedCategory}
        onNavigate={setActiveTab}
        onOpenAdmin={() => setShowNewAdmin(true)}
        onOpenLegal={openLegal}
        onOpenFaq={openFaqPage}
        onOpenContact={openContactPage}
        onOpenTracking={() => {
          setTrackingOpen(true);
          setTrackingInitialCode(null);
        }}
        onOpenPromotions={openPromotionsPage}
        onManageCookies={cookieConsent.resetConsent}
      />

      {showAuthModal && (
        <AuthModal
          initialMode={authInitialMode}
          onOpenLegal={openLegal}
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
            setUserEmail("");
            setCart([]);
            clearGuestCart();
            setFavorites([]);
            setCartLoaded(false);
            setShowFavoritesOnly(false);
            setActiveTab("store");
          }}
        />
      )}

      {showAccountPage && (
        <Suspense fallback={<LazyFallback />}>
          <AccountPage
            initialOrderId={pendingAccountOrderId}
            onClose={() => {
              setShowAccountPage(false);
              setPendingAccountOrderId(null);
            }}
            onViewProduct={(productId, initialColor, initialSize) => {
              const product = products.find((p) => p.id === productId);
              if (product) {
                setSelectedProductInitialColor(initialColor || null);
                setSelectedProductInitialSize(initialSize || null);
                setSelectedProduct(product);
              }
            }}
            onNameUpdated={(newName) => setUserName(newName)}
          />
        </Suspense>
      )}

      {/*  rendu du nouveau Admin en dehors du flux normal */}
      {/* empêche le modal d’être dans le DOM quand on est dans l’admin. */}
      {showNewAdmin && isAdmin && (
        <Suspense fallback={<LazyFallback />}>
          <AdminDashboardNew onReturnToStore={() => setShowNewAdmin(false)} />
        </Suspense>
      )}

      {/* Checkout Flow (Cart → Shipping → Payment → Confirmation) */}
      {checkoutOpen && (
        <Suspense fallback={<LazyFallback />}>
          <CheckoutFlow
            cart={cart}
            detectedCountry={detectedCountry}
            onUpdateQty={updateCartQty}
            onRemoveItem={removeFromCart}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={() => {
              setCart([]);
              clearGuestCart();
              showToast(
                "🎉 Order confirmed! A confirmation email has been sent.",
                "success",
              );
            }}
            products={products}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onSelectProduct={(product) => openProduct(product)}
            onQuickAdd={addToCart}
          />
        </Suspense>
      )}

      {/* Confirmation mode after Stripe return — legacy, hidden when new dedicated page is used */}
      {stripeConfirmOrderId && !orderSuccessId && (
        <Suspense fallback={<LazyFallback />}>
          <CheckoutFlow
            cart={[]}
            detectedCountry={detectedCountry}
            onUpdateQty={() => {}}
            onRemoveItem={() => {}}
            onClose={() => setStripeConfirmOrderId(null)}
            onSuccess={() => {}}
            confirmModeOrderId={stripeConfirmOrderId}
          />
        </Suspense>
      )}

      {orderSuccessId && (
        <OrderSuccessPage
          orderId={orderSuccessId}
          onClose={() => {
            setOrderSuccessId(null);
            setStripeConfirmOrderId(null);
            history.pushState({}, "", "/");
          }}
          onClearCart={() => {
            setCart([]);
            clearGuestCart();
            setCartLoaded(false);
          }}
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
        onNavigateLegal={() => openLegal("cookies")}
      />

      {/* V2: Mobile tab bar (store view only) */}
      {activeTab === "store" && !showNewAdmin && !selectedProduct && (
        <MobileTabBar
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
            } else if (tab === "order") {
              setTrackingOpen(true);
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
