# Audit Frontstore — InstaWear_gem — Launch Readiness 050926 22:00PM

## 1 — Audit readiness mis à jour (état réel vérifié)

**Scope :** frontstore `src/`, `index.html`, `public/`. Vérifié par lecture/grep le 06/09/2026.

### 1. Textes en dur / Mock — ❌ inchangé

- Mix FR/EN toujours présent (`Header` Catalogue vs `FaqSection` FAQ, `ReassuranceBar` EN vs `Footer` FR, `StoreProductCard` _Add to cart_). Pas d'i18n.
- `FAQ` EN avec `category` FR, `categories.ts` mixte.
- Mocks toujours là : `TestimonialsSection` 3 avis en dur, `AboutSection` unsplash `w=800`, `DEFAULT_IMAGE` unsplash, fallback Gemini `server.ts`, `COUNTRIES/shippingRates` statiques.
- Images : pas de `srcset`/WebP, `lazy` seul, pas de `width/height` → CLS toujours d'actualité.

### 2. Codes cassés / Bugs — fixés ✅

1. ✅ 404 overlay --- `App.tsx:892-910` : `knownPaths` étendu (`/faq`, `/contact`, `/promotions`, `/recherche`, `/suivi`) + `knownPrefixes` (`/produit/`, `/legal/`) + `isStaticFile` étendu (`robots.txt`, `sitemap.xml`, `llms.txt`, `ai.txt`, `webmanifest`, `favicon.ico`, regex d'extensions). Les routes SPA légitimes n'ouvrent plus `NotFound` en parallèle des pages `fixed z-50` → plus de double scroll-lock.
2. ✅ Header logo --- `Header.tsx:532` : `window.location.href="/"` remplacé par `onNavigateHome()` (existe déjà en prop, `Header.tsx:59`), fallback `history.pushState("/") + scrollTo top` → plus de reload complet, état SPA conservé.
3. ✅ Produit crawlable --- `StoreProductCard.tsx:52` : le `div role="button"` devient `<a href="/produit/:id">` (avec `preventDefault` + `onSelectProduct`, comportement clic inchangé). Les bots suivent désormais les fiches produit ; balise fermante `</div>` → `</a>` corrigée.
4. ✅ Footer --- `Footer.tsx:91` `href="#faq"` → `href="#section-faq"` (vrai `id` de `FaqSection.tsx:12`). Sociaux `href="#"` → `<span>` non-lien _Bientôt disponible_ (pas d'URL inventée, plus de pénalité SEO `href="#"`).
5. c `main.tsx:8` --- import `NotFound` inutilisé supprimé.

### 3. Manquants / Placeholders — ❌ inchangé

- ✅ **Contact** : `ContactPage.tsx:26` `onSubmit → setSent(true)` factice, aucun POST Supabase/Resend → non conforme DSA.
- ✅ **Géo** : `fetch api.country.is` sans cache ni fallback UI.
- ✅ **Devises partiel** : `formatPrice(rateFromEur)` branché affichage (`StoreProductCard`, `ProductPage`, `CartDrawer` partiel), mais `store_settings.currency` reste la source de vérité et `shippingRates` USD non réconciliés.

### 4. Cookies

- ✅ Fait : `useCookieConsent.ts` 4 catégories (`necessary/analytics/performance/functionality`) + `version:1` + expiry 365j + migration ancien format + `resetConsent`. `CookieConsentBanner.tsx` 4 toggles (nécessaires disabled).
- Bannière (CookieConsentBanner.tsx) : texte unique « Nous utilisons des cookies pour améliorer votre expérience. En savoir plus » + 2 boutons [Tout accepter] [Refuser les non-essentiels]. Toggles et écran Personnaliser supprimés.
- Catégories cachées (useCookieConsent.ts v2) : necessary: true toujours ON + nonEssential (tout le reste : analytics, perf, pub) + expiry 365j + version: 2. Migration auto des anciens consentements v1 (analytics || performance → nonEssential).
- Footer → Gérer : nouveau lien Gérer les cookies (à côté de Cookies) via prop onManageCookies, branché sur cookieConsent.resetConsent() dans App.tsx → rouvre la bannière.

### 5. SEO — ⚠️ gros progrès, dynamique incomplète

- ✅ Fait (`index.html`) : `lang fr`, `robots index,follow`, `theme-color`, `og:locale/alternate`, `hreflang fr/en`, `<link rel=sitemap>`, `title` unifié _Wear the Moment_, description FR 3–7j, `canonical` racine, OG absolus `https://instawear.vercel.app/InstaWear-logo.png` + `width/height/alt`, logo Organization absolu, **WebSite + SearchAction** ajoutés. `public/robots.txt`, `sitemap.xml` (7 URLs statiques), `llms.txt`, `ai.txt` présents et fetchables.
- ❌ Reste : **dynamique à 1 page** — `usePageMeta(` n'existe que dans `ProductPage.tsx:77` (branché à l'instant, title/description/image/url `/produit/:id` type `product`). `Legal/Faq/Contact/Promotions/Search/Tracking` : 0 usage → toujours indexés comme homepage. Pas de `Product JSON-LD` (`Offer/AggregateRating`), pas de `FAQPage`/`BreadcrumbList`. Sitemap statique (aucun `/produit/:id`). SPA sans SSR/prerender → bots non-JS voient `#root` vide.

### 6. IA / Agentic — ⚠️ base posée

- ✅ `robots.txt` (GPTBot/ChatGPT-User/Google-Extended/PerplexityBot + Sitemap), `llms.txt`, `ai.txt`, WebSite SearchAction.
- ❌ `llms.txt` minimal (pas de catalogue produit), pas de `Product` schema, pas de `FAQPage`, pas de `/.well-known/ai.txt` ni `humans.txt`.

### 7. Perf / Autre — ❌ inchangé

- Bundle monolithe ~1,1 Mo (`motion`+`lottie`+`genai`+`stripe`+`supabase`+`lucide`), 0 `lazy()` Admin/Checkout/ProductPage, 0 `manualChunks`.
- Images sans `imagetools`/`decoding`/`fetchpriority`, `express.static` sans `maxAge`.
- `public/unsubscribe.html` expose `anon` key (ok si RLS strict).

**Top bloquants restants :** 1) `usePageMeta` sur 6 pages + `Product JSON-LD` 2) sitemap produits + `allowlist 404` 3) cookies : gate + bouton Gérer + tableau CNIL 4) `ContactPage` backend 5) `<a href="/produit/:id">` + sociaux `href="#"` + logo `pushState` 6) `CatalogSection.tsx.new` + `console.*`.

## 2 — `npx tsc --noEmit`

✅ **Vert, 0 erreur** (était 8 erreurs `TS7006` + `TS2322`). `npm run build` non relancé ici, `tsc` suffit pour ces 3 fichiers.

## 3 — Pourquoi ces 3 fichiers sont modifiés

- **`src/App.tsx`**
  - `(p, c, s) → (p: Product, c: string, s: string)` (`1130`, `1133`, `1139`) : corrige les 6× `TS7006 implicit any` remontés par ton `tsc`. Aucun changement de logique, `addToCart`/`openProduct` identiques.
  - `onNavigateLegal={scrollIntoView(#faq)} → onNavigateLegal={openLegal}` : corrige le bug audit §2 — le lien _En savoir plus_ du bandeau cookies ouvrait la FAQ au lieu de `/legal/cookies`.
- **`src/components/CookieConsentBanner.tsx`**
  - `onNavigateLegal: () => void → (slug?: string) => void` : aligne le type du prop avec `openLegal(slug: string)` d'`App`, corrige `TS2322`.
  - `onClick={onNavigateLegal} → onClick={() => onNavigateLegal("cookies")}` : sans ça, React injecte le `MouseEvent` comme `slug` (`TS2322` restant). Le clic ouvre désormais la vraie page cookies.
- **`src/pages/ProductPage.tsx`**
  - Ajout du bloc `usePageMeta({title: product.title, description: slice(0,158), image, url: /produit/:id, type: "product"})` : l'import existait mais n'était **jamais appelé** (audit §5). C'est le premier pas du fix SEO dynamique — chaque fiche produit met désormais à jour `title/meta/og/canonical`.
