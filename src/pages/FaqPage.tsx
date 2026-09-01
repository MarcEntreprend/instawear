// src/pages/FaqPage.tsx — V2 visuals, V1 faq data
import { useState } from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { FAQS as FAQ_ITEMS } from "../data/faq";

export default function FaqPage({ onBack }: { onBack: () => void }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center gap-2">
        <button onClick={onBack} aria-label="Retour" className="btn-icon w-8 h-8"><ChevronLeft size={15} /></button>
        <span className="text-xs" style={{ color: "var(--color-ink3)" }}>InstaWear / FAQ</span>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <span className="eyebrow">Aide</span>
        <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 mb-8" style={{ color: "var(--color-ink)" }}>Questions fréquentes</h1>
        <div className="flex flex-col gap-3">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="card-premium overflow-hidden">
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                <span className="text-sm font-bold pr-4" style={{ color: "var(--color-ink)" }}>{item.question}</span>
                <ChevronDown size={16} className={`shrink-0 transition-transform ${openIdx === i ? "rotate-180" : ""}`} style={{ color: "var(--color-ink3)" }} />
              </button>
              {openIdx === i && <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: "var(--color-ink2)" }}>{item.answer}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
