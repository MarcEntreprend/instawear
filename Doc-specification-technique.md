---

# Spécification technique de la base de données  
**Plateforme e‑commerce de vêtements (POD, affiliation)**  
Document de référence pour la conception et l’implémentation de la base de données  

---

## 1. Introduction

Ce document décrit de manière exhaustive le modèle de données et les règles de gestion nécessaires au fonctionnement d’une boutique en ligne de vêtements en print‑on‑demand / affiliation. Il couvre :

- L’intégralité des propriétés des produits,
- Les entités liées (clients, paniers, commandes, favoris, promotions, intégrations externes),
- Les états, calculs et affichages (badges, statuts),
- Les besoins de filtrage, recherche et administration.

La structure est pensée pour être directement utilisable par un administrateur de base de données.

---

## 2. Entités et attributs

### 2.1 Produit

L’entité centrale du catalogue. Tous les champs sont détaillés ci-dessous.

| Attribut            | Type                     | Obligatoire                          | Description / Usage                                                                                                                                                                                      |
| ------------------- | ------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                | `string` (uuid)          | **Oui**                              | Identifiant unique généré automatiquement.                                                                                                                                                               |
| `isActive`          | `boolean`                | **Oui** (défaut : `true`)            | Visibilité du produit sur le storefront (`true` = en ligne, `false` = masqué).                                                                                                                           |
| `title`             | `string`                 | **Oui**                              | Titre affiché sur les cartes et la fiche produit.                                                                                                                                                        |
| `brand`             | `string`                 | **Oui**                              | Marque (ex. `"INSTAWEAR"`). Peut être une valeur libre ; une gestion de marques distincte est envisageable.                                                                                              |
| `description`       | `string`                 | **Oui**                              | Description courte utilisée comme fallback si `fullDescription` est vide.                                                                                                                                |
| `fullDescription`   | `string` (markdown/html) | Non                                  | Description longue riche (bullet points, mise en forme).                                                                                                                                                 |
| `image`             | `string` (URL)           | **Oui**                              | URL de l’image principale du produit.                                                                                                                                                                    |
| `gallery`           | `string[]` (URLs)        | Non                                  | Images supplémentaires (miniatures et galerie modale).                                                                                                                                                   |
| `mockupPreset`      | `string`                 | Non                                  | Clé symbolique faisant référence à un preset de mockup (ex. `"tshirt-black-front"`). La correspondance entre la clé et l’URL réelle est assurée par une table de référence ou une constante applicative. |
| `price`             | `number` (décimal)       | **Oui**                              | Prix de vente actuel.                                                                                                                                                                                    |
| `originalPrice`     | `number` (décimal)       | Non                                  | Prix barré pour afficher une réduction.                                                                                                                                                                  |
| `inStock`           | `boolean`                | **Oui** (défaut : `true`)            | `false` = badge « Sur commande ».                                                                                                                                                                        |
| `stockQuantity`     | `number` (entier)        | Non                                  | Quantité disponible (prévu pour évolution future).                                                                                                                                                       |
| `colors`            | `string[]` (hex)         | **Oui**                              | Codes hexadécimaux des couleurs disponibles (ex. `["#000000","#FFFFFF"]`).                                                                                                                               |
| `colorNames`        | `string[]`               | Non                                  | Noms lisibles correspondant aux couleurs (ex. `["Noir Intense","Blanc"]`). **Doit avoir la même longueur que `colors`.**                                                                                 |
| `sizes`             | `string[]`               | **Oui**                              | Tailles disponibles. Les valeurs doivent appartenir à une liste fermée : `"XS"`, `"S"`, `"M"`, `"L"`, `"XL"`, `"XXL"`.                                                                                   |
| `sizeSurcharge`     | `object` (map)           | Non                                  | Supplément de prix par taille, ex. `{ "XXL": 2.00 }`. **Les clés doivent impérativement être présentes dans `sizes`.**                                                                                   |
| `sizeGuide`         | `object` (JSON)          | Non                                  | Dimensions par taille. Actuellement géré par une constante externe (`SIZE_GUIDE`), pouvant être stocké ici pour des guides spécifiques.                                                                  |
| `category`          | `string`                 | **Oui**                              | Catégorie principale (valeurs : `"tshirt"`, `"hoodie"`, `"accessory"`, `"mug"`).                                                                                                                         |
| `eventType`         | `string`                 | **Oui**                              | Type d’événement associé : `"live"`, `"sport"`, `"culture"`, `"saisonnier"`.                                                                                                                             |
| `style`             | `string`                 | **Oui**                              | Style du produit : `"cute"`, `"street"`, `"commute"`, `"cozy"`, `"retro"`.                                                                                                                               |
| `material`          | `string`                 | Non                                  | Matériau principal (extensible) : `"coton-bio"`, `"polyester-recycle"`, `"ceramique"`, etc.                                                                                                              |
| `tags`              | `string[]`               | **Oui**                              | Mots‑clés libres utilisés pour la recherche et le filtrage.                                                                                                                                              |
| `isBestSeller`      | `boolean`                | Non (défaut : `false`)               | Affiche le badge « ★ Best seller ».                                                                                                                                                                      |
| `isLimitedTime`     | `boolean`                | Non (défaut : `false`)               | Affiche le badge « Offre limitée » (compte à rebours pouvant être global si aucun deal produit n’est actif).                                                                                             |
| `dealActive`        | `boolean`                | Non (défaut : `false`)               | Active une promotion temporaire individuelle sur ce produit.                                                                                                                                             |
| `dealEndsAt`        | `datetime`               | Non (obligatoire si `dealActive`)    | Date et heure de fin de la promotion (utilisée pour le compte à rebours).                                                                                                                                |
| `dealPrice`         | `number` (décimal)       | Non                                  | Prix spécial pendant la durée du deal. Si non renseigné, `price` s’applique.                                                                                                                             |
| `affiliateMode`     | `boolean`                | Non (défaut : `false`)               | Si `true`, le bouton d’action devient « Voir l’offre » et redirige vers `affiliateUrl`.                                                                                                                  |
| `affiliateUrl`      | `string` (URL)           | Non (obligatoire si `affiliateMode`) | Lien externe d’affiliation.                                                                                                                                                                              |
| `externalProductId` | `string`                 | Non                                  | Identifiant du produit chez le service de Print On Demand (si connecté).                                                                                                                                 |
| `externalVariantId` | `string`                 | Non                                  | Identifiant du variant Print On Demand associé (pour la synchronisation).                                                                                                                                |
| `lastExternalSync`  | `datetime`               | Non                                  | Date de la dernière synchronisation réussie avec le service de Print On Demand.                                                                                                                          |

**Notes calculées / dynamiques** (non stockées) :

- **`discount`** : pourcentage de réduction `((originalPrice - price) / originalPrice) * 100`, affiché seulement si `originalPrice` est renseigné et supérieur à `price`.
- **Badge « LIVE »** : automatique si `eventType === "live"`, avec pastille animée.
- **Badge « Sur commande »** : si `inStock === false`.
- **Badge « -X% »** : si `originalPrice` défini (valeur calculée).
- **Badge « Offre limitée »** : si `isLimitedTime === true` ou `dealActive === true` (dans ce cas le minuteur provient de `dealEndsAt`, sinon un compte à rebours global peut être utilisé).

---

### 2.2 Client

| Attribut           | Type            | Obligatoire | Description                                                          |
| ------------------ | --------------- | ----------- | -------------------------------------------------------------------- |
| `id`               | `string` (uuid) | **Oui**     | Identifiant unique.                                                  |
| `email`            | `string`        | **Oui**     | Adresse email (utilisée comme login).                                |
| `name`             | `string`        | Non         | Nom complet ou prénom.                                               |
| `passwordHash`     | `string`        | **Oui**     | Hash du mot de passe (algorithme recommandé : `bcrypt` ou `argon2`). |
| `registrationDate` | `datetime`      | **Oui**     | Date de création du compte.                                          |
| `lastLoginDate`    | `datetime`      | Non         | Dernière connexion enregistrée.                                      |

---

### 2.3 Favori (wishlist)

| Attribut    | Type            | Obligatoire | Description              |
| ----------- | --------------- | ----------- | ------------------------ |
| `id`        | `string` (uuid) | **Oui**     | Identifiant de l’entrée. |
| `clientId`  | `string`        | **Oui**     | Référence au client.     |
| `productId` | `string`        | **Oui**     | Référence au produit.    |
| `createdAt` | `datetime`      | **Oui**     | Date d’ajout du favori.  |

**Contrainte** : unicité (`clientId`, `productId`).

---

### 2.4 Panier (CartItem)

Le panier est persistant côté serveur pour permettre la consultation par l’administration.

| Attribut        | Type              | Obligatoire     | Description                                                  |
| --------------- | ----------------- | --------------- | ------------------------------------------------------------ |
| `id`            | `string` (uuid)   | **Oui**         | Identifiant de la ligne de panier.                           |
| `clientId`      | `string`          | **Oui**         | Client propriétaire du panier.                               |
| `productId`     | `string`          | **Oui**         | Produit ajouté.                                              |
| `selectedColor` | `string`          | **Oui**         | Code couleur choisi (doit appartenir à `colors` du produit). |
| `selectedSize`  | `string`          | **Oui**         | Taille choisie (doit appartenir à `sizes` du produit).       |
| `quantity`      | `number` (entier) | **Oui** (min 1) | Quantité.                                                    |
| `addedAt`       | `datetime`        | **Oui**         | Date d’ajout au panier.                                      |

---

### 2.5 Commande

| Attribut          | Type               | Obligatoire               | Description                                                                                  |
| ----------------- | ------------------ | ------------------------- | -------------------------------------------------------------------------------------------- |
| `id`              | `string` (uuid)    | **Oui**                   | Numéro de commande unique.                                                                   |
| `clientId`        | `string`           | **Oui**                   | Client ayant passé la commande.                                                              |
| `createdAt`       | `datetime`         | **Oui**                   | Date de création de la commande.                                                             |
| `status`          | `enum`             | **Oui**                   | État : `"pending"`, `"in_production"`, `"shipped"`, `"delivered"` (plus tard `"cancelled"`). |
| `totalAmount`     | `number` (décimal) | **Oui**                   | Montant total (somme des lignes, frais de port inclus le cas échéant).                       |
| `shippingCost`    | `number` (décimal) | **Oui**                   | Frais de port appliqués à cette commande.                                                    |
| `shippingAddress` | `object` (JSON)    | **Oui** (sauf si retrait) | Adresse de livraison : `{ fullName, address, city, zip, country, phone }`.                   |
| `externalOrderId` | `string`           | Non                       | Identifiant de la commande correspondante chez le service de Print On Demand.                |
| `notes`           | `string`           | Non                       | Notes internes ou instructions du client.                                                    |

---

### 2.6 Ligne de commande (OrderItem)

| Attribut        | Type               | Obligatoire | Description                                                                                                                   |
| --------------- | ------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`            | `string` (uuid)    | **Oui**     | Identifiant de ligne.                                                                                                         |
| `orderId`       | `string`           | **Oui**     | Commande parente.                                                                                                             |
| `productId`     | `string`           | **Oui**     | Produit commandé.                                                                                                             |
| `selectedColor` | `string`           | **Oui**     | Couleur choisie.                                                                                                              |
| `selectedSize`  | `string`           | **Oui**     | Taille choisie.                                                                                                               |
| `quantity`      | `number` (entier)  | **Oui**     | Quantité.                                                                                                                     |
| `unitPrice`     | `number` (décimal) | **Oui**     | Prix unitaire effectif au moment de la commande (tenant compte du prix courant, du deal éventuel, et de la surcharge taille). |

---

### 2.7 Connexion au service de Print On Demand (paramètres API)

| Attribut      | Type            | Obligatoire | Description                                  |
| ------------- | --------------- | ----------- | -------------------------------------------- |
| `id`          | `string` (uuid) | **Oui**     | Identifiant.                                 |
| `apiKey`      | `string`        | **Oui**     | Clé API du service de Print On Demand.       |
| `storeId`     | `string`        | Non         | Identifiant du store chez le prestataire.    |
| `isConnected` | `boolean`       | **Oui**     | État de la connexion.                        |
| `lastSyncAt`  | `datetime`      | Non         | Date de la dernière synchronisation globale. |

---

### 2.8 Journal de synchronisation du service de Print On Demand

| Attribut    | Type                  | Obligatoire | Description                                   |
| ----------- | --------------------- | ----------- | --------------------------------------------- |
| `id`        | `string` (uuid)       | **Oui**     | Identifiant.                                  |
| `syncDate`  | `datetime`            | **Oui**     | Horodatage de la synchronisation.             |
| `status`    | `enum`                | **Oui**     | `"success"`, `"partial"`, `"error"`.          |
| `message`   | `string`              | Non         | Détail de l’opération ou message d’erreur.    |
| `productId` | `string`              | Non         | Produit concerné (si synchro individuelle).   |
| `duration`  | `number` (entier, ms) | Non         | Durée de la synchronisation en millisecondes. |

---

### 2.9 Utilisateur administrateur

| Attribut       | Type            | Obligatoire | Description                                                          |
| -------------- | --------------- | ----------- | -------------------------------------------------------------------- |
| `id`           | `string` (uuid) | **Oui**     | Identifiant.                                                         |
| `email`        | `string`        | **Oui**     | Email de connexion.                                                  |
| `passwordHash` | `string`        | **Oui**     | Hash du mot de passe (algorithme recommandé : `bcrypt` ou `argon2`). |
| `role`         | `enum`          | **Oui**     | `"super_admin"` ou `"editor"`.                                       |
| `createdAt`    | `datetime`      | **Oui**     | Date de création du compte.                                          |

---

### 2.10 Paramètres généraux de la boutique

Stockés sous forme de clé‑valeur ou dans une table de configuration.

| Clé                     | Type       | Valeur par défaut | Description                                                                                      |
| ----------------------- | ---------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| `storeName`             | `string`   | `"Ma Boutique"`   | Nom de la boutique.                                                                              |
| `currency`              | `string`   | `"EUR"`           | Devise (code ISO).                                                                               |
| `country`               | `string`   | `"FR"`            | Pays de base.                                                                                    |
| `freeShippingThreshold` | `number`   | `35`              | Seuil (en devise) pour la livraison gratuite.                                                    |
| `shippingCost`          | `number`   | `4.99`            | Frais de port forfaitaires appliqués lorsque le seuil de gratuité n’est pas atteint.             |
| `shippingDelay`         | `string`   | `"5-7 jours"`     | Délai de livraison estimé affiché.                                                               |
| `globalCountdownEnd`    | `datetime` | `null`            | Date de fin d’un compte à rebours global pour les produits `isLimitedTime` sans deal individuel. |

---

## 3. Relations entre entités

- **Produit → Favori** : un produit peut être aimé par plusieurs clients.
- **Client → Favori** : un client peut aimer plusieurs produits.
- **Client → Panier** : un client possède un seul panier actif, constitué de plusieurs `CartItem`. **Lorsqu’une commande est validée, les lignes de panier correspondantes sont supprimées (ou marquées comme converties) afin de vider le panier.**
- **Client → Commande** : un client peut passer plusieurs commandes.
- **Commande → Ligne de commande** : une commande contient plusieurs lignes.
- **Produit → Ligne de commande** : un produit peut apparaître dans plusieurs lignes.
- **Produit → service de Print On Demand** : un produit peut être lié à un variant chez le prestataire (id externe).
- **Connexion au service de Print On Demand** : une seule configuration active.

---

## 4. Règles de gestion, calculs et affichage

### 4.1 Calcul des prix dans le panier et la commande

- Le prix unitaire final est `price` (ou `dealPrice` si un deal actif est en cours et que `dealEndsAt` n’est pas dépassée).
- On y ajoute la surcharge de taille `sizeSurcharge[size]` si définie.
- Les taxes ne sont pas gérées pour le moment.
- La livraison est gratuite si le sous‑total est ≥ `freeShippingThreshold`. Sinon, les frais forfaitaires définis dans le paramètre `shippingCost` (par défaut 4,99 $) s’appliquent.

### 4.2 Gestion des deals

- Un deal produit est actif si `dealActive === true` et que `dealEndsAt` est dans le futur.
- Le prix affiché est `dealPrice` (ou `price` s’il n’est pas renseigné) tant que le deal est valide.
- Le badge « Offre limitée » et le compte à rebours sont déduits de `dealEndsAt`.
- Si `isLimitedTime === true` et aucun deal produit actif, un compte à rebours global `globalCountdownEnd` peut être utilisé pour tous les produits concernés.

### 4.3 Badges et pastilles

| Condition                                         | Badge / Effet                              |
| ------------------------------------------------- | ------------------------------------------ |
| `originalPrice` défini et > `price`               | Badge « -X% » avec la valeur calculée      |
| `isBestSeller === true`                           | Badge « ★ Best seller »                    |
| `eventType === "live"`                            | Badge « ★ LIVE 2026 » avec pastille animée |
| `inStock === false`                               | Badge « Sur commande »                     |
| `isLimitedTime === true` ou `dealActive === true` | Badge « Offre limitée » + minuteur         |

### 4.4 Statuts des commandes

| Statut              | Description                                                                       |
| ------------------- | --------------------------------------------------------------------------------- |
| `pending`           | Commande reçue, en attente de traitement.                                         |
| `in_production`     | En cours de production (envoyée à Printful ou autre service de Print On Demande). |
| `shipped`           | Expédiée, suivi disponible.                                                       |
| `delivered`         | Livrée au client.                                                                 |
| (futur) `cancelled` | Commande annulée.                                                                 |

### 4.5 Cycle de vie du panier

- Un client ne peut avoir qu’un seul panier actif à la fois.
- À la validation d’une commande, tous les `CartItem` du client sont supprimés.  
  _(Une évolution future pourra marquer les lignes avec un statut `converted` si l’on souhaite conserver un historique des paniers convertis.)_
- Le panier est automatiquement vidé, permettant au client de démarrer une nouvelle session d’achat.

---

## 5. Filtres et recherche (côté storefront)

Les critères suivants doivent pouvoir être appliqués aux requêtes de produits :

| Critère             | Source                 | Champ(s) cible                                   |
| ------------------- | ---------------------- | ------------------------------------------------ |
| Recherche texte     | `searchTerm`           | `title`, `brand`, `tags`, `style`, `description` |
| Catégorie           | `selectedCategory`     | `category`                                       |
| Type d’événement    | `selectedEventType`    | `eventType`                                      |
| Style               | (ajout possible)       | `style`                                          |
| Matériau            | `materialFilter`       | `material`                                       |
| Prix min / max      | `priceMin`, `priceMax` | `price` (ou `dealPrice` si deal actif)           |
| En stock uniquement | `inStockOnly`          | `inStock` = `true`                               |
| Taille              | (filtre par taille)    | `sizes` (contient la taille)                     |
| Couleur             | (filtre par couleur)   | `colors` (contient la couleur)                   |

---

## 6. Interface d’administration – besoins de données

L’admin manipule directement les entités ci-dessus. Les besoins fonctionnels sont :

- **Dashboard** : calculs d’agrégats (`COUNT`, `SUM`) sur produits, clients, commandes.
- **Liste produits** : filtres identiques à ceux du storefront, plus `isActive`, `isBestSeller`, `dealActive`, etc.
- **Formulaire produit** : édition complète de tous les attributs listés en §2.1.
- **Clients** : consultation des favoris, panier en cours (jointure avec `CartItem`), historique de commandes.
- **Commandes** : tri par date, filtre par statut, détail des lignes.
- **Synchronisation API pour la Print On Demande, avec Printful ou autre service de Print On Demande** : lecture/écriture du journal, activation/désactivation.

---

## 7. Évolutions futures et anticipations

- **Gestion avancée des variantes** : remplacer les tableaux `colors`/`sizes` par une table de variantes avec stock, prix et SKU par combinaison.
- **Tunnel de commande réel** : intégration WhatsApp/Telegram/Email pour la confirmation.
- **Rôles utilisateurs avancés** : permissions granulaires.
- **Mode affiliation avancé** : statistiques de clics et conversions.

---

## 8. Conclusion

Ce document rassemble des propriétés, relations et règles métier nécessaires à la création d’une base de données robuste pour la plateforme. Chaque attribut a été spécifié avec son type, son caractère obligatoire et son usage
