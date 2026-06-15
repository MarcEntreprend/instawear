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

```
instawear/
├── data/
│   ├── products.json
│   └── settings.json
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
│   │   ├── OrdersPage.tsx
│   │   ├── ProductFormModal.tsx
│   │   ├── ProductFormPanel.tsx
│   │   ├── ProductsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── adminApi.ts
│   │   ├── adminHooks.ts
│   │   ├── adminMocks.ts
│   │   └── adminTypes.ts
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
│   │   ├── mockDatabase.ts
│   │   └── staticData.ts
│   ├── hooks/
│   │   └── useLocalStorage.ts
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   └── vite-env.d.ts
├── .env.example
├── .gitignore
├── Doc-specification-technique.md
├── README.md
├── index.html
├── metadata.json
├── package-lock.json
├── package.json
├── server.ts
├── tsconfig.json
└── vite.config.ts
```
