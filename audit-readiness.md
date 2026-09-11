# Audit Frontstore — InstaWear_gem — Launch Readiness 10/09/2026 (CLOS)

**Scope :** frontstore `src/`, `index.html`, `public/`. Vérifié par lecture/grep + sondes live le 10/09/2026.
**Statut : audit clos — 0 point restant.** Ce document est l'état final : tout est vérifié OK ci-dessous, sauf un choix produit assumé.

---

### 1. Images / CLS / Cache statique — (Core Web Vitals, sans risque sécu)

**Non-fait actuellement (documenté) :** `srcset`/WebP — images distantes (Supabase Storage + CDN Printful) sans API de transformation fiable (params `?width=` à l'aveugle = risque 400). Aucun changement CSP, RLS, headers sécu.

---

### Volontairement abandonné (choix produit, ne plus tracker)

- **Tableau CNIL détaillé des cookies** (nom / finalité / durée / éditeur) — jugé non essentiel pour un user lambda. Le système actuel suffit : `useCookieConsent.ts` v2 (`necessary` + `nonEssential`, 365j, migration auto), bannière 2 boutons, gate analytics, lien `Gérer les cookies` (`Footer.tsx:471` → `resetConsent()`).

---

### Retiré (vérifié OK le 10/09 — ne plus tracker)

- 404 overlay double `fixed z-50` → `src/App.tsx:1321-1367` `knownPaths`/`knownPrefixes`/`isStaticFile` complets.
- Header logo reload → `src/components/Header.tsx:529-539` `onNavigateHome()` + `history.pushState`.
- Produit crawlable → `src/components/StoreProductCard.tsx:67` `<a href="/produit/:id">` + `preventDefault`.
- Footer `href="#faq"` / sociaux `href="#"` → `src/components/Footer.tsx:97` `#section-faq` + `Footer.tsx:178` `<span>` + `Footer.tsx:471` lien `Gérer les cookies`.
- `main.tsx:8` import `NotFound` supprimé.
- Contact factice → `src/pages/ContactPage.tsx:1-210` vrai `POST /functions/v1/contact-message` + edge (rate-limit 5/min/IP, Resend).
- Géo sans cache → `src/App.tsx:1238-1288` cache 7j + `AbortController 8s` + fallback.
- Cookies v1 4 toggles → v2 `necessary/nonEssential` + bannière 2 boutons + `resetConsent`.
- Frontstore 100% EN (admin en FR) : ~50 fichiers, `index.html` (`lang="en"`, `og:locale en_US`), emails clients + `unsubscribe.html` EN. Invisible FR conservé : commentaires, clés DB, `src/admin/`.
- `usePageMeta.ts:13` `DEFAULT_IMAGE` → `/InstaWear-logo.png`.
- `server.ts` : endpoint Gemini + `demoFallback` supprimés, `@google/genai` retiré (`server.cjs` 4.0 → 2.1 kB).
- Shipping : live Printful + fallback forfait admin, rien de statique présenté comme vérité ; conversion `COUNTRY_CURRENCY` = code mort (affichage via `formatAmount` + devise store).
- SEO : `index.html` (robots, OG absolus, `Organization` + `WebSite+SearchAction`), `usePageMeta` 7 pages, JSON-LD `Product`/`FAQPage`/`BreadcrumbList`, `robots.txt`/`llms.txt`/`ai.txt`/`humans.txt`, sitemap auto (`prebuild`), `llms.txt` bloc produits auto, `site.webmanifest` + link, **prerender statique** (`scripts/prerender.ts` via `postbuild` + `vercel.json` `cleanUrls`) — plus aucun risque SPA.
- Hygiène `console.*` : 0 `console.log` dans `src/` (58 `warn`/`error` de diagnostic gardés ; logs edges/CLI légitimes).
- RLS : `USING (true)` uniquement volontaire (tables publiques by design, inserts contact contraints) ; sondes live anon → `customers` et `newsletter_subscribers` : `200 []` (pas de lecture ouverte).
