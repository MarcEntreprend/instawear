# Audit Frontstore — InstaWear_gem — Launch Readiness 040926 01:43PM

**Scope :** `src/` frontstore uniquement, `index.html`, `public/`, `vercel.json`, `vite.config.ts`. Aucune modif.

### 1. Textes en dur / Mock

- **Mix FR/EN sans i18n** : `Header` _Catalogue/À propos_ (FR) vs `FaqSection` _Frequently Asked Questions_ (EN), `ReassuranceBar` _Fast delivery_ vs `Footer` _On est toujours là..._, `CatalogSection` _La boutique_ vs `StoreProductCard` _Add to cart_. `html lang="en"` alors que 60% UI en FR.
- `FAQ` : 7 Q/R en EN mais `category` en FR (`livraison/produit/retour`) ; `categories.ts` labels mixtes `T-Shirts`/`Accessoires`.
- **Mocks** : `TestimonialsSection.tsx:4` hardcodé 3 avis (Léa/Thomas/Inès) doublon de `data/testimonials.ts` (5 vrais avec `i.pravatar.cc` externe) ; `AboutSection` image unsplash `w=800` en dur ; `usePageMeta.ts:13` `DEFAULT_IMAGE` unsplash générique ; `server.ts` fallback Gemini `"T-Shirt \"${prompt.toUpperCase()}\""` ; `places` `COUNTRIES/shippingRates/currency` statiques.
- Images : pas de `srcset`/`sizes`/WebP, `loading="lazy"` seul, pas de `width/height` → CLS.

### 2. Codes cassés / Bugs

- **404 overlay** : `App.tsx:884` `knownPaths=[/,/unsubscribe,/index.html]` → `/produit/:id`, `/legal/*`, `/faq`, `/contact`, `/promotions`, `/recherche`, `/suivi` déclenchent `showNotFound=true` + `ProductPage/LegalPage` (`fixed z-50`) simultanés → double scroll-lock.
- **`En savoir plus` cookie** : `CookieConsentBanner → App.tsx:1367 onNavigateLegal` scroll vers `FAQ` au lieu de `openLegal("cookies")`.
- **Header logo** : `window.location.href="/"` → reload complet au lieu de `pushState`.
- **Produit non crawlable** : `StoreProductCard` `role=button` sans `<a href="/produit/:id">`.
- **Footer** : `aide.instawear.com href="#faq"` vs `id="section-faq"` ; sociaux `href="#"` morts ; `src/main.tsx:8` import `NotFound` inutilisé ; `CatalogSection.tsx.new` fichier fantôme à supprimer ; 98× `console.*`.

### 3. Choses manquantes / Placeholders

- **Contact** : `ContactPage.tsx:26` `onSubmit → setSent(true)` factice, aucun POST Supabase/Resend → non conforme DSA.
- **Géo** : `App.tsx:843 fetch https://api.country.is` sans cache ni fallback UI ; si down, `detectedCountry=null`.
- **Devises** : `store_settings.currency` vs `shippingRates` en USD vs affichage `€`.

### 4. Cookies ✅

- Hook `useCookieConsent.ts` : 1 booléen `analytics` seulement. Catégories demandées `nécessaires/performance/analytics/fonctionnalité` → `performance` et `fonctionnalité` manquent.
- **Placebo** : préférence stockée `localStorage` mais jamais lue pour bloquer `gtag/fbq/hotjar` ; `supabase/auth` + `localStorage` cart tournent sans consentement.
- RGPD : pas d'expiration (jamais re-prompt), pas de bouton _Gérer les cookies_ après `hasResponded`, `LegalPage` cookies 2 lignes sans tableau CNIL (nom/durée/provider), pas de versionning.

### 5. SEO (Google) ✅

- `index.html` OK : `title` _Wear the Moment_, `description` 155c, `canonical https://instawear.vercel.app/`, OG/Twitter, `Organization` JSON-LD, `preconnect` fonts. Mais :
  - **Dynamique jamais branchée** : `usePageMeta.ts` parfait mais `grep usePageMeta → 0 usage`. `ProductPage/Legal/Faq/…` ne changent jamais `title/description/canonical` → tout indexé comme homepage.
  - **SPA sans SSR/Sitemap** : `vite.config` sans `sitemap/robots/prerender`, `vercel.json` rewrite `/(.*) → /index.html`, `dist` = 1 `index.html` + 1 JS → bots non-JS voient `#root` vide. `public/` : 0 `robots.txt`, 0 `sitemap.xml`.
  - **Canonical statique** `/` → duplicate content `/produit/:id` ; `og:image` relatif `/InstaWear-logo.png` (doit être absolu + `width/height/alt`) ; `og:title` (_Energy_) ≠ `title` (_Moment_) ; `description` _4-day_ vs `Legal` _3–7j_.
  - `lang en` vs UI FR, pas de `hreflang` ; `meta keywords` obsolète ; pas de `robots`, `theme-color`, `og:locale`, `WebSite+SearchAction`, `Product/Offer/AggregateRating`, `FAQPage`, `BreadcrumbList`.

### 6. IA / Agentic ✅

- `public/` : 0 `llms.txt`, 0 `ai.txt`, 0 `/.well-known/ai.txt`, 0 `humans.txt`, 0 `robots.txt` → ChatGPT/Gemini/Perplexity sans résumé curaté ; `og:image` relatif faible.
- Seul `Organization` → pas de `WebSite SearchAction` ni `Product` pour snippets IA.

### 7. Perf / Autre

- Bundle : 1 JS `~600KB gz` (`motion`+`lottie`+`genai`+`stripe`+`supabase`+`lucide` dans main), 0 `lazy()` pour `Admin/Checkout/ProductPage`, 0 `manualChunks`/`compression`.
- Images : pas de `vite-imagetools`, pas de `decoding=async`/`fetchpriority` sur LCP hero, `express.static` sans `maxAge`.
- Sécurité : `public/unsubscribe.html` expose `anon` key (ok si RLS strict, à vérifier énumération).

**Top 7 bloquants launch** : 1) `usePageMeta` + `Product JSON-LD` 2) `robots.txt`+`sitemap.xml`+OG absolu 3) cookies 4 catégories + blocage + révocation + fix `En savoir plus` 4) allowlist 404 5) `ContactPage` backend 6) `href="#"` + `<a>` produits 7) `console` + `CatalogSection.tsx.new` + clé anon.
