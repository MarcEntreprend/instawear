// src/admin/emailMarketing/emailTemplates.ts
// Templates et constantes pour l'email marketing

import React from "react";
import {
  Percent,
  Package,
  ShoppingBag,
  Bell,
  UserPlus,
  TrendingUp,
  Star,
} from "lucide-react";

export interface AutomationFlow {
  id: string;
  name: string;
  trigger_type:
    | "welcome"
    | "abandoned_cart"
    | "post_purchase"
    | "win_back"
    | "birthday";
  enabled: boolean;
  delay_days: number;
  subject: string;
  html_body: string;
  sent_count?: number;
}

export type AudienceType =
  | "newsletter"
  | "all_customers"
  | "promo_opted"
  | "custom";

export interface Template {
  id: string;
  label: string;
  icon: React.ReactNode;
  subject: string;
  html: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "promo",
    label: "Promotion",
    icon: <Percent size={16} strokeWidth={1.75} />,
    subject: "🎉 Offre exclusive — {{discount}}% de réduction",
    html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff">
  <h1 style="font-size:32px;font-weight:800;color:#1a1916;margin:0 0 8px">{{brand}}</h1>
  <p style="font-size:16px;color:#7a7872;margin:0 0 32px">Collection événementielle</p>
  <div style="background:#fff2ef;border-radius:16px;padding:32px;text-align:center;margin:0 0 24px">
    <p style="font-size:14px;font-weight:600;color:#ff5c35;text-transform:uppercase;letter-spacing:.1em;margin:0 0 8px">Offre limitée</p>
    <h2 style="font-size:48px;font-weight:900;color:#ff5c35;margin:0">{{discount}}%</h2>
    <p style="font-size:18px;font-weight:700;color:#1a1916;margin:8px 0 24px">de réduction sur toute la collection</p>
    <a href="{{cta_link}}" style="display:inline-block;background:#ff5c35;color:#fff;padding:14px 36px;border-radius:99px;font-weight:700;text-decoration:none;font-size:15px">Profiter de l'offre →</a>
  </div>
<p style="font-size:12px;color:#b5b3af;text-align:center;margin-top:24px">InstaWear · 123 Main Street, Doral, FL 10001<br><a href="{{unsubscribe_link}}" style="color:#b5b3af;text-decoration:underline">Unsubscribe</a></p>
</div>`,
  },
  {
    id: "new_product",
    label: "Nouveau produit",
    icon: <Package size={16} strokeWidth={1.75} />,
    subject: "✨ Nouvelle arrivée — {{product_name}}",
    html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff">
  <h1 style="font-size:24px;font-weight:800;color:#1a1916;margin:0 0 24px">{{brand}}</h1>
  <p style="font-size:13px;font-weight:600;color:#ff5c35;text-transform:uppercase;letter-spacing:.1em;margin:0 0 8px">Nouveau</p>
  <h2 style="font-size:28px;font-weight:800;color:#1a1916;margin:0 0 16px">{{product_name}}</h2>
  <p style="font-size:15px;color:#7a7872;line-height:1.6;margin:0 0 24px">{{product_description}}</p>
  <a href="{{cta_link}}" style="display:inline-block;background:#1a1916;color:#fff;padding:14px 36px;border-radius:99px;font-weight:700;text-decoration:none;font-size:15px">Découvrir →</a>
  <p style="font-size:12px;color:#b5b3af;margin-top:32px">InstaWear · 123 Main Street, Doral, FL 10001<br><a href="{{unsubscribe_link}}" style="color:#b5b3af;text-decoration:underline">Unsubscribe</a></p>
</div>`,
  },
  {
    id: "cart_recovery",
    label: "Relance panier",
    icon: <ShoppingBag size={16} strokeWidth={1.75} />,
    subject: "🛒 Vous avez oublié quelque chose…",
    html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff">
  <h1 style="font-size:24px;font-weight:800;color:#1a1916;margin:0 0 8px">{{brand}}</h1>
  <p style="font-size:16px;color:#7a7872;margin:0 0 32px">Votre panier vous attend</p>
  <p style="font-size:17px;font-weight:600;color:#1a1916;margin:0 0 8px">Bonjour {{name}},</p>
  <p style="font-size:15px;color:#7a7872;line-height:1.6;margin:0 0 24px">Vous avez laissé des articles dans votre panier. Ils ne vous attendront pas éternellement…</p>
  <a href="{{cart_link}}" style="display:inline-block;background:#ff5c35;color:#fff;padding:14px 36px;border-radius:99px;font-weight:700;text-decoration:none;font-size:15px">Finaliser ma commande →</a>
  <p style="font-size:12px;color:#b5b3af;margin-top:32px">InstaWear · 123 Main Street, Doral, FL 10001<br><a href="{{unsubscribe_link}}" style="color:#b5b3af;text-decoration:underline">Unsubscribe</a></p>
</div>`,
  },
  {
    id: "announcement",
    label: "Annonce",
    icon: <Bell size={16} strokeWidth={1.75} />,
    subject: "📣 {{title}}",
    html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#fff">
  <h1 style="font-size:24px;font-weight:800;color:#1a1916;margin:0 0 24px">{{brand}}</h1>
  <h2 style="font-size:28px;font-weight:800;color:#1a1916;margin:0 0 16px">{{title}}</h2>
  <p style="font-size:15px;color:#7a7872;line-height:1.6;margin:0 0 24px">{{body}}</p>
  <a href="{{cta_link}}" style="display:inline-block;background:#1a1916;color:#fff;padding:14px 36px;border-radius:99px;font-weight:700;text-decoration:none;font-size:15px">En savoir plus →</a>
  <p style="font-size:12px;color:#b5b3af;margin-top:32px">InstaWear · 123 Main Street, Doral, FL 10001<br><a href="{{unsubscribe_link}}" style="color:#b5b3af;text-decoration:underline">Unsubscribe</a></p>
</div>`,
  },
];

export const AUTOMATION_CONFIGS: Record<
  AutomationFlow["trigger_type"],
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    description: string;
  }
> = {
  welcome: {
    label: "Email de bienvenue",
    icon: <UserPlus size={16} strokeWidth={1.75} />,
    color: "var(--notif-cat-customers)",
    bg: "var(--notif-cat-customers-bg)",
    description: "Envoyé immédiatement après l'inscription à la newsletter",
  },
  abandoned_cart: {
    label: "Relance panier abandonné",
    icon: <ShoppingBag size={16} strokeWidth={1.75} />,
    color: "var(--notif-cat-orders)",
    bg: "var(--notif-cat-orders-bg)",
    description: "Envoyé X heures après abandon du panier",
  },
  post_purchase: {
    label: "Post-achat",
    icon: <Package size={16} strokeWidth={1.75} />,
    color: "var(--notif-cat-products)",
    bg: "var(--notif-cat-products-bg)",
    description: "Envoyé X jours après livraison",
  },
  win_back: {
    label: "Réactivation clients inactifs",
    icon: <TrendingUp size={16} strokeWidth={1.75} />,
    color: "var(--notif-cat-bonus)",
    bg: "var(--notif-cat-bonus-bg)",
    description: "Envoyé aux clients sans achat depuis X jours",
  },
  birthday: {
    label: "Anniversaire",
    icon: <Star size={16} strokeWidth={1.75} />,
    color: "var(--notif-cat-finance)",
    bg: "var(--notif-cat-finance-bg)",
    description: "Envoyé le jour J si la date est connue",
  },
};