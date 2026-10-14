# PLAN — Restyle visuel du studio 15-claude façon mockup-02 (15/10/2026, màj 2)

Réf : `docs-HERO-chantier/DIAG-studio-15claude-vs-mockup-15b-14102026.md` (§4).
Cible visuelle : le mockup **FALL COLLECTION** = `docs-HERO-chantier/mockups/Hero-Studio-Versatile-Engine-02.html`
= son adaptation React `style-15-b:src/admin/herostudio/HeroStudioPage.tsx` + `herostudio.css`.
⚠️ Précision : le fichier `src/admin/HeroStudioEditor.tsx` (copie commentée sur 15-claude) est le **vrai éditeur prod 15-b** (style clair), PAS le mockup. Le design sombre vient des deux fichiers ci-dessus.
À remplacer : le style actuel 15-claude (screenshot 1 : page claire, empilement vertical, listes, 15 %).
Objectif : **disposition + style uniquement** — aucune fonction ajoutée/retirée/modifiée.

## Décisions utilisateur (figées)

1. **Colonne centrale FIXE** : comme le mockup, elle ne scrolle pas avec la page — seules les colonnes gauche/droite scrollent (`position: sticky top`, hauteur `100dvh` moins header, `overflow: hidden` + canvas interne).
2. **Pas de FILMSTRIP layouts** : la barre basse du centre affiche **nos slides 15-claude** (ceux qui sont aujourd'hui à gauche) : cartes `#n + statut + titre`, clic = ouvrir le brouillon. Les minis `Immersive live / Split live / …` du mockup ne sont PAS reprises.

## Référence mockup, colonne par colonne (ce qu'on copie)

**HEADER (56 px, sticky, fond sombre)** — gauche : `← Admin`, `boutique`, `◉ Hero Studio` + badge `Versatile Engine` + badge `● Attached` ; centre : pills layouts (on garde la zone mais on n'y met PAS de switch layout — hors périmètre — on y affiche le titre du slide courant) ; droite : 3 pastilles theme (= nos `studioTheme` Light/Grey/Dark), devices Desktop/Tablet/Mobile, Undo/Redo, Enregistrer (+ Dupliquer / Enregistrer comme modèle / Statistiques déjà existants).

**GAUCHE (300 px, scroll)** — de haut en bas : `TEMPLATES` (grille 3 col, minis CSS, sélection orange → nos `HERO_TEMPLATES` + `HERO_TILES_TEMPLATES` + modèles utilisateur) ; `LAYERS · Z-INDEX` + `Front`/`Back` (lignes : poignée visuelle, nom tronqué, `z:N`, badges TOP/🔒/👁/D-M via `HeroFlagButtons`, boutons Monter/Descendre/Dupliquer/Supprimer — **pas de DnD**) ; `Boutons (n/4)` (liste CTA existante) ; hint « Eye hides everywhere… » ; footer « Scoped CSS • Container queries • object-fit • clamp() ».
(Le mockup a aussi `CONTENT`/`MEDIA`/`ADD BLOCK` : chez nous le contenu est déjà couvert par l'inspecteur droit — pas de doublon.)

**CENTRE (fixe)** — toolbar `● Live Preview · dims · sel:` (nos `rect`/`dev`/sélection) + guides on/off ; canvas dot-grid, radius 20, grain discret, sélection cadre pointillé orange, drag CTA + snap + pastille existants inchangés ; **en bas : bande SLIDES** (nos slides, horizontal, scroll-x, carte active bordée orange).

**DROITE (360 px, scroll, onglets Style / Type / Effects / Motion / Commerce)** — on regroupe nos `Section` existantes SANS les modifier : Style = Fond (9 swatches) + Dimensions + Typo globale/fonts ; Type = éditeur couche sélectionnée + éditeur CTA (+ positions 1-clic F1) ; Effects/Motion/Commerce = **masqués tant que vides** (aucun faux contrôle) ; `secMode` conservé ; `Supprimer ce slide` + Historique + Contrôle qualité + HTML collé restent des sections (onglet Contenu ou bas d'inspecteur — tranché en V4).

**TOKENS** — `.hs-root` : `--hs-bg #101012 / panel #18181b / border #27272a / text #fafafa / muted #a1a1aa / accent #ff6b21 / radius 12px`, scrollbar 8 px, focus orange, hints 11 px, badges, `prefers-reduced-motion` du chrome. Mappés sur nos 3 `studioTheme`.

## Principes (non négociables)

1. **Visuel seul** : mêmes composants/states/handlers, on déplace du JSX.
2. **Scopé `.hs-root`**, zéro fuite boutique/admin.
3. Par étape vérifiable : `tsc` + captures 1280/390 validées par toi.

## Phases

- **V1 Coquille** : header 56 px + 3 colonnes (300/fluide/360) + **centre fixe** + responsive < 1024 px (empilement, canvas d'abord). Vérif : `tsc`, captures, suite 920/920.
- **V2 Gauche** : slides → déplacés en bas du centre (V3) ; ici Templates + Layers + Boutons façon mockup. Vérif : clics identiques.
- **V3 Centre + bande SLIDES** : canvas pro + strip horizontal de nos slides (remplace FILMSTRIP). Vérif : drag/nudge/sélection inchangés + ouverture slide depuis le strip.
- **V4 Inspecteur à onglets** : regroupement + checklist (9 fonds, 6 positions CTA, 5 styles, champs texte/marquee/countdown, HTML, historique, qualité). Vérif : chaque contrôle retrouvé.
- **V5 Polish** : tokens, badges, vides, reduced-motion. Vérif : suite + build + smoke boutique.

## Hors périmètre

Export `.zip`, Publish, switch layouts 1-clic, focal draggable, motion/effects boutique, blocs commerce : lots séparés après validation visuelle.

## Ordre

V1 → (ta vérification) → V2 → V3 → (ta vérification) → V4 → V5 → (vérification finale + commit par toi).
