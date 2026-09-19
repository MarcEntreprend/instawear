# PROTOCOL-VARIANTS-MOCKUPS.md

> Protocole opposable (humain ou IA, conversationnelle ou agentique) pour
> **tout le cycle variants-produits** : import Printful (prix, couleurs,
> tailles, matière, disponibilité), affichage correct aux bons endroits,
> acheminement au checkout, génération de mockups. **Importer et vendre
> juste est le cœur du projet : sans ça, le reste ne sert à rien.**
>
> **Instruction à l'IA qui lit ce document** : lis-le en entier avant toute
> proposition ou modification. Annonce ton mode : **BUILD** (créer/étendre en
> respectant les contrats) ou **DEBUG** (section 8 dans l'ordre, sans sauter
> d'étape). Termine par la preuve demandée (commande, JSON, requête SQL +
> résultat). Règles d'or apprises à nos dépens :
> 1. **Les preuves terrain (pixels, DB, logs) priment sur les hypothèses de
>    code** — en cas de conflit, croire la donnée, pas la théorie.
> 2. **Terminologie exacte, section 1** : aucun surnom ("sparkles",
>    "tiroir", "le sync") — chaque chose a un nom d'UI, un nom d'action et
>    un nom de fichier. Un agent qui confond deux chemins débugge le mauvais.
> 3. **Une seule variable à la fois** : données vs code vs infra déployée.
>    80% des faux mystères passés = code testé ≠ code live (edge non
>    redéployée, preview non rebuildée).

---

## 1. Terminologie exacte (à employer partout)

| Ce qu'on voit / dit | Nom exact | Fichier / action |
|---|---|---|
| Bouton "Générer mockups" (icône Sparkles) par ligne produit | `handleGenerateMockups` → action `generate-mockups` (synchrone inline) | `src/admin/ProductsPage.tsx:458`, edge `sync-printful` |
| Bouton "Synchroniser maintenant" (Paramètres → Connexion Printful) | `triggerSync` → `podApi.sync()` → edge **sans body** → branche **défaut** (sync complet) | `src/admin/SettingsPage.tsx`, `adminHooks.ts`, `supabaseApi.ts:1342` |
| Bouton "Réparer" (produits cassés) | `podApi.repairProduct` → action `repair-product` (+ `fix[]`) | `ProductsPage.tsx:128`, edge |
| Vue "Mockup Studio" (file bulk) | `MockupStudio` + actions `queueMockups` / `mockup-worker` | **NEUTRALISÉ (commenté : composant, imports, tests) — ne pas réactiver sans relire cette section** |
| Tiroir filtres mobile | drawer `isFilterDrawerOpen` (portal `document.body`) | `src/components/CatalogSection.tsx` |
| Galerie produit (colonne de gauche) | `ThumbStrip` + `ZoomImage` + lightbox `ImageLightbox` | `src/components/product/*`, `src/pages/ProductPage.tsx` |
| Carte vitrine | `StoreProductCard` | `src/components/StoreProductCard.tsx` |
| Sections "Frequently bought together" / "You might also like" / "Recently viewed" | `FrequentlyBoughtTogether`, `RelatedProductCard`, `RecentlyViewedSection` | `src/components/product/*` |
| Formulaire d'import Printful | `PrintfulProductForm` (enrichissement via action `get-product`) | `src/admin/PrintfulProductForm.tsx` |
| Fiche produit manuelle | `ProductFormPanel` | `src/admin/ProductFormPanel.tsx` |

---

## 2. Modèle de données variant (référence)

### 2.1 Formes Printful (lecture seule, jamais stockées telles quelles)

**Store variant** (`GET /store/products/{id}` → `sync_variants[]`) : `id` (sync id), `external_id`/`sku`, `variant_id` + `product.variant_id` (= **catalog id**, la jointure), `retail_price` (string), `currency`, `price`, `color`, `color_code`, `color_code2`, `size`, `files[]` (`preview_url` = artwork seul, `thumbnail_url`), `product.image` (mockup générique), statuts (`discontinued`, `out_of_stock`, `availability_status`).
**Catalog variant** (`GET /products/{catalogId}` → `result.variants`, **jamais** `result.product.variants` — `product` ne contient pas `variants`) : `id`, `name`, `color`, `color_code`, `color_code2`, `size`, `price`, `currency`, `image` (**blank par couleur**), `availability_status[]`, `in_stock`, `material[] = [{name: string minuscule, percentage: number}]` (blends réels ; **absent sur certains blanks** : beanie, casquette et assimilés → normal, saisie admin).

### 2.2 Espaces d'IDs (stables) vs clés dérivées (instables)

| Espace | Exemple | Stable ? | Usage |
|---|---|---|---|
| Sync variant id (`v.id`, `external_variant_id`) | `5436217478` | oui | traçabilité Phase B (webhook `stock_updated`) |
| Catalog variant id (`variant_id`, `sizes[].catalog_variant_id`) | `49644` | oui | **appariement mockups ↔ variants (OBLIGATOIRE)**, génération (`variant_ids`) |
| DB `id` produit | `36c1d9fb…` ou `prod-printful-<storeId>` | oui | URLs, panier, commandes |
| Hex couleur (`#1a1a1a`) | dérivée (`resolveHexColor` : `color_code2`# > `color_code`# > map noms > brut lowercasé) | **NON (dérive entre époques/sources : `#1a1a1a` vs `313438`)** | affichage + regroupement courant UNIQUEMENT, jamais clé durable |
| Slug matière/style (`cotton-organic`, `street`) | canonique via mapping | oui (tant que la table ne change pas) | filtres, matching |

### 2.3 Ligne `products` (ce qui est stocké et pourquoi)

- `variants[]` : **par couleur** `{color (hex), color_name, image (voir priorité §4), mockup_image (blank catalogue), external_variant_id, sizes: {TAILLE: {price, stock_status, sync_variant_id, catalog_variant_id}}}`. Les tailles explicitement `discontinued` ne sont PAS importées ; `out_of_stock` conservé (temporaire).
- `colors[]`, `color_names[]`, `color_images[]` (**alignés par index**, même ordre que `variants[]`), `mockupImages` (internes sync), `sizes[]` (union), `size_surcharge` (ajustements par taille, JSON admin).
- `image` (principale = premier mockup généré par défaut), `gallery[]` (reconstruite, cap 20 ; append opt-in), `color_images`.
- Prix : `price` (base), `original_price` (= retail × 1.3, barré), `deal_price` + `deal_active`/`deal_ends_at` (niveau produit ; **ratio appliqué aux prix par taille au panier**, §5). `printful_price`, `printful_currency`, `currency` (variante principale).
- `material` (slug, nullable, **fill-if-empty** : edit admin jamais écrasé), `style` (slug `reference_lists`), `tags[]` (semé vide, **jamais rempli par le sync** — signal endormi), `category`, `event_type`.
- Stock : `in_stock` (dérivé POD : ≥1 taille `available`), `stock_quantity`, `variant_availability` (jsonb **debug/audit**, la vérité temps réel = `sizes[].stock_status`), `external_product_id`, `external_variant_id`, `last_external_sync`.
- Identité/états : `is_active` (Q2.1 : inactif = invisible **même en URL directe**, `ProductUnavailable`), `is_best_seller`, `is_limited_time`, `affiliate_mode`/`affiliate_url` (pas de vrai stock : exclu des logiques stock/urgence).
- Traçabilité : `imagekit_enabled/signed`, `sync_logs`, `product_mockups` (**ledger** : `product_id, color, catalog_variant_ids, mockup_url, storage_url, placement, created_at` — survit aux échecs d'écriture produit), `mockup_jobs` (file : `queued → processing → done/failed`, relance des périmés).

---

## 3. Vérités terrain vérifiées (socle, ne pas re-débattre)

1. **Catalogue** : `result.product` sans `variants` (helper `extractCatalogVariants`, `_shared/catalog.ts`) ; `material` présent ou absent selon blank ; qualifiers dans les noms (`Organic…`, `Recycled…`).
2. **Générateur** : templates = flat/ghost + étiquettes sur ce catalogue (**zéro lifestyle/modèle**) ; `create-task` = `variant_ids[]` (catalog) + `format jpg` + `lifelike:true` + `files[{placement, image_url=printFile, position=pleine zone top:0 left:0}]` ; **jamais de `technique` envoyée** (risque broderie) ; tâche asynchrone, poll legacy 60 s en ligne, unitaire côté worker ; rate limits Printful (10 req/60 s établis, 2 nouveaux, lockout 60 s, 20 000 fichiers/jour).
3. **Stockage** : `<productId>/<hex>.jpg`, suffixe `-<placement>` sinon front ; `upsert:true` ; URLs d'affichage signées `ik-t` 10 ans (`signImagekitDeep`, gracieux sans clé).
4. **ImageKit** : restriction "unsigned" active → seules les URLs octets-identiques signées serveur chargent ; **passthrough total côté client** (`src/lib/imagekit.ts`), seul le serveur signe ; `tr:w-*` sans `ik-s` en console = URL construite en navigateur ou ligne legacy (resync).
5. **Infra reliably absente** : aucun cron (edge ni pg) → tout worker est manuel ; `tags[]` vide ; pas de `technique`.
6. **Locale** : frontstore EN (facettes, page produit, `formatAmount` `${..} ${symbole}` depuis `store_settings` ; slugs DB, libellés via mapping, jamais de FR stocké comme clé) ; admin FR accepté.
7. **Artefacts générés non versionnés** : `public/sitemap.xml`, `public/llms.txt` (regen `prebuild` ; plafond sitemap 50 000 URLs).

---

## 4. Priorité d'un visuel par couleur (ordre strict, partagé par tous les flux)

1. **Mockup généré storage** (design-sur-vêtement) — écrit par finalize, **préservé** aux resyncs/repairs (jamais écrasé).
2. **Blank catalogue** (bonne couleur, sans design).
3. **Aperçu brut** (artwork seul) — dernier recours, appelé à disparaître au fil des générations.
4. **Placeholder local** (`missing-item.svg`, `onError` + garde anti-boucle partout).

Champ brut stocké en interne (`rawPreview`, jamais persisté). Galerie = union (frais d'abord, storage manquants ensuite, cap 20 ; repair cap 12) **sans jamais la vider** ; principale = premier mockup sauf opt-out. Carte produit : image principale, variante active si filtre couleur. Page produit : cadre suit la variante (`variantFrameImage`), galerie = `[image, ...variantMockups, ...gallery]`, swatches = `variant.image`.

---

## 5. Prix, tailles, devise, disponibilité, panier, checkout (règles exactes)

- **Tailles** : normalisées (`2XL→XXL`, upper) + triées (`sortSizes`, `utils/sizeOrder.ts`, inconnues en fin) ; chips ≥ 24 px ; discontinuées absentes (pas de toast mensonger).
- **Prix d'une ligne** (`App.tsx`, au moment de l'ajout) : base = `dealPrice` (si deal actif non expiré) sinon `price` ; si prix par taille connu → ce prix × **ratio deal** (`dealPrice/price`) ; sinon base + `sizeSurcharge[taille]`. **Identité de ligne = `id + couleur + taille`** (fusion quantités). Ajout bloqué si variante non disponible (messages : inactif / retirée / rupture).
- **Ajout rapide** (FBT, liées, search) : `pickAvailableVariant` (première dispo, jamais `"M"` en dur — casse les mugs).
- **Disponibilité** (source unique `hooks/useProductAvailability.ts`) : `getVariantAvailability(produit, couleur, taille)` → `available | inactive | out_of_stock | discontinued` (couleur/taille inconnue = `discontinued` ; sans précision = fallback produit). Inactif invisible partout sauf panier/favoris (grisé + retrait) et commandes passées (données figées).
- **Devise** : `store_settings.currency` → symbole (`useCurrencySymbol`, défaut `$`) et code (`useCurrencyCode`, défaut `USD`) ; affichage `formatAmount` ; JSON-LD `priceCurrency` = code ; Stripe `unitAmount` en centimes (affichage — **l'autoritaire est serveur**).
- **Checkout** (`CheckoutFlow.tsx`) : totaux sur items **disponibles** + port (`get-shipping-estimate` par variant) ; **PaymentIntent via edge qui recalcule le total serveur** (le webhook compare deux valeurs serveur, jamais le total front) ; `order_items` figent `unit_price + couleur + taille` ; statuts via machine à états + webhooks idempotents.

---

## 6. Génération de mockups (procédure et garde-fous)

- **Déclencheurs** : bouton ligne "Générer mockups" (icône Sparkles, `ProductsPage`) = `generate-mockups` **synchrone** (prépare → crée → attend → finalise → alerte) ; file `queueMockups` + `mockup-worker` = **manuel uniquement** (vue Studio neutralisée).
- **Cible** : 1 id catalogue par couleur (`uniqueVariantIds`, couleurs vues une fois) ; placements (défaut `front`, ≤5) ; dimensions zone via `printfiles` (repli 1800×2400).
- **Finalize** : ledger **d'abord**, produit ensuite ; échec produit → `ok:false` explicite (jamais de succès mensonger) ; réponse/worker/alerte exposent **`applied`** (variants affichant le visuel) + `unmatchedVids/unmatchedHexes` — **lire `applied`, pas les fichiers générés**.
- **Appariement** (`_shared/productImages.ts`) : IDs stables normalisés String des deux côtés, repli hex exact, orphelins listés (capés), best-effort total.
- **Après génération** : resyncs préservent (storage gagne) ; refaire un sync complet n'efface plus le travail.

---

## 7. Matières/styles/tags (chaîne, résumée — détail d'implémentation inchangé)

Printful `material[]` → `_shared/materials.ts` (slug canonique, qualifiers par mots-clés, legacy FR→slug, `unmapped` tracé) → `buildVariantMatrix` (index partagé import+refresh) → **fill-if-empty** (+ `material_top` vers le form d'import) → `reference_lists` (contrôle admin, selects, auto-détection import serveur-d'abord) → `src/data/materials.ts` (libellés EN + normaliseur) → facettes calculées (sidebar + drawer) + ligne produit. Warnings `materialNoData` (données absentes : saisie admin, une fois) vs `materialWarnings` (vocabulaire à étendre). Styles : jamais Printful — tag à l'import, facettes du stocké, libellé capitalisé. `tags[]` : réservé (recherche texte uniquement).

---

## 8. Registre des fichiers (DOIT / NE DOIT JAMAIS)

| Fichier | DOIT | NE DOIT JAMAIS |
|---|---|---|
| `supabase/.../index.ts` (sync) | `extractCatalogVariants` partout ; préservation storage ; fill-if-empty matière ; warnings+compteurs ; `signImagekitDeep` | lire `result.product.variants` ; écraser un edit admin ; nouvel appel sans retry/garde ; retourner `ok:true` sur écriture non vérifiée |
| `_shared/{catalog,materials,productImages,variantPricing,imagekit,safeUrl,opsUtils,rateLimit,logSafe}.ts` | purs, totaux (jamais d'exception), testés (`tests/*.test.ts`) | I/O, secrets, état global |
| `finalizeMockupTask` + worker + `generate-mockups` | ledger avant produit ; `applied/unmatched` exposés ; jobs `failed` tracés avec erreur | succès sans application ; file sans déclencheur documenté |
| `src/lib/imagekit.ts` | passthrough distant ; whitelist + kill-switch | construire une URL (401 garanti) |
| `CatalogSection.tsx` | facettes depuis données ; matching slugs normalisés ; portails hors `cv-auto` ; labels/URL compatibles legacy | listes en dur ; overlay `fixed` sous `cv-auto` ; fetch taxonomies côté storefront |
| `ProductPage.tsx` + `product/*` | afficher DB + fallbacks + labels a11y ; hover-sélection desktop ; lightbox (flèches bornées, Esc, miniatures centrées sûres) | deviner des URLs ; masquer un état sans le tracer |
| Panier/checkout (`App`, `guestCart`, `CartDrawer`, `CheckoutFlow`, `supabaseApi` orders) | identité de ligne, prix au moment de l'ajout, gating dispo, merge, snapshot commande, total serveur autoritaire | faire confiance au total front ; facturer une variante bloquée |
| Admin (`ProductsPage`, `PrintfulProductForm`, `ProductFormPanel`, `SettingsPage`, `QuickView`) | selects depuis `getByType`, auto-détection pré-remplie validée humain, alertes véridiques | saisie libre de taxonomie ; valeurs codées en dur ; `material: ""` forcé |
| `supabase/migrations/*` | idempotent (`WHERE NOT EXISTS`), seed taxonomies versionné | données hors migration ; changer une politique sans migration |
| `tests/*.test.ts` | pur + cas hostiles ; mocker aux frontières (edge Deno non importable) | tester via réseau/API réelles |
| `public/sitemap.xml`, `public/llms.txt` | regen build, non versionnés | les committer |

---

## 9. Diagnostic par symptôme (dans l'ordre, preuves exigées)

**Règle 0 — versions d'abord** (80% des faux mystères) : Deployments edge (horodatage > dernier commit `supabase/`) ; rebuild + restart preview + fenêtre privée ; resync → message à 3 compteurs (`remplie(s)` / `sans données` / `non reconnue(s)`). Un seul compteur = version partielle → stop.

**A. Couleur sans design alors que généré.** 1. DB `variants[].image` par couleur (storage ? blank ? preview ?). 2. Ledger `product_mockups` (lignes à la bonne couleur ? dates ?). 3. Réponse du run : lire `applied`, pas les fichiers ; `unmatched*` = la cause nommée (hexes dérivées → normal, corrigé par IDs ; vids inconnus → remonter la tâche Printful). 4. Ouvrir 1 URL storage (design ?) + 1 URL affichée (même fichier ?).
```sql
select v->>'color_name', left(v->>'image', 100) from products, jsonb_array_elements(variants) v where id = '<ID>';
select color, placement, created_at from product_mockups where product_id = '<ID>' order by created_at desc;
```

**B. Sync ne remplit pas les matières.** `select material, count(*) from products group by material;` + message du sync : `sans données` = blanks sans matière côté Printful (saisie admin, une fois, protégée ensuite) ; `non reconnues` = étendre `_shared/materials.ts` + lignes `reference_lists`.

**C. Images cassées / 401.** URL sans `ik-s=` = construite en navigateur ou ligne legacy → resync (le serveur signe) ; jamais de contournement (restriction volontaire). Vérifier aussi les quotas/lockout Printful (429/60 s) en cas de rafales.

**D. Filtre vide / facette absente.** Normal si aucune valeur présente (`SELECT DISTINCT` d'abord). Sélection sans résultat = slug stocké ≠ slug facette → normaliseur legacy.

**E. Overlay invisible + fond assombri.** Chercher un ancêtre `.cv-auto` → portail `document.body`. Verrou scroll fantôme après resize → fermer l'état à la bascule de breakpoint (1024px).

**F. Génération "réussie" sans effet.** Lire `applied` (pas les fichiers) ; jobs `failed` + erreur ; file sans worker lancé ; broderie sans `technique` (suspect structurel) ; tâche Printful expirée côté worker (relancer).

**G. Prix incorrect.** Remonter : ligne panier (`unitPrice` figé à l'ajout : deal ratio × prix taille, sinon base + surcharge) → `sizes[].price` DB → retail vs catalogue (`variantPricing`) → sync. Checkout : l'autoritaire est serveur (PaymentIntent), pas l'affichage.

**H. Taille manquante/désordre/bloquée à tort.** Normalisation+tri (`sizeOrder.ts`) ; `discontinued` exclues à l'import (jamais de toast mensonger) ; `getVariantAvailability(couleur, taille)` tranche, pas l'intuition.

**I. Ligne dupliquée / quantité fusionnée.** Identité = `id + couleur + taille` (`mergeLinesIntoCart`) ; invité persisté (`guestCart`), connecté en DB.

**J. Galerie suspecte.** Ordre : principale, mockups variantes, galerie (union plafonnée, jamais vidée) ; doublons dédupliqués ; la principale n'est pas dupliquée en galerie DB (affichage la prépend seulement).

---

## 10. Rituel d'intervention (chaque fois)

1. `npx tsc --noEmit` → 0. `node --import tsx --test tests/*.test.ts` → verts.
2. `npm run build` → OK (prerender HTML). Commit : fichiers concernés uniquement.
3. **Deploy edge** si `supabase/` touché + attente propagation ; **rebuild + restart preview + fenêtre privée** si `src/` touché.
4. Preuve live (message 3 compteurs / alerte `applied` / SQL) **avant** de déclarer résolu.
5. Une seule variable à la fois (données vs code vs infra). Succès qui ne se voit pas = échec (alertes et retours portent l'appliqué, jamais le généré).

---

## 11. État connu (mettre à jour après chaque chantier, sinon ce doc ment)

- Studio + tests neutralisés (commentés) ; sparkles = chemin unique ; aucun cron (déclenchement manuel) ; `technique` jamais envoyée (broderie à risque) ; `tags[]` vide (signal endormi) ; sitemap 50k max (index au-delà, non implémenté).
- Devises : symboles `useCurrencySymbol` / code `useCurrencyCode` depuis `store_settings` (défauts `$`/`USD`).
- Perf mobile sous throttle connue : médiane de 3 runs propres, jamais de conclusion sur run unique ou navigateur utilisé pendant la mesure.
