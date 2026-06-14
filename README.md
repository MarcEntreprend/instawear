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
│
├── .env.example
├── .gitignore
├── README.md
├── index.html
├── metadata.json
├── package.json
├── package-lock.json
├── server.ts
├── tsconfig.json
├── vite.config.ts
│
├── data/
│ ├── products.json
│ └── settings.json
│
├── public/
│ ├── InstaWear-logo-wh-middle-no-BG.png
│ └── InstaWear-logo.png
│
└── src/
├── App.tsx
├── index.css
├── main.tsx
├── types.ts
├── vite-env.d.ts
│
├── components/
│ ├── AdminDashboard.tsx
│ ├── AuthModal.tsx
│ ├── CartDrawer.tsx
│ ├── FilterPanel.tsx
│ ├── Header.tsx
│ ├── OrderModal.tsx
│ ├── ProductCard.tsx
│ ├── ProductModal.tsx
│ └── ProfileModal.tsx
│
├── data/
│ ├── defaultProducts.ts
│ └── staticData.ts
│
└── hooks/
└── useLocalStorage.ts
