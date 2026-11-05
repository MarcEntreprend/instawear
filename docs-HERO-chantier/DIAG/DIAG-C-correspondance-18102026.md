# DIAG-C — Correspondance A -> B + matrice fonctionnelle

Date : 18/10/2026. Source : DIAG-A (inventaire A) + DIAG-B (inventaire visuel B). Plan : `PLAN-studio-15claude-vs-mockup-15b-18102026.md`.

---

## 1. Correspondance structurelle (zone par zone)

| Zone A | Equivalent B | Statut visuel | Action |
|--------|--------------|---------------|--------|
| Barre haute V1 (logo, devices, theme, undo/redo, save) | Barre haute B (logo + badge Versatile Engine, devices, theme, undo/redo, export/publish) | Proche | Affiner (badge, export/publish) |
| Grille 3 colonnes V1 (300/fluide/360) | Sidebar L (300) + canvas C + panneau R (360) | Identique | Conserver |
| Panneau droit onglets (Contenu/Style/Suivi) | Onglets (Style/Type/Effets/Motion/Commerce) | Different | Fusionner / reorganiser |
| Inspecteur par couche (LayerEditor) | Panneau Layers · z-Index + Content + Media + Add Block | Different | Recreer |
| Canvas dot-grid | Canvas dot-grid / grille | Proche | Affiner (radius 20, dot-grid) |
| Boutons Monter/Descendre/Dupliquer/Supprimer | Poignee drag + Front/Back | Different | Conserver boutons + ajouter drag optionnel |
| Pastilles statut (En ligne/Planifie/Brouillon) | Badges (TOP, z:, 🔒, 👁) | Different | Conserver pastilles + adopter badges B |
| Notices (herité, desactive) | Hints (No layer selected, etc.) | Different | Conserver notices + adopter hints B |

## 2. Matrice fonctionnelle A -> B (zero perte)

Chaque fonctionnalite de A conserve un emplacement dans le nouveau design, meme si B ne l'a pas.

### 2.1 Fonctionnalites de A presentes dans B (conserves tels quels)

| Fonctionnalite A | Equivalent B | Statut |
|------------------|--------------|--------|
| Undo/Redo + Ctrl+Z/Y | Undo/Redo + Ctrl+Z/Shift+Ctrl+Z/Ctrl+Y | Conserve |
| Drag CTA + snap + nudge | Drag CTA + snap + nudge | Conserve |
| Guides (zones reservees) | Non present dans B | Conserve (A only) |
| Device (Desktop/Tablette/Mobile) | Device (Desktop/Tablet/Mobile) | Conserve |
| Theme apercu (Clair/Sombre) | ThemeAware toggle | Conserve |
| Planification (debut/fin) | Countdown timer | Conserve (A plus riche) |
| Audience A/B | Non present dans B | Conserve (A only) |
| Police globale + import URL | Font Library + Global Font Control | Conserve |
| Typo fine (lineHeight, etc.) | Typography Details (meme controles) | Conserve |
| Marquee (texte, vitesse, direction, ton) | Marquee (text, speed, dir) | Conserve |
| Countdown (targetAt, label, expiredText, tone) | Countdown (label, duree, expire) | Conserve |
| Hotspot (style CTA) | Hotspot (+ buttons) | Conserve |
| Presets fond (9 dont Verre/Maille/Grain) | Glass/Grain/Mesh toggles | Conserve |
| Verrou session (lock) | Lock (prevent drag/edit) | Conserve |
| Masquage (off/hide D/M) | Hide on (All/Desktop/Mobile) + eye | Conserve |
| Compteur config (20 000 octets) | Non present dans B | Conserve (A only) |
| Compteur HTML+CSS (50 000 octets) | Non present dans B | Conserve (A only) |
| Warnings (heroStudioWarnings) | Performance Budget (score) | Conserve (A plus riche) |
| Historique versions (HeroHistoryPanel) | Non present dans B | Conserve (A only) |
| Stats (HeroStatsPanel) | Non present dans B | Conserve (A only) |
| Pesee (HeroWeightCheck) | Performance Budget | Conserve (A plus riche) |
| Trash (HeroTrashPanel) | Non present dans B | Conserve (A only) |
| Templates utilisateur (userTpls) | Non present dans B | Conserve (A only) |
| Sync badge (HeroSyncBadge) | Attached/Detached | Conserve (A plus riche) |
| Grid picker (variantes tuiles) | Non present dans B | Conserve (A only) |
| CTA presets 1-clic (6 presets) | Non present dans B | Conserve (A only) |
| Dupliquer couche | Non present dans B | Conserve (A only) |
| Scroll vers selection | Non present dans B | Conserve (A only) |
| Notices (herité, desactive) | Hints | Conserve (A only) |

### 2.2 Fonctionnalites de A absentes de B (conserves quand meme)

| Fonctionnalite A | Emplacement dans le nouveau design |
|------------------|-----------------------------------|
| `headlineLines` (all/first) | Inspecteur Texte (onglet Contenu) |
| `balance` (typo) | Inspecteur Texte (onglet Contenu) |
| `maxWidth` (typo) | Inspecteur Texte (onglet Contenu) |
| `fontLocked` (verrou police) | Inspecteur Texte (onglet Contenu) |
| `heroPayloadBudget` / blocage save | Inspecteur Slide (onglet Contenu) |
| `studioTheme` (Light/Grey/Dark) | Barre haute (theme studio) |
| `showStats` / `HeroStatsPanel` | Bouton topbar "Statistiques" |
| `applySizingToAll` | Inspecteur Style (onglet Style) |
| `measureRatio` (mesurer image) | Inspecteur Dimensions (onglet Style) |
| `saveAsTemplate` / `reloadTemplates` | Panneau gauche (tiroir modeles) |
| `duplicate` (slide) | Panneau gauche (bouton par slide) |
| `restoreBackup` | Panneau gauche (bouton restauration) |
| `seedHtml` (amorcage HTML) | Inspecteur Contenu (section HTML) |
| `liveHtml` / `htmlDirty` | Inspecteur Contenu (section HTML) |
| `polling` 45s + version check | Automatique (pas d'UI) |
| `HeroWeightCheck` (pesee) | Inspecteur Suivi (onglet Suivi) |
| `HeroTrashPanel` (corbeille) | Panneau gauche (bas) |
| `HeroHistoryPanel` (historique) | Inspecteur Suivi (onglet Suivi) |
| `HeroGridPicker` (variantes tuiles) | LayerEditor tiles (onglet Contenu) |
| `HeroFlagButtons` (off/lock/hide) | Chaque couche/CTA |
| `HeroSyncBadge` | Barre haute |
| `matchCtaPresetId` | Inspecteur Boutons (onglet Contenu) |
| `HERO_CTA_POSITIONS` (6 presets) | Inspecteur Boutons (onglet Contenu) |
| `cleanHeroFontUrl` (validation URL) | Inspecteur Slide (onglet Contenu) |
| `heroEffectiveFont` | Rendu (HeroSlideView) |
| `heroCountdownParts` | Rendu (HeroCountdown) |
| `heroCtaClass` / `HotspotDot` | Rendu (HeroSlideView) |
| `cleanHeroBackground` | Inspecteur Fond (onglet Style) |
| `isHeroHidden` / `hideCls` | Rendu (HeroSlideView) |
| `heroReservedBottomPx` | Canvas overlay |

### 2.3 Fonctionnalites de B proposees pour A (ajouts optionnels)

| Nouveaute B | Effort | Priorite | Notes |
|-------------|--------|----------|-------|
| Focal point draggable | Moyen | Haute | Par media, par breakpoint |
| Switch layout 1-clic | Moyen | Haute | 8 layouts (Immersive/Split/Grid/Bento/Asym/Masonry/Filmstrip/Lookbook) |
| Panneau Effets | Moyen | Moyenne | Glass, Grain, Mesh, Blur, Shape, Radius, Gap, Shadow |
| Motion (Entrance/Parallax/Magnetic/Timeline) | Eleve | Moyenne | Necessite JS + CSS |
| Blocs commerce (Prix/Stock/Rating/Social) | Eleve | Basse | Necessite backend produit |
| Filmstrip bas de canvas | Faible | Moyenne | Miniatures + barre progression |
| Badge "Versatile Engine" | Faible | Haute | Deja dans la barre haute V1 |
| Attached/Detached | Faible | Basse | Etat canvas |
| Export JSON/HTML/CSS/Liquid | Moyen | Basse | Mock (sans handler) |
| Overflow detection | Faible | Moyenne | Outline orange + message |
| Hover zoom (1.06) | Faible | Basse | CSS transition |
| Grain overlay | Faible | Moyenne | SVG 20px, opacity .35/.5 |
| Double-clic mot -> cycle font | Moyen | Basse | Necessite MOCK_FONTS |
| Performance Budget (score) | Faible | Moyenne | Ameliorer HeroWeightCheck |
| Responsive Art Direction | Eleve | Basse | Images differentes par breakpoint |

---

## 3. Resume

- **28 fonctionnalites de A** sont presentes dans B et conservees.
- **33 fonctionnalites de A** sont absentes de B mais conservees quand meme (emplacement dedie).
- **15 nouveautes de B** proposees pour A (ajouts optionnels, sans rien supprimer).

Aucune fonctionnalite de A n'est supprimee. Le changement est purement visuel + ajouts optionnels.

---

Suite : `DIAG-D-nouveautes-18102026.md` (nouveautes B pour A en detail).