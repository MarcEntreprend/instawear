# Hero Studio : lot 11 (variantes de grille) et lot 12 (contrôle qualité)

Ces deux lots n'ont **aucune migration SQL**. Tout tient dans la config jsonb existante, donc le numéro 43 reste pris et rien ne se heurte à ton historique.

**Ce qui change :**

1. **Lot 11, variantes de la couche « Tuiles »** : `Bento`, `Asymétrique`, `Bandeau`, `Mosaïque`, en plus de la disposition actuelle (`split`, la valeur par défaut). Les variantes s'appliquent à partir de 640 px. Sur mobile, toutes se rangent comme aujourd'hui : visuel principal puis rangée de tuiles. Une grille « masonry » à hauteurs naturelles ferait varier la hauteur du hero (CLS), donc la _Mosaïque_ donne le même effet avec des largeurs inégales.
2. **Lot 12, contrôle qualité** : contraste du texte sur le fond, `alt` manquant, libellés de boutons trop longs. Ces avertissements s'affichent sous l'aperçu.
3. **Correctif thème sombre, déclaré.** Sur un fond clair (Crème, Sable doré), le texte « sombre » utilisait `var(--color-ink)`. En thème sombre, cette variable devient **claire** : texte pâle sur fond pâle. Je le remplace par une encre fixe (`#1a1916`), parce que les dégradés du hero ne changent pas avec le thème. **En thème clair, c'est strictement identique.**

**Rendu inchangé pour tes slides existants.** Le mode `split` reste le code historique à l'identique, et la clé `variant` n'est écrite que si elle est posée.

---

# Lot 11 : variantes de grille

## 11.1 `src/lib/heroSchema.ts` : 2 modifications

**1)** Juste après la ligne `  items: HeroTile[];` (dans `HeroTilesLayer`), ajoute :

```ts
  /** Disposition ≥ 640 px. Absent = "split" (historique, rendu inchangé). Jamais écrit si "split". */
  variant?: "split" | "bento" | "asym" | "strip" | "mosaic";
```

**2)** Remplace la ligne `      return { type: "tiles", main, items };` par :

```ts
const variant = pick(
  raw.variant,
  ["split", "bento", "asym", "strip", "mosaic"] as const,
  "split",
);
return {
  type: "tiles",
  main,
  items,
  ...(variant !== "split" ? { variant } : {}),
};
```

## 11.2 `src/lib/heroGrid.ts` (nouveau, pur)

```ts
// src/lib/heroGrid.ts — PUR : dispositions de la couche "Tuiles" (CSS grid, écrans ≥ 640 px).
// Chaque disposition PAVE la grille : aucune case vide, aucun chevauchement (testé).
import type { HeroTilesLayer } from "./heroSchema.ts";

export type HeroTilesVariant = NonNullable<HeroTilesLayer["variant"]>;

export const TILES_VARIANTS: {
  value: HeroTilesVariant;
  label: string;
  desc: string;
}[] = [
  {
    value: "split",
    label: "Principal + colonne",
    desc: "Visuel principal à gauche, tuiles empilées à droite (historique).",
  },
  {
    value: "bento",
    label: "Bento",
    desc: "Visuel principal en grand, tuiles de tailles différentes.",
  },
  {
    value: "asym",
    label: "Asymétrique",
    desc: "Colonne de tuiles avec une tuile centrale plus haute.",
  },
  {
    value: "strip",
    label: "Bandeau",
    desc: "Visuel principal en haut, tuiles en rangée dessous.",
  },
  {
    value: "mosaic",
    label: "Mosaïque",
    desc: "Grille de 6 colonnes, tuiles de largeurs inégales.",
  },
];

export interface TileCell {
  /** Valeur CSS de grid-column (ex. "1 / span 2"). */
  col: string;
  /** Valeur CSS de grid-row. */
  row: string;
}
export interface TilesLayout {
  cols: string; // grid-template-columns
  rows: string; // grid-template-rows
  main: TileCell;
  items: TileCell[];
}

const cell = (col: string, row: string): TileCell => ({ col, row });

/** n = nombre de tuiles (0..3) ; hasMain = visuel principal présent. */
export function tilesLayout(
  variant: HeroTilesVariant,
  n: number,
  hasMain: boolean,
): TilesLayout {
  const count = Math.max(0, Math.min(3, Math.floor(n)));

  // Pas de visuel principal : les tuiles se partagent la largeur.
  if (!hasMain) {
    const k = Math.max(1, count);
    return {
      cols: `repeat(${k}, 1fr)`,
      rows: "1fr",
      main: cell("auto", "auto"),
      items: Array.from({ length: count }, (_, i) => cell(String(i + 1), "1")),
    };
  }
  if (count === 0)
    return { cols: "1fr", rows: "1fr", main: cell("1", "1"), items: [] };

  switch (variant) {
    case "bento": {
      const items =
        count === 1
          ? [cell("3 / span 2", "1 / span 2")]
          : count === 2
            ? [cell("3 / span 2", "1"), cell("3 / span 2", "2")]
            : [cell("3 / span 2", "1"), cell("3", "2"), cell("4", "2")];
      return {
        cols: "repeat(4, 1fr)",
        rows: "repeat(2, 1fr)",
        main: cell("1 / span 2", "1 / span 2"),
        items,
      };
    }
    case "asym": {
      if (count === 1) {
        return {
          cols: "1.6fr 1fr",
          rows: "1fr",
          main: cell("1", "1"),
          items: [cell("2", "1")],
        };
      }
      if (count === 2) {
        return {
          cols: "1.6fr 1fr",
          rows: "1fr 1fr",
          main: cell("1", "1 / span 2"),
          items: [cell("2", "1"), cell("2", "2")],
        };
      }
      return {
        cols: "1.6fr 1fr",
        rows: "1fr 2fr 1fr",
        main: cell("1", "1 / span 3"),
        items: [cell("2", "1"), cell("2", "2"), cell("2", "3")],
      };
    }
    case "strip":
      return {
        cols: `repeat(${count}, 1fr)`,
        rows: "2fr 1fr",
        main: cell("1 / -1", "1"),
        items: Array.from({ length: count }, (_, i) =>
          cell(String(i + 1), "2"),
        ),
      };
    case "mosaic": {
      const items =
        count === 1
          ? [cell("4 / span 3", "1 / span 2")]
          : count === 2
            ? [cell("4 / span 3", "1"), cell("4 / span 3", "2")]
            : [
                cell("4 / span 3", "1"),
                cell("4 / span 2", "2"),
                cell("6", "2"),
              ];
      return {
        cols: "repeat(6, 1fr)",
        rows: "repeat(2, 1fr)",
        main: cell("1 / span 3", "1 / span 2"),
        items,
      };
    }
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

## 11.3 `src/admin/HeroGridPicker.tsx` (nouveau)

```tsx
// src/admin/HeroGridPicker.tsx — sélecteur visuel de disposition (vignettes générées par tilesLayout).
import {
  TILES_VARIANTS,
  tilesLayout,
  type HeroTilesVariant,
} from "../lib/heroGrid";

export default function HeroGridPicker({
  value,
  onChange,
}: {
  value: HeroTilesVariant;
  onChange: (v: HeroTilesVariant) => void;
}) {
  const current = TILES_VARIANTS.find((t) => t.value === value);
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {TILES_VARIANTS.map((v) => {
          const L = tilesLayout(v.value, 3, true);
          const on = v.value === value;
          return (
            <button
              key={v.value}
              type="button"
              title={v.desc}
              aria-pressed={on}
              onClick={() => onChange(v.value)}
              style={{
                padding: 6,
                borderRadius: 10,
                cursor: "pointer",
                border: on
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-border)",
                background: on
                  ? "var(--color-accent-bg)"
                  : "var(--color-surface2)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: L.cols,
                  gridTemplateRows: L.rows,
                  gap: 2,
                  aspectRatio: "16 / 10",
                }}
              >
                {[L.main, ...L.items].map((c, i) => (
                  <span
                    key={i}
                    style={{
                      gridColumn: c.col,
                      gridRow: c.row,
                      borderRadius: 2,
                      background:
                        i === 0
                          ? "var(--color-accent)"
                          : "var(--color-border2)",
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--color-ink2)",
                  lineHeight: 1.2,
                }}
              >
                {v.label}
              </span>
            </button>
          );
        })}
      </div>
      {current && (
        <p
          style={{
            fontSize: 11,
            color: "var(--color-ink4)",
            margin: "6px 0 0",
          }}
        >
          {current.desc} Sur mobile : visuel principal puis rangée de tuiles,
          pour toutes les dispositions.
        </p>
      )}
    </>
  );
}
```

## 11.4 `src/components/HeroSlideView.tsx` : 2 modifications

**1)** Juste après la ligne `import type { ResolvedHeroSlide } from "../lib/heroResolve";`, ajoute :

```tsx
import { tilesLayout } from "../lib/heroGrid";
```

**2)** Remplace le bloc qui **commence** par `if (layer.type === "tiles") {` et se termine par le `}` qui précède la ligne `if (layer.type === "html") {` par :

```tsx
if (layer.type === "tiles") {
  const main = layer.main;
  const mainSrc = main ? main.src || p?.image || null : null;
  const label = main
    ? main.label || (main.fromProduct && p ? p.title : "")
    : "";
  const click = (link: string | null, key: string) => {
    onTrack?.(slide.id, key === "main" ? "main" : "tile", key);
    if (link && onLink) onLink(link);
    else onAction(slide, null);
  };
  const variant = layer.variant ?? "split";
  // null = disposition historique (code inchangé) ; sinon grille CSS à partir de 640 px.
  const L =
    variant === "split"
      ? null
      : tilesLayout(variant, layer.items.length, !!(main && mainSrc));
  const cellStyle = (c?: { col: string; row: string }): CSSProperties =>
    c ? { gridColumn: c.col, gridRow: c.row } : {};

  const mainBtn =
    main && mainSrc ? (
      <button
        type="button"
        onClick={() => click(main.link, "main")}
        className={`relative flex-1 min-h-0 ${L ? "min-w-0 " : ""}rounded-2xl overflow-hidden text-left`}
        style={{ boxShadow: "var(--shadow-xl)", ...cellStyle(L?.main) }}
        aria-label={label || main.ctaLabel ? undefined : "Voir"}
      >
        <img
          src={U.fill(mainSrc)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          onError={imgError}
        />
        {(label || main.ctaLabel) && (
          <span className="absolute left-3 bottom-3 right-3 flex items-end justify-between gap-2">
            <span className="text-white font-extrabold text-lg leading-tight drop-shadow">
              {label}
            </span>
            {main.ctaLabel && (
              <span className="btn btn-accent shrink-0 !py-2 !px-4 text-xs">
                {main.ctaLabel}
              </span>
            )}
          </span>
        )}
      </button>
    ) : null;

  const itemBtn = (
    t: { src: string; label: string; link: string | null },
    ti: number,
  ) => (
    <button
      key={ti}
      type="button"
      onClick={() => click(t.link || main?.link || null, `tile-${ti}`)}
      className="relative flex-1 min-w-[38vw] sm:min-w-0 sm:min-h-0 rounded-2xl overflow-hidden text-left"
      style={{ boxShadow: "var(--shadow-lg)", ...cellStyle(L?.items[ti]) }}
      aria-label={t.label || `Voir ${ti + 1}`}
    >
      <img
        src={U.tile(t.src)}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        decoding="async"
      />
      {t.label && (
        <span
          className="absolute left-2 bottom-2 text-white text-xs font-bold drop-shadow px-2 py-1 rounded-lg"
          style={{ background: "rgba(0,0,0,.55)" }}
        >
          {t.label}
        </span>
      )}
    </button>
  );

  if (!L) {
    return (
      <div
        key={i}
        className={`absolute inset-0 flex flex-col sm:flex-row gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24 ${hideCls(layer.hide)}`}
      >
        {mainBtn}
        <div className="flex sm:flex-col gap-3 sm:w-[30%] shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar">
          {layer.items.map(itemBtn)}
        </div>
      </div>
    );
  }
  // Variantes : le masquage vit sur une enveloppe (aucun conflit avec sm:grid).
  // Mobile : colonne (principal + rangée de tuiles) ; ≥ 640 px : grille, la rangée devient `contents`.
  return (
    <div key={i} className={`absolute inset-0 ${hideCls(layer.hide)}`}>
      <div
        className="absolute inset-0 flex flex-col sm:grid gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24"
        style={{ gridTemplateColumns: L.cols, gridTemplateRows: L.rows }}
      >
        {mainBtn}
        <div className="flex gap-3 overflow-x-auto no-scrollbar shrink-0 max-sm:h-28 sm:contents">
          {layer.items.map(itemBtn)}
        </div>
      </div>
    </div>
  );
}
```

## 11.5 `src/admin/HeroStudioPage.tsx` : 2 modifications

**1)** Juste après la ligne `import HeroStatsPanel from "./HeroStatsPanel";`, ajoute :

```tsx
import HeroGridPicker from "./HeroGridPicker";
```

**2)** Dans `LayerEditor`, branche `tiles`, juste **avant** la ligne qui contient `<AdminImageInput label="Visuel principal (vide = produit)"`, ajoute :

```tsx
<Field label="Disposition (écrans ≥ 640 px)">
  <HeroGridPicker
    value={layer.variant ?? "split"}
    onChange={(v) => {
      const { variant: _old, ...rest } = layer;
      onChange(
        (v === "split" ? rest : { ...rest, variant: v }) as typeof layer,
      );
    }}
  />
</Field>
```

## 11.6 À vérifier sur mobile, correctif optionnel (visible)

Dans la disposition **historique**, la rangée de tuiles sur mobile n'a aucune hauteur propre : ses enfants sont en position absolue, donc elle peut s'effondrer à presque 0 px. Je n'y ai pas touché (zéro changement non demandé). Les nouvelles variantes lui donnent `h-28`.

**Vérifie ton slide « grille » en aperçu Mobile.** Si les tuiles sont invisibles, le correctif est d'ajouter `max-sm:h-28` à la classe de la rangée de la branche historique : la ligne `<div className="flex sm:flex-col gap-3 sm:w-[30%] shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar">` devient `<div className="flex sm:flex-col gap-3 sm:w-[30%] shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar max-sm:h-28">`. Ce serait un changement visible sur mobile pour ces slides.

---

# Lot 12 : contrôle qualité

## 12.1 `src/lib/heroQuality.ts` (nouveau, pur)

```ts
// src/lib/heroQuality.ts — PUR : contrôles de lisibilité et d'accessibilité d'un slide (avertissements du studio).
import type { HeroConfig, HeroLayer } from "./heroSchema.ts";
import { heroBackground, isLightHeroBg } from "./heroStyle.ts";

export interface QualityWarning {
  level: "info" | "warn";
  text: string;
}

type RGB = [number, number, number];
/** Encre sombre FIXE (indépendante du thème) : les dégradés du hero ne changent pas avec le thème. */
const DARK_INK: RGB = [26, 25, 22]; // #1a1916
const WHITE: RGB = [255, 255, 255];

/** Couleurs #hex (3 ou 6 chiffres) d'un dégradé. rgba()/hsl() sont ignorés. */
export function gradientColors(g: string): RGB[] {
  const out: RGB[] = [];
  for (const m of String(g ?? "").matchAll(
    /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g,
  )) {
    let h = m[1];
    if (h.length === 3)
      h = h
        .split("")
        .map((c) => c + c)
        .join("");
    out.push([
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ]);
  }
  return out;
}

const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
export function luminance([r, g, b]: RGB): number {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
/** Rapport de contraste WCAG (1 à 21). */
export function contrastRatio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
/** Pire contraste de l'encre sur toutes les couleurs du dégradé (null = aucune couleur #hex). */
export function worstContrast(gradient: string, ink: RGB): number | null {
  const cs = gradientColors(gradient);
  return cs.length ? Math.min(...cs.map((c) => contrastRatio(c, ink))) : null;
}

type TextLayer = Extract<HeroLayer, { type: "text" }>;
type ImageLayer = Extract<HeroLayer, { type: "image" }>;

export function heroQualityWarnings(c: HeroConfig): QualityWarning[] {
  const w: QualityWarning[] = [];
  const layers = c.layers.filter((l) => !l.off);
  const fill = layers.find((l): l is ImageLayer => l.type === "image");
  const bg = heroBackground(c.background.gradient);
  const lightBg = !fill && isLightHeroBg(bg);
  const texts = layers.filter((l): l is TextLayer => l.type === "text");

  for (const t of texts) {
    const dark = t.tone === "dark" || (t.tone === "auto" && lightBg);
    if (!fill) {
      const ratio = worstContrast(bg, dark ? DARK_INK : WHITE);
      const hasSub = t.showSub && (t.sub.trim() !== "" || t.fromProduct);
      if (ratio !== null && ratio < 3) {
        w.push({
          level: "warn",
          text: `Texte ${dark ? "sombre" : "clair"} peu lisible sur ce fond (contraste ${ratio.toFixed(1)}:1, minimum 3:1 pour un grand titre). Passe le texte en ${dark ? "clair" : "sombre"} ou change le fond.`,
        });
      } else if (ratio !== null && ratio < 4.5 && hasSub) {
        w.push({
          level: "info",
          text: `Sous-titre sous 4,5:1 sur ce fond (${ratio.toFixed(1)}:1) : assombris ou éclaircis le fond, ou retire le sous-titre.`,
        });
      }
    } else if (!dark && fill.dim >= 0.9 && fill.scrim === "none") {
      w.push({
        level: "info",
        text: "Texte clair sur une image sans voile : vérifie la lisibilité (ajoute un voile gauche ou bas).",
      });
    }
  }

  const hasTitle = texts.some((t) => t.headline.trim() !== "" || t.fromProduct);
  if (
    !hasTitle &&
    layers.some(
      (l) => (l.type === "image" || l.type === "card") && !l.alt.trim(),
    )
  ) {
    w.push({
      level: "warn",
      text: "Image sans texte alternatif et sans titre visible : un lecteur d'écran n'aura rien à lire. Renseigne le texte alternatif.",
    });
  }

  for (const cta of c.ctas.filter((x) => !x.off)) {
    if (cta.label.length > 28) {
      w.push({
        level: "info",
        text: `Le libellé « ${cta.label.slice(0, 20)}… » est long : sur mobile il risque de passer sur deux lignes.`,
      });
    }
  }
  return w;
}
```

## 12.2 `src/lib/heroStudio.ts` : 2 modifications

**1)** Juste après la ligne `import { HERO_BG_FALLBACK } from "./heroStyle.ts";`, ajoute :

```ts
import { heroQualityWarnings } from "./heroQuality.ts";
```

**2)** Dans `heroStudioWarnings`, remplace la ligne `  return w;` par :

```ts
w.push(...heroQualityWarnings(c));
return w;
```

## 12.3 Correctif thème sombre (déclaré)

**`src/components/HeroSlideView.tsx`**, 4 modifications :

1. Remplace la ligne `const ink = dark ? "var(--color-ink)" : "#fff";` par :

```tsx
const ink = dark ? "#1a1916" : "#fff";
```

2. Remplace la ligne `const inkSoft = dark ? "var(--color-ink2)" : "rgba(255,255,255,.8)";` par :

```tsx
const inkSoft = dark ? "#3d3b38" : "rgba(255,255,255,.8)";
```

3. Remplace la ligne `      ? { background: "#fff", color: "var(--color-ink)" }` par :

```tsx
      ? { background: "#fff", color: "#1a1916" }
```

4. Remplace **chacune des 2 lignes** `ink={slide.lightBg ? "var(--color-ink)" : "#fff"}` par :

```tsx
                  ink={slide.lightBg ? "#1a1916" : "#fff"}
```

**`src/components/HeroCarousel.tsx`**, 1 modification :

Remplace la ligne `const ink = active.lightBg ? "var(--color-ink)" : "#fff";` par :

```tsx
const ink = active.lightBg ? "#1a1916" : "#fff";
```

Le `HeroHtmlBlock` garde volontairement `color: var(--color-ink)`. Le HTML collé doit s'adapter au thème, c'est une décision déjà prise.

---

# Tests : nouveau fichier `tests/hero-lot11.test.ts`

```ts
// tests/hero-lot11.test.ts — grilles (pavage sans trou ni chevauchement), schéma, qualité, gardes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { TILES_VARIANTS, tilesLayout } from "../src/lib/heroGrid.ts";
import {
  contrastRatio,
  gradientColors,
  heroQualityWarnings,
} from "../src/lib/heroQuality.ts";
import { heroStudioWarnings } from "../src/lib/heroStudio.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const IMG = "https://cdn.example.com/a.webp";

const tracks = (t: string): number => {
  const m = t.match(/^repeat\((\d+),\s*1fr\)$/);
  return m ? Number(m[1]) : t.trim().split(/\s+/).length;
};
const span = (v: string, total: number): [number, number] => {
  if (v === "1 / -1") return [1, total];
  const m = v.match(/^(\d+)\s*\/\s*span\s*(\d+)$/);
  return m
    ? [Number(m[1]), Number(m[1]) + Number(m[2]) - 1]
    : [Number(v), Number(v)];
};

test("grilles : chaque disposition pave la grille (aucune case vide ni chevauchement)", () => {
  for (const v of TILES_VARIANTS) {
    for (let n = 0; n <= 3; n++) {
      const L = tilesLayout(v.value, n, true);
      const C = tracks(L.cols);
      const R = tracks(L.rows);
      const seen = new Map<string, number>();
      for (const c of [L.main, ...L.items]) {
        const [c1, c2] = span(c.col, C);
        const [r1, r2] = span(c.row, R);
        assert.ok(
          c1 >= 1 && c2 <= C && r1 >= 1 && r2 <= R,
          `${v.value}/${n} hors grille`,
        );
        for (let x = c1; x <= c2; x++)
          for (let y = r1; y <= r2; y++) {
            const k = `${x},${y}`;
            seen.set(k, (seen.get(k) ?? 0) + 1);
          }
      }
      assert.equal(L.items.length, n, `${v.value}/${n} nombre de tuiles`);
      assert.equal(seen.size, C * R, `${v.value}/${n} cases vides`);
      assert.ok(
        [...seen.values()].every((k) => k === 1),
        `${v.value}/${n} chevauchement`,
      );
    }
  }
});

test("grilles : sans visuel principal, les tuiles se partagent la largeur", () => {
  const L = tilesLayout("bento", 3, false);
  assert.equal(L.cols, "repeat(3, 1fr)");
  assert.equal(L.items.length, 3);
});

test("schéma : variant écrit seulement s'il est posé et valide ; idempotent ; split jamais stocké", () => {
  const mk = (variant?: unknown) =>
    sanitizeHeroConfig({
      layers: [
        {
          type: "tiles",
          main: null,
          items: [{ src: IMG }],
          ...(variant === undefined ? {} : { variant }),
        },
      ],
    }).layers[0] as any;
  assert.equal("variant" in mk(), false);
  assert.equal("variant" in mk("split"), false);
  assert.equal("variant" in mk("masonry"), false);
  assert.equal(mk("bento").variant, "bento");
  const c = sanitizeHeroConfig({
    layers: [{ type: "tiles", main: null, items: [], variant: "mosaic" }],
  });
  assert.deepEqual(sanitizeHeroConfig(c), c);
});

test("contraste : valeurs de référence et lecture des dégradés", () => {
  assert.ok(Math.abs(contrastRatio([255, 255, 255], [0, 0, 0]) - 21) < 0.01);
  assert.equal(
    gradientColors("linear-gradient(135deg, #fff 0%, #000 100%)").length,
    2,
  );
  assert.deepEqual(gradientColors("#abc")[0], [170, 187, 204]);
  assert.equal(gradientColors("rgba(0,0,0,.5)").length, 0);
});

const SABLE = "linear-gradient(135deg, #f0b13d 0%, #f7d789 60%, #f0b13d 100%)";
const CREME = "linear-gradient(135deg, #faf7f0 0%, #f3ece0 60%, #faf7f0 100%)";
const cfg = (o: Record<string, unknown>) =>
  sanitizeHeroConfig({ origin: "studio", ...o });

test("qualité : texte clair forcé sur fond clair → avertissement ; auto → encre sombre, rien", () => {
  const bad = cfg({
    background: { gradient: SABLE },
    layers: [{ type: "text", headline: "Hello", tone: "light" }],
  });
  assert.ok(
    heroQualityWarnings(bad).some(
      (w) => w.level === "warn" && /peu lisible/.test(w.text),
    ),
  );
  const ok = cfg({
    background: { gradient: CREME },
    layers: [{ type: "text", headline: "Hello", tone: "auto" }],
  });
  assert.deepEqual(
    heroQualityWarnings(ok).filter((w) => /lisible|contraste/i.test(w.text)),
    [],
  );
});

test("qualité : image sans voile + texte clair, alt manquant, libellé long", () => {
  const veil = cfg({
    layers: [
      { type: "image", src: IMG, dim: 1, scrim: "none" },
      { type: "text", headline: "x", tone: "light" },
    ],
  });
  assert.ok(heroQualityWarnings(veil).some((w) => /sans voile/.test(w.text)));

  const noAlt = cfg({ layers: [{ type: "image", src: IMG, alt: "" }] });
  assert.ok(
    heroQualityWarnings(noAlt).some(
      (w) => w.level === "warn" && /alternatif/.test(w.text),
    ),
  );
  const withTitle = cfg({
    layers: [
      { type: "image", src: IMG, alt: "" },
      { type: "text", headline: "Soldes" },
    ],
  });
  assert.ok(
    !heroQualityWarnings(withTitle).some((w) => /alternatif/.test(w.text)),
  );

  const long = cfg({
    layers: [],
    ctas: [{ label: "Découvrir toute la collection printemps" }],
  });
  assert.ok(heroQualityWarnings(long).some((w) => /long/.test(w.text)));
  const off = cfg({
    layers: [{ type: "image", src: IMG, alt: "", off: true }],
  });
  assert.ok(
    !heroQualityWarnings(off).some((w) => /alternatif/.test(w.text)),
    "couche œil fermé ignorée",
  );
});

test("studio : les avertissements qualité remontent dans heroStudioWarnings", () => {
  const bad = cfg({
    background: { gradient: SABLE },
    layers: [
      { type: "image", src: null },
      { type: "text", headline: "x", tone: "light" },
    ],
  });
  const none = heroStudioWarnings(bad, { isFirst: false, hasProduct: true });
  assert.ok(
    !none.some((w) => /peu lisible/.test(w.text)),
    "image plein cadre : pas de calcul de contraste",
  );
  const flat = cfg({
    background: { gradient: SABLE },
    layers: [{ type: "text", headline: "x", tone: "light" }],
  });
  assert.ok(
    heroStudioWarnings(flat, { isFirst: false, hasProduct: true }).some((w) =>
      /peu lisible/.test(w.text),
    ),
  );
});

test("garde : le rendu historique des tuiles reste intact et le thème sombre ne casse plus le texte", () => {
  const v = read("src/components/HeroSlideView.tsx");
  assert.ok(
    v.includes(
      "flex flex-col sm:flex-row gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24",
    ),
  );
  assert.ok(
    v.includes(
      "sm:w-[30%] shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar",
    ),
  );
  assert.ok(v.includes("tilesLayout"));
  assert.ok(
    !v.includes('dark ? "var(--color-ink)"'),
    "encre sombre fixe, pas la variable de thème",
  );
  assert.ok(
    !read("src/components/HeroCarousel.tsx").includes(
      'active.lightBg ? "var(--color-ink)"',
    ),
  );
});
```

---

## Vérifications, dans l'ordre

1. Appliquer 11.1 à 11.5, 12.1 à 12.3 et le test. Puis `npm run lint`, `npm test`, `npm run build`.
2. **Tes slides existants** : boutique desktop et mobile, thèmes clair **et** sombre. Aucun pixel ne doit bouger, sauf les textes sombres sur fond clair en thème sombre (c'est le correctif déclaré).
3. **Studio** : ouvre un slide à tuiles, couche Tuiles → « Disposition ». Essaie les 5 vignettes en aperçu **Desktop** : le rendu doit correspondre à la vignette, avec 1, 2 et 3 tuiles. En aperçu **Mobile**, toutes les dispositions se ressemblent (principal + rangée de tuiles).
4. **Qualité** : fond « Sauge » + texte « Clair » → avertissement de contraste. Fond « Crème » + texte « Auto » → rien. Image sans texte alternatif et sans titre → avertissement.
5. Vérifie le point 11.6 sur mobile.

---

## Ce qui reste, et la mise en production du Deploy Hook

D'après tes relevés, `pg_cron` et `pg_net` ne sont pas installés sur la base partagée, et Vault est présent. Pour la production, tu as deux possibilités.

**Option A : en SQL Editor sur la prod**, après avoir activé les extensions :

1. Dashboard → _Database → Extensions_ : active **pg_cron** et **pg_net**.
2. Crée le secret :

```sql
select vault.create_secret('https://api.vercel.com/v1/integrations/deploy/…', 'vercel_deploy_hook_url', 'Deploy hook Vercel (hero)');
```

3. Planifie le job :

```sql
DELETE FROM cron.job WHERE jobname = 'hero-deploy-hook';
SELECT cron.schedule('hero-deploy-hook', '* * * * *', $cmd$ SELECT public.hero_flush_deploy_hook(false) $cmd$);
```

4. Test : `SELECT public.hero_flush_deploy_hook(false);` doit renvoyer `unchanged` ou `triggered`.

**Option B : en migration** `20261044_hero_cron_prod.sql`, contenant uniquement l'étape 3. Tu ne la pousses que sur la prod, une fois les extensions actives.

Rien d'urgent côté base partagée : `hook_pending` y est à `true` et `last_fingerprint` est posé, donc le premier flush après création du secret ne déclenche un build que si le contenu public a changé.

**Prochaines pistes**, par ordre :

| Chantier                                                                                                                                                                                                 | Il me faut                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **Slide n°1 en HTML sans perte de LCP** (shadow DOM déclaratif au prerender), avec le **filtre de planification dans le prerender** et la prise en compte de l'**audience A/B** pour le slide d'amorçage | `scripts/prerender.ts`        |
| **Poids de l'image du slide n°1** : bouton « Peser » (requête HEAD) avec alerte au-dessus de 250 Ko                                                                                                      | Rien                          |
| **Rétention des événements** `engagement_events` (par exemple 180 jours, purge quotidienne)                                                                                                              | Prod, ou le cron de ci-dessus |
| **Couche Tuiles jusqu'à 5 tuiles** avec une disposition dédiée                                                                                                                                           | Rien                          |

Mon choix serait le premier : c'est le dernier trou connu de bout en bout. Il supprime l'avertissement « slide n°1 » à la fois pour le HTML et pour l'A/B. Colle-moi `scripts/prerender.ts` et je livre la suite.
