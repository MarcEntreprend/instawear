# HSVVE → InstaWear — plan d'intégration du studio « pro »

Source : `Hero-Studio-Versatile-Engine-02.html` (mockup, 02 remplace v1 sans
perte fonctionnelle — diff vérifiée). Cible : `style-15-b` (Hero Studio lots
1–5 déjà en place). Principe : **champs additifs, migrations légères ou
nulles, chaque lot mesuré avant le suivant.**

Conventions : `tsc` + `node --import tsx --test tests/*.test.ts` + `npm run
build` verts à chaque lot. Aucun `Set-Content`/`Get-Content` sur les sources
(encodage). Pas de commit sans demande.

Disposition (décision) : l'éditeur adopte la disposition du mockup 02 —
barre haute (titre, thème studio, device, undo/redo, sauver), panneau
couches à gauche (sélection, œil, verrou, pills hide-on, badge TOP sur les
CTA), canvas central, inspecteur à droite (onglets Slide / Couche /
Bouton). Mis en place au lot 6, rempli aux lots suivants.
Périmètre : Vague 1 uniquement (« à prendre »). « À cadrer » et « À
refuser » restent hors scope jusqu'à nouvel ordre.

---

## Rappel schéma actuel (lots 1–5)

- `hero_promotions.config` (jsonb v1) : `sizing`, `background`, `layers[]`
  (`image` | `card` | `tiles` | `text` | `html`), `ctas[]` (inline ou
  positionnés %), `origin: legacy|studio`.
- `html`/`css` (super_admin, plafond 50 Ko serveur), `starts_at`/`ends_at`
  (filtre runtime), `hero_version` (polling 45 s + Deploy Hook).
- Rendu `HeroSlideView` (unifié, legacy pixel-identique), coquille
  `HeroCarousel` (lazy actif+suivant, sizing honoré), éditeur
  `HeroStudioEditor` (WYSIWYG via vraie sélection).

---

## VAGUE 1 — rapide, additif pur (6 lots, aucun risque boutique)

### Lot 6 — Undo/redo éditeur
- Fichiers : `src/admin/HeroStudioEditor.tsx` (+ hook local `useHeroHistory`).
- Pile de `config` (20 états max), boutons Annuler/Rétablir + `Ctrl+Z/Y`.
- Pur admin, zéro boutique, zéro migration.
- Tests : pile (push/cap/undo/redo/vide).
- Gate : suite 858+ verte.

### Lot 7 — Templates de slides
- Fichiers : `src/lib/heroTemplates.ts` (nouveau), éditeur (menu « Partir de…»).
- 4 templates : « Promo produit », « Annonce image », « Grille 3 tuiles »,
  « Autonome texte ». Constantes `HeroConfig` validées par
  `sanitizeHeroConfig` (test d'idempotence chacun).
- Zéro migration. Tests : chaque template passe `sanitize` inchangé.
- Gate : suite verte.

### Lot 8 — Hide-on Desktop/Mobile
- Schéma : champ `hidden: { mobile?: boolean; desktop?: boolean }` sur
  **chaque** couche (additif, défaut absent = visible partout).
- Migration : aucune (jsonb souple) — ou `20261036` documentaire si on veut
  verrouiller la forme (CHECK léger). Décision au lot : sans migration sauf
  besoin.
- Rendu : `HeroSlideView` saute les couches masquées (prop `device` :
  runtime `matchMedia` + `mobilePreview` aperçu). Aperçu studio : ghost
  30 % + pastille « Masqué sur mobile ».
- Éditeur : pills `[D][M]` par couche (maquette 02).
- Tests : sanitize conserve `hidden`, rendu conditionnel (statique + pur si
  helper `isHeroLayerHidden(layer, device)` extrait — recommandé).
- Gate : suite verte + 0 diff visuelle legacy (champ absent partout).

### Lot 9 — Typo fine
- Schéma : `lineHeight?` (0.9–2.0), `letterSpacing?` (-0.05–0.1em),
  `align?` (left/center/right/justify), `transform?`
  (none/uppercase/lowercase/capitalize), `maxWidth?` (ch/%),
  `balance?` (boolean → `text-wrap: balance`) sur couche `text`.
- Styles inline scopés, aucun JS runtime. Sanitize borne tout.
- Éditeur : section « Typographie » (sliders + selects + toggle).
- Tests : bornes sanitize + rendu statique des styles.
- Gate : suite verte.

### Lot 10 — Fonts global + lock
- Schéma : `fontFamily?` global au slide (config racine) + `font?` et
  `fontLocked?` par couche texte.
- Liste fermée : Inter, Sora, Instrument Serif, General Sans, Space Grotesk,
  JetBrains Mono (+ Import URL : voir lot 12). Chargement Google Fonts
  `display=swap`, `<link>` unique côté boutique (dédupliqué, `preconnect`).
- Règle : bloc `fontLocked` ignore le global ; badge 🔒 dans l'éditeur.
- Rendu : `font-family` inline (+ fallback system).
- Tests : global/lock, URL rejetées (non Google), fallback.
- Gate : suite verte + waterfall fonts ≤ 2 requêtes (mesure preview).

### Lot 11 — Thème du studio (outil admin)
- Pur admin : toggle Light/Grey/Dark sur `HeroStudioEditor` (Grey #F4F4F5
  par défaut = calibrage). Variables locales, persistées `localStorage`.
- Zéro boutique, zéro migration. Tests : aucun (UI pure) ou snapshot
  statique minimal.
- Gate : suite verte.

---

## VAGUE 2 — un par un, mesuré (4 lots, chacun avec gate LCP)

Règle commune : chaque lot = 1 type de couche OU 1 effet, avec mesure
`build` + `preview:3000` + nav privée, médiane 3 runs, **avant/après**.
Régression LCP > 100 ms ou CLS > 0.01 → lot reverté, pas discuté.

### Lot 12 — Import Font par URL (durcit lot 10)
- Validation : domaine `fonts.googleapis.com` uniquement (même discipline
  que les liens hero), `display=swap` forcé, timeout + fallback system.
- Tests : URL malveillantes rejetées (`javascript:`, autres domaines).

### Lot 13 — Marquee (nouveau type `marquee`)
- Schéma : `{ type:"marquee", text, speed?, direction? }`, CSS-animation
  infinie `transform`-only, `prefers-reduced-motion` → statique.
- Interdit slide 1 (garde éditeur + warning). Exclu du prerender lead.
- Gate LCP/CLS avant/après.

### Lot 14 — Countdown (nouveau type `countdown`)
- Schéma : `{ type:"countdown", targetAt, label? }`. Hydratation client
  uniquement (jamais dans le HTML prerender : placeholder statique « … »).
- Gate LCP avant/après (attendu : nul, pas de JS bloquant).

### Lot 15 — Hotspots style + presets Glass/Mesh/Noise
- Hotspots = style de CTA positionné « pastille » (réutilise positions % +
  `translate`, aucun concept neuf).
- Fonds : 3 presets figés testés (Glass, Mesh, Noise en data-URI SVG
  < 2 Ko, pas de CSS libre).
- Gate : poids data-URI ≤ 2 Ko chacun, suite verte.

### Lot 16 — Parallax / Magnetic (gelé par défaut)
- **Uniquement si** Vague 2 verte et demande explicite : CSS
  `transform`-only, jamais slide 1, `prefers-reduced-motion`, flag
  `motion: false` par défaut dans le schéma (opt-in par slide).
- Sinon : reste refusé (cf. section Refus).

---

## Refusés (décision, pas report)

| Item | Motif |
| ---- | ----- |
| Vidéo de fond | Poids/autoplay/LCP : inverse du chantier lots 1–5 |
| Export HTML standalone | Doublon du HTML sandboxé (Shadow DOM + garde 42501) |
| Publish bis | Doublon polling + « Republier » + Deploy Hook (garde super-admin contournée sinon) |
| Freeform px non borné | % + `translate()` existants = freeform raisonnable ; px = casse responsive |
| Timeline JS au scroll | Repaint/scroll-JS = mort LCP ; CSS-only éventuel = lot 16 |

---

## Suivi comparatif Claude

`style-15` (Claude) vs `style-15-b` (nous) : comparer à périmètre égal
(lots 1–5 d'abord), puis réévaluer si Claude couvre tout ou partie des
lots 6–16. Ne pas merger avant verdict. `main` intacte jusqu'à décision ;
Deploy Hook sur `main` uniquement après merge (voir `blocNote.md`).

## État (style-15-b)

- Vague 1 faite (lots 6–11 + disposition 02 : voir commit vague 1).
- Lot 12 fait : import font URL (css2 Google validé, swap forcé, max
  3 `<link>`, repli système + suppression onError). Tests 865/865.
- Lot 13 fait : marquee (texte 5–120 s/boucle, direction, ton, CSS
  transform-only + reduced-motion global, exclu du lead, avertissement
  slide 1). Aucun slide marquee live → impact LCP nul. Tests 867/867.
- Lot 14 fait : countdown (ISO normalisé, label, ton, texte expiré,
  tick 1 s nettoyé, `role="timer"`, exclu du lead, hydratation cliente).
  Aucun slide countdown live → impact LCP nul. Tests 869/869.
- Lot 15 fait : hotspots (style pastille pulsante, `pulse-ring` réutilisé,
  aria-label, 3 rendus), presets Verre/Maille/Grain (SVG data ~350 o,
  pisteurs refusés). Aucun usage live → impact nul. Tests 871/871.
