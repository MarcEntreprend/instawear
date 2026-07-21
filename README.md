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
-> Ça redémarre Vite en ignorant le cache. Bon pour la suite !

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
│   └── Instawear-missing-item.svg
├── src/
│   ├── admin/
│   │   ├── AdminDashboardNew.tsx
│   │   ├── adminHooks.ts
│   │   ├── AdminSidebar.tsx
│   │   ├── adminTypes.ts
│   │   ├── AdminUsersPage.tsx
│   │   ├── CustomersPage.tsx
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
│   │   └── useAdminHighlight.ts
│   ├── api/
│   │   ├── storageApi.ts
│   │   └── supabaseApi.ts
│   ├── components/
│   │   ├── AboutSection.tsx
│   │   ├── AuthModal.tsx
│   │   ├── AccountPage.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── CatalogSection.tsx
│   │   ├── CheckoutFlow.tsx
│   │   ├── DealsSection.tsx
│   │   ├── FaqSection.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── HeroCarousel.tsx
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

## 📊 Checklist mise à jour

### 🐛 Bugs

#### Panier

- [ ] **Double ajout au panier** : parfois 2 items ajoutés au lieu d'1 lors du clic sur "Ajouter au panier" ou "Acheter maintenant". Vérifier.
- [x] **Toast caché derrière la modale** : quand on ajoute au panier depuis la modale produit, le toast s'affiche derrière
- [ ] **Persistance panier après refresh** : le panier ne doit être vidé qu'après un checkout réussi, pas avant
- [x] **Validation formulaire checkout** : quand un champ obligatoire manque, scroller vers ce champ et le mettre en surbrillance
- [x] **Effacer message d'erreur** : quand l'utilisateur commence à remplir un champ, effacer le message d'erreur associé
- [ ] **"This order does not belong to you"** : le message apparaît quand l'email du client connecté ne correspond pas à celui de la commande. Vérifier dans `App.tsx` (retour Stripe) et `CheckoutFlow.tsx` si le flux invité (utilisateur non connecté) est bien géré sans bloquer la commande.
- [ ] **Écart prix checkout (14 $) vs Stripe (22 $)** : le total transmis à Stripe (`unitAmount: Math.round(item.product.price * 100)`) n'inclut pas les frais de port. Vérifier comment le `total` (avec shipping) est transmis à l'Edge Function `stripe-checkout`.

#### Header

- [x] **Logo / nom InstaWear** : le clic doit rafraîchir la page (pas seulement rester sur place)
- [x] **Barre de recherche** : le clic sur un résultat doit rediriger vers le produit

#### Order Page

- [x] **Bouton "Envoyer à Printful"** : ajouter une animation de chargement (spinner) pendant l'envoi
- [x] **Changement de statut "En production"** : doit avoir la même action que le bouton "Envoyer à Printful" du modal
- [ ] **Statut non synchronisé** : gérer le cas où la commande n'est pas envoyée à Printful mais le site affiche "envoyé"

#### Notifications

- [x] **Actions groupées** : quand on sélectionne des éléments mixtes (lus + non lus), les boutons "Marquer lu" et "Marquer non lu" doivent être actifs
- [x] **Badge dans l'onglet navigateur** : afficher le nombre de notifications non lues, OU le nombre d'item dans cart (comme WhatsApp)

#### Sidebar (panier)

- [x] **Fermeture au clic extérieur** : fermer le drawer quand on clique en dehors

#### Offline / Erreurs

- [x] **Fallback réseau** : message générique "Oups ! Une erreur inattendue…" quand il n'y a pas d'internet
- [x] **Fallback images** : image par défaut quand le chargement échoue
- [x] **Placeholder barre de recherche** : texte générique quand aucun produit n'est chargé

#### Stripe Checkout

- [x] **Animation de chargement** : spinner ou loader quand la redirection Stripe prend du temps
- [x] **Simuler email** : qd purchase confirmé par stripe

---

### ✨ Améliorations

#### UX / UI

- [ ] **Animations réactives** : standardiser les effets hover/click sur tous les boutons (pills, liens, CTA)
- [ ] **Icône animée** : point/badge animé dans le menu latéral admin quand une action est en cours
- [ ] **Popups cachent boutons** : les popups peuvent cacher les boutons d'achats / paiements

#### Email

- [x] **Remplacer Telegram par email** : envoyer la confirmation de commande par email (pas seulement Telegram)
- [ ] qd le user ne trouve pas la page recherchée -> 404
- [ ] bouton desinscription dans profil

#### Produits

- [ ] **Product colors** : make sure they show up and are selectionable for specific purchase.
- [ ] **Size** : make sure they show up and are selectionable for specific purchase.
- [ ] **Standardiser disponibilité produit** : créer un hook/helper réutilisable `useProductAvailability` au lieu de dupliquer la logique dans chaque fichier
- [ ] **Visibilité admin** : la logique actif/inactif fonctionne dans Promotions, Deals et le frontstore, mais pas dans les autres pages admin

#### Footer

- [ ] **Newsletter** : repenser l'intérêt pour le client (offres, bonus, exclusivités)
- [ ] **Liens** : vérifier et compléter les liens (Mentions légales, CGU, etc.)

#### Interface utilisateur

- [x] **Espace client** : permettre aux utilisateurs de voir leurs commandes, suivis, etc.
- [ ] **Saved Address** : Saved `Addresses` :
  - Make them editable.
  - Still KEEP last one based on last transaction
  - but also a prefered one
- Voir `#### Email / post domain`
- [ ] Order confirmation emails
- [ ] Shipping update emails
- [ ] Promotions & deals

#### Email / post domain

- [ ] **Resend : aligner les URLs** : les URLs dans les emails doivent correspondre au domaine d'envoi (`instawear.vercel.app`)
- [ ] **Resend : héberger les images** : les images doivent être sur le même domaine (pas `files.cdn.printful.com`)
- [ ] **Resend : infos business** : mettre à jour l'adresse postale (Doral, FL) dans le pied de page email

## Codes morts - rechercher et vérifier

- `src\components\DealsSection.tsx` -> _'Score exclusive deals on our AI-powered sports tees & hoodies before'_
-

### 📊 Résumé

| Catégorie     | Restant   |
| ------------- | --------- |
| Bugs          | 3 (`[ ]`) |
| Améliorations | 9 (`[ ]`) |
| **Total**     | **12**    |
