# DIAG-B — Inventaire visuel de B (hero studio mockup 15-b)

Date : 18/10/2026. Source : `docs-HERO-chantier/mockups/Hero-Studio-Versatile-Engine-02.html` (253 Ko, HTML autonome) + `git show style-15-b:src/admin/herostudio/HeroStudioPage.tsx` + `herostudio.css`.

Ce document liste le style / l'apparence / le design de B (la carrosserie cible). Suite : `DIAG-C-correspondance-18102026.md`.

---

## 1. Structure generale (layout)

| Element | B | A (actuel) |
|---------|---|------------|
| Conteneur racine | `.hs-root` (scopé) | `.hs-root` (ajoute V1) |
| Grille principale | 3 colonnes : sidebar 300px + canvas fluide + panneau 360px | 3 colonnes : 300px + fluide + 360px (V1) |
| Responsive | <1024px : 1 colonne, canvas d'abord | <1024px : 1 colonne (V1) |
| Barre haute | 56px sticky, flex, gap 10 | 56px sticky (V1) |
| Sidebar gauche | 300px, scroll, `max-height: calc(100dvh - 170px)` | hs-panel (V1) |

## 2. Palette de couleurs (tokens)

| Token B | Valeur | Usage |
|---------|--------|-------|
| `--hs-bg` | `#101012` | Fond principal du studio |
| `--hs-panel` | `#18181b` | Fond des panneaux |
| `--hs-panel2` | `#1f1f23` | Fond secondaire |
| `--hs-border` | `#27272a` | Bordures |
| `--hs-border2` | `#3f3f46` | Bordures secondaires |
| `--hs-text` | `#fafafa` | Texte principal |
| `--hs-muted` | `#a1a1aa` | Texte secondaire |
| `--hs-faint` | `#71717a` | Texte atténue |
| `--hs-accent` | `#ff6b21` | Accent orange |
| `--hs-accent-soft` | `rgba(255,107,33,.15)` | Fond accent doux |
| `--hs-radius` | `12px` | Radius standard |

Themes studio (outil seul, jamais le hero) :
- Deep Dark : `#0A0A0B` / `#FAFAFA`
- Grey : `#F4F4F5` / `#18181B`
- Light : `#FFFFFF` / `#18181B`

## 3. Typographie

| Propriete | B | A (actuel) |
|-----------|---|------------|
| Import fonts | Inter (400-900), Sora, Space Grotesk, JetBrains Mono, Instrument Serif | Inter (400-900), Sora, Space Grotesk, JetBrains Mono, Instrument Serif (via herostudio.css) |
| Titre principal | `text-[15px] font-bold` | `fontSize: 20, fontWeight: 700` |
| Sous-titre | `text-[11px]` | `fontSize: 13` |
| Labels | `text-[10px] uppercase tracking-[0.2em]` | `fontSize: 11, fontWeight: 700` |
| Body | `text-[12px]` / `text-[13px]` | `fontSize: 12-13` |
| Mono (code) | `font-mono text-[10px]` | non present |

## 4. Composants visuels

### 4.1 Barre haute (56px)
- Fond : `bg-[#18181b]` avec `backdrop-blur`
- Logo : `◉` orange + "Hero Studio" bold + badge "Versatile Engine" (`bg-[#FF6B21]/15 text-[#FF8A4D]`)
- Badge etat : `○ Attached` / `● Detached` (ambre)
- Devices : pills compactes avec icone + label
- Theme : 3 pastilles (☀/●/☾)
- Actions : Undo/Redo, Export, Publish (orange)

### 4.2 Sidebar gauche (300px)
- **Templates** : grille 3 colonnes, cartes `aspect-[4/3]` avec mini-CSS pur, selection orange avec ring
- **Layers · z-Index** : liste draggable avec poignee `⋮⋮`, nom, z-index, badges (TOP orange, 🔒, 👁/🚫, D/M hide-on), boutons Front/Back
- **Content** : inputs Kicker/Title/Description, toggles Price/Stock/Rating, commerce (prix, stock, rating, social proof)
- **Media** : grille 2x2 avec focal point draggable (dot orange), ratios 4/5, 1/1, 16/9
- **Add Block** : 5 boutons (Badge, Marquee, Countdown, Hotspot, Social Proof) avec etat actif orange

### 4.3 Canvas central
- Fond : dot-grid (radial-gradient pastilles, 14px spacing)
- Cadre : `rounded-[20px]`, `border`, `minHeight: Bn.h`
- Toolbar : `● Live Preview • dims • layout • sel:` + ratio slider (split) + Reset Attached
- Selection : cadre pointille orange avec 4 coins
- Animations d'entree : fade/slide/pop
- Filmstrip bas : minis + barre de progression
- Overflow detection : outline orange + message

### 4.4 Panneau droit (360px) — 5 onglets

**Style** : Radius (0-32), Gap (8-48), toggles Shadow/ThemeAware, Typography Quick, Tokens (Primary/Bg/Text)

**Type** : Font Library (+ Import), Global Font Control, per-block font/weight/lock, Overflow Behavior (wrap/shrink/truncate/auto), Lock/Hide (any element), Typography Details (lineHeight, letterSpacing, align, transform, maxWidth, balance/pretty)

**Effets** : Glass, Grain, Mesh toggles, Shape (rectangle/pill/arch/blob), preview

**Motion** : Entrance (none/fade/slide/pop), Parallax, Magnetic CTA, Timeline (Kicker 0ms/Title 120ms/CTA 240ms)

**Commerce** : produit (prix, stock, rating, social proof), toggles Price/Timer, Performance Budget (score 84, 1.2MB/3MB, LCP 1.1s), Responsive Art Direction

### 4.5 Etats vides / hints
- "No layer selected"
- "Select a text layer to see line height, spacing, align, transform, max-width, balance controls."
- "Select a text layer (Title, Description, Badge, Price) in left Layers pane or click text on canvas..."
- "Overflow mode X active on Y. Check canvas — orange outline if overflow detected."
- "Hidden on h preview. Shows label in canvas."
- "Different from eye visibility: Hide-on respects breakpoint, eye hides everywhere."

### 4.6 Badges
- "Versatile Engine" (orange sur fond orange/15)
- "○ Attached" / "● Detached" (ambre)
- "TOP" (orange, 9px)
- "z: N" (z-index)
- "🔒" (fontLocked)
- "👁" / "🚫" (visible/hidden)
- "Beta" (sur Responsive Art Direction)
- "Nouveauté • FW25" (kicker)
- "Score 84" (performance)
- "Ghosted 30% opacity"

## 5. Interactions

| Interaction | B | A (actuel) |
|-------------|---|------------|
| Drag & drop couches (swap z) | HTML5 DnD | Boutons Monter/Descendre |
| Front/Back (z max+1/min-1) | Boutons | Non present |
| Focal point draggable | Dot orange sur canvas, par media, par breakpoint | Non present |
| CTA magnetique (snap <6%, detach >28px) | Drag + snap | Drag + snap (snapHeroPoint) |
| Nudge clavier CTA | Fleches (1% / 5% Maj) | Present (onHandleKey) |
| Overflow detection | Outline orange + message | Non present |
| Undo/Redo | Ctrl+Z / Shift+Ctrl+Z / Ctrl+Y | Present (Ctrl+Z / Ctrl+Y) |
| Double-clic mot -> cycle font | MOCK_FONTS | Non present |
| Click Badge/CTA/Media -> selection + onglet | Present | Present (setLayerSel/setSelCta) |
| Hover zoom (1.06) | Present | Non present |
| Export/Copy/Download .zip | Mock (sans handler) | Non present (refuse) |

## 6. Motion / animations

| Animation | B | A (actuel) |
|-----------|---|------------|
| Keyframes | fadeIn, slideIn, popIn, marquee, pulse, grain-overlay, dot-grid | aucune (CSS transitions basiques) |
| Entrance | fade/slide/pop (selectable) | aucune |
| Parallax | 1x/1.2x/1.5x | non present |
| Magnetic CTA | snap to center | non present |
| Timeline | Kicker 0ms / Title 120ms / CTA 240ms | non present |
| Marquee | 12s linear infinite | 14s (V4) |
| Hotspot pulse | 1.8s | 1.5s (P6) |
| prefers-reduced-motion | marquee/hotspot none | present (global) |
| grain overlay | SVG 20px, opacity .35/.5 | non present |
| hover zoom | 0.5s, 1.06 | non present |

## 7. Performance / accessibilite

| Element | B | A (actuel) |
|---------|---|------------|
| Performance Budget | Score 84, 1.2MB/3MB, LCP 1.1s, barre 40% | HeroWeightCheck (composant) |
| Reduce primary image to 800w | Checkbox | Non present |
| Lazy secondary | Checkbox | Non present |
| Preload font | Checkbox | Non present |
| Responsive Art Direction | Desktop != Mobile image, focal points par breakpoint | Non present |
| role="timer" (countdown) | Non present dans mockup | Present dans A (HeroCountdown) |
| aria-label (hotspot) | Non present dans mockup | Present dans A (HotspotDot) |

## 8. Tokens CSS (herostudio.css)

```css
.hs-root {
  --hs-bg: #101012;
  --hs-panel: #18181b;
  --hs-panel2: #1f1f23;
  --hs-border: #27272a;
  --hs-border2: #3f3f46;
  --hs-text: #fafafa;
  --hs-muted: #a1a1aa;
  --hs-faint: #71717a;
  --hs-accent: #ff6b21;
  --hs-accent-soft: rgba(255,107,33,.15);
  --hs-radius: 12px;
}
```

Scrollbar : 8px, thumb `#3f3f46`, radius 999, track transparent.
Container queries : `container-type: inline-size`, `@container max560px` pour hero split.
Clamp : `clamp(1.6rem, 4.5cqi, 3.2rem)` pour titre.

---

Suite : `DIAG-C-correspondance-18102026.md` (correspondance A -> B + matrice).