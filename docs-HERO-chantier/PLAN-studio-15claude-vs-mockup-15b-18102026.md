# DIAG-studio-15claude-vs-mockup-15b-18102026.md

Plan de diagnostic : appliquer le style / la carrosserie de **B** (`style-15-b`, `/admin/herostudio`) à **A** (`style-15-claude`, `src/admin/HeroStudioPage.tsx` actuel) **sans perdre aucune fonctionnalité de A**.

Rédigé le 18/10/2026. Aucun fichier source n'est modifié par ce plan.

---

## 0. Objectif et contrainte absolue (à relire avant chaque étape)

> **Tout ce que A permet de faire doit rester exactement pareil après le changement visuel.**  
> Déplacer un bouton, recolorer un bloc, réorganiser un onglet, changer la police du chrome : oui.  
> Supprimer une option, fusionner deux contrôles, retirer un état, cacher une fonction : **non**.

B (mockup) est une source d'inspiration pour le **look** (couleurs, grille, onglets, radius, focale, motion, états vides, badges) et peut suggérer de **nouvelles fonctionnalités** absentes de A, mais jamais comme prétexte pour en retirer.

---

## 1. Pourquoi les docs précédents n'ont pas suffi (relecture obligatoire)

Avant d'ouvrir le moindre fichier, relire et annoter ces trois documents pour comprendre ce qui a échoué ou est resté en suspens :

| Doc | Ce qu'il apporte | Ce qu'il manque / pourquoi il n'a pas abouti |
|-----|------------------|---------------------------------------------|
| `docs-HERO-chantier/DIAG-studio-15claude-vs-mockup-15b-14102026.md` | Comparatif fonctionnel A vs B, liste des manques réels (presets CTA, duplicata, scroll, budget, notices) | Aucune traduction visuelle concrète ; pas de maquettage de la carrosserie ; pas de plan d'implémentation CSS |
| `docs-HERO-chantier/HERO-STUDIO-fonctionnalites-12102026.md` | Cahier des charges fonctionnel de A (ce qui doit exister) | Aucune référence visuelle B ; centré backend/RLS, pas sur l'UI admin |
| `docs-HERO-chantier/PLAN-studio-visuel-mockup-15102026.md` | Plan V1→V5 déjà appliqué (barre haute, grille 3 colonnes, canvas, onglets, polish) | Reste partiel : l'apparence globale reste celle de A, pas celle de B (fond sombre, sidebar Layers, onglets Style/Type/Effets/Motion/Commerce, focale draggable, etc.) |

**Leçon à tirer** : le diagnostic doit produire des **recommandations CSS/structure directement applicables**, pas seulement une liste de constats.

---

## 2. Périmètre : ce qu'on inventorie

### 2.1 Version A — l'existant (à préserver intégralement)
Lire intégralement :
- `src/admin/HeroStudioPage.tsx` (tous les `Section`, `LayerEditor`, contrôles CTA, calques, templates, historique, stats, poids, guides, devices)
- `src/lib/heroStudio.ts` (constantes, factories, presets, historique, budgets, avertissements)
- `src/lib/heroSchema.ts` (schéma, validateurs, `cleanHeroBackground`, etc.)
- `src/components/HeroSlideView.tsx`, `HeroCountdown.tsx`, `HeroHtmlBlock.tsx` (rendu)
- `src/index.css` (styles déjà appliqués au studio)
- Tests ciblés : `tests/hero-schema.test.ts` (ce qui est figé)

### 2.2 Version B — la carrosserie cible (à copier visuellement)
Lire :
- `docs-HERO-chantier/mockups/Hero-Studio-Versatile-Engine-02.html` (mockup statique, React inline, Tailwind)
- `git show style-15-b:src/admin/herostudio/HeroStudioPage.tsx` + `herostudio.css` (mock React de 15-b)
- `git show style-15-b:src/admin/HeroStudioEditor.tsx` (100 % commenté, référence fonctionnelle de 15-b)

---

## 3. Méthodologie : 7 étapes

### Étape 0 — Relecture des docs existants (jour 0)
Produire une note interne : "ce qui a déjà été tenté, ce qui a échoué, ce qui reste en suspens".  
Cela alimente l'étape 6 (éviter de répéter les erreurs).

### Étape 1 — Inventaire fonctionnel de A (ce qu'on ne peut PAS perdre)
Pour chaque écran/panneau de A, lister :
- Chaque contrôle (input, select, toggle, bouton, curseur)
- Chaque état (vide, chargé, erreur, verrouillé, masqué, actif/inactif)
- Chaque interaction (clic, drag, nudge clavier, undo/redo, copier/coller)
- Chaque règle de validation (sanitize, plafond octets, garde super-admin, cap couches/CTAs)

Sortie : une checklist "fonctionnalités intangibles de A" (≈ 40-60 items).

### Étape 2 — Inventaire visuel de B (la carrosserie)
Pour chaque zone du mockup B, lister :
- Disposition : barre haute, sidebar gauche (Templates / Layers · z-Index / Add Block), canvas central, panneau droit (onglets Style / Type / Effets / Motion / Commerce)
- Palette : fonds (sombre #0A0A0B, gris #F4F4F5, clair #FFFFFF), accent #FF6B21, textes, bordures
- Typographie : tailles, graisses, tracking, clamp, text-wrap (balance/pretty)
- Composants : pastilles, badges, toggles, sliders, inputs, états de sélection, focus-visible, outlines orange
- Interactions : drag de couche (swap z), focal point draggable, CTA magnétique (snap), timeline, entrance animations, overflow detection
- États vides : "No layer selected", "Sélectionne un slide", etc.
- Badges : TOP, 🔒, 👁, z-index, Ghosted, etc.

### Étape 3 — Comparaison structurelle A vs B
Pour chaque zone de A, identifier son équivalent (ou son absence) dans B :
| Zone A | Équivalent B | Statut visuel | Action |
|--------|--------------|---------------|--------|
| Barre haute V1 | Barre haute B | À recréer | Recaler |
| Grille 3 colonnes V1 | Sidebar L + canvas C + panneau R | À recréer | Recaler |
| Panneau droit à onglets (Contenu/Style/Suivi) | Onglets Style/Type/Effets/Motion/Commerce | À fusionner | Recaler |
| Inspecteur par couche | Panneau Layers · z-Index | À recréer | Recaler |
| Canvas dot-grid | Canvas dot-grid / grille | Déjà proche | Affiner |
| Boutons Monter/Descendre/Dupliquer/Supprimer | Poignée drag + Front/Back | À compléter | Ajouter (optionnel) |

### Étape 4 — Matrice fonctionnelle A → B (zéro perte)
Pour chaque fonctionnalité de A (issue de l'étape 1), vérifier qu'elle existe encore dans la cible visuelle de B **ou** qu'elle a un emplacement dédié dans le nouveau design.

Exemples :
- `headlineLines` (all/first) → doit rester accessible dans l'inspecteur texte
- `balance` (typo) → doit rester accessible
- `fontLocked` → doit rester accessible
- `heroPayloadBudget` / blocage save → doit rester accessible (compteur HTML+CSS)
- `studioTheme` (Light/Grey/Dark) → doit rester accessible
- Undo/Redo + Ctrl+Z/Y → doit rester accessible
- `showStats` / `HeroStatsPanel` → doit rester accessible
- `applySizingToAll` → doit rester accessible
- etc.

Si une fonctionnalité de A n'a pas d'équivalent dans B, elle doit **néanmoins conserver un emplacement** dans le nouveau design (pas de suppression).

### Étape 5 — Nouveautés de B inspirantes pour A (ajouts optionnels)
Lister les éléments visuels/interactifs de B qui n'existent pas dans A et qui pourraient être ajoutés **sans rien supprimer** :
- Focal point draggable sur l'image principale
- Switch de layout 1-clic (Immersive / Split / Grid / Bento / Asym / Masonry + Filmstrip / Lookbook)
- Panneau Effets (Glass, Grain, Mesh, Blur, Shape, Radius, Gap, Shadow)
- Motion (Entrance, Parallax, Magnetic CTA, Timeline)
- Blocs commerce (Prix, Stock, Rating, Social Proof)
- Filmstrip bas de canvas
- Badge "Versatile Engine", Attached/Detached
- Export JSON/HTML/CSS/Liquid (mock, sans handler réel pour l'instant)

### Étape 6 — Analyse des échecs passés (éviter de répéter)
À partir de la relecture des 3 docs (étape 0), lister :
- Pourquoi le DIAG du 14/10 n'a pas mené au visuel B (manque de specs CSS, pas de maquette applicative)
- Pourquoi le PLAN visuel du 15/10 est resté partiel (V1→V5 appliqués mais apparence globale inchangée)
- Ce qu'il faut faire différemment cette fois (spécifier les couleurs exactes, les tailles, les écarts, fournir des règles CSS applicables directement)

### Étape 7 — Recommandations de refactor visuel (livrable)
Produire, pour chaque zone de A, la liste des modifications CSS/structure à apporter pour ressembler à B, **sans toucher à la logique** :
- Couleurs (tokens `--hs-*` ou réutilisation des `--color-*` existants)
- Grille (sidebar 300px, canvas fluide, panneau 360px)
- Rayons, bordures, ombres
- Focus-visible (orange `#FF6B21`)
- Transitions (150 ms ease)
- États vides (`.hs-empty`)
- Scrollbar fine (8 px)
- Badges et pastilles
- Respect de `prefers-reduced-motion`

---

## 4. Règles d'or du diagnostic (à respecter strictement)

1. **Zéro suppression** : aucune fonctionnalité de A n'est retirée, même si B ne l'a pas.
2. **Zéro modification de logique** : on ne touche pas à `sanitizeHeroConfig`, `heroPayloadBudget`, `moveItem`, `undo/redo`, `scrollToId`, etc. On déplace seulement du JSX et on ajoute du CSS.
3. **Zéro nouvelle dépendance** : pas de librairie UI ajoutée (pas de shadcn, pas de headless-ui, etc.). On utilise lucide-react déjà présent + CSS inline existant.
4. **Respect du scope** : tout le CSS neuf est placé dans le bloc `<style>` existant de `HeroStudioPage.tsx` sous une classe racine (ex. `.hs-root`), sans fuite vers le reste de l'app.
5. **Respect des tests** : suite 920/920 doit rester verte après chaque changement envisagé.
6. **Respect des commits** : tout commit est fait par l'utilisateur, pas par moi.

---

## 5. Livrables du diagnostic (une fois exécuté)

Le fichier produit par l'exécution de ce plan contiendra :
1. La checklist des fonctionnalités intangibles de A (étape 1)
2. L'inventaire visuel de B (étape 2)
3. La table de correspondance A → B (étape 3)
4. La matrice fonctionnelle avec statut "conservé / déplacé / ajouté" (étape 4)
5. La liste des nouveautés B proposées pour A (étape 5)
6. L'analyse des échecs passés (étape 6)
7. Les recommandations CSS/structure applicables (étape 7)
8. Un plan d'implémentation par phases (V6, V7, V8…)

---

## 6. Ce que ce document NE fait pas

- Il ne modifie aucun fichier source.
- Il ne lance aucun diagnostic de code.
- Il ne décide pas encore quelles nouveautés de B seront implémentées.

Ce document est uniquement le **plan de route** du diagnostic à venir.
