# PROTOCOL-QUALITE-FRONTEND.md

> Protocole qualité frontend opposable à tout intervenant humain ou IA (conversationnelle ou agentique).
> Couvre : **Performance, Accessibility, Best Practices, SEO, Agentic Browsing**.
> Exclut volontairement : backend, sécurité, RLS, paiements métier, secrets, webhooks.
> Statut : v1.0 — compilé d'un chantier réel (desktop Lighthouse 100/100/100/100, mobile 90–92/100/100/100) + référentiels web.dev / Chrome for Developers / WCAG 2.2.
> Usage : à passer tel quel à une IA en amont (création) ou en aval (audit, refactor). Les sections marquées **[NORME]** sont obligatoires. Les sections marquées **[GUIDE]** sont recommandées.

---

## 0. Mode d'emploi pour l'IA

### 0.1 Instruction à copier-coller en tête de mission

```
Tu es soumis à PROTOCOL-QUALITE-FRONTEND.md.
1. Lis ce document en entier avant toute proposition ou modification.
2. Annonce ton mode : AMONT (création/scaffold) ou AVAL (audit/refactor).
3. Applique les sections [NORME] sans exception. Justifie toute dérogation par écrit.
4. Termine par la checklist du §8 correspondant, case par case (PASS/FAIL + preuve : fichier:ligne, commande, JSON Lighthouse).
5. Ne touche jamais au périmètre exclu (§0.3). Frontend cosmétique/sémantique/structurel uniquement.
```

### 0.2 Les deux modes

| Mode | Quand | Livrable attendu |
|------|-------|------------------|
| **AMONT** | Projet vierge, nouveau scaffold, nouvelle page/composant | Bases conformes dès J0 : budgets, tokens, sémantique, images, fonts, SEO, llms.txt (§1–§7 + checklist création §8.1) |
| **AVAL** | Audit, évaluation, refactor, pré-déploiement | Mesure selon §0.4, diagnostic chiffré, plan ordonné, correctifs vérifiés (tsc + tests + build), re-mesure (§8.2 + §8.3) |

### 0.3 Périmètre et interdits **[NORME]**

- AUTORISÉ : HTML/CSS, tokens, sémantique ARIA, headings, images, fonts, découpage JS, lazy, prerender, meta/OG/JSON-LD, `llms.txt`, `content-visibility`, squelettes, navigation.
- INTERDIT sauf demande explicite : endpoints, RLS/policies, secrets, montants/prix métier, statuts commande, webhooks, CSP/headers réseau, logique d'authentification, schéma DB.
- Règles d'hygiène issues du chantier : aucun token supprimé (tokens additifs uniquement), pas de `dangerouslySetInnerHTML`, pas de nouveau `fetch` tiers sans validation, pas de PII dans labels/URL, pas de régression desktop pour gagner du mobile.

### 0.4 Protocole de mesure **[NORME]**

Sans mesure valide, aucun chiffre n'est recevable.

1. **Build de mesure obligatoire** : `npm run build` puis `npx vite preview --port 3000` (ou équivalent : bundle de production servi en local). `npm run dev` / HMR est **invalide** (JS non minifié, +3 Mo constatés).
2. **Navigateur** : fenêtre privée, zéro extension, cache froid au premier run.
3. **Deux passes** : desktop + mobile séparés (émulation Moto G4 ×4 CPU côté mobile).
4. **Médiane de 3 runs** par format. Un run isolé ne prouve rien : variance documentée de **±2–3 points** sur CPU émulé (ex. réel : 92 → 90 sans changement structurel, travail main-thread total 3054 ms vs 3073 ms, +0,6 %).
5. **Artefacts** : conserver les JSON Lighthouse (`last-desktop-*.json`, `last-mobile-*.json`), noter versions (Lighthouse 13.x), date, URL, conditions.
6. **Terrain vs labo** : Lighthouse = labo (proxy). Le classement Google utilise le **terrain** (CrUX, percentile p75, 28 jours). Les deux doivent être suivis (PSI + Search Console + RUM `web-vitals`).

---

## 1. Référentiel de score (à connaître avant d'optimiser)

### 1.1 Pondérations Performance Lighthouse ≥ v10 **[NORME]**

Source : `developer.chrome.com/docs/lighthouse/performance/performance-scoring`.

| Métrique | Poids | Rôle |
|----------|-------|------|
| First Contentful Paint (FCP) | 10 % | Premier texte/image peint |
| Speed Index (SI) | 10 % | Progression visuelle |
| Largest Contentful Paint (LCP) | 25 % | Élément principal visible (Core Web Vital) |
| Total Blocking Time (TBT) | 30 % | Proxy labo de la réactivité (somme des tâches > 50 ms entre FCP et TTI) |
| Cumulative Layout Shift (CLS) | 25 % | Stabilité visuelle (Core Web Vital) |

Notes :

- Lighthouse v8 ajoutait Time to Interactive (10 %) et CLS à 15 %. Depuis v10 : les 5 ci-dessus.
- TBT + LCP + CLS = **80 % du score**. FCP + SI = 20 %. Prioriser dans cet ordre.
- Courbe de score log-normale calée sur HTTP Archive (médiane ≈ 50, ~8e percentile ≈ 90). **Point de rendements décroissants ≈ 0,96** : passer de 96 à 100 coûte plus cher que de 70 à 90.
- Code couleur : 0–49 rouge (poor), 50–89 orange (needs improvement), **90–100 vert (good)**. Un 100 parfait n'est ni attendu ni exigé par Google.

### 1.2 Core Web Vitals terrain (CrUX, p75) **[NORME]**

Source : `web.dev/articles/defining-core-web-vitals-thresholds`, `web.dev/explore/learn-core-web-vitals`.

| Métrique | Good | Poor | Note |
|----------|------|------|------|
| LCP | ≤ 2,5 s | > 4,0 s | Chargement perçu ; mesuré au p75 réel |
| INP (Interaction to Next Paint) | ≤ 200 ms | > 500 ms | Réactivité terrain ; remplace FID depuis mars 2024 ; ~43 % des sites encore au-dessus de 200 ms en 2026 |
| CLS | ≤ 0,1 | > 0,25 | Stabilité ; labo et terrain doivent être verts tous deux |

Règles :

- En labo, Lighthouse reporte **TBT** (pas INP, métrique terrain). Optimiser TBT < 200 ms ≈ bon proxy INP.
- Ne jamais optimiser le labo en laissant le terrain rouge. Vérifier PSI (champ CrUX) + Search Console + RUM.
- Budgets labo mobiles utiles (émulation) : FCP ≤ ~1,8 s, SI ≤ ~3,4 s, LCP ≤ 2,5 s, TBT ≤ 200 ms, CLS ≤ 0,1. Desktop : SI vert ≤ ~1,3 s.

### 1.3 Autres catégories

- **Best Practices** : audits équipondérés (~+6 pts chacun). Échouer un seul audit coûte ~6 pts.
- **SEO** : audits équipondérés (~+8 pts chacun), sauf `Structured Data` (manuel, non noté).
- **Accessibility** : moyenne pondérée (poids axe-core : ex. `aria-allowed-attr`, `button-name`, `image-alt`, `label` ≈ 4,1 % ; `color-contrast`, `link-name`, `heading-order` ≈ 1,2 % / 0,8 %). Chaque audit est binaire PASS/FAIL — pas de demi-point.
- **Agentic Browsing** (Lighthouse ≥ 13.3, mai 2026) : **expérimental, ratio PASS (ex. 3/3), pas de note /100**. Voir §6.

---

## 2. Performance

### 2.1 Principe cardinal **[NORME]**

Ordre d'attaque mobile-d'abord (80 % des correctifs sont communs desktop/mobile) :

1. **Render-blocking** (CSS/fonts bloquants) → 2. **JS initial** (entry, tiers, hydration) → 3. **Images** (LCP d'abord, puis `srcSet`) → 4. **Layout/style** (volume, `content-visibility`) → 5. Micro-optimisations.

Ne jamais commencer par les images si un CSS bloque 300 ms ou si l'entry fait 500 Ko.

### 2.2 JavaScript : entry maigre, lazy agressif **[NORME]**

Patterns prouvés (réf. `src/App.tsx:20-37`, `vite.config.ts:24-31`, `src/components/CheckoutFlow.tsx:66-74`) :

- Routes/pages hors accueil en `React.lazy()` + `Suspense` avec fallback léger sans dépendance (ex. 8 pages routes sorties de l'entry : gain entry 508 → 443 Ko).
- Tiers lourds **jamais dans l'entry** : Stripe (`loadStripe`) créé au montage du formulaire carte uniquement, promesse cachée singleton ; pas de chunk `manualChunks` dédié qui serait préchargé pour rien. Même règle : cartes, éditeurs, graphiques, modales lourdes.
- `manualChunks` minimal et conscient : `vendor: [react, react-dom]`, `supabase: [@supabase/supabase-js]`. Ne pas créer de chunk pour une lib désinstallée (ex. `motion`/`lottie-react` supprimés : chunk 0 Ko mais préchargé).
- Dépendances : désinstaller ce qui a 0 usage dans `src` avant d'optimiser le reste.
- Budgets indicatifs SPA : entry gzip ≤ ~130 Ko ; total JS page d'accueil ≤ ~250 Ko transférés ; `unused-javascript` par chunk ≤ ~60 Ko toléré côté entry si stable entre runs.
- Interdits : import synchrone d'un SDK paiement/analytics au boot ; double React (dédupliquer) ; `setInterval`/listeners lourds au boot sans besoin.

### 2.3 CSS et fonts : hors chemin critique **[NORME]**

Problème réel rencontré : CSS `index-*.css` 312 ms render-blocking + fonts Google bloquant ~800 ms mobile.

- Fonts : `<link rel="preconnect" href="https://fonts.googleapis.com">` + `https://fonts.gstatic.com crossorigin`, CSS fonts en `media="print" onload="this.media='all'"` + `<noscript>` fallback, `display=swap`. Ne jamais `@import` de fonts dans le CSS. Élaguer graisses inutiles (ex. Jakarta 300 droppée).
- Si le texte LCP dépend d'une font : `font-display: swap` + `preload` du woff2 + `size-adjust`/`ascent-override` du fallback pour limiter FOUT/CLS.
- CSS : un seul bundle utilitaire (Tailwind) minifié ; pas de CSS-in-JS runtime au boot si évitable ; éviter `@import` chaînés.
- `preconnect` uniquement vers origines réellement fetchées au premier écran (ex. `index.html:36-42` : Supabase + ImageKit). Pas de `preconnect` décoratif.

### 2.4 Images : LCP d'abord, responsive ensuite **[NORME]**

Chaîne prouvée (réf. `src/lib/imagekit.ts:159-167`, `src/components/StoreProductCard.tsx:70-82`, `src/components/HeroCarousel.tsx:22-37`) :

1. Identifier **l'élément LCP exact** (pas « les images ») via `onLCP` (`web-vitals`) ou panneau Perf. Presque toujours : 1 hero au-dessus du fold.
2. LCP : `fetchpriority="high"`, `decoding="async"`, **jamais `loading="lazy"`**, dimensions intrinsèques (`width`/`height` ou ratio box) pour CLS=0, format moderne (AVIF/WebP, q~80), servie du CDN avec `preconnect`.
3. Prerender/SSR : snapshot hero statique peint **avant le JS** (mêmes dimensions, fond uni, `onerror` qui masque) + JSON embarqué du slide (`#lead-hero-data`, `<` neutralisés) pour swap invisible côté React. Voir `scripts/prerender.ts:155-196`.
4. Toutes les autres images : `loading="lazy"` + `decoding="async"` + `srcSet` largeurs réelles (`[320,480,768]` cartes, `[480,768,1024,1600]` hero) + `sizes` fidèle au layout (`(max-width:640px) 72vw, 300px`). Ne générer un `srcSet` que si la source est éligible (jamais de `srcSet` factice).
5. Poids : logo 137 788 → 4 610 B (SVG/WebP optimisé), visuels contenu ≤ ~75 Ko, LCP ≤ ~20 Ko mobile si possible.
6. CDN images avec whitelist hostname exact + anti-SSRF (pas de `startsWith`), idempotent (URL déjà CDN = passthrough), fallback original si endpoint HS.

### 2.5 Layout, style, runtime **[GUIDE]**

- Diagnostic réel : après assainissement LCP/fonts/tiers, le n°1 restant était `styleLayout` ~1045 ms avec reflow forcé de seulement 60 ms → **volume de layout**, pas un point chaud. Réponse : réduire le DOM initial + `content-visibility`.
- `.cv-auto { content-visibility: auto; contain-intrinsic-size: auto 800px; }` sur sections **sous le fold uniquement** (catalogue, deals, about, témoignages, FAQ, recommandations). **Exclure** hero/header/nav/footer. Prévoir forçage de rendu à la demande (ancres, `scrollIntoView`, recherche).
- Tester scroll lent + sauts d'ancre après ajout (aucune section blanche).
- Découper les longues tâches JS (`scheduler.yield()` / `postTask background` / `requestIdleCallback` pour le non-critique), auditer les tiers (tag managers, embeds).

### 2.6 Tiers et réseau **[NORME]**

- Stripe/tiers paiement : 0 octet au boot homepage (vérifié : ni preload ni import dans `dist`).
- `third-party-summary` vide au premier écran idéal. Tout tiers synchrone au boot doit être justifié par écrit.
- Document lent > ~10 ms ou requête lente unique = anomalie à traiter (dans nos runs sains : TTFB ~8–10 ms, aucune requête lente).

---

## 3. Accessibility (WCAG 2.2 AA visé)

### 3.1 Contraste **[NORME]**

- Texte normal : **≥ 4,5:1**. Texte large (≥ 24 px ou ≥ 18,66 px gras) : ≥ 3:1. Indicateur de focus : ≥ 3:1 (WCAG 2.4.11/2.4.13).
- Calculer avec la **formule WCAG réelle** sur chaque **fond réel** (pas un fond théorique). Dans notre chantier : 4 fonds sombres (`#121110`, `#1c1b19`, `#252422`, `#2e1c16` footer) + 5 fonds clairs (`#fff`, `#fafaf8`, `#f9fafb`, `#f4f3f0`, `#fff2ef`).
- Pattern prouvé : token d'accent de marque **jamais** utilisé pour du texte en aplat. Créer des tokens dédiés additifs :
  - `--color-accent-strong: #c2452a` (blanc dessus : 5,03:1),
  - `--color-on-gold: #1a1916` (sur `#f0b13d` : 9,26:1),
  - `--color-accent-ink: #c2452a` (clair) / `#ff6b45` (sombre),
  - `ink3/ink4` sombres `#96938d` / `#8e8b85`, clairs `#6a6660` / `#6e6963`.
  - Réf. `src/index.css:5-63` et `dev-frontend-claude-feedback.md:41-44`.
- Piège réel : **deux `:root`** (`src/index.css:5` et `:891`) — à spécificité égale, le dernier écrase `[data-theme="dark"]` (`--color-success` sombre 9,88:1 → 3,23:1 appliqués). **[NORME]** : un seul `:root` global ; variantes thème uniquement via `[data-theme="light"]` / `[data-theme="dark"]` ; bannir les `:root` nus tardifs qui redéfinissent des variables thématisées.

### 3.2 Sémantique et ARIA **[NORME]**

Échecs réels corrigés (`devtools-frontend-check.md`, `dev-frontend-claude-feedback.md`) :

- `aria-label` sur `<span>` sans rôle = ignoré → ajouter `role="img"` (ou élément natif). Réf. `src/components/Footer.tsx` (icônes sociales).
- Tout `<select>` a un nom accessible : `<label>` explicite ou `aria-label` (ex. tri catalogue `src/components/CatalogSection.tsx`).
- `FilterGroup h4 → h3` : ordre des headings strict (`h1` unique par vue, pas de saut).
- Carte produit (WCAG 2.5.3 Label in Name) : **Option B imposée** — le lien `<a>` n'enveloppe que **l'image + le titre** (`h3 > a`), badges/prix/stock/wishlist en frères non-cliquables. Interdit : `aria-label="View …"` paraphrasé qui ne contient pas le texte visible (casse la commande vocale). Réf. `src/components/StoreProductCard.tsx:109-…`.
- Icônes décoratives : `aria-hidden="true"` ; icônes sens : `role="img"` + label.
- Pas d'attribut ARIA prohibé selon le rôle (audit `aria-allowed-attr`).

### 3.3 Cibles, clavier, mouvement **[NORME]**

- Cible tactile : **≥ 24×24 px** (AA 2.5.8), visé **44×44** (AAA 2.5.5). Swatches 20 → 24 px, molette couleur 12 → 24 px (réf. vague 1-bis).
- Focus visible partout, contraste ≥ 3:1, jamais supprimé (`outline: none` sans remplacement = FAIL).
- `prefers-reduced-motion` : désactiver autoplay carrousel, marquee, parallax.
- Navigation clavier complète : modales (focus trap + `Esc` + retour focus), menus, tabs catalogue, wishlist.

### 3.4 Vérification a11y **[NORME]**

- Lighthouse A11y = 100 exigé + test manuel clavier/lecteur d'écran (les audits auto ne couvrent qu'un sous-ensemble).
- Contrastes : 11/11 ratios ≥ 4,5:1 documentés avant commit (outil : Color Contrast Checker, formules WCAG, pas d'estimation à l'œil).

---

## 4. Best Practices

### 4.1 Règles **[NORME]**

- HTTPS partout, pas de contenu mixte, pas de `console.error`/`alert` en prod.
- Images : dimensions explicites, `alt` pertinent (vide si décorative), pas d'image cassée.
- Pas de librairie vulnérable / obsolète ; `npm audit` propre sur le chemin critique.
- Pas de `document.write`, pas de synchronous XHR, permissions (géoloc/notifs) uniquement sur geste.
- Cookies/consentement : bannière non-bloquante, analytics après consentement (`applyConsent`), pas de décalage tardif (CLS).
- PWA si applicable : `manifest`, `theme-color`, icônes PNG réelles (iOS/crawlers refusent WebP : `index.html:111-115`).

### 4.2 Hygiène anti-régression

- `tsc --noEmit` vert + suite tests verte + `npm run build` exit 0 avant toute mesure.
- Commits ciblés (`git add` fichiers nommés), messages typés (`perf(P7): …`, `a11y(vague-1): …`).
- `.gitignore` : artefacts Lighthouse locaux (`last-*.json`) versionnés uniquement si voulus comme preuves.

---

## 5. SEO

### 5.1 Socle **[NORME]** (réf. `index.html:4-145`, `scripts/prerender.ts`)

- `<!doctype html>`, `<html lang="…">` valide, `<title>` unique ≤ ~60 car., `meta description` unique ~150–160 car. par route, `canonical` absolue, `robots` `index,follow` (ou `noindex` volontaire), viewport.
- Open Graph + Twitter Card complets (`og:type`, `og:title`, `og:description`, `og:image` 1200×630 + `og:image:alt`, `og:url`, `og:locale` + alternates), `hreflang`, `sitemap.xml`, `robots.txt`, favicons.
- JSON-LD : `Organization` + `WebSite` (+ `SearchAction`) sur l'accueil, `Product` + `Offer` (+ `aggregateRating` si avis) + `BreadcrumbList` par produit, `FAQPage` sur FAQ. Échapper (`esc()`, `<` → `\u003c` dans JSON embarqué).
- SPA : **prerender post-build obligatoire** — chaque route publique a son HTML avec head dédié + snapshot lisible sans JS (`<noscript>`, même contenu que l'app, pas de cloaking). Home : lead-hero statique + spacers (34 px promo / 64 px header) pour CLS=0. Vérifier `dist/` (ex. 16 HTML / 7 produits).

### 5.2 Contenu et crawl **[GUIDE]**

- Un `h1` par vue, hiérarchie stricte, URLs propres, pagination/paramètres canonisés, images avec `alt`, liens avec intitulés (pas de « cliquez ici »).
- Données structurées testées (Rich Results Test), Search Console surveillée (couverture + CWV + E-E-A-T).

---

## 6. Agentic Browsing / GEO (AI-readiness)

> Catégorie Lighthouse **13.3+ (mai 2026), expérimentale** : ratio PASS/FAIL, pas de /100. Audits : `llms-txt`, `agent-accessibility-tree`, `cumulative-layout-shift`, `webmcp-registered-tools`, `webmcp-form-coverage`, `webmcp-schema-validity`.
> Réf. : `developer.chrome.com/docs/lighthouse/agentic-browsing/llms-txt`.

### 6.1 Exigences **[NORME]**

1. **`llms.txt` à la racine** (`/llms.txt`, Markdown) : un `H1` (nom du site), bloc résumé (`>`), sections `H2` avec liens vers pages clés. Sans BOM avant le H1 (cause réelle de FAIL Yoast constatée). `llms-full.txt` optionnel (contenu complet, convention Mintlify). Ne jamais 500 sur `/llms.txt` (404 = N/A toléré, 500 = FAIL).
2. **Arbre d'accessibilité bien formé** : c'est le levier qui compte (cas réel : A11y 89 → 100 a fait passer Agentic 33 % → 67 %). Sémantique native (`header/main/nav/footer`, `h1–h3`, `button/a/label`), aucun `aria` prohibé, noms accessibles = texte visible.
3. **CLS vert** : layout stable (spacers, dimensions images, fonts `size-adjust`). Les agents à coordonnées échouent sur cibles mouvantes.
4. **WebMCP** : N/A acceptable si aucun outil (blog/vitrine). Si formulaires transactionnels (recherche, suivi, checkout) : `form-coverage` + schémas valides exigés.
5. **Contenu servissable sans JS** : snapshot prerender/`noscript` (même exigence que SEO §5) — les crawlers IA (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot) lisent le HTML brut.

### 6.2 GEO hygiène **[GUIDE]**

- `robots.txt` : règles explicites pour crawlers IA (autoriser/refuser consciemment, pas de blocage accidentel).
- Canonical + OG + JSON-LD impeccables (les IA citent ce qui est structuré).
- Attentes honnêtes : étude ~38 000 domaines ≈ 6,8 citations avec `llms.txt` vs 6,7 sans — fichier utile comme carte, pas comme baguette magique. La structure sémantique prime.

---

## 7. Patterns d'implémentation imposés (ne pas réinventer)

| Besoin | Pattern | Référence chantier |
|--------|---------|--------------------|
| Thème sans flash | Script pré-paint synchrone dans `<head>` (`localStorage theme` → `data-theme` + fond) + sync React | `index.html:13-24` |
| Fonts non-bloquantes | `media=print` + `onload` + `noscript`, `display=swap` | `index.html:126-139` |
| Entry maigre | `lazy()` routes + `Suspense` fallback léger | `src/App.tsx:20-37` |
| Tiers paresseux | `getStripePromise()` singleton au montage, pas de chunk dédié | `src/components/CheckoutFlow.tsx:66-74`, `vite.config.ts:24-31` |
| Images responsive | `imageKitSrcSet 320/480/768` + `sizes` réels, `preconnect` CDN | `src/lib/imagekit.ts:159`, `src/components/StoreProductCard.tsx:70-82`, `index.html:36-42` |
| LCP instantané | Snapshot hero statique + `#lead-hero-data` + spacers anti-CLS | `scripts/prerender.ts:155-196`, `src/components/HeroCarousel.tsx:22-69` |
| Sous-fold léger | `.cv-auto` + `contain-intrinsic-size`, hero/header/nav/footer exclus | `src/index.css` (`.cv-auto`), 6 sections |
| SEO multi-routes | `setHead` + `addJsonLd` + `setRoot` par route/produit | `scripts/prerender.ts:88-147` |

---

## 8. Checklists opposables

### 8.1 Création (AMONT) — avant la première ligne de feature

- [ ] Budgets écrits : entry gzip, LCP/TBT/CLS cibles mobile + desktop.
- [ ] Tokens contraste calculés sur tous les fonds réels (≥ 4,5:1), un seul `:root`, thèmes via `[data-theme]`.
- [ ] Sémantique : landmarks, `h1` unique, carte/lien Option B, labels sur tous les champs, cibles ≥ 24 px, focus visible, `prefers-reduced-motion`.
- [ ] Images : pipeline responsive + LCP `fetchpriority` non-lazy + dimensions ; fonts non-bloquantes.
- [ ] JS : routes en `lazy()`, tiers hors entry, `manualChunks` justifié.
- [ ] SEO : head/OG/JSON-LD/sitemap/robots/hreflang + prerender prévu.
- [ ] Agentic : `llms.txt` + arbre a11y + snapshot sans JS prévus.
- [ ] Mesure : commandes §0.4 câblées (build/preview/Lighthouse médiane 3 runs).

### 8.2 Audit (AVAL) — dans l'ordre

1. [ ] Mesure §0.4 (JSON conservés). Noter FCP/SI/LCP/TBT/CLS + `unused-js` + `render-blocking` + `mainthread-work-breakdown` + `bootup-time` + `third-party-summary`.
2. [ ] Tri : render-blocking → JS entry/tiers → LCP → layout → images secondaires.
3. [ ] A11y : contrastes recalculés, ARIA prohibés, noms accessibles, headings, cibles, clavier.
4. [ ] BP/SEO/Agentic : audits un par un, `llms.txt` + arbre + WebMCP + JSON-LD.
5. [ ] Correctifs : un par vague, `tsc` + tests + build verts à chaque vague, `git diff -w` relu.
6. [ ] Re-mesure médiane 3 runs : exiger non-régression desktop + gain mobile ; accepter ±2–3 pts de bruit sans revert.

### 8.3 Gate pré-déploiement **[NORME]**

- [ ] `npx tsc --noEmit` → OK. Tests → verts. `npm run build` → exit 0, `dist/` contrôlé (assets, HTML prerender).
- [ ] Lighthouse médiane : desktop visé 100/100/100/100 (A11y 100 exigé), mobile ≥ 90 perf avec A11y/BP/SEO à 100 (ou 100 si atteignable **sans** risque sécu/budget).
- [ ] Scroll lent + ancres + `prefers-reduced-motion` + clavier + lecteur d'écran vérifiés.
- [ ] Aucun fichier du périmètre exclu modifié (le prouver par `git status`/`git diff --stat`).

---

## 9. Anti-patterns vus et interdits

1. Mesurer en `dev` et conclure (JS non-minifié, +3 Mo).
2. Conclure sur 1 run mobile (bruit ±2–3 pts) ou revert sur bruit (92 → 90 sans cause).
3. Optimiser les images avant le render-blocking et l'entry.
4. `loading="lazy"` sur l'image LCP ; `preload` de tout ; `preconnect` décoratif.
5. Deuxième `:root` qui écrase le dark mode ; accent de marque en texte courant sur fond clair.
6. `aria-label` paraphrasé qui ne reprend pas le texte visible ; lien géant enveloppant toute la carte.
7. Chunk `manualChunks` pour lib désinstallée ; SDK paiement importé au boot.
8. Prerender sans `noscript`/snapshot (bots et IA aveugles) ; JSON-LD non échappé.
9. `llms.txt` avec BOM/500/sans H1/liens ; arbre a11y cassé par des `span` labellisés sans rôle.

---

## 10. Sources

- Chrome for Developers — Lighthouse performance scoring (poids FCP 10 / SI 10 / LCP 25 / TBT 30 / CLS 25 ; courbe log-normale ; paliers 0–49/50–89/90–100).
- web.dev — Core Web Vitals, thresholds (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1 au p75), guides Optimize LCP/INP/CLS, Best practices fonts/carousels/cookie-notices/tags/embeds.
- GitHub GoogleChrome/lighthouse `docs/scoring.md` (BP ~+6 pts/audit, SEO ~+8 pts/audit, A11y pondérée axe-core).
- Chrome for Developers — Agentic browsing / `llms.txt` (Lighthouse 13.3+, mai 2026, expérimental, ratio PASS).
- WCAG 2.2 (contraste 4,5:1 / 3:1, cibles 24 px AA, focus 3:1) ; WCAG 3.0 draft (APCA, modèle scored Bronze/Silver/Gold — à surveiller, non normatif ici).
- Preuves chantier : `dev-frontend-claude-feedback.md`, `devtools-frontend-check.md`, `last-desktop-localhost_3000-20260914T150603.json` (100/100/100/100), `last-mobile-localhost_3000-20260914T150243.json` (92/100/100/100), `mobile-90-localhost_3000-20260914T151624.json` (90/100/100/100 — bruit, pas régression).

---

## Annexe A — Valeurs prouvées (ne pas recalculer, réutiliser l'esprit)

- `--color-accent-strong: #c2452a` (blanc 5,03:1) ; `--color-on-gold: #1a1916` (sur `#f0b13d` 9,26:1) ; `--color-accent-ink` clair `#c2452a` / sombre `#ff6b45` ; sombres `ink3 #96938d` / `ink4 #8e8b85`, clairs `ink3 #6a6660` / `ink4 #6e6963`.
- Localisations types : bandeau promo (`src/components/Header.tsx:523`), CTA fantôme (`src/components/DealsSection.tsx:260` — pas l'admin `PromotionsPage.tsx`).
- Baseline saine : serveur ~8–10 ms, TTFB neutre, `unused-js` entry ~57 Ko + supabase ~44 Ko stables, image LCP ~17–20 KiB, CSS bloquant ~15 Ko / ~311 ms avant fix.
- Post-assainissement : LCP render ~229 ms, fonts hors chemin bloquant, Stripe à 0, TBT ~240–250 ms, TTI ~3,9–4,5 s, `styleLayout` ~1 045–1 240 ms (volume, pas point chaud).

## Annexe B — Commandes

```bash
npm run build
npx vite preview --port 3000
npx tsc --noEmit
# tests (ex. projet) : node --import tsx --test tests/*.test.ts
# Lighthouse : navigation privée, sans extension, médiane de 3 runs desktop + 3 runs mobile
```
