// src/components/FaqSection.tsx

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQS = [
  {
    q: "How long does printing take?",
    a: "Every item is printed to order within 24h of purchase, then shipped from the nearest Printful hub.",
  },
  {
    q: "What's your return policy?",
    a: "You can return unworn items within 14 days for a full refund or exchange.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes — we ship worldwide, with free delivery on orders over $35 in eligible regions.",
  },
  {
    q: "Can I customize sizing?",
    a: "Each product page includes a dynamic size guide pulled directly from the manufacturer.",
  },
];

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="section-faq" className="section-container scroll-mt-28 py-10">
      <div className="max-w-2xl mx-auto">
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

        <div className="flex flex-col gap-3">
          {FAQS.map((f, idx) => {
            const isOpen = open === idx;
            return (
              <div
                key={f.q}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left font-bold text-sm"
                  style={{ color: "var(--color-ink)" }}
                >
                  {f.q}
                  <ChevronDown
                    size={17}
                    className="transition-transform duration-300 shrink-0"
                    style={{
                      color: "var(--color-accent)",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0)",
                    }}
                  />
                </button>
                {isOpen && (
                  <div
                    className="px-5 pb-4 text-sm leading-relaxed animate-fade-up"
                    style={{ color: "var(--color-ink3)" }}
                  >
                    {f.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
