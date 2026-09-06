// src/components/product/FrequentlyBoughtTogether.tsx — V2 port live (orders-based)
import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import type { Product } from "../../types";
const fmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
export default function FrequentlyBoughtTogether({ mainProduct, mainImage, mainUnitPrice, mainCanAdd, addOns, onAddMain, onQuickAddProduct }: { mainProduct: Product; mainImage: string; mainUnitPrice: number; mainCanAdd: boolean; addOns: Product[]; onAddMain: () => void; onQuickAddProduct: (p: Product) => void }) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(addOns.map((p) => p.id)));
  const [justAdded, setJustAdded] = useState(false);
  if (addOns.length === 0) return null;
  const toggle = (id: string) => setCheckedIds((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const checked = addOns.filter((p) => checkedIds.has(p.id));
  const total = mainUnitPrice + checked.reduce((s, p) => s + p.price, 0);
  const handleAdd = () => { if (mainCanAdd) onAddMain(); checked.forEach((p) => onQuickAddProduct(p)); setJustAdded(true); setTimeout(() => setJustAdded(false), 1800); };
  return (
    <section className="mt-14">
      <p className="eyebrow mb-4">Souvent achetés ensemble</p>
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
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: checkedIds.has(a.id) ? "var(--color-accent)" : "var(--color-surface)", border: "1px solid var(--color-border)" }}>{checkedIds.has(a.id) && <Check size={11} color="#fff" />}</span>
                </div>
                <span className="text-[11px] font-semibold text-center max-w-24 truncate" style={{ color: "var(--color-ink2)" }}>{a.title}</span>
                <span className="text-[11px] font-bold" style={{ color: "var(--color-ink)" }}>{fmt.format(a.price)}</span>
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between gap-4 mt-5 pt-5 flex-wrap" style={{ borderTop: "1px solid var(--color-border)" }}>
          <p className="text-sm" style={{ color: "var(--color-ink2)" }}>Total pour {1 + checked.length} article{checked.length > 0 ? "s" : ""} : <span className="text-base font-extrabold" style={{ color: "var(--color-ink)" }}>{fmt.format(total)}</span></p>
          <button onClick={handleAdd} className="btn btn-accent">{justAdded ? <><Check size={15} /> Ajouté</> : <><ShoppingBag size={15} /> Ajouter la sélection</>}</button>
        </div>
        {!mainCanAdd && <p className="text-xs mt-3" style={{ color: "var(--color-ink4)" }}>Choisissez une taille pour inclure « {mainProduct.title} ».</p>}
      </div>
    </section>
  );
}
