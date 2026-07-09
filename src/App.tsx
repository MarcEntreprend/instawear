// App.tsx

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Truck,
  RefreshCw,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import Header from "./components/Header";
import { FAQS } from "./data/faq";
import AuthModal from "./components/AuthModal";
import CheckoutFlow from "./components/CheckoutFlow";
import OrderTrackingModal from "./components/OrderTrackingModal";
import ProfileModal from "./components/ProfileModal";
import ToastContainer, { type Toast } from "./components/ToastContainer";
import AdminDashboardNew from "./admin/AdminDashboardNew";
import { useCurrencySymbol } from "./hooks/useCurrencySymbol";
import { Product, CartItem } from "./types";
import { supabase } from "./lib/supabaseClient"; // Connexion à Supabase pour l'authentification
import { productApi, heroPromotionsApi, customerApi } from "./api/supabaseApi";
import ProductDetailModal from "./components/ProductDetailModal";
import HeroCarousel from "./components/HeroCarousel";
import CartDrawer from "./components/CartDrawer";
import Footer from "./components/Footer";
import type { HeroPromotion, Favourite } from "./admin/adminTypes";
import CatalogSection from "./components/CatalogSection";
import { PLACEHOLDER_IMG } from "./constants/assets";

// ── Product delivery info visibility switch ──
const SHOW_PRODUCT_DELIVERY_INFO = false; // passer à true pour afficher les infos de livraison sur les cartes

export default function App() {
  // Store States
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Auth, Admin & Profile States
  const [showAuthModal, setShowAuthModal] = useState(false); // AuthModal States
  const [isAdmin, setIsAdmin] = useState(false); // état isAdmin et la déconnexion
  const [isUser, setIsUser] = useState(false); // état isUser pour les comptes simples
  const [userName, setUserName] = useState("");

  const [showProfileModal, setShowProfileModal] = useState(false);

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

  // Thème sombre
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

  // state pour les promotions
  const [heroPromotions, setHeroPromotions] = useState<HeroPromotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Caches locaux pour éviter les erreurs 406 sur admin_users et customers
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
  }, [isAdmin, isUser, products]); // recharge quand l'état de connexion change ou les produits sont prêts

  // Sauvegarder le panier dans Supabase
  useEffect(() => {
    if (!cartLoaded) return; // ne pas synchroniser avant d'avoir chargé le panier
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
  const [dealFadingOut, setDealFadingOut] = useState(false); // état de transition

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null); // état pour l'accordéon

  // afficher AdminDashboardNew en plein écran lorsqu'il est actif
  const [showNewAdmin, setShowNewAdmin] = useState(false);

  //
  useEffect(() => {
    if (showNewAdmin) {
      setShowProfileModal(false);
      setShowFavoritesOnly(false);
    }
  }, [showNewAdmin]);

  // Forcer le retour au store si un non‑admin essaie d’accéder à l’admin
  useEffect(() => {
    if (activeTab === "admin" && !isAdmin) {
      setActiveTab("store");
    }
  }, [activeTab, isAdmin]);

  // Favoris
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
  }, [isAdmin, isUser, allCustomers]); // se recharge quand l'état de connexion change ou quand le cache clients est prêt

  // Système de toasts enrichi (file d'attente)
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastIdCounter = useRef(0);

  // Charger une fois la liste des admins et des clients pour éviter les requêtes 406
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
        // silencieux
      }
    };
    loadCaches();
  }, []);

  // les promotions
  useEffect(() => {
    fetchProducts();
    // fetchSettings();
    heroPromotionsApi
      .list()
      .then(setHeroPromotions)
      .catch(() => setHeroPromotions([]))
      .finally(() => setPromotionsLoading(false));
  }, []);

  // Rafraîchir le catalogue quand l'admin modifie un produit
  useEffect(() => {
    const handler = () => {
      fetchProducts();
    };
    window.addEventListener("storefront:invalidate", handler);
    return () => window.removeEventListener("storefront:invalidate", handler);
  }, []);

  // Écouter les changements de session Supabase (authentification)
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
  }, [cacheReady]); // Se lance au montage ET quand le cache est prêt

  // Sync Promo Timer every second

  // -> compteur est une heure UTC inversée (il compte ce qui reste avant minuit UTC).
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     const now = new Date();
  //     const hours = 23 - now.getUTCHours();
  //     const minutes = 59 - now.getUTCMinutes();
  //     const seconds = 59 - now.getUTCSeconds();
  //     setCountdownString(
  //       `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
  //     );
  //   }, 1000);
  //   return () => clearInterval(interval);
  // }, []);

  // Fermer le profil et réinitialiser quand on passe en admin
  useEffect(() => {
    if (activeTab === "admin") {
      setShowProfileModal(false);
      setShowFavoritesOnly(false);
    }
  }, [activeTab]);

  // Compte à rebours de test — 10 secondes
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
        }, 900); // durée de l'animation CSS
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

  // Récupère les produits depuis Supabase (base de données réelle)
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const data = await productApi.list();
      setProducts(data);
    } catch (err) {
      console.warn("Erreur chargement produits Supabase, fallback vide :", err);
      setProducts([]);
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

    showToast(`🛒 "${product.title}" ajouté au panier !`, "success");
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
    return targetDate.toLocaleDateString("fr-FR", options);
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
          cta: promo.cta || "Découvrir",
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
    setActiveTab("store");
    setTimeout(() => {
      const idMap: Record<string, string> = {
        catalog: "section-catalog",
        about: "section-about",
        faq: "section-faq",
        filters: "section-filters",
      };
      const id = idMap[section];
      if (id) {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 200); // délai augmenté à 200ms
  };

  // Gestion du retour de Stripe Checkout (success / cancel)
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
            showToast("Commande introuvable.", "error");
            return;
          }

          if (order.status !== "paid" && order.status !== "pending") {
            showToast("Paiement non confirmé. Contactez le support.", "error");
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
            showToast("Cette commande ne vous appartient pas.", "error");
            return;
          }

          // Vider le panier et afficher l'écran de confirmation
          setCart([]);
          setCartLoaded(false);
          setStripeConfirmOrderId(orderId);
        } catch (e) {
          console.error("Erreur vérification commande Stripe", e);
          showToast("Erreur lors de la vérification du paiement.", "error");
        }
      } else if (orderStatus === "cancelled") {
        showToast("Paiement annulé. Votre panier est conservé.", "info");
      }

      // Nettoyer les paramètres de l'URL sans recharger la page
      const url = new URL(window.location.href);
      url.searchParams.delete("order");
      url.searchParams.delete("id");
      window.history.replaceState({}, "", url.toString());
    };

    handleReturn();
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
      console.warn("Erreur sauvegarde favori", e);
    }
  };

  // pour pouvoir Exclure les inactifs des suggestions
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
        onScrollToSection={scrollToSection}
        onOpenTracking={() => setTrackingOpen(true)}
        searchSuggestions={productTitles}
        products={products}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
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

          {/* Core Today deals segment & countdown triggers */}
          {(!dealExpired || dealFadingOut) &&
            products.filter((p) => p.dealActive && p.isActive).length > 0 && (
              <section
                className={`section-container w-full px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 ${dealFadingOut ? "deal-fade-out" : ""}`}
              >
                <div className="lg:col-span-4 bg-linear-to-tr from-indigo-50 via-white to-indigo-50 border border-gray-200 rounded-2xl p-6 flex flex-col justify-between min-h-75">
                  <div>
                    <span className="bg-rose-500 text-gray-900 font-black text-[9px] uppercase tracking-widest px-2.5 py-0.5 rounded-full">
                      🔥 SUPER DEAL DU JOUR
                    </span>
                    <h3 className="text-2xl font-black mt-3 leading-tight">
                      Offre Spéciale Coupe d&apos;Europe
                    </h3>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                      Profitez de prix réduits exclusifs sur notre collection de
                      t-shirts et sweats de sport IA avant le coup d&apos;envoi
                      du prochain grand match !
                    </p>
                  </div>

                  <div className="my-6 bg-gray-50/60 p-4 border border-indigo-500/10 rounded-xl">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                      L&apos;offre se termine dans :
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="bg-white text-(--color-accent) font-mono font-black text-2xl px-2.5 py-1 rounded border border-gray-200">
                        {countdownString.split(":")[0]}
                      </span>
                      <span className="text-gray-500 font-bold">:</span>
                      <span className="bg-white text-(--color-accent) font-mono font-black text-2xl px-2.5 py-1 rounded border border-gray-200">
                        {countdownString.split(":")[1]}
                      </span>
                      <span className="text-gray-500 font-bold">:</span>
                      <span className="bg-white text-(--color-accent) font-mono font-black text-2xl px-2.5 py-1 rounded border border-gray-200">
                        {countdownString.split(":")[2]}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedEventType("sport");
                    }}
                    className="bg-gray-50/40 hover:bg-gray-50/80 border border-indigo-500/20 text-indigo-600 font-bold text-xs p-3.5 rounded-xl uppercase tracking-wider transition-all block w-full text-center"
                  >
                    Parcourir les offres sportives &rarr;
                  </button>
                </div>

                {/* Quick Bundle Selection */}
                <div className="lg:col-span-8 bg-white/40 border border-gray-200 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
                    <div>
                      <h3 className="text-lg font-black tracking-wide text-gray-900">
                        🛍️ Packs Choice en Promo
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Complétez votre look et économisez sur les frais
                        d&apos;impression !
                      </p>
                    </div>
                    <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
                      DÈS 5.99$ L&apos;ACCESSOIRE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    {products
                      .filter((p) => p.dealActive && p.isActive)
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedProduct(item);
                          }}
                          className="group bg-gray-50 border border-gray-200 p-2.5 rounded-xl cursor-pointer hover:border-violet-500 transition-all text-center flex flex-col justify-between h-full"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden bg-white relative">
                            <img
                              src={item.image || PLACEHOLDER_IMG}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="mt-2 text-left">
                            <p className="text-[10px] text-gray-500 font-bold uppercase truncate">
                              {item.brand}
                            </p>
                            <p className="text-xs text-gray-900 mt-0.5 font-bold truncate">
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs font-black text-gray-900">
                                {item.price} {currencySymbol}
                              </span>
                              {item.originalPrice && (
                                <span className="text-[10px] text-gray-500 line-through">
                                  {item.originalPrice} {currencySymbol}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            )}

          <CatalogSection
            filteredProducts={filteredProducts}
            loadingProducts={loadingProducts}
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

          {/* About Section - Premium Story (visuel V2 avec max-w-4xl) */}
          <section
            id="section-about"
            className="bg-white border-t border-gray-200 mt-12 py-12 px-4 scroll-mt-28"
          >
            <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
              <span className="bg-linear-to-r from-(--color-accent) to-(--color-accent2) text-white text-[10px] font-black uppercase px-3 py-1 rounded-full mb-4">
                🎨 NOTRE HISTOIRE
              </span>
              <h3 className="text-3xl font-black text-gray-900 leading-tight">
                À Propos d&apos;InstaWear
              </h3>
              <p className="text-sm text-gray-600 mt-4 leading-relaxed max-w-2xl font-sans">
                InstaWear a été fondé par un collectif d&apos;adeptes de pop
                culture, de fans de sport et d&apos;ingénieurs passionnés
                d&apos;intelligence artificielle. Notre mission : vous permettre
                de porter l&apos;énergie des événements mondiaux en temps réel.
              </p>
              <p className="text-sm text-gray-500 mt-2.5 leading-relaxed max-w-2xl font-sans">
                Chaque pièce est fabriquée sur mesure pour vous : nous nous
                connectons directement aux usines d&apos;impression Printful.
                Zéro vêtements produits en excès, zéro gaspillage de stock. Nous
                croyons en la mode circulaire et réactive. C&apos;est le
                Print-on-Demand du futur.
              </p>
              <div className="flex gap-4 sm:gap-8 md:gap-12 mt-8 text-center bg-gray-50/60 p-4 sm:p-6 rounded-2xl border border-gray-200">
                <div>
                  <p className="text-3xl font-black text-(--color-accent) font-sans">
                    100%
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
                    Coton Bio certifié
                  </p>
                </div>
                <div className="border-l border-gray-200"></div>
                <div>
                  <p className="text-3xl font-black text-indigo-400 font-sans">
                    0
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
                    Stock détruit
                  </p>
                </div>
                <div className="border-l border-gray-200"></div>
                <div>
                  <p className="text-3xl font-black text-amber-500 font-sans">
                    24h
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mt-1">
                    Création &rarr; Print
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Reassurance/Value Proposition Bar */}
          <section className="bg-white border-y border-gray-200 py-6 px-4">
            <div className="section-container grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-center">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-2">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 border border-violet-500/20">
                  <Truck className="w-5 h-5 text-violet-400" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">
                    📦 Free Delivery over 35$
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Livraison suivie gratuite sur tous les vêtements Choice.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-2 border-y md:border-y-0 md:border-x border-gray-200">
                <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
                  <ShieldCheck className="w-5 h-5 text-(--color-accent)" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">
                    🔒 Satisfait ou Remboursé
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Retour facile et remboursement sans tracas sous 14 jours.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <RefreshCw className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">
                    🌱 Print-on-Demand Durable
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Zéro surproduction. Chaque vêtement est imprimé juste après
                    achat !
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section
            id="section-faq"
            className="section-container w-full px-4 scroll-mt-28"
          >
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-(--color-accent)" />
                Foire Aux Questions
              </h2>
              <div className="flex flex-col gap-3">
                {FAQS.map((faq, idx) => (
                  <div
                    key={faq.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <button
                      onClick={() =>
                        setOpenFaqIndex(openFaqIndex === idx ? null : idx)
                      }
                      className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 font-semibold text-sm transition-colors"
                      style={{ color: "var(--color-ink)" }}
                    >
                      <span>{faq.question}</span>
                      <ChevronRight
                        size={16}
                        strokeWidth={2}
                        className={`transition-transform duration-200 shrink-0 ${
                          openFaqIndex === idx ? "rotate-90" : ""
                        }`}
                        style={{ color: "var(--color-accent)" }}
                      />
                    </button>
                    {openFaqIndex === idx && (
                      <div
                        className="px-5 pb-4 text-sm leading-relaxed animate-fade-up"
                        style={{ color: "var(--color-ink2)" }}
                      >
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
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

      {/* Global Brand Footer avec logo officiel */}
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
            showToast(`Inscription réussie ! Bienvenue, ${name}.`);
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

      {/*  rendu du nouveau Admin en dehors du flux normal */}
      {/* empêche le modal d’être dans le DOM quand on est dans l’admin. */}
      {showNewAdmin && isAdmin && (
        <AdminDashboardNew onReturnToStore={() => setShowNewAdmin(false)} />
      )}

      {/* Checkout Flow (Panier → Livraison → Paiement → Confirmation) */}
      {checkoutOpen && (
        <CheckoutFlow
          cart={cart}
          onUpdateQty={updateCartQty}
          onRemoveItem={removeFromCart}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCart([]);
            showToast(
              "🎉 Commande confirmée ! Un récapitulatif a été envoyé par email.",
              "success",
            );
          }}
        />
      )}

      {/* Mode confirmation après retour Stripe */}
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

      {/* OrderTrackingModal Modal */}
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
