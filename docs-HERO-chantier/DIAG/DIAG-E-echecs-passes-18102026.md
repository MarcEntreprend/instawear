# DIAG-E — Analyse des echecs passes

Date : 18/10/2026. Source : relecture de `docs-HERO-chantier/DIAG-studio-15claude-vs-mockup-15b-14102026.md`, `HERO-STUDIO-fonctionnalites-12102026.md`, `PLAN-studio-visuel-mockup-15102026.md`.

---

## 1. DIAG du 14/10 (DIAG-studio-15claude-vs-mockup-15b-14102026.md)

### Ce qu'il a fait
- Comparatif fonctionnel A vs B (sections 1-6)
- Liste des manques reels (6 items : presets CTA, duplicata, scroll, budget, notices, suppression verrouillee)
- Classification des nouveautes B (forte/moyenne/faible valeur)
- Refuses assumes (export/publish, video, freeform px)

### Pourquoi il n'a pas suffi
1. **Pas de specs CSS concretes** : le doc listait "barre haute 56px sticky" mais sans couleurs exactes, tailles, espacements. Le dev ne savait pas quoi ecrire.
2. **Pas de maquette applicative** : le doc comparait A et B en abstract, sans montrer comment B s'applique a A concretement.
3. **Pas de plan d'implementation** : aucune phase, aucune priorite d'execution, aucune estimation d'effort.
4. **Confusion mockup vs prod** : le doc ne distinguait pas clairement le mockup statique (Hero-Studio-Versatile-Engine-02.html) de l'editeur prod 15-b (HeroStudioEditor.tsx). Cela a cree de la confusion sur ce qui etait "a copier".

### Ce qu'il faut faire differemment
- Fournir des **regles CSS applicables directement** (tokens, valeurs exactes, classes).
- Distinguer clairement le **mockup** (inspiration) de la **prod 15-b** (reference fonctionnelle).
- Inclure un **plan d'implementation par phases** avec verification a chaque etape.

---

## 2. HERO-STUDIO-fonctionnalites-12102026.md

### Ce qu'il a fait
- Cahier des charges fonctionnel de A (backend, RLS, schema, API)
- Description des fonctionnalites existantes (couches, CTA, templates, historique, stats)

### Pourquoi il n'a pas suffi
1. **Centré backend/RLS** : le doc decrit les migrations, les policies, les fonctions SQL. Il ne decrit pas l'UI admin.
2. **Aucune reference visuelle B** : le doc ne mentionne pas le mockup ni le style de B.
3. **Pas de comparaison** : le doc decrit A seul, sans reference externe.

### Ce qu'il faut faire differemment
- Separer le cahier des charges fonctionnel (backend) du cahier des charges visuel (UI).
- Inclure une reference visuelle B dans le cahier des charges UI.
- Comparer A et B point par point.

---

## 3. PLAN-studio-visuel-mockup-15102026.md

### Ce qu'il a fait
- Plan V1->V5 (barre haute, grille 3 colonnes, canvas, onglets, polish)
- Phases verifiables (tsc + tests + build + smoke a chaque phase)
- Commit par phase

### Pourquoi il est reste partiel
1. **V1->V5 appliques mais apparence globale inchangee** : les phases ont ameliore la structure (barre haute, grille, canvas, onglets) mais n'ont pas change la palette, les rayons, les transitions, les etats vides. Le studio ressemble toujours a A, pas a B.
2. **Pas de specs CSS exactes** : les phases disaient "barre haute 56px" mais sans couleur de fond, sans rayon, sans ombre, sans transition.
3. **Pas de verification visuelle** : les phases verifiaient tsc/tests/build mais pas l'apparence (pas de screenshot, pas de comparaison visuelle).
4. **Pas de token table** : les couleurs et tailles etaient mentionnees en prose, pas en table de tokens applicables.

### Ce qu'il faut faire differemment
- Fournir une **table de tokens CSS** avec valeurs exactes (B vs A actuel).
- Inclure une **checklist d'evaluation visuelle** (skill high-end-visual-design).
- Verifier l'apparence a chaque phase (screenshot, comparaison visuelle).
- Integrer le skill comme grille d'evaluation, pas comme appendice.

---

## 4. Synthese : ce qui a manque a chaque fois

| Manque | DIAG 14/10 | HERO-STUDIO 12/10 | PLAN 15/10 |
|--------|-----------|-------------------|------------|
| Specs CSS exactes | Non | Non | Non |
| Maquette applicative | Non | Non | Partiel (V1->V5) |
| Plan d'implementation | Non | Non | Oui (V1->V5) |
| Quantification fonctionnelle | Non | Non | Non |
| Checklist d'evaluation visuelle | Non | Non | Non |
| Distinction mockup vs prod | Non | N/A | Non |
| Verification visuelle | Non | Non | Non |

---

## 5. Ce qu'il faut faire differemment cette fois

1. **Specs CSS exactes** : table de tokens avec valeurs B vs A actuel (voir DIAG-F).
2. **Maquette applicative** : pour chaque zone, montrer comment B s'applique a A concretement (table de correspondance DIAG-C).
3. **Quantification fonctionnelle** : compteurs par zone (voir DIAG-A).
4. **Checklist d'evaluation visuelle** : integree dans l'etape 7 (voir DIAG-F).
5. **Distinction mockup vs prod** : clairement documentee (voir DIAG-B section 1).
6. **Verification visuelle** : screenshot + comparaison a chaque phase.
7. **Diagnostic en plusieurs fichiers** : eviter les docs trop longs (voir plan section 7).

---

Suite : `DIAG-F-tokens-css-18102026.md` (tokens CSS + checklist skill + phases).