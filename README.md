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

npx vite --force
-> Ça redémarre Vite en ignorant le cache !

3.  Déployer l'Edge Function

npx supabase functions deploy sync-printful --no-verify-jwt

# IPv4 Address

`192.168.15.2 `

Local: http://localhost:5173/
➜ Network: http://192.168.15.2:5173/

# Structure arborescente

```
instawear/
├── .vscode/
│   └── settings.json
├── assets/
│   └── .aistudio/
│       └── .gitignore
├── data/
│   ├── assets.json
│   ├── products.json
│   └── settings.json
├── dist/
├── node_modules/
├── public/
│   ├── flags/
│   │   ├── be.svg
│   │   ├── br.svg
│   │   ├── ca.svg
│   │   ├── ch.svg
│   │   ├── fr.svg
│   │   ├── gb.svg
│   │   ├── jp.svg
│   │   └── us.svg
│   ├── globe-off.svg
│   ├── InstaWear-logo-settings.png
│   ├── InstaWear-logo-wh-middle-no-BG.png
│   ├── InstaWear-logo.png
│   ├── Instawear-missing-item.svg
│   └── unsubscribe.html
├── src/
│   ├── admin/
│   │   ├── AdminDashboardNew.tsx
│   │   ├── adminHooks.ts
│   │   ├── AdminSidebar.tsx
│   │   ├── adminStyles.ts
│   │   ├── adminTypes.ts
│   │   ├── AdminUsersPage.tsx
│   │   ├── CustomersPage.tsx
│   │   ├── EmailMarketingPage.tsx
│   │   ├── HelpPage.tsx
│   │   ├── IntegrationsPage.tsx
│   │   ├── InteractionsPage.tsx
│   │   ├── NotificationsPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── PrintfulProductForm.tsx
│   │   ├── ProductFormPanel.tsx
│   │   ├── ProductQuickViewModal.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── PromotionsPage.tsx
│   │   ├── ReportInfoModal.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── useAdminHighlight.ts
│   │   └── emailMarketing/
│   ├── api/
│   │   ├── storageApi.ts
│   │   └── supabaseApi.ts
│   ├── components/
│   │   ├── AboutSection.tsx
│   │   ├── AccountPage.tsx
│   │   ├── AuthModal.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── CatalogSection.tsx
│   │   ├── CheckoutFlow.tsx
│   │   ├── DealsSection.tsx
│   │   ├── FaqSection.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── HeroCarousel.tsx
│   │   ├── NotFound.tsx
│   │   ├── OrderModal.tsx
│   │   ├── OrderTrackingModal.tsx
│   │   ├── ProductDetailModal.tsx
│   │   ├── ProductModal.tsx
│   │   ├── ProfileModal.tsx
│   │   ├── ReassuranceBar.tsx
│   │   ├── StoreProductCard.tsx
│   │   ├── TagInput.tsx
│   │   └── ToastContainer.tsx
│   ├── constants/
│   │   └── assets.ts
│   ├── data/
│   │   ├── faq.ts
│   │   └── shippingRates.ts
│   ├── hooks/
│   │   ├── useCurrencySymbol.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useShippingSettings.ts
│   │   └── useTabBadge.ts
│   ├── lib/
│   │   └── supabaseClient.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   └── vite-env.d.ts
├── supabase/
│   ├── .temp/
│   │   ├── cli-latest
│   │   ├── gotrue-version
│   │   ├── linked-project.json
│   │   ├── pooler-url
│   │   ├── postgres-version
│   │   ├── project-ref
│   │   ├── rest-version
│   │   ├── storage-migration
│   │   └── storage-version
│   ├── config.toml
│   └── functions/
│       ├── create-printful-order/
│       │   └── index.ts
│       ├── reset-password/
│       │   └── index.ts
│       ├── send-email/
│       │   └── index.ts
│       ├── stripe-checkout/
│       │   └── index.ts
│       ├── stripe-webhook/
│       │   └── index.ts
│       └── sync-printful/
│           ├── .npmrc
│           ├── deno.json
│           └── index.ts
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

# Fixes & Improvements

pour ces bugs, il faut d abord verifier si vraiment le ou les problemes cités existent, ensuite les resoudres.

## ton Role, @Deepseek :

```
->>>> tu es un senior dans les top 0,1% expert dans le domaine et tu sais la bonne approche infaillible. Tu peux me demander de te montrer des fichiers, me poser questions pour clarifier tt ce que tu veux jusqua ce que tu sois au moins 95% confiant de tes réponses. si t es pas au moins 95% confiant, demande moi ce dont tu as besoin
Simple, efficace, sans dettes techniques

# AGENT.md

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to my request.

## 4. Goal-Driven Execution
```

# 📊 Checklist InstaWear

---

## 🐛 Bugs

### Panier

- [*] **Double ajout** — parfois 2 items au lieu d'1 au clic sur "Ajouter au panier" ou "Acheter maintenant"
- [*] **Persistance après refresh** — le panier ne doit être vidé qu'après un checkout réussi
- [x] Toast caché derrière la modale
- [x] Validation formulaire : scroll vers le champ manquant + surbrillance
- [x] Effacement du message d'erreur quand l'utilisateur remplit le champ
- [x] Message "This order does not belong to you" pour les invités
- [x] Écart de prix entre checkout et Stripe (frais de port manquants)

### Header

- [x] Logo / nom InstaWear rafraîchit la page
- [x] Barre de recherche redirige vers le produit

### Order Page (admin)

- [x] Bouton "Envoyer à Printful" avec animation spinner
- [x] Statut "En production" = même action que "Envoyer à Printful"
- [ ] **Statut non synchronisé** — commande pas envoyée à Printful mais site affiche "envoyé"

### Notifications (admin)

- [x] Actions groupées actives sur sélections mixtes (lus + non lus)
- [x] Badge dans l'onglet navigateur (nombre d'items dans le panier)

### Sidebar panier

- [x] Fermeture au clic extérieur

### Offline / Erreurs

- [x] Fallback réseau (message "Oups !")
- [x] Fallback images
- [x] Placeholder barre de recherche générique

### Stripe Checkout

- [x] Animation de chargement (spinner "Redirection vers Stripe…")
- [x] Simulation email à la confirmation

---

## ✨ Améliorations

### 🔐 Sécurité (⚠️ avant production)

- [ ] **RLS (Row Level Security)** sur les tables Supabase
- [ ] **Admin / user access** — vérifier les rôles dans les Edge Functions et appels API
- [ ] **Protection injections** — URL, console, fuite de clés
- [ ] Autres ?

### 🧩 UX / UI

- [ ] **Animations réactives** — standardiser hover/click sur tous les boutons
- [ ] **Icône animée** —
  - [ ] badge dans le menu latéral admin pendant une action
  - [ ] icone heart des product card (and product info modal)
- [x] Popups ne cachent plus les boutons d'achat/paiement
- [x] **Copie order ID en un clic** — icône + animation check
- [ ] **Mobile friendly** - Spécialement every user page

### 📦 Produits

- [x] Couleurs affichées et sélectionnables
- [x] Tailles affichées et sélectionnables
- [x] **Image du variant sélectionné** dans le panier, favoris, checkout
- [ ] **Image placeholder du shipping fee** dans Stripe — améliorer le visuel
- [ ] qd, dans `src\admin\OrdersPage.tsx`, on clique sur le produit d'un order, le variant de cet order doit s ouvrir auto dans le modal (idem pr coté user, qd ça s applique)
- [ ] **Standardiser `useProductAvailability`** — hook réutilisable
- [ ] **Visibilité admin** — logique actif/inactif absente de certaines pages
- [ ] **Comparatif synchronisation** — X produits sync vs Y nouveaux dans settings
- [ ] **Guide des tailles** — adapter par type de produit (shirt, casquette…)
- [ ] **Standard info - missing product** - qd effacé, plus disponible, etc

### 🚚 Livraison

- [ ] **Webhook Printful** — mise à jour automatique du tracking → déclenchement email

### 📧 Emails transactionnels

- [x] Commande confirmée (Order confirmed)
  - [ ] Ajouter les frais de transport dans le récap
- [x] Paiement confirmé (Paid)
- [ ] Paiement en attente (Pending)
- [x] En production (In Production)
- [x] Expédiée (Shipped)
- [ ] Livrée (Delivered)
- [ ] Annulée (Cancelled)
- [x] Promotions & deals

### 📮 Emails / Resend (post-domain)

- [ ] **Aligner les URLs** — utiliser le domaine d'envoi (`instawear.vercel.app`)
- [ ] **Héberger les images** — ne pas utiliser `files.cdn.printful.com`
- [ ] **Infos business** — adresse postale Doral, FL dans le pied de page

### 👤 Espace client

- [x] Page compte avec onglets (commandes, favoris, panier, support, profil)
- [ ] **Adresses sauvegardées** :
  - [ ] Éditables
  - [ ] Conserver la dernière utilisée
  - [ ] Définir une adresse préférée
- [x] Page 404 personnalisée
- [x] Bouton désinscription dans le profil

### 🦶 Footer

- [ ] **Newsletter** — repenser l'intérêt client (offres, bonus, exclusivités)
- [ ] **Liens** — compléter (Mentions légales, CGU, politique de retour…)

---

### 📊 Compteurs

| Catégorie              | Restant      |
| ---------------------- | ------------ |
| Bugs                   | 3            |
| Sécurité               | 4            |
| UX/UI                  | 3            |
| Produits               | 6            |
| Livraison              | 1            |
| Emails transactionnels | 5            |
| Emails / Resend        | 3            |
| Espace client          | 1 (adresses) |
| Footer                 | 2            |
| **Total**              | **28**       |

## Codes morts - rechercher et vérifier

- `src\components\DealsSection.tsx` -> _'Score exclusive deals on our AI-powered sports tees & hoodies before'_
