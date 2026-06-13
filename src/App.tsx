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
import { Product, CartItem, PrintfulSettings } from "./types";
import { DEFAULT_PRODUCTS } from "./data/defaultProducts";

// Preset mockup templates with placeholder images
const PLACEHOLDER_IMG =
  "https://i5.walmartimages.com/seo/Haiti-Haitian-Flag-Coat-of-Arms-Red-Men-Zipper-T-shirt-Summer-Casual-Short-Sleeve-T-shirt-Top_4abff044-fb73-40b5-b666-b1d93754eb3b.c531c430d04c42d5dc091756c19ffccc.jpeg?odnHeight=573&odnWidth=573&odnBg=FFFFFF";
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
// ── Hero badges visibility switch ──
const SHOW_HERO_BADGES = false; // passer à true pour réactiver tag + title

// ── Product delivery info visibility switch ──
const SHOW_PRODUCT_DELIVERY_INFO = false; // passer à true pour afficher les infos de livraison sur les cartes

export default function App() {
  // Store States
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderCompleted, setOrderCompleted] = useState(false);

  const [dealExpired, setDealExpired] = useState(false);
  const [dealFadingOut, setDealFadingOut] = useState(false); // état de transition

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
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "success" | "info" | "error";
  } | null>(null);

  // Printful test endpoints loading
  const [isSyncingPrintful, setIsSyncingPrintful] = useState(false);

  // Frontpage Banner States
  const [bannerIndex, setBannerIndex] = useState(0);
  // const [countdownString, setCountdownString] = useState("04:38:55"); // -> compteur est une heure UTC inversée

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [validEmail, setValidEmail] = useState(false);

  // Load products & settings on mount
  useEffect(() => {
    fetchProducts();
    fetchSettings();
  }, []);

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
    type: "success" | "info" | "error" = "success",
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        // Réponse non-ok → fallback
        setProducts(DEFAULT_PRODUCTS);
      }
    } catch (err) {
      console.warn("API indisponible, chargement des produits mockés :", err);
      setProducts(DEFAULT_PRODUCTS);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/printful/settings");
      if (res.ok) {
        const data = await res.json();
        setPrintfulSettings(data);
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
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

    return matchesSearch && matchesCategory && matchesEventType;
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

  const simulateCheckout = () => {
    if (cart.length === 0) return;
    setOrderCompleted(true);
    setTimeout(() => {
      setCart([]);
      setOrderCompleted(false);
      setCartOpen(false);
      showToast(
        "🚀 Commande reçue ! Envoyée automatiquement en production à l'atelier d'impression Printful !",
        "success",
      );
    }, 4000);
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

  // Hero Carousel banners content (using placeholder images)
  const heroBanners = [
    {
      title: "InstaWear Concept",
      headline: "Wear the Moment. Grab the Energy.",
      sub: "Up to 40% off AI-powered drops for sports, music & seasons. Premium, fast, reactive.",
      cta: "Découvrir",
      bgGradient: "from-white via-indigo-50 to-white",
      image: PLACEHOLDER_IMG,
      tag: "⚡ EN COURS DE PRODUCTION",
    },
    {
      title: "UEFA Champions League Finals",
      headline: "Wear the Final. Own the Stadium.",
      sub: "Up to 40% off organic cotton shirts printed at lightning speed. Your color, your legend.",
      cta: "Découvrir",
      bgGradient: "from-white via-blue-50 to-white",
      image: PLACEHOLDER_IMG,
      tag: "🏆 SPORT VIBES",
    },
    {
      title: "Rio Carnival Glow Edition",
      headline: "Wear the Samba. Live the Glow.",
      sub: "Up to 40% off neon AI art that dances like Rio. Pure carnival energy, no waiting.",
      cta: "Explorer",
      bgGradient: "from-white via-pink-50 to-white",
      image: PLACEHOLDER_IMG,
      tag: "🎉 SELECTION CULTURE",
    },
  ];

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
    setActiveTab("store");
    setTimeout(() => {
      const el = document.getElementById("section-catalog");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
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
          setSelectedCategory(cat);
          setActiveTab("store");
        }}
        onSelectEventType={(type) => {
          setSelectedEventType(type);
          setActiveTab("store");
        }}
        currentEventType={selectedEventType}
        currentCategory={selectedCategory}
        onOpenAdmin={() =>
          setActiveTab(activeTab === "store" ? "admin" : "store")
        }
        isAdminActive={activeTab === "admin"}
        onScrollToSection={scrollToSection}
        searchSuggestions={productTitles}
        products={products}
      />

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-55 max-w-sm bg-white border-l-4 border-cyan-400 p-4 rounded-r shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <Sparkles className="w-5 h-5 text-(--color-accent) shrink-0 mt-0.5 animate-bounce" />
          <div>
            <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              InstaWear Hub
            </p>
            <p className="text-sm text-gray-600 mt-1">{toastMessage.text}</p>
          </div>
        </div>
      )}

      {/* Client Customer Main Storefront View */}
      {activeTab === "store" && (
        <main
          className="flex-1 flex flex-col gap-8 pb-16"
          id="view-customer-storefront"
        >
          {/* Dynamic Hero Carousel Banner */}
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
                  {SHOW_HERO_BADGES && (
                    <span className="bg-indigo-600/30 border border-indigo-500/50 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-4 btn-glow-white">
                      {heroBanners[bannerIndex].tag}
                    </span>
                  )}
                  {SHOW_HERO_BADGES && (
                    <p className="text-xs uppercase tracking-widest font-black text-(--color-accent) mb-1.5 text-glow-white">
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
                      if (bannerIndex === 1) setSelectedEventType("sport");
                      else if (bannerIndex === 2)
                        setSelectedEventType("culture");
                      else {
                        setSelectedEventType(null);
                        setSelectedCategory(null);
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
                  {SHOW_HERO_BADGES && (
                    <span className="bg-indigo-600/30 border border-indigo-500/50 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3 self-start btn-glow-white">
                      {heroBanners[bannerIndex].tag}
                    </span>
                  )}
                  {SHOW_HERO_BADGES && (
                    <p className="text-xs uppercase tracking-widest font-black text-(--color-accent) mb-1.5 text-glow-white">
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
                      if (bannerIndex === 1) setSelectedEventType("sport");
                      else if (bannerIndex === 2)
                        setSelectedEventType("culture");
                      else {
                        setSelectedEventType(null);
                        setSelectedCategory(null);
                      }
                    }}
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-white font-sans font-black text-xs px-5 py-3 rounded-full btn-glow-white uppercase tracking-wider flex items-center gap-2 z-10 whitespace-nowrap"
                  >
                    <span>{heroBanners[bannerIndex].cta}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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
                    DÈS 5.99€ L&apos;ACCESSOIRE
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
                            {item.price} €
                          </span>
                          {item.originalPrice && (
                            <span className="text-[10px] text-gray-500 line-through">
                              {item.originalPrice} €
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
                  className="bg-indigo-600 hover:bg-indigo-700 text-gray-900 font-bold text-xs px-5 py-2 rounded-lg"
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
                        className="aspect-4/5 rounded-t-xl bg-gray-50 overflow-hidden relative cursor-pointer"
                      >
                        <img
                          src={product.image || PLACEHOLDER_IMG}
                          alt={product.title}
                          className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gray-50/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                          <span className="bg-white/90 text-gray-900 font-bold text-xs px-3.5 py-1.5 rounded-full border border-gray-200 shadow-xl flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-(--color-accent)" />
                            Aperçu rapide
                          </span>
                        </div>
                        {/* Pilule couleurs sur l'image */}
                        <div className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-gray-200/60 shadow-sm max-w-fit">
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
                      </div>

                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          {/* <p className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest">
                            {product.brand}
                          </p> */}
                          <h4
                            onClick={() => {
                              setSelectedProduct(product);
                              setActiveGalleryIndex(0);
                            }}
                            className="text-xs md:text-sm font-bold text-gray-900 mt-1 leading-tight hover:text-(--color-accent) cursor-pointer line-clamp-2 min-h-8 md:min-h-10"
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

                          <div className="flex items-baseline gap-2 mt-3 mb-1">
                            <span className="text-lg font-black text-gray-900 font-sans">
                              {product.price.toFixed(2)}{" "}
                              <span className="text-[11px] font-medium text-gray-500">
                                €
                              </span>
                            </span>
                            {product.originalPrice && (
                              <span className="text-xs text-gray-500 line-through">
                                {product.originalPrice.toFixed(2)} €
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
                    📦 Free Delivery over 35€
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
        </main>
      )}

      {/* Admin Creator Dashboard Screen */}
      {activeTab === "admin" && (
        <main
          className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 animate-in fade-in duration-200"
          id="view-creator-dashboard"
        >
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="bg-indigo-600/30 border border-indigo-500/50 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
                🛠️ CREATOR STUDIO (ADMIN)
              </span>
              <h2 className="text-2xl font-black text-gray-900 mt-3">
                Gérer votre Boutique & API Printful
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Concevez de nouveaux design à la demande avec l’aide de Gemini,
                liez les produits à l’usine, et suivez la synchronisation.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab("store")}
                className="bg-gray-100 hover:bg-slate-700 border border-gray-200 text-gray-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                id="btn-admin-close"
              >
                Retourner sur le Store
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Block - Gemini Form & Product creation */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-3">
                  <Sparkles className="w-5.5 h-5.5 text-(--color-accent) animate-pulse" />
                  <h3 className="font-extrabold text-gray-900 text-base">
                    Nouveau Design Assisté par IA
                  </h3>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    1. Idée de design ou Prompt d&apos;inspiration :
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Un design néon violet et turquoise pour fêter la finale de la Ligue des Champions 2026, avec des éclairs et une silhouette de ballon stylisé..."
                    value={newDesignPrompt}
                    onChange={(e) => setNewDesignPrompt(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20"
                    id="input-ai-prompt"
                  />
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    Saisissez un concept de vêtement mondial ou saisonnier.
                    Notre IA server-side rédigera un titre SEO et une
                    description avec bullet-points.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Catégorie :
                    </label>
                    <select
                      value={newDesignCategory}
                      onChange={(e: any) =>
                        setNewDesignCategory(e.target.value)
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900"
                    >
                      <option value="tshirt">👕 T-shirt Premium</option>
                      <option value="hoodie">🧥 Hoodie Streetwear</option>
                      <option value="accessory">🧢 Casquette trucker</option>
                      <option value="mug">☕ Mug collector</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Cycle d&apos;Événement :
                    </label>
                    <select
                      value={newDesignEventType}
                      onChange={(e: any) =>
                        setNewDesignEventType(e.target.value)
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900"
                    >
                      <option value="live">⚡ En cours (LIVE)</option>
                      <option value="sport">🏆 Événement Sportif</option>
                      <option value="culture">🎭 Festival / Culture</option>
                      <option value="saisonnier">❄️ Saison / Fêtes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Style Graphique :
                    </label>
                    <select
                      value={newDesignStyle}
                      onChange={(e: any) => setNewDesignStyle(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-900"
                    >
                      <option value="street">Street & Cyberpunk</option>
                      <option value="retro">Vintage & Rétro</option>
                      <option value="cute">Cute & Kawaii</option>
                      <option value="commute">Elegance Commute</option>
                      <option value="cozy">Confort Minimal</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end mb-6">
                  <button
                    type="button"
                    onClick={generateAiDesignContent}
                    disabled={isGeneratingAi}
                    className="bg-indigo-600 hover:bg-indigo-500 text-gray-900 font-bold text-xs px-5 py-2.5 rounded-lg transition-all flex items-center gap-2"
                    id="btn-trigger-gemini-ai"
                  >
                    {isGeneratingAi ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Génération par Gemini en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Générer Titre & Description avec l&apos;IA
                      </>
                    )}
                  </button>
                </div>

                <form
                  onSubmit={handleSaveDesign}
                  className="space-y-4 border-t border-gray-200 pt-5"
                >
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                    2. Détails et validation d&apos;importation
                  </p>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-gray-500 mb-1">
                      Titre de l&apos;article commercial (SEO) :
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: T-Shirt Neon Samba Celebration Carnival"
                      value={newDesignTitle}
                      onChange={(e) => setNewDesignTitle(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold tracking-wider text-gray-500 mb-1">
                      Description e-commerce détaillée :
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Listes à puces décrivant la matière, le type d'impression, les particularités uniques du design..."
                      value={newDesignDesc}
                      onChange={(e) => setNewDesignDesc(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-600 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold tracking-wider text-gray-500 mb-1">
                        Prix de vente souhaité (€) :
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={newDesignPrice}
                        onChange={(e) => setNewDesignPrice(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900"
                      />
                      <p className="text-[10px] text-gray-500 mt-1">
                        Coût d&apos;impression usine moyen : ~12.50€. Votre
                        marge nette est d&apos;environ 50% !
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold tracking-wider text-gray-500 mb-1">
                        Mots-clés / Tags (séparés par des virgules) :
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Football, Retro, Munich, Biere"
                        value={newDesignTags.join(", ")}
                        onChange={(e) =>
                          setNewDesignTags(
                            e.target.value.split(",").map((s) => s.trim()),
                          )
                        }
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                      3. Sélectionner un visuel de Mockup (Base) :
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {MOCKUP_PRESETS.map((preset, idx) => (
                        <div
                          key={idx}
                          onClick={() => setNewDesignImg(preset.url)}
                          className={`border rounded-lg p-1 cursor-pointer transition-all ${newDesignImg === preset.url ? "border-cyan-400 bg-(--color-accent-bg)" : "border-gray-200 hover:border-gray-200 bg-gray-50"}`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="aspect-square object-cover rounded"
                          />
                          <p className="text-[9px] text-gray-500 font-medium truncate mt-1 text-center">
                            {preset.name.split(" ")[0]}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                      Ces visuels représentent de parfaits patrons de mannequins
                      pour exposer vos créations d&apos;encre.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingDesign}
                    className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs p-4 rounded-xl uppercase tracking-wider font-sans transition-all flex items-center justify-center gap-2"
                    id="btn-submit-save-product"
                  >
                    {isSavingDesign ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Sauvegarde et synchronisation usine...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-slate-950 font-bold" />
                        Publier sur InstaWear & Linker Printful
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h4 className="font-bold text-gray-900 text-sm mb-4">
                  Vos Designs Personnels
                </h4>
                <div className="space-y-3">
                  {products.filter((p) => p.id.startsWith("custom-prod-"))
                    .length === 0 ? (
                    <p className="text-xs text-gray-500 italic">
                      Aucun design de création n&apos;est enregistré dans de la
                      base locale.
                    </p>
                  ) : (
                    products
                      .filter((p) => p.id.startsWith("custom-prod-"))
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={item.image || PLACEHOLDER_IMG}
                              alt={item.title}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <div>
                              <p className="text-xs text-gray-900 font-bold">
                                {item.title}
                              </p>
                              <p className="text-[10px] text-indigo-400 font-mono uppercase font-semibold">
                                {item.category} | {item.eventType}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedProduct(item);
                                setActiveTab("store");
                              }}
                              className="bg-white text-gray-600 p-2 rounded hover:text-gray-900 border border-gray-200"
                            >
                              👁️ Voir
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(item.id)}
                              className="bg-rose-500/10 text-rose-400 p-2 rounded hover:bg-rose-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Block - Printful credentials & guides */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider">
                    Connexion Printful API
                  </h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                  Pour ne débourser aucun centime avant de réaliser votre
                  première vente, connectez votre jeton développeur Printful
                  gratuitement.
                </p>

                <form
                  onSubmit={handleSavePrintfulSettings}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      Nom du Store d&apos;Impression :
                    </label>
                    <input
                      type="text"
                      value={printfulSettings.storeName}
                      onChange={(e) =>
                        setPrintfulSettings({
                          ...printfulSettings,
                          storeName: e.target.value,
                        })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-900"
                      placeholder="Ex: InstaWear Boutique No. 1"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-bold text-gray-500">
                        Jeton API Printful (ou Printify) :
                      </label>
                      <a
                        href="https://developers.printful.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-(--color-accent) hover:underline"
                      >
                        Trouver ma clé &rarr;
                      </a>
                    </div>
                    <input
                      type="password"
                      value={printfulSettings.apiKey}
                      onChange={(e) =>
                        setPrintfulSettings({
                          ...printfulSettings,
                          apiKey: e.target.value,
                        })
                      }
                      className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-xs font-mono text-gray-900"
                      placeholder="Ex: pr_a89sdh023jla..."
                    />
                    <p className="text-[10px] text-gray-500 mt-1 leading-normal">
                      Votre clé reste cryptée sur votre conteneur sécurisé Cloud
                      Run et n&apos;est jamais exposée au visiteur.
                    </p>
                  </div>

                  {printfulSettings.isConnected ? (
                    <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 flex items-start gap-2 text-xs">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Module API actif !</p>
                        <p className="text-[10px] text-emerald-500 mt-0.5">
                          Dernière synchronisation :{" "}
                          {printfulSettings.lastSynced || "Indisponible"}
                        </p>
                        <p className="text-[10px] text-emerald-500">
                          {printfulSettings.productsSyncedCount} articles
                          mappés.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-start gap-2 text-xs">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Non connecté</p>
                        <p className="text-[10px] text-amber-500 mt-0.5">
                          Veuillez entrer une clé bidon ou réelle et enregistrer
                          pour activer le mode synchronisation.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-gray-100 hover:bg-slate-700 text-gray-900 font-bold text-xs py-2 rounded transition-all"
                    >
                      Enregistrer
                    </button>

                    <button
                      type="button"
                      onClick={triggerPrintfulSync}
                      disabled={isSyncingPrintful}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-gray-900 font-bold text-xs py-2 rounded transition-all flex items-center justify-center gap-1.5"
                    >
                      {isSyncingPrintful ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Sync...
                        </>
                      ) : (
                        "Sync Catalog"
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-xs text-gray-600">
                <h4 className="font-extrabold text-gray-900 text-sm mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-(--color-accent)" />
                  Guide de Lancement 0€ Budget
                </h4>
                <ol className="space-y-4 list-decimal list-inside leading-relaxed text-gray-500">
                  <li>
                    <strong className="text-gray-900">
                      Générez un design :
                    </strong>{" "}
                    Saisissez une idée d&apos;actualité (Football Finals,
                    Saint-Valentin) et affinez l&apos;importation.
                  </li>
                  <li>
                    <strong className="text-gray-900">
                      Envoi de commande usine :
                    </strong>{" "}
                    Dès qu&apos;un client valide son panier founi sur InstaWear,
                    l&apos;API transmet la maquette, les coordonnées et le
                    paiement Stripe à Printful.
                  </li>
                  <li>
                    <strong className="text-gray-900">
                      Zéro Avance de Fonds :
                    </strong>{" "}
                    Vous êtes payé au prix InstaWear (ex: 29.99€). Printful vous
                    facture le coût de base (ex: 12.50€). Vous gardez les 17.49€
                    restants immédiatement !
                  </li>
                  <li>
                    <strong className="text-gray-900">
                      Expédition Neutre :
                    </strong>{" "}
                    Printful imprime le t-shirt et l&apos;envoie sous boîte
                    neutre avec votre logo InstaWear. Le client n&apos;y voit
                    que du feu !
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </main>
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
                    src={
                      selectedProduct.gallery?.[activeGalleryIndex] ||
                      selectedProduct.image ||
                      PLACEHOLDER_IMG
                    }
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {selectedProduct.gallery &&
                  selectedProduct.gallery.length > 1 && (
                    <div className="grid grid-cols-4 gap-2.5 mt-3 select-none">
                      {selectedProduct.gallery.map((img, idx) => (
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
                  )}

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
                        {selectedProduct.price.toFixed(2)} €
                      </p>
                    </div>
                    {selectedProduct.originalPrice && (
                      <div className="text-xs text-gray-500 leading-normal pl-2 border-l border-gray-200">
                        <p className="line-through">
                          {selectedProduct.originalPrice.toFixed(2)} €
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
                        GRATUIT dès 35€ d&apos;achat !
                      </span>
                    </p>
                    <p className="text-gray-500 mt-1">
                      Fabriqué sous 24h puis livré chez vous le{" "}
                      <strong className="text-gray-900">
                        {getDeliverEstimateString(4)}
                      </strong>
                    </p>
                  </div>

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
                      Acheter maintenant ⚡
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
                            {item.product.price.toFixed(2)} €
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
                    {cartTotal.toFixed(2)} €
                  </span>
                </div>
                <div className="flex justify-between items-center text-(--color-accent) font-medium">
                  <span>Livraison Choice suivie :</span>
                  <span>{cartTotal >= 35 ? "GRATUITE" : "4.99 €"}</span>
                </div>
                <div className="flex justify-between items-center border-t border-gray-200 pt-2.5 text-sm">
                  <span className="font-extrabold text-gray-900">
                    Montant Total :
                  </span>
                  <span className="font-black text-gray-900 text-base">
                    {cartTotal >= 35
                      ? cartTotal.toFixed(2)
                      : (cartTotal + 4.99).toFixed(2)}{" "}
                    €
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
                      {(35 - cartTotal).toFixed(2)} €
                    </strong>{" "}
                    d&apos;articles pour débloquer la livraison gratuite !
                  </p>
                </div>
              )}

              <button
                onClick={simulateCheckout}
                className="w-full bg-linear-to-r from-(--color-accent) to-(--color-accent2) hover:from-cyan-300 hover:to-indigo-400 text-slate-950 font-black text-sm p-4 rounded-xl uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5 select-none"
                id="btn-fast-checkout"
              >
                Passer la commande ⚡
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
        <div className="section-container grid grid-cols-1 md:grid-cols-4 gap-8">
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

          <div>
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">
              Créateur Hub
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-500">
              <li>
                <button
                  onClick={() => setActiveTab("admin")}
                  className="hover:text-(--color-accent) transition-colors"
                >
                  Formulaire de design POD
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("admin")}
                  className="hover:text-(--color-accent) transition-colors"
                >
                  Configuration API Printful
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("admin")}
                  className="hover:text-(--color-accent) transition-colors"
                >
                  Zéro Budget guide
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab("admin")}
                  className="hover:text-(--color-accent) transition-colors"
                >
                  Générateur Gemini AI
                </button>
              </li>
            </ul>
          </div>

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
          </div>
        </div>
      </footer>
    </div>
  );
}
