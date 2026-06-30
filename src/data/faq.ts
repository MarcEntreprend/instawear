// src/data/faq.ts
import type { FAQ } from "../types";

export const FAQS: FAQ[] = [
  {
    id: "faq-1",
    question: "Combien de temps faut-il pour recevoir ma commande ?",
    answer:
      "Votre article est imprimé sous 24h à 48h après validation de la commande, puis expédié via La Poste ou Chronopost. La livraison standard en France métropolitaine prend 3 à 5 jours ouvrés. La livraison express (2 jours) est disponible en option.",
    category: "livraison",
  },
  {
    id: "faq-2",
    question: "Comment puis-je personnaliser un design ou ajouter du texte ?",
    answer:
      "Oui, nous acceptons les personnalisations : ajout d'un prénom, d'une date, d'un numéro ou d'un message court. Mentionnez votre demande dans le champ \"Message\" lors de la commande, ou contactez-nous directement par WhatsApp ou Telegram. Des frais de personnalisation (3–5$) peuvent s'appliquer.",
    category: "produit",
  },
  {
    id: "faq-3",
    question: "Les t-shirts rétrécissent-ils au lavage ?",
    answer:
      "Nos vêtements sont en coton pré-rétréci. En suivant les instructions de lavage (30°C maximum, retourné, programme délicat), vous ne constaterez aucun rétrécissement. Les impressions sont garanties résistantes jusqu'à 50 lavages.",
    category: "produit",
  },
  {
    id: "faq-4",
    question: "Puis-je retourner ou échanger un article ?",
    answer:
      "Oui, sous 14 jours après réception. Les articles doivent être non portés et dans leur emballage d'origine. Les articles personnalisés à votre nom ne sont pas remboursables sauf défaut de fabrication. Le remboursement est effectué sous 5 à 7 jours ouvrés.",
    category: "retour",
  },
  {
    id: "faq-5",
    question: "Comment fonctionne la commande sans paiement en ligne ?",
    answer:
      "Vous remplissez le formulaire de commande, puis vous choisissez d'envoyer votre demande via WhatsApp, Telegram ou Email. Nous vous contactons sous 2h pour confirmer la disponibilité et vous transmettons un lien de paiement sécurisé (carte, virement, ou PayPal). C'est simple, sûr et sans intermédiaire.",
    category: "commande",
  },
  {
    id: "faq-6",
    question: "Livrez-vous hors de France ?",
    answer:
      "Oui, nous expédions dans toute l'Union Européenne, en Suisse, en Belgique et au Canada. Les délais varient de 5 à 10 jours ouvrés selon la destination. Les frais de livraison internationale sont calculés automatiquement lors de la commande.",
    category: "livraison",
  },
];
