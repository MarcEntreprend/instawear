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

# IPv4 Address

`192.168.15.2 `

Local: http://localhost:5173/
➜ Network: http://192.168.15.2:5173/

# Structure arborescente

```
instawear/
├── assets/
│   └── .aistudio
├── data/
│   ├── products.json
│   └── settings.json
├── node_modules/
├── public/
│   ├── InstaWear-logo-settings.png
│   ├── InstaWear-logo-wh-middle-no-BG.png
│   └── InstaWear-logo.png
├── src/
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminDashboardNew.tsx
│   │   ├── AdminSidebar.tsx
│   │   ├── AdminUsersPage.tsx
│   │   ├── CustomersPage.tsx
│   │   ├── HelpPage.tsx
│   │   ├── IntegrationsPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── ProductFormPanel.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── PromotionsPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── adminHooks.ts
│   │   └── adminTypes.ts
│   ├── api/
│   │   └── supabaseApi.ts
│   ├── components/
│   │   ├── AuthModal.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── CheckoutModal.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── Header.tsx
│   │   ├── OrderModal.tsx
│   │   ├── OrderTrackingModal.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductModal.tsx
│   │   ├── ProfileModal.tsx
│   │   └── TagInput.tsx
│   ├── data/
│   │   ├── defaultProducts.ts
│   │   └── staticData.ts
│   ├── hooks/
│   │   └── useLocalStorage.ts
│   ├── lib/
│   │   └── supabaseClient.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   └── vite-env.d.ts
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
