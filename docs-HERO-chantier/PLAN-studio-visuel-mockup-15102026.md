# PLAN — Restyle visuel du studio 15-claude façon mockup-02 (15/10/2026)

Réf : `docs-HERO-chantier/DIAG-studio-15claude-vs-mockup-15b-14102026.md` (§4 : la mine d'idées).
Objectif : **disposition + style uniquement** — aucune fonction ajoutée/retirée/modifiée.
État actuel 15-claude : empilement vertical (liste slides → preview iframe → inspecteur en `<details>`), conteneur `studioThemeBg` + `secMode` (tout déplier/replier).

## Principes (non négociables)

1. **Visuel seul** : mêmes composants, mêmes states, mêmes handlers. On déplace du JSX, on ne change aucune logique.
2. **Scopé** : nouveau CSS sous `.hs-root` (comme `herostudio.css` 15-b), tokens locaux `--hs-*`. Zéro fuite vers la boutique ou le reste de l'admin.
3. **Tokens existants réutilisés** : `var(--color-*)` du studio actuel + accent `#FF6B21` du mockup ; les 3 `studioTheme` (Light/Grey/Dark) mappés sur les 3 thèmes mockup (`#FFFFFF` / `#F4F4F5` / `#0A0A0B`).
4. **Par étape vérifiable** : chaque phase se termine par `tsc` + screenshot desktop/mobile que je valide avant de passer à la suivante.

## Phase V1 — Coquille (header + 3 panneaux)

- **V1.1 Barre haute 56 px sticky** : logo `◉ Hero Studio` + badge `Versatile Engine`, titre slide courant, à droite : devices (Desktop/Tablet/Mobile — Tablet pilote la largeur 768), `studioTheme` 3 pastilles, Undo/Redo, Enregistrer. Reprendre les contrôles existants, juste relayoutés.
- **V1.2 Grille 3 colonnes** : gauche 300 px (liste slides + couches + boutons + templates), centre fluide (canvas preview), droite 360 px (inspecteur). `flex` + `min-h-0` + scroll par panneau (`overflow-y: auto`, `max-height: calc(100dvh - …)` comme `.hs-panel` actuel).
- **V1.3 Responsive** : < 1024 px → onglets ou empilement (canvas d'abord, comme le mockup `order-1/order-2/order-3`). Le comportement actuel reste le fallback.
- **Vérif V1** : `tsc`, captures 1280 + 390, aucun test cassé (suite 920/920).

## Phase V2 — Panneau gauche (liste + couches)

- **V2.1 Liste slides** : cartes compactes (titre tronqué + badge statut Brouillon/Planifié/En ligne existant), sélection au clic, + Nouveau slide.
- **V2.2 Couches `Layers · z-Index`** : lignes avec poignée visuelle, nom `n° + label`, badges (`TOP`, `🔒`, `👁`, D/M — existants via `HeroFlagButtons`), boutons Monter/Descendre/**Dupliquer**/Supprimer existants. **Pas de DnD** (boutons gardés : moins de risque).
- **V2.3 Boutons + Templates** : liste CTA existante + accès `HERO_TEMPLATES` / `HERO_TILES_TEMPLATES` / modèles utilisateur (tiroir existant `showTemplates`).
- **Vérif V2** : tout clic existant rejoue pareil (sélection, flags, ajout, suppression).

## Phase V3 — Canvas central

- **V3.1 Cadre pro** : fond pointillé (`dot-grid`), coins arrondis 20 px, bordure, largeur selon device (Desktop 100 % / Tablet 768 / Mobile 390), toolbar `● Live Preview · dimensions · layout · sel:` (infos déjà calculées : `rect`, `dev`, sélection).
- **V3.2 Toolbar canvas** : guides on/off (existant), `Reset Attached` → recentrer, dimensions.
- **V3.3 Interactions inchangées** : drag CTA + snap + nudge, sélection couche/CTA au clic, pastille orange. Aucun nouveau handler.
- **Vérif V3** : drag + nudge + sélection comparés avant/après (même comportement).

## Phase V4 — Inspecteur droit à onglets

Regrouper les `Section` existantes sans les modifier, sous 5 onglets mockup :
- **Style** : Fond (9 swatches) + Dimensions + `studioTheme` sort d'ici (monté en header V1.1).
- **Contenu** : Slide (produit, actif, dates, audience A/B, compteurs) + éditeur de la couche sélectionnée + éditeur CTA.
- **Effets** :two (placeholder honnête « Bientôt » si vide — aucun faux contrôle).
- **Motion** : idem (les infos marquee/countdown existantes y déménagent si pertinent, sinon onglet masqué).
- **Commerce** : prix/stock si un jour portés, sinon masqué.
- `secMode` tout déplier/replier conservé à l'intérieur des onglets.
- **Vérif V4** : chaque contrôle retrouvé (checklist : 9 presets fond, 6 positions CTA, 5 styles, tous les champs texte/marquee/countdown).

## Phase V5 — Polish mockup

- Tokens `--hs-*`, scrollbar 8 px, focus orange `#FF6B21`, badges (`Versatile Engine`, `TOP`, `Ghosted`, `Hidden on…`), hints `text-[11px]`, états vides (« No layer selected » → FR existant), `prefers-reduced-motion` pour les transitions du chrome.
- **Vérif V5** : Lighthouse admin non requis (outil interne), mais zéro régression suite + build + smoke boutique.

## Hors périmètre (rappel §5 DIAG)

Export `.zip`, Publish, vidéo, layouts 1-clic, focal draggable, motion boutique : **non inclus**. Ils feront l'objet de lots fonctionnels séparés après ta validation visuelle.

## Ordre d'exécution proposé

V1 → (ta vérification) → V2 → V3 → (ta vérification) → V4 → V5 → (vérification finale + commit).
Chaque phase : petits edits, `tsc` vert, suite 920/920, captures. Commit **par toi** entre phases.
