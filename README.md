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
├── node_modules/
├── public/
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
│   │   ├── NotificationsPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── PrintfulProductForm.tsx
│   │   ├── ProductFormPanel.tsx
│   │   ├── ProductQuickViewModal.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── PromotionsPage.tsx
│   │   ├── ReportInfoModal.tsx
│   │   ├── ReportsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── api/
│   │   ├── storageApi.ts
│   │   └── supabaseApi.ts
│   ├── components/
│   │   ├── AuthModal.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── CheckoutModal.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── Header.tsx
│   │   ├── OrderModal.tsx
│   │   ├── OrderTrackingModal.tsx
│   │   ├── PaymentPage.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductModal.tsx
│   │   ├── ProfileModal.tsx
│   │   ├── TagInput.tsx
│   │   └── ToastContainer.tsx
│   ├── constants/
│   │   └── assets.ts
│   ├── data/
│   │   ├── defaultProducts.ts
│   │   └── staticData.ts
│   ├── hooks/
│   │   ├── useCurrencySymbol.ts
│   │   └── useLocalStorage.ts
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
│       └── sync-printful/
│           ├── .npmrc
│           ├── deno.json
│           └── index.ts
├── .env
├── .env.example
├── .gitignore
├── AGENT.md
├── Doc-specification-technique.md
├── index.html
├── metadata.json
├── package-lock.json
├── package.json
├── README.md
├── server.ts
├── tsconfig.json
└── vite.config.ts
```
