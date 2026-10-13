# Hero Studio — inventaire complet des fonctionnalités

Sources : maquette `Hero-Studio-Versatile-Engine-02.html` (02 remplace v1
sans perte — diff vérifiée), branche `style-15-b` (notre version, lots 1–5
+ Vague 1 + Vague 2), branche `style-15-claude` (version Claude, lots 2–12).
État relevé le 2026-10-11. Doc descriptive : ne rien en déduire sans vérifier
le code cité.

Légende : ✅ présent · ❌ absent · ◐ partiel/divergent.

---

## 1. La maquette 02 (référence design, pas de code réutilisable)

Export React compilé (pas de navigateur côté analyse : inventaire par
extraction statique du bundle). 02 = v1 + 6 ajouts (thème studio, Font
Manager + lock, vrai z-stack, overflow 4 modes, hide-on, typo fine).

### 1.1 Système de couches
| Couche | Rôle |
|---|---|
| Primary / Secondary / Tertiary / Quaternary Media | 4 visuels empilables (fonds, visuels produit, déco) |
| Badge / Kicker | pastille + sur-titre |
| Titre / Description | textes riches |
| Price / Stock (+ Rating) | prix, dispo, note — liés au produit |
| Marquee Bar | bandeau défilant |
| Hotspots | points d'intérêt cliquables sur le visuel |
| CTA Group | 1 à N boutons (inline ou positionnés, « Magnetic CTA » aimanté) |
| Deco | formes décoratives |

### 1.2 Design
- **Font Library** : Inter, Sora, Instrument Serif, General Sans, Space
  Grotesk, JetBrains Mono + import par URL ; **global vs lock** (un bloc
  verrouillé 🔒 ignore le changement global) ; graisse au slider.
- **Thèmes** : 3 thèmes du studio lui-même (Light / Grey neutre calibrage /
  Deep Dark) + toggle Theme-Aware du hero, indépendants.
- **Effets** : Glass, Noise overlay, Gradient Mesh, ombres, `Snap to center`.
- **Typo fine** : hauteur de ligne 0.9–2.0, chasse, alignement, casse,
  largeur max (ch/%), `balance`/`pretty`, **overflow en 4 modes**
  (wrap / shrink `clamp()` / truncate / auto 3-lignes-puis-shrink) + tag
  ambre + alerte fantôme si débordement.

### 1.3 Canvas pro
Freeform, menu contextuel, zoom, sélecteur device (desktop/tablette/mobile),
**Hide-on** (None/Desktop/Mobile/All — fantôme 30 % dans l'aperçu),
**z-stack réel** (drag ⋮⋮, up/down, Front/Back, œil 👁 partout, verrou 🔒
anti-drag/anti-édition, badge TOP sur CTA, contour orange `#FF6B21` à la
sélection), undo/redo implicite.

### 1.4 Dynamique & sortie
Parallax, Timeline (animations/keyframes), Countdown, vidéo (présente dans
le bundle), Templates, Export/Publish, **Performance Budget**.

---

## 2. Notre version `style-15-b` (lots 1–5 + Vague 1 + Vague 2)

### 2.1 Données (lots 1, schéma `hero_promotions.config` jsonb v1)
| Fonctionnalité | Fait quoi |
|---|---|
| Composition `config` | `sizing` (fixe vh/px + mobile / auto ratio, largeur full/contained), `background` (dégradé validé), `layers[]`, `ctas[]`, `origin: legacy\|studio` |
| Couches | `image` (fond plein cadre, dim, scrim, variantes mobile/dark), `card` (visuel cadré + produit live), `tiles` (principal + 3 tuiles), `text` (ancre, ton, tag, titre multi-lignes, sous-titre, `fromProduct`), `html` (réservé lot 4), `marquee`, `countdown` |
| CTA | label + lien interne validé + style (accent/clair/sombre/fantôme/**pastille hotspot**) ; inline (flux) ou positionnés % desktop/mobile, anti-débordement `translate(-x%,-y%)` |
| Planification | `starts_at`/`ends_at`, filtre runtime `[starts, ends[` |
| SLugs/version | slugs stables jamais réécrits ; compteur `hero_version` par trigger (1 bump/reorder) |
| RLS | anon = publiés seuls ; admin = tout ; écritures admin ; `html/css` = super_admin (trigger `guard_html`, plafond 50 Ko serveur) |

### 2.2 Rendu boutique (lot 2)
Rendu unifié `HeroSlideView` (legacy pixel-identique), lazy actif+suivant,
`<picture>` mobile, lead prerender + `suspended` zéro-`<img>` (LCP),
sizing honoré (hauteur fixe/mobile, ratio auto, contenue 88rem),
`<link>` fontes unique dédupliqué (`display=swap`, zéro requête si legacy).

### 2.3 Éditeur intégré `HeroStudioEditor` (lots 3 + Vague 1, disposition 02)
Barre haute (retour, titre, **thème studio** Light/Grey/Dark persisté,
device, **undo/redo** 20 états coalescés, Enregistrer) ; **panneau couches**
(slide, couches numérotées, boutons badge TOP, clic = scroll + surbrillance
orange, œil partout, pills Hide-on D/M, **verrous session**) ; canvas
central WYSIWYG (vraie sélection boutique) ; inspecteur droit (Général,
Dimensions, Fond, Couches, Boutons, HTML).
- **Templates** (lot 7) : Promo produit, Annonce image, Grille 3 tuiles,
  Autonome texte (+ menu « Partir de… », annulable).
- **Hide-on** (lot 8) : `{mobile, desktop}` par couche/CTA, absent = visible
  (zéro migration).
- **Typo fine** (lot 9) : interlignage, chasse, alignement, casse, largeur
  max (motif strict), balance — appliqués seulement si définis.
- **Fonts** (lot 10) : globale (6 fontes) + par bloc + **verrou** + graisse ;
  **import URL** (lot 12 : css2 Google validé, swap forcé, max 3 `<link>`,
  repli système).
- **Budget** : jauges config/20 Ko et HTML+CSS/50 Ko, blocage save si over.
- **HTML** (lot 4) : section super_admin, couche auto-ajoutée/retirée,
  écriture seulement si modifiée (jamais de 42501 par accident), message
  42501 explicite, preview live.
- **Propagation** (lot 5) : polling `hero_version` 45 s + retour visible,
  `storefront:invalidate` (promos + catalogue), edge `hero-deploy-hook` +
  bouton « Republier le site ».
- **Vague 2** : marquee (5–120 s/boucle, direction, ton, CSS-only,
  exclu du lead), countdown (ISO, tick 1 s nettoyé, `role="timer"`,
  exclu du lead), hotspots (pastille pulsante `pulse-ring`, aria-label),
  presets Verre/Maille/Grain (SVG ~350 o, pisteurs refusés).

### 2.4 Robustesse
`tsc` strict + ~870 tests ( gardes statiques + purs), build + prerender
45 pages + smoke preview à chaque lot. Discipline : champs additifs,
jamais de `USING(true)` (gardé), pas de `Set-Content` sur sources.

---

## 3. Version Claude `style-15-claude` (lots 2–12)

Disposition 02 aussi (page séparée `/admin` → Marketing → Hero Studio,
pas intégrée à Promotions) ; **preview par iframe** (`/admin/hero-preview`,
vraie `HeroCarousel` + poignées CTA déplaçables drag/clavier/snap).

### 3.1 Rendu & sélection
`heroResolve.ts` (filtre actif + fenêtre + produit/standalone + tri
`order,id`, timer `nextHeroScheduleChange`), `h1` unique (actif=h1),
montage actif + voisins après 1200 ms, cadre = sizing slide n°1,
CTA libres en CSS (`.hero-cta-free`), `key={i}` (connu : recycle le DOM).

### 3.2 Données & sécurité
Table `hero_slide_html` séparée (policies super_admin, plafond 50 Ko),
`hero_version` + snapshot RPC + fingerprint + debounce 10 min +
cron/Vault (exclus sur base partagée), tables `hero_templates`,
`hero_slide_versions` + `hero_html_versions` (30/15 versions, corbeille
même-id, conflit `latest()`), stats `engagement_events` + RPC +
**A/B** (`ab` Tous/A/B, verdict z `min=100`), grilles
split/bento/asym/strip/mosaic (`variant` add-only, jamais stocké si
split), flags `off/lock/hide` persistés, qualité WCAG (contraste/alt/CTA),
a11y carrousel (pause, `reduced-motion`, ARIA), historique undo session
(60 + clavier), dirty-guard + `beforeunload` + `Ctrl+S`, gabarits
(Plein cadre, Visuel + carte, Bannière image, Grille, Image seule),
warnings qualité, drag CTA + guides, duplication + modèles perso +
applySizing, sanitize par reconstruction (DOMPurify retiré), self-test
19 vecteurs navigateur.

### 3.3 Écarts assumés vs 15-b (déclarés par lui)
Label grid réduit au titre, CTA image positionné (vs inline), pas de
marquee/countdown/hotspots/fonts/typo/hide-booléens, pas de polling 45 s
(sync au focus), pas de verrous session, pas de thème studio.

---

## 4. Matrice : maquette → 15-b → 15-claude

| Fonctionnalité maquette | `style-15-b` | `style-15-claude` |
|---|---|---|
| Couches image/carte/tuiles/texte | ✅ | ✅ |
| Couche HTML sandboxée | ✅ (Shadow + dirty-guard) | ✅ (table + panel + self-test) |
| Marquee / Countdown / Hotspots | ✅ | ❌ (reportés par lui) |
| CTA inline + positionnés % | ✅ | ✅ (CSS vars + drag) |
| Hide-on responsive | ✅ (booléens) | ✅ (`off` + `"desktop"\|"mobile"`) |
| Verrou édition | ✅ (session) | ✅ (persisté) |
| Œil (masquer partout) | ✅ | ✅ (`off`) |
| Undo/redo | ✅ (20, coalescé) | ✅ (60 + clavier) |
| Templates | ✅ (4 constantes) | ✅ (4 gabarits + table perso) |
| Typo fine + overflow modes | ✅ (6 champs, modes via `headlineLines`) | ❌ |
| Fonts + lock + import URL | ✅ | ❌ |
| Thème studio Light/Grey/Dark | ✅ | ❌ (suit le document) |
| Budget config/HTML | ✅ (jauges + blocage) | ✅ (jauge + audit log) |
| Planification + timer | ✅ (filtre runtime) | ✅ (+ timer bornes) |
| Polling / sync auto | ✅ (45 s + visible) | ✅ (focus ≤1/min) |
| Deploy Hook / rebuild | ✅ (edge + bouton) | ✅ (flush debounce + badge + cron prod) |
| Historique persisté + corbeille + conflit | ❌ | ✅ |
| Stats + A/B + verdict | ❌ | ✅ |
| Grilles bento/asym/strip/mosaic | ❌ | ✅ |
| Qualité WCAG + a11y carrousel | ◐ (contrastes de base) | ✅ |
| Parallax / Timeline / Vidéo | ❌ refusés | ❌ (timeline refusée aussi) |
| Publish direct / Export standalone | ❌ refusés | ❌ |
| h1 unique | ❌ | ✅ |
| IDs CTA anti-collision | ❌ (risque connu) | ✅ (aléatoires) |
| Dirty-guard / beforeunload / Ctrl+S | ❌ | ✅ |
| Miroir legacy au save | ❌ | ✅ |
| Tri déterministe order,id | ❌ (`order` seul) | ✅ |

*Doc généré le 2026-10-11 sur `style-15-claude`. Relire avant toute décision de fusion.*
