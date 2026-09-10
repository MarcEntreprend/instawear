# fixes and improvements — restant à faire (vérifié 10/09/2026)

> Scope : `src/`, `public/`, `supabase/`. Vérifié par lecture/grep le 10/09/2026.
> Ce document ne liste **que le restant à faire**. Tout ce qui est vérifié OK a été retiré en bas.

---

## when no internet — ❌ 3 restants

### 1. Placeholder search bar offline — NOT DONE
- **Actuel :** `src/components/Header.tsx:601,791` et `src/pages/SearchResultsPage.tsx:104` affichent partout `"Search for an item, an event…"`. Aucune branche `offline` ou `products.length===0`.
- **Attendu :** quand aucun item n'est chargé (offline / fetch échoué), afficher un exemple FR générique type `"t-shirt for birthday"` / `"hoodie festival, mug anniversaire…"` pour guider.
- **Faire :** brancher le placeholder sur `networkError` (`src/App.tsx:101`) ou `navigator.onLine` → si offline, placeholder FR d'exemple.

### 2. Message d'erreur générique offline — NOT DONE
- **Actuel :** `src/components/CatalogSection.tsx:790-812` affiche toujours `"No items match these filters / Try broadening search"` même quand `networkError` est vrai. Aucun `if (networkError)` et la string `"Oups !"` n'existe nulle part (`grep 0`). L'asset `NO_INTERNET` (`src/constants/assets.ts:21`) est importé `CatalogSection.tsx:14` mais jamais rendu.
- **Attendu :** remplacer `<<Aucun article ne correspond à votre recherche - Modifiez vos filtres…>>` **uniquement** en cas offline par : `"Oups ! Une erreur inattendue s'est produite lors de l'accès à la page. Veuillez réessayer plus tard ou, si vous préférez, retourner à la page d'accueil."` + CTA Accueil.
- **Faire :** dans `CatalogSection.tsx`, si `networkError` → rendre le bloc offline dédié (icône `NO_INTERNET` + message ci-dessus + bouton `onNavigateHome`).

### 3. Fallback textes (hors images) — PARTIAL
- **Images : OK** — `src/constants/assets.ts:18` `PLACEHOLDER_IMG = "/Instawear-missing-item.svg"` utilisé partout (`StoreProductCard.tsx:80,84` `onError`, `CartDrawer.tsx:299`, `ProductPage.tsx:229,242`, `ProductQuickViewModal.tsx:66`).
- **Reste :** textes offline (titres catégories, reassurance, FAQ) n'ont pas de fallback. Si fetch produits échoue, la page est vide sans explication.
- **Faire :** rien de plus pour les images. Pour les textes, le bloc offline du point 2 suffit.

---

## product card — ⚠️ reste admin

### Popup derrière le modal — PARTIAL
- **Storefront : OK** — `src/pages/ProductPage.tsx:465` modal `z-50` < `src/components/ToastContainer.tsx:174` toast `z-100` → toast au-dessus.
- **Reste admin : NOT DONE** — `src/admin/ProductQuickViewModal.tsx:77` `zIndex: 300` > toast `z-100` → quand on ajoute au panier depuis le quick-view admin, le toast `src/App.tsx:926` s'affiche **derrière** le modal, pas de feedback visuel.
- **Faire :** soit porter le toast admin en `z-[400]`, soit `closeModal()` avant `showToast()` dans `ProductQuickViewModal`.

---

## panier — ⚠️ 1 reste (guest)

### Persistance après refresh — PARTIAL
- **Connecté : OK** — `src/App.tsx:347-425` `customerApi.getCart/addCartItem/clearCart` + `src/App.tsx:1122,1141` clear uniquement après `orderSuccessId` → persiste bien, vidé seulement à la fin du checkout.
- **Reste guest : NOT DONE** — si `!user.email`, le panier est en mémoire seule (`grep "localStorage.*cart" = 0`). Un refresh perd le panier commencé, contrairement à la demande "persiste si refresh, clear seulement à la fin".
- **Faire :** ajouter fallback `localStorage "instawear-cart"` pour guest (hydrate au `useEffect` initial, sync à chaque `setCart`), et le vider uniquement sur `order_success`.

---

## header — ❌ 2 restants

### 1. Logo/nom → vrai refresh — NOT DONE
- **Actuel :** `src/components/Header.tsx:529-540` `onClick` fait `onNavigateHome()` → `history.pushState({}, "/")` + scroll, **sans reload**. Seul `src/admin/AdminSidebar.tsx:220` fait `window.location.reload()`.
- **Attendu :** clic logo/nom = vrai refresh page (demande initiale).
- **Faire :** remplacer le `pushState` du logo par `window.location.href = "/"` ou `window.location.reload()` (ou rendre le comportement configurable : `if (event.metaKey) pushState else reload`).

### 2. Barre de recherche → clic résultat doit rediriger — NOT DONE
- **Actuel :** `src/components/Header.tsx:468-473` `handlePickProductSuggestion` fait `document.getElementById("product-card-${id}").scrollIntoView()` — scroll dans la grille, pas de navigation.
- **Attendu :** clic sur un résultat produit → aller sur `ProductPage` (`/produit/:id`).
- **Faire :** remplacer le scroll par `onSelectProduct(p)` ou `history.pushState({}, "", "/produit/"+p.id)` (comme `StoreProductCard.tsx:67` le fait déjà). `handlePickCategorySuggestion:459` est déjà correct pour catégories.

---

## footer — ⚠️ 1 reste (newsletter bonus)

- **Liens/textes : OK** — `src/components/Footer.tsx:192-347` Shop/Help/Légal + `373-419` newsletter branchée `newsletterApi.subscribe`.
- **Reste : NOT DONE** — copy actuelle `Footer.tsx:414` `"Subscribe to get new arrivals and exclusive offers, no spam."` ne mentionne pas d'incitation bonus (`-10%`, code bienvenue, etc.) demandée : *"thinking as a customer, it'd be interesting for bonuses and stuffs"*.
- **Faire :** ajouter teaser bonus dans la copy + éventuellement champ `promo_code` retourné à l'inscription (si existant côté `newsletterApi`).

---

## reactive — ⚠️ vague / partiel

- **Actuel :** boutons ont déjà `transition-colors`, `hover:-translate-y-0.5`, `active:scale-[0.98]` (`CatalogSection.tsx:472-483` pills, `ProductPage.tsx` etc.), mais pas de système "reactive" dédié (ex: `motion`/`framer` hover, effet sur logo "art macé").
- **Reste :** spec trop vague pour être vérifiable. Si attendu = micro-interactions cohérentes par variant (`link button`, `pills`, `product card` + logo), **à préciser** : quel effet sur quel composant ?
- **Faire :** soit clore (état actuel jugé suffisant), soit lister 2-3 exemples concrets attendus.

---

## order — ❌ 1 reste

### Telegram → aussi en email — NOT DONE
- **Actuel :** `src/components/CheckoutFlow.tsx:149-184` `sendTelegramNotification()` ouvre seulement `https://t.me/marcrubenmacean?text=…` (`window.open`), appelé `1472,2575` après `shouldSendTelegram()`.
- **Attendu :** dupliquer chaque notif Telegram en email (demande : *"send the telegram msg, as an email"*).
- **Faire :** à côté de `sendTelegramNotification`, appeler `supabase.functions.invoke("send-order-email")` ou `emailTemplates` + Resend (déjà utilisé `OrdersPage.tsx:1061` `sendCancelledEmail`). Ne pas remplacer Telegram, ajouter l'email.

---

## order page — ⚠️ 1 reste (point menu gauche)

- **Refresh animation : OK** — `src/admin/OrdersPage.tsx:188` `sendingToPrintful`/`sendingOrderIds` + `814-824` spinner `RefreshCw animate-spin Envoi…` + `1034` spinner modal + `refetch()` après succès.
- **Reste : NOT DONE** — point/badge dans le menu gauche demandé : *"prévoir un 'point' dans le bouton de menu gauche"* quand une commande attend l'envoi Printful. `src/admin/AdminSidebar.tsx:82-416` n'affiche un dot que pour `notifications` (`urgentCount` shake `364`, `unreadCount` badge `388`), rien pour `orders`.
- **Faire :** ajouter `pendingPrintfulCount` (ex: `orders.filter(o => o.status==="pending" && !o.printful_order_id).length`) et badge/dot sur le bouton `Orders` de `AdminSidebar`.

---

### Retiré depuis la version précédente (vérifié OK le 10/09 — ne plus tracker)

- Right sidebar close outside → `src/components/CartDrawer.tsx:96-99` backdrop `onClick={onClose}` OK.
- Panier double-add → `src/App.tsx:337,908` `addToCartLock` + 400ms OK.
- Panier payment highlight/scroll → `src/components/CheckoutFlow.tsx:2265` `scrollIntoView` + `CheckoutFlow.tsx:240` `border #fca5a5` OK.
- Panier email clear on input → `src/components/CheckoutFlow.tsx:898` `onClearError` OK.
- Panier Stripe spin → `src/components/CheckoutFlow.tsx:2336,2597` `processing` + `minDelay 1100ms` OK.
- Notifications bulk lues/nonlues → `src/admin/NotificationsPage.tsx:1158-1202` `allRead/allUnread` OK (mixte = deux boutons actifs).
- OrderPage `en production` = `envoyer à printful` → `src/admin/OrdersPage.tsx:290-313` `podApi.createOrder` avant `updateStatus` OK.
- Tab notif WhatsApp-like → `src/hooks/useTabBadge.ts:15-72` `document.title (N)` + `drawFaviconBadge` + poll 30s + `AdminSidebar.tsx:364` shake OK.
- Product disponibilité standardisée → `src/hooks/useProductAvailability.ts:1-119` `getProductAvailability/isProductUnavailable` utilisé partout OK.
- Scenario commande Printful désync → `src/admin/OrdersPage.tsx:290` garde `catch` sans changement de statut OK.
- Interface user orders → `src/components/AccountPage.tsx:386-985` `OrdersTab` + tier/stats/reorder OK.
