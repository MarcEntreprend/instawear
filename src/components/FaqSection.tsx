// src\components\FaqSection.tsx

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
        <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-6 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-(--color-accent)" />
          Frequently Asked Questions
        </h2>
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
                  className={`transition-transform duration-200 shrink-0 ${openFaqIndex === idx ? "rotate-90" : ""}`}
                  style={{ color: "var(--color-accent)" }}
                />
              </button>
              {openFaqIndex === idx && (
                <div
                  className="px-5 pb-4 text-sm leading-relaxed animate-fade-up"
                  style={{ color: "var(--color-ink2)" }}
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
