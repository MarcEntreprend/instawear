// src/pages/SearchResultsPage.tsx — V2 visuals, V1 live data
import { useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, Search, SearchX } from "lucide-react";
import type { Product } from "../types";
import { EVENT_TYPES } from "../data/categories";
import StoreProductCard from "../components/StoreProductCard";

function normalize(text: string): string { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function matchesQuery(product: Product, nq: string): boolean {
  const haystack = normalize([product.title, product.description, product.brand, product.category, product.eventType, ...product.tags].join(" "));
  return nq.split(/\s+/).filter(Boolean).every((w) => haystack.includes(w));
}

export default function SearchResultsPage({ query, products, favouriteIds = [], onBack, onSearch, onSelectProduct, onToggleFavourite, onQuickAdd }: {
  query: string; products: Product[]; favouriteIds?: string[]; onBack: () => void; onSearch: (q: string) => void; onSelectProduct: (p: Product) => void; onToggleFavourite: (p: Product) => void; onQuickAdd: (p: Product) => void;
}) {
  const [draft, setDraft] = useState(query);
  const [activeEventType, setActiveEventType] = useState<string | null>(null);
  const nq = normalize(query.trim());
  const baseResults = useMemo(() => (nq ? products.filter((p) => matchesQuery(p, nq)) : []), [products, nq]);
  const results = activeEventType ? baseResults.filter((p) => p.eventType === activeEventType) : baseResults;
  const suggestions = useMemo(() => [...products].sort((a, b) => b.boughtLastMonth - a.boughtLastMonth).slice(0, 4), [products]);
  const handleSubmit = (e: FormEvent) => { e.preventDefault(); if (draft.trim()) onSearch(draft.trim()); };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-350 mx-auto px-4 sm:px-6 pt-5 pb-6">
        <div className="flex items-center gap-2 mb-5">
          <button onClick={onBack} aria-label="Retour" className="btn-icon w-8 h-8 shrink-0"><ChevronLeft size={15} /></button>
          <form onSubmit={handleSubmit} className="flex items-center flex-1 max-w-xl rounded-full px-4 h-11" style={{ background: "var(--color-surface2)", border: "1px solid var(--color-border)" }}>
            <Search size={16} style={{ color: "var(--color-ink3)" }} />
            <input value={draft} onChange={(e) => setDraft(e.target.value)} type="search" placeholder="Rechercher un article, un événement…" className="flex-1 bg-transparent outline-none px-3 text-sm" style={{ color: "var(--color-ink)" }} />
          </form>
        </div>
        {query.trim() && <p className="text-sm mb-6" style={{ color: "var(--color-ink3)" }}>{results.length} résultat{results.length !== 1 ? "s" : ""} pour <span style={{ color: "var(--color-ink)" }} className="font-semibold">« {query} »</span></p>}
        {baseResults.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-8">
            <button onClick={() => setActiveEventType(null)} className="chip" data-active={activeEventType === null}>Tout</button>
            {EVENT_TYPES.filter((et) => baseResults.some((p) => p.eventType === et.value)).map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setActiveEventType(value)} className="chip" data-active={activeEventType === value}><Icon size={14} /> {label}</button>
            ))}
          </div>
        )}
        {results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {results.map((product) => (
              <StoreProductCard key={product.id} product={product} isFavorite={favouriteIds.includes(product.id)} dealExpired={false} dealFadingOut={false} countdownStr="" currencySymbol="€" onToggleFavorite={(id) => onToggleFavourite(products.find((p) => p.id === id)!)} onAddToCart={(p, c, s) => onQuickAdd(p)} onSelectProduct={onSelectProduct} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <span className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: "var(--color-surface2)" }}><SearchX size={24} style={{ color: "var(--color-ink4)" }} /></span>
            <p className="text-base font-bold mb-1" style={{ color: "var(--color-ink)" }}>{query.trim() ? "Aucun résultat pour cette recherche" : "Que recherchez-vous ?"}</p>
            <p className="text-sm mb-8" style={{ color: "var(--color-ink3)" }}>{query.trim() ? "Essayez un autre mot-clé ou explorez ces suggestions." : "Tapez un mot-clé ci-dessus pour commencer."}</p>
            <p className="eyebrow justify-center mb-4">Ça pourrait vous plaire</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {suggestions.map((product) => (
                <StoreProductCard key={product.id} product={product} isFavorite={favouriteIds.includes(product.id)} dealExpired={false} dealFadingOut={false} countdownStr="" currencySymbol="€" onToggleFavorite={(id) => onToggleFavourite(products.find((p) => p.id === id)!)} onAddToCart={(p, c, s) => onQuickAdd(p)} onSelectProduct={onSelectProduct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
