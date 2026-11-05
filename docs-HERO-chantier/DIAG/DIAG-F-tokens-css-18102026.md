# DIAG-F — Tokens CSS + checklist skill + phases d'implementation

Date : 18/10/2026. Source : DIAG-A (inventaire A) + DIAG-B (inventaire visuel B) + DIAG-C (correspondance) + skill `high-end-visual-design`. Plan : `PLAN-studio-15claude-vs-mockup-15b-18102026.md`.

---

## 1. Table de tokens CSS (B vs A actuel)

Pour chaque zone de A, les modifications CSS applicables directement pour ressembler a B :

| Token | Valeur B | Valeur A actuelle | Zone | Action |
|-------|----------|-------------------|------|--------|
| `--hs-bg` | `#101012` | `var(--color-surface2)` | Conteneur racine | Remplacer |
| `--hs-panel` | `#18181b` | `var(--color-surface)` | Panneaux | Remplacer |
| `--hs-panel2` | `#1f1f23` | `var(--color-surface2)` | Fond secondaire | Remplacer |
| `--hs-border` | `#27272a` | `var(--color-border)` | Bordures | Remplacer |
| `--hs-border2` | `#3f3f46` | `var(--color-border2)` | Bordures secondaires | Remplacer |
| `--hs-text` | `#fafafa` | `var(--color-ink)` | Texte principal | Remplacer |
| `--hs-muted` | `#a1a1aa` | `var(--color-ink3)` | Texte secondaire | Remplacer |
| `--hs-faint` | `#71717a` | `var(--color-ink4)` | Texte attenué | Remplacer |
| `--hs-accent` | `#ff6b21` | `var(--color-accent)` | Accent orange | Verifier equivalence |
| `--hs-accent-soft` | `rgba(255,107,33,.15)` | `var(--color-accent-soft)` | Fond accent doux | Verifier equivalence |
| `--hs-radius` | `12px` | `16px` | Radius standard | Remplacer |
| `--hs-font-family` | `Inter, Sora, Space Grotesk, JetBrains Mono, Instrument Serif` | `var(--font-body)` | Typographie | Verifier |
| `--hs-transition` | `cubic-bezier(0.32,0.72,0,1)` | `0.15s ease` | Transitions | Remplacer |
| `--hs-section-py` | `py-24` a `py-40` | `gap: 14` | Espacement sections | Remplacer |
| `--hs-scrollbar-w` | `8px` | `thin` | Scrollbar | Remplacer |
| `--hs-focus` | `2px solid #FF6B21` | `2px solid var(--hs-accent)` | Focus-visible | Verifier |
| `--hs-empty` | `1.5px dashed border` | `.hs-empty` existant | Affiner |

### Tokens specifiques B non presents dans A

| Token | Valeur B | Usage | Action |
|-------|----------|-------|--------|
| `--hs-bg` (Deep Dark) | `#0A0A0B` | Theme studio dark | Deja present (studioTheme) |
| `--hs-bg` (Grey) | `#F4F4F5` | Theme studio grey | Deja present (studioTheme) |
| `--hs-bg` (Light) | `#FFFFFF` | Theme studio light | Deja present (studioTheme) |

---

## 2. Checklist d'evaluation visuelle (skill high-end-visual-design)

Pour chaque zone de A, verifier apres application des tokens :

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

## 3. Plan d'implementation par phases (V6, V7, V8...)

### Phase V6 — Tokens et palette (fondation)
- Remplacer les tokens `--color-*` par les tokens `--hs-*` dans le bloc `<style>` de `HeroStudioPage.tsx`
- Appliquer les couleurs B (#101012, #18181b, #1f1f23, #27272a, #3f3f46, #fafafa, #a1a1aa, #71717a, #ff6b21)
- Verifier que les 3 themes studio (Light/Grey/Dark) fonctionnent toujours
- **Verification** : tsc + tests + build + smoke + screenshot desktop/mobile

### Phase V7 — Typographie et espacement
- Appliquer la typographie B (tailles, graisses, tracking, clamp)
- Appliquer le macro-whitespace (py-24 a py-40 pour les sections)
- Appliquer les eyebrow tags aux titres de sections
- **Verification** : tsc + tests + build + smoke + screenshot desktop/mobile

### Phase V8 — Composants et interactions
- Appliquer le Double-Bezel aux cartes (sidebar Layers, panneau droit)
- Appliquer le Button-in-Button aux boutons primaires
- Appliquer les transitions custom (cubic-bezier)
- Appliquer le scrollbar fin (8px)
- Appliquer les etats vides (hs-empty)
- **Verification** : tsc + tests + build + smoke + screenshot desktop/mobile

### Phase V9 — Motion et animations
- Ajouter les animations d'entree (fade-up + blur)
- Ajouter le hover zoom (1.06)
- Ajouter le grain overlay (SVG 20px, opacity .35/.5)
- Verifier prefers-reduced-motion
- **Verification** : tsc + tests + build + smoke + screenshot desktop/mobile

### Phase V10 — Verification finale
- Comparaison visuelle A vs B (screenshot cote a cote)
- Checklist skill (11 items) completee
- Tests 920/920 verts
- Build vert
- Smoke preview 200

---

## 4. Ce que ce document NE fait pas

- Il ne modifie aucun fichier source.
- Il ne lance aucun diagnostic de code.
- Il ne decide pas encore quelles nouveautes de B seront implementees (voir DIAG-D).

Ce document est la **derniere etape** du diagnostic. Apres son execution, le changement visuel peut commencer (phases V6->V10).