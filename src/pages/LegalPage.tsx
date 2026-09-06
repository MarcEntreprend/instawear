// src/pages/LegalPage.tsx — V2 visuals, V1 static content
import { ChevronLeft, FileText } from "lucide-react";
import { usePageMeta } from "../hooks/usePageMeta";

const DOCS: Record<string, { title: string; intro: string; sections: { heading: string; body: string[] }[] }> = {
  cgv: {
    title: "Terms and Conditions",
    intro: "These Terms and Conditions govern sales made on InstaWear, a print-on-demand store operated via Printful.",
    sections: [
      { heading: "Ordering and Payment", body: ["All orders imply acceptance of these Terms. Payment is due at checkout via Stripe. No order is shipped without validated payment."] },
      { heading: "Delivery", body: ["Estimated lead time 3–7 business days depending on destination. Printful prints on demand, no stock is held."] },
      { heading: "Returns", body: ["Returns accepted within 30 days for printing defects. Customized products not accepted for return unless defective."] },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "InstaWear collects the minimum necessary to process orders and improve service.",
    sections: [
      { heading: "Data Collected", body: ["Email, shipping address, order history. No payment data stored (Stripe)."] },
      { heading: "Retention", body: ["Data kept for 3 years after last order, unless legal obligation requires longer."] },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    intro: "This site uses essential cookies and, with your consent, analytics cookies.",
    sections: [
      { heading: "Essential Cookies", body: ["Required for cart and authentication. Always active."] },
      { heading: "Analytics Cookies", body: ["With your consent (banner), we measure audience to improve the catalog."] },
    ],
  },
};

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
