# Optimisation des images WebP avec ImageKit

Les images Printful sont servies en WebP via ImageKit (mode fetch + transformations),
sans toucher aux originaux : l'URL ImageKit embarque l'URL source encodée (réversible).

## Architecture réelle (vérifiée)

1. **Côté serveur (edge `sync-printful`)** — `get-product` convertit AVANT stockage :
   `thumbnail_url`, `color_images`, images variantes catalogue, mockups galerie
   (WebP q80). `files[]` d'impression ne sont JAMAIS touchés (Printful exige
   les originaux). Réponse enrichie : `imagekit_enabled` (traçabilité admin).
   La matrice variantes (`buildVariantMatrix`, aussi utilisée par sync/resync)
   convertit `image` + `mockup_image` de chaque couleur.
2. **À l'import (formulaire admin)** — `PrintfulProductForm` stocke ce que l'edge
   renvoie ; ses appels `imageKitUrl` restants sont idempotents (no-op si déjà
   ImageKit) et servent de filet si l'edge n'est pas configuré.
3. **Au rendu (optionnel)** — `WebpImage` / `OptimizedImage` /
   `useResponsiveImageUrl` convertissent à la volée (même helper, mêmes règles).
   `ProductPage` / `StoreProductCard` utilisent encore des `<img>` directs :
   ils bénéficient du WebP dès que la DB contient des URLs ImageKit.
4. **Vérification** : après import, `products.image` / `gallery` / variantes
   commencent par `https://ik.imagekit.io/<id>/tr:q-80,f-webp/...`.
   Sans endpoint configuré, les originales sont conservées (jamais d'image cassée).

## Configuration

### Frontend (`.env`, préfixe `VITE_` obligatoire)

```env
VITE_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<votre-id>
```

### Edge (secrets Supabase, pas de préfixe)

```bash
npx supabase secrets set IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<votre-id>
npx supabase secrets set IMAGEKIT_PRIVATE_KEY=<votre-clé-privée>
```

La clé privée ne sert QU'à signer les URLs (HMAC-SHA1, schéma doc officielle,
`?ik-s=` + `?ik-t=` optionnel). Sans expiry par défaut (URLs stockées
permanentes). Sans clé : URLs non signées (401 si restriction active).
Signées une seule fois (jamais de double signature) ; `get-product`, sync et
mockups signent avant écriture/réponse ; le formulaire affiche un avertissement
si `imagekit_signed === false`.

### Règles de sécurité (NE PAS changer sans revue)

- **AUCUNE clé (publique ou privée) côté frontend.** La transformation par URL
  n'a besoin que de l'endpoint public. La clé privée ne vit que côté ImageKit.
- Pas de téléchargement serveur (pur URL rewriting → pas de SSRF possible) ;
  whitelist par hostname exact (`files.cdn.printful.com`, hôte Supabase du
  projet) ; schémas dangereux + IPs privées rejetés ; passthrough si déjà ImageKit.
- CSP : `img-src` couvre déjà `https:` (dont `ik.imagekit.io`) — rien à ajouter.

## Fichiers

- `src/lib/imagekit.ts` + `src/config/imagekit.ts` — helper + config navigateur
  (`import.meta.env`, accès défensif node, lecture lazy pour les tests)
- `supabase/functions/sync-printful/_shared/imagekit.ts` — miroir côté edge
  (lit `IMAGEKIT_URL_ENDPOINT` Deno puis `process.env`)
- `src/components/WebpImage.tsx`, `src/components/OptimizedImage.tsx`,
  `src/hooks/useResponsiveImageUrl.ts`, `src/utils/imageConversion.ts`
- `tests/imagekit.test.ts`, `tests/sync-imagekit.test.ts` — whitelist, format,
  idempotence, mode gracieux

## Dépannage

- **URLs non converties en DB** → `VITE_IMAGEKIT_URL_ENDPOINT` absent du `.env`
  (frontend) ou secret `IMAGEKIT_URL_ENDPOINT` absent côté edge ; la réponse
  `get-product` contient `imagekit_enabled: false` dans ce cas.
- **Anciens produits (URLs originales)** → bouton admin **« Réparer »**
  (ProductsPage, visible si variantes sans tailles) : re-synchronise
  tailles/prix + images WebP + guide des tailles (`repair-product`).
- **ImageKit répond 404 sur toutes les URLs** → problème côté compte, pas côté
  code. Vérifier dans le dashboard ImageKit, dans l'ordre :
  1. l'ID d'endpoint (`https://ik.imagekit.io/<id>` — tester
     `https://ik.imagekit.io/<id>/https://upload.wikimedia.org/wikipedia/commons/a/a9/Example.jpg`
     : 200 attendu) ; 2. compte actif/vérifié ; 3. fetch distant autorisé.
- **Endpoint en panne (images cassées)** → coupe-circuit immédiat :
  `VITE_IMAGEKIT_ENABLED=false` (frontend) ; les helpers restaurent les
  originales (décodées depuis les URLs stockées). Puis bouton **Réparer**
  pour réécrire la DB en originales. Remettre `true` (ou retirer) après
  réparation côté ImageKit, puis Réparer à nouveau pour le WebP.
- **Format d'URL** : source NON encodée (doc officielle — l'encodage
  systématique donne des 404), encodée uniquement si `?`/`#`.
  `normalizeImagekitUrl` reconstruit les anciennes URLs encodées.
