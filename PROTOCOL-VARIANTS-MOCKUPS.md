# PROTOCOL-VARIANTS-MOCKUPS.md

> Protocole opposable (humain ou IA, conversationnelle ou agentique) pour tout
> ce qui touche aux **variants produits** (couleurs, prix, matière,
> disponibilité) et à la **création de mockups** dans ce projet.
> Compilé après incidents réels résolus (signatures ImageKit 401, catalogue
> invisible, mockups générés mais jamais affichés). Chaque règle ci-dessous
> a été payée en debugging : ne pas la "simplifier".
>
> **Instruction à l'IA qui lit ce document** : lis-le en entier avant toute
> proposition ou modification. Annonce ton mode : **BUILD** (créer/étendre en
> respectant les contrats) ou **DEBUG** (appliquer la section 6 dans l'ordre,
> sans sauter d'étape). Termine par la preuve demandée (commande, JSON,
> requête SQL + résultat). Règle d'or apprise : **les preuves terrain
> (pixels, DB, logs) priment sur les hypothèses de code** — en cas de
> conflit, croire la donnée, pas la théorie.

---

## 0. Glossaire minimal

| Terme | Sens ici |
|---|---|
| `sync variant` | Variante côté Printful Store (`/store/products`) : porte `variant_id` (= id catalogue), prix retail, `files[]` (designs), `product.image` (mockup générique) |
| `catalog variant` | Variante catalogue Printful (`/products/{id}`) : porte `id`, `image` (blank **par couleur**), `material[]`, prix catalogue, statuts |
| `hex` | Clé couleur **dérivée** (`resolveHexColor`) — instable entre époques/sources, ne jamais utiliser comme clé durable |
| `storage mockup` | Visuel généré (design-sur-vêtement), bucket `product-mockups` (`/product-mockups/<produit>/<hex>.jpg`) — seule source de "maillot + design" |
| `blank` | Mockup vierge catalogue (bonne couleur, sans design) — plancher acceptable |
| `preview brut` | `files[].preview_url` (artwork seul, souvent fond transparent) — **jamais** un visuel produit |

---

## 1. Vérités terrain vérifiées (ne pas re-vérifier, s'appuyer dessus)

API Printful (probée live + `docs-API/printiful API doc openapi.json`) :
1. `GET /products/{id}` répond `{result: {product: {...SANS variants}, variants: [...]}}`. `result.product` ne contient **jamais** `variants` — tout code lisant `result.product.variants` lit du vide.
2. `Variant.material[] = [{name: string minuscule, percentage: number}]`, blends réels (ex. 80/20). Certains blanks (beanie, casquette, 2 tees du catalogue actuel) renvoient **zéro** `material` — normal, pas une panne.
3. Les noms de matières portent les qualifiers (`"Organic Ring Spun Combed"`, `"Recycled Polyester"`).
4. Mockup Generator : `templates/{id}` (ce catalogue : flat/ghost uniquement, **zéro lifestyle/modèle**), `printfiles/{id}`, `create-task/{id}` (`variant_ids[]` + `files[{placement,image_url,position}]`), `task?task_key=`. `create-task` de ce projet **n'envoie jamais `technique`** — suspect n°1 pour tout échec sur produits broderie.
5. Les `color_code` Printful **dérivent entre époques** (avec/sans `#`, versions) : deux lectures du même variant peuvent donner deux hexes différents (`#1a1a1a` stocké vs `313438` généré). **Conséquence : ne jamais apparier sur des hexes dérivées.**

ImageKit (compte avec restriction "unsigned" active) :
6. Seules les URLs **octets-identiques signées serveur** (`ik-s`) chargent. Toute URL construite/réécrite côté client → **401**, avec ou sans signature d'origine. Le frontend ne signe jamais (pas de clé privée, par design) : **passthrough total côté client**, seul le serveur signe.
7. Preuve : `tr:w-480` sans `ik-s` en console = URLs construites par le navigateur (anciens srcSet), toutes en 401.

Base (confer `database-context-100926.md`, vérifier dérive si doute) :
8. `products` : `variants` (jsonb, par couleur : `color, color_name, image, mockup_image, sizes{...catalog_variant_id, sync_variant_id...}, external_variant_id`), `gallery`, `color_images`, `image`, `material` (slug, nullable), `style` (slug), `tags` (vide depuis le sync — non rempli), `external_product_id`.
9. `product_mockups` : **ledger** (`product_id, color, catalog_variant_ids, mockup_url, storage_url, placement, created_at`) — source de vérité de ce qui a été généré, même si l'écriture produit échoue.
10. `reference_lists` (`type, value, label, keywords, sort_order`) : taxonomies `category/event_type/style/material` — lecture anonyme OK, écriture admin. Le storefront ne doit JAMAIS la requêter (perf) : facettes calculées depuis les produits chargés.
11. `mockup_jobs`, `sync_logs` : file/trace. **Aucun cron nulle part** (ni edge, ni pg) : tout worker est déclenché à la main.

---

## 2. Flux canoniques (requête → réception → affichage)

### A. Sync général (Settings → "Synchroniser maintenant")
1. `SettingsPage` → `usePod().triggerSync` (`src/admin/adminHooks.ts`) → `podApi.sync()` (`src/api/supabaseApi.ts`, POST edge **sans body**) → branche **défaut** de l'edge.
2. Edge `sync-printful/index.ts` : `GET /store/products` → par produit `GET /store/products/{id}` + `GET /products/{catalogId}` (**via `extractCatalogVariants`**, `_shared/catalog.ts`) + sizes → `buildVariantMatrix` (index `catalogIdToMaterials` inclus) → payload → **préservation storage** (`_shared/productImages.ts`) → `signImagekitDeep` → update/insert + `sync_logs`.
3. Règles : `material` en **fill-if-empty** (edit admin jamais écrasé) ; warnings `materialNoData` / `materialWarnings` + compteur `materialsFilled` dans réponse + logs + message/notif client.
4. Réponse `{success, syncedCount, errors?, materialsFilled?, materialNoData?, materialWarnings?}`.

### B. Import via form (PrintfulProductForm)
1. Enrichissement edge (`get-product`) → `data` (matrix : `colors, color_names, color_images, sizes, variants` + `material_top` + `catalog_variants` bruts).
2. Form : auto-détection catégorie/event/style/matériau (serveur d'abord via `material_top`, fallback mots-clés `reference_lists`), selects validés admin, `computedVariants[].image = edgeVar.image || cimg`, galerie = `color_images + catalogGallery`.
3. Submit → `onSave` → ligne `products`. **État attendu frais : blanks par couleur (pas d'artwork brut), matériau pré-rempli.**

### C. Repair per-product ("sync variant", `repair-product`)
1. Relit la ligne (`variants, image, gallery, color_images`), rejoue l'enrich frais, écrit un **patch** (sizes / images / sizeguide selon `fix`).
2. Mêmes règles de préservation storage que le sync (blocs touchés uniquement).
3. **Ne crée pas de mockups** : il ne fait que realigner sur la matrice + préserver le généré.

### D. Sparkles (per-product, synchrone)
`ProductsPage handleGenerateMockups` → `podApi.generateMockups(productId)` → edge `generate-mockups` : `prepareMockupTask` (variant_ids uniques + `printFileUrl` + placement/dims via `printfiles`) → `createMockupTask` → `pollMockupTask` → `finalizeMockupTask` → alerte UI.
- L'alerte lit **`applied`** (variants affichant réellement le visuel), pas `mockupsGenerated` (fichiers stockés). Écart entre les deux = orphelins (`unmatchedVids/unmatchedHexes` dans la réponse).

### E. Mockup Studio (file + worker) — **neutralisé au moment de la rédaction**
Composant, imports (`ProductsPage`) et tests commentés (plan d'élimination en cours). Chemin historique : `queueMockups` → `mockup-worker` (manuel, **jamais de cron**) → mêmes écritures que D. Ne pas réactiver sans relire cette section.

### F. Affichage (lecteurs — aucun ne choisit, tous subissent la donnée)
- `StoreProductCard` (vignette : variante active ou image principale), `ProductPage` (`ZoomImage` cadre, `ThumbStrip` = `[image, ...variantMockups, ...gallery]`, swatches = `variant.image`, FBT), form import (table `colorImages[i]`), `ProductsPage`/`QuickView` admin, `scripts/prerender.ts` (snapshots SEO).
- **Priorité d'un visuel par couleur** (ordre) : mockup généré storage (design-sur-vêtement) > blank catalogue (bonne couleur) > aperçu brut (dernier recours, appelé à disparaître au fil des générations).

### G. Matières/styles (chaîne complète, résolue)
Printful `material[]` → `_shared/materials.ts` (slug canonique) → `buildVariantMatrix` → fill-if-empty DB → `reference_lists` (contrôle admin, selects) → `src/data/materials.ts` (libellés EN + normaliseur legacy) → facettes calculées (`CatalogSection`, sidebar + drawer, style idem via slugs `reference_lists`). Page produit : ligne "Material · …". Styles : jamais Printful (concept maison) — tag à l'import, facettes du stocké.

---

## 3. Registre des fichiers : comportements exigés

| Fichier | DOIT | NE DOIT JAMAIS |
|---|---|---|
| `supabase/.../index.ts` (sync) | lire variants via `extractCatalogVariants` ; préserver storage au resync/repair ; fill-if-empty matière ; warnings + compteurs | écrire `variants[].image` depuis un aperçu brut quand un mockup existe ; écraser un edit admin ; ajouter un appel Printful sans retry/garde |
| `_shared/catalog.ts` | préférer le niveau qui A des variants | supposer `result.product.variants` |
| `_shared/materials.ts` | classifier par forme (fibres + qualifiers + legacy FR), agréger dominant, tracer `unmapped` | deviner une matière sans données (laisser vide + warning) |
| `_shared/productImages.ts` | apparier par IDs stables (normalisés String), repli hex exact, best-effort total (jamais d'exception) | matcher sur hex seul en premier ; vider une galerie ; ajouter des clés au payload |
| `finalizeMockupTask` | ledger AVANT produit ; `ok:false` si écriture produit impossible ; réponse avec `applied/unmatched*` | retourner `ok:true` quand rien n'est visible |
| `src/lib/imagekit.ts` | passthrough total distant ; whitelist + kill-switch conservés | construire/transformer une URL (401 garanti) |
| `CatalogSection.tsx` | facettes depuis données (`build*Facets`), matching slugs normalisés, portails hors `cv-auto` pour tout overlay `fixed` | listes en dur ; overlay `fixed` dans un sous-arbre `cv-auto` (containing block → panneau invisible) ; fetch refs côté storefront |
| `ProductPage.tsx` + `product/*` | afficher DB telle quelle + fallbacks `missing-item`, labels a11y | deviner/manipuler des URLs |
| Admin (`ProductsPage`, `PrintfulProductForm`, `ProductFormPanel`, `SettingsPage`, `QuickView`) | selects depuis `getByType`, auto-détection pré-remplie validée humain, alertes véridiques | saisie libre de taxonomie ; `material: ""` codé en dur ; alerte de succès sur écriture non vérifiée |
| `supabase/migrations/*` | idempotent (`WHERE NOT EXISTS`), seed `reference_lists` versionné | créer des données hors migration (dashboard sans report) |
| `tests/*.test.ts` | pur + cas hostiles (null/tableaux/strings) pour chaque helper partagé | tester via l'edge (Deno non importable : mocker aux frontières) |
| `public/sitemap.xml`, `public/llms.txt` | régénérés au build, **non versionnés** | les committer (bruit à chaque turnover) |

---

## 4. Diagnostic : protocole par symptôme (dans l'ordre)

**Règle 0 — versions d'abord.** 80% des faux mystères = code testé ≠ code live.
- Edge live ? Dashboard → Functions → `sync-printful` → Deployments (horodatage > dernier commit touchant `supabase/`). Sinon : déployer, attendre 2 min.
- Frontend live ? Rebuild + restart preview + fenêtre privée neuve (pas de refresh simple).
- Preuve fonctionnelle : resync → message à 3 compteurs (`remplie(s)` / `sans données` / `non reconnue(s)`). Un seul compteur = version partielle → stop, mettre à jour d'abord.

**A. Des couleurs affichent l'artwork brut / des blanks au lieu du design généré.**
1. DB : `variants[].image` par couleur (storage ? blank ? preview ?). SQL :
```sql
select v->>'color_name', left(v->>'image', 90) from products,
jsonb_array_elements(variants) v where id = '<PRODUCT_ID>';
```
2. Ledger : `select color, placement, created_at from product_mockups where product_id = '<ID>' order by created_at desc;` — si des lignes existent avec les bonnes couleurs mais pas en `variants[].image` → échec/mismatch d'appariement (voir `unmatchedVids/unmatchedHexes` de la réponse du run).
3. Si dates ledger ≪ aujourd'hui et resyncs entre-temps **sans** préservation déployée → écrasement normal (relancer génération après deploy).
4.ixel : ouvrir 1 URL storage (design ?) + 1 URL affichée (même fichier ?).

**B. Sync ne remplit pas les matières.**
1. `select material, count(*) from products group by material;`
2. Message du sync : `sans données` = Printful muet sur ces blanks (saisie admin, une fois) ; `non reconnues` = vocabulaire à étendre dans `_shared/materials.ts` (+ lignes `reference_lists`).
3. Jamais de `material` écrasé : fill-if-empty garanti par construction (vérifier `existing.material` conservé).

**C. Images cassées / 401 console.**
1. L'URL fautive contient-elle `ik-s=` ? Non → URL construite côté client ou ligne legacy non signée : resync (le serveur signe), jamais de contournement ImageKit (restriction volontairement active).
2. `tr:*` sans `ik-s` + source `files.cdn.printful`/`storage` → ligne legacy : resync/repair du produit.

**D. Filtre vide / facette absente.**
1. Normal : une facette n'affiche que les valeurs **présentes** (couleurs/matières/styles). `SELECT DISTINCT` correspondant en DB d'abord.
2. Valeur sélectionnée sans résultat = slug stocké ≠ slug facette → normaliseur legacy (`materials.ts`, `styleLabel`).

**E. Overlay invisible mais fond assombri (drawer/modal).**
1. L'overlay est-il dans un sous-arbre `.cv-auto` (`content-visibility` = containing block des `fixed`) ? Si oui → portail vers `document.body` (pattern : tiroir filtres, popup couleurs).
2. Verrou scroll fantôme après resize : fermer l'état à la bascule de breakpoint.

**F. Génération qui "réussit" sans effet visible.**
1. Réponse du run : lire `applied`, pas `mockupsGenerated` ; lister `unmatched*`.
2. Jobs : statuts en DB/UI ; file sans worker = rien ne se passe (pas de cron : déclenchement manuel obligatoire).
3. Broderie : `technique` non envoyée au générateur — suspect structurel connu, à instrumenter avant de conclure.

---

## 5. Rituel d'intervention (chaque fois)

1. `npx tsc --noEmit` → 0. `node --import tsx --test tests/*.test.ts` → verts.
2. `npm run build` → OK (prerender 16 HTML). Commit : fichiers concernés uniquement, message `contexte: ...` + `Verif : ...`.
3. **Deploy edge** si `supabase/` touché + attente propagation ; **rebuild + restart preview + fenêtre privée** si `src/` touché.
4. Preuve live (message 3 compteurs / alerte `applied` / requête SQL) **avant** de déclarer résolu.
5. Jamais deux changements de nature différente sans mesure entre eux (données vs code vs infra : une seule variable à la fois).

---

## 6. État connu au moment de la rédaction (à mettre à jour après chaque chantier)

- Studio + tests neutralisés (commentés) ; sparkles = chemin unique de génération.
- Pas de cron (queue manuelle) ; pas de `technique` envoyée (broderie à risque).
- `tags[]` semés vides, jamais remplis (signal merch endormi, hors périmètre).
- Sitemap : 50 000 URLs max — au-delà, passer à un index (non implémenté).
- Poids perf homepage sous throttle connus (Lighthouse) : ne pas conclure sur un run unique ou navigateur utilisé pendant la mesure (médiane de 3 runs propres).
