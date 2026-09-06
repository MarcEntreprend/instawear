// src/components/product/FrequentlyBoughtTogether.tsx — V2 port live (orders-based)
import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { Product } from "../../types";
const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });

export interface BundleItem {
  product: Product;
  color?: string;
  size?: string;
}

export interface BundleResult {
  addedIds: string[];
  blockedCount: number;
}

export default function FrequentlyBoughtTogether({
  mainProduct,
  mainImage,
  mainUnitPrice,
  mainCanAdd,
  mainColor,
  mainSize,
  addOns,
  onAddMain,
  onAddBundle,
  onQuickAddProduct,
}: {
  mainProduct: Product;
  mainImage: string;
  mainUnitPrice: number;
  mainCanAdd: boolean;
  mainColor?: string;
  mainSize?: string;
  addOns: Product[];
  onAddMain: () => void;
  onAddBundle?: (items: BundleItem[]) => BundleResult;
  onQuickAddProduct: (p: Product) => void;
}) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(addOns.map((p) => p.id)));
  const [justAdded, setJustAdded] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addedCount, setAddedCount] = useState(0);
  if (addOns.length === 0) return null;
  const toggle = (id: string) => {
    setCheckedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const checked = addOns.filter((p) => checkedIds.has(p.id));
  const total = mainUnitPrice + checked.reduce((s, p) => s + p.price, 0);
  const handleAdd = () => {
    if (onAddBundle) {
      // UN SEUL appel batch (voir addManyToCart) : N appels synchrones à
      // addToCart seraient avalés par le lock anti-race 400ms.
      const bundle: BundleItem[] = [
        ...(mainCanAdd ? [{ product: mainProduct, color: mainColor, size: mainSize }] : []),
        ...checked.map((p) => ({ product: p })),
      ];
      const res = onAddBundle(bundle);
      setAddedIds(new Set(res.addedIds));
      setAddedCount(res.addedIds.length);
    } else {
      if (mainCanAdd) onAddMain();
      checked.forEach((p) => onQuickAddProduct(p));
      setAddedIds(new Set([mainProduct.id, ...checked.map((p) => p.id)]));
      setAddedCount((mainCanAdd ? 1 : 0) + checked.length);
    }
    setJustAdded(true);
    setTimeout(() => { setJustAdded(false); setAddedIds(new Set()); }, 2500);
  };
  const badgeStyle = (id: string) =>
    justAdded && addedIds.has(id)
      ? { background: "var(--color-success)", border: "1px solid var(--color-success)" }
      : checkedIds.has(id)
        ? { background: "var(--color-accent)", border: "1px solid var(--color-border)" }
        : { background: "var(--color-surface)", border: "1px solid var(--color-border)" };
  return (
    <section className="mt-14">
      <p className="eyebrow mb-4">Frequently bought together</p>
      <div className="card-premium p-5 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2">
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="bezel-outer"><div className="bezel-inner w-20 h-20 sm:w-24 sm:h-24"><img src={mainImage} alt={mainProduct.title} className="w-full h-full object-cover" /></div></div>
            <span className="text-[11px] font-bold text-center max-w-24 truncate" style={{ color: "var(--color-ink)" }}>{mainProduct.title}</span>
          </div>
          {addOns.map((a) => (
            <div key={a.id} className="flex items-center gap-3 sm:gap-4 shrink-0">
              <span className="text-xl font-light shrink-0" style={{ color: "var(--color-ink4)" }}>+</span>
              <button onClick={() => toggle(a.id)} className="flex flex-col items-center gap-2 shrink-0">
                <div className="relative">
                  <div className="bezel-outer" style={{ opacity: checkedIds.has(a.id) ? 1 : 0.4 }}><div className="bezel-inner w-20 h-20 sm:w-24 sm:h-24"><img src={a.image} alt={a.title} className="w-full h-full object-cover" /></div></div>
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-colors" style={badgeStyle(a.id)}>
                    {(checkedIds.has(a.id) || (justAdded && addedIds.has(a.id))) && <Check size={11} color="#fff" />}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-center max-w-24 truncate" style={{ color: "var(--color-ink2)" }}>{a.title}</span>
                <span className="text-[11px] font-bold" style={{ color: "var(--color-ink)" }}>{fmt.format(a.price)}</span>
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 mt-5 pt-5 flex-wrap" style={{ borderTop: "1px solid var(--color-border)" }}>
          <p className="text-sm" style={{ color: "var(--color-ink2)" }}>Total for {1 + checked.length} item{checked.length > 0 ? "s" : ""}: <span className="text-base font-extrabold" style={{ color: "var(--color-ink)" }}>{fmt.format(total)}</span></p>
          <button
            onClick={handleAdd}
            disabled={justAdded}
            className="btn btn-accent disabled:opacity-90"
            style={justAdded ? { background: "var(--color-success)", boxShadow: "none" } : undefined}
          >
            {justAdded ? <><Check size={15} /> Added{addedCount > 0 ? ` (${addedCount})` : ""}</> : <><ShoppingBag size={15} /> Add selection</>}
          </button>
        </div>
        {!mainCanAdd && <p className="text-xs mt-3" style={{ color: "var(--color-ink4)" }}>Select a size to include “{mainProduct.title}”.</p>}
      </div>
    </section>
  );
}
