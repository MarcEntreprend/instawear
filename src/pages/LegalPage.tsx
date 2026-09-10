// src/pages/LegalPage.tsx — V2 visuals, V1 static content
import { ChevronLeft, FileText } from "lucide-react";
import { usePageMeta } from "../hooks/usePageMeta";
import { DOCS } from "../data/legal";

export default function LegalPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const doc = DOCS[slug] || DOCS.cgv;
  usePageMeta({
    title: doc.title,
    description: doc.intro.slice(0, 158),
    url: `https://instawear.vercel.app/legal/${slug}`,
  });
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center gap-2">
        <button onClick={onBack} aria-label="Back" className="btn-icon w-8 h-8"><ChevronLeft size={15} /></button>
        <span className="text-xs" style={{ color: "var(--color-ink3)" }}>InstaWear / {doc.title}</span>
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}><FileText size={22} /></span>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-2" style={{ color: "var(--color-ink)" }}>{doc.title}</h1>
        <p className="text-sm leading-relaxed mb-10" style={{ color: "var(--color-ink2)" }}>{doc.intro}</p>
        <div className="flex flex-col gap-8">
          {doc.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-base font-bold mb-3" style={{ color: "var(--color-ink)" }}>{section.heading}</h2>
              {section.body.map((p, i) => <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: "var(--color-ink2)" }}>{p}</p>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
