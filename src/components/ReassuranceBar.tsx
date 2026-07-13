// src/components/ReassuranceBar.tsx

import { Truck, ShieldCheck, RefreshCw } from "lucide-react";

export default function ReassuranceBar() {
  return (
    <section className="bg-white border-y border-gray-200 py-6 px-4">
      <div className="section-container grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 border border-violet-500/20">
            <Truck className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-center sm:text-left">
            <p className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">
              📦 Free Delivery over $35
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Free tracked shipping on all Choice apparel.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-2 border-y md:border-y-0 md:border-x border-gray-200">
          <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20">
            <ShieldCheck className="w-5 h-5 text-(--color-accent)" />
          </div>
          <div className="text-center sm:text-left">
            <p className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">
              🔒 Satisfaction Guaranteed
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Easy returns and hassle‑free refunds within 14 days.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 p-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <RefreshCw className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-center sm:text-left">
            <p className="font-extrabold text-gray-900 text-xs uppercase tracking-wide">
              🌱 Sustainable Print‑on‑Demand
            </p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Zero overproduction. Every piece is printed only after you order.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
