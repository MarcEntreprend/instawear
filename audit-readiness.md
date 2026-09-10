# Audit Frontstore — InstaWear_gem — Launch Readiness 10/09/2026

**Scope :** frontstore `src/`, `index.html`, `public/`. Vérifié par lecture/grep le 10/09/2026.
**Note :** ce document ne liste **que le restant à faire** (2 points). Tout le reste est vérifié OK — détail en bas.

---

### 1. Images / CLS / Cache statique — ✅ fait le 10/09 (Core Web Vitals au max sans risque sécu)

**Non-fait volontairement (documenté) :**

- `srcset`/WebP : images distantes (Supabase Storage + CDN Printful) sans API de transformation fiable — ajouter des params `?width=` à l'aveugle risquait des 400. Le `loading="lazy"` + `decoding` + préconnect couvrent l'essentiel du gain.
- Aucun changement CSP, RLS, headers sécu — `vercel.json` inchangé sur ce point.

### 2. Unsubscribe hardening — ⚠️ reco d'audit (non-bloquant launch, à planifier)

**Constat (audité le 10/09) :** `public/unsubscribe.html` parle au REST Supabase en direct avec la clé anon (SELECT + INSERT/DELETE `newsletter_subscribers`, SELECT + UPDATE `customers.email_preferences`).
Sondage live read-only : `customers?select=id` → `200 []`, `newsletter_subscribers?select=email` → `200 []` → **pas de lecture ouverte**, et la branche `UPDATE customers` est **morte en live** (le SELECT préalable ne retourne aucun id à patcher). Les `USING (true)` des migrations sont tous volontaires et safe (tables statiques/publiques by design, inserts contact contraints en type + regex email + longueur).

**Faire (quand planifié) :** déplacer les writes unsubscribe vers une edge function validée (pattern `contact-message` : validation email + rate-limit + `service_role`), et retirer le REST anon direct de `unsubscribe.html`. État actuel acceptable pour le launch.

---

### Top restants (priorisés)

Aucun. L'audit est clos — voir ci-dessous.

### 2. Unsubscribe hardening — ✅ fait le 10/09 (durci + réparé, zéro dette)

**Fait :**
- **Edge `email-preferences` déployée** (ops `get`/`save`, `service_role`, email strict normalisé, booléens stricts, clés inconnues rejetées, payload ≤100KB, rate-limit 10/min/IP, logs sanitizés `logSafe`). `save` applique **uniquement les clés fournies** (fusion — `newsletter` ne touche jamais `email_preferences` et inversement).
- **`public/unsubscribe.html` réécrite** vers l'edge — **plus aucun REST anon direct, clé anon supprimée de la page**. UI identique. Bonus : la page **refonctionne** (le REST anon était mort en live : SELECT → `[]`).
- **Migration `20261020_email_prefs.sql` appliquée live** : table `email_preference_events` (journal append-only, RLS admin) + `newsletter_subscribers` verrouillée admin-only (0 policy avant → `newsletter_subscribers_admin_all` ; footer subscribe via RPC SECURITY DEFINER inchangé, `customers` non touchée). Historique migration réparé (`repair --status applied`).
- **Onglet "Préférences"** dans Email Marketing (`PrefsEventsSection.tsx`) : stats 30j (events, désabonnements, réabonnements, modifs prefs, emails uniques) + table filtrable (date, email, changement lisible, source, IP).
- **Inventaire** : `/email-preferences` dans `openapi.json` (16 paths) + `tests/email-preferences.test.ts` (5 tests logique pure).
- **Vérifié live le 10/09** : 400 email invalide, `get` inconnu → defaults sans écriture, cycle subscribe→get→unsubscribe OK, journal avec les 2 changements, 0 ligne résiduelle. Suite : **366 tests verts**, `tsc` + `build` verts.

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
