/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, User, Smartphone, Globe, ChevronDown, Menu, X, Landmark, SlidersHorizontal, Sparkles } from 'lucide-react';
import { CartItem } from '../types';

interface HeaderProps {
  cart: CartItem[];
  onOpenCart: () => void;
  onSearch: (term: string) => void;
  currentSearchTerm: string;
  onSelectCategory: (category: string | null) => void;
  onSelectEventType: (type: string | null) => void;
  currentEventType: string | null;
  onOpenAdmin: () => void;
  isAdminActive: boolean;
}

export default function Header({
  cart,
  onOpenCart,
  onSearch,
  currentSearchTerm,
  onSelectCategory,
  onSelectEventType,
  currentEventType,
  onOpenAdmin,
  isAdminActive
}: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState(currentSearchTerm);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [activeMegaCategory, setActiveMegaCategory] = useState<'women' | 'men' | 'sports' | 'acc'>('sports');
  
  // Rotating search placeholder to encourage exploration
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const searchPlaceholders = [
    "Chercher 'Finale Champions League 2026'...",
    "Chercher 'Carnaval de Rio'...",
    "Chercher 'Oktoberfest Bière'...",
    "Chercher 'Sweat Capuche Halloween'...",
    "Chercher 'Grand Prix Monaco F1'..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % searchPlaceholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleQuickSearch = (term: string) => {
    setSearchTerm(term);
    onSearch(term);
    setIsMegaMenuOpen(false);
  };

  const totalCartQty = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950 text-slate-100 border-b border-slate-800 shadow-md">
      {/* Top Banner Message */}
      <div className="w-full bg-linear-to-r from-violet-600 to-indigo-600 py-1.5 px-4 text-center text-xs font-medium text-white flex justify-between items-center overflow-hidden">
        <span className="mx-auto flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
          Livraison GRATUITE sur les articles Choice dès 35€ d&apos;achat ! ⚡ Compte à rebours de la finale UCL actif !
        </span>
        <button 
          onClick={onOpenAdmin} 
          className="text-[11px] bg-slate-900/40 hover:bg-slate-900/60 border border-white/20 transition-all rounded px-2.5 py-0.5 font-semibold text-white shrink-0"
          id="btn-goto-sandbox"
        >
          {isAdminActive ? "👁️ Voir le Store" : "🛠️ Créateur POD (Admin)"}
        </button>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <div 
          onClick={() => { onSelectCategory(null); onSelectEventType(null); }}
          className="flex items-center gap-1.5 cursor-pointer shrink-0"
          id="brand-logo"
        >
          <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-cyan-400 via-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/20">
            I
          </div>
          <span className="font-sans font-black tracking-tight text-xl bg-linear-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
            Insta<span className="text-cyan-400">Wear</span>
          </span>
        </div>

        {/* Search Bar - Capsule (AliExpress Style) */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl relative">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-full pl-4 pr-1.5 py-1 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400/30 transition-all duration-200">
            <input
              type="text"
              placeholder={searchPlaceholders[placeholderIndex]}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-0 mr-2 py-1"
              id="input-main-search"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); onSearch(''); }}
                className="text-slate-400 hover:text-white mr-2 text-xs"
              >
                Vider
              </button>
            )}
            <button
              type="submit"
              className="bg-linear-to-r from-cyan-400 to-indigo-500 text-slate-950 p-2 rounded-full hover:from-cyan-300 hover:to-indigo-400 transition-all flex items-center justify-center shrink-0"
              id="btn-search-trigger"
            >
              <Search className="w-4 h-4 text-slate-950 font-bold" />
            </button>
          </div>
        </form>

        {/* Top utilities bar (Download App, Country, Profil, basket) */}
        <div className="flex items-center gap-4 text-xs font-medium shrink-0">
          <div className="hidden md:flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer group">
            <Smartphone className="w-4 h-4" />
            <span>App</span>
            <div className="hidden group-hover:block absolute top-12 bg-slate-900 border border-slate-800 rounded-lg p-3 text-center shadow-2xl">
              <p className="font-semibold text-white mb-1">Télécharger l&apos;App InstaWear</p>
              <div className="w-24 h-24 bg-white p-1 mx-auto my-1.5 rounded flex items-center justify-center font-mono text-slate-950 text-[9px] font-bold">QR CODE</div>
              <p className="text-slate-400 text-[10px]">Passez commande en 1 clic</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer">
            <Globe className="w-4 h-4" />
            <span>FR/EUR (€)</span>
            <ChevronDown className="w-3 h-3" />
          </div>

          <div className="flex items-center gap-2 cursor-pointer hover:text-cyan-300 transition-colors" onClick={onOpenAdmin}>
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 bg-linear-to-tr from-slate-800 to-slate-900 border border-slate-700">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-[10px] text-slate-400 leading-none">Bonjour, de retour ?</p>
              <p className="font-bold text-xs mt-0.5">Admin Studio</p>
            </div>
          </div>

          {/* Cart Icon Capsule */}
          <button 
            onClick={onOpenCart}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-full px-3.5 py-1.5 transition-all text-slate-100"
            id="header-cart-icon"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4 text-cyan-400" />
              {totalCartQty > 0 && (
                <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white font-extrabold text-[10px] rounded-full w-5 h-5 flex items-center justify-center border-2 border-slate-950 scale-95 animate-pulse">
                  {totalCartQty}
                </span>
              )}
            </div>
            <span className="hidden sm:inline text-xs font-bold font-sans">Panier</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="bg-slate-900/80 border-t border-slate-800.5.5 px-4 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-1">
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none py-1">
            {/* Mega Menu Toggle */}
            <button
              onClick={() => setIsMegaMenuOpen(!isMegaMenuOpen)}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white px-3 py-1 rounded transition-colors shrink-0"
              id="btn-mega-menu-trigger"
            >
              {isMegaMenuOpen ? <X className="w-3.5 h-3.5 text-rose-400" /> : <Menu className="w-3.5 h-3.5 text-cyan-400" />}
              <span>☰ All Categories</span>
            </button>

            {/* Quick Links */}
            <button
              onClick={() => { onSelectCategory(null); onSelectEventType('live'); }}
              className={`font-semibold shrink-0 transition-colors uppercase tracking-wider ${currentEventType === 'live' ? 'text-rose-500' : 'text-slate-300 hover:text-rose-500'}`}
            >
              <span className="inline-block w-2 h-2 bg-rose-500 rounded-full mr-1 anim-pulse animate-ping"></span>
              ⚡ LIVE EVENT 2026
            </button>
            <button
              onClick={() => { onSelectCategory(null); onSelectEventType('sport'); }}
              className={`shrink-0 transition-colors ${currentEventType === 'sport' ? 'text-cyan-400' : 'text-slate-300 hover:text-cyan-400'}`}
            >
              Sporting Cup
            </button>
            <button
              onClick={() => { onSelectCategory(null); onSelectEventType('culture'); }}
              className={`shrink-0 transition-colors ${currentEventType === 'culture' ? 'text-indigo-400' : 'text-slate-300 hover:text-indigo-400'}`}
            >
              Festivals Monde
            </button>
            <button
              onClick={() => { onSelectCategory(null); onSelectEventType('saisonnier'); }}
              className={`shrink-0 transition-colors ${currentEventType === 'saisonnier' ? 'text-amber-500' : 'text-slate-300 hover:text-amber-500'}`}
            >
              Fêtes Saison
            </button>

            {/* Product categories buttons */}
            <span className="text-slate-700 py-1">|</span>

            <button onClick={() => { onSelectCategory('tshirt'); onSelectEventType(null); }} className="text-slate-300 hover:text-white shrink-0">
              T-shirts IA
            </button>
            <button onClick={() => { onSelectCategory('hoodie'); onSelectEventType(null); }} className="text-slate-300 hover:text-white shrink-0">
              Hoodies
            </button>
            <button onClick={() => { onSelectCategory('accessory'); onSelectEventType(null); }} className="text-slate-300 hover:text-white shrink-0">
              Accessoires
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-slate-400 shrink-0 select-none">
            <span className="px-1 text-slate-700">|</span>
            <span className="hover:text-white transition-colors cursor-pointer" onClick={onOpenAdmin}>Vendre sur InstaWear</span>
          </div>
        </div>
      </div>

      {/* AliExpress-Style Mega Flyout Menu */}
      {isMegaMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-white text-slate-900 shadow-2xl border-b border-slate-200 grid grid-cols-12 z-55 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          
          {/* Left Vertical Categories Slider (Gris clair #F4F4F5) */}
          <div className="col-span-3 bg-slate-100 border-r border-slate-200 py-4 flex flex-col font-medium">
            <div 
              onMouseEnter={() => setActiveMegaCategory('sports')}
              className={`px-6 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${activeMegaCategory === 'sports' ? 'bg-white font-bold border-l-4 border-indigo-600 text-indigo-600' : 'text-slate-700 hover:bg-slate-200'}`}
            >
              <span>🏆 Grands Événements Sportifs</span>
            </div>
            <div 
              onMouseEnter={() => setActiveMegaCategory('women')}
              className={`px-6 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${activeMegaCategory === 'women' ? 'bg-white font-bold border-l-4 border-indigo-600 text-indigo-600' : 'text-slate-700 hover:bg-slate-200'}`}
            >
              <span>🎉 Festivals & Culture de Rue</span>
            </div>
            <div 
              onMouseEnter={() => setActiveMegaCategory('men')}
              className={`px-6 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${activeMegaCategory === 'men' ? 'bg-white font-bold border-l-4 border-indigo-600 text-indigo-600' : 'text-slate-700 hover:bg-slate-200'}`}
            >
              <span>🎃 Saisons & Fêtes Annuelles</span>
            </div>
            <div 
              onMouseEnter={() => setActiveMegaCategory('acc')}
              className={`px-6 py-2.5 flex items-center justify-between cursor-pointer transition-colors ${activeMegaCategory === 'acc' ? 'bg-white font-bold border-l-4 border-indigo-600 text-indigo-600' : 'text-slate-700 hover:bg-slate-200'}`}
            >
              <span>👜 Accessoires & Collection</span>
            </div>
            
            <div className="mt-8 px-6 pt-4 border-t border-slate-200 text-xs text-slate-400">
              Tous nos prints proviennent de coton biologique et d&apos;encres à l&apos;eau certifiées.
            </div>
          </div>

          {/* Right Mega Menu Panel (Fond Blanc) */}
          <div className="col-span-9 bg-white p-6 grid grid-rows-12 gap-4">
            
            {/* Top Recommended Row: Icons + labels */}
            <div className="row-span-4 border-b border-slate-100 pb-4">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wilder mb-3">Recommandations du moment</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                <div onClick={() => handleQuickSearch("Rio")} className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-center group">
                  <div className="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center text-lg">🌴</div>
                  <span className="text-[11px] font-medium font-sans">Rio Carnaval</span>
                </div>
                <div onClick={() => handleQuickSearch("Coupe")} className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-center group">
                  <div className="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center text-lg">⚽</div>
                  <span className="text-[11px] font-medium font-sans">Champions Finals</span>
                </div>
                <div onClick={() => handleQuickSearch("Oktoberfest")} className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-center group">
                  <div className="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center text-lg">🍺</div>
                  <span className="text-[11px] font-medium font-sans">Oktoberfest</span>
                </div>
                <div onClick={() => handleQuickSearch("Halloween")} className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-center group">
                  <div className="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center text-lg">🔥</div>
                  <span className="text-[11px] font-medium font-sans">Halloween Neon</span>
                </div>
                <div onClick={() => handleQuickSearch("Monaco")} className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-center group">
                  <div className="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center text-lg">🏎️</div>
                  <span className="text-[11px] font-medium font-sans">GP Monaco</span>
                </div>
                <div onClick={() => handleQuickSearch("Coachella")} className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-center group">
                  <div className="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center text-lg">🎆</div>
                  <span className="text-[11px] font-medium font-sans">Coachella Vibes</span>
                </div>
              </div>
            </div>

            {/* Bottom 4 columns of text links mapping other fields */}
            <div className="row-span-8 grid grid-cols-4 gap-6 text-sm py-2">
              <div>
                <p className="font-extrabold text-slate-900 border-b border-slate-150 pb-1.5 mb-2 text-xs uppercase">👕 Type d&apos;articles</p>
                <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                  <span onClick={() => { onSelectCategory('tshirt'); setIsMegaMenuOpen(false); }} className="hover:text-indigo-600 cursor-pointer">T-Shirts Collection</span>
                  <span onClick={() => { onSelectCategory('hoodie'); setIsMegaMenuOpen(false); }} className="hover:text-indigo-600 cursor-pointer">Hoodies & Sweats</span>
                  <span onClick={() => { onSelectCategory('accessory'); setIsMegaMenuOpen(false); }} className="hover:text-indigo-600 cursor-pointer">Casquettes & Caps</span>
                  <span onClick={() => { onSelectCategory('mug'); setIsMegaMenuOpen(false); }} className="hover:text-indigo-600 cursor-pointer">Mugs Collector</span>
                </div>
              </div>

              <div>
                <p className="font-extrabold text-slate-900 border-b border-slate-150 pb-1.5 mb-2 text-xs uppercase">🎨 Vibes Stylisées</p>
                <div className="flex flex-col gap-1.5 text-xs text-slate-600">
                  <span onClick={() => handleQuickSearch("retro")} className="hover:text-indigo-600 cursor-pointer">Vintage & Retro</span>
                  <span onClick={() => handleQuickSearch("neon")} className="hover:text-indigo-600 cursor-pointer">Glow & Néons</span>
                  <span onClick={() => handleQuickSearch("cyberpunk")} className="hover:text-indigo-600 cursor-pointer">Street & Cyberpunk</span>
                  <span onClick={() => handleQuickSearch("cute")} className="hover:text-indigo-600 cursor-pointer">Cute & Kawaii</span>
                </div>
              </div>

              <div>
                <p className="font-extrabold text-slate-900 border-b border-slate-150 pb-1.5 mb-2 text-xs uppercase">📦 Expédition Rapide</p>
                <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                  Grâce à notre maillage de centres d&apos;expédition Printful locaux, vos produits sont fabriqués et expédiés directement depuis l&apos;atelier le plus proche de votre client (Europe, USA, Asie).
                </p>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 flex flex-col justify-between border border-indigo-100">
                <div>
                  <span className="bg-indigo-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">POD direct</span>
                  <p className="font-bold text-slate-900 text-xs mt-1.5">Zéro stock physique</p>
                  <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">Payez la production uniquement après avoir vendu ! Connectez Printful dès aujourd&apos;hui.</p>
                </div>
                <button 
                  onClick={() => { onOpenAdmin(); setIsMegaMenuOpen(false); }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold hover:shadow-lg transition-all rounded px-4 py-1.5 text-[10px] mt-2 block w-full text-center"
                >
                  Configurer l&apos;API
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
