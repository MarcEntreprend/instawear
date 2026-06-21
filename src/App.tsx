// App.tsx

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  ShieldCheck,
  Truck,
  RefreshCw,
  Star,
  Info,
  Plus,
  Trash2,
  Eye,
  Heart,
  Clock,
  Check,
  Send,
  ShoppingBag,
  X,
  CheckCircle,
  HelpCircle,
  Settings,
  Layers,
  Code,
  AlertCircle,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Mail,
  Instagram,
  Twitter,
  Facebook,
} from "lucide-react";
import Header from "./components/Header";
import { FAQS } from "./data/staticData";
import AuthModal from "./components/AuthModal";
import CheckoutModal from "./components/CheckoutModal";
import OrderTrackingModal from "./components/OrderTrackingModal";
import ProfileModal from "./components/ProfileModal";
import ToastContainer, { type Toast } from "./components/ToastContainer";
import AdminDashboard from "./admin/AdminDashboard";
import AdminDashboardNew from "./admin/AdminDashboardNew";
import { Product, CartItem, PrintfulSettings } from "./types";
import { supabase } from "./lib/supabaseClient"; // Connexion à Supabase pour l'authentification
import { productApi, heroPromotionsApi, customerApi } from "./api/supabaseApi";
import type { HeroPromotion, Favourite } from "./admin/adminTypes";

// Preset mockup templates with placeholder images
const PLACEHOLDER_IMG = "/instawear-outline-Traced.svg";

const LOGO_URL = "/InstaWear-logo.png";
const MOCKUP_PRESETS = [
  {
    name: "T-Shirt Noir Minimaliste (Mockup Classique)",
    url: PLACEHOLDER_IMG,
    category: "tshirt",
  },
  {
    name: "T-Shirt Blanc Studio (Mannequin Unisexe)",
    url: PLACEHOLDER_IMG,
    category: "tshirt",
  },
  {
    name: "Hoodie Noir Urbain (Style Cozy)",
    url: PLACEHOLDER_IMG,
    category: "hoodie",
  },
  {
    name: "Hoodie Oversized Crème (Style Streetwear)",
    url: PLACEHOLDER_IMG,
    category: "hoodie",
  },
  {
    name: "Casquette Trucker Rétro (Vibe Vintage)",
    url: PLACEHOLDER_IMG,
    category: "accessory",
  },
  {
    name: "Mug Festif Céramique (Format Standard)",
    url: PLACEHOLDER_IMG,
    category: "mug",
  },
];

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
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // Active buying variant selectors
  const [pickedColor, setPickedColor] = useState<string>("");
  const [pickedSize, setPickedSize] = useState<string>("M");

  // Cart Drawer State
  const [cartOpen, setCartOpen] = useState(false);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);

  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

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
                if (!product) return null;
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

  const [orderCompleted, setOrderCompleted] = useState(false);

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

  // Admin Studio States
  const [printfulSettings, setPrintfulSettings] = useState<PrintfulSettings>({
    apiKey: "",
    isConnected: false,
    storeName: "Boutique InstaWear",
    syncStatus: "idle",
    productsSyncedCount: 0,
  });

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

  // New design creation details
  const [newDesignPrompt, setNewDesignPrompt] = useState("");
  const [newDesignTitle, setNewDesignTitle] = useState("");
  const [newDesignDesc, setNewDesignDesc] = useState("");
  const [newDesignTags, setNewDesignTags] = useState<string[]>([]);
  const [newDesignPrice, setNewDesignPrice] = useState("24.99");
  const [newDesignCategory, setNewDesignCategory] = useState<
    "tshirt" | "hoodie" | "accessory" | "mug"
  >("tshirt");
  const [newDesignEventType, setNewDesignEventType] = useState<
    "sport" | "culture" | "saisonnier" | "live"
  >("culture");
  const [newDesignStyle, setNewDesignStyle] = useState<
    "cute" | "street" | "commute" | "cozy" | "retro"
  >("street");
  const [newDesignImg, setNewDesignImg] = useState(PLACEHOLDER_IMG);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSavingDesign, setIsSavingDesign] = useState(false);
  // Système de toasts enrichi (file d'attente)
  const [toasts, setToasts] = useState<Toast[]>([]);
  let toastIdCounter = useRef(0);

  // Printful test endpoints loading
  const [isSyncingPrintful, setIsSyncingPrintful] = useState(false);

  // Frontpage Banner States
  const [bannerIndex, setBannerIndex] = useState(0);
  // const [countdownString, setCountdownString] = useState("04:38:55"); // -> compteur est une heure UTC inversée

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [validEmail, setValidEmail] = useState(false);

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

  // Trigger Gemini client to generate title, bulleted desc & tags
  const generateAiDesignContent = async () => {
    if (!newDesignPrompt.trim()) {
      showToast(
        "Veuillez d’abord saisir une idée ou un prompt pour l’IA.",
        "error",
      );
      return;
    }

    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/gemini/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: newDesignPrompt,
          category: newDesignCategory,
          eventType: newDesignEventType,
          style: newDesignStyle,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setNewDesignTitle(data.title || "");
        setNewDesignDesc(data.description || "");
        setNewDesignTags(data.tags || []);
        showToast(
          "🪄 Design optimisé généré avec succès par Gemini !",
          "success",
        );
      } else {
        if (data.demoFallback) {
          setNewDesignTitle(data.demoFallback.title);
          setNewDesignDesc(data.demoFallback.description);
          setNewDesignTags(data.demoFallback.tags);
          showToast(
            "Mode Démo: Clé Gemini non configurée dans l'onglet Settings. Génération factice.",
            "info",
          );
        } else {
          showToast(
            data.error || "Erreur lors de la génération avec l'IA.",
            "error",
          );
        }
      }
    } catch (err: any) {
      showToast("Erreur réseau lors de la liaison au service Gemini.", "error");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Submit custom product design
  const handleSaveDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesignTitle || !newDesignDesc) {
      showToast(
        "Le titre et la description du design sont obligatoires.",
        "error",
      );
      return;
    }

    setIsSavingDesign(true);
    try {
      const colors = ["#1E1E1E", "#FFFFFF"];
      const colorNames = ["Noir Intense", "Blanc Pur"];
      if (newDesignEventType === "live" || newDesignEventType === "culture") {
        colors.push("#FF00FF", "#00FFFF");
        colorNames.push("Fuchsia Disco", "Néon Électrique");
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDesignTitle,
          description: newDesignTitle,
          fullDescription: newDesignDesc,
          eventType: newDesignEventType,
          category: newDesignCategory,
          style: newDesignStyle,
          price: Number(newDesignPrice) || 24.99,
          image: newDesignImg,
          tags: newDesignTags,
          colors,
          colorNames,
        }),
      });

      if (res.ok) {
        showToast(
          "🎉 Nouveau design enregistré dans votre catalogue d'impression !",
          "success",
        );
        setNewDesignPrompt("");
        setNewDesignTitle("");
        setNewDesignDesc("");
        setNewDesignTags([]);

        await fetchProducts();

        if (printfulSettings.isConnected) {
          triggerPrintfulSync();
        }
      } else {
        showToast("Erreur lors de la création du produit.", "error");
      }
    } catch (err) {
      showToast("Erreur réseau.", "error");
    } finally {
      setIsSavingDesign(false);
    }
  };

  // Delete a customized design
  const handleDeleteProduct = async (id: string) => {
    if (
      window.confirm("Voulez-vous vraiment supprimer ce design personnalisé ?")
    ) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        if (res.ok) {
          showToast("Design retiré avec succès.", "info");
          fetchProducts();
        } else {
          showToast("Impossible de supprimer ce produit.", "error");
        }
      } catch (err) {
        showToast("Erreur de connexion.", "error");
      }
    }
  };

  // Save Printful API credentials
  const handleSavePrintfulSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/printful/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(printfulSettings),
      });
      if (res.ok) {
        const data = await res.json();
        setPrintfulSettings(data);
        if (data.isConnected) {
          showToast(
            "🔌 Connecté avec succès à Printful ! Synchronisation disponible.",
            "success",
          );
        } else {
          showToast("Paramètres mis à jour.", "info");
        }
      }
    } catch (err) {
      showToast(
        "Erreur lors de la mise à jour des paramètres Printful.",
        "error",
      );
    }
  };

  // Simulate Printful / Printify Catalog Sync
  const triggerPrintfulSync = async () => {
    if (!printfulSettings.apiKey) {
      showToast("Veuillez d'abord renseigner votre Clé API Printful.", "error");
      return;
    }
    setIsSyncingPrintful(true);
    try {
      const res = await fetch("/api/printful/sync", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setPrintfulSettings(data);
        showToast(
          `🔄 Synchronisation complète ! ${data.productsSyncedCount} designs sont linkés avec votre compte usine. Direct-to-Consumer actif !`,
          "success",
        );
      } else {
        showToast("Erreur lors de la synchronisation usine.", "error");
      }
    } catch (err) {
      showToast("Erreur réseau lors de la communication Printful.", "error");
    } finally {
      setIsSyncingPrintful(false);
    }
  };

  // Filter products by all selection constraints
  const filteredProducts = products.filter((product) => {
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

    // logique de filtrage dans le calcul des filteredProducts
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

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );

  // const simulateCheckout = () => {
  //   if (cart.length === 0) return;
  //   setOrderCompleted(true);
  //   setTimeout(() => {
  //     setCart([]);
  //     setOrderCompleted(false);
  //     setCartOpen(false);
  //     showToast(
  //       "🚀 Commande reçue ! Envoyée automatiquement en production à l'atelier d'impression Printful !",
  //       "success",
  //     );
  //   }, 4000);
  // };

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

  // timing pour le slide auto du carroussel :
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Autoplay Hero Carousel - l'auto-slide
  useEffect(() => {
    if (autoPlayPaused) return;
    const timer = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % heroBanners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [heroBanners.length, autoPlayPaused]);

  // fonction pauseAutoPlay
  const pauseAutoPlay = (duration = 8000) => {
    setAutoPlayPaused(true);
    if (autoPlayTimeoutRef.current) clearTimeout(autoPlayTimeoutRef.current);
    autoPlayTimeoutRef.current = setTimeout(
      () => setAutoPlayPaused(false),
      duration,
    );
  };

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

  const productTitles = products.map((p) => p.title);

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
          {!promotionsLoading && heroBanners.length > 0 && (
            <section
              className="relative section-container mt-6 px-4"
              onMouseEnter={() => setAutoPlayPaused(true)}
              onMouseLeave={() => setAutoPlayPaused(false)}
            >
              <div
                className={`w-full rounded-2xl bg-linear-to-r ${heroBanners[bannerIndex].bgGradient} overflow-hidden border border-gray-200 relative min-h-90 md:min-h-105 transition-all duration-700`}
              >
                {/* Boutons de navigation */}
                <button
                  onClick={() => {
                    pauseAutoPlay();
                    setBannerIndex(
                      (prev) =>
                        (prev - 1 + heroBanners.length) % heroBanners.length,
                    );
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/60 hover:bg-white border border-gray-200 text-gray-900 flex items-center justify-center transition-all z-20 hover:text-(--color-accent)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    pauseAutoPlay();
                    setBannerIndex((prev) => (prev + 1) % heroBanners.length);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/60 hover:bg-white border border-gray-200 text-gray-900 flex items-center justify-center transition-all z-20 hover:text-(--color-accent)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                {/* Zones tactiles */}
                <button
                  onClick={() => {
                    pauseAutoPlay();
                    setBannerIndex(
                      (prev) =>
                        (prev - 1 + heroBanners.length) % heroBanners.length,
                    );
                  }}
                  className="absolute inset-y-0 left-0 w-[12%] md:w-[8%] min-w-11 z-10 bg-transparent cursor-pointer"
                  aria-label="Diapositive précédente"
                />
                <button
                  onClick={() => {
                    pauseAutoPlay();
                    setBannerIndex((prev) => (prev + 1) % heroBanners.length);
                  }}
                  className="absolute inset-y-0 right-0 w-[12%] md:w-[8%] min-w-11 z-10 bg-transparent cursor-pointer"
                  aria-label="Diapositive suivante"
                />

                {/* Desktop : layout côte à côte */}
                <div className="hidden md:flex items-center min-h-90 md:min-h-105">
                  <div className="p-8 md:p-12 lg:p-16 flex-1 text-left flex flex-col items-start justify-center">
                    {heroBanners[bannerIndex].showTag &&
                      heroBanners[bannerIndex].tag && (
                        <span className="bg-indigo-600/30 border border-indigo-500/50 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                          {heroBanners[bannerIndex].tag}
                        </span>
                      )}
                    {heroBanners[bannerIndex].showTitle &&
                      heroBanners[bannerIndex].title && (
                        <p className="text-xs uppercase tracking-widest font-black text-(--color-accent) mb-1.5">
                          {heroBanners[bannerIndex].title}
                        </p>
                      )}
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight text-gray-900 font-sans max-w-lg text-glow-white-strong">
                      {heroBanners[bannerIndex].headline}
                    </h1>
                    <p className="text-sm text-gray-600 mt-3 max-w-md leading-relaxed font-sans text-glow-white">
                      {heroBanners[bannerIndex].sub}
                    </p>
                    <button
                      onClick={() => {
                        const banner = heroBanners[bannerIndex];
                        if (banner.productId) {
                          const target = products.find(
                            (p) => p.id === banner.productId,
                          );
                          if (target) {
                            setSelectedProduct(target);
                            setActiveGalleryIndex(0);
                          }
                        } else {
                          if (bannerIndex === 1) setSelectedEventType("sport");
                          else if (bannerIndex === 2)
                            setSelectedEventType("culture");
                          else {
                            setSelectedEventType(null);
                            setSelectedCategory(null);
                          }
                        }
                      }}
                      className="mt-6 bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-white font-sans font-black text-xs px-6 py-3.5 rounded-full btn-glow-white transition-all text-center uppercase tracking-wider flex items-center gap-2 group"
                    >
                      <span>{heroBanners[bannerIndex].cta}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                  <div className="relative flex-1 h-full flex items-center justify-center p-8 overflow-hidden select-none">
                    <div className="absolute inset-0 bg-radial-gradient from-transparent to-slate-950 opacity-40"></div>
                    <div className="relative z-1 w-52 h-52 md:w-72 md:h-72 rounded-full bg-indigo-500/10 border border-indigo-500/20 blur-xl animate-pulse"></div>
                    <img
                      src={heroBanners[bannerIndex].image}
                      alt={heroBanners[bannerIndex].headline}
                      className="absolute inset-0 z-2 w-full h-full object-cover rounded-2xl shadow-2xl border border-gray-200 rotate-2 hover:rotate-0 transition-transform duration-500"
                    />
                  </div>
                </div>

                {/* Mobile : image en arrière-plan, texte superposé */}
                <div className="flex md:hidden relative min-h-90">
                  {/* Image à droite avec fondu à gauche */}
                  <div className="absolute inset-y-0 right-0 w-3/5 overflow-hidden">
                    <img
                      src={heroBanners[bannerIndex].image}
                      alt={heroBanners[bannerIndex].headline}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-l from-transparent via-white/70 to-white"></div>
                  </div>
                  {/* Texte superposé à gauche */}
                  <div className="relative z-10 pt-4 px-6 flex flex-col min-h-90 w-full">
                    {heroBanners[bannerIndex].showTag &&
                      heroBanners[bannerIndex].tag && (
                        <span className="bg-indigo-600/30 border border-indigo-500/50 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3 self-start">
                          {heroBanners[bannerIndex].tag}
                        </span>
                      )}
                    {heroBanners[bannerIndex].showTitle &&
                      heroBanners[bannerIndex].title && (
                        <p className="text-xs uppercase tracking-widest font-black text-(--color-accent) mb-1.5">
                          {heroBanners[bannerIndex].title}
                        </p>
                      )}
                    <h1 className="text-2xl sm:text-3xl font-black leading-tight text-gray-900 font-sans max-w-[70%] text-glow-white-strong">
                      {heroBanners[bannerIndex].headline}
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 mt-auto mb-20 leading-snug font-sans max-w-[75%] text-glow-white">
                      {heroBanners[bannerIndex].sub}
                    </p>
                    {/* Button CTA */}
                    <button
                      onClick={() => {
                        const banner = heroBanners[bannerIndex];
                        if (banner.productId) {
                          const target = products.find(
                            (p) => p.id === banner.productId,
                          );
                          if (target) {
                            setSelectedProduct(target);
                            setActiveGalleryIndex(0);
                          }
                        } else {
                          if (bannerIndex === 1) setSelectedEventType("sport");
                          else if (bannerIndex === 2)
                            setSelectedEventType("culture");
                          else {
                            setSelectedEventType(null);
                            setSelectedCategory(null);
                          }
                        }
                      }}
                      className="mt-6 bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-white font-sans font-black text-xs px-6 py-3.5 rounded-full btn-glow-white transition-all text-center uppercase tracking-wider flex items-center gap-2 group"
                    >
                      <span>{heroBanners[bannerIndex].cta}</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Slider index */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
                  {heroBanners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        pauseAutoPlay();
                        setBannerIndex(i);
                      }}
                      className={`h-1.5 rounded-full transition-all ${bannerIndex === i ? "w-6 bg-white" : "w-1.5 bg-slate-600"}`}
                    ></button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Core Today deals segment & countdown triggers */}
          {(!dealExpired || dealFadingOut) && (
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
                    t-shirts et sweats de sport IA avant le coup d&apos;envoi du
                    prochain grand match !
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
                  {products.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedProduct(item);
                        setActiveGalleryIndex(0);
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
                            {item.price} $
                          </span>
                          {item.originalPrice && (
                            <span className="text-[10px] text-gray-500 line-through">
                              {item.originalPrice} $
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

          {/* Active Filtering Criteria Breadcrumb */}
          {(searchTerm || selectedCategory || selectedEventType) && (
            <section
              id="section-filters"
              className="section-container w-full px-4 scroll-mt-28"
            >
              <div className="bg-white/60 border border-gray-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-gray-500">Filtres actifs :</span>
                  {searchTerm && (
                    <span className="bg-gray-100 text-gray-900 font-bold px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1.5">
                      Recherche : &quot;{searchTerm}&quot;
                      <X
                        className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 cursor-pointer"
                        onClick={() => setSearchTerm("")}
                      />
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="bg-gray-100 text-gray-900 font-bold px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1.5 uppercase">
                      Catégorie : {selectedCategory}
                      <X
                        className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 cursor-pointer"
                        onClick={() => setSelectedCategory(null)}
                      />
                    </span>
                  )}
                  {selectedEventType && (
                    <span className="bg-gray-100 text-gray-900 font-bold px-2.5 py-1 rounded-md border border-gray-200 flex items-center gap-1.5 uppercase">
                      Événement : {selectedEventType}
                      <X
                        className="w-3.5 h-3.5 text-gray-500 hover:text-gray-900 cursor-pointer"
                        onClick={() => setSelectedEventType(null)}
                      />
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory(null);
                    setSelectedEventType(null);
                  }}
                  className="text-xs text-rose-400 hover:text-rose-600 font-extrabold hover:underline"
                >
                  Effacer tout
                </button>
              </div>
            </section>
          )}

          {/* Core eCommerce Products Listing */}
          <section
            id="section-catalog"
            className="section-container w-full px-4 scroll-mt-28"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 border-b border-gray-200 pb-3">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-(--color-accent) animate-pulse" />
                  Collection
                </h2>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                  <span>T-Shirts, Hoodies & Accessoires Événementiels</span>
                  <span className="sm:hidden text-gray-400 font-medium ml-auto">
                    ({filteredProducts.length})
                  </span>
                </p>
              </div>
              <div className="text-xs font-semibold text-gray-500 hidden sm:block">
                Affichage de{" "}
                <span className="text-gray-900 font-bold">
                  {filteredProducts.length}
                </span>{" "}
                designs uniques
              </div>
            </div>

            {loadingProducts ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-(--color-accent) animate-spin" />
                <p className="text-gray-500 text-sm">
                  Chargement des collections InstaWear...
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-white/20 max-w-lg mx-auto">
                <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                <p className="font-bold text-gray-900 mb-1">
                  Aucun vêtement ne correspond à votre recherche
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  Modifiez vos filtres ou lancez une autre recherche !
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory(null);
                    setSelectedEventType(null);
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{
                    background: "transparent",
                    color: "var(--color-accent)",
                    border: "1.5px solid var(--color-accent)",
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-accent)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-accent)";
                  }}
                >
                  Réinitialiser le Store
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {filteredProducts.map((product) => {
                  return (
                    <div
                      key={product.id}
                      className="bg-white/60 border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 transition-all text-left flex flex-col justify-between h-full relative"
                      id={`product-card-${product.id}`}
                    >
                      <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1.5">
                        {product.isBestSeller && (
                          <span className="bg-amber-500 text-slate-950 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow">
                            Best Seller
                          </span>
                        )}
                        {product.isLimitedTime &&
                          (!dealExpired || dealFadingOut) && (
                            <span
                              className={`bg-rose-500 text-gray-900 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow ${dealFadingOut ? "deal-fade-out" : "animate-pulse"}`}
                            >
                              Limited Deal
                            </span>
                          )}
                        {product.eventType === "live" && (
                          <span className="bg-white text-gray-900 text-[8px] font-black uppercase px-2 py-0.5 rounded shadow inline-flex items-center gap-1">
                            LIVE 2026{" "}
                            <span className="inline-block w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                          </span>
                        )}
                      </div>

                      <div
                        onClick={() => {
                          setSelectedProduct(product);
                          setActiveGalleryIndex(0);
                        }}
                        className="aspect-square rounded-t-xl bg-gray-50 overflow-hidden relative cursor-pointer"
                      >
                        <img
                          src={product.image || PLACEHOLDER_IMG}
                          alt={product.title}
                          className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                        />
                        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center bg-black/30 backdrop-blur-[1px]">
                          <span className="bg-white/95 dark:bg-gray-900/90 dark:text-gray-100 text-gray-900 font-bold text-xs px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-xl flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-(--color-accent)" />
                            Aperçu rapide
                          </span>
                        </div>
                        {/* Pilule couleurs sur l'image */}
                        <div className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-1 py-0.5 border border-gray-200/60 shadow-sm max-w-fit">
                          {product.colors.length <= 3 ? (
                            product.colors.map((c, idx) => (
                              <span
                                key={idx}
                                className="w-3 h-3 rounded-full border border-gray-200 block"
                                style={{ backgroundColor: c }}
                                title={product.colorNames?.[idx] || c}
                              />
                            ))
                          ) : (
                            <>
                              {product.colors.slice(0, 2).map((c, idx) => (
                                <span
                                  key={idx}
                                  className="w-3 h-3 rounded-full border border-gray-200 block"
                                  style={{ backgroundColor: c }}
                                  title={product.colorNames?.[idx] || c}
                                />
                              ))}
                              <span
                                className="color-wheel"
                                title={`+${product.colors.length - 2} couleurs`}
                              />
                            </>
                          )}
                        </div>
                        {/* Heart button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(product.id);
                          }}
                          className="absolute top-3 right-3 w-8.5 h-8.5 rounded-full flex items-center justify-center shadow-sm transition-transform duration-200 hover:scale-110"
                          style={{
                            background: favorites.includes(product.id)
                              ? "var(--color-accent)"
                              : "rgba(255,255,255,0.9)",
                            backdropFilter: "blur(8px)",
                            border: `1px solid ${favorites.includes(product.id) ? "transparent" : "var(--color-border)"}`,
                            zIndex: 5,
                          }}
                          aria-label={
                            favorites.includes(product.id)
                              ? "Retirer des favoris"
                              : "Ajouter aux favoris"
                          }
                        >
                          <Heart
                            size={14}
                            strokeWidth={2}
                            style={{
                              color: favorites.includes(product.id)
                                ? "white"
                                : "var(--color-ink2)",
                              fill: favorites.includes(product.id)
                                ? "white"
                                : "none",
                            }}
                          />
                        </button>
                      </div>

                      <div className="px-3 pt-2 pb-3 flex-1 flex flex-col justify-between">
                        <div>
                          {/* <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">
                            {product.brand}
                          </p> */}
                          <h4
                            onClick={() => {
                              setSelectedProduct(product);
                              setActiveGalleryIndex(0);
                            }}
                            className="text-xs md:text-sm font-bold text-gray-900 mt-0.5 leading-tight hover:text-(--color-accent) cursor-pointer line-clamp-2 min-h-8 md:min-h-10"
                          >
                            {product.title}
                          </h4>

                          <div className="flex items-center gap-1.5 mt-2 text-xs">
                            <div className="flex items-center text-amber-400 text-[11px]">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                              <span className="font-bold ml-0.5 mt-0.5">
                                {product.ratings.score.toFixed(1)}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-500">
                              ({product.ratings.count})
                            </span>
                            <span className="text-[10px] text-gray-600">|</span>
                            <span className="text-[10px] text-(--color-accent) font-sans tracking-wide">
                              {product.boughtLastMonth}+ achetés
                            </span>
                          </div>

                          {product.isLimitedTime &&
                            (!dealExpired || dealFadingOut) && (
                              <div
                                className={`bg-rose-900/30 border border-rose-800 rounded px-2 py-1 mt-2 flex items-center justify-between text-[10px] text-rose-600 ${dealFadingOut ? "deal-fade-out" : ""}`}
                              >
                                <span className="font-bold flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-rose-400 shrink-0" />{" "}
                                  Fin de l&apos;offre
                                </span>
                                <span className="font-mono font-bold text-rose-600">
                                  {countdownString}
                                </span>
                              </div>
                            )}

                          <div className="flex items-baseline gap-2 mt-2 mb-0.5">
                            <span className="text-lg font-black text-gray-900 font-sans">
                              {product.price.toFixed(2)}{" "}
                              <span className="text-[11px] font-medium text-gray-500">
                                $
                              </span>
                            </span>
                            {product.originalPrice && (
                              <span className="text-xs text-gray-500 line-through">
                                {product.originalPrice.toFixed(2)} $
                              </span>
                            )}
                          </div>

                          {SHOW_PRODUCT_DELIVERY_INFO && (
                            <div className="text-[10px] text-gray-500 leading-normal flex flex-col gap-0.5 mb-3 border-t border-gray-200/60 pt-2 font-sans">
                              <p className="text-(--color-accent) font-semibold flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Rejoindre
                                Choice
                              </p>
                              <p>
                                Livraison estimée pour{" "}
                                <span className="text-gray-900 font-semibold">
                                  {getDeliverEstimateString(4)}
                                </span>
                              </p>
                              <p className="text-gray-500">
                                Livraison suivie et sécurisée depuis l&apos;UE
                              </p>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() =>
                            addToCart(product, product.colors[0], "M")
                          }
                          className="w-full bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-cyan-400/40"
                          id={`btn-add-cart-list-${product.id}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-white" />
                          Ajouter au panier
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

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

      {/* Admin Creator Dashboard Screen 1 */}
      {/* {activeTab === "admin" && (
        <AdminDashboard
          products={products}
          fetchProducts={fetchProducts}
          printfulSettings={printfulSettings}
          setPrintfulSettings={setPrintfulSettings}
          handleDeleteProduct={handleDeleteProduct}
          handleSavePrintfulSettings={handleSavePrintfulSettings}
          generateAiDesignContent={generateAiDesignContent}
          handleSaveDesign={handleSaveDesign}
          triggerPrintfulSync={triggerPrintfulSync}
          newDesignPrompt={newDesignPrompt}
          setNewDesignPrompt={setNewDesignPrompt}
          newDesignTitle={newDesignTitle}
          setNewDesignTitle={setNewDesignTitle}
          newDesignDesc={newDesignDesc}
          setNewDesignDesc={setNewDesignDesc}
          newDesignTags={newDesignTags}
          setNewDesignTags={setNewDesignTags}
          newDesignPrice={newDesignPrice}
          setNewDesignPrice={setNewDesignPrice}
          newDesignCategory={newDesignCategory}
          setNewDesignCategory={setNewDesignCategory}
          newDesignEventType={newDesignEventType}
          setNewDesignEventType={setNewDesignEventType}
          newDesignStyle={newDesignStyle}
          setNewDesignStyle={setNewDesignStyle}
          newDesignImg={newDesignImg}
          setNewDesignImg={setNewDesignImg}
          isGeneratingAi={isGeneratingAi}
          isSavingDesign={isSavingDesign}
          isSyncingPrintful={isSyncingPrintful}
          showToast={showToast}
          setActiveTab={setActiveTab}
          MOCKUP_PRESETS={MOCKUP_PRESETS}
          PLACEHOLDER_IMG={PLACEHOLDER_IMG}
        />
      )} */}

      {/* Admin Creator Dashboard Screen 2 */}
      {activeTab === "admin" && (
        <AdminDashboardNew onReturnToStore={() => setActiveTab("store")} />
      )}

      {/* Product Detailed Sheet Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-55 overflow-y-auto bg-gray-50/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div
            className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
            id="modal-product-details"
          >
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900 w-9 h-9 rounded-full flex items-center justify-center transition-all z-10"
              id="btn-close-details-modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
              <div>
                <div className="aspect-4/5 bg-gray-50 rounded-2xl overflow-hidden border border-gray-200 relative">
                  {selectedProduct.isBestSeller && (
                    <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow">
                      BEST SELLER
                    </span>
                  )}
                  {selectedProduct.isLimitedTime &&
                    (!dealExpired || dealFadingOut) && (
                      <span
                        className={`absolute top-3 right-3 bg-rose-500 text-gray-900 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow ${dealFadingOut ? "deal-fade-out" : "animate-pulse"}`}
                      >
                        LIMITED time
                      </span>
                    )}

                  <img
                    src={(() => {
                      // Fusionne l'image principale + la galerie en un seul tableau
                      const allImages = [
                        selectedProduct.image || PLACEHOLDER_IMG,
                        ...(selectedProduct.gallery || []),
                      ];
                      return allImages[activeGalleryIndex] || PLACEHOLDER_IMG;
                    })()}
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                    style={{ filter: "none" }}
                  />
                </div>

                {(() => {
                  const allImages = [
                    selectedProduct.image || PLACEHOLDER_IMG,
                    ...(selectedProduct.gallery || []),
                  ];
                  if (allImages.length <= 1) return null;
                  return (
                    <div className="grid grid-cols-4 gap-2.5 mt-3 select-none">
                      {allImages.map((img, idx) => (
                        <div
                          key={idx}
                          onClick={() => setActiveGalleryIndex(idx)}
                          className={`aspect-square rounded-lg overflow-hidden border cursor-pointer transition-all ${activeGalleryIndex === idx ? "border-cyan-400 bg-(--color-accent-bg)" : "border-gray-200 hover:border-gray-200"}`}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="mt-4 p-3 bg-gray-50/40 border border-gray-200 rounded-xl flex items-center gap-2.5 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-(--color-accent)" />
                  <p>
                    Garanti sans substances toxiques - Impression certifiée
                    OEKO-TEX®
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <span className="text-[10px] bg-gray-100 px-3 py-1 rounded text-gray-500 uppercase tracking-widest font-bold">
                    {selectedProduct.brand} ORIGINAL
                  </span>

                  <h3 className="text-xl md:text-2xl font-black text-gray-900 mt-2 leading-tight">
                    {selectedProduct.title}
                  </h3>

                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <div className="flex items-center text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${i < Math.floor(selectedProduct.ratings.score) ? "fill-amber-400 text-amber-400" : "text-gray-600"}`}
                        />
                      ))}
                      <span className="font-extrabold ml-1 pt-0.5">
                        {selectedProduct.ratings.score.toFixed(1)}/5.0
                      </span>
                    </div>
                    <span className="text-gray-500">
                      ({selectedProduct.ratings.count} évaluations vérifiées)
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-4 p-4 bg-gray-50/60 rounded-xl border border-gray-200">
                    <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        Prix de l&apos;événement
                      </p>
                      <p className="text-2xl md:text-3xl font-black text-gray-900 font-sans mt-0.5">
                        {selectedProduct.price.toFixed(2)} $
                      </p>
                    </div>
                    {selectedProduct.originalPrice && (
                      <div className="text-xs text-gray-500 leading-normal pl-2 border-l border-gray-200">
                        <p className="line-through">
                          {selectedProduct.originalPrice.toFixed(2)} $
                        </p>
                        <p className="text-rose-400 font-semibold">
                          -
                          {Math.round(
                            (1 -
                              selectedProduct.price /
                                selectedProduct.originalPrice) *
                              100,
                          )}
                          % de réduction
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 text-xs text-gray-600 leading-relaxed space-y-2 font-sans border-b border-gray-200 pb-5">
                    <p className="font-bold text-gray-500 uppercase tracking-wider">
                      Fiche technique du vêtement :
                    </p>
                    {selectedProduct.fullDescription ? (
                      <div className="whitespace-pre-line text-gray-600 font-sans space-y-1">
                        {selectedProduct.fullDescription}
                      </div>
                    ) : (
                      <p className="italic text-gray-500">
                        {selectedProduct.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Couleur :{" "}
                      {pickedColor
                        ? selectedProduct.colorNames?.[
                            selectedProduct.colors.indexOf(pickedColor)
                          ] || pickedColor
                        : "Sélectionner"}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProduct.colors.map((c, idx) => {
                        const isPicked =
                          pickedColor === c || (!pickedColor && idx === 0);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setPickedColor(c);
                              if (!pickedColor && idx === 0) setPickedColor(c);
                            }}
                            className={`w-9 h-9 rounded-full border-2 transition-all p-0.5 ${isPicked ? "border-cyan-400 scale-105 shadow-md shadow-cyan-400/20" : "border-gray-200 hover:border-gray-200"}`}
                            style={{ backgroundColor: c }}
                            title={selectedProduct.colorNames?.[idx] || ""}
                          ></button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Taille : {pickedSize}
                      </label>
                      <button
                        onClick={() => setSizeGuideOpen(!sizeGuideOpen)}
                        className="text-[10px] text-(--color-accent) hover:underline flex items-center gap-1"
                      >
                        <Info className="w-3 h-3" /> Guide des tailles
                      </button>
                    </div>

                    {sizeGuideOpen && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-[10px] text-gray-500 mb-3 animate-in fade-in">
                        <p className="font-bold text-gray-900">
                          Mesures de la coupe unisexe (cm) :
                        </p>
                        <table className="w-full text-left mt-1 border-collapse text-gray-600">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="py-1">Taille</th>
                              <th>Buste (A)</th>
                              <th>Longueur (B)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-0.5">S</td>
                              <td>48 cm</td>
                              <td>69 cm</td>
                            </tr>
                            <tr>
                              <td className="py-0.5">M</td>
                              <td>51 cm</td>
                              <td>72 cm</td>
                            </tr>
                            <tr>
                              <td className="py-0.5">L</td>
                              <td>54 cm</td>
                              <td>74 cm</td>
                            </tr>
                            <tr>
                              <td className="py-0.5">XL</td>
                              <td>57 cm</td>
                              <td>76 cm</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.sizes.map((s) => (
                        <button
                          key={s}
                          onClick={() => setPickedSize(s)}
                          className={`min-w-10 h-8 rounded border text-xs font-bold transition-all uppercase px-2.5 ${pickedSize === s ? "border-cyan-400 bg-(--color-accent-bg) text-cyan-300" : "border-gray-200 hover:border-gray-200 text-gray-600 bg-gray-50/60"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="p-3.5 bg-gray-50/60 rounded-xl border border-gray-200 text-xs text-gray-600 font-sans">
                    <p className="text-(--color-accent) font-black flex items-center gap-1 mb-1">
                      <Truck className="w-3.5 h-3.5 text-(--color-accent)" />{" "}
                      Options de livraison Prime Choice
                    </p>
                    <p>
                      Frais d&apos;expédition :{" "}
                      <span className="text-emerald-600 font-bold">
                        GRATUIT dès 35$ d&apos;achat !
                      </span>
                    </p>
                    <p className="text-gray-500 mt-1">
                      Fabriqué sous 24h puis livré chez vous le{" "}
                      <strong className="text-gray-900">
                        {getDeliverEstimateString(4)}
                      </strong>
                    </p>
                  </div>

                  {/* Favorite button in modal */}
                  <button
                    onClick={() => toggleFavorite(selectedProduct.id)}
                    className="p-3 rounded-xl transition-all duration-150 mb-2"
                    style={{
                      background: favorites.includes(selectedProduct.id)
                        ? "#FEF2F2"
                        : "var(--color-surface2)",
                      border: `1.5px solid ${favorites.includes(selectedProduct.id) ? "#FECACA" : "var(--color-border)"}`,
                      color: favorites.includes(selectedProduct.id)
                        ? "#EF4444"
                        : "var(--color-ink3)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      width: "fit-content",
                    }}
                  >
                    <Heart
                      size={18}
                      strokeWidth={2}
                      fill={
                        favorites.includes(selectedProduct.id)
                          ? "#EF4444"
                          : "none"
                      }
                    />
                    {favorites.includes(selectedProduct.id)
                      ? "Retirer des favoris"
                      : "Ajouter aux favoris"}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        addToCart(
                          selectedProduct,
                          pickedColor || selectedProduct.colors[0],
                          pickedSize,
                        );
                      }}
                      className="flex-1 bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-500/10 hover:shadow-cyan-400/20"
                      id="btn-modal-add-cart"
                    >
                      Ajouter au panier
                    </button>

                    <button
                      onClick={() => {
                        addToCart(
                          selectedProduct,
                          pickedColor || selectedProduct.colors[0],
                          pickedSize,
                        );
                        setCartOpen(true);
                        setSelectedProduct(null);
                      }}
                      className="flex-1 bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs py-3.5 px-4 rounded-xl uppercase tracking-wider transition-all shadow-lg hover:shadow-amber-400/20"
                      id="btn-modal-fast-buy"
                    >
                      Acheter maintenant
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Shopping Cart drawer */}
      {cartOpen && (
        <div
          className="fixed inset-y-0 right-0 z-55 w-full max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-300"
          id="drawer-shopping-cart"
        >
          <div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
              <h3 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <ShoppingBag className="w-5.5 h-5.5 text-(--color-accent)" />
                Votre Panier Choice
              </h3>
              <button
                onClick={() => setCartOpen(false)}
                className="text-gray-500 hover:text-gray-900"
                id="btn-close-cart-panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderCompleted ? (
              <div className="py-12 text-center flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-600 animate-bounce" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-lg">
                    Commande en cours d&apos;envoi !
                  </h4>
                  <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed">
                    Nous validons votre transaction de test sécurisée. Le design
                    est en cours de transmission à notre atelier Printful...
                  </p>
                </div>
                <div className="w-full bg-gray-50 p-4 rounded-xl border border-gray-200 mt-2 uppercase font-mono text-[10px] text-gray-500 max-w-xs text-left leading-normal space-y-1">
                  <p className="font-bold text-gray-500">
                    &gt;_ STAGE_PRINT_LOG
                  </p>
                  <p>&gt; Connection established with usine</p>
                  <p>&gt; Transmission of design: active</p>
                </div>
              </div>
            ) : cart.length === 0 ? (
              <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-gray-700 mb-2" />
                <p className="font-bold text-gray-500">Votre panier est vide</p>
                <p className="text-xs text-gray-500 mt-1">
                  Parcourez nos collections exclusives pour ajouter des
                  articles.
                </p>
                <button
                  onClick={() => {
                    setCartOpen(false);
                    setActiveTab("store");
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200"
                  style={{
                    background: "transparent",
                    color: "var(--color-accent)",
                    border: "1.5px solid var(--color-accent)",
                    fontFamily: "var(--font-sans)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-accent)";
                    e.currentTarget.style.color = "white";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--color-accent)";
                  }}
                >
                  Continuer mes achats
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {cart.map((item, idx) => {
                  return (
                    <div
                      key={idx}
                      className="flex gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200 relative"
                    >
                      <div className="w-16 h-20 bg-white rounded-lg overflow-hidden shrink-0">
                        <img
                          src={item.product.image || PLACEHOLDER_IMG}
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
                            {item.product.brand}
                          </p>
                          <h4 className="text-xs text-gray-900 font-bold line-clamp-1">
                            {item.product.title}
                          </h4>

                          <div className="flex items-center gap-2 mt-1 select-none">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-gray-200 block"
                              style={{ backgroundColor: item.selectedColor }}
                            ></span>
                            <span className="text-[10px] text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200 uppercase font-semibold">
                              Taille: {item.selectedSize}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs font-black text-gray-900">
                            {item.product.price.toFixed(2)} $
                          </span>

                          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1">
                            <button
                              onClick={() => updateCartQty(idx, -1)}
                              className="text-gray-500 hover:text-gray-900 px-2 py-0.5 text-xs font-black"
                            >
                              -
                            </button>
                            <span className="text-xs text-gray-900 font-bold px-1.5">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQty(idx, 1)}
                              className="text-gray-500 hover:text-gray-900 px-2 py-0.5 text-xs font-black"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(idx)}
                        className="absolute top-2 right-2 text-gray-600 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!orderCompleted && cart.length > 0 && (
            <div className="border-t border-gray-200 pt-4 space-y-4">
              <div className="space-y-1.5 text-xs text-gray-500">
                <div className="flex justify-between items-center">
                  <span>Sous-total articles :</span>
                  <span className="font-bold text-gray-900">
                    {cartTotal.toFixed(2)} $
                  </span>
                </div>
                <div className="flex justify-between items-center text-(--color-accent) font-medium">
                  <span>Livraison Choice suivie :</span>
                  <span>{cartTotal >= 35 ? "GRATUITE" : "4.99 $"}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-2.5 text-sm">
                  <span className="font-extrabold text-gray-900">
                    Montant Total :
                  </span>
                  <span className="font-black text-gray-900 text-base">
                    {cartTotal >= 35
                      ? cartTotal.toFixed(2)
                      : (cartTotal + 4.99).toFixed(2)}{" "}
                    $
                  </span>
                </div>
              </div>

              {cartTotal < 35 && (
                <div className="p-3 bg-violet-950/40 border border-violet-800/40 rounded-xl text-[11px] text-violet-600">
                  <p className="font-semibold">
                    💡 Astuce d&apos;expédition Choice
                  </p>
                  <p className="mt-0.5">
                    Ajoutez encore{" "}
                    <strong className="text-gray-900">
                      {(35 - cartTotal).toFixed(2)} $
                    </strong>{" "}
                    d&apos;articles pour débloquer la livraison gratuite !
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
                className="w-full bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-black text-sm p-4 rounded-xl uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 select-none"
                id="btn-fast-checkout"
              >
                Passer la commande
              </button>

              <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                Paiement de démonstration crypté en 256 bits. Les vêtements
                seront automatiquement mappés et envoyés en fabrication à notre
                atelier Printful.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Global Brand Footer avec logo officiel */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12 px-4 mt-auto">
        <div
          className={`section-container grid grid-cols-1 ${isAdmin ? "md:grid-cols-4" : "md:grid-cols-3"} gap-8`}
        >
          <div className="space-y-4">
            <div className="flex items-center gap-1.5">
              <img
                src={LOGO_URL}
                alt="InstaWear Logo"
                className="w-8 h-8 rounded-lg object-cover"
              />
              <span className="font-black text-lg text-gray-900">
                InstaWear
              </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              Le premier marketplace autonome d&apos;impression à la demande
              calibré pour les événements mondiaux.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-(--color-accent) transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-(--color-accent) transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-(--color-accent) transition-colors"
              >
                <Facebook className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">
              Événements
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-500">
              <li>
                <button
                  onClick={() => {
                    setSelectedEventType("sport");
                    setActiveTab("store");
                  }}
                  className="hover:text-(--color-accent) transition-colors"
                >
                  Ligue de Champions finals
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setSelectedEventType("culture");
                    setActiveTab("store");
                  }}
                  className="hover:text-(--color-accent) transition-colors"
                >
                  Carnaval de Rio Neon
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setSelectedEventType("culture");
                    setActiveTab("store");
                  }}
                  className="hover:text-(--color-accent) transition-colors"
                >
                  Oktoberfest bavarois
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    setSelectedEventType("saisonnier");
                    setActiveTab("store");
                  }}
                  className="hover:text-(--color-accent) transition-colors"
                >
                  Halloween Glow
                </button>
              </li>
            </ul>
          </div>

          {isAdmin && (
            <div>
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">
                Créateur Hub
              </h4>
              <ul className="space-y-2.5 text-xs text-gray-500">
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("admin");
                      setTimeout(() => {
                        document
                          .getElementById("view-creator-dashboard")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 100);
                    }}
                    className="hover:text-(--color-accent) transition-colors"
                  >
                    Formulaire de design POD
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("admin");
                      setTimeout(() => {
                        document
                          .getElementById("view-creator-dashboard")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 100);
                    }}
                    className="hover:text-(--color-accent) transition-colors"
                  >
                    Configuration API Printful
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("admin");
                      setTimeout(() => {
                        document
                          .getElementById("view-creator-dashboard")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 100);
                    }}
                    className="hover:text-(--color-accent) transition-colors"
                  >
                    Zéro Budget guide
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setActiveTab("admin");
                      setTimeout(() => {
                        document
                          .getElementById("view-creator-dashboard")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 100);
                    }}
                    className="hover:text-(--color-accent) transition-colors"
                  >
                    Générateur Gemini AI
                  </button>
                </li>
              </ul>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">
              Abonnement Newsletter
            </h4>
            <p className="text-xs text-gray-500 leading-relaxed font-sans">
              Abonnez-vous pour être alerté en amont des collections limitées de
              chaque futur événement !
            </p>
            {newsletterSubscribed ? (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded text-xs">
                ✓ Merci ! Vous êtes officiellement sur la liste d&apos;alerte.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newsletterEmail) {
                    setNewsletterSubscribed(true);
                    setTimeout(() => {
                      setNewsletterSubscribed(false);
                      setNewsletterEmail("");
                      setValidEmail(false);
                    }, 5000);
                  }
                }}
                className="flex items-center gap-1"
              >
                <input
                  type="email"
                  placeholder="votre-email@adresse.com"
                  value={newsletterEmail}
                  onChange={(e) => {
                    setNewsletterEmail(e.target.value);
                    setValidEmail(
                      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value),
                    );
                  }}
                  className="bg-white border border-gray-200 rounded p-2 text-xs text-gray-900 flex-1 focus:border-cyan-400 focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="p-2 rounded transition-all duration-200"
                  style={{
                    background: validEmail
                      ? "var(--color-accent)"
                      : "transparent",
                    color: validEmail ? "white" : "var(--color-accent)",
                    border: validEmail
                      ? "1.5px solid var(--color-accent)"
                      : "1.5px solid var(--color-accent)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="section-container mt-12 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500 font-sans">
          <p>
            © 2026 InstaWear Inc. Tous droits réservés. Propulsé par Cloud Run,
            Next.js commerce & l&apos;API Printful.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">
              Mentions légales
            </a>
            <span>•</span>
            <a href="#" className="hover:underline">
              Politique d&apos;impression Choice
            </a>
            <span>•</span>
            <a href="#" className="hover:underline">
              CGU Créateurs
            </a>
            <span>•</span>
            {isAdmin && (
              <button
                onClick={() => setShowNewAdmin(true)}
                className="hover:text-(--color-accent) transition-colors bg-transparent border-none cursor-pointer text-[11px] text-gray-500"
              >
                Menu Admin (Bêta)
              </button>
            )}
          </div>
        </div>
      </footer>

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

      {/* Checkout Modal (WhatsApp/Telegram/Email) */}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          cartTotal={cartTotal}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCart([]);
            setOrderCompleted(false);
            showToast(
              "🚀 Commande transmise ! Vérifiez votre messagerie.",
              "success",
            );
          }}
        />
      )}

      {/* OrderTrackingModal Modal */}
      {trackingOpen && (
        <OrderTrackingModal onClose={() => setTrackingOpen(false)} />
      )}
    </div>
  );
}
