# InstaWear — FEEDBACK D'UN COLLEGUE

> Il n'existe **aucune table de tracking comportemental** aujourd'hui. C'est le vrai trou à combler. Mais tu as déjà : `product_sales_stats` (ventes totales + 30 jours, par produit), `product_reviews` avec recalcul automatique de `ratings_score`/`ratings_count` par trigger, `cart_items` et `favourites` **persistés côté serveur** (pas juste du mock localStorage — un vrai signal exploitable dès aujourd'hui), et surtout l'historique complet de `order_items` : le panier "Fréquemment achetés ensemble" peut être construit **dès maintenant** à partir des vraies commandes passées, sans attendre la moindre nouvelle instrumentation.

---

## 1. Carte des sections — rôle, température d'intention, levier psychologique

| #   | Section                                | Où                 | Température\*    | Job réel                                                            | Levier psychologique                                  | Algorithme aujourd'hui                           |
| --- | -------------------------------------- | ------------------ | ---------------- | ------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| 1   | Hero Carousel                          | Home, tout en haut | Froide           | Promesse émotionnelle, 1 seul CTA                                   | Aspiration identitaire (« ça me ressemble »)          | 100% curaté admin (`hero_promotions.order`)      |
| 2   | ReassuranceBar                         | Home, sous le hero | Froide           | Désamorcer l'anxiété _avant_ de voir un prix                        | Réduction du risque perçu                             | Statique                                         |
| 3a  | Par occasion                           | Home               | Froide→Tiède     | Le visiteur se reconnaît au lieu de chercher                        | Simplicité de choix (paradoxe du choix évité)         | Statique (liste fixe)                            |
| 3b  | Nouveautés                             | Home               | Tiède            | Fraîcheur, FOMO doux                                                | Nouveauté = désirabilité                              | `created_at` desc, aucun filtrage qualité        |
| 3c  | Bandeaux promo                         | Home               | Tiède            | Respiration + preuve de valeur                                      | Ancrage de prix                                       | Statique admin                                   |
| 3d  | Offres en vedette                      | Home               | Tiède→Chaude     | Désir curaté, 2 choix max                                           | Autorité éditoriale (« la maison a choisi pour toi ») | Statique admin                                   |
| 4   | Catalogue + filtres                    | Home               | Chaude           | Le travail actif de recherche                                       | Sentiment de contrôle (autonomie)                     | Tri manuel (popularité = `boughtLastMonth` brut) |
| 5   | About                                  | Home               | Variable         | Confiance/identité — qui scrolle jusque-là a une intention montante | Cohérence de marque, « liking »                       | Statique                                         |
| 6   | Avis clients                           | Home               | Chaude           | Preuve sociale juste avant le doute final                           | Preuve sociale                                        | Statique (4 avis fixes)                          |
| 7   | FAQ                                    | Home               | Chaude           | Tuer les dernières objections                                       | Levée de friction cognitive                           | Statique                                         |
| —   | **Fiche produit**                      | —                  | **Très chaude**  | Voir détail ci-dessous                                              | —                                                     | —                                                |
| —   | Header : suggestions de recherche      | Partout            | Variable         | Réduire le temps entre intention et résultat                        | Effort perçu minimal                                  | Fuzzy match statique                             |
| —   | Compte : Favoris / Récemment consultés | Post-connexion     | Chaude, différée | Faire revenir                                                       | Investissement (modèle Hooked)                        | Liste brute, pas de scoring                      |

\*Température = à quel point la personne est proche de l'acte d'achat à ce moment précis. C'est la variable qui doit piloter **combien** de curation algorithmique vs humaine chaque section mérite — plus c'est chaud, plus une erreur de placement coûte cher.

### Logique de la fiche produit

C'est l'endroit à plus forte densité de leviers, parce que la personne a déjà dit "je m'intéresse à _cet_ objet précis". Trois zones distinctes, trois jobs différents :

1. **Colonne prix/achat (droite)** — zéro exploration, tout est fait pour réduire la friction jusqu'au clic : stock visible, urgence honnête (`stockQuantity ≤ 10`), réassurance livraison. Aucune place pour de la découverte ici — c'est le moment de conversion, pas de merchandising.
2. **"Souvent achetés ensemble"** — panier immédiat, complémentarité fonctionnelle (tee + casquette du même drop), pas de la découverte, de la **complétion**. Le principe Cialdini en jeu ici est l'engagement/cohérence : « puisque j'achète déjà pour cet événement, autant compléter la tenue ».
3. **"Vous aimerez aussi"** — c'est la seule zone de la fiche produit où la découverte est légitime, parce que l'intention est déjà validée (on ne détourne pas quelqu'un d'un achat en cours, on lui montre l'alternative _après_ qu'il ait vu ce qu'il voulait).

**Principe général qui découle de ce tableau** : un produit mal placé perd de la valeur non pas parce que "l'algorithme est mauvais", mais parce que **la température de la section et le job du produit ne correspondent pas**. Mettre un produit qu'on veut faire découvrir (fraîcheur) dans une section chaude (FBT) tue sa conversion — les gens en zone chaude n'ont pas envie d'être surpris, ils veulent qu'on confirme leur choix. Mettre un best-seller ultra-connu en zone froide (hero) gaspille l'attention la plus précieuse du site sur quelqu'un qui l'aurait trouvé de toute façon.

---

## 2. Carte des items — ce qui existe réellement

**Taxonomie** (dynamique via `reference_lists`, donc évolutive sans déploiement) :

- `category` — ex. t-shirts, hoodies, accessories, mugs, _et ce qui viendra_
- `event_type` — ex. les archétypes génériques (festival, sport, concert…) **et** des occasions calendaires nommées et réelles (Champions League, Rio Carnival, Oktoberfest, Halloween)
- `style`, `material`, `tags[]` — signaux secondaires de similarité fine

**États déjà en base, exploitables** :

| Champ                                                        | Usage merchandising immédiat                                                                                                                                                                  |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bought_last_month`, `total_bought` (`product_sales_stats`)  | Signal de popularité déjà calculé, pas besoin de le recalculer soi-même                                                                                                                       |
| `ratings_score` / `ratings_count` (trigger auto)             | Preuve sociale fiable — mais attention à la **taille d'échantillon** (voir §5, ajustement bayésien)                                                                                           |
| `deal_active` / `deal_price` / `deal_ends_at`                | Urgence honnête (countdown réel, pas fake)                                                                                                                                                    |
| `is_best_seller`, `is_limited_time`                          | Badges déjà pilotables par l'admin, sans algorithme                                                                                                                                           |
| `stock_quantity`, `in_stock`, `variant_availability` (jsonb) | Filtre dur obligatoire partout + urgence de rareté quand bas                                                                                                                                  |
| `show_ratings`, `show_bought` (booléens par produit)         | **L'admin peut déjà masquer la preuve sociale produit par produit** — un nouveau produit sans avis n'affiche pas "0 avis" moche. L'algorithme doit respecter ces flags, jamais les contourner |
| `affiliate_mode` / `affiliate_url`                           | Cas particulier à exclure des logiques de stock/urgence (pas de vrai stock côté affilié) et à traiter à part dans les upsells                                                                 |
| `store_settings.global_countdown_end`                        | Champ existant, **inutilisé partout dans le frontend actuel** — opportunité d'un bandeau d'urgence sitewide honnête (vente flash de saison)                                                   |

**Paniers naturels** — plutôt que de coder en dur "tee + casquette", je recommande de les **déduire des vraies commandes** (`order_items` groupées par `order_id`) : c'est plus vrai, ça s'adapte automatiquement quand de nouvelles catégories arrivent, et ça ne demande aucune maintenance manuelle. Le fallback pour les produits neufs sans historique : complémentarité par `category` différente + même `event_type` (règle métier simple, temporaire, jusqu'à ce que les vraies données prennent le relais).

---

## 3. Audit des leviers psychologiques — déjà là vs manquants

**Déjà en place (à noter) :**

- Preuve sociale : notes, avis vérifiés, `boughtLastMonth`
- Rareté honnête : badge stock bas, countdown de deal réel
- Réciprocité douce : réassurance avant le prix
- Investissement (modèle Hooked) : statut membre/palier de fidélité, "racheter" en 1 clic
- Réduction de friction : panier persistant, adresses enregistrées, paiement pré-rempli

**Manquants, classés par effort/impact :**

| Manque                                                                                 | Effort | Impact                          | Principe                                                                                             |
| -------------------------------------------------------------------------------------- | ------ | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Aucune section "Pour vous" fondée sur un vrai comportement (pas juste favoris)         | Moyen  | Élevé                           | Personnalisation = pertinence perçue                                                                 |
| Countdown sitewide (`global_countdown_end`) jamais affiché                             | Faible | Moyen                           | Rareté temporelle légitime, déjà en base                                                             |
| Pas de relance panier abandonné / navigation abandonnée                                | Moyen  | Élevé                           | Réciprocité + rappel (le levier n°1 chez Amazon/AliExpress)                                          |
| Pas d'upsell post-achat (page de confirmation)                                         | Faible | Moyen                           | Le moment où la friction de paiement est déjà tombée — le meilleur moment pour proposer, pas le pire |
| Notes affichées sans ajustement pour petit échantillon                                 | Faible | Moyen (évite un biais trompeur) | Crédibilité de la preuve sociale                                                                     |
| Aucune diversité anti-répétition (le même produit peut apparaître 3 fois sur une page) | Faible | Moyen                           | Fatigue bannière / lassitude                                                                         |

## BEING SOFT OR AGGRESSIve ?

Est-ce que tu veux des leviers agressifs : comptes à rebours (truqués ou pas), stock limité, notifications "X personnes regardent ça" ( vérifiées ou non) ?
**tout ce qui suit n'est pas encore aggressif**: C'est aussi ce qui différencie une vraie rétention long terme d'un pic de conversion suivi d'une perte de confiance. si tu veux tu peux penser a ce qui est aggressif qui fait booster les ventes. ça marche aussi.

---

## 4. La table de capteurs — une seule table, pensée pour ne jamais ralentir le site

Principe directeur : **écriture asynchrone, jamais sur le chemin critique du rendu**, et **lecture algorithmique jamais en direct sur la table brute** — toujours sur des vues agrégées recalculées périodiquement, pas à chaque pageview.

```
engagement_events
├── id                uuid
├── session_id        text        -- anonyme, stable côté client
├── customer_id       text null   -- rempli si connecté
├── event_type        text        -- 'section_impression' | 'product_click' | 'search'
│                                     | 'filter_applied' | 'add_to_cart' | 'favourite'
├── entity_type       text        -- 'product' | 'category' | 'event_type' | 'section'
├── entity_id         text
├── context           jsonb       -- { section, position, query_text, device }
└── created_at        timestamptz
```

Points de conception qui répondent directement à ta contrainte de perf :

- **Écriture** : `insert` fire-and-forget côté client (RLS : `anon`/`authenticated` peuvent insérer, personne ne peut lire sauf `is_admin()` ou via des vues agrégées) — aucune attente de réponse ne bloque l'UI.
- **Le hover est le piège classique** : ne jamais logger chaque `mouseenter`. On échantillonne (1 sur N) et/ou on exige un délai de survol (>600ms) pour filtrer le bruit — sinon la table explose en volume pour un signal marginal.
- **Rétention** : événements bruts conservés ~90 jours, puis purgés après agrégation — la table brute ne doit jamais devenir la source de lecture en production.
- **Vues dérivées, recalculées par cron (pas en direct)** :
  - `product_affinity_pairs` — matrice de co-vue/co-achat, alimente FBT et "Vous aimerez aussi"
  - `product_engagement_daily` — vues, clics, taux de conversion par produit et par jour
  - `search_terms_trending` — alimente les suggestions de recherche
- **Vie privée** : ce tracking est de la mesure d'audience, donc soumis au consentement cookies déjà construit — si le visiteur a refusé, on garde uniquement le strict nécessaire (panier, session), pas les événements analytiques.

---

## 5. Le moteur de scoring — un seul cœur, des poids différents par section

**Signaux normalisés (0 à 1 chacun)**, calculés dans les vues agrégées, jamais en direct :

| Signal                | Calcul                                                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Popularité            | `bought_last_month` / max de la catégorie                                                                                                 |
| Fraîcheur             | décroissance exponentielle depuis `created_at`                                                                                            |
| Qualité perçue        | note **ajustée bayésien** (une note 5★ sur 2 avis pèse moins qu'une 4.6★ sur 200 avis — sinon un produit neuf avec 1 avis 5★ écrase tout) |
| Affinité personnelle  | recouvrement entre l'historique de session/compte et la `category`/`event_type` du produit                                                |
| Co-occurrence         | force du lien dans `product_affinity_pairs` (spécifique à FBT)                                                                            |
| Urgence de rareté     | boost léger si stock bas, **jamais** si `in_stock = false` (exclusion dure, pas un malus)                                                 |
| Proximité d'événement | si l'`event_type` a une date associée (voir suggestion ci-dessous), boost croissant à l'approche, chute nette après                       |
| Anti-répétition       | pénalité si le produit a déjà été vu 3+ fois sans clic, ou déjà affiché ailleurs sur la même page                                         |

**Poids par section** (le même moteur, des curseurs différents — exactement le "un moteur, des poids par section" que tu visais) :

| Section                      | Popularité                   | Fraîcheur     | Qualité | Affinité perso | Co-occurrence | Urgence | Événement | Décision humaine                              |
| ---------------------------- | ---------------------------- | ------------- | ------- | -------------- | ------------- | ------- | --------- | --------------------------------------------- |
| Fréquemment achetés ensemble | faible                       | —             | —       | —              | **dominant**  | —       | —         | fallback règle métier si pas de données       |
| Récemment consultés          | —                            | **pur ordre** | —       | —              | —             | —       | —         | dédup + exclusion rupture de stock            |
| Vous aimerez aussi           | moyen                        | faible        | moyen   | **fort**       | moyen         | —       | moyen     | diversité forcée (pas 2x la même catégorie)   |
| Nouveautés                   | faible (garde-fou anti-flop) | **dominant**  | —       | —              | —             | —       | —         | —                                             |
| Offres en vedette / Hero     | —                            | —             | —       | —              | —             | —       | —         | **100% humain, assisté par un top 5 suggéré** |
| Suggestions de recherche     | moyen                        | —             | —       | léger          | —             | —       | —         | exact match toujours prioritaire              |

Le choix le plus important de tout ce plan, et je le dis explicitement parce que c'est un choix de professionnel plutôt qu'un réflexe technique : **la section "Offres en vedette" / Hero reste pilotée par un humain.** C'est le bien immobilier le plus visible du site — c'est là que la marque raconte une histoire, lance un drop, réagit à l'actualité (un carton InstaWear au moment d'un vrai match de Champions League, par exemple). Aucun algorithme ne doit avoir le dernier mot là-dessus ; il peut au mieux _suggérer_ un top 5 basé sur les données pour aider l'admin à décider plus vite, jamais décider à sa place.

---

## 6. Autres considérations

- **Cold start** : au lancement, aucune donnée de comportement n'existe encore. Ordre de repli : curation admin → `bought_last_month` global → aléatoire pondéré par catégorie. L'algorithme ne doit jamais planter ou afficher du vide faute de données — toujours un filet de sécurité.
- **Gouvernance admin** : à terme, un panneau "Merchandising" dans l'admin avec des curseurs de poids par section (pas du code à modifier) — c'est la finalité que tu visais, et cette cartographie est exactement ce qu'il faut pour la spécifier proprement.
- **Rollout en 3 phases**, pour ne jamais parier le site sur un algorithme non testé :
  1. **Instrumentation silencieuse** — on branche `engagement_events`, on collecte, aucun changement visible.
  2. **Lecture passive en parallèle** — l'algorithme tourne et log ses résultats sans les afficher, comparaison avec l'ordre actuel.
  3. **Bascule progressive**, section par section, en commençant par les moins risquées (Récemment consultés, Nouveautés) avant les plus sensibles (FBT, Vous aimerez aussi).
- **Suggestion de schéma bonus** : ajouter une date associée aux entrées `event_type` dans `reference_lists` (ou une table `event_calendar` séparée) pour activer réellement le signal "proximité d'événement" — sans ça, "Champions League" et "festival" sont traités pareil alors que l'un a une vraie date de pic.

---

C'est mon plan de réflexion. Par où tu veux commencer concrètement ?

- **la table `engagement_events` + le calcul FBT à partir des vraies commandes existantes** ? parce que c'est la seule brique qui débloque tout le reste,
- et une bonne partie (FBT) peut tourner sur des données réelles dès aujourd'hui, sans attendre le moindre nouveau tracking.
