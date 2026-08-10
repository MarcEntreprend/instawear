# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are event attendees and fans shopping for themed apparel, accessories, and merch for sports, festivals, and seasonal moments. A secondary operational audience is the InstaWear administrator who manages products, orders, fulfillment, and event-oriented merchandising workflows.

## Product Purpose

InstaWear is a web storefront for event-themed, print-on-demand apparel that pairs consumer shopping with a backend admin system for fulfillment and order management. Success means shoppers can discover and buy festival, sports, and seasonal apparel with minimal friction while the business operator maintains product data, syncs orders to Printful, and tracks payments through Stripe and Supabase.

## Positioning

A combined commerce and admin platform for event apparel that unifies a branded storefront with order fulfillment workflow through Printful, Stripe, and Supabase. It supports event- and category-filtered discovery, shopping cart checkout, and an admin dashboard for managing customers, orders, promotions, and inventory sync.

## Operating Context

- Shoppers browse the InstaWear site via desktop or mobile web.
- Shopping activity is organized around event categories such as sports, festivals, seasonal themes, and product categories like t-shirts, hoodies, accessories, and mugs.
- The storefront includes browsing, search, favorites, cart, checkout, order tracking, and account/profile management.
- Admin users access a separate dashboard within the same app to manage products, orders, customers, notifications, and email campaigns.
- The system integrates with external services through Supabase, Stripe, Printful, and Resend for transactional email.

## Capabilities and Constraints

- Existing React + Vite web application with TypeScript and Tailwind CSS.
- Supabase is used for authentication, customer data, cart persistence, order data, and admin operations.
- Printful sync and order placement are handled by Supabase Edge Functions and API integration.
- Stripe checkout and webhooks are implemented for payment processing and order confirmation.
- The app supports a dark theme toggle and persists theme choice in local storage.
- Product filtering by event type, category, and search is part of the storefront experience.
- The admin interface includes dashboards for orders, customers, help, integrations, notifications, and email marketing.
- Product data is modeled with eventType, category, variants, sizes, pricing, and promotional deal state.
- The current implementation is a web project; no native mobile platform is indicated.

## Brand Commitments

- The product name is InstaWear.
- The brand emphasizes event apparel, AI-generated design, and Printful-powered on-demand fulfillment.
- Existing public brand assets include the InstaWear logo files under `public/`.

## Evidence on Hand

- `README.md` documents project purpose, local run instructions, and Edge Function deployment.
- `src/App.tsx` and `src/components` implement the storefront and admin application.
- `src/admin/AdminDashboardNew.tsx` and related admin pages implement the back-office workflow.
- `src/lib/supabaseClient.ts`, `src/api/supabaseApi.ts`, and `supabase/functions/` show external service integration.
- `package.json` confirms React, Vite, Tailwind CSS, Supabase, Stripe, and TypeScript usage.

## Product Principles

- Keep shopping focused on event-themed discovery and seamless add-to-cart checkout.
- Preserve the integrated storefront + fulfillment workflow rather than splitting consumer and admin experiences into separate products.
- Build on existing Supabase, Stripe, and Printful integrations to avoid inventing new backend architecture.
- Respect the current React/Vite web implementation as the baseline for product and platform decisions.

## Accessibility & Inclusion

- The current product must support standard web accessibility patterns implied by a React/Tailwind storefront and dashboard.
- No explicit product-specific accessibility requirements were provided in the repo or request.
