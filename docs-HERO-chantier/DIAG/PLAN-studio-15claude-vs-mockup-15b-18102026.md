# PLAN-studio-15claude-vs-mockup-15b-18102026.md

Plan de diagnostic : appliquer le style / la carrosserie de **B** (`style-15-b`, `/admin/herostudio`) a **A** (`style-15-claude`, `src/admin/HeroStudioPage.tsx` actuel) **sans perdre aucune fonctionnalite de A**.

Redige le 18/10/2026. Aucun fichier source n'est modifie par ce plan.

---

## 0. Objectif et contrainte absolue (a relire avant chaque etape)

> **Tout ce que A permet de faire doit rester exactement pareil apres le changement visuel.**
> Deplacer un bouton, recolorer un bloc, reorganiser un onglet, changer la police du chrome : oui.
> Supprimer une option, fusionner deux controles, retirer un etat, cacher une fonction : **non**.

B (mockup) est une source d'inspiration pour le **look** (couleurs, grille, onglets, radius, focale, motion, etats vides, badges) et peut suggerer de **nouvelles fonctionnalites** absentes de A, mais jamais comme pretexte pour en retirer.

---

## 1. Pourquoi les docs precedents n'ont pas suffi (relecture obligatoire)

Avant d'ouvrir le moindre fichier, relire et annoter ces trois documents pour comprendre ce qui a echoue ou est reste en suspens :

| Doc | Ce qu'il apporte | Ce qu'il manque / pourquoi il n'a pas abouti |
|-----|------------------|---------------------------------------------|
| `docs-HERO-chantier/DIAG-studio-15claude-vs-mockup-15b-14102026.md` | Comparatif fonctionnel A vs B, liste des manques reels (presets CTA, duplicata, scroll, budget, notices) | Aucune traduction visuelle concrete ; pas de maquettage de la carrosserie ; pas de plan d'implementation CSS |
| `docs-HERO-chantier/HERO-STUDIO-fonctionnalites-12102026.md` | Cahier des charges fonctionnel de A (ce qui doit exister) | Aucune reference visuelle B ; centre backend/RLS, pas sur l'UI admin |
| `docs-HERO-chantier/PLAN-studio-visuel-mockup-15102026.md` | Plan V1->V5 deja applique (barre haute, grille 3 colonnes, canvas, onglets, polish) | Reste partiel : l'apparence globale reste celle de A, pas celle de B (fond sombre, sidebar Layers, onglets Style/Type/Effets/Motion/Commerce, focale draggable, etc.) |

**Lecon a tirer** : le diagnostic doit produire des **recommandations CSS/structure directement applicables**, pas seulement une liste de constats.

---

## 2. Perimetre : ce qu'on inventorie

### 2.1 Version A — l'existant (a preserver integralement)
Lire integralement :
- `src/admin/HeroStudioPage.tsx` (tous les `Section`, `LayerEditor`, controles CTA, calques, templates, historique, stats, poids, guides, devices)
- `src/lib/heroStudio.ts` (constantes, factories, presets, historique, budgets, avertissements)
- `src/lib/heroSchema.ts` (schema, validateurs, `cleanHeroBackground`, etc.)
- `src/components/HeroSlideView.tsx`, `HeroCountdown.tsx`, `HeroHtmlBlock.tsx` (rendu)
- `src/index.css` (styles deja appliques au studio)
- Tests cibles : `tests/hero-schema.test.ts` (ce qui est fige)

### 2.2 Version B — la carrosserie cible (a copier visuellement)
Lire :
- `docs-HERO-chantier/mockups/Hero-Studio-Versatile-Engine-02.html` (mockup statique, React inline, Tailwind)
- `git show style-15-b:src/admin/herostudio/HeroStudioPage.tsx` + `herostudio.css` (mock React de 15-b)
- `git show style-15-b:src/admin/HeroStudioEditor.tsx` (100 % commente, reference fonctionnelle de 15-b)

---

## 3. Methodologie : 7 etapes

### Etape 0 — Relecture des docs existants (jour 0)
Produire une note interne : "ce qui a deja ete tente, ce qui a echoue, ce qui reste en suspens".
Cela alimente l'etape 6 (eviter de repeter les erreurs).

### Etape 1 — Inventaire fonctionnel de A (ce qu'on ne peut PAS perdre)
Pour chaque ecran/panneau de A, lister :
- Chaque controle (input, select, toggle, bouton, curseur)
- Chaque etat (vide, charge, erreur, verrouille, masque, actif/inactif)
- Chaque interaction (clic, drag, nudge clavier, undo/redo, copier/coller)
- Chaque regle de validation (sanitize, plafond octets, garde super-admin, cap couches/CTAs)

**Quantification obligatoire** : pour chaque zone, indiquer le nombre exact de controles, etats et interactions (ex. "Inspecteur texte : 14 controles, 3 etats, 2 interactions"). Le diagnostic est considere incomplet si un compteur manque.

Sortie : une checklist "fonctionnalites intangibles de A" avec compteurs par zone (ex. "A a X controles dans l'inspecteur, Y dans LayerEditor, Z dans le canvas").

### Etape 2 — Inventaire visuel de B (la carrosserie)
Pour chaque zone du mockup B, lister :
- Disposition : barre haute, sidebar gauche (Templates / Layers · z-Index / Add Block), canvas central, panneau droit (onglets Style / Type / Effets / Motion / Commerce)
- Palette : fonds (sombre #0A0A0B, gris #F4F4F5, clair #FFFFFF), accent #FF6B21, textes, bordures
- Typographie : tailles, graisses, tracking, clamp, text-wrap (balance/pretty)
- Composants : pastilles, badges, toggles, sliders, inputs, etats de selection, focus-visible, outlines orange
- Interactions : drag de couche (swap z), focal point draggable, CTA magnetique (snap), timeline, entrance animations, overflow detection
- Etats vides : "No layer selected", "Selectionne un slide", etc.
- Badges : TOP, 🔒, 👁, z-index, Ghosted, etc.

### Etape 3 — Comparaison structurelle A vs B
Pour chaque zone de A, identifier son equivalent (ou son absence) dans B :
| Zone A | Equivalent B | Statut visuel | Action |
|--------|--------------|---------------|--------|
| Barre haute V1 | Barre haute B | A recreer | Recaler |
| Grille 3 colonnes V1 | Sidebar L + canvas C + panneau R | A recreer | Recaler |
| Panneau droit a onglets (Contenu/Style/Suivi) | Onglets Style/Type/Effets/Motion/Commerce | A fusionner | Recaler |
| Inspecteur par couche | Panneau Layers · z-Index | A recreer | Recaler |
| Canvas dot-grid | Canvas dot-grid / grille | Deja proche | Affiner |
| Boutons Monter/Descendre/Dupliquer/Supprimer | Poignee drag + Front/Back | A completer | Ajouter (optionnel) |

### Etape 4 — Matrice fonctionnelle A -> B (zero perte)
Pour chaque fonctionnalite de A (issue de l'etape 1), verifier qu'elle existe encore dans la cible visuelle de B **ou** qu'elle a un emplacement dedie dans le nouveau design.

Exemples :
- `headlineLines` (all/first) -> doit rester accessible dans l'inspecteur texte
- `balance` (typo) -> doit rester accessible
- `fontLocked` -> doit rester accessible
- `heroPayloadBudget` / blocage save -> doit rester accessible (compteur HTML+CSS)
- `studioTheme` (Light/Grey/Dark) -> doit rester accessible
- Undo/Redo + Ctrl+Z/Y -> doit rester accessible
- `showStats` / `HeroStatsPanel` -> doit rester accessible
- `applySizingToAll` -> doit rester accessible
- etc.

Si une fonctionnalite de A n'a pas d'equivalent dans B, elle doit **neanmoins conserver un emplacement** dans le nouveau design (pas de suppression).

### Etape 5 — Nouveautes de B inspirantes pour A (ajouts optionnels)
Lister les elements visuels/interactifs de B qui n'existent pas dans A et qui pourraient etre ajoutes **sans rien supprimer** :
- Focal point draggable sur l'image principale
- Switch de layout 1-clic (Immersive / Split / Grid / Bento / Asym / Masonry + Filmstrip / Lookbook)
- Panneau Effets (Glass, Grain, Mesh, Blur, Shape, Radius, Gap, Shadow)
- Motion (Entrance, Parallax, Magnetic CTA, Timeline)
- Blocs commerce (Prix, Stock, Rating, Social Proof)
- Filmstrip bas de canvas
- Badge "Versatile Engine", Attached/Detached
- Export JSON/HTML/CSS/Liquid (mock, sans handler reel pour l'instant)

### Etape 6 — Analyse des echecs passes (eviter de repeter)
A partir de la relecture des 3 docs (etape 0), lister :
- Pourquoi le DIAG du 14/10 n'a pas mene au visuel B (manque de specs CSS, pas de maquette applicative)
- Pourquoi le PLAN visuel du 15/10 est reste partiel (V1->V5 appliques mais apparence globale inchangee)
- Ce qu'il faut faire differemment cette fois (specifier les couleurs exactes, les tailles, les ecarts, fournir des regles CSS applicables directement)

### Etape 7 — Recommandations de refactor visuel (livrable)
Produire, pour chaque zone de A, une **table de tokens CSS applicables directement** (pas de bullet vague) :

| Token | Valeur B | Valeur A actuelle | Action |
|-------|----------|-------------------|--------|
| `--hs-bg` | `#0A0A0B` | `var(--color-surface2)` | Remplacer |
| `--hs-panel` | `#18181b` | `var(--color-surface)` | Remplacer |
| `--hs-accent` | `#FF6B21` | `var(--color-accent)` | Verifier equivalence |
| `--hs-radius-card` | `2rem` | `12px` | Remplacer |
| `--hs-radius-inner` | `calc(2rem - 0.375rem)` | `8px` | Remplacer |
| `--hs-font-family` | `Inter, Sora, Space Grotesk, JetBrains Mono` | `var(--font-body)` | Verifier |
| `--hs-transition` | `cubic-bezier(0.32,0.72,0,1)` | `0.15s ease` | Remplacer |
| `--hs-section-py` | `py-24` a `py-40` | `gap: 14` | Remplacer |
| `--hs-scrollbar-w` | `8px` | `thin` | Remplacer |
| `--hs-focus` | `2px solid #FF6B21` | `2px solid var(--hs-accent)` | Verifier |
| `--hs-empty` | `1.5px dashed border` | `.hs-empty` existant | Affiner |

**Checklist d'evaluation visuelle (skill `high-end-visual-design`) — integree dans cette etape :**

Pour chaque zone de A, verifier :
- [ ] Les cartes utilisent-elles le Double-Bezel ? (shell + core, radius concentrique)
- [ ] Les boutons primaires ont-ils une icone trailing nested ?
- [ ] Les sections ont-elles un macro-whitespace suffisant (>= `py-24`) ?
- [ ] Les titres ont-ils un eyebrow tag ?
- [ ] Les transitions utilisent-elles une courbe custom (pas `linear`/`ease-in-out`) ?
- [ ] Les animations d'entree sont-elles presentes au scroll ?
- [ ] Le layout collapse-t-il proprement sous 768px ?
- [ ] Les animations sont-elles GPU-safe (transform/opacity uniquement) ?
- [ ] Le `backdrop-blur` est-il limite aux elements fixed/sticky ?
- [ ] Les z-indexes sont-ils reserves aux couches systemiques ?
- [ ] L'impression generale est-elle "k agency", pas "template avec belles fonts" ?

**Ce que le skill ne fait pas** : il ne remplace pas les sources B, ne dicte pas les couleurs/tailles de B, et ne modifie pas les regles d'or (section 4). Il sert uniquement de grille d'evaluation pour juger la qualite de la traduction visuelle.

---

## 3bis. Aide externe : skill `high-end-visual-design` (reference, pas application)

Le skill `high-end-visual-design` (`C:\Users\mmarc\.agents\skills\high-end-visual-design\SKILL.md`) est utilise comme **grille d'evaluation** pendant le diagnostic, pas comme template a copier. Ses principes servent de criteres pour juger si le style de B est bien traduit en CSS applicables pour A.

### 3bis.1 Principes du skill a integrer dans le diagnostic

| Principe du skill | Comment l'appliquer au diagnostic A vs B |
|-------------------|------------------------------------------|
| **Double-Bezel (Doppelrand)** | Verifier que les cartes de B (sidebar Layers, panneau droit) utilisent bien un shell externe + core interne avec radius concentrique. Si oui, documenter la formule `rounded-[calc(outer-0.375rem)]` pour A. |
| **Button-in-Button (CTA trailing icon)** | Verifier que les boutons primaires de B ont une icone nested dans un cercle. Documenter le pattern `w-8 h-8 rounded-full bg-black/5` pour les boutons d'A qui en ont besoin. |
| **Macro-whitespace** | Verifier que B utilise `py-24` a `py-40` pour les sections. Documenter les valeurs exactes pour A (actuellement V1->V5 utilisent `gap: 14` et `padding: 12`). |
| **Eyebrow tags** | Verifier que B utilise des badges `rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]`. Documenter si A doit les adopter pour ses titres de sections. |
| **Custom cubic-bezier** | Verifier que B n'utilise pas `linear` ou `ease-in-out`. Documenter la courbe exacte de B (ex. `cubic-bezier(0.32,0.72,0,1)`) pour A. |
| **Scroll entry animations** | Verifier que B anime l'entree des elements au scroll (fade-up + blur). Documenter la classe/animation correspondante pour A (actuellement A n'a pas d'animation d'entree). |
| **Mobile collapse <768px** | Verifier que B collapse ses layouts asymetriques en `grid-cols-1` avec `px-4`. Documenter le comportement responsive attendu pour A. |
| **GPU-safe animation** | Verifier que B n'anime que `transform` et `opacity`. Documenter toute violation dans B pour eviter de la reproduire dans A. |
| **Blur constraints** | Verifier que B n'applique `backdrop-blur` qu'aux elements fixed/sticky. Documenter pour A. |
| **Z-index discipline** | Verifier que B reserve les z-indexes pour les couches systemiques (nav, modals, overlays). Documenter pour A. |

### 3bis.2 Ce que le skill NE fait pas pour ce diagnostic

- Le skill **ne remplace pas** les sources B (mockup + git show). Il sert de grille d'evaluation pour juger la qualite de la traduction visuelle.
- Le skill **ne dicte pas** les couleurs, tailles ou composants de B. Ces valeurs viennent exclusivement de B.
- Le skill **ne modifie pas** les regles d'or (section 4). Il les complete en ajoutant des criteres de qualite visuelle.

### 3bis.3 Checklist d'evaluation visuelle (a utiliser pendant l'etape 7)

Pour chaque zone de A, verifier :
- [ ] Les cartes utilisent-elles le Double-Bezel ? (shell + core, radius concentrique)
- [ ] Les boutons primaires ont-ils une icone trailing nested ?
- [ ] Les sections ont-elles un macro-whitespace suffisant (>= `py-24`) ?
- [ ] Les titres ont-ils un eyebrow tag ?
- [ ] Les transitions utilisent-elles une courbe custom (pas `linear`/`ease-in-out`) ?
- [ ] Les animations d'entree sont-elles presentes au scroll ?
- [ ] Le layout collapse-t-il proprement sous 768px ?
- [ ] Les animations sont-elles GPU-safe (transform/opacity uniquement) ?
- [ ] Le `backdrop-blur` est-il limite aux elements fixed/sticky ?
- [ ] Les z-indexes sont-ils reserves aux couches systemiques ?
- [ ] L'impression generale est-elle "k agency", pas "template avec belles fonts" ?

---

## 4. Regles d'or du diagnostic (a respecter strictement)

1. **Zero suppression** : aucune fonctionnalite de A n'est retiree, meme si B ne l'a pas.
2. **Zero modification de logique** : on ne touche pas a `sanitizeHeroConfig`, `heroPayloadBudget`, `moveItem`, `undo/redo`, `scrollToId`, etc. On deplace seulement du JSX et on ajoute du CSS.
3. **Zero nouvelle dependance** : pas de librairie UI ajoutee (pas de shadcn, pas de headless-ui, etc.). On utilise lucide-react deja present + CSS inline existant.
4. **Respect du scope** : tout le CSS neuf est place dans le bloc `<style>` existant de `HeroStudioPage.tsx` sous une classe racine (ex. `.hs-root`), sans fuite vers le reste de l'app.
5. **Respect des tests** : suite 920/920 doit rester verte apres chaque changement envisage.
6. **Respect des commits** : tout commit est fait par l'utilisateur, pas par moi.

---

## 5. Livrables du diagnostic (une fois execute)

Le fichier produit par l'execution de ce plan contiendra :
1. La checklist des fonctionnalites intangibles de A (etape 1)
2. L'inventaire visuel de B (etape 2)
3. La table de correspondance A -> B (etape 3)
4. La matrice fonctionnelle avec statut "conserve / deplace / ajoute" (etape 4)
5. La liste des nouveautes B proposees pour A (etape 5)
6. L'analyse des echecs passes (etape 6)
7. Les recommandations CSS/structure applicables (etape 7)
8. Un plan d'implementation par phases (V6, V7, V8...)

---

## 6. Ce que ce document NE fait pas

- Il ne modifie aucun fichier source.
- Il ne lance aucun diagnostic de code.
- Il ne decide pas encore quelles nouveautes de B seront implementees.

Ce document est uniquement le **plan de route** du diagnostic a venir.

---

## 7. Structure du diagnostic en plusieurs fichiers

Pour contourner le probleme de longueur, le diagnostic est produit en **plusieurs fichiers courts** (un par etape), dans `docs-HERO-chantier/` :

| Fichier | Contenu | Etapes couvertes |
|---------|---------|------------------|
| `DIAG-A-inventaire-fonctionnel-18102026.md` | Checklist des fonctionnalites intangibles de A avec compteurs par zone | 1 |
| `DIAG-B-inventaire-visuel-18102026.md` | Inventaire visuel de B (palette, typo, composants, interactions, etats vides, badges) | 2 |
| `DIAG-C-correspondance-18102026.md` | Table de correspondance A -> B (zone par zone) + matrice fonctionnelle (conserve / deplace / ajoute) | 3, 4 |
| `DIAG-D-nouveautes-18102026.md` | Liste des nouveautes B proposees pour A (ajouts optionnels) | 5 |
| `DIAG-E-echecs-passes-18102026.md` | Analyse des echecs passes (pourquoi les docs precedents n'ont pas suffi) | 6 |
| `DIAG-F-tokens-css-18102026.md` | Table de tokens CSS applicables directement + checklist skill integree + plan d'implementation par phases (V6, V7, V8...) | 7 |

**Regles de decoupage** :

1. Chaque fichier fait **moins de 150 lignes** (sinon, le decouper a nouveau).
2. Chaque fichier commence par un en-tete : `# DIAG-X — [titre]`, date, et un lien vers le plan (`PLAN-studio-15claude-vs-mockup-15b-18102026.md`).
3. Chaque fichier finit par un lien vers le fichier suivant (ou « diagnostic termine » pour le dernier).
4. Les fichiers sont produits **dans l'ordre** (A -> F) pour que le contexte s'accumule naturellement.
5. Si une etape produit plus de contenu que prevu, on cree un fichier supplementaire avec le suffixe `-part2` (ex. `DIAG-A-inventaire-fonctionnel-part2-18102026.md`) plutot que de surcharger le fichier existant.

Ce document (`PLAN-studio-15claude-vs-mockup-15b-18102026.md`) est le **plan de route** qui orchestre la production des 6 fichiers DIAG ci-dessus. Il n'est pas modifie pendant le diagnostic.