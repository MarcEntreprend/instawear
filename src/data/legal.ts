// src/data/legal.ts — contenu statique des pages légales.
// Source unique : utilisée par LegalPage.tsx (affichage) et scripts/prerender.ts (SEO statique).
export interface LegalSection {
  heading: string;
  body: string[];
}
export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const DOCS: Record<string, LegalDoc> = {
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
