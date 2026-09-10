# Audit Frontstore — InstaWear_gem — Launch Readiness 10/09/2026 22:00

**Scope :** frontstore `src/`, `index.html`, `public/`. Vérifié par lecture/grep le 10/09/2026.
**Note :** ce document ne liste **que le restant à faire**. Tout ce qui était bloquant au 05/09 et qui est désormais vérifié OK a été retiré (détail en bas).

---

### 1. i18n / Textes en dur — ✅ fait le 10/09 (frontstore 100% EN, admin en FR)

**Décision :** public américain → frontstore tout anglais, interface admin en français. Pas d'i18n (choix assumé, pas de mix).

**Fait :** toutes les strings visibles shoppers passées en US English (~50 fichiers : `Header`, `Footer`, `CatalogSection`, `ProductPage`, `CartDrawer`, `CheckoutFlow` + messages de validation, `AccountPage`, `ContactPage`, `OrderTrackingModal`, `DealCountdown` (`${d}j` → `${d}d`), `SORT_OPTIONS` (`Popularité` → `Popularity`…), labels catégories (`Accessoires` → `Accessories`…), `index.html` (`lang="en"`, `og:locale en_US`, meta description EN). Emails clients (`emailTemplates.ts`) et `public/unsubscribe.html` déjà EN — vérifié.

**Laissé volontairement en FR (invisible shoppers) :** commentaires de code ; clés techniques matchées à la DB (`faq.ts` `category: "livraison"|"produit"|…` — jamais affichées, pas d'onglets ; `EVENT_TYPES` values `saisonnier`/`anniversaire` matchées à `product.eventType` ; `PRODUCT_CATEGORIES` values matchées à `product.category` ; `STYLE_OPTIONS`/`MATERIAL_OPTIONS` stockées via admin ; statuts `retrait`/`livraison`, `on_hold`) ; tout `src/admin/` ; `store_settings.shipping_delay` (jamais rendu au front — le checkout utilise `deliveryEstimate` live Printful *"4-7 business days"*).

### 2. Mocks / Données statiques résiduelles — ⚠️ mineur

- ~~`src/hooks/usePageMeta.ts:13` — `DEFAULT_IMAGE` Unsplash~~ → fait le 10/09 : `/InstaWear-logo.png`.
- ~~`server.ts` — endpoint `/api/gemini/generate-description` + `demoFallback`~~ → fait le 10/09 : endpoint + import `@google/genai` supprimés de `server.ts`, dépendance retirée de `package.json` (+ lock sync), clé retirée de `.env.example`. Aucun appelant dans `src/` (vérifié grep). `server.cjs` passe de 4.0 → 2.1 kB.
- `src/data/countries.ts:12-21` + `src/data/currency.ts:4-14` — vérifié le 10/09 : `COUNTRIES` (noms EN) sert aux selects pays checkout/compte/settings ; la conversion statique `COUNTRY_CURRENCY`/`formatPrice`/`rateFromEur` est du code mort (0 usage — l'affichage passe par `formatAmount` + devise `store_settings`). Le shipping est déjà live Printful (`supabase/functions/_shared/printfulRates.ts:123`) avec fallback = forfait admin `store_settings.shippingCost`, et l'admin `SettingsPage.tsx:664` affiche déjà *"rates Printful (live API)"*. Aucun `shippingRates` statique présenté comme vérité nulle part → rien à changer.
- `src/data/testimonials.ts` / `src/components/AboutSection.tsx:18` — OK désormais (10 avis externalisés, image locale `jpg`). Plus de mock Unsplash `w=800` ici.

### 3. Images / CLS / Perf front — ❌ à faire (Core Web Vitals)

- **Pas de `srcset` / WebP / `imagetools`** — `package.json` n'a pas `vite-imagetools`. `src/components/StoreProductCard.tsx:82` n'a que `loading="lazy"`, pas de `decoding="async"`, `fetchpriority`, ni `width`/`height` → CLS lors du chargement grille catalogue. Idem `ProductPage`.
- **Pas de `width`/`height` réservés** sur les vignettes produits → saut de layout sur 3G.
- **`server.ts:93` — `express.static(distPath)` sans `maxAge` / `immutable`** pour les assets hashés (`assets/index-*.css/js`). Les `assets` Vite sont déjà hashés, ils peuvent être servis `Cache-Control: public, max-age=31536000, immutable`. Sans ça, chaque reload re-télécharge.
- **Bundle :** déjà chunké (`vite.config.ts:22-30` `manualChunks: vendor/supabase/stripe/motion` + 3 `lazy()` sur `AccountPage`/`CheckoutFlow`/`AdminDashboardNew` dans `src/App.tsx:20`), donc le monolithe 1,1 Mo du 05/09 est réglé. Reste le poids image (point ci-dessus).

### 4. Hygiène code — ✅ audité le 10/09 (rien à changer)

- **`console.*`** — vérifié : **0 `console.log`/`debug`/`info` dans `src/`**. Restent 58 `warn`/`error` de diagnostic (ex: `App.tsx:780,1152,1176,1413` erreurs Supabase/Stripe/favoris) → voulus, pas de `esbuild.drop` (on garde la visibilité erreurs en prod). Les `console.log` restants sont côté serveur/CLI uniquement : 3 edges (`get-shipping-rates:150` log requête sanitizée `logSafe`, `contact-message:234`, `auth-welcome:163` → logs fonctions Supabase, utiles) + `scripts/*.ts` + `server.ts:36` (terminal, jamais shippés au navigateur).
- **`public/unsubscribe.html` + anon key — audité le 10/09 :**
  - `USING (true)` dans les migrations : uniquement volontaire et safe — `order_status_transitions` (table statique), `merch_config`/`product_scores`/`search_trends` (lecture publique by design), `review_helpful` select (ids + uids, besoin UI), `interactions`/`interaction_messages` insert anon **contraints** (`20261007_contact_guest.sql:7` : type + regex email + longueur 10..5000).
  - Tables cœur (`customers`, `orders`, `newsletter_subscribers`) hors migrations (créées dashboard) → sondées en live avec la clé anon (GET read-only) : `customers?select=id` → `200 []`, `newsletter_subscribers?select=email` → `200 []` → **pas de lecture ouverte**.
  - Point d'attention : la branche `UPDATE customers` de `unsubscribe.html` est **morte en live** (le SELECT préalable retourne `[]`, aucun id à patcher). Écriture anon non vérifiable en read-only → **reco : durcir en déplaçant les writes unsubscribe vers une edge function validée** (pattern `contact-message`), au lieu du REST anon direct. Non-bloquant launch, à planifier.

### 5. SEO résiduel — ⚠️ partiel (le gros est fait)

Le gros est fait : `index.html:4` `lang fr`, `robots index,follow`, `theme-color`, `og:locale fr_FR` + `en_US` alternate, `hreflang fr/en`, `<link rel=sitemap>`, `title` unifié *Wear the Moment*, description FR, `canonical`, OG absolus `https://instawear.vercel.app/InstaWear-logo.png` + `width/height/alt`, `Organization` + `WebSite+SearchAction` (`index.html:42-69`), `public/robots.txt`/`sitemap.xml`/`llms.txt`/`ai.txt`/`humans.txt`/`/.well-known/ai.txt` présents, `usePageMeta` sur **7 pages** (`ProductPage.tsx:101` + `ContactPage.tsx:17` + `FaqPage.tsx:9` + `LegalPage.tsx:35` + `PromotionsPage.tsx:12` + `SearchResultsPage.tsx:55` + `OrderTrackingPage.tsx:13`), JSON-LD `Product` (`Offer` + `AggregateRating` + `BreadcrumbList` dans `ProductPage.tsx:112-194`) + `FAQPage` (`FaqPage.tsx:15-34`).

**Fait le 10/09 :**

- ~~**Sitemap produits manuel**~~ → `package.json` : `"prebuild": "npm run sitemap"`. Le script dégrade gracieusement (statiques seules si env absentes, exit 0 — build jamais cassé). Vérifié : `npm run build` régénère (13 URLs / 6 produits le 10/09).
- ~~**`site.webmanifest` manquant**~~ → créé `public/site.webmanifest` (name/short_name, `theme_color #ff5c35`, icônes `/InstaWear-logo.png`) + `<link rel="manifest">` dans `index.html:15`. Cohérent avec l'allowlist 404 (`App.tsx:1350`).
- ~~**`llms.txt` minimal**~~ → `scripts/generate-sitemap.ts` réécrit désormais aussi le bloc `<!-- PRODUCTS -->` de `public/llms.txt` (`- [Titre](url)` par produit actif, curation préservée hors marqueurs). Bonus : ligne devise corrigée (USD, pas EUR) + events en anglais.

**Reste (décision) :**

- **SPA sans SSR/prerender — risque accepté et documenté.** Pas de SSR : Googlebot et agents JS rendent `usePageMeta` + JSON-LD sans problème ; les cartes sociales utilisent les OG statiques de `index.html`. Seuls les crawlers non-JS voient `#root` vide — jugé acceptable pour le launch (le catalogue reste découvrable via `sitemap.xml` + `llms.txt` générés à chaque build). Réévaluer si un canal non-JS devient significatif (option : prerender `vite-plugin-prerender` ou Vercel ISR sur `/`, `/produit/:id`, `/faq`, `/legal/*`).

### 6. Cookies / CNIL — ⚠️ quasi-OK

Fait : `src/hooks/useCookieConsent.ts:1-68` `CONSENT_VERSION=2`, `EXPIRY 365j`, `necessary:true` + `nonEssential` (analytics/perf/pub regroupés), migration auto v1 → v2, `persist/acceptAll/rejectNonEssential/resetConsent`. `src/components/CookieConsentBanner.tsx:1-53` bannière 2 boutons (`Tout accepter` / `Refuser les non-essentiels`), texte unique, sans toggles. Gate `src/lib/analytics.ts:9-22` n'injecte `VITE_GA_ID` que si `nonEssential`. `Footer.tsx:471` lien `Gérer les cookies` → `App.tsx:1741` `resetConsent()`.

**Reste (si exigence CNIL stricte) :** tableau détaillé des cookies (nom / finalité / durée / éditeur) sur la page `/legal/cookies` ou dans la bannière. Actuellement la bannière n'expose pas ce tableau. Non-bloquant si la page légale le contient, bloquant si audit CNIL formel.

---

### Top bloquants restants (priorisés)

1. **Images/CLS** (`srcset`/`width/height`/`imagetools` + `server.ts` `maxAge` static) — impact LCP/CLS direct.
2. **Unsubscribe hardening** — déplacer les writes vers une edge function validée (reco d'audit, non-bloquant).
3. **Tableau CNIL cookies** — seulement si audit CNIL formel exigé.

---

### Retiré depuis le 05/09 (vérifié OK le 10/09 — ne plus tracker)

- 404 overlay double `fixed z-50` → `src/App.tsx:1321-1367` `knownPaths`/`knownPrefixes`/`isStaticFile` complets.
- Header logo reload → `src/components/Header.tsx:529-539` `onNavigateHome()` + `history.pushState`.
- Produit crawlable → `src/components/StoreProductCard.tsx:67` `<a href="/produit/:id">` + `preventDefault`.
- Footer `href="#faq"` / sociaux `href="#"` → `src/components/Footer.tsx:97` `#section-faq` + `Footer.tsx:178` `<span>` + `Footer.tsx:471` lien `Gérer les cookies`.
- `main.tsx:8` import `NotFound` supprimé.
- Contact factice → `src/pages/ContactPage.tsx:1-210` vrai `POST /functions/v1/contact-message` + `supabase/functions/contact-message/index.ts:1-255` (rate-limit 5/min/IP, Resend).
- Géo sans cache → `src/App.tsx:1238-1288` cache 7j + `AbortController 8s` + fallback.
- Cookies v1 4 toggles → v2 `necessary/nonEssential` + bannière 2 boutons + `resetConsent`.
- SEO `index.html` + `usePageMeta` 1 page + 0 JSON-LD → 7 pages + `Product`/`FAQPage`/`BreadcrumbList` + `public/sitemap.xml` 5 produits + `robots.txt`/`llms.txt`/`ai.txt`/`humans.txt`.
- Perf monolithe 0 `lazy`/0 `manualChunks` → 3 `lazy()` + `vite.config.ts:22-30` `manualChunks`.
