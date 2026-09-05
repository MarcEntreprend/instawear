// src/components/product/RecentlyViewedSection.tsx — V2 port live
import type { Product } from "../../types";
import RelatedProductCard from "./RelatedProductCard";
export default function RecentlyViewedSection({ products, onSelect, onQuickAdd }: { products: Product[]; onSelect: (p: Product) => void; onQuickAdd: (p: Product) => void }) {
  if (products.length === 0) return null;
  return (
    <section className="mt-14">
      <p className="eyebrow mb-4">Récemment consultés</p>
      <div className="flex gap-3.5 overflow-x-auto no-scrollbar snap-x pb-1">
        {products.map((p) => (
          <RelatedProductCard key={p.id} product={p} onSelect={onSelect} onQuickAdd={onQuickAdd} />
        ))}
      </div>
    </section>
  );
}
