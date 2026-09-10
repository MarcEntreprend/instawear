# Audit Frontstore — InstaWear_gem — Launch Readiness 10/09/2026

**Scope :** frontstore `src/`, `index.html`, `public/`. Vérifié par lecture/grep le 10/09/2026.
**Note :** ce document ne liste **que le restant à faire** (2 points). Tout le reste est vérifié OK — détail en bas.

---

### 1. Images / CLS / Cache statique — ❌ à faire (Core Web Vitals)

**Constat (re-vérifié le 10/09) :** aucune optimisation image, aucun cache long sur les assets.

- **Pas de `srcset` / WebP / `imagetools`** — `package.json` n'a pas `vite-imagetools`. `src/components/StoreProductCard.tsx:79-87` n'a que `loading="lazy"`, pas de `decoding="async"`, pas de `fetchpriority="high"` sur le hero, pas de `srcset`. Idem `ProductPage.tsx` (image principale).
- **Pas de `width`/`height` sur les `<img>`** — atténué par les wrappers `aspect-square` (`StoreProductCard.tsx:78`), qui réservent déjà l'espace et limitent le CLS sur la grille. Reste un risque sur `ProductPage` et les images hors ratio fixe.
- **`server.ts:31` — `express.static(distPath)` sans `maxAge` / `immutable`.** Les assets Vite sont hashés (`assets/index-*.js/css`) → servir `Cache-Control: public, max-age=31536000, immutable` sur `/assets/*` (et court sur `index.html`). Sans ça, chaque reload re-télécharge tout sur le path VPS. (Sur Vercel le CDN gère le cache tout seul — ce point ne concerne que le path `node dist/server.cjs`.)
- **Bundle :** déjà réglé (`vite.config.ts:22-30` `manualChunks` + 3 `lazy()` dans `src/App.tsx:20`). Ne reste que le poids image ci-dessus.

**Faire :**
1. `decoding="async"` sur toutes les vignettes + `fetchpriority="high"` sur hero/produit principal.
2. `width`/`height` (ou ratio fixe) sur les `<img>` hors `aspect-square`.
3. `vite-imagetools` (ou preset WebP/AVIF + `srcset`) pour les visuels produits — à évaluer vs bande passante Printful/Supabase Storage (les images viennent du CDN, le `srcset` passe par `?width=` si le CDN le supporte, sinon génération au build).
4. `server.ts` : `express.static(distPath, { maxAge: "1y", immutable: true })` monté sur `/assets`, `maxAge: 0` sur `index.html`.

### 2. Unsubscribe hardening — ⚠️ reco d'audit (non-bloquant launch, à planifier)

**Constat (audité le 10/09) :** `public/unsubscribe.html` parle au REST Supabase en direct avec la clé anon (SELECT + INSERT/DELETE `newsletter_subscribers`, SELECT + UPDATE `customers.email_preferences`).
Sondage live read-only : `customers?select=id` → `200 []`, `newsletter_subscribers?select=email` → `200 []` → **pas de lecture ouverte**, et la branche `UPDATE customers` est **morte en live** (le SELECT préalable ne retourne aucun id à patcher). Les `USING (true)` des migrations sont tous volontaires et safe (tables statiques/publiques by design, inserts contact contraints en type + regex email + longueur).

**Faire (quand planifié) :** déplacer les writes unsubscribe vers une edge function validée (pattern `contact-message` : validation email + rate-limit + `service_role`), et retirer le REST anon direct de `unsubscribe.html`. État actuel acceptable pour le launch.

---

### Top restants (priorisés)

1. **Images/CLS/cache statique** — impact LCP/CLS direct, seul vrai chantier restant.
2. **Unsubscribe hardening** — reco, non-bloquant.

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
