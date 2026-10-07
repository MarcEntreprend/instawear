<div align="center">
  <img src="public/InstaWear-logo-wh-middle-no-BG.webp" alt="InstaWear" width="400" />
</div>

# InstaWear

**Print-on-demand online store** for event apparel (sports, festivals, seasons).
AI-generated designs, printed and fulfilled by Printful.

---

## Stack

- **Frontend:** React 19 + Vite + Tailwind CSS (SPA, prerendered at build)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions on Deno)
- **Payments:** Stripe (PaymentIntent + Checkout, webhooks)
- **Fulfillment:** Printful (catalog sync, orders, webhooks, mockups)
- **Emails:** Resend (transactional)
- **Hosting:** Vercel (static + SPA rewrites)

---

## Run locally

**Prerequisites:** Node.js 20+, a Supabase project, `supabase` CLI (for functions).

```bash
npm install
cp .env.example .env   # then fill in the keys (see below)
npm run dev
```

## Scripts

| Command             | What it does                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| `npm run dev`       | Dev server (`tsx server.ts`)                                              |
| `npm run build`     | `vite build` + server bundle + sitemap/prerender (`prebuild`/`postbuild`) |
| `npm start`         | Serve production build (`node dist/server.cjs`)                           |
| `npm test`          | Unit tests (`node --test`, `tests/`)                                      |
| `npm run lint`      | `tsc --noEmit --strict`                                                   |
| `npm run sitemap`   | Regenerate `public/sitemap.xml` + `llms.txt` product block                |
| `npm run inventory` | Drift check: `supabase/functions` vs `openapi.json`                       |

## Environment variables

Frontend uses `VITE_*` vars (see `.env.example`). Edge Functions read
plain names via `Deno.env` (set with `supabase secrets set NAME=value`):

| Variable                                                                | Used by                                               |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` (`VITE_` prefix on frontend)       | app + functions                                       |
| `SUPABASE_SERVICE_ROLE_KEY`                                             | all functions (auto-injected)                         |
| `STRIPE_SECRET_KEY` / `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET` | stripe-checkout, stripe-webhook                       |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                                   | send-email, cart-recovery, stripe-webhook             |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`                                | stripe-webhook                                        |
| `PRINTFUL_API_KEY`                                                      | sync-printful (via `pod_settings`, never in client)   |
| `IMAGEKIT_URL_ENDPOINT` (`VITE_` prefix on frontend)                    | WebP image transforms (public endpoint)               |
| `IMAGEKIT_PRIVATE_KEY`                                                  | signing ImageKit URLs (**edge only, never frontend**) |
| `CRON_SECRET`                                                           | protects scheduled endpoints                          |

## Deploy

```bash
# All Edge Functions at once
supabase functions deploy

# Database migrations
supabase db push
```

Vercel deploys the frontend on push (build runs sitemap + prerender automatically).

---

## Project structure (high level)

```text
src/
  App.tsx             Storefront shell (routing, cart, auth, overlays)
  admin/              Back office (dashboard, orders, products, reviews,
                      customers, marketing, reports, settings…)
  api/                Supabase client + typed API layers (products, orders,
                      merch, customer mapping…)
  components/         Storefront UI (Header, Hero, Catalog, ProductCard,
                      CartDrawer, CheckoutFlow, AccountPage, AuthModal,
                      AuthSocial, Footer, MobileTabBar…)
    product/          PDP blocks (gallery, reviews, FBT, lightbox…)
    skeletons/        Loading placeholders (cards, product page)
  pages/              Route pages (product, search, FAQ, legal, tracking,
                      promotions, order success…)
  hooks/              Shared hooks (currency, taxonomy, overlays, badges…)
  data/               Static data (categories, materials, countries…)
  utils/ lib/         Pure helpers (colors, slugs, filters, routes, scroll,
                      imagekit, supabaseImage…) — unit-tested
  config/ constants/  Env readers, assets, order statuses
supabase/
  functions/          21 Edge Functions (stripe-*, printful-*, send-email,
                      sync-printful, merch-scorer…) + _shared/
  migrations/         Versioned SQL (RLS, taxonomy seeds, slugs…)
scripts/              Sitemap + llms.txt, prerender, edge env/live checks
tests/                Unit tests, static guards (node:test, ~800 cases)
public/               Assets, robots/sitemap/llms.txt, manifest, unsubscribe
docs-*/               API refs, protocols, audits, Lighthouse reports
```

## Project structure (tree)

```text
📁 instawear_gem/
├── 📁 src/
│   ├── App.tsx                        # Storefront shell (routing, cart, auth, overlays)
│   ├── main.tsx
│   ├── 📁 admin/                      # Back office (/admin)
│   │   ├── AdminDashboardNew.tsx      # Shell + section routing
│   │   ├── AdminSidebar.tsx           # Single nav source (NAV_GROUPS)
│   │   ├── OrdersPage.tsx / ProductsPage.tsx / CustomersPage.tsx
│   │   ├── ReviewsPage.tsx            # Review moderation
│   │   ├── FinancesPage.tsx / ReportsPage.tsx / MerchandisingPage.tsx
│   │   ├── EmailMarketingPage.tsx / NotificationsPage.tsx / PromotionsPage.tsx
│   │   ├── MockupStudio.tsx / GalleryPicker.tsx / ProductFormPanel.tsx
│   │   ├── SettingsPage.tsx / IntegrationsPage.tsx / ErrorMonitoringPage.tsx
│   │   ├── AdminUsersPage.tsx / HelpPage.tsx / ShippedDeliveredPage.tsx
│   │   ├── ProductQuickViewModal.tsx / *_InfoModal.tsx
│   │   ├── ui/                        # Shared primitives (Button, Modal, Badge…)
│   │   ├── emailMarketing/            # Templates, prefs, events sections
│   │   └── adminTypes.ts / adminHooks.ts / adminStyles.ts / adminGuards.ts
│   ├── 📁 api/                        # Typed Supabase layers
│   │   ├── supabaseApi.ts             # products, orders, merch, prefs…
│   │   ├── customerMapping.ts         # Pure RPC mapping (tested)
│   │   └── storageApi.ts
│   ├── 📁 components/                 # Storefront UI
│   │   ├── Header.tsx / Footer.tsx / MobileTabBar.tsx
│   │   ├── HeroCarousel.tsx / DealsSection.tsx / CatalogSection.tsx
│   │   ├── StoreProductCard.tsx / ForYouSection.tsx
│   │   ├── CartDrawer.tsx / CheckoutFlow.tsx / OrderTrackingModal.tsx
│   │   ├── AccountPage.tsx / AccountTabToolbar.tsx
│   │   ├── AuthModal.tsx / AuthSocial.tsx / ProfileModal.tsx
│   │   ├── CopyID.tsx / ToastContainer.tsx / BackToTopButton.tsx …
│   │   ├── 📁 product/                # PDP blocks (gallery, reviews, FBT…)
│   │   └── 📁 skeletons/              # Loading placeholders
│   ├── 📁 pages/                      # Route pages (/item, /search, /faq…)
│   ├── 📁 hooks/                      # useTaxonomy, useCurrency, useTimidBar…
│   ├── 📁 data/                       # categories, materials, countries…
│   ├── 📁 utils/ 📁 lib/              # Pure helpers + clients (unit-tested)
│   └── 📁 config/ 📁 constants/       # Env readers, assets, order statuses
├── 📁 supabase/
│   ├── 📁 functions/                  # 21 Edge Functions + _shared/
│   └── 📁 migrations/                 # Versioned SQL (RLS, seeds, slugs…)
├── 📁 scripts/                       # sitemap, prerender, edge checks
├── 📁 tests/                         # ~800 cases (node:test)
├── 📁 public/                        # Assets, robots/sitemap/llms.txt, manifest
├── 📁 docs-API/ 📁 docs-front-back/ 📁 docs-lighthouse-reports/ 📁 docs-POD/
├── vercel.json / server.ts / index.html / package.json
└── README.md / AGENT.md / *.md        # Audits & notes
```

---
