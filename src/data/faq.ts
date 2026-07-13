// src/data/faq.ts
import type { FAQ } from "../types";

export const FAQS: FAQ[] = [
  {
    id: "faq-1",
    question: "How long does it take to receive my order?",
    answer:
      "Your item is printed within 24 to 48 hours after order confirmation, then shipped via standard mail or express courier. Standard delivery within the US takes 3 to 5 business days. Express delivery (2 days) is available as an option at checkout.",
    category: "livraison",
  },
  {
    id: "faq-2",
    question: "Can I customize a design or add text?",
    answer:
      'Yes, we accept personalization requests: add a name, date, number, or short message. Just mention your request in the "Message" field at checkout, or contact us directly via WhatsApp or Telegram. A small customization fee ($3–$5) may apply.',
    category: "produit",
  },
  {
    id: "faq-3",
    question: "Do the t‑shirts shrink after washing?",
    answer:
      "Our garments are made from pre‑shrunk cotton. By following the care instructions (max 30°C / 86°F, wash inside out, delicate cycle), you won't experience any shrinkage. Prints are guaranteed to last up to 50 washes.",
    category: "produit",
  },
  {
    id: "faq-4",
    question: "Can I return or exchange an item?",
    answer:
      "Yes, within 14 days of receipt. Items must be unworn and in their original packaging. Customized items with your name are non‑refundable unless there is a manufacturing defect. Refunds are processed within 5 to 7 business days.",
    category: "retour",
  },
  {
    id: "faq-5",
    question: "How does ordering without paying online work?",
    answer:
      "You fill out the order form, then choose to send your request via WhatsApp, Telegram, or Email. We'll get back to you within 2 hours to confirm availability and send you a secure payment link (card, bank transfer, or PayPal). Simple, safe, and no middleman.",
    category: "commande",
  },
  {
    id: "faq-6",
    question: "Do you ship outside the US?",
    answer:
      "Yes, we ship throughout the European Union, Switzerland, Belgium, and Canada. Delivery times range from 5 to 10 business days depending on the destination. International shipping fees are calculated automatically at checkout.",
    category: "livraison",
  },
];
