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

# structure arborescente

instawear/
├── public/
│ ├── InstaWear-logo-wh-middle-no-BG.png
│ └── InstaWear-logo.png
├── data/
│ ├── products.json
│ └── settings.json
├── src/
│ ├── App.tsx
│ ├── index.css
│ ├── main.tsx
│ ├── types.ts
│ ├── admin/
│ │ ├── AdminDashboard.tsx (ancien formulaire)
│ │ ├── AdminDashboardNew.tsx (nouveau orchestrateur)
│ │ ├── AdminSidebar.tsx
│ │ ├── ProductsPage.tsx
│ │ ├── CustomersPage.tsx
│ │ ├── OrdersPage.tsx (placeholder)
│ │ ├── SettingsPage.tsx (placeholder)
│ │ ├── AdminUsersPage.tsx (placeholder)
│ │ ├── adminTypes.ts
│ │ ├── adminApi.ts
│ │ ├── adminMocks.ts
│ │ └── adminHooks.ts
│ ├── components/
│ │ ├── AuthModal.tsx
│ │ ├── CartDrawer.tsx
│ │ ├── FilterPanel.tsx
│ │ ├── Header.tsx
│ │ ├── ProductCard.tsx
│ │ ├── ProductModal.tsx
│ │ └── ProfileModal.tsx
│ ├── data/
│ │ ├── defaultProducts.ts
│ │ └── staticData.ts
│ └── hooks/
│ └── useLocalStorage.ts
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
