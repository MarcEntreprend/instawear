export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  product: string;
  date: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: "livraison" | "commande" | "produit" | "retour";
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "test-1",
    name: "Camille Rousseau",
    location: "Paris, France",
    rating: 5,
    text: "Reçu mon hoodie UCL en 5 jours. La qualité est bluffante — le tissu est épais, l'impression impeccable. J'étais sceptique sur le print-on-demand mais InstaWear m'a définitivement convaincue.",
    product: "Hoodie UCL Champions Finals 2026",
    date: "14 mai 2026",
  },
  {
    id: "test-2",
    name: "Marco Ferreira",
    location: "Lyon, France",
    rating: 5,
    text: "Le t-shirt Rio Carnival est exactement comme sur les photos. Les couleurs néon sont vibrantes et restent intactes après plusieurs lavages. Porté à un festival, tout le monde me demandait où le trouver.",
    product: "T-Shirt Rio Carnival Neon 2026",
    date: "3 avril 2026",
  },
  {
    id: "test-3",
    name: "Sophie Marchetti",
    location: "Bordeaux, France",
    rating: 4,
    text: "Commande via WhatsApp très simple et réactive. J'ai eu une réponse en moins de 2h et ma casquette a été expédiée le lendemain. Design original, vraiment pas générique.",
    product: "Casquette Olympics Vintage 2026",
    date: "21 mars 2026",
  },
  {
    id: "test-4",
    name: "Antoine Delbos",
    location: "Toulouse, France",
    rating: 5,
    text: "Le hoodie Halloween brille vraiment dans le noir. Mes enfants ont adoré. Service client au top — ils ont géré un problème de taille en un seul échange Telegram. Je recommande à 100%.",
    product: "Hoodie Halloween Creepy Glow 2026",
    date: "1 nov. 2025",
  },
];

export const FAQS: FAQ[] = [
  {
    id: "faq-1",
    question: "Combien de temps pour recevoir ma commande ?",
    answer:
      "Votre article est imprimé sous 24–48h après validation, puis expédié via La Poste ou Chronopost. Livraison standard en France métropolitaine : 3 à 5 jours ouvrés. Option express (2 jours) disponible.",
    category: "livraison",
  },
  {
    id: "faq-2",
    question: "Puis-je personnaliser un design ou ajouter du texte ?",
    answer:
      "Oui, nous acceptons les personnalisations : ajout d'un prénom, d'une date, d'un message court. Mentionnez votre demande dans le champ « Message » lors de la commande, ou contactez-nous directement par WhatsApp ou Telegram. Des frais de 3–5€ peuvent s'appliquer.",
    category: "produit",
  },
  {
    id: "faq-3",
    question: "Les vêtements rétrécissent-ils au lavage ?",
    answer:
      "Nos vêtements sont en coton pré-rétréci. En suivant les instructions (30°C maximum, retourné, programme délicat), vous ne constaterez aucun rétrécissement. Impressions garanties résistantes jusqu'à 50 lavages.",
    category: "produit",
  },
  {
    id: "faq-4",
    question: "Puis-je retourner ou échanger un article ?",
    answer:
      "Oui, sous 14 jours après réception. Articles non portés dans leur emballage d'origine. Les articles personnalisés à votre nom ne sont pas remboursables sauf défaut de fabrication. Remboursement effectué sous 5–7 jours ouvrés.",
    category: "retour",
  },
  {
    id: "faq-5",
    question: "Comment fonctionne la commande sans paiement en ligne ?",
    answer:
      "Vous remplissez le formulaire de commande, puis vous choisissez d'envoyer votre demande via WhatsApp, Telegram ou Email. Nous vous contactons sous 2h pour confirmer et vous transmettons un lien de paiement sécurisé (carte, virement, ou PayPal).",
    category: "commande",
  },
  {
    id: "faq-6",
    question: "Livrez-vous hors de France ?",
    answer:
      "Oui, nous expédions dans toute l'Union Européenne, en Suisse, Belgique et au Canada. Délais de 5 à 10 jours ouvrés selon la destination. Les frais de livraison internationale sont calculés lors de la commande.",
    category: "livraison",
  },
];
