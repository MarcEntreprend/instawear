# Lot 14 : corrections du lot 13 et contrôle du poids des images

Compris : je travaille contre `style-15-claude`, jamais contre `style-15` seul.

- **Patches ciblés avec ancres**, jamais de remplacement complet.
- **Pas de nouvelle migration** (38, 39 et 44+ restent libres).
- **Pas de décision déjà close remise en cause.**
- **Pas de question sur `prerender.ts` ni `engagement.ts`.**

**Une affirmation du lot 13 était fausse.** J'ai écrit « rien n'est recréé » comme si le nœud DSD était réutilisé. Avec `createRoot`, `#root` est vidé et reconstruit. Ce que le lot garantit réellement :

- une peinture avant JavaScript ;
- un montage synchrone du slide d'amorçage avant la première peinture React, donc aucune frame vide ;
- entre l'amorçage et le vrai slide, une instance qui persiste (même clé), où le filtre navigateur ne redessine rien si le contenu est identique.

Je corrige le commentaire du code. Le gain de LCP reste à prouver par ta mesure Lighthouse mobile avant/après. Je ne le revendique pas.

Ce lot règle les quatre points ouverts que tu listes, puis ajoute le contrôle du poids des images.

---

## A. Corrections du lot 13

### A.1 `src/lib/heroImages.ts` : ajout d'une règle partagée

À la **toute fin du fichier**, après le `}` qui ferme `buildSupabaseRenderUrl`, ajoute :

```ts
/** Fond « full » historique (image + voile gauche) : URL brute, pour partager le cache avec le prerender.
 *  SOURCE UNIQUE de la règle : HeroSlideView, scripts/hero-lead.ts et le contrôle de poids du studio. */
export function heroImageIsRaw(l: { scrim: string; dim: number }): boolean {
  return l.scrim === "left" && l.dim < 1;
}
```

### A.2 `src/components/HeroSlideView.tsx` : 2 modifications

1. Remplace la ligne `import { HERO_IMG_OPTS } from "../lib/heroImages";` par :

```tsx
import { HERO_IMG_OPTS, heroImageIsRaw } from "../lib/heroImages";
```

2. Remplace la ligne `const raw = layer.scrim === "left" && layer.dim < 1;` par :

```tsx
const raw = heroImageIsRaw(layer);
```

### A.3 `scripts/hero-lead.ts` : 5 modifications

1. Remplace la ligne `import { parseHeroConfig } from "../src/lib/heroSchema.ts";` par :

```ts
import {
  HERO_PAYLOAD_CAP_BYTES,
  parseHeroConfig,
} from "../src/lib/heroSchema.ts";
```

2. Remplace la ligne `import { HERO_IMG_OPTS, buildSupabaseRenderUrl } from "../src/lib/heroImages.ts";` par :

```ts
import {
  HERO_IMG_OPTS,
  buildSupabaseRenderUrl,
  heroImageIsRaw,
} from "../src/lib/heroImages.ts";
```

3. **Plafond cohérent avec la base (51 200 octets).** Remplace les 2 lignes consécutives

```ts
const bytes = new TextEncoder().encode(html + css).length;
if (bytes > 60_000) return null;
```

par :

```ts
const bytes = new TextEncoder().encode(html + css).length;
if (bytes > HERO_PAYLOAD_CAP_BYTES) return null;
```

Et remplace la ligne de commentaire `/** null si parse5 est absent ou si le résultat dépasse 60 Ko : l'appelant n'émet alors aucun DSD. */` par :

```ts
/** null si parse5 est absent ou si html + css dépasse le plafond de la base (51 200 octets) : pas de DSD. */
```

4. **`parse5` absent (ou HTML au-dessus du plafond) : plus de régression.** Le slide dégrade vers ses couches visuelles au lieu de supprimer tout l'amorçage. Remplace la ligne de commentaire `/** Slide HTML : filtre le HTML (sinon null = pas d'amorçage). Autres slides : tels quels. */` par :

```ts
/** Slide HTML : filtre le HTML ; si impossible, dégrade vers les couches visuelles (image, carte, tuiles)
 *  sans la couche HTML (null seulement s'il n'y a aucun visuel). Autres slides : tels quels. */
```

Puis remplace les 2 lignes consécutives

```ts
const clean = await sanitizeHeroHtmlNode(slide.html.html, slide.html.css);
if (!clean) return null;
```

par :

```ts
const clean = await sanitizeHeroHtmlNode(slide.html.html, slide.html.css);
if (!clean) {
  // parse5 absent ou HTML trop lourd : jamais de HTML non filtré dans la page.
  const degraded: ResolvedHeroSlide = {
    ...slide,
    html: null,
    config: {
      ...slide.config,
      layers: slide.config.layers.filter((l) => l.type !== "html"),
    },
  };
  console.warn(
    "prerender: HTML du slide n°1 non assaini (parse5 absent ou > plafond) : amorçage visuel seul.",
  );
  return staticVisual(degraded, null) ? { slide: degraded, clean: null } : null;
}
```

5. Remplace la ligne `      const raw = l.scrim === "left" && l.dim < 1; // même règle que HeroSlideView` par :

```ts
const raw = heroImageIsRaw(l);
```

### A.4 `src/components/HeroHtmlBlock.tsx` : commentaire exact

Remplace les 2 lignes consécutives

```tsx
// Contenu déjà identique (slide d'amorçage posé par le prerender) : on ne recrée rien,
// donc aucun clignotement d'image quand le filtre navigateur repasse derrière.
```

par :

```tsx
// Contenu déjà identique (montage instantané du slide d'amorçage, ou HTML inchangé entre
// l'amorçage et le vrai slide) : on ne recrée rien, donc aucun clignotement d'image quand le
// filtre navigateur repasse derrière. (Le nœud DSD du prerender, lui, est reconstruit par createRoot.)
```

### A.5 `tests/hero-lot13.test.ts` : équivalence réelle du script de variante

`engagement.ts` est maintenant importable en Node. Le test compare donc le script inline au vrai `getVariant()`, au lieu de sous-chaînes.

1. Juste après la ligne `import { LEAD_VARIANT_SCRIPT, buildLeadPayload, parseLeadPayload } from "../src/lib/heroLead.ts";`, ajoute :

```ts
import { getVariant } from "../src/lib/engagement.ts";
```

2. À la **toute fin du fichier**, ajoute :

```ts
test("variante : équivalence RÉELLE script inline ↔ getVariant() (200 sessions + stockage KO)", () => {
  const g = globalThis as any;
  const prev = g.window;
  try {
    for (let n = 0; n < 200; n++) {
      const sid = `${1760000000000 + n * 7919}-${(n * 2654435761).toString(36)}`;
      const ls = { getItem: () => sid, setItem() {} };
      g.window = { localStorage: ls, crypto: {} };
      assert.equal(runScript(ls), getVariant(), sid);
    }
    const bad = {
      getItem() {
        throw new Error("x");
      },
      setItem() {},
    };
    g.window = { localStorage: bad, crypto: {} };
    assert.equal(runScript(bad), getVariant());
  } finally {
    g.window = prev;
  }
});
```

---

## B. Nouveau : contrôle du poids des images (qualité du LCP)

Le studio pèse les images **telles qu'elles sont servies** : la variante webp 1280 px, ou l'URL brute pour le fond « full » historique. Il avertit au-dessus de 250 Ko pour le slide n°1 et de 500 Ko pour les autres. Le slide n°1 porte le LCP, d'où le seuil plus strict.

### B.1 `src/lib/heroWeight.ts` (nouveau, pur)

```ts
// src/lib/heroWeight.ts — PUR : pesée des images servies d'un slide (contrôle qualité du studio).
import type { HeroConfig } from "./heroSchema.ts";
import { heroImageIsRaw } from "./heroImages.ts";

export const HERO_WEIGHT_WARN_FIRST = 250 * 1024; // slide n°1 : porte le LCP
export const HERO_WEIGHT_WARN_OTHER = 500 * 1024;

export interface WeightResponse {
  ok: boolean;
  headers: { get(name: string): string | null };
  blob?: () => Promise<{ size: number }>;
}
export type WeightFetch = (
  url: string,
  init?: { method?: string },
) => Promise<WeightResponse>;

/** Octets servis : HEAD (Content-Length), sinon GET + taille du blob. null = impossible à mesurer. */
export async function weighImage(
  url: string,
  f: WeightFetch,
): Promise<number | null> {
  try {
    const head = await f(url, { method: "HEAD" });
    const len = head.ok ? Number(head.headers.get("content-length")) : NaN;
    if (Number.isFinite(len) && len > 0) return len;
  } catch {
    /* repli GET */
  }
  try {
    const res = await f(url, { method: "GET" });
    if (!res.ok || !res.blob) return null;
    return (await res.blob()).size;
  } catch {
    return null;
  }
}

export function weightLevel(bytes: number, isFirst: boolean): "ok" | "warn" {
  return bytes > (isFirst ? HERO_WEIGHT_WARN_FIRST : HERO_WEIGHT_WARN_OTHER)
    ? "warn"
    : "ok";
}

export const fmtKo = (bytes: number): string =>
  `${Math.round(bytes / 1024)} Ko`;

/** Sources d'image « plein format » d'un slide (couches image, carte, visuel principal des tuiles).
 *  raw = URL brute (fond « full » historique), sinon variante dimensionnée. Dédoublonné, œil fermé ignoré. */
export function heroImageSources(
  c: HeroConfig,
  productImage: string | null,
): { src: string; raw: boolean }[] {
  const out: { src: string; raw: boolean }[] = [];
  const add = (src: string | null | undefined, raw: boolean) => {
    const s = (src || productImage || "").trim();
    if (!s || out.some((o) => o.src === s && o.raw === raw)) return;
    out.push({ src: s, raw });
  };
  for (const l of c.layers) {
    if (l.off) continue;
    if (l.type === "image") add(l.src, heroImageIsRaw(l));
    else if (l.type === "card") add(l.src, false);
    else if (l.type === "tiles" && l.main) add(l.main.src, false);
  }
  return out;
}
```

### B.2 `src/admin/HeroWeightCheck.tsx` (nouveau)

```tsx
// src/admin/HeroWeightCheck.tsx — « Peser les images » d'un slide (section Contrôle qualité du studio).
import { useState, type CSSProperties } from "react";
import { Scale } from "lucide-react";
import type { HeroConfig } from "../lib/heroSchema";
import { HERO_IMG_OPTS } from "../lib/heroImages";
import { supabaseImageUrl } from "../lib/supabaseImage";
import {
  fmtKo,
  heroImageSources,
  weighImage,
  weightLevel,
} from "../lib/heroWeight";

interface Row {
  src: string;
  bytes: number | null;
}

const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

export default function HeroWeightCheck({
  config,
  productImage,
  isFirst,
}: {
  config: HeroConfig;
  productImage: string | null;
  isFirst: boolean;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const out = await Promise.all(
        heroImageSources(config, productImage).map(async (s) => {
          const url = s.raw
            ? s.src
            : supabaseImageUrl(s.src, HERO_IMG_OPTS.fill);
          return {
            src: s.src,
            bytes: await weighImage(url, (u, init) => fetch(u, init)),
          };
        }),
      );
      setRows(out);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <button type="button" style={btn} disabled={busy} onClick={run}>
        <Scale size={13} /> {busy ? "Pesée…" : "Peser les images"}
      </button>
      {rows !== null && rows.length === 0 && (
        <span style={{ fontSize: 12, color: "var(--color-ink3)" }}>
          Aucune image plein format dans ce slide.
        </span>
      )}
      {rows?.map((r) => {
        const warn =
          r.bytes !== null && weightLevel(r.bytes, isFirst) === "warn";
        return (
          <div
            key={r.src}
            style={{
              fontSize: 12,
              color: warn ? "#92400e" : "var(--color-ink2)",
              wordBreak: "break-all",
            }}
          >
            <strong>
              {r.bytes === null ? "mesure impossible" : fmtKo(r.bytes)}
            </strong>{" "}
            · …{r.src.slice(-42)}
            {warn &&
              (isFirst
                ? " — au-dessus de 250 Ko : le LCP du slide n°1 en souffre (compresse ou recadre l'image)."
                : " — au-dessus de 500 Ko : allège l'image.")}
          </div>
        );
      })}
      <span style={{ fontSize: 11, color: "var(--color-ink4)" }}>
        Poids de l'image servie (webp 1280 px pour les fonds dimensionnés), sans
        cache navigateur.
      </span>
    </div>
  );
}
```

### B.3 `src/admin/HeroStudioPage.tsx` : 2 modifications

1. Juste après la ligne `import HeroSyncBadge from "./HeroSyncBadge";`, ajoute :

```tsx
import HeroWeightCheck from "./HeroWeightCheck";
```

2. Juste après la ligne `              <Section title="Contrôle qualité" open={false}>`, ajoute :

```tsx
<HeroWeightCheck
  config={config}
  productImage={product?.image ?? null}
  isFirst={
    slides.findIndex((s) => s.id === draft.id) === 0 ||
    (draft.id === null && slides.length === 0)
  }
/>
```

---

## C. Tests : nouveau fichier `tests/hero-lot14.test.ts`

```ts
// tests/hero-lot14.test.ts — règle « raw » partagée, plafond/dégradation du prerender, pesée des images.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { resolveHeroSlides } from "../src/lib/heroResolve.ts";
import { heroImageIsRaw } from "../src/lib/heroImages.ts";
import {
  HERO_WEIGHT_WARN_FIRST,
  fmtKo,
  heroImageSources,
  weighImage,
  weightLevel,
  type WeightFetch,
} from "../src/lib/heroWeight.ts";
import {
  prepareLeadSlide,
  sanitizeHeroHtmlNode,
} from "../scripts/hero-lead.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const IMG = "https://cdn.example.com/a.webp";
const IMG2 = "https://cdn.example.com/b.webp";
const studio = (layers: unknown[]) =>
  sanitizeHeroConfig({ origin: "studio", layers });
const BIG = "<p>" + "a".repeat(52000) + "</p>";
const slideWith = (layers: unknown[], html: string) =>
  resolveHeroSlides(
    [
      {
        id: "s",
        order: 0,
        isActive: true,
        productId: "",
        config: studio(layers),
      },
    ],
    [],
    Date.now(),
    { s: { html, css: "" } },
    null,
  )[0];

test("règle raw : une seule définition, utilisée par la vue et le prerender", () => {
  assert.equal(heroImageIsRaw({ scrim: "left", dim: 0.55 }), true);
  assert.equal(heroImageIsRaw({ scrim: "left", dim: 1 }), false);
  assert.equal(heroImageIsRaw({ scrim: "none", dim: 0.5 }), false);
  assert.ok(
    read("src/components/HeroSlideView.tsx").includes("heroImageIsRaw(layer)"),
  );
  assert.ok(read("scripts/hero-lead.ts").includes("heroImageIsRaw(l)"));
  assert.ok(
    !read("scripts/hero-lead.ts").includes('l.scrim === "left" && l.dim < 1'),
  );
});

test("prerender : plafond aligné sur la base (plus de 60 000)", () => {
  const src = read("scripts/hero-lead.ts");
  assert.ok(src.includes("HERO_PAYLOAD_CAP_BYTES") && !src.includes("60_000"));
});

test("assainisseur Node : au-dessus du plafond => null (jamais de HTML trop lourd dans la page)", async () => {
  assert.equal(await sanitizeHeroHtmlNode(BIG, ""), null);
});

test("dégradation : HTML non assainissable => visuels seuls, sans couche html ni HTML ; sans visuel => null", async () => {
  const withImage = slideWith(
    [{ type: "image", src: IMG }, { type: "html" }],
    BIG,
  );
  const p = await prepareLeadSlide(withImage);
  assert.ok(p, "amorçage visuel conservé");
  assert.equal(p!.clean, null);
  assert.equal(p!.slide.html, null);
  assert.ok(!p!.slide.config.layers.some((l) => l.type === "html"));
  assert.ok(p!.slide.config.layers.some((l) => l.type === "image"));

  const htmlOnly = slideWith([{ type: "html" }], BIG);
  assert.equal(await prepareLeadSlide(htmlOnly), null);
});

test("pesée : HEAD, repli GET, échec => null", async () => {
  const head: WeightFetch = async (_u, init) =>
    init?.method === "HEAD"
      ? {
          ok: true,
          headers: { get: (n) => (n === "content-length" ? "123456" : null) },
        }
      : { ok: false, headers: { get: () => null } };
  assert.equal(await weighImage("u", head), 123456);

  const getOnly: WeightFetch = async (_u, init) =>
    init?.method === "HEAD"
      ? { ok: false, headers: { get: () => null } }
      : {
          ok: true,
          headers: { get: () => null },
          blob: async () => ({ size: 4321 }),
        };
  assert.equal(await weighImage("u", getOnly), 4321);

  const boom: WeightFetch = async () => {
    throw new Error("réseau");
  };
  assert.equal(await weighImage("u", boom), null);
});

test("pesée : seuils (n°1 strict) et formatage", () => {
  assert.equal(weightLevel(HERO_WEIGHT_WARN_FIRST, true), "ok");
  assert.equal(weightLevel(HERO_WEIGHT_WARN_FIRST + 1, true), "warn");
  assert.equal(weightLevel(HERO_WEIGHT_WARN_FIRST + 1, false), "ok");
  assert.equal(weightLevel(500 * 1024 + 1, false), "warn");
  assert.equal(fmtKo(256 * 1024), "256 Ko");
});

test("sources à peser : dédoublonnées, œil fermé ignoré, repli produit, raw pour le fond historique", () => {
  const c = studio([
    { type: "image", src: IMG, dim: 0.55, scrim: "left" },
    { type: "image", src: IMG, dim: 1, scrim: "none" },
    { type: "image", src: IMG2, off: true },
    { type: "card", src: null },
    { type: "tiles", main: { src: IMG2 }, items: [{ src: IMG }] },
  ]);
  const s = heroImageSources(c, "https://cdn.example.com/p.webp");
  assert.deepEqual(s, [
    { src: IMG, raw: true },
    { src: IMG, raw: false },
    { src: "https://cdn.example.com/p.webp", raw: false },
    { src: IMG2, raw: false },
  ]);
  assert.deepEqual(heroImageSources(studio([{ type: "text" }]), null), []);
});

test("garde : le studio branche le contrôle de poids", () => {
  const p = read("src/admin/HeroStudioPage.tsx");
  assert.ok(
    p.includes("<HeroWeightCheck") && p.includes('from "./HeroWeightCheck"'),
  );
});
```

---

## Vérifications

1. Appliquer A.1 à A.5, B et C, puis `npm run lint`, `npm test`, `npm run build`. Aucune migration, aucune nouvelle dépendance.
2. **Cas dégradé** : renomme temporairement `node_modules/parse5`, relance `npm run build`, puis rétablis-le. Le log doit afficher `HTML du slide n°1 non assaini … amorçage visuel seul`. `dist/index.html` doit garder un amorçage image et ne contenir aucun `<template shadowrootmode>`.
3. **Studio** : slide n°1, section « Contrôle qualité », bouton « Peser les images ». Un fond de plus de 250 Ko doit afficher l'avertissement. Il peut afficher « mesure impossible » si l'hôte de l'image n'expose pas `Content-Length` en CORS. L'avertissement est alors absent, ce n'est pas un bug du bouton.
4. **Lighthouse mobile, avant/après lot 13** : c'est toujours le seul verdict sur le gain de LCP. Si le gain est nul, dis-le-moi avec le rapport, et nous retirerons la complexité DSD plutôt que de la garder pour rien.

## Reste

| Chantier                                                     | Il me faut                         |
| ------------------------------------------------------------ | ---------------------------------- |
| **Rétention de `engagement_events`** (purge quotidienne)     | Le cron prod, donc après la fusion |
| **Couche Tuiles jusqu'à 5 tuiles** avec dispositions dédiées | Rien                               |
| **Cron Deploy Hook en prod**                                 | Fusion prod                        |

La suite logique est « Tuiles jusqu'à 5 ». Elle ne demande ni migration ni nouveau fichier de ta part, seulement un patch de `heroSchema.ts`, de `heroGrid.ts` et de `HeroSlideView.tsx`. Dis-moi si tu la veux, ou si tu préfères attendre tes mesures Lighthouse.
