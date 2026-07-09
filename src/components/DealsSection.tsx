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
  if ((dealExpired && !dealFadingOut) || dealProducts.length === 0) return null;

  return (
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
            Profitez de prix réduits exclusifs sur notre collection de t-shirts
            et sweats de sport IA avant le coup d&apos;envoi du prochain grand
            match !
          </p>
        </div>

        <div className="my-6 bg-gray-50/60 p-4 border border-indigo-500/10 rounded-xl">
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">
            L&apos;offre se termine dans :
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            {countdownString.split(":").map((unit, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className="bg-white text-(--color-accent) font-mono font-black text-2xl px-2.5 py-1 rounded border border-gray-200">
                  {unit}
                </span>
                {i < 2 && <span className="text-gray-500 font-bold">:</span>}
              </span>
            ))}
          </div>
        </div>

        <button
          onClick={() => onSelectEventType("sport")}
          className="bg-gray-50/40 hover:bg-gray-50/80 border border-indigo-500/20 text-indigo-600 font-bold text-xs p-3.5 rounded-xl uppercase tracking-wider transition-all block w-full text-center"
        >
          Parcourir les offres sportives &rarr;
        </button>
      </div>

      <div className="lg:col-span-8 bg-white/40 border border-gray-200 rounded-2xl p-6 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <h3 className="text-lg font-black tracking-wide text-gray-900">
              🛍️ Packs Choice en Promo
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Complétez votre look et économisez sur les frais d&apos;impression
              !
            </p>
          </div>
          <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
            DÈS 5.99$ L&apos;ACCESSOIRE
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {dealProducts.slice(0, 4).map((item: any) => (
            <div
              key={item.id}
              onClick={() => onSelectProduct(item)}
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
                    {item.price} {currencySymbol}
                  </span>
                  {item.originalPrice && (
                    <span className="text-[10px] text-gray-500 line-through">
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
