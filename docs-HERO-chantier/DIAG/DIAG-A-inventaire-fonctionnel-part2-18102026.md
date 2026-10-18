# DIAG-A — Inventaire fonctionnel de A (partie 2/2)

Date : 18/10/2026. Suite de `DIAG-A-inventaire-fonctionnel-18102026.md` (partie 1/2). Source : `src/admin/HeroStudioPage.tsx` + `src/lib/heroStudio.ts` + `src/lib/heroSchema.ts`. Plan de reference : `PLAN-studio-15claude-vs-mockup-15b-18102026.md`.

---

## 11. Section HTML colle — 6 controles

| # | Controle | Type |
|---|----------|------|
| 1 | Notice super-admin | texte |
| 2 | HTML overlay | textarea (6 rows) |
| 3 | CSS scope | textarea (4 rows) |
| 4 | HTML colle (bouton ajout) | bouton (super-admin) |
| 5 | HTML dirty (modifie) | indicateur |
| 6 | HeroHtmlPanel | composant (save/get) |

## 12. Section Historique — 4 controles

| # | Controle | Type |
|---|----------|------|
| 1 | HeroHistoryPanel | composant |
| 2 | HeroWeightCheck | composant |
| 3 | HeroGridPicker | composant (dans LayerEditor tiles) |
| 4 | HeroStatsPanel | composant (bouton topbar) |

## 13. Resume des compteurs

| Zone | Controles | Etats | Interactions |
|------|-----------|-------|--------------|
| Barre haute | 8 | 2 | 3 |
| Panneau gauche (slides) | 12 | 3 | 4 |
| Canvas central | 14 | 2 | 5 |
| Onglets inspecteur | 3 | 1 | 1 |
| Section Slide | 12 | 2 | 1 |
| Section Dimensions | 8 | 2 | 2 |
| Section Tous les slides | 2 | 1 | 1 |
| Section Fond | 10 | 1 | 1 |
| Section Couches | 15 | 3 | 6 |
| LayerEditor (image) | 7 | 0 | 0 |
| LayerEditor (card) | 4 | 0 | 0 |
| LayerEditor (tiles) | 12 | 1 | 1 |
| LayerEditor (text) | 22 | 0 | 0 |
| LayerEditor (marquee) | 4 | 0 | 0 |
| LayerEditor (countdown) | 4 | 0 | 0 |
| Section Boutons (par CTA) | 12 | 2 | 3 |
| Section HTML colle | 6 | 1 | 0 |
| Section Historique | 4 | 0 | 0 |
| **TOTAL** | **~157** | **18** | **27** |

## 14. Fonctionnalites intangibles (ne pas perdre)

1. `sanitizeHeroConfig` a chaque commit/patch/save
2. `heroConfigBytes` > 20 000 -> throw (save bloque)
3. `heroPayloadBudget` > 50 000 -> throw (save bloque)
4. `origin` forcee "studio" a l'enregistrement
5. `html/css` ecrits seulement si dirty
6. Garde 42501 (super-admin) pour HTML
7. `storefront:invalidate` au save
8. Undo/Redo avec coalescence 800ms, max 20
9. Ctrl+Z / Ctrl+Y (jamais pendant saisie)
10. Verrou session (lock) bloque contenu + reorga, pas visibilite ni suppression
11. `moveItem` borne (pas de debordement)
12. `duplicateItem` clone profond + cap HERO_MAX_LAYERS
13. `snapHeroPoint` arrondi 0.5% + aimantation centre +/-1.5%
14. `heroReservedBottomPx` zone basse carrousel
15. `heroStudioWarnings` (vide, aucun visuel, LCP, CTA sans destination, placehold.co, poids)
16. `heroQualityWarnings` (qualite)
17. `heroHasVisual` (visuel present)
18. `canAddCta` (max 4)
19. `isHeroScheduledLive` (fenetre [starts, ends[)
20. `resolveHeroConfig` (lecture depuis base, fallback legacy)
21. `toDraft` / `serialize` / `confirmLeave`
22. `measureRatio` (ratio image)
23. `applySizingToAll` (dimensions homogenes)
24. `saveAsTemplate` / `reloadTemplates`
25. `duplicate` (slide)
26. `restoreBackup` (restauration annulee)
27. `seedHtml` (amorcage HTML)
28. `liveHtml` / `htmlDirty` (sync temps reel iframe)
29. `polling` 45s + version check
30. `showStats` / `HeroStatsPanel`
31. `HeroWeightCheck` (pesee)
32. `HeroGridPicker` (variantes tuiles)
33. `HeroFlagButtons` (off/lock/hide)
34. `HeroSyncBadge` (sync)
35. `HeroTrashPanel` (corbeille)
36. `HeroHistoryPanel` (historique versions)
37. `scrollToId` (scroll vers selection)
38. `matchCtaPresetId` (presets CTA 1-clic)
39. `HERO_CTA_POSITIONS` (6 presets)
40. `newLayer` / `newCta` (factories)
41. `HERO_BG_PRESETS` (9 presets dont Verre/Maille/Grain)
42. `HERO_TEMPLATES` / `HERO_TILES_TEMPLATES` / `userTpls`
43. `HERO_FONT_FAMILIES` (6 familles)
44. `cleanHeroFontUrl` (validation URL)
45. `parseHeroFontUrlFamilies` (extraction familles)
46. `heroEffectiveFont` (bloc > globale > defaut, lock)
47. `heroFontStack` / `heroFontHref` / `ensureHeroFonts` (max 3 link)
48. `heroCountdownParts` (decomposition pure)
49. `heroCtaClass` (mapping style -> className)
50. `HotspotDot` (pastille a11y)
51. `cleanHeroBackground` (plafond 1200, data-SVG sans script)
52. `isHeroHidden` / `hideCls` (masquage responsive)
53. `heroReservedBottomPx` (zone basse carrousel)

---

## 15. Ce que ce document NE fait pas

- Il ne modifie aucun fichier source.
- Il ne lance aucun diagnostic de code.
- Il ne decide pas encore quelles nouveautes de B seront implementees.

Ce document est uniquement le **plan de route** du diagnostic a venir.

Suite : `DIAG-B-inventaire-visuel-18102026.md` (inventaire visuel de B).