# DIAG — Studio 15-claude vs mockup-02 + éditeur 15-b (14/10/2026)

Diagnostic lecture seule : **rien n'a été modifié**, un seul fichier créé (celui-ci).
Question : qu'ont en plus le mockup et la version 15-b par rapport à notre studio `style-15-claude` actuel ?

## 0. Ce que sont vraiment les sources (piège évité)

| Source | Nature réelle |
|---|---|
| `docs-HERO-chantier/mockups/Hero-Studio-Versatile-Engine-02.html` (253 Ko) | Maquette statique : React minifié inline, `useState` ×36, **zéro persistance, zéro undo/redo, export `.zip` sans handler**. Idées UX, pas du fonctionnel. |
| `src/admin/HeroStudioEditor.tsx` (2563 l., 100 % commenté sur 15-claude) | **Le vrai éditeur prod 15-b** (`style-15-b:src/admin/HeroStudioEditor.tsx`, lot 3), copié pour référence. Branché `heroPromotionsApi` + `sanitizeHeroConfig` à chaque frappe. |
| `style-15-b:src/admin/herostudio/HeroStudioPage.tsx` + `herostudio.css` | **Second mock** (entête : « AUTONOME, mocks en tête, zéro appel réseau ») : le mockup-02 adapté en React pour cadrage. Idées UX, pas de prod. |
| `style-15-b:src/lib/heroStudio.ts` / `heroTemplates.ts` / `heroSelect.ts` | Lib prod 15-b : factories, presets, positions CTA, historique pur, sélection. |

## 1. Verdict en une page

**Le fonctionnel prod 15-b est déjà à parité sur 15-claude** (tout le §2 est couvert, dont P0–P6 du port).
**15-claude dépasse 15-b** sur : image `srcDark`, tuiles jusqu'à 5, 9 gabarits + templates utilisateur, historique versions en base (`hero_history`), stats (`HeroStatsPanel`), pesée (`HeroWeightCheck`), DSD lead, drag CTA canvas + snap + nudge clavier, undo 60 + `Ctrl+Z/Y` gardé pendant la saisie.
**Il manque réellement** (§3) : presets de position CTA 1-clic, duplication de couche, scroll inspecteur vers la sélection, compteur HTML+CSS /50 000 + blocage save, notices « converti » / « slide désactivé ».
**Idées mockup non reprises** (§4, la vraie mine) : switch de layout 1-clic (8 layouts), focal point draggable, effets (glass/grain/mesh/blur, shapes, radius/gap), entrance/parallax/timeline, overflow detection, override typo au mot, blocs commerce (prix/stock/rating/social), filmstrip.
**Refusés assumés** (§5, ne pas rouvrir sans décision) : export `.zip`/Liquid, bouton Publish, vidéo fond, freeform px.

## 2. Parité confirmée (15-b prod → 15-claude : rien à faire)

Couches image/card/tiles/text/marquee/countdown/html, tous leurs contrôles (dont `headlineLines`, `showTag`/`showSub`, `fromProduct`, `balance`, `maxWidth`, verrou police, URL fonts validée au blur), fonds 9 presets, styles CTA (accent/light/dark/ghost/**hotspot**), `off`/`lock`/`hide` (≈ œil + pills D/M 15-b), planification début/fin, audience A/B, produit « autonome », Monter/Descendre, duplication **de slide**, undo/redo + raccourcis, guides, devices, garde config > 20 000 octets, garde super-admin 42501 pour le HTML, `storefront:invalidate` au save.

## 3. Manques réels (prod 15-b que 15-claude n'a pas)

1. **Presets de position CTA 1-clic** — 15-b `HERO_CTA_POSITIONS` : « En ligne », « Bas · droite » (96/82, mobile 96/84), « Bas · gauche », « Centre », « Haut · droite », « Personnalisée », avec `matchCtaPresetId`. 15-claude : inline/libre + drag + snap + nudge, mais **aucun preset nommé**. Le plus rentable du lot.
2. **Dupliquer une couche** — 15-b : bouton `Copy` par carte (`duplicateItem`, capé `slice(HERO_MAX_LAYERS)`). 15-claude : duplication au niveau slide seulement.
3. **Scroll vers la sélection** — 15-b `scrollToId` (`hero-slide` / `hero-layer-i` / `hero-cta-i`, `scrollIntoView smooth nearest`) au clic liste/canvas. 15-claude : pas de scroll auto.
4. **Compteur HTML+CSS /50 000 + blocage save** — 15-b : `heroPayloadBudget` affiché (`— TROP LOURD`, orange si warn) et `handleSave` qui bloque si `over`. 15-claude : seul le compteur config /20 000 est gardé.
5. **Notices** — 15-b : « Converti depuis l'ancien format… l'ancien formulaire ne l'écrasera plus » et « Slide désactivé : invisible en boutique (l'aperçu le montre quand même) ». 15-claude : absentes (le mécanisme existe, le message non).
6. **Supprimer autorisé même verrouillé** — 15-b : le verrou bloque contenu + réorga, jamais visibilité ni suppression. 15-claude : `fieldset disabled` bloque tout le panneau. Détail, mais assumé différemment.

## 4. Idées mockup (02 + `herostudio/`) non reprises — classées par valeur

**Forte valeur :**
- **Switch layout 1-clic** (Immersive / Split / Grid / Bento / Asym / Masonry + Filmstrip / Lookbook) avec barre `hs-layoutbar` et filmstrip bas. 15-claude : le layout dérive des couches, aucun switch.
- **Focal point draggable** sur canvas (dot orange, `objectPosition` %, par média, mock : par breakpoint) + clic vignette pour définir le focal. 15-claude : rien.
- **Panneau Effets** : Glass, Grain, Mesh, Blur, Blend + Gradient, Shape (rectangle/pill/arch/blob), Radius (0–32), Gap (8–48), Shadow. 15-claude : presets de fond fixes uniquement.
- **Motion** : Entrance (none/fade/slide/pop), Parallax (1x/1.2x/1.5x), Magnetic CTA (snap < 6 %, détache > 28 px), Timeline (Kicker 0 ms / Title 120 ms / CTA 240 ms). 15-claude : `snapHeroPoint` seul.
- **Overflow detection** : outline orange + message si `scrollWidth > clientWidth + 2`, modes Wrap/Shrink/Truncate/Auto. 15-claude : rien (lot 11 « qualité » ne couvre pas ça).
- **Typo au mot** : double-clic → cycle police du mot (`MOCK_FONTS`), sélecteur « Select line to override ». 15-claude : verrou par bloc max.

**Valeur moyenne :**
- **Blocs commerce** : Price (€149), Stock (« Plus que 3 », amber), Rating (★4.8 (412)), Social proof (2.4k + avatars), toggles rapides, `Commerce Copy`. 15-claude : `showMeta` + replis produit seulement.
- **Drag & drop couches** (swap `z`, poignée `⋮⋮`) + Front/Back (`z` max+1/min−1). 15-claude : boutons Monter/Descendre.
- **Device Tablet** (620/768×1024) + cadre 390 px nommé. 15-claude : desktop/mobile.
- **ThemeAware** (bascule aperçu selon thème boutique). 15-claude : `studioTheme` ne change que le chrome.
- **Verrou session distinct du masquage** + hint « Different from eye visibility ». 15-claude : même esprit, non expliqué.

**Faible / gadget :**
- Attached/Detached canvas, badge `TOP` orange, `z:` badges, Toasts stylés, mini-CSS des cartes templates, `highlightWord`, `pretty` (`text-wrap: pretty`), compteur Social, date countdown inline canvas.

## 5. Refusés assumés (déjà tranchés, pour mémoire)

Export `.zip` / onglets JSON-HTML-CSS-Liquid, bouton Publish (+ Deploy Hook, polling 45 s : prod seule), vidéo fond, freeform px, parallax/timeline JS côté boutique, `USING(true)` lecture, DROP colonnes / cron / Vault / rétention 90 j (post-fusion).

## 6. Recommandations (propositions, aucune action lancée)

1. **Reprendre d'abord** : presets position CTA (3.1) + dupliquer couche (3.2) — petit, fidèle à l'éditeur prod 15-b, zéro risque rendu.
2. **Ensuite** : compteur HTML+CSS + blocage save (3.4) + notices (3.5) + scroll sélection (3.3).
3. **Chantier UX** : focal draggable (§4 forte valeur) puis switch layouts — mais c'est du nouveau développement, pas du port : à cadrer comme lots 15-claude séparés, pas comme « rattrapage 15-b ».
4. **Ne pas reprendre** : export/publish (§5), blocs commerce et motion tant que la fusion `main` n'est pas faite.
