# DIAG-D — Nouveautes B proposees pour A (ajouts optionnels)

Date : 18/10/2026. Source : DIAG-B (inventaire visuel B). Plan : `PLAN-studio-15claude-vs-mockup-15b-18102026.md`.

Ces nouveautes sont proposees pour A, **sans rien supprimer** de l'existant. Elles sont classées par effort et priorite.

---

## 1. Nouveautes a forte valeur / faible effort

| # | Nouveaute | Effort | Description | Source B |
|---|-----------|--------|-------------|----------|
| 1 | Badge "Versatile Engine" | Faible | Badge orange sur fond orange/15 dans la barre haute | mockup header |
| 2 | Grain overlay | Faible | SVG 20px, opacity .35/.5, pointer-events none, fixed | herostudio.css |
| 3 | Hover zoom (1.06) | Faible | Transition 0.5s sur hover des media | mockup canvas |
| 4 | Overflow detection | Faible | Outline orange + message si scrollWidth > clientWidth+2 | mockup canvas |
| 5 | Attached/Detached | Faible | Etat canvas (badge ambre) | mockup header |
| 6 | Filmstrip bas de canvas | Faible | Minis + barre de progression | mockup canvas |
| 7 | Performance Budget (score) | Faible | Ameliorer HeroWeightCheck avec score + barre | mockup commerce |
| 8 | Eyebrow tags | Faible | Badges `rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]` | mockup |

## 2. Nouveautes a valeur moyenne / effort moyen

| # | Nouveaute | Effort | Description | Source B |
|---|-----------|--------|-------------|----------|
| 9 | Focal point draggable | Moyen | Dot orange sur canvas, par media, par breakpoint, clic vignette | mockup media |
| 10 | Switch layout 1-clic | Moyen | 8 layouts (Immersive/Split/Grid/Bento/Asym/Masonry/Filmstrip/Lookbook) | mockup templates |
| 11 | Panneau Effets | Moyen | Glass, Grain, Mesh, Blur, Shape, Radius, Gap, Shadow | mockup effects |
| 12 | Export JSON/HTML/CSS/Liquid | Moyen | Mock (sans handler reel) | mockup export modal |
| 13 | Responsive Art Direction | Moyen | Images differentes par breakpoint + focal points | mockup commerce |
| 14 | Double-clic mot -> cycle font | Moyen | MOCK_FONTS + cycleWordFont | mockup type |

## 3. Nouveautes a valeur elevee / effort eleve

| # | Nouveaute | Effort | Description | Source B |
|---|-----------|--------|-------------|----------|
| 15 | Motion (Entrance/Parallax/Magnetic/Timeline) | Eleve | Necessite JS + CSS + IntersectionObserver | mockup motion |
| 16 | Blocs commerce (Prix/Stock/Rating/Social) | Eleve | Necessite backend produit + UI | mockup commerce |

## 4. Nouveautes deja presentes dans A (pas a ajouter)

| Element B | Equivalent A | Notes |
|-----------|--------------|-------|
| Undo/Redo | Present | A plus complet (coalescence 800ms) |
| Drag CTA + snap | Present | A plus complet (nudge clavier) |
| Device selector | Present | A a Tablette en plus |
| Theme apercu | Present | A a 3 themes studio |
| Planification | Present | A plus riche (datetime-local) |
| Audience A/B | Present | A only (pas dans B) |
| Police globale + import URL | Present | A plus riche (validation blur) |
| Typo fine | Present | A plus complet (11 controles) |
| Marquee | Present | A plus riche (ton, direction) |
| Countdown | Present | A plus riche (ISO normalise, expiredText) |
| Hotspot | Present | A plus riche (aria-label, title) |
| Presets fond | Present | A a 9 (B a 3 toggles) |
| Verrou session | Present | A plus riche (fieldset disabled) |
| Masquage off/hide | Present | A equivalent (off/lock/hide) |
| Compteur config 20k | Present | A only |
| Compteur HTML+CSS 50k | Present | A only |
| Warnings | Present | A plus riche (10+ warnings) |
| Historique versions | Present | A only |
| Stats | Present | A only |
| Pesee | Present | A only |
| Trash | Present | A only |
| Templates utilisateur | Present | A only |
| Sync badge | Present | A only |
| Grid picker | Present | A only |
| CTA presets 1-clic | Present | A only |
| Dupliquer couche | Present | A only |
| Scroll vers selection | Present | A only |
| Notices | Present | A only |

## 5. Regle d'ajout

Chaque nouveaute de B est **optionnelle** et **additive** : elle s'ajoute a A sans retirer ni modifier quoi que ce soit de l'existant. Aucune nouveaute n'est obligatoire pour le changement de style (carrosserie). Elles feront l'objet de lots fonctionnels separes apres la fusion visuelle.

---

Suite : `DIAG-E-echecs-passes-18102026.md` (analyse des echecs passes).