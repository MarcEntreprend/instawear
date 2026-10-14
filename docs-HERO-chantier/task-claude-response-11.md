# Lot 15 : couche Tuiles jusqu'à 5 tuiles

Aucune migration (38, 39 et 44+ restent libres), aucune nouvelle dépendance, aucun nouveau fichier hors tests. Rien n'a été exécuté ici : lint, tests et build sont à lancer chez toi.

**Ce qui change**

- Le plafond de la couche Tuiles passe de 3 à 5.
- Les dispositions **Bento, Asymétrique, Bandeau et Mosaïque** ont chacune un tracé dédié pour 4 et 5 tuiles. Chaque tracé pave la grille sans case vide ni chevauchement (le test du lot 11 le vérifie, étendu à 0–5).
- Les vignettes du sélecteur affichent le nombre réel de tuiles du slide, au lieu de 3 fixes.
- Un avertissement « info » apparaît au-dessus de 4 tuiles quand le hero est trop bas pour qu'elles restent lisibles.

**Décisions que je déclare**

- **Tracés 1–3 inchangés** : les nouveaux cas sont traités par un retour anticipé avant le `switch` existant, que je ne touche pas. Tes slides actuels ne bougent donc pas d'un pixel. Un test fige les valeurs actuelles.
- **Miroir legacy resté à 3** : le backfill SQL de la migration 34 plafonne à 3 (`q.rn <= 3`), et le miroir TS doit rester l'équivalent exact du SQL. Après enregistrement d'un slide à 5 tuiles, la colonne `hero_promotions.tiles` n'en garde que 3. C'est voulu : la boutique, le prerender et le studio lisent la `config`.
- **Mobile inchangé** : la rangée de tuiles défile horizontalement, donc 5 tuiles passent sans modification.
- **Poids de la config** : 5 tuiles pèsent environ 1 Ko de plus, très loin du plafond de 20 000 octets.

---

## 1. `src/lib/heroSchema.ts` : 2 modifications

1. Remplace la ligne `export const HERO_MAX_TILES = 3;` par :

```ts
export const HERO_MAX_TILES = 5;
/** Colonne legacy `tiles` + backfill SQL 20261034 : 3 au plus. Le miroir TS reste l'équivalent exact du SQL. */
export const HERO_MAX_TILES_LEGACY = 3;
```

2. Dans `buildHeroConfigFromLegacy`, repère le bloc qui **commence** par `for (const t of Array.isArray(l.tiles) ? l.tiles : []) {` : sa ligne suivante est `      if (items.length >= HERO_MAX_TILES) break;`. Remplace **cette ligne-là** (pas celle de `sanitizeLayerCore`, qui boucle sur `raw.items`) par :

```ts
if (items.length >= HERO_MAX_TILES_LEGACY) break;
```

## 2. `src/lib/heroGrid.ts` : 3 modifications

1. Remplace la ligne `  const count = Math.max(0, Math.min(3, Math.floor(n)));` par :

```ts
const count = Math.max(0, Math.min(5, Math.floor(n)));
```

2. Juste après la ligne `  if (count === 0) return { cols: "1fr", rows: "1fr", main: cell("1", "1"), items: [] };`, ajoute :

```ts
// 4 et 5 tuiles : tracés dédiés (les cas 1 à 3 restent traités par le switch ci-dessous, inchangés).
if (count >= 4) return tilesLayoutMany(variant, count);
```

3. À la **toute fin du fichier**, ajoute :

```ts
/** 4 ou 5 tuiles avec visuel principal. Chaque tracé couvre toute la grille, sans trou ni chevauchement. */
function tilesLayoutMany(
  variant: HeroTilesVariant,
  count: number,
): TilesLayout {
  const five = count >= 5;
  switch (variant) {
    case "bento":
      return five
        ? {
            cols: "repeat(4, 1fr)",
            rows: "repeat(3, 1fr)",
            main: cell("1 / span 2", "1 / span 3"),
            items: [
              cell("3 / span 2", "1"),
              cell("3", "2"),
              cell("4", "2"),
              cell("3", "3"),
              cell("4", "3"),
            ],
          }
        : {
            cols: "repeat(4, 1fr)",
            rows: "repeat(2, 1fr)",
            main: cell("1 / span 2", "1 / span 2"),
            items: [
              cell("3", "1"),
              cell("4", "1"),
              cell("3", "2"),
              cell("4", "2"),
            ],
          };
    case "asym":
      return five
        ? {
            cols: "1.6fr 1fr 1fr",
            rows: "repeat(3, 1fr)",
            main: cell("1", "1 / span 3"),
            items: [
              cell("2", "1 / span 2"),
              cell("2", "3"),
              cell("3", "1"),
              cell("3", "2"),
              cell("3", "3"),
            ],
          }
        : {
            cols: "1.6fr 1fr 1fr",
            rows: "repeat(2, 1fr)",
            main: cell("1", "1 / span 2"),
            items: [
              cell("2", "1"),
              cell("3", "1"),
              cell("2", "2"),
              cell("3", "2"),
            ],
          };
    case "strip":
      return {
        cols: `repeat(${count}, 1fr)`,
        rows: "2fr 1fr",
        main: cell("1 / -1", "1"),
        items: Array.from({ length: count }, (_, i) =>
          cell(String(i + 1), "2"),
        ),
      };
    case "mosaic":
      return {
        cols: "repeat(6, 1fr)",
        rows: "repeat(2, 1fr)",
        main: cell("1 / span 3", "1 / span 2"),
        items: five
          ? [
              cell("4", "1"),
              cell("5", "1"),
              cell("6", "1"),
              cell("4 / span 2", "2"),
              cell("6", "2"),
            ]
          : [
              cell("4 / span 2", "1"),
              cell("6", "1"),
              cell("4", "2"),
              cell("5 / span 2", "2"),
            ],
      };
    default: // "split" : vignettes du sélecteur uniquement (le rendu garde le code historique)
      return {
        cols: "2fr 1fr",
        rows: `repeat(${count}, 1fr)`,
        main: cell("1", `1 / span ${count}`),
        items: Array.from({ length: count }, (_, i) =>
          cell("2", String(i + 1)),
        ),
      };
  }
}
```

## 3. `src/admin/HeroGridPicker.tsx` : 2 modifications

1. Remplace le bloc qui **commence** par `export default function HeroGridPicker({` et se termine par la ligne `}) {` (juste avant `const current = TILES_VARIANTS.find`) par :

```tsx
export default function HeroGridPicker({
  value,
  count = 3,
  onChange,
}: {
  value: HeroTilesVariant;
  /** Nombre de tuiles du slide : les vignettes montrent la disposition réelle (1 à 5). */
  count?: number;
  onChange: (v: HeroTilesVariant) => void;
}) {
```

2. Remplace la ligne `          const L = tilesLayout(v.value, 3, true);` par :

```tsx
const L = tilesLayout(v.value, count, true);
```

## 4. `src/admin/HeroStudioPage.tsx` : 1 modification

Dans `LayerEditor`, branche `tiles`, juste après la ligne `            value={layer.variant ?? "split"}` (dans `<HeroGridPicker`), ajoute :

```tsx
            count={Math.min(5, Math.max(1, layer.items.length))}
```

Le libellé `Tuiles ({layer.items.length}/{HERO_MAX_TILES})` et le bouton « Ajouter une tuile » suivent la constante : rien d'autre à changer.

## 5. `src/lib/heroQuality.ts` : 1 modification

Remplace les deux **dernières lignes du fichier** (`  return w;` puis `}`, qui terminent `heroQualityWarnings`) par :

```ts
  // Tuiles nombreuses : trop petites si le hero est bas (zone utile ≈ hauteur − 190 px de marges).
  const manyTiles = layers.find(
    (l): l is Extract<HeroLayer, { type: "tiles" }> => l.type === "tiles" && l.items.length >= 4,
  );
  if (manyTiles) {
    const s = c.sizing;
    const low =
      s.mode === "fixed"
        ? s.height.unit === "vh"
          ? s.height.value < 70
          : s.height.value < 600
        : s.ratio.desktop > 2.2;
    if (low) {
      w.push({
        level: "info",
        text: "Quatre tuiles ou plus : prévois au moins 70 vh (ou 600 px) de hauteur pour qu'elles restent lisibles.",
      });
    }
  }
  return w;
}
```

---

## 6. Tests

### 6.1 `tests/hero-schema.test.ts` : 2 modifications

1. Remplace la ligne `test("tiles : 3 max, image invalide écartée, lien externe vidé", () => {` par :

```ts
test("tiles : image invalide écartée, lien externe vidé (plafond testé au lot 15)", () => {
```

2. Dans ce même test, remplace la ligne `  assert.equal(t.items.length, 3);` par :

```ts
assert.equal(t.items.length, 4); // 5 saisies, 1 image invalide écartée
```

### 6.2 `tests/hero-lot11.test.ts` : 1 modification

Remplace la ligne `    for (let n = 0; n <= 3; n++) {` (test « chaque disposition pave la grille ») par :

```ts
    for (let n = 0; n <= 5; n++) {
```

### 6.3 `tests/hero-lot15.test.ts` (nouveau)

```ts
// tests/hero-lot15.test.ts — Tuiles jusqu'à 5 : plafond, miroir legacy, tracés 1-3 figés, 4-5 distincts, avertissement.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  HERO_MAX_TILES,
  HERO_MAX_TILES_LEGACY,
  buildHeroConfigFromLegacy,
  sanitizeHeroConfig,
} from "../src/lib/heroSchema.ts";
import { TILES_VARIANTS, tilesLayout } from "../src/lib/heroGrid.ts";
import { heroQualityWarnings } from "../src/lib/heroQuality.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const IMG = "https://cdn.example.com/a.webp";

const tilesCfg = (n: number, extra: Record<string, unknown> = {}) =>
  sanitizeHeroConfig({
    origin: "studio",
    ...extra,
    layers: [
      {
        type: "tiles",
        main: { src: IMG },
        items: Array.from({ length: n }, () => ({ src: IMG })),
      },
    ],
  });

test("schéma : plafond 5 tuiles, idempotent ; le miroir legacy reste à 3 (comme le backfill SQL)", () => {
  assert.equal(HERO_MAX_TILES, 5);
  assert.equal(HERO_MAX_TILES_LEGACY, 3);
  const c = tilesCfg(9);
  assert.equal((c.layers[0] as any).items.length, 5);
  assert.deepEqual(sanitizeHeroConfig(c), c);
  const g = buildHeroConfigFromLegacy({
    kind: "grid",
    layout: "split",
    image: IMG,
    headline: "x",
    tiles: Array.from({ length: 5 }, () => ({ image: IMG })),
  }).layers[0] as any;
  assert.equal(g.items.length, 3);
});

test("tracés 1 à 3 : valeurs historiques figées (aucun slide existant ne bouge)", () => {
  assert.deepEqual(tilesLayout("bento", 3, true), {
    cols: "repeat(4, 1fr)",
    rows: "repeat(2, 1fr)",
    main: { col: "1 / span 2", row: "1 / span 2" },
    items: [
      { col: "3 / span 2", row: "1" },
      { col: "3", row: "2" },
      { col: "4", row: "2" },
    ],
  });
  assert.deepEqual(tilesLayout("asym", 3, true), {
    cols: "1.6fr 1fr",
    rows: "1fr 2fr 1fr",
    main: { col: "1", row: "1 / span 3" },
    items: [
      { col: "2", row: "1" },
      { col: "2", row: "2" },
      { col: "2", row: "3" },
    ],
  });
  assert.deepEqual(tilesLayout("mosaic", 2, true).items, [
    { col: "4 / span 3", row: "1" },
    { col: "4 / span 3", row: "2" },
  ]);
  const strip = tilesLayout("strip", 3, true);
  assert.equal(strip.cols, "repeat(3, 1fr)");
  assert.equal(strip.rows, "2fr 1fr");
});

test("tracés 4 et 5 : bon nombre de tuiles et dispositions toutes différentes", () => {
  for (const n of [4, 5]) {
    for (const v of TILES_VARIANTS) {
      assert.equal(
        tilesLayout(v.value, n, true).items.length,
        n,
        `${v.value}/${n}`,
      );
    }
    const sigs = new Set(
      TILES_VARIANTS.map((v) => JSON.stringify(tilesLayout(v.value, n, true))),
    );
    assert.equal(
      sigs.size,
      TILES_VARIANTS.length,
      `dispositions distinctes à ${n} tuiles`,
    );
  }
  // Sans visuel principal, 5 tuiles se partagent la largeur.
  const L = tilesLayout("bento", 5, false);
  assert.equal(L.cols, "repeat(5, 1fr)");
  assert.equal(L.items.length, 5);
});

test("qualité : 4 tuiles ou plus + hero bas => info ; hero assez haut ou 3 tuiles => rien", () => {
  const fixed = (value: number, unit: "vh" | "px" = "vh") => ({
    sizing: { mode: "fixed", width: "full", height: { unit, value } },
  });
  const has = (c: ReturnType<typeof tilesCfg>) =>
    heroQualityWarnings(c).some(
      (w) => w.level === "info" && /tuiles/.test(w.text),
    );
  assert.equal(has(tilesCfg(4, fixed(60))), true);
  assert.equal(has(tilesCfg(5, fixed(500, "px"))), true);
  assert.equal(has(tilesCfg(4, fixed(78))), false);
  assert.equal(has(tilesCfg(4, fixed(700, "px"))), false);
  assert.equal(has(tilesCfg(3, fixed(60))), false);
  assert.equal(
    has(
      tilesCfg(4, {
        sizing: {
          mode: "auto",
          width: "full",
          ratio: { desktop: 2.6, mobile: 0.9 },
        },
      }),
    ),
    true,
  );
});

test("garde : le sélecteur reçoit le nombre réel de tuiles", () => {
  assert.ok(
    read("src/admin/HeroGridPicker.tsx").includes(
      "tilesLayout(v.value, count, true)",
    ),
  );
  assert.ok(
    read("src/admin/HeroStudioPage.tsx").includes(
      "count={Math.min(5, Math.max(1, layer.items.length))}",
    ),
  );
});
```

---

## Vérifications, dans l'ordre

1. Appliquer les sections 1 à 6, puis `npm run lint`, `npm test`, `npm run build`.
2. **Tes slides à 1, 2 ou 3 tuiles** : boutique desktop et mobile, thèmes clair et sombre. Aucun changement attendu.
3. **Studio, aperçu Desktop** : couche Tuiles, ajoute jusqu'à 5 tuiles (le bouton disparaît à 5). Passe chacune des 5 dispositions avec 4, puis 5 tuiles. Le rendu doit suivre la vignette, sans trou. Les vignettes doivent se mettre à jour quand tu ajoutes ou retires une tuile.
4. **Avertissement** : avec 4 tuiles et une hauteur de 60 vh, l'info « Quatre tuiles ou plus… » apparaît sous l'aperçu. À 78 vh, elle disparaît.
5. **Aperçu Mobile avec 5 tuiles** : le visuel principal, puis une rangée qui défile horizontalement.
6. **Enregistrer, recharger le studio, recharger la boutique** : les 5 tuiles doivent persister. La colonne legacy `tiles` n'en gardera que 3, c'est attendu.

## Reste

| Chantier                                                                             | État                                                                            |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Mesures Lighthouse avant/après lot 13                                                | Ton côté, en cours. Si le gain de LCP est nul, nous retirons la complexité DSD. |
| Rétention de `engagement_events` (purge quotidienne)                                 | Après la fusion prod, avec le cron                                              |
| Cron Deploy Hook en prod                                                             | Fusion prod                                                                     |
| Retrait des colonnes legacy `html`/`css` de `hero_promotions` et du trigger de garde | Fusion prod (décision close)                                                    |

Plus rien d'autre n'est planifié côté code. Dis-moi ce que donnent tes tests 2 à 5 et le Lighthouse, et je corrige ou je simplifie selon le résultat.
