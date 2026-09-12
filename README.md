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
  admin/            Back office (dashboard, orders, products, marketing, reports…)
  api/              Supabase client + typed API layers (products, orders, merch…)
  components/       Storefront UI (catalog, cart, checkout, product…)
  pages/            Route pages (product, search, FAQ, legal, tracking…)
  hooks/ data/      Shared hooks, static data, currency, countries
  utils/ lib/       Ranking, merch rules, email templates, formatting
supabase/
  functions/        Edge Functions (+ openapi.json inventory, _shared/)
  migrations/       SQL migrations (idempotent, replayable)
scripts/            Sitemap + prerender + inventory checks
tests/              Unit tests (node:test)
public/             Static assets, robots/sitemap/llms.txt, unsubscribe page
```

---
