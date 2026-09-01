<div align="center">
  <img src="public/InstaWear-logo-wh-middle-no-BG.png" alt="InstaWear" width="400" />
</div>

# InstaWear

**Boutique en ligne Print-on-Demand** de vêtements événementiels (sport, festivals, saisons).  
Designs générés par IA, impression par Printful.

---

## 🚀 Run Locally

**Prerequisites:** Node.js

### 1. Install dependencies

```bash
npm install
```

### 2. Run the app

```bash
npm run dev
```

### Useful Vite commands

```bash
# Exposer le serveur sur le réseau local
npx vite --host

# Redémarrer Vite en ignorant le cache
npx vite --force
```

Supprime le cache de Vite (`node_modules/.vite`). Vite stocke les fichiers précompilés ici. Les supprimer force Vite à tout recompiler proprement au prochain `npm run dev`. Résout les erreurs 500 sur des fichiers CSS/JS qui persistent après correction.

```powershell
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue
```

### 3. Déployer les Edge Functions

```bash
npx supabase functions deploy sync-printful --no-verify-jwt
npx supabase functions deploy create-printful-order --no-verify-jwt
npx supabase functions deploy printful-webhook --no-verify-jwt
npx supabase functions deploy health --no-verify-jwt
npx supabase functions deploy send-email --no-verify-jwt
npx supabase functions deploy stripe-checkout --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
npx supabase functions deploy delete-account --no-verify-jwt
```

---

## 📦 Test livraison

```powershell
# Ton  order id local
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

## 🔐 Secrets & Supabase Vault

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

## 🌐 IPv4 Address

```
192.168.15.2
```

- **Local :** http://localhost:5173/
- **Network :** http://192.168.15.2:5173/

---

## 🔍 Tester si TypeScript compile sans erreur

```bash
npx tsc --noEmit
```

---

## 📁 Structure arborescente

```text
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
│   │   ├── emailMarketing/
│   │   │   ├── constants.tsx
│   │   │   ├── emailTemplates.tsx
│   │   │   ├── helpers.ts
│   │   │   ├── useToast.ts
│   │   │   └── VariablesModal.tsx
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
│   │   └── useAdminHighlight.ts
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
│   │   ├── CopyID.tsx
│   │   ├── DealsSection.tsx
│   │   ├── FaqSection.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── HeroCarousel.tsx
│   │   ├── ImageZoom.tsx
│   │   ├── NotFound.tsx
│   │   ├── OrderModal.tsx
│   │   ├── OrderStatusStepper.tsx
│   │   ├── OrderTrackingModal.tsx
│   │   ├── ProductDetailModal.tsx
│   │   ├── ProductModal.tsx
│   │   ├── ProfileModal.tsx
│   │   ├── ReassuranceBar.tsx
│   │   ├── StoreProductCard.tsx
│   │   ├── TagInput.tsx
│   │   └── ToastContainer.tsx
│   ├── constants/
│   │   ├── assets.ts
│   │   └── orderStatus.tsx
│   ├── data/
│   │   ├── countries.ts
│   │   ├── faq.ts
│   │   └── shippingRates.ts
│   ├── hooks/
│   │   ├── useCurrencySymbol.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useShippingSettings.ts
│   │   └── useTabBadge.ts
│   ├── lib/
│   │   └── supabaseClient.ts
│   ├── utils/
│   │   ├── emailTemplates.ts
│   │   ├── format.ts
│   │   ├── productRanking.ts
│   │   ├── emailTemplates.ts
│   │   └── zipValidation.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   └── vite-env.d.ts
├── supabase/
│   ├── .temp/
│   ├── functions/
│   │   ├── create-printful-order/
│   │   │   └── index.ts
│   │   ├── printful-webhook/
│   │   │   └── index.ts
│   │   ├── reset-password/
│   │   │   └── index.ts
│   │   ├── send-email/
│   │   │   └── index.ts
│   │   ├── stripe-checkout/
│   │   │   └── index.ts
│   │   ├── stripe-webhook/
│   │   │   └── index.ts
│   │   └── sync-printful/
│   │       ├── .npmrc
│   │       ├── deno.json
│   │       └── index.ts
│   └── config.toml
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

---

Voici le texte à remplacer dans la section Checklist du README :

---

## ✅ Checklist InstaWear — Mise à jour

### 🔒 Sécurité (⚠️ avant production)

- [ ] Audit OWASP / Last check
- [ ] Checklist 10 common mistakes

### 🎨 UX / UI

- [ ] **Animations réactives** — standardiser hover/click sur tous les boutons
- [ ] **Badge de commandes non consultées** — indicateur chiffré à côté de l'icône "Orders" dans la sidebar admin
- [ ] Icône cœur des cartes produit (et modale info produit)
- [ ] **Mobile friendly** — toutes les pages utilisateur

### ⚙️ Functionalities

Dans `src/admin/InteractionsPage.tsx`, dans la conversation ainsi, cliquer sur l'order id doit suggérer deux choses :

- [ ] **Voir dans commande** : naviguer vers la page order, avec `useAdminHighlight`

### 🏷️ Produits

- [ ] Visibilité de produits / via admin — logique actif/inactif absente de certaines pages
- [ ] **Info standard produit manquant** — message uniforme quand un produit est supprimé/indisponible
- [ ] **Comments and review** — also showing in the user's dashboard

**Webhooks optionnels :**

- [ ] `order_put_hold` 🟡 Optionnel : alerte admin "commande en pause"
- [ ] `order_remove_hold` 🟡 Optionnel : alerte "reprise"
- [ ] `order_refunded` 🟡 Optionnel : log admin
- [ ] `package_returned` 🟡 Optionnel : statut → returned
- [ ] `order_canceled` 🟡 Optionnel : webhook existant, pas de handler ni email
- [ ] `product_synced` ⚪ Pas nécessaire (déjà géré par sync)
- [ ] `product_updated` ⚪ Pas nécessaire
- [ ] `product_deleted` ⚪ Pas nécessaire
- [ ] `stock_updated` ✅ Fait (P6)
- [ ] `order_put_hold_approval` ⚪ Pas nécessaire

### 📧 Emails transactionnels

- [ ] `order_failed` ✅ Fait
- [ ] `order_canceled` ❌ Non couvert (pas de mail dédié)
- [ ] Différence `order_failed` vs `order_canceled` : quel cas n'est pas encore couvert ? Car chacun a un webhook distinct.

### 📨 Emails / Resend

- [ ] Cliquer sur le bouton "View order details →" dans le mail : rediriger vers `instawear.vercel.app` > ouvrir modal 'Track Your Order' avec le code de l'order déjà inséré dans le champ de recherche
- [ ] URLs images dans les emails
- [ ] Informations de l'entreprise (adresse, mentions légales)

### 🏷️ Deal sections and deal cards

**Context :** When a deal is active, remplacer la phrase fixe "Score exclusive deals on our AI-powered sports tees & hoodies before" par une part admin dynamique (grille produit, section horizontale, etc.).

### 🐛 Bugs

- [ ] Double ajout au panier
- [ ] Persistance du panier

---

## ❌ Ce que le README ne mentionne pas mais qui est à faire

### 🔒 Sécurité

- [ ] **RLS / contrôle d'accès** — politiques Row Level Security et vérification d'accès aux lignes (orders, products, users)
- [ ] **Injection SQL** — revue des requêtes Supabase,尤其是 dynamic query builders
- [ ] **Erreur Printful "Invalid state code"** — validation du state code USPS/ZIP avant envoi à Printful (prévenir `Recipient: Invalid state code`)

### ⚙️ Functionalities

- [ ] `src/components/ProductModal.tsx` — intégrer `useProductAvailability` pour la disponibilité POD
- [ ] `src/components/CatalogSection.tsx` — filtrer les tailles/couleurs indisponibles
- [ ] `src/admin/ProductQuickViewModal.tsx` — utiliser `useProductAvailability` pour le bloc Disponibilité POD
- [ ] Badge commande lue/non lue (admin orders)
- [ ] Gestion des rôles admin (`is_admin()`) enforce côté front

### 📊 Compteurs de ce qui reste

| Catégorie              | Restant | Détail                                                                                     |
| ---------------------- | ------: | ------------------------------------------------------------------------------------------ |
| Bugs                   |       2 | Double ajout, persistance du panier                                                        |
| Sécurité               |       5 | RLS, contrôle d'accès, injections, Erreur state code, OWASP audit                          |
| UX/UI                  |       6 | Animations, badge admin, icône cœur, responsive mobile, modal InteractionsPage, navigation |
| Produits               |       3 | Visibilité admin, info produit manquant, reviews                                           |
| Livraison (webhooks)   |       5 | `hold`, `remove_hold`, `refunded`, `returned`, `order_canceled`                            |
| Emails transactionnels |       2 | `order_canceled`, différences `failed`/`canceled`                                          |
| Emails / Resend        |       3 | URLs, images, infos entreprise                                                             |
| Footer                 |       2 | Newsletter, liens                                                                          |
| Codes morts            |       1 | `DealsSection.tsx` : phrase obsolète                                                       |
| **Total**              |  **29** |                                                                                            |

---

prevenir les : `Erreur : Erreur Printful: {"code":400,"result":"Recipient: Invalid state code","error":{"reason":"BadRequest","message":"Recipient: Invalid state code"}}`
