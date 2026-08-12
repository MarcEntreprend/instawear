<div align="center">
  <img src="public/InstaWear-logo-wh-middle-no-BG.png" alt="InstaWear" width="400" />
</div>

# InstaWear

Boutique en ligne Print-on-Demand de vêtements événementiels (sport, festivals, saisons).  
Designs générés par IA, impression par Printful.

---

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the app:
   ```bash
   npm run dev
   ```

### Useful Vite commands

```bash
npx vite --host
npx vite --force   # Redémarre Vite en ignorant le cache
```

Supprime le cache de Vite (`node_modules/.vite`). Vite stocke les fichiers précompilés ici. Les supprimer force Vite à tout recompiler proprement au prochain `npm run dev`. Résout les erreurs 500 sur des fichiers CSS/JS qui persistent après correction.

```powershell
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
```

3. Déployer les Edge Functions

```bash
npx supabase functions deploy sync-printful --no-verify-jwt
npx supabase functions deploy create-printful-order --no-verify-jwt
npx supabase functions deploy printful-webhook --no-verify-jwt
npx supabase functions deploy send-email --no-verify-jwt
npx supabase functions deploy stripe-checkout --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy delete-account --no-verify-jwt
```

---

## Test livraison

```powershell
# Ton order id local
$orderId = "ORD-2026-957682"
# Store ID Printful (doit matcher pod_settings.store_id)
$storeId = "InstaWear2"

$body = @{
  type  = "package_shipped"
  store = $storeId
  data  = @{
    order = @{
      id          = 987654322    # id Printful (change pour éviter doublon)
      external_id = $orderId
    }
    shipment = @{
      carrier         = "USPS"
      service         = "USPS First Class"
      tracking_number = "9400TEST0003"   # change le numero a chaque test (anti-doublon)
      tracking_url    = "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400TEST0003"
      ship_date       = "2026-08-10"
      reshipment      = $false
    }
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "https://hkbybsycaylobvbnnwak.supabase.co/functions/v1/printful-webhook" `
  -Method Post -ContentType "application/json" `
  -Headers @{ apikey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrYnlic3ljYXlsb2J2Ym5ud2FrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTU1NTcxNCwiZXhwIjoyMDk3MTMxNzE0fQ.4wYYSz1a2Ls599Jym69vl4l4875B1UZLv9GKzF1Ut8A" } `
  -Body $body
```

---

## Secrets & Supabase Vault

Les Edge Functions lisent leurs secrets via `Deno.env.get(...)`. Les variables requises sont :

| Secret                                         | Utilisé par                                    |
| ---------------------------------------------- | ---------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`                    | toutes les fonctions (injecté automatiquement) |
| `STRIPE_SECRET_KEY` / `STRIPE_SECRET_KEY_TEST` | stripe-checkout, stripe-webhook                |
| `STRIPE_WEBHOOK_SECRET`                        | stripe-webhook (signature)                     |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL`         | send-email, stripe-webhook                     |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`      | stripe-webhook                                 |
| `PRINTFUL_API_KEY` (si utilisée)               | sync-printful                                  |

### Recommandation : déplacer les secrets vers Supabase Vault

Au lieu de les déclarer en variables d'environnement, stockez les secrets sensibles (clés API Stripe/Printful/Resend, tokens Telegram) dans Supabase Vault. L'accès se fait alors via la fonction SQL `vault.decrypted_secrets` (préfixe `VITE_` exclu) ou `pgsodium` :

```sql
-- Insérer un secret dans le Vault (ex. clé Stripe test)
SELECT vault.create_secret(
  'sk_test_xxxx',
  'STRIPE_SECRET_KEY_TEST'
);
```

Dans l'Edge Function, remplacez `Deno.env.get("STRIPE_SECRET_KEY_TEST")` par une lecture via le client Supabase (`supabase.rpc` sur `vault.decrypted_secrets`).

**Avantages :**

- Secret chiffré au repos
- Rotation traçable
- Pas de clé visible dans le dashboard Functions

> **NB :** `SUPABASE_SERVICE_ROLE_KEY` reste injecté par la plateforme ; il ne doit pas être déplacé dans le Vault.

---

## IPv4 Address

```
192.168.15.2
```

- **Local:** http://localhost:5173/
- **Network:** http://192.168.15.2:5173/

---

## Tester si TypeScript compile sans erreur

```bash
npx tsc --noEmit
```

## 0

## Structure arborescente

```
instawear_gem/
├── .impeccable
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
│ ├── assets/
│ │ ├── emailTemplates-hykaDCoE.js
│ │ ├── index-DnFt14NM.js
│ │ └── index-PYHhISLj.css
│ ├── flags/
│ │ ├── be.svg
│ │ ├── br.svg
│ │ ├── ca.svg
│ │ ├── ch.svg
│ │ ├── fr.svg
│ │ ├── gb.svg
│ │ ├── jp.svg
│ │ └── us.svg
│ ├── cart-check.svg
│ ├── cart-plus.svg
│ ├── cart-x.svg
│ ├── globe-off.svg
│ ├── index.html
│ ├── InstaWear-logo-settings.png
│ ├── InstaWear-logo-wh-middle-no-BG.png
│ ├── InstaWear-logo.png
│ ├── Instawear-missing-item.svg
│ ├── server.cjs
│ ├── server.cjs.map
│ ├── truck-icon.svg
│ └── unsubscribe.html
├── node_modules/
├── public/
│ ├── flags/
│ ├── cart-check.svg
│ ├── cart-plus.svg
│ ├── cart-x.svg
│ ├── globe-off.svg
│ ├── InstaWear-logo-settings.png
│ ├── InstaWear-logo-wh-middle-no-BG.png
│ ├── InstaWear-logo.png
│ ├── Instawear-missing-item.svg
│ ├── truck-icon.svg
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
│ │ ├── ShippedDeliveredPage.tsx
│ │ └── useAdminHighlight.ts
│ ├── api/
│ │ ├── storageApi.ts
│ │ └── supabaseApi.ts
│ ├── components/
│ │ ├── ui/
│ │ │ └── Button.tsx
│ │ ├── AboutSection.tsx
│ │ ├── AccountPage.tsx
│ │ ├── AuthModal.tsx
│ │ ├── CartDrawer.tsx
│ │ ├── CartIcon.tsx
│ │ ├── CatalogSection.tsx
│ │ ├── CheckoutFlow.tsx
│ │ ├── CopyID.tsx
│ │ ├── DealsSection.tsx
│ │ ├── FaqSection.tsx
│ │ ├── Footer.tsx
│ │ ├── Header.tsx
│ │ ├── HeroCarousel.tsx
│ │ ├── HeroSection.tsx
│ │ ├── ImageZoom.tsx
│ │ ├── NotFound.tsx
│ │ ├── OrderModal.tsx
│ │ ├── OrderStatusStepper.tsx
│ │ ├── OrderTrackingModal.tsx
│ │ ├── ProductDetailModal.tsx
│ │ ├── ProfileModal.tsx
│ │ ├── ReassuranceBar.tsx
│ │ ├── ShipmentTrackingBlock.tsx
│ │ ├── StoreProductCard.tsx
│ │ ├── TagInput.tsx
│ │ └── ToastContainer.tsx
│ ├── constants/
│ │ ├── assets.ts
│ │ └── orderStatus.tsx
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
│ │ ├── format.ts
│ │ └── zipValidation.ts
│ ├── App.tsx
│ ├── index.css
│ ├── main.tsx
│ ├── types.ts
│ └── vite-env.d.ts
├── supabase/
│ ├── .temp/
│ │ ├── cli-latest
│ │ ├── gotrue-version
│ │ ├── linked-project.json
│ │ ├── pooler-url
│ │ ├── postgres-version
│ │ ├── project-ref
│ │ ├── rest-version
│ │ ├── storage-migration
│ │ └── storage-version
│ ├── functions/
│ │ ├── create-printful-order/
│ │ │ └── index.ts
│ │ ├── delete-account/
│ │ │ └── index.ts
│ │ ├── printful-webhook/
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
├── PRODUCT.md
├── README.md
├── server.ts
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

---

## Checklist InstaWear — Mise à jour

### Bugs

---

### Améliorations

- [ ] garatir que les images des produits sont bien affichés : si c est le fallback icon qui s affiche due to anykind of problem, le user devrait refresh (friction, peut perdre les infos a l ecran, etc). du coup (maybe apres fallback - image reelle) forcer le code a ecouter si les images apparue a l ecran ou celles dans la périphérie du scroll (pas ttes les images du systeme / bdd) est bien chargée, et sinon, avoir un mecanisme / script qui fait ça.
- [ ] ...
- [ ] ...

#### Sécurité (⚠️ avant production)

- [x] DONE
  - [x] **RLS (Row Level Security)** sur les tables Supabase
  - [x] **Admin / user access** — vérifier les rôles dans les Edge Functions et appels API
  - [x] **Protection injections** — URL, console, fuite de clés
- [ ] Autres ?

#### UX / UI

- [x] DONE
  - [x] Popups ne cachent plus les boutons d'achat/paiement
  - [x] **Copie order ID en un clic** — icône + animation check
- [ ] **Animations réactives** — standardiser hover/click sur tous les boutons
- [ ] **Badge de commandes non consultées** — indicateur chiffré à côté de l'icône "Orders" dans la sidebar admin (nouvelles commandes + changements de statut Printful)
- [ ] Icône cœur des cartes produit (et modale info produit)
- [ ] **Mobile friendly** — toutes les pages utilisateur
- Dans `src/admin/InteractionsPage.tsx`, dans la conversation ainsi, cliquer sur l'order id doit suggérer deux choses :
  - [ ] **Voir détails rapide** : faire apparaître le même modal `Order detail modal` de `src/admin/OrdersPage.tsx`, tout en restant dans la conversa (renommer en `OrderQuickViewModal` ?)
  - [ ] **Voir dans commande** : naviguer vers la page order, avec `useAdminHighlight`

#### Produits

- [x] DONE
  - [x] Couleurs affichées et sélectionnables
  - [x] Tailles affichées et sélectionnables
  - [x] **Image du variant sélectionné** dans le panier, favoris, checkout
  - [x] **Image placeholder du shipping fee** dans Stripe — remplacé par icône boîte
  - [x] **Ouvrir le variant correspondant** — clic sur un produit dans OrdersPage (admin) ou espace client → le variant exact s'ouvre dans le modal
  - [x] Checking variant mismatch :
    - [x] in mail for Order confirmed (while the good variant is passed in Payment pending mails)
    - [x] on Printful, the wrong variant is passed / or not passed at all
  - [x] **Verify promotions** : working smooth ? promotional products shown on filter "Deals🔴" ?
  - [x] **Comparatif synchronisation** — X produits sync vs Y nouveaux dans settings
  - [x] **Guide des tailles** — dynamique via API Printful, fallback "(Approx.)" pour les manuels
- [ ] **Standardiser `useProductAvailability`** — hook réutilisable
- [ ] **Visibilité de produits / via admin** — logique actif/inactif absente de certaines pages
- [ ] **Info standard produit manquant** — message uniforme quand un produit est supprimé/indisponible
- [ ] **Comments and review ?** also showing in the user's dashboard.

#### Livraison

- [x] DONE
  - [x] **Webhook Printful** — mise à jour automatique du tracking → déclenchement email
  - [x] **Webhook & mail**
  - [x] Faut vérifier que je reçoive dans mes notifications (`src/admin/NotificationsPage.tsx`) des infos sur les statuts des order ⇒ ce n'est pas encore mis en place
  - [x] Faut vérifier que le user reçoive les notifications qu'il faut aussi
  - [x] Et vérifier que le webhook modifie le statut du order dans mon projet / ma BDD réellement (écoute réel)
  - En testant les webhook manuellement (PowerShell), les mails reçus dans mon Resend :
    - [x] `package_shipped` : "Your order has been shipped! 📦"
    - [x] `order_failed` : "Issue with your order ⚠️"
    - [x] `order_canceled` : "❌ Your order has been cancelled"

**Webhooks optionnels :**

- [ ] `order_put_hold` 🟡 Optionnel : alerte admin "commande en pause"
- [ ] `order_remove_hold` 🟡 Optionnel : alerte "reprise"
- [ ] `order_refunded` 🟡 Optionnel : log admin
- [ ] `package_returned` 🟡 Optionnel : statut → returned
- [ ] `product_synced` ⚪ Pas nécessaire (déjà géré par sync)
- [ ] `product_updated` ⚪ Pas nécessaire
- [ ] `product_deleted` ⚪ Pas nécessaire
- [ ] `stock_updated` ⚪ Pas nécessaire pour l'instant
- [ ] `order_put_hold_approval` ⚪ Pas nécessaire

#### Emails transactionnels

- [x] Commande confirmée (Order confirmed)
- [x] Ajouter les frais de transport dans le récap email
- [x] Paiement confirmé (Paid)
- [x] Paiement en attente (Pending)
- [x] En production (In Production)
- [x] Expédiée (Shipped)
- [x] Livrée (Delivered)
- [x] Annulée (Cancelled)
- [x] Promotions & deals
- [ ] `order_failed` vs `order_canceled` : quel cas n'est pas encore couvert (car chacun a un webhook, donc doit avoir un mail)

#### Emails

- Resend (post-domain) :
  - [ ] **Aligner les URLs** — utiliser le domaine d'envoi (`instawear.vercel.app`)
  - [ ] **Héberger les images** — ne pas utiliser `files.cdn.printful.com`
  - [ ] **Infos business** — adresse postale Doral, FL dans le pied de page email
- [ ] Cliquer sur le bouton "View order details →" dans le mail : rediriger vers `instawear.vercel.app` > ouvrir modal 'Track Your Order' avec le code de l'order déjà inséré dans le champ de recherche et déjà run / les infos déjà recherchées, donc affichées.

#### Espace client

- [ ] ...

#### Footer

- [ ] **Newsletter** — repenser l'intérêt client (offres, bonus, exclusivités)
- [ ] **Liens** — compléter (Mentions légales, CGU, politique de retour…)

#### Codes morts — rechercher et vérifier

- [ ] `src/components/DealsSection.tsx` → _'Score exclusive deals on our AI-powered sports tees & hoodies before'_

---

## Compteurs de ce qui reste

| Catégorie              | Restant | Détail                                                                                                            |
| ---------------------- | ------: | ----------------------------------------------------------------------------------------------------------------- |
| Bugs                   |       2 | Double ajout, persistance du panier                                                                               |
| Sécurité               |       4 | RLS, contrôle d'accès, injections, autres                                                                         |
| UX/UI                  |       6 | Animations, badge admin, icône cœur, responsive mobile, modal de commande (InteractionsPage) + navigation, footer |
| Produits               |       3 | Standardiser la disponibilité, visibilité admin, informations produit manquantes                                  |
| Livraison              |       6 | Webhooks optionnels : `hold`, `remove_hold`, `refunded`, `returned` (2 déjà implémentés)                          |
| Emails transactionnels |       1 | `order_failed` vs `order_canceled`                                                                                |
| Emails / Resend        |       3 | URLs, images, informations de l'entreprise                                                                        |
| Footer                 |       2 | Newsletter, liens                                                                                                 |
| Codes morts            |       1 | `DealsSection.tsx` : phrase obsolète                                                                              |
| **Total**              |  **28** |                                                                                                                   |

```

```
