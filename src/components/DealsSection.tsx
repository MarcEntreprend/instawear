// src\components\DealsSection.tsx

import { PLACEHOLDER_IMG } from "../constants/assets";

interface DealsSectionProps {
  dealExpired: boolean;
  dealFadingOut: boolean;
  countdownString: string;
  currencySymbol: string;
  products: any[];
  onSelectEventType: (type: string) => void;
  onSelectProduct: (product: any) => void;
}

export default function DealsSection({
  dealExpired,
  dealFadingOut,
  countdownString,
  currencySymbol,
  products,
  onSelectEventType,
  onSelectProduct,
}: DealsSectionProps) {
  const dealProducts = products.filter((p: any) => p.dealActive && p.isActive);
  if (dealExpired && !dealFadingOut) return null;
  if (dealProducts.length === 0) {
    return (
      <section className="section-container w-full px-4">
        <div className="bg-white/40 border border-dashed border-gray-200 rounded-3xl p-6 text-center">
          <p className="text-sm text-gray-500">
            No active deals right now. Check back soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`section-container w-full px-4 grid grid-cols-1 lg:grid-cols-12 gap-6 ${dealFadingOut ? "deal-fade-out" : ""}`}
    >
      <div className="panel-ink lg:col-span-4 rounded-3xl p-7 flex flex-col justify-between min-h-75 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="chip uppercase tracking-wide bg-(--color-accent) text-white">
            Today's drop
          </span>
          <h3 className="font-serif text-2xl mt-4 leading-tight">
            Limited-edition game day gear
          </h3>
          <p className="text-xs text-white/60 mt-2.5 leading-relaxed">
            Score exclusive deals on our sports tees and hoodies before the next
            big matchup kicks off. Once it's gone, it's gone.
          </p>
        </div>

        <div className="relative z-10 my-6 bg-white/6 p-4 border border-white/10 rounded-2xl">
          <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest">
            Offer ends in
          </p>
          <div className="flex items-center gap-2 mt-2">
            {countdownString.split(":").map((unit, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="bg-white/10 text-(--color-accent) font-mono font-black text-2xl px-2.5 py-1 rounded-xl border border-white/10">
                  {unit}
                </span>
                {i < 2 && <span className="text-white/40 font-bold">:</span>}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => onSelectEventType("sport")}
          className="pill-btn pill-btn-accent relative z-10 w-full justify-center"
        >
          Shop sports gear
        </button>
      </div>

      <div className="lg:col-span-8 bg-white/60 border border-gray-200 rounded-3xl p-6 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <h3 className="font-serif text-xl tracking-wide text-gray-900">
              Bundle and save
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Complete your look and save on printing costs.
            </p>
          </div>
          <span className="chip uppercase tracking-wide bg-(--color-accent-bg) text-(--color-accent)">
            From $5.99 per item
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {dealProducts.slice(0, 4).map((item: any) => (
            <div
              key={item.id}
              onClick={() => onSelectProduct(item)}
              className="card-premium group bg-gray-50 rounded-2xl p-2.5 cursor-pointer text-center flex flex-col justify-between h-full"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-white relative">
                <img
                  src={item.image || PLACEHOLDER_IMG}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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
                    <span className="text-[10px] text-gray-400 line-through">
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
  );
}
