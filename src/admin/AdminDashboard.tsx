import React from "react";
import {
  Sparkles,
  RefreshCw,
  Check,
  Plus,
  Trash2,
  Info,
  Layers,
  CheckCircle,
} from "lucide-react";
import { Product, PrintfulSettings } from "../types";

// ── Props ─────────────────────────────────────────────────────
interface AdminDashboardProps {
  products: Product[];
  fetchProducts: () => Promise<void>;
  printfulSettings: PrintfulSettings;
  setPrintfulSettings: React.Dispatch<React.SetStateAction<PrintfulSettings>>;
  handleDeleteProduct: (id: string) => Promise<void>;
  handleSavePrintfulSettings: (e: React.FormEvent) => Promise<void>;
  generateAiDesignContent: () => Promise<void>;
  handleSaveDesign: (e: React.FormEvent) => Promise<void>;
  triggerPrintfulSync: () => Promise<void>;
  // Formulaire nouveau design
  newDesignPrompt: string;
  setNewDesignPrompt: React.Dispatch<React.SetStateAction<string>>;
  newDesignTitle: string;
  setNewDesignTitle: React.Dispatch<React.SetStateAction<string>>;
  newDesignDesc: string;
  setNewDesignDesc: React.Dispatch<React.SetStateAction<string>>;
  newDesignTags: string[];
  setNewDesignTags: React.Dispatch<React.SetStateAction<string[]>>;
  newDesignPrice: string;
  setNewDesignPrice: React.Dispatch<React.SetStateAction<string>>;
  newDesignCategory: "tshirt" | "hoodie" | "accessory" | "mug";
  setNewDesignCategory: React.Dispatch<
    React.SetStateAction<"tshirt" | "hoodie" | "accessory" | "mug">
  >;
  newDesignEventType: "sport" | "culture" | "saisonnier" | "live";
  setNewDesignEventType: React.Dispatch<
    React.SetStateAction<"sport" | "culture" | "saisonnier" | "live">
  >;
  newDesignStyle: "cute" | "street" | "commute" | "cozy" | "retro";
  setNewDesignStyle: React.Dispatch<
    React.SetStateAction<"cute" | "street" | "commute" | "cozy" | "retro">
  >;
  newDesignImg: string;
  setNewDesignImg: React.Dispatch<React.SetStateAction<string>>;
  isGeneratingAi: boolean;
  isSavingDesign: boolean;
  isSyncingPrintful: boolean;
  showToast: (text: string, type?: "success" | "info" | "error") => void;
  setActiveTab: (tab: "store" | "admin") => void;
  MOCKUP_PRESETS: { name: string; url: string; category: string }[];
  PLACEHOLDER_IMG: string;
}

export default function AdminDashboard({
  products,
  fetchProducts,
  printfulSettings,
  setPrintfulSettings,
  handleDeleteProduct,
  handleSavePrintfulSettings,
  generateAiDesignContent,
  handleSaveDesign,
  triggerPrintfulSync,
  newDesignPrompt,
  setNewDesignPrompt,
  newDesignTitle,
  setNewDesignTitle,
  newDesignDesc,
  setNewDesignDesc,
  newDesignTags,
  setNewDesignTags,
  newDesignPrice,
  setNewDesignPrice,
  newDesignCategory,
  setNewDesignCategory,
  newDesignEventType,
  setNewDesignEventType,
  newDesignStyle,
  setNewDesignStyle,
  newDesignImg,
  setNewDesignImg,
  isGeneratingAi,
  isSavingDesign,
  isSyncingPrintful,
  showToast,
  setActiveTab,
  MOCKUP_PRESETS,
  PLACEHOLDER_IMG,
}: AdminDashboardProps) {
  return (
    <main
      className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 animate-in fade-in duration-200"
      id="view-creator-dashboard"
    >
      {/* En-tête */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="bg-indigo-600/30 border border-indigo-500/50 text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full">
            🛠️ CREATOR STUDIO (ADMIN)
          </span>
          <h2 className="text-2xl font-black text-gray-900 mt-3">
            Gérer votre Boutique & API Printful
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Concevez de nouveaux design à la demande avec l’aide de Gemini, liez
            les produits à l’usine, et suivez la synchronisation.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setActiveTab("store")}
            className="bg-gray-100 hover:bg-slate-700 border border-gray-200 text-gray-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
          >
            Retourner sur le Store
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Colonne gauche : formulaire + designs personnels */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Formulaire nouveau design */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-200 pb-3">
              <Sparkles className="w-5 h-5 text-(--color-accent) animate-pulse" />
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
                placeholder="Ex: Un design néon violet et turquoise..."
                value={newDesignPrompt}
                onChange={(e) => setNewDesignPrompt(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-900 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/20"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Saisissez un concept. Notre IA rédigera un titre SEO et une
                description.
              </p>
            </div>

            {/* Sélecteurs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Catégorie :
                </label>
                <select
                  value={newDesignCategory}
                  onChange={(e) => setNewDesignCategory(e.target.value as any)}
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
                  onChange={(e) => setNewDesignEventType(e.target.value as any)}
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
                  onChange={(e) => setNewDesignStyle(e.target.value as any)}
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

            {/* Détails du produit */}
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
                  placeholder="Listes à puces décrivant la matière, le type d'impression..."
                  value={newDesignDesc}
                  onChange={(e) => setNewDesignDesc(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-600 font-mono"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-500 mb-1">
                    Prix de vente souhaité ($) :
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDesignPrice}
                    onChange={(e) => setNewDesignPrice(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs text-gray-900"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Coût d&apos;impression usine moyen : ~12.50$.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-wider text-gray-500 mb-1">
                    Mots-clés / Tags :
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Football, Retro, Munich"
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

              {/* Mockups */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  3. Sélectionner un visuel de Mockup (Base) :
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {MOCKUP_PRESETS.map((preset, idx) => (
                    <div
                      key={idx}
                      onClick={() => setNewDesignImg(preset.url)}
                      className={`border rounded-lg p-1 cursor-pointer transition-all ${
                        newDesignImg === preset.url
                          ? "border-cyan-400 bg-(--color-accent-bg)"
                          : "border-gray-200 hover:border-gray-200 bg-gray-50"
                      }`}
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
                <p className="text-[10px] text-gray-500 mt-1">
                  Ces visuels représentent des patrons de mannequins pour
                  exposer vos créations.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSavingDesign}
                className="w-full bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs p-4 rounded-xl uppercase tracking-wider font-sans transition-all flex items-center justify-center gap-2"
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

          {/* Designs personnels */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h4 className="font-bold text-gray-900 text-sm mb-4">
              Vos Designs Personnels
            </h4>
            <div className="space-y-3">
              {products.filter((p) => p.id.startsWith("custom-prod-"))
                .length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  Aucun design de création enregistré.
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
                            // On pourrait vouloir sélectionner le produit, mais on n'a pas la fonction ici.
                            // On peut éventuellement passer setSelectedProduct en prop si nécessaire.
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

        {/* Colonne droite : Printful + Guide */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider">
                Connexion Printful API
              </h3>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Connectez votre jeton développeur Printful gratuitement.
            </p>
            <form onSubmit={handleSavePrintfulSettings} className="space-y-4">
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
                <p className="text-[10px] text-gray-500 mt-1">
                  Votre clé reste cryptée et n&apos;est jamais exposée.
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
                      {printfulSettings.productsSyncedCount} articles mappés.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-start gap-2 text-xs">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Non connecté</p>
                    <p className="text-[10px] text-amber-500 mt-0.5">
                      Entrez une clé pour activer le mode synchronisation.
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
              Guide de Lancement 0$ Budget
            </h4>
            <ol className="space-y-4 list-decimal list-inside leading-relaxed text-gray-500">
              <li>
                <strong className="text-gray-900">Générez un design :</strong>{" "}
                Saisissez une idée d&apos;actualité et affinez
                l&apos;importation.
              </li>
              <li>
                <strong className="text-gray-900">
                  Envoi de commande usine :
                </strong>{" "}
                L&apos;API transmet la maquette à Printful après validation.
              </li>
              <li>
                <strong className="text-gray-900">
                  Zéro Avance de Fonds :
                </strong>{" "}
                Vous êtes payé au prix de vente, Printful prélève son coût.
              </li>
              <li>
                <strong className="text-gray-900">Expédition Neutre :</strong>{" "}
                Printful imprime et expédie avec votre logo.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
