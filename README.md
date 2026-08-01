# InstaWear

Boutique en ligne Print-on-Demand de vêtements événementiels (sport, festivals, saisons). Designs générés par IA, impression par Printful.

## Run Locally

**Prerequisites :** Node.js

1. Install dependencies :
   `npm install`
2. Run the app :
   `npm run dev`

<!--  -->

`npx vite --host`

`npx vite --force`
-> Ça redémarre Vite en ignorant le cache !

```

Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue

```

Supprime le cache de Vite (node_modules/.vite). Vite stocke les fichiers précompilés ici. Les supprimer force Vite à tout recompiler proprement au prochain npm run dev. Résout les erreurs 500 sur des fichiers CSS/JS qui persistent après correction.

3. Déployer l'Edge Function

```

npx supabase functions deploy sync-printful --no-verify-jwt
npx supabase functions deploy create-printful-order --no-verify-jwt
npx supabase functions deploy printful-webhook --no-verify-jwt
npx supabase functions deploy send-email --no-verify-jwt
npx supabase functions deploy stripe-checkout --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy reset-password --no-verify-jwt

```

## IPv4 Address

`192.168.15.2`

Local: http://localhost:5173/
➜ Network: http://192.168.15.2:5173/

## Structure arborescente

```

instawear/
├── .vscode/
│ └── settings.json
├── assets/
│ └── .aistudio/
│ └── .gitignore
├── data/
│ ├── assets.json
│ ├── products.json
│ └── settings.json
├── dist/
├── node_modules/
├── public/
│ ├── flags/
│ │ ├── be.svg
│ │ ├── br.svg
│ │ ├── ca.svg
│ │ ├── ch.svg
│ │ ├── fr.svg
│ │ ├── gb.svg
│ │ ├── jp.svg
│ │ └── us.svg
│ ├── globe-off.svg
│ ├── InstaWear-logo-settings.png
│ ├── InstaWear-logo-wh-middle-no-BG.png
│ ├── InstaWear-logo.png
│ ├── Instawear-missing-item.svg
│ └── unsubscribe.html
├── src/
│ ├── admin/
│ │ ├── emailMarketing/
│ │ │ ├── constants.tsx
│ │ │ ├── emailTemplates.tsx
│ │ │ ├── helpers.ts
│ │ │ ├── useToast.ts
│ │ │ └── VariablesModal.tsx
│ │ ├── AdminDashboardNew.tsx
│ │ ├── adminHooks.ts
│ │ ├── AdminSidebar.tsx
│ │ ├── adminStyles.ts
│ │ ├── adminTypes.ts
│ │ ├── AdminUsersPage.tsx
│ │ ├── CustomersPage.tsx
│ │ ├── EmailMarketingPage.tsx
│ │ ├── HelpPage.tsx
│ │ ├── IntegrationsPage.tsx
│ │ ├── InteractionsPage.tsx
│ │ ├── NotificationsPage.tsx
│ │ ├── OrdersPage.tsx
│ │ ├── PrintfulProductForm.tsx
│ │ ├── ProductFormPanel.tsx
│ │ ├── ProductQuickViewModal.tsx
│ │ ├── ProductsPage.tsx
│ │ ├── PromotionsPage.tsx
│ │ ├── ReportInfoModal.tsx
│ │ ├── ReportsPage.tsx
│ │ ├── SettingsPage.tsx
│ │ └── useAdminHighlight.ts
│ ├── api/
│ │ ├── storageApi.ts
│ │ └── supabaseApi.ts
│ ├── components/
│ │ ├── AboutSection.tsx
│ │ ├── AccountPage.tsx
│ │ ├── AuthModal.tsx
│ │ ├── CartDrawer.tsx
│ │ ├── CatalogSection.tsx
│ │ ├── CheckoutFlow.tsx
│ │ ├── CopyID.tsx
│ │ ├── DealsSection.tsx
│ │ ├── FaqSection.tsx
│ │ ├── Footer.tsx
│ │ ├── Header.tsx
│ │ ├── HeroCarousel.tsx
│ │ ├── NotFound.tsx
│ │ ├── OrderModal.tsx
│ │ ├── OrderTrackingModal.tsx
│ │ ├── ProductDetailModal.tsx
│ │ ├── ProductModal.tsx
│ │ ├── ProfileModal.tsx
│ │ ├── ReassuranceBar.tsx
│ │ ├── StoreProductCard.tsx
│ │ ├── TagInput.tsx
│ │ └── ToastContainer.tsx
│ ├── constants/
│ │ └── assets.ts
│ ├── data/
│ │ ├── countries.ts
│ │ ├── faq.ts
│ │ └── shippingRates.ts
│ ├── hooks/
│ │ ├── useCurrencySymbol.ts
│ │ ├── useLocalStorage.ts
│ │ ├── useShippingSettings.ts
│ │ └── useTabBadge.ts
│ ├── lib/
│ │ └── supabaseClient.ts
│ ├── utils/
│ │ ├── emailTemplates.ts
│ │ └── format.ts
│ ├── App.tsx
│ ├── index.css
│ ├── main.tsx
│ ├── types.ts
│ └── vite-env.d.ts
├── supabase/
│ ├── .temp/
│ ├── functions/
│ │ ├── create-printful-order/
│ │ │ └── index.ts
│ │ ├── printful-webhook/
│ │ │ └── index.ts
│ │ ├── reset-password/
│ │ │ └── index.ts
│ │ ├── send-email/
│ │ │ └── index.ts
│ │ ├── stripe-checkout/
│ │ │ └── index.ts
│ │ ├── stripe-webhook/
│ │ │ └── index.ts
│ │ └── sync-printful/
│ │ ├── .npmrc
│ │ ├── deno.json
│ │ └── index.ts
│ └── config.toml
├── .env
├── .env.example
├── .env.local
├── .gitignore
├── AGENT.md
├── Doc-specification-technique.md
├── fixes and improvements.md
├── index.html
├── metadata.json
├── package-lock.json
├── package.json
├── README.md
├── server.ts
├── tsconfig.json
├── vercel.json
└── vite.config.ts

```

## 📊 Checklist InstaWear — Mise à jour

---

### 🐛 Bugs

#### Panier

- [*] **Double ajout** — parfois 2 items au lieu d'1 au clic sur "Ajouter au panier" ou "Acheter maintenant"
- [*] **Persistance après refresh** — le panier ne doit être vidé qu'après un checkout réussi
- [x] Toast caché derrière la modale
- [x] Validation formulaire : scroll vers le champ manquant + surbrillance
- [x] Effacement du message d'erreur quand l'utilisateur remplit le champ
- [x] Message "This order does not belong to you" pour les invités
- [x] Écart de prix entre checkout et Stripe (frais de port manquants)

#### Header

- [x] Logo / nom InstaWear rafraîchit la page
- [x] Barre de recherche redirige vers le produit

#### Order Page (admin)

- [x] Bouton "Envoyer à Printful" avec animation spinner
- [x] Statut "En production" = même action que "Envoyer à Printful"
- [x] **Statut non synchronisé** — commande pas envoyée à Printful mais site affiche "envoyé"

#### Notifications (admin)

- [x] Actions groupées actives sur sélections mixtes (lus + non lus)
- [x] Badge dans l'onglet navigateur (nombre d'items dans le panier)

#### Sidebar panier

- [x] Fermeture au clic extérieur

#### Offline / Erreurs

- [x] Fallback réseau (message "Oups !")
- [x] Fallback images
- [x] Placeholder barre de recherche générique

#### Stripe Checkout

- [x] Animation de chargement (spinner "Redirection vers Stripe…")
- [x] Simulation email à la confirmation

---

### ✨ Améliorations

#### Prévoire erreur address

- [x] **Anticiper les mauvaises infos lors du checkout, et meme depuis accountpage** : car les mauvaises addressses par exemples passent payment (ne devraient pas) mais bloquent à la production (par ex si le zip code n est pas bon, printful ne prend pas la production). ce qui va me forcer un refund.

```

Erreur d'envoi à Printful : Erreur Printful: {"code":400,"result":"Recipient: Shipping address state and ZIP code don't match. Enter the correct state or ZIP code.","error":{"reason":"BadRequest","message":"Recipient: Shipping address state and ZIP code don't match. Enter the correct state or ZIP code."}}

```

#### 🔐 Sécurité (⚠️ avant production)

- [ ] **RLS (Row Level Security)** sur les tables Supabase
- [ ] **Admin / user access** — vérifier les rôles dans les Edge Functions et appels API
- [ ] **Protection injections** — URL, console, fuite de clés
- [ ] Autres ?

#### 🧩 UX / UI

- [ ] **Animations réactives** — standardiser hover/click sur tous les boutons
- [ ] **Badge de commandes non consultées** — indicateur chiffré à côté de l'icône "Orders" dans la sidebar admin (nouvelles commandes + changements de statut Printful)
- [ ] Icône cœur des cartes produit (et modale info produit)
- [x] Popups ne cachent plus les boutons d'achat/paiement
- [x] **Copie order ID en un clic** — icône + animation check
- [ ] **Mobile friendly** — toutes les pages utilisateur
- dans `src\admin\InteractionsPage.tsx`, dans la conversation ainsi, cliquer sur l'order id doit suggérer deux choses :
- [ ] **Voir détails rapide** : faire apparaitre le meme modal `Order detail modal` de `src\admin\OrdersPage.tsx`, tout en restant dans la conversa (renommer en OrderQuickViewModal ?)
- _Voir dans commande_ : naviguer vers la page order, avec useAdminHighlight

#### 📦 Produits

- [x] Couleurs affichées et sélectionnables
- [x] Tailles affichées et sélectionnables
- [x] **Image du variant sélectionné** dans le panier, favoris, checkout
- [x] **Image placeholder du shipping fee** dans Stripe — remplacé par icône boîte
- [x] **Ouvrir le variant correspondant** — clic sur un produit dans OrdersPage (admin) ou espace client → le variant exact s'ouvre dans le modal
- [x] checking variant missmatch :
- [x] in mail for Order confirmed (while the good variant is passed in Payment pending mails)
- [x] on printful, the wrong variant is passed / or not passed at all
- [ ] **Standardiser `useProductAvailability`** — hook réutilisable
- [ ] **verify promotions** : working smooth ? promotional products shown on filter "Deals🔴" ?
- [ ] **Visibilité admin** — logique actif/inactif absente de certaines pages
- [ ] **Comparatif synchronisation** — X produits sync vs Y nouveaux dans settings
- [x] **Guide des tailles** — dynamique via API Printful, fallback "(Approx.)" pour les manuels
- [ ] **Info standard produit manquant** — message uniforme quand un produit est supprimé/indisponible
- [ ] **Comments and review ?** also showing in the user's dashboard.

#### 🚚 Livraison

- [x] **Webhook Printful** — mise à jour automatique du tracking → déclenchement email
- [x] **Webhook & mail**
- [x] faut verifier que je reçoive dans mes notifications (src\admin\NotificationsPage.tsx) des infos sur les statuts des order => ce n est pas encore mis en place
- [x] faut verifier que le user reçoive les notifications qu'il faut aussi
- [x] et verifier que le webhook modifie le statut du order dans mon projet /ma bdd réellement (écoute réel).
- en testant les webhook manuellement (powershell), les mails reçus dans mon resend :
  - [x] package_shipped : "Your order has been shipped! 📦"
  - [x] order_failed : "Issue with your order ⚠️"
  - [x] order_canceled : "❌ Your order has been cancelled"

- webhook optionnels :
- [ ] order_put_hold 🟡 Optionnel : alerte admin "commande en pause"
- [ ] order_remove_hold 🟡 Optionnel : alerte "reprise"
- [ ] order_refunded 🟡 Optionnel : log admin
- [ ] package_returned 🟡 Optionnel : statut → returned
- [ ] product_synced ⚪ Pas nécessaire (déjà géré par sync)
- [ ] product_updated ⚪ Pas nécessaire
- [ ] product_deleted ⚪ Pas nécessaire
- [ ] stock_updated ⚪ Pas nécessaire pour l'instant
- [ ] order_put_hold_approval ⚪ Pas nécessaire

#### 📧 Emails transactionnels

- [x] Commande confirmée (Order confirmed)
- [x] Ajouter les frais de transport dans le récap email
- [x] Paiement confirmé (Paid)
- [x] Paiement en attente (Pending)
- [x] En production (In Production)
- [x] Expédiée (Shipped)
- [x] Livrée (Delivered)
- [x] Annulée (Cancelled)
- [x] Promotions & deals
- [ ] order_failed vs order_canceled : quel cas n est pas encore couvert (car chacun a un webhook, donc doit avoir un mail)

#### 📮 Emails / Resend (post-domain)

- [ ] **Aligner les URLs** — utiliser le domaine d'envoi (`instawear.vercel.app`)
- [ ] **Héberger les images** — ne pas utiliser `files.cdn.printful.com`
- [ ] **Infos business** — adresse postale Doral, FL dans le pied de page email

#### 👤 Espace client

- [x] Bouton 'Buy Now' doit diriger directement vers step un, avec tout le panier
- [x] Page compte avec onglets (commandes, favoris, panier, support, profil)
- [x] **Adresses sauvegardées** (éditable, dernière utilisée conservée, préférée)
- [x] Page 404 personnalisée
- [x] Bouton désinscription dans le profil

#### 🦶 Footer

- [ ] **Newsletter** — repenser l'intérêt client (offres, bonus, exclusivités)
- [ ] **Liens** — compléter (Mentions légales, CGU, politique de retour…)

#### Codes morts - rechercher et vérifier

- [ ] `src\components\DealsSection.tsx` -> _'Score exclusive deals on our AI-powered sports tees & hoodies before'_

---

## 📊 Compteurs de ce qui reste

| Catégorie              | Restant | Détail                                                                       |
| ---------------------- | ------- | ---------------------------------------------------------------------------- |
| Bugs                   | 3       | Double ajout, persistance panier, validation adresse                         |
| Sécurité               | 3       | RLS, accès, injections                                                       |
| UX/UI                  | 4       | Animations, badge admin, mobile friendly, icône cœur                         |
| Produits               | 4       | Standardiser dispo, visibilité admin, comparatif sync, info produit manquant |
| Emails transactionnels | 1       | `order_failed` vs `order_canceled`                                           |
| Emails / Resend        | 3       | URLs, images, infos business                                                 |
| Footer                 | 2       | Newsletter, liens                                                            |
| **Total**              | **20**  |                                                                              |
