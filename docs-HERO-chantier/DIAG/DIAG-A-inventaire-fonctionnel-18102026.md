# DIAG-A — Inventaire fonctionnel de A (partie 1/2)

Date : 18/10/2026. Source : `src/admin/HeroStudioPage.tsx` (3280 l.) + `src/lib/heroStudio.ts` + `src/lib/heroSchema.ts`. Plan de reference : `PLAN-studio-15claude-vs-mockup-15b-18102026.md`.

Ce document liste les fonctionnalites de A (zones UI) avec compteurs par zone. Partie 1/2 : zones 1 a 10. Suite : `DIAG-A-inventaire-fonctionnel-part2-18102026.md`.

---

## 1. Barre haute (topbar) — 8 controles

| # | Controle | Type | Etat/Action |
|---|----------|------|-------------|
| 1 | Logo + badge "Versatile Engine" | Affichage | Statique |
| 2 | Titre slide courant | Affichage | Dynamique (Slide n/N, Nouveau, Selectionne) |
| 3 | Devices (Desktop/Tablette/Mobile) | 3 boutons | aria-pressed, change device |
| 4 | Theme studio (Clair/Neutre/Sombre) | 3 boutons | aria-pressed, persiste localStorage |
| 5 | Undo | bouton | disabled si pile vide, Ctrl+Z |
| 6 | Redo | bouton | disabled si pile vide, Ctrl+Y |
| 7 | Enregistrer | bouton | disabled si saving, spinner |
| 8 | Statistiques | bouton | Ouvre HeroStatsPanel |

## 2. Panneau gauche — slides — 12 controles

| # | Controle | Type |
|---|----------|------|
| 1 | Nouveau slide | bouton accent |
| 2 | Tiroir modeles (showTemplates) | toggle |
| 3 | Modeles built-in (HERO_TEMPLATES + HERO_TILES_TEMPLATES) | N boutons |
| 4 | Modeles utilisateur (userTpls) | N boutons + supprimer |
| 5 | Slide courant (nouveau, non enregistre) | affichage dashed |
| 6 | Liste slides | N cartes |
| 7 | Monter slide | bouton par slide |
| 8 | Descendre slide | bouton par slide |
| 9 | Ouvrir slide | clic carte |
| 10 | Pastille statut (En ligne/Planifie/Brouillon) | affichage colore |
| 11 | Corbeille (HeroTrashPanel) | panneau |
| 12 | Recuperer slide | callback |

Etats : selectionne (bordure accent), desactive (opacity 0.6), vide (message + hs-empty).

## 3. Canvas central — 14 controles/interactions

| # | Controle | Type |
|---|----------|------|
| 1 | Theme apercu (Clair/Sombre) | toggle |
| 2 | Zones reservees (guides) | checkbox |
| 3 | iframe preview | affichage (pointer-events none) |
| 4 | Overlay drag handle (CTA) | pointer events (drag + keydown) |
| 5 | Snap au centre (50% +/-1.5%) | interaction |
| 6 | Nudge clavier (1% / 5% avec Maj) | interaction |
| 7 | Position mobile differente | checkbox (inspecteur) |
| 8 | Affichage x/y pendant drag | overlay temporaire |
| 9 | Ligne centrale (drag.x === 50) | affichage conditionnel |
| 10 | Zones reservees (reserved px) | overlay bas |
| 11 | Warnings | N messages (warn/info) |
| 12 | Aucun slide -> message | affichage conditionnel |
| 13 | Device dimensions (w x h) | affichage dans toolbar |
| 14 | Selection live (couche/bouton/slide) | affichage dans toolbar |

## 4. Inspecteur droit — onglets — 3 onglets

| Onglet | Sections contenues |
|--------|-------------------|
| Contenu | Slide, Couches, Boutons, HTML colle |
| Style | Dimensions, Tous les slides, Fond |
| Suivi | Historique, Controle qualite |

Controle global : Tout deplier / Tout replier (secMode).

## 5. Section Slide — 12 controles

| # | Controle | Type |
|---|----------|------|
| 1 | Produit principal | select (actifs uniquement) |
| 2 | Debut (planification) | datetime-local |
| 3 | Fin (planification) | datetime-local |
| 4 | Audience A/B | select (Tous/A/B) |
| 5 | Police globale | select (6 familles + defaut) |
| 6 | Import custom (URL Google Fonts) | input url + validation blur |
| 7 | Erreur URL (bordure rouge) | affichage conditionnel |
| 8 | Compteur config (octets / 20 000) | affichage + barre |
| 9 | Compteur HTML+CSS (octets / 50 000) | affichage + % + "TROP LOURD" |
| 10 | Notice "Slide herite" | affichage conditionnel (origin legacy) |
| 11 | Notice "Slide desactive" | affichage conditionnel (!isActive) |
| 12 | HeroSyncBadge | composant |

## 6. Section Dimensions — 8 controles

| # | Controle | Type |
|---|----------|------|
| 1 | Mode (Fixe/Auto) | Seg 2 options |
| 2 | Largeur (Pleine/Contenue) | Seg 2 options |
| 3 | Hauteur desktop (valeur + unite vh/px) | Num + select |
| 4 | Hauteur mobile differente | checkbox |
| 5 | Hauteur mobile (valeur) | Num (si checkbox) |
| 6 | Ratio desktop | Num (mode auto) |
| 7 | Ratio mobile | Num (mode auto) |
| 8 | Mesurer depuis l'image | bouton (measureRatio) |

## 7. Section Tous les slides — 2 controles

| # | Controle | Type |
|---|----------|------|
| 1 | Message explicatif | texte |
| 2 | Appliquer dimensions a tous | bouton |

## 8. Section Fond — 10 controles

| # | Controle | Type |
|---|----------|------|
| 1 | 9 swatches presets | 9 boutons (Sombre, Creme, Terracotta, Sauge, Nuit bleue, Sable dore, Verre, Maille, Grain) |
| 2 | CSS libre (gradient) | input texte |
| 3 | Validation cleanHeroBackground | implicite |

## 9. Section Couches — 15 controles par couche + liste

| # | Controle | Type |
|---|----------|------|
| 1 | Liste couches (N cartes) | affichage |
| 2 | Selection couche | clic |
| 3 | Flags (off/lock/hide) | HeroFlagButtons |
| 4 | Monter couche | bouton (disabled si lock) |
| 5 | Descendre couche | bouton (disabled si lock) |
| 6 | Dupliquer couche | bouton (disabled si lock ou cap) |
| 7 | Supprimer couche | bouton (disabled si html && !isSuper) |
| 8 | Ajouter couche (6 types) | 6 boutons (image, card, tiles, text, marquee, countdown) |
| 9 | Ajouter HTML (super-admin) | bouton conditionnel |
| 10 | Message "Ordre : la 1re couche..." | texte |
| 11 | Editeur de couche selectionnee | LayerEditor (switch par type) |
| 12 | Verrou (fieldset disabled) | visuel |
| 13 | Scroll vers selection | scrollToId |
| 14 | Compteur couches (n/HERO_MAX_LAYERS) | titre section |
| 15 | Avertissement placehold.co | heroStudioWarnings |

### LayerEditor — controles par type

**Image (7)** : AdminImageInput (src), AdminImageInput (srcMobile), alt, fit (cover/contain), dim (range 0-1), scrim (none/left/bottom)

**Card (4)** : side (left/right), alt, productId (select), src (AdminImageInput)

**Tiles (12)** : variant (HeroGridPicker), src principal, label, ctaLabel, link (+ normalizeHeroLink blur), items (max 3 : src, label, link, retirer), + Ajouter tuile

**Text (22)** : anchor (4 options), tone (auto/light/dark), lineHeight, letterSpacing, align (5), transform (4), maxWidth, balance, tag, showTag, headline, headlineLines (all/first), sub, showSub, fromProduct, font, fontWeight (9), fontLocked (yes/no)

**Marquee (4)** : text, speed (5-120), direction (left/right), tone (light/dark)

**Countdown (4)** : targetAt (datetime-local), label, expiredText, tone

**HTML** : reserve (non creatable, auto au save)

## 10. Section Boutons (CTA) — 12 controles par CTA

| # | Controle | Type |
|---|----------|------|
| 1 | Flags (off/lock/hide) | HeroFlagButtons |
| 2 | Label | input (max 40) |
| 3 | Lien | input + normalizeHeroLink blur |
| 4 | Style | Seg 5 options (accent/light/dark/ghost/hotspot) |
| 5 | Position preset | select (6 presets) |
| 6 | Position libre (drag) | interaction canvas |
| 7 | Mobile differente | checkbox |
| 8 | Desktop X/Y | Num (si position libre) |
| 9 | Mobile X/Y | Num (si mobile different) |
| 10 | Supprimer mobile | bouton (X) |
| 11 | Glisser pastille | pointer events |
| 12 | Retirer CTA | bouton (toujours cliquable) |

---

Suite : `DIAG-A-inventaire-fonctionnel-part2-18102026.md` (sections 11-15 : HTML colle, Historique, compteurs, fonctionnalites intangibles).