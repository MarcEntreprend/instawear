# Lot 16 : gabarits un clic « grilles »

Rien ne bouge côté base (migrations 38, 39 et 44+ restent libres) ni côté dépendances. Rien n'a été exécuté ici : lint, tests et build sont à lancer chez toi.

**Ce que fait ce lot**

- Quatre gabarits dans « Nouveau slide », à côté des cinq existants. Chacun est une couche Tuiles complète, avec visuel principal, tuiles d'exemple et sans bouton :
  - **Bento** : 3 tuiles.
  - **Asymétrique** : 3 tuiles.
  - **Mosaïque** (ton « masonry », à largeurs inégales) : 3 tuiles.
  - **Grille 5 tuiles** : Bento à 5 tuiles, avec un hero à 85 vh pour éviter l'avertissement de hauteur du lot 15.
- Un avertissement « warn » quand une tuile utilise encore l'image d'exemple `placehold.co`. C'est le même placeholder que le bouton « Ajouter une tuile ». Sans cet avertissement, un gabarit publié sans retouche afficherait des carrés d'exemple en boutique.

**Choix que je déclare**

- Les nouveaux gabarits vivent dans un tableau séparé (`HERO_TILES_TEMPLATES`) fusionné à l'affichage. Je ne touche pas à `HERO_TEMPLATES`, donc le test du lot 2 (« chaque modèle donne une config valide ») reste intact.
- Le visuel principal reprend l'image du produit (`src: null`). Choisis un produit dans la section « Slide », sinon l'avertissement « Aucun visuel » s'affiche. Les tuiles d'exemple suffisent en revanche à rendre le slide publiable sans produit, d'où l'avertissement placehold.
- Les images d'exemple viennent d'un hôte externe. Si ton `img-src` de CSP le refuse, les tuiles apparaîtront vides en aperçu : dis-le-moi et je remplace par un data-URI.

---

## 1. `src/lib/heroStudio.ts` : 3 modifications

1. Juste après la ligne `import { heroQualityWarnings } from "./heroQuality.ts";`, ajoute :

```ts
import type { HeroTilesVariant } from "./heroGrid.ts";
```

2. Juste **avant** la ligne `export function newLayer(type: "image" | "card" | "tiles" | "text"): HeroLayer {`, ajoute :

```ts
// ─── Gabarits « grilles » : couche Tuiles complète (visuel principal + tuiles d'exemple) ────────
const PLACEHOLDER_TILE = "https://placehold.co/400x400";

function tilesTemplate(
  variant: HeroTilesVariant,
  n: number,
  vh = 78,
): HeroConfig {
  return sanitizeHeroConfig({
    origin: "studio",
    sizing: { mode: "fixed", width: "full", height: { unit: "vh", value: vh } },
    layers: [
      {
        type: "tiles",
        main: {
          src: null,
          link: null,
          label: SAMPLE.headline.split("\n")[0],
          ctaLabel: SAMPLE.cta,
          fromProduct: true,
        },
        items: Array.from({ length: n }, (_, i) => ({
          src: PLACEHOLDER_TILE,
          label: `Tuile ${i + 1}`,
          link: null,
        })),
        ...(variant === "split" ? {} : { variant }),
      },
    ],
    ctas: [],
  });
}

export const HERO_TILES_TEMPLATES: HeroTemplate[] = [
  {
    id: "bento",
    label: "Bento",
    desc: "Visuel principal en grand + 3 tuiles de tailles différentes.",
    build: () => tilesTemplate("bento", 3),
  },
  {
    id: "asym",
    label: "Asymétrique",
    desc: "Visuel principal + colonne de 3 tuiles, la centrale plus haute.",
    build: () => tilesTemplate("asym", 3),
  },
  {
    id: "mosaic",
    label: "Mosaïque",
    desc: "Grille de 6 colonnes, tuiles de largeurs inégales (effet masonry).",
    build: () => tilesTemplate("mosaic", 3),
  },
  {
    id: "tiles5",
    label: "Grille 5 tuiles",
    desc: "Bento à 5 tuiles (hero plus haut : 85 vh).",
    build: () => tilesTemplate("bento", 5, 85),
  },
];
```

3. Dans `heroStudioWarnings`, juste **avant** la ligne `  const bytes = heroConfigBytes(c);`, ajoute :

```ts
if (
  c.layers.some(
    (l) =>
      !l.off &&
      l.type === "tiles" &&
      l.items.some((t) => t.src.includes("placehold.co")),
  )
) {
  w.push({
    level: "warn",
    text: "Une tuile utilise encore l'image d'exemple (placehold.co) : remplace-la avant de publier.",
  });
}
```

## 2. `src/admin/HeroStudioPage.tsx` : 2 modifications

1. Dans le bloc d'import qui vient de `"../lib/heroStudio"`, juste après la ligne `  HERO_TEMPLATES,`, ajoute :

```tsx
  HERO_TILES_TEMPLATES,
```

2. Remplace la ligne qui contient `{HERO_TEMPLATES.map((t) => (` (dans le panneau « Nouveau slide », `showTemplates`) par :

```tsx
              {[...HERO_TEMPLATES, ...HERO_TILES_TEMPLATES].map((t) => (
```

---

## 3. Tests : nouveau fichier `tests/hero-lot16.test.ts`

```ts
// tests/hero-lot16.test.ts — gabarits « grilles » : config valide, publiable sans produit, avertissement placeholder.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { resolveHeroSlides } from "../src/lib/heroResolve.ts";
import { heroQualityWarnings } from "../src/lib/heroQuality.ts";
import {
  HERO_TEMPLATES,
  HERO_TILES_TEMPLATES,
  heroConfigToLegacy,
  heroStudioWarnings,
} from "../src/lib/heroStudio.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

const EXPECT: Record<string, { variant: string; n: number }> = {
  bento: { variant: "bento", n: 3 },
  asym: { variant: "asym", n: 3 },
  mosaic: { variant: "mosaic", n: 3 },
  tiles5: { variant: "bento", n: 5 },
};

test("gabarits grilles : config valide, idempotente, bon variant et bon nombre de tuiles", () => {
  assert.deepEqual(
    HERO_TILES_TEMPLATES.map((t) => t.id).sort(),
    Object.keys(EXPECT).sort(),
  );
  for (const t of HERO_TILES_TEMPLATES) {
    const c = t.build();
    assert.equal(c.origin, "studio");
    assert.deepEqual(sanitizeHeroConfig(c), c);
    const layer: any = c.layers[0];
    assert.equal(c.layers.length, 1);
    assert.equal(layer.type, "tiles");
    assert.equal(layer.variant, EXPECT[t.id].variant);
    assert.equal(layer.items.length, EXPECT[t.id].n);
    assert.deepEqual(c.ctas, []);
    assert.equal(heroConfigToLegacy(c).kind, "grid");
  }
});

test("gabarits grilles : identifiants uniques avec les gabarits existants", () => {
  const ids = [...HERO_TEMPLATES, ...HERO_TILES_TEMPLATES].map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("gabarits grilles : publiable sans produit (les tuiles portent le visuel)", () => {
  for (const t of HERO_TILES_TEMPLATES) {
    const slides = resolveHeroSlides(
      [{ id: "s", order: 0, isActive: true, productId: "", config: t.build() }],
      [],
    );
    assert.equal(slides.length, 1, t.id);
  }
});

test("gabarit 5 tuiles : hero assez haut, aucun avertissement de hauteur", () => {
  const c = HERO_TILES_TEMPLATES.find((t) => t.id === "tiles5")!.build();
  assert.equal((c.sizing as any).height.value, 85);
  assert.ok(!heroQualityWarnings(c).some((w) => /tuiles/.test(w.text)));
});

test("avertissement : image d'exemple placehold.co => warn ; image réelle => rien", () => {
  const sample = HERO_TILES_TEMPLATES[0].build();
  const w = heroStudioWarnings(sample, { isFirst: false, hasProduct: true });
  assert.ok(w.some((x) => x.level === "warn" && /placehold\.co/.test(x.text)));

  const real = sanitizeHeroConfig({
    origin: "studio",
    layers: [
      {
        type: "tiles",
        main: { src: "https://cdn.example.com/m.webp" },
        items: [{ src: "https://cdn.example.com/a.webp" }],
      },
    ],
  });
  assert.ok(
    !heroStudioWarnings(real, { isFirst: false, hasProduct: true }).some((x) =>
      /placehold\.co/.test(x.text),
    ),
  );

  const off = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ ...(sample.layers[0] as object), off: true }],
  });
  assert.ok(
    !heroStudioWarnings(off, { isFirst: false, hasProduct: true }).some((x) =>
      /placehold\.co/.test(x.text),
    ),
  );
});

test("garde : le panneau « Nouveau slide » affiche les deux listes de gabarits", () => {
  const p = read("src/admin/HeroStudioPage.tsx");
  assert.ok(p.includes("[...HERO_TEMPLATES, ...HERO_TILES_TEMPLATES].map"));
});
```

---

## Vérifications

1. Appliquer les sections 1 à 3, puis `npm run lint`, `npm test`, `npm run build`.
2. **Studio, « Nouveau slide »** : les neuf gabarits sont listés, puis « Mes modèles » s'il y en a. Pour chaque grille, l'aperçu Desktop doit montrer la disposition annoncée, avec 3 puis 5 tuiles d'exemple, et le visuel principal doit reprendre le produit choisi.
3. **Avertissement** : sous l'aperçu, « Une tuile utilise encore l'image d'exemple… » doit s'afficher tant qu'une tuile garde `placehold.co`. Remplace les images : il disparaît.
4. **Sélecteur de disposition** : sur un slide créé depuis « Mosaïque », la couche Tuiles doit présenter « Mosaïque » comme sélectionnée. Essaie d'en changer, puis reviens : la config doit rester valide.

## Reste

Plus rien n'est planifié côté code. La suite attend ta fusion en production :

- rétention des `engagement_events` (purge quotidienne) ;
- cron du Deploy Hook ;
- retrait des colonnes `html`/`css` de `hero_promotions` et du trigger de garde.

Dis-moi ce que donne le Lighthouse avant/après le lot 13. S'il est neutre, nous retirons la complexité DSD plutôt que de la garder.
