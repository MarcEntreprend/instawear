// src/components/product/RelatedProductCard.tsx — V2 port live
import { Plus, Star } from "lucide-react";
import type { Product } from "../../types";
const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR" });
export default function RelatedProductCard({ product, onSelect, onQuickAdd }: { product: Product; onSelect: (p: Product) => void; onQuickAdd: (p: Product) => void }) {
  return (
    <div className="w-36 sm:w-40 shrink-0 snap-start">
      <div onClick={() => onSelect(product)} className="block w-full text-left card-premium overflow-hidden">
        <div className="relative aspect-square">
          <img src={product.image} alt={product.title} className="w-full h-full object-cover" loading="lazy" />
          <button type="button" onClick={(e) => { e.stopPropagation(); onQuickAdd(product); }} aria-label="Quick add" className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--color-accent)", color: "#fff" }}><Plus size={13} /></button>
        </div>
        <div className="p-2.5">
          <p className="text-xs font-bold leading-snug line-clamp-1" style={{ color: "var(--color-ink)" }}>{product.title}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-extrabold" style={{ color: "var(--color-ink)" }}>{fmt.format(product.price)}</span>
            {product.ratings.count > 0 && <span className="flex items-center gap-0.5 text-[10px] font-semibold" style={{ color: "var(--color-ink3)" }}><Star size={9} fill="var(--color-gold)" style={{ color: "var(--color-gold)" }} /> {product.ratings.score.toFixed(1)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
