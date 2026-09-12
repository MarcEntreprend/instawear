# fixes and improvements — restant à faire (vérifié 12/09/2026)

> Scope : `src/`, `public/`, `supabase/`. Vérifié par lecture/grep le 12/09/2026.
> Ce document ne liste **que le restant à faire**. Tout ce qui est vérifié OK a été retiré en bas.

---

## product card — ⚠️ reste admin

### Popup derrière le modal — TOUJOURS OUVERT (inchangé)

- `src/admin/ProductQuickViewModal.tsx:77` `zIndex: 300` > `src/components/ToastContainer.tsx:174` toast `z-100` → ajout au panier depuis le quick-view admin : toast **derrière** le modal, pas de feedback visuel.
- **Faire :** soit porter le toast admin en `z-[400]`, soit `closeModal()` avant `showToast()` dans `ProductQuickViewModal`.

---

## panier — ⚠️ 1 reste (guest)

### Persistance après refresh — TOUJOURS OUVERT (inchangé)

- **Connecté : OK.** Guest : toujours mémoire seule (`grep "instawear-cart|localStorage.*cart" = 0`) → refresh = panier perdu.
- **Faire :** fallback `localStorage "instawear-cart"` pour guest (hydrate au `useEffect` initial, sync à chaque `setCart`), vidé uniquement sur `order_success`.

---

## header — ⚠️ 1 reste + 1 partiel

### 1. Logo/nom → vrai refresh — TOUJOURS OUVERT (décision à trancher)

- **Actuel :** `src/components/Header.tsx:560-571` → `onNavigateHome()` (SPA soft nav), reload seulement en fallback d'exception. L'audit considère le `pushState` comme un fix (pas de reload intempestif) — **en conflit avec la demande initiale** (vrai refresh).
- **Faire :** trancher — soit garder le SPA (alors clore ce point), soit `window.location.href = "/"` sur clic logo.

### 2. Barre de recherche → clic résultat — PARTIEL (code prêt, branchement manquant)

- **Avancé :** `src/components/Header.tsx:497-505` `handlePickProductSuggestion` appelle désormais `onSelectProduct(p)` (fini le `scrollIntoView`).
- **Reste : BUG RÉEL** — `onSelectProduct` est optionnel (`Header.tsx:68`) et **`App.tsx` ne le passe pas** au `<Header>` → clic sur une suggestion produit = **aucune réaction**. Pire qu'avant (avant : scroll vers la carte).
- **Faire (1 ligne) :** ajouter `onSelectProduct={(p) => openProduct(p)}` aux props du `<Header>` dans `App.tsx`.

---

## footer — ⚠️ 1 reste (newsletter bonus)

- Copy inchangée `src/components/Footer.tsx:417` (`"Subscribe to get new arrivals and exclusive offers, no spam."`) — toujours aucune incitation bonus (`-10%`, code bienvenue).
- **Faire :** teaser bonus dans la copy (+ éventuellement `promo_code` retourné à l'inscription).

---

## reactive — ⚠️ en attente de spec (pas une dette code)

- Boutons déjà `transition-colors`/`hover:-translate-y`/`active:scale` partout. Pas de système "reactive" dédié car la demande reste vague (`link button`, `pills`, logo…).
- **Faire :** lister 2-3 exemples concrets attendus (quel effet sur quel composant), sinon clore.

---

## order — ❌ 1 reste

### Telegram → aussi en email — TOUJOURS OUVERT (inchangé)

- `src/components/CheckoutFlow.tsx:149-182` : toujours Telegram seul (`window.open t.me/…`), aucun envoi email redondant (`grep sendOrderEmail|send-email = 0` dans `CheckoutFlow`).
- **Faire :** à côté de `sendTelegramNotification`, envoyer le même contenu via Resend/`emailTemplates` (pattern existant `sendCancelledEmail`). Ne pas remplacer Telegram.

---

## order page — ⚠️ 1 reste (point menu gauche)

- Refresh animation OK (inchangé). Toujours **aucun dot/badge Orders** dans `AdminSidebar.tsx` (`grep pendingPrintful|badge.*orders = 0`) — dot seulement sur `notifications`.
- **Faire :** `pendingPrintfulCount` + badge/dot sur le bouton Orders.

---

## FR dans le code — ✅ OK par conception (ne plus tracker)

- Les ~28 `toLocaleString/DateString("fr-FR")` restants sont **tous dans `src/admin/`** (+ `currency.ts:5` locales du tableau de conversion statique, non utilisé à l'affichage). L'admin reste en français par décision ; frontstore 100% EN vérifié. Rien à faire.

---

### Retiré (vérifié OK — ne plus tracker)

- Right sidebar close outside → `CartDrawer.tsx:96-99` backdrop OK.
- Panier double-add / payment highlight / email clear / Stripe spin → tous OK.
- Notifications bulk, OrderPage `en production`, tab notif, disponibilité standardisée, Printful désync guard, interface user orders → tous OK.
- **Offline (NOUVEAU)** : hook `useOffline.ts` (navigateur + `networkError`) ; placeholders `Try "birthday hoodie"…` (`Header.tsx` desktop+mobile, `SearchResultsPage.tsx:104`) ; bloc offline dédié (`NO_INTERNET` + *"Oops! Something went wrong…"* + Try again/Back home) dans `CatalogSection.tsx` (`onRetry`/`onNavigateHome` branchés `App.tsx`) et `SearchResultsPage.tsx`.
- **TEXTS génériques (NOUVEAU)** : flash résolu — snapshots prerender enrobés `<noscript>` (`scripts/prerender.ts`), zéro flash avec JS, contenu intact sans JS.
- **FEATS Colors (NOUVEAU)** : facettes réelles agrégées (`buildColorFacets`, tri popularité, `normHex`), matching normalisé (filtre + `?color=`), pastille `Color: <nom>` (+ dot, hex/RGB tooltip), visuel variante par carte (`activeColor`, swap progressif avec fallback), modal +N inchangé. Tests `color-facets.test.ts` verts.
- Header search : code `onSelectProduct` prêt (reste le branchement App — voir section header).
