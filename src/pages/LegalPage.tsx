// src/pages/LegalPage.tsx — V2 visuals, V1 static content
import { ChevronLeft, FileText } from "lucide-react";

const DOCS: Record<string, { title: string; intro: string; sections: { heading: string; body: string[] }[] }> = {
  cgv: {
    title: "Conditions Générales de Vente",
    intro: "Les présentes CGV régissent les ventes effectuées sur InstaWear, boutique print-on-demand opérée via Printful.",
    sections: [
      { heading: "Commande et paiement", body: ["Toute commande implique l'acceptation des présentes CGV. Le paiement est exigible à la commande via Stripe. Aucune commande n'est expédiée sans paiement validé."] },
      { heading: "Livraison", body: ["Délai indicatif 3–7 jours ouvrés selon destination. Printful imprime à la demande, aucun stock n'est conservé."] },
      { heading: "Retours", body: ["Retours acceptés sous 30 jours pour défaut d'impression. Produits personnalisés non repris sauf défaut."] },
    ],
  },
  privacy: {
    title: "Politique de Confidentialité",
    intro: "InstaWear collecte le minimum nécessaire au traitement des commandes et à l'amélioration du service.",
    sections: [
      { heading: "Données collectées", body: ["Email, adresse de livraison, historique de commandes. Aucune donnée bancaire conservée (Stripe)."] },
      { heading: "Conservation", body: ["Données conservées 3 ans après dernière commande, sauf obligation légale."] },
    ],
  },
  cookies: {
    title: "Politique Cookies",
    intro: "Ce site utilise des cookies essentiels et, avec votre consentement, des cookies d'analyse.",
    sections: [
      { heading: "Cookies essentiels", body: ["Nécessaires au panier et à l'authentification. Toujours actifs."] },
      { heading: "Cookies d'analyse", body: ["Avec votre consentement (bandeau), nous mesurons l'audience pour améliorer le catalogue."] },
    ],
  },
};

export default function LegalPage({ slug, onBack }: { slug: string; onBack: () => void }) {
  const doc = DOCS[slug] || DOCS.cgv;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--color-bg)] animate-fade-in">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center gap-2">
        <button onClick={onBack} aria-label="Retour" className="btn-icon w-8 h-8"><ChevronLeft size={15} /></button>
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
