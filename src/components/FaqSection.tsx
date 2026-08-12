// src/components/FaqSection.tsx

import { useState } from "react";
import { HelpCircle, ChevronRight } from "lucide-react";
import { FAQS } from "../data/faq";

export default function FaqSection() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <section
      id="section-faq"
      className="section-container w-full px-4 scroll-mt-28"
    >
      <div className="max-w-2xl mx-auto">
        {/* En‑tête stylé (comme dans ton nouveau design) */}
        <div className="text-center mb-8">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest"
            style={{ color: "var(--color-accent)" }}
          >
            <HelpCircle size={13} /> Support
          </span>
          <h2
            className="font-display font-black text-2xl sm:text-4xl mt-1"
            style={{ color: "var(--color-ink)" }}
          >
            Frequently Asked Questions
          </h2>
        </div>

        {/* Liste des FAQ – structure identique à l’ancien code */}
        <div className="flex flex-col gap-3">
          {FAQS.map((faq, idx) => (
            <div
              key={faq.id}
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <button
                onClick={() =>
                  setOpenFaqIndex(openFaqIndex === idx ? null : idx)
                }
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 font-semibold text-sm transition-colors"
                style={{ color: "var(--color-ink)" }}
              >
                <span>{faq.question}</span>
                <ChevronRight
                  size={16}
                  strokeWidth={2}
                  className={`transition-transform duration-200 shrink-0 ${
                    openFaqIndex === idx ? "rotate-90" : ""
                  }`}
                  style={{ color: "var(--color-accent)" }}
                />
              </button>
              {openFaqIndex === idx && (
                <div
                  className="px-5 pb-4 text-sm leading-relaxed animate-fade-up"
                  style={{ color: "var(--color-ink3)" }}
                >
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
