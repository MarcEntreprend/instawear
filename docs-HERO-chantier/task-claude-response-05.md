# Hero Studio : lots 4b à 8

Ton état est bon. Un point à traiter d'abord : puisque `hero_promotions.html/css` existe encore chez toi, `select *` sur cette table ramène à nouveau ces deux colonnes (vides). Mon code ne les lit ni ne les écrit. Le trigger `hero_promotions_guard_html` que tu as gardé protège leur écriture. Fais-les tomber à la fusion en prod, et personne d'autre ne doit y écrire d'ici là.

**Contenu de ce message**

1. Lot 4b : sanitizer sans dépendance
2. Lot 6 : œil / verrou / masquage par appareil
3. Lot 7 : dupliquer, appliquer à tous, modèles perso, rebuild sans cron
4. Lot 8 : accessibilité du carrousel
5. Vérifications
6. Suite de la roadmap

Ta migration 36 est sans cron et sans Vault, et tes numéros 35 et 36 sont figés. La nouvelle migration est la **`20261037`**.

---

## Lot 4b : sanitizer sans dompurify

**Je ne rouvre pas le débat dépendance.** Un sanitizer à base de regex est dangereux et je ne t'en donne pas. La variante que je te propose **reconstruit** le contenu :

1. Le **parseur natif** du navigateur lit le HTML (`DOMParser` produit un document inerte).
2. On **recrée un arbre neuf**. Seules les balises d'une liste blanche sont recréées avec `createElement`, avec uniquement les attributs autorisés, et le texte passe par `createTextNode`. Aucun nœud n'est copié depuis la source.
3. Côté boutique, le rendu utilise ce fragment directement, **sans re-sérialisation**. C'est cette étape qui provoque les attaques « mXSS ».

**Compromis assumé.**

- Le SVG et le MathML inline ne sont plus acceptés (utilise `<img src="….svg">`). C'est ce qui supprime l'essentiel de la surface mXSS.
- Les `<h1>` collés deviennent des `<h2>` (un seul h1 par page).
- Les liens externes sont retirés.
- Le risque résiduel est un comportement exotique d'un parseur qu'on n'a pas anticipé. Il est atténué par trois choses : seul un `super_admin` écrit, le rendu est dans un Shadow DOM, et le CSS passe par son propre filtre.
- DOMPurify reste mieux audité. Si un jour des non-super_admin peuvent écrire du HTML, rouvre le débat.

**Vérification dans le navigateur.** Un bouton « Tester le filtre » exécute 19 vecteurs d'attaque contre ton vrai navigateur, car le walker DOM ne peut pas être testé en Node sans jsdom.

**Nettoyage.** Lance `npm rm dompurify @types/dompurify`. Ta garde `security-warns` repasse au vert.

### 4b.1 `src/lib/heroHtmlPolicy.ts` (nouveau, pur, testé en Node)

```ts
// src/lib/heroHtmlPolicy.ts — POLITIQUE d'assainissement du HTML collé : PURE (node-testable).
// Principe : liste blanche + RECONSTRUCTION. Le walker DOM (heroHtml.ts) ne copie jamais un
// nœud : il recrée seulement les éléments autorisés avec seulement les attributs autorisés.
import { cleanHeroLink } from "./heroSchema.ts";
import { isSafeStyleAttr } from "./heroCss.ts";

export const HERO_HTML_MAX_NODES = 3000;
export const HERO_HTML_MAX_DEPTH = 40;
export const HTML_NS = "http://www.w3.org/1999/xhtml";

const ALLOWED = new Set(
  (
    "a abbr address article aside b bdi blockquote br caption cite code col colgroup dd del " +
    "div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i img li main mark nav " +
    "ol p picture pre q s section small source span strong sub sup table tbody td tfoot th " +
    "thead time tr u ul wbr"
  ).split(" "),
);

// Supprimés AVEC leur contenu. Tout le reste (font, center, button, label, details…) est
// "déballé" : on garde le texte et les enfants autorisés, pas la balise.
const DROP = new Set(
  (
    "script style iframe object embed applet template noscript svg math title head meta link " +
    "base frame frameset noframes noembed xmp plaintext listing audio video track canvas " +
    "select option optgroup textarea input form dialog"
  ).split(" "),
);

export type TagAction = "keep" | "unwrap" | "drop";

export function tagAction(tag: string): TagAction {
  const t = tag.toLowerCase();
  if (ALLOWED.has(t)) return "keep";
  if (DROP.has(t)) return "drop";
  return "unwrap";
}

/** Un seul h1 par page : celui du texte du slide actif. */
export function renameTag(tag: string): string {
  return tag.toLowerCase() === "h1" ? "h2" : tag.toLowerCase();
}

export function urlOk(u: string): boolean {
  if (!u || u.length > 1000) return false;
  // Pas d'espaces / contrôles / antislash (/\evil.com est lu comme //evil.com par les navigateurs).
  if (/[\s\\\u0000-\u001f\u007f]/.test(u)) return false;
  return /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u);
}

export function cleanSrcset(v: string): string | null {
  const parts = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 8) return null;
  const out: string[] = [];
  for (const p of parts) {
    const [url, desc, ...rest] = p.split(/\s+/);
    if (!url || rest.length > 0 || !urlOk(url)) return null;
    if (desc && !/^\d+(\.\d+)?[wx]$/.test(desc)) return null;
    out.push(desc ? `${url} ${desc}` : url);
  }
  return out.join(", ");
}

export interface AttrDecision {
  keep: boolean;
  value: string;
  warn?: string;
}
const drop = (warn?: string): AttrDecision => ({
  keep: false,
  value: "",
  warn,
});
const keep = (value: string): AttrDecision => ({ keep: true, value });

const PER_TAG: Record<string, readonly string[]> = {
  a: ["href"],
  img: [
    "src",
    "srcset",
    "sizes",
    "alt",
    "width",
    "height",
    "loading",
    "decoding",
  ],
  source: ["srcset", "sizes", "media", "type"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  col: ["span"],
  colgroup: ["span"],
  ol: ["start", "reversed", "type"],
  li: ["value"],
  time: ["datetime"],
};

/** Décide du sort d'UN attribut. Tout ce qui n'est pas explicitement autorisé est retiré. */
export function decideAttr(
  tagRaw: string,
  nameRaw: string,
  valueRaw: string,
): AttrDecision {
  const tag = tagRaw.toLowerCase();
  const name = nameRaw.toLowerCase();
  const v = String(valueRaw ?? "");

  if (name.startsWith("on"))
    return drop("Attributs d'événement (onclick…) retirés.");
  if (/^aria-[a-z-]{1,30}$/.test(name)) return keep(v.slice(0, 200));

  // Globaux
  if (name === "class")
    return keep(v.replace(/[\u0000-\u001f]/g, " ").slice(0, 500));
  if (name === "title") return keep(v.slice(0, 200));
  if (name === "lang")
    return /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8}){0,2}$/.test(v) ? keep(v) : drop();
  if (name === "dir") return /^(ltr|rtl|auto)$/.test(v) ? keep(v) : drop();
  if (name === "role") return /^[a-z-]{1,30}$/.test(v) ? keep(v) : drop();
  if (name === "style") {
    return isSafeStyleAttr(v)
      ? keep(v)
      : drop("Un attribut style non autorisé a été retiré.");
  }

  // Par balise
  if (!(PER_TAG[tag] ?? []).includes(name)) return drop();
  const t = v.trim();
  switch (name) {
    case "href": {
      const link = cleanHeroLink(t);
      if (link) return keep(link);
      if (/^#[\w-]{0,60}$/.test(t)) return keep(t);
      return drop(
        "Lien externe ou invalide retiré (seuls les liens internes « /… » sont acceptés).",
      );
    }
    case "src":
      return urlOk(t)
        ? keep(t)
        : drop(
            /^data:/i.test(t)
              ? "Image en base64 retirée : héberge-la puis colle son URL."
              : "Source d'image non autorisée retirée (https:// ou /… uniquement).",
          );
    case "srcset": {
      const s = cleanSrcset(v);
      return s ? keep(s) : drop("srcset non autorisé retiré.");
    }
    case "sizes":
      return /^[\w\s()%.,:<>=\/-]{1,200}$/.test(v) ? keep(v) : drop();
    case "alt":
      return keep(v.slice(0, 300));
    case "width":
    case "height":
      return /^\d{1,5}%?$/.test(t) ? keep(t) : drop();
    case "loading":
      return v === "lazy" || v === "eager" ? keep(v) : drop();
    case "decoding":
      return v === "async" || v === "sync" || v === "auto" ? keep(v) : drop();
    case "media":
      return /^[\w\s():,.\-<>=\/%]{1,100}$/.test(v) ? keep(v) : drop();
    case "type":
      return (tag === "ol" ? /^[1aAiI]$/ : /^image\/[a-z0-9.+-]{1,30}$/).test(v)
        ? keep(v)
        : drop();
    case "colspan":
    case "rowspan":
    case "span":
    case "value":
      return /^\d{1,3}$/.test(t) ? keep(t) : drop();
    case "start":
      return /^-?\d{1,5}$/.test(t) ? keep(t) : drop();
    case "reversed":
      return keep("");
    case "scope":
      return /^(row|col|rowgroup|colgroup)$/.test(v) ? keep(v) : drop();
    case "datetime":
      return /^[\w:+.\-\s]{1,40}$/.test(v) ? keep(v) : drop();
    default:
      return drop();
  }
}
```

### 4b.2 `src/lib/heroHtml.ts` : remplacement complet

Mêmes exports que l'ancienne version, donc `HeroHtmlBlock.tsx`, le panneau et la preview n'ont **rien à changer**.

```ts
// src/lib/heroHtml.ts — assainissement du HTML collé, SANS dépendance (navigateur).
// Pas de filtre "à la regex" : on PARSE avec l'analyseur natif (DOMParser = document inerte)
// puis on RECONSTRUIT un arbre neuf (createElement des seules balises autorisées, seuls
// attributs autorisés, createTextNode pour le texte). Rien n'est copié depuis la source.
import {
  HERO_HTML_MAX_DEPTH,
  HERO_HTML_MAX_NODES,
  HTML_NS,
  decideAttr,
  renameTag,
  tagAction,
} from "./heroHtmlPolicy";
import { sanitizeHeroCss } from "./heroCss";

interface Ctx {
  count: number;
  truncated: boolean;
  warnings: Set<string>;
}

const W_ACTIVE =
  "Scripts / iframes / formulaires retirés (le JavaScript n'est pas supporté).";
const W_FOREIGN =
  'SVG / MathML inline non supporté : utilise une <img src="….svg">.';
const W_MEDIA = "Éléments audio / vidéo / canvas non supportés, retirés.";

function build(src: Node, out: Node, ctx: Ctx, depth: number): void {
  for (const child of Array.from(src.childNodes)) {
    if (ctx.count >= HERO_HTML_MAX_NODES) {
      ctx.truncated = true;
      return;
    }
    if (child.nodeType === 3) {
      out.appendChild(document.createTextNode(child.nodeValue ?? ""));
      ctx.count++;
      continue;
    }
    if (child.nodeType !== 1) continue; // commentaires, instructions : jamais copiés
    const el = child as Element;
    if (el.namespaceURI !== HTML_NS) {
      ctx.warnings.add(W_FOREIGN);
      continue;
    }
    const tag = el.localName.toLowerCase();
    const action = tagAction(tag);
    if (action === "drop") {
      if (
        /^(script|iframe|object|embed|applet|form|input|textarea|select)$/.test(
          tag,
        )
      ) {
        ctx.warnings.add(W_ACTIVE);
      } else if (/^(audio|video|track|canvas)$/.test(tag)) {
        ctx.warnings.add(W_MEDIA);
      }
      continue;
    }
    if (action === "unwrap") {
      build(el, out, ctx, depth);
      continue;
    }
    if (depth >= HERO_HTML_MAX_DEPTH) {
      ctx.truncated = true;
      continue;
    }
    const outTag = renameTag(tag);
    if (outTag !== tag)
      ctx.warnings.add("<h1> converti en <h2> (un seul h1 par page).");
    const clean = document.createElement(outTag);
    for (const attr of Array.from(el.attributes)) {
      const d = decideAttr(tag, attr.name, attr.value);
      if (d.keep) clean.setAttribute(attr.name.toLowerCase(), d.value);
      else if (d.warn) ctx.warnings.add(d.warn);
    }
    if (tag === "a") clean.setAttribute("rel", "noopener noreferrer");
    ctx.count++;
    build(el, clean, ctx, depth + 1);
    out.appendChild(clean);
  }
}

function run(raw: string): {
  fragment: DocumentFragment;
  extractedCss: string;
  warnings: string[];
} {
  const text = String(raw ?? "");
  const warnings = new Set<string>();
  // DOMParser : document inerte (aucun script exécuté, aucune ressource chargée).
  const doc = new DOMParser().parseFromString(text, "text/html");
  let extractedCss = "";
  doc.querySelectorAll("style").forEach((s) => {
    extractedCss += (s.textContent ?? "") + "\n";
  });
  if (doc.querySelector('link[rel~="stylesheet"]')) {
    warnings.add(
      "<link> de feuille de style ignoré : colle le CSS dans le champ CSS.",
    );
  }
  if (doc.querySelector("script, iframe, object, embed, form"))
    warnings.add(W_ACTIVE);
  const b64 = (text.match(/data:[a-z]+\/[a-z0-9.+-]+;base64,/gi) || []).length;
  if (b64 > 0)
    warnings.add(
      `${b64} image(s) en base64 retirée(s) : héberge-les puis colle leur URL.`,
    );

  const fragment = document.createDocumentFragment();
  const ctx: Ctx = { count: 0, truncated: false, warnings };
  build(doc.body, fragment, ctx, 0);
  if (ctx.truncated)
    warnings.add(
      "Contenu tronqué : trop d'éléments ou imbrication trop profonde.",
    );
  return { fragment, extractedCss, warnings: Array.from(warnings) };
}

export interface HeroHtmlSanitized {
  html: string;
  /** Contenu des <style> trouvés dans le HTML collé (à fusionner avec le champ CSS). */
  extractedCss: string;
  warnings: string[];
}

/** Version "stockage" : chaîne HTML nettoyée. */
export async function sanitizeHeroHtml(
  raw: string,
): Promise<HeroHtmlSanitized> {
  const r = run(raw);
  const holder = document.createElement("div");
  holder.appendChild(r.fragment);
  return {
    html: holder.innerHTML,
    extractedCss: r.extractedCss,
    warnings: r.warnings,
  };
}

/** Version "rendu" : fragment DOM direct (pas de re-sérialisation → pas de mXSS). */
export async function sanitizeHeroHtmlToFragment(
  raw: string,
): Promise<DocumentFragment> {
  return run(raw).fragment;
}

// ─── Auto-test : vecteurs d'attaque joués dans TON navigateur ───────────────
interface Vec {
  name: string;
  html: string;
  ok: (out: string, css: string) => boolean;
}
const VECTORS: Vec[] = [
  {
    name: "script",
    html: "<p>ok</p><script>alert(1)</script>",
    ok: (o) => !/script|alert/i.test(o) && o.includes("<p>ok</p>"),
  },
  {
    name: "onerror",
    html: "<img src=x onerror=alert(1)>",
    ok: (o) => !/onerror|alert/i.test(o),
  },
  {
    name: "javascript: href",
    html: '<a href="javascript:alert(1)">x</a>',
    ok: (o) => !/javascript|alert/i.test(o),
  },
  {
    name: "lien externe",
    html: '<a href="https://evil.com/x">x</a>',
    ok: (o) => !/evil\.com/.test(o),
  },
  {
    name: "antislash",
    html: '<a href="/\\evil.com">x</a><img src="/\\evil.com/a.png">',
    ok: (o) => !/evil/.test(o),
  },
  {
    name: "svg",
    html: '<svg><script>alert(1)</script><a xlink:href="javascript:alert(1)">x</a></svg>',
    ok: (o) => !/svg|script|alert|javascript/i.test(o),
  },
  {
    name: "mathml",
    html: '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
    ok: (o) => !/math|alert|javascript/i.test(o),
  },
  {
    name: "style en attribut",
    html: '<div style="background:url(javascript:alert(1))">x</div>',
    ok: (o) => !/javascript|url\(/i.test(o),
  },
  {
    name: "iframe/object/embed",
    html: '<iframe src="https://evil.com"></iframe><object data="https://evil.com"></object><embed src="https://evil.com">',
    ok: (o) => !/iframe|object|embed|evil/i.test(o),
  },
  {
    name: "formulaire",
    html: '<form action="https://evil.com"><input name=a><button>go</button></form>',
    ok: (o) => !/form|input|evil/i.test(o),
  },
  {
    name: "balise style (CSS isolé)",
    html: "<style>@import url(https://evil.com/x.css)</style><p>a</p>",
    ok: (o, css) =>
      !/<style|evil/i.test(o) && sanitizeHeroCss(css).errors.length > 0,
  },
  {
    name: "noscript",
    html: "<noscript><img src=x onerror=alert(1)></noscript>",
    ok: (o) => !/onerror|alert/i.test(o),
  },
  {
    name: "base64",
    html: '<img src="data:image/png;base64,AAAA">',
    ok: (o) => !/data:/i.test(o),
  },
  {
    name: "mXSS svg/style",
    html: '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">',
    ok: (o) => !/onerror|alert|<style/i.test(o),
  },
  {
    name: "base/meta/link",
    html: '<base href="https://evil.com"><meta http-equiv="refresh" content="0;url=https://evil.com"><link rel="stylesheet" href="https://evil.com/a.css"><p>x</p>',
    ok: (o) => !/evil|<base|<meta|<link/i.test(o),
  },
  {
    name: "événements sur div",
    html: '<div onclick="alert(1)" onmouseover="x()">x</div>',
    ok: (o) => !/onclick|onmouseover|alert/i.test(o),
  },
  {
    name: "details/ontoggle",
    html: '<details open ontoggle="alert(1)"><summary>a</summary>b</details>',
    ok: (o) => !/ontoggle|alert/i.test(o),
  },
  {
    name: "imbrication profonde",
    html: "<div>".repeat(300) + "x",
    ok: (o) => o.length < 200_000,
  },
  {
    name: "lien interne conservé + h1→h2",
    html: '<a href="/promotions">x</a><h1>t</h1>',
    ok: (o) =>
      o.includes('href="/promotions"') &&
      /<h2>t<\/h2>/.test(o) &&
      !/<h1/.test(o),
  },
];

export async function heroHtmlSelfTest(): Promise<
  { name: string; ok: boolean }[]
> {
  const out: { name: string; ok: boolean }[] = [];
  for (const v of VECTORS) {
    try {
      const r = await sanitizeHeroHtml(v.html);
      out.push({ name: v.name, ok: v.ok(r.html, r.extractedCss) });
    } catch {
      out.push({ name: v.name, ok: false });
    }
  }
  return out;
}
```

### 4b.3 `src/admin/HeroHtmlPanel.tsx` : 2 modifications

**1)** Remplace la ligne `import { sanitizeHeroHtml } from "../lib/heroHtml";` par :

```tsx
import { heroHtmlSelfTest, sanitizeHeroHtml } from "../lib/heroHtml";
```

**2)** Juste **avant** la ligne `if (!hasLayer && !isSuper) return null;`, ajoute :

```tsx
const selfTest = async () => {
  setBusy(true);
  try {
    const r = await heroHtmlSelfTest();
    const fails = r.filter((x) => !x.ok);
    setNote({
      ok: fails.length === 0,
      lines:
        fails.length === 0
          ? [
              `Filtre OK : ${r.length}/${r.length} vecteurs d'attaque neutralisés dans ce navigateur.`,
            ]
          : fails.map((f) => `⛔ ÉCHEC : ${f.name}`),
    });
  } catch (e: any) {
    setNote({ ok: false, lines: [e?.message || "Auto-test impossible."] });
  } finally {
    setBusy(false);
  }
};
```

Puis juste après la balise `</button>` qui suit le texte `Mesurer pour le mode Auto`, ajoute :

```tsx
<button type="button" style={smallBtn} disabled={busy} onClick={selfTest}>
  <ShieldCheck size={13} /> Tester le filtre
</button>
```

### 4b.4 `src/lib/heroSchema.ts` : durcissement (2 lignes)

`/\evil.com` est lu comme `//evil.com` par les navigateurs. Les deux fonctions acceptaient ce chemin.

- Dans `cleanHeroLink`, remplace la ligne `if (t.startsWith("/") && !t.startsWith("//") && t.length <= 200) return t;` par :

```ts
if (
  t.startsWith("/") &&
  !t.startsWith("//") &&
  !t.includes("\\") &&
  t.length <= 200
)
  return t;
```

- Dans `cleanHeroSrc`, remplace la ligne `if (t.startsWith("/") && !t.startsWith("//")) return t;` par :

```ts
if (t.startsWith("/") && !t.startsWith("//") && !t.includes("\\")) return t;
```

---

## Lot 6 : œil, verrou, masquage par appareil

- **Œil** (`off`) : la couche ou le bouton n'est pas rendu, ni en boutique ni dans l'aperçu.
- **Verrou** (`lock`) : bloque l'édition, le déplacement et la suppression **dans le studio uniquement**. Aucun effet au rendu.
- **Masquer** (`hide`) : `"mobile"` ou `"desktop"`, en CSS pur (breakpoint 768 px), sans JS ni layout shift.

Tes slides existants n'ont aucun de ces champs, donc **rendu strictement identique**.

### 6.1 `src/lib/heroSchema.ts` : 5 modifications

**1)** Remplace le bloc qui **commence** par `export type HeroLayer =` et se termine par la ligne `| HeroHtmlLayer;` par :

```ts
/** Drapeaux communs à toutes les couches (optionnels : absents = comportement historique). */
export interface HeroLayerFlags {
  /** Œil fermé : non rendue (boutique ET aperçu). */
  off?: boolean;
  /** Verrou : studio uniquement (aucun effet au rendu). */
  lock?: boolean;
  /** Masquée sur cet appareil (breakpoint 768 px). */
  hide?: "desktop" | "mobile";
}
export type HeroLayer = (
  | HeroImageLayer
  | HeroCardLayer
  | HeroTilesLayer
  | HeroTextLayer
  | HeroHtmlLayer
) &
  HeroLayerFlags;
```

**2)** Dans `export interface HeroCta {`, juste après la ligne `pos: null | { desktop: HeroCtaPoint; mobile?: HeroCtaPoint };`, ajoute :

```ts
  off?: boolean;
  lock?: boolean;
  hide?: "desktop" | "mobile";
```

**3)** Renomme la ligne `function sanitizeLayer(raw: unknown): HeroLayer | null {` en :

```ts
function sanitizeLayerCore(raw: unknown): HeroLayer | null {
```

**4)** Renomme la ligne `function sanitizeCta(raw: unknown, index: number): HeroCta | null {` en :

```ts
function sanitizeCtaCore(raw: unknown, index: number): HeroCta | null {
```

**5)** Juste **avant** la ligne de commentaire `// ─── API publique du schéma ───`, ajoute :

```ts
// ─── Drapeaux (œil / verrou / masquage appareil) : ajoutés SEULEMENT s'ils sont posés,
// donc les configs existantes et le backfill restent strictement identiques. ──────────
function withFlags<T extends HeroLayerFlags>(target: T, raw: Obj): T {
  if (raw.off === true) target.off = true;
  if (raw.lock === true) target.lock = true;
  const h = pick(raw.hide, ["none", "desktop", "mobile"] as const, "none");
  if (h !== "none") target.hide = h;
  return target;
}
function sanitizeLayer(raw: unknown): HeroLayer | null {
  const l = sanitizeLayerCore(raw);
  return l && isObj(raw) ? withFlags(l, raw) : l;
}
function sanitizeCta(raw: unknown, index: number): HeroCta | null {
  const c = sanitizeCtaCore(raw, index);
  return c && isObj(raw) ? withFlags(c, raw) : c;
}
```

### 6.2 `src/lib/heroResolve.ts` : 4 modifications

Une couche en « œil fermé » ne compte plus ni comme visuel ni comme HTML à charger.

**1)** Remplace la ligne `return !!p.config && p.config.layers.some((l) => l.type === "html");` par :

```ts
return !!p.config && p.config.layers.some((l) => l.type === "html" && !l.off);
```

**2)** Remplace le bloc qui **commence** par `function hasStandaloneContent(c: HeroConfig): boolean {` et se termine par son `}` de fermeture par :

```ts
function hasStandaloneContent(c: HeroConfig): boolean {
  return c.layers.some(
    (l) =>
      !l.off &&
      (l.type === "html" ||
        (l.type === "image" && !!l.src) ||
        (l.type === "card" && !!l.src) ||
        (l.type === "tiles" && (!!l.main?.src || l.items.length > 0))),
  );
}
```

**3)** Remplace la ligne `const hasFill = config.layers.some((l) => l.type === "image");` par :

```ts
const hasFill = config.layers.some((l) => l.type === "image" && !l.off);
```

**4)** Remplace la ligne `const wantsHtml = config.layers.some((l) => l.type === "html");` par :

```ts
const wantsHtml = config.layers.some((l) => l.type === "html" && !l.off);
```

### 6.3 `src/components/HeroSlideView.tsx` : remplacement complet

Les modifications sont dispersées dans tout le fichier : œil, classes de masquage sur chaque couche, bouton, CTA.

```tsx
// src/components/HeroSlideView.tsx — rendu UNIFIÉ d'un slide hero (config v1).
// Utilisé par la boutique (HeroCarousel) ET par la preview du studio.
import { Fragment, type CSSProperties, type SyntheticEvent } from "react";
import { ArrowRight } from "lucide-react";
import HeroHtmlBlock from "./HeroHtmlBlock";
import { PLACEHOLDER_IMG } from "../constants/assets";
import { supabaseImageUrl } from "../lib/supabaseImage";
import type { HeroCta, HeroLayer } from "../lib/heroSchema";
import type { ResolvedHeroSlide } from "../lib/heroResolve";

type TextL = Extract<HeroLayer, { type: "text" }>;

export interface HeroSlideViewProps {
  slide: ResolvedHeroSlide;
  /** Position dans le carrousel : 0 = candidat LCP (eager + fetchpriority high). */
  index: number;
  active: boolean;
  /** Slide d'amorçage (JSON prerender) : une image cassée le signale au carrousel. */
  isLead?: boolean;
  onLeadImageError?: () => void;
  onAction: (slide: ResolvedHeroSlide, link: string | null) => void;
  onLink?: (link: string) => void;
}

// URLs : identiques à l'ancien HeroCarousel pour que le slide 0 réutilise l'image du
// snapshot prerender (même URL = cache). Ne changer qu'avec prerender.ts (phase 2).
const U = {
  fill: (s: string) => supabaseImageUrl(s, { width: 1280, quality: 75 }),
  mobile: (s: string) => supabaseImageUrl(s, { width: 800, quality: 75 }),
  tile: (s: string) => supabaseImageUrl(s, { width: 400, quality: 70 }),
};

// Masquage par appareil : CSS pur (breakpoint 768 px), aucun JS, aucun layout shift.
const hideCls = (h?: "desktop" | "mobile") =>
  h === "mobile" ? "max-md:hidden" : h === "desktop" ? "md:hidden" : "";

const SCRIM: Record<"left" | "bottom", CSSProperties> = {
  left: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(15,13,10,.68) 0%, rgba(15,13,10,.28) 55%, transparent 100%)",
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "45%",
    background: "linear-gradient(180deg, transparent, rgba(10,9,7,.55))",
  },
};

function Pic({
  src,
  srcMobile,
  alt,
  className,
  style,
  eager,
  onError,
}: {
  src: string;
  srcMobile?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  eager: boolean;
  onError: (e: SyntheticEvent<HTMLImageElement>) => void;
}) {
  const img = (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      decoding="async"
      onError={onError}
    />
  );
  if (!srcMobile) return img;
  return (
    <picture style={{ display: "contents" }}>
      <source media="(max-width: 767px)" srcSet={srcMobile} />
      {img}
    </picture>
  );
}

function CtaButton({
  cta,
  ink,
  onClick,
  className = "",
  style,
}: {
  cta: HeroCta;
  ink: string;
  onClick: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const base =
    cta.style === "dark"
      ? "btn btn-primary"
      : cta.style === "accent"
        ? "btn btn-accent"
        : "btn";
  const look: CSSProperties =
    cta.style === "light"
      ? { background: "#fff", color: "var(--color-ink)" }
      : cta.style === "ghost"
        ? {
            background: "transparent",
            color: ink,
            border: `1.5px solid ${ink}`,
          }
        : {};
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${className}`}
      style={{ ...look, ...style }}
    >
      {cta.label} <ArrowRight size={16} />
    </button>
  );
}

const ANCHOR: Record<
  TextL["anchor"],
  { wrap: string; align?: "right" | "center" }
> = {
  "left-middle": { wrap: "items-center" },
  "right-middle": { wrap: "items-center", align: "right" },
  center: { wrap: "items-center", align: "center" },
  "bottom-left": { wrap: "items-end" },
};

export default function HeroSlideView({
  slide,
  index,
  active,
  isLead,
  onLeadImageError,
  onAction,
  onLink,
}: HeroSlideViewProps) {
  const { config, product: p } = slide;
  const eager = index === 0;
  // Œil fermé : ni rendu, ni compté.
  const layers = config.layers.filter((l) => !l.off);
  const ctas = config.ctas.filter((c) => !c.off);
  const inline = ctas.filter((c) => !c.pos);
  const free = ctas.filter((c) => c.pos);
  const hasCard = layers.some((l) => l.type === "card");
  const textLayers = layers.filter((l): l is TextL => l.type === "text");
  // Un seul h1 par page : seul le slide actif porte le titre principal.
  const H = active ? "h1" : "p";
  const fire = (cta: HeroCta) => onAction(slide, cta.link);

  const imgError = (e: SyntheticEvent<HTMLImageElement>) => {
    if (isLead && onLeadImageError) {
      onLeadImageError();
      return;
    }
    const el = e.currentTarget;
    if (el.dataset.fbk) return;
    el.dataset.fbk = "1";
    el.src = PLACEHOLDER_IMG;
  };

  const renderText = (l: TextL, key: number, withCtas: boolean) => {
    const dark = l.tone === "dark" || (l.tone === "auto" && slide.lightBg);
    const ink = dark ? "var(--color-ink)" : "#fff";
    const inkSoft = dark ? "var(--color-ink2)" : "rgba(255,255,255,.8)";
    const chipBg = dark ? "rgba(0,0,0,.06)" : "rgba(255,255,255,.14)";
    const chipFg = dark ? "var(--color-accent-strong, #c2452a)" : "#fff";
    // Replis produit (comportement historique) : seulement si fromProduct.
    const tag = l.tag || (l.fromProduct ? "⚡ PROMOTION" : "");
    const headline = l.headline || (l.fromProduct && p ? p.title : "");
    const sub = l.showSub
      ? l.sub || (l.fromProduct && p ? p.description || "" : "")
      : "";
    const all = headline ? headline.split("\n") : [];
    const lines = l.headlineLines === "first" ? all.slice(0, 1) : all;
    const compact = l.anchor === "bottom-left";
    const a = ANCHOR[l.anchor];
    const maxW = compact
      ? "max-w-[60%]"
      : hasCard
        ? "max-w-[62%] sm:max-w-xl"
        : "max-w-xl";
    const side =
      a.align === "right" ? "ml-auto" : a.align === "center" ? "mx-auto" : "";
    return (
      <div
        key={key}
        className={`absolute inset-0 z-10 flex pointer-events-none pt-8 sm:pt-12 pb-19 sm:pb-23 ${a.wrap} ${hideCls(l.hide)}`}
      >
        <div className="w-full max-w-350 mx-auto px-5 sm:px-8">
          <div
            key={active ? "on" : "off"}
            className={`pointer-events-auto ${maxW} ${side}`}
            style={{ textAlign: a.align }}
          >
            {l.showTag && tag && (
              <span
                className={`inline-flex items-center gap-2 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] ${
                  compact
                    ? "mb-2 px-3 py-1"
                    : "mb-5 px-3.5 py-1.5 animate-fade-up"
                }`}
                style={{
                  background: chipBg,
                  color: chipFg,
                  backdropFilter: "blur(8px)",
                }}
              >
                {tag}
              </span>
            )}
            {lines.length > 0 &&
              (compact ? (
                <H
                  className="font-extrabold text-xl sm:text-2xl leading-tight drop-shadow"
                  style={{ color: ink }}
                >
                  {lines.join(" ")}
                </H>
              ) : (
                <H
                  className="font-extrabold leading-[0.95] tracking-tight mb-5 animate-fade-up"
                  style={{
                    color: ink,
                    fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                    animationDelay: "80ms",
                  }}
                >
                  {lines.map((line, li) => (
                    <span key={li} className="block">
                      {li === 1 ? (
                        <em className="font-display not-italic sm:italic pb-1 inline-block">
                          {line}
                        </em>
                      ) : (
                        line
                      )}
                    </span>
                  ))}
                </H>
              ))}
            {sub && (
              <p
                className="text-sm sm:text-base mb-7 animate-fade-up"
                style={{
                  color: inkSoft,
                  animationDelay: "160ms",
                  maxWidth: "34ch",
                }}
              >
                {sub}
              </p>
            )}
            {withCtas && inline.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {inline.map((c) => (
                  <CtaButton
                    key={c.id}
                    cta={c}
                    ink={ink}
                    className={`animate-fade-up ${hideCls(c.hide)}`}
                    style={{ animationDelay: "240ms" }}
                    onClick={() => fire(c)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="absolute inset-0"
      style={{ background: slide.bg }}
      aria-hidden={!active}
      {...({ inert: !active } as object)}
    >
      {layers.map((layer, i) => {
        if (layer.type === "image") {
          const src = layer.src || p?.image || null;
          if (!src) return null;
          // Fond "full" historique (image + voile gauche) : URL brute (cache prerender).
          const raw = layer.scrim === "left" && layer.dim < 1;
          return (
            <Fragment key={i}>
              <Pic
                src={raw ? src : U.fill(src)}
                srcMobile={
                  layer.srcMobile ? U.mobile(layer.srcMobile) : undefined
                }
                alt={layer.alt}
                className={`absolute inset-0 w-full h-full ${hideCls(layer.hide)}`}
                style={{ objectFit: layer.fit, opacity: layer.dim }}
                eager={eager}
                onError={imgError}
              />
              {layer.scrim !== "none" && (
                <div
                  style={SCRIM[layer.scrim]}
                  className={hideCls(layer.hide)}
                />
              )}
            </Fragment>
          );
        }
        if (layer.type === "card") {
          // layer.productId (autre produit) et showMeta (prix) : pas encore rendus.
          const src = layer.src || p?.image || null;
          if (!src) return null;
          const side =
            layer.side === "left" ? "left-4 sm:left-8" : "right-4 sm:right-8";
          return (
            <div
              key={i}
              className={`absolute ${side} top-1/2 -translate-y-1/2 w-[34vw] sm:w-[38vw] max-w-105 ${hideCls(layer.hide)}`}
            >
              <Pic
                src={U.fill(src)}
                srcMobile={
                  layer.srcMobile ? U.mobile(layer.srcMobile) : undefined
                }
                alt={layer.alt}
                className="w-full aspect-[4/5] max-h-[60vh] object-cover rounded-2xl"
                style={{ boxShadow: "var(--shadow-xl)" }}
                eager={eager}
                onError={imgError}
              />
            </div>
          );
        }
        if (layer.type === "tiles") {
          const main = layer.main;
          const mainSrc = main ? main.src || p?.image || null : null;
          const label = main
            ? main.label || (main.fromProduct && p ? p.title : "")
            : "";
          const click = (link: string | null) => {
            if (link && onLink) onLink(link);
            else onAction(slide, null);
          };
          return (
            <div
              key={i}
              className={`absolute inset-0 flex flex-col sm:flex-row gap-3 p-4 sm:p-8 pt-20 sm:pt-24 pb-24 ${hideCls(layer.hide)}`}
            >
              {main && mainSrc && (
                <button
                  type="button"
                  onClick={() => click(main.link)}
                  className="relative flex-1 min-h-0 rounded-2xl overflow-hidden text-left"
                  style={{ boxShadow: "var(--shadow-xl)" }}
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
              )}
              <div className="flex sm:flex-col gap-3 sm:w-[30%] shrink-0 overflow-x-auto sm:overflow-visible no-scrollbar">
                {layer.items.map((t, ti) => (
                  <button
                    key={ti}
                    type="button"
                    onClick={() => click(t.link || main?.link || null)}
                    className="relative flex-1 min-w-[38vw] sm:min-w-0 sm:min-h-0 rounded-2xl overflow-hidden text-left"
                    style={{ boxShadow: "var(--shadow-lg)" }}
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
                ))}
              </div>
            </div>
          );
        }
        if (layer.type === "html") {
          if (!slide.html) return null;
          const block = (
            <HeroHtmlBlock
              key={i}
              html={slide.html.html}
              css={slide.html.css}
              onLink={onLink}
            />
          );
          return layer.hide ? (
            <div key={i} className={`absolute inset-0 ${hideCls(layer.hide)}`}>
              {block}
            </div>
          ) : (
            block
          );
        }
        return null; // "text" : rendu après les couches
      })}

      {textLayers.map((l, i) => renderText(l, i, i === 0))}

      {textLayers.length === 0 && inline.length > 0 && (
        <div className="absolute inset-0 z-10 flex items-end pointer-events-none pt-8 sm:pt-12 pb-19 sm:pb-23">
          <div className="w-full max-w-350 mx-auto px-5 sm:px-8">
            <div className="pointer-events-auto flex flex-wrap gap-3">
              {inline.map((c) => (
                <CtaButton
                  key={c.id}
                  cta={c}
                  ink={slide.lightBg ? "var(--color-ink)" : "#fff"}
                  className={hideCls(c.hide)}
                  onClick={() => fire(c)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {free.map((c) => {
        const d = c.pos!.desktop;
        const m = c.pos!.mobile;
        const vars = {
          "--hx": `${d.x}%`,
          "--hy": `${d.y}%`,
          ...(m ? { "--hxm": `${m.x}%`, "--hym": `${m.y}%` } : {}),
        } as CSSProperties;
        return (
          <div
            key={c.id}
            className={`hero-cta-free ${hideCls(c.hide)}`}
            style={vars}
          >
            <CtaButton
              cta={c}
              ink={slide.lightBg ? "var(--color-ink)" : "#fff"}
              onClick={() => fire(c)}
            />
          </div>
        );
      })}
    </div>
  );
}
```

### 6.4 `src/admin/HeroFlagButtons.tsx` (nouveau)

```tsx
// src/admin/HeroFlagButtons.tsx — œil / verrou / masquage par appareil (couches ET boutons).
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Monitor,
  MonitorSmartphone,
  Smartphone,
} from "lucide-react";

export interface HeroFlagsPatch {
  off?: boolean;
  lock?: boolean;
  hide?: "desktop" | "mobile";
}

const b: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 3,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  cursor: "pointer",
};
const on: React.CSSProperties = {
  ...b,
  color: "var(--color-accent)",
  borderColor: "var(--color-accent)",
};

export default function HeroFlagButtons({
  off,
  lock,
  hide,
  onChange,
}: HeroFlagsPatch & { onChange: (p: HeroFlagsPatch) => void }) {
  // Cycle : partout → masquée sur mobile → masquée sur desktop → partout.
  const nextHide = (h?: "desktop" | "mobile") =>
    h === undefined ? "mobile" : h === "mobile" ? "desktop" : undefined;
  const HideIcon =
    hide === "mobile"
      ? Smartphone
      : hide === "desktop"
        ? Monitor
        : MonitorSmartphone;
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button
        type="button"
        style={off ? on : b}
        aria-label={off ? "Afficher" : "Masquer (œil fermé)"}
        title={
          off
            ? "Œil fermé : non affichée. Cliquer pour afficher."
            : "Masquer cet élément"
        }
        onClick={() => onChange({ off: off ? undefined : true })}
      >
        {off ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button
        type="button"
        style={lock ? on : b}
        aria-label={lock ? "Déverrouiller" : "Verrouiller"}
        title={
          lock
            ? "Verrouillé (studio). Cliquer pour déverrouiller."
            : "Verrouiller dans le studio"
        }
        onClick={() => onChange({ lock: lock ? undefined : true })}
      >
        {lock ? <Lock size={12} /> : <Unlock size={12} />}
      </button>
      <button
        type="button"
        style={hide ? on : b}
        aria-label="Masquer sur un appareil"
        title={
          hide === "mobile"
            ? "Masquée sur mobile. Cliquer : masquer sur desktop."
            : hide === "desktop"
              ? "Masquée sur desktop. Cliquer : afficher partout."
              : "Affichée partout. Cliquer : masquer sur mobile."
        }
        onClick={() => onChange({ hide: nextHide(hide) })}
      >
        <HideIcon size={12} />
      </button>
    </span>
  );
}
```

### 6.5 `src/admin/HeroStudioPage.tsx` : 7 modifications

**1)** Dans la liste d'import `lucide-react`, juste après la ligne `  Ruler,`, ajoute :

```tsx
  Lock,
  Unlock,
```

Ces deux icônes ne sont pas utilisées directement dans la page (elles sont dans `HeroFlagButtons`). Si ton lint se plaint, ignore cette modification **1** et ne l'applique pas.

Puis juste après la ligne `import HeroHtmlPanel, { type HeroHtmlPanelHandle } from "./HeroHtmlPanel";`, ajoute :

```tsx
import HeroFlagButtons from "./HeroFlagButtons";
```

**2)** Remplace le bloc qui **commence** par `{config.layers.map((l, i) => (` et se termine par `))}` situé juste avant la ligne `{config.layers.length < HERO_MAX_LAYERS && (` par :

```tsx
{
  config.layers.map((l, i) => {
    const patchLayer = (p: {
      off?: boolean;
      lock?: boolean;
      hide?: "desktop" | "mobile";
    }) =>
      patchConfig((c) => ({
        ...c,
        layers: c.layers.map((x, li) =>
          li === i ? ({ ...x, ...p } as HeroLayer) : x,
        ),
      }));
    return (
      <div
        key={i}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "6px 8px",
          borderRadius: 10,
          border:
            layerSel === i
              ? "2px solid var(--color-accent)"
              : "1px solid var(--color-border)",
          background: "var(--color-surface2)",
          opacity: l.off ? 0.5 : 1,
        }}
      >
        <button
          type="button"
          onClick={() => setLayerSel(i)}
          style={{
            flex: 1,
            textAlign: "left",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--color-ink)",
          }}
        >
          {i + 1}. {LAYER_LABEL[l.type] ?? l.type}
          {l.hide
            ? l.hide === "mobile"
              ? " · masquée mobile"
              : " · masquée desktop"
            : ""}
        </button>
        <HeroFlagButtons
          off={l.off}
          lock={l.lock}
          hide={l.hide}
          onChange={patchLayer}
        />
        <button
          type="button"
          aria-label="Monter"
          disabled={!!l.lock}
          style={{ ...btn, padding: 3 }}
          onClick={() => {
            patchConfig((c) => ({ ...c, layers: moveItem(c.layers, i, -1) }));
            setLayerSel(Math.max(0, i - 1));
          }}
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          aria-label="Descendre"
          disabled={!!l.lock}
          style={{ ...btn, padding: 3 }}
          onClick={() => {
            patchConfig((c) => ({ ...c, layers: moveItem(c.layers, i, 1) }));
            setLayerSel(Math.min(config.layers.length - 1, i + 1));
          }}
        >
          <ArrowDown size={12} />
        </button>
        <button
          type="button"
          aria-label="Supprimer"
          disabled={!!l.lock || (l.type === "html" && !isSuper)}
          style={{ ...btn, padding: 3, color: "#ef4444" }}
          onClick={() => {
            patchConfig((c) => ({
              ...c,
              layers: c.layers.filter((_, li) => li !== i),
            }));
            setLayerSel(0);
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>
    );
  });
}
```

**3)** Remplace la ligne qui commence par `<LayerEditor layer={layer} onChange=` (une seule ligne) par :

```tsx
<fieldset
  disabled={!!layer.lock}
  style={{
    border: 0,
    padding: 0,
    margin: 0,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  }}
>
  <LayerEditor
    layer={layer}
    onChange={(nl) =>
      patchConfig((c) => ({
        ...c,
        layers: c.layers.map((x, i) => (i === layerSel ? nl : x)),
      }))
    }
  />
</fieldset>
```

**4)** Dans la liste des boutons (`config.ctas.map((cta) => {`), juste **avant** la ligne `<input style={inputStyle} value={cta.label} onChange={(e) => setCta({ label: e.target.value })} placeholder="Texte du bouton" />`, ajoute :

```tsx
<HeroFlagButtons
  off={cta.off}
  lock={cta.lock}
  hide={cta.hide}
  onChange={(p) => setCta(p as Partial<HeroCta>)}
/>
```

**5)** Dans le `<button` dont le `onClick` contient `ctas: c.ctas.filter((x) => x.id !== cta.id)`, ajoute l'attribut :

```tsx
disabled={!!cta.lock}
```

**6)** Remplace le bloc qui **commence** par `const onHandleDown = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {` et se termine par son `};` par :

```tsx
const onHandleDown = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
  setSelCta(id);
  if (config?.ctas.find((x) => x.id === id)?.lock) return; // verrouillé : sélection seule
  e.currentTarget.setPointerCapture(e.pointerId);
  dragId.current = id;
};
```

**7)** Dans `onHandleKey`, remplace la ligne `const step = e.shiftKey ? 5 : 1;` par :

```tsx
if (cta.lock) return;
const step = e.shiftKey ? 5 : 1;
```

### 6.6 `tests/hero-lot6.test.ts` (nouveau)

```ts
// tests/hero-lot6.test.ts — drapeaux œil/verrou/masquage + politique du sanitizer HTML.
import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeHeroConfig,
  cleanHeroLink,
  cleanHeroSrc,
} from "../src/lib/heroSchema.ts";
import { resolveHeroSlides, heroHasHtml } from "../src/lib/heroResolve.ts";
import {
  tagAction,
  renameTag,
  urlOk,
  cleanSrcset,
  decideAttr,
} from "../src/lib/heroHtmlPolicy.ts";

const IMG = "https://cdn.example.com/a.webp";

test("drapeaux : posés seulement s'ils sont valides, absents sinon (backfill intact)", () => {
  const c = sanitizeHeroConfig({
    layers: [
      { type: "image", src: IMG, off: true, lock: true, hide: "mobile" },
      { type: "text", hide: "tablet", off: "yes" },
    ],
    ctas: [{ label: "Go", hide: "desktop", lock: true }],
  });
  assert.equal(c.layers[0].off, true);
  assert.equal(c.layers[0].lock, true);
  assert.equal(c.layers[0].hide, "mobile");
  assert.equal("off" in c.layers[1], false);
  assert.equal("hide" in c.layers[1], false);
  assert.equal(c.ctas[0].hide, "desktop");
  assert.deepEqual(sanitizeHeroConfig(c), c); // idempotent
  const plain = sanitizeHeroConfig({ layers: [{ type: "image", src: IMG }] });
  assert.equal("off" in plain.layers[0], false);
});

test("resolve : une couche œil fermé ne compte ni comme visuel ni comme HTML", () => {
  const offImg = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ type: "image", src: IMG, off: true }],
  });
  const p = {
    id: "s",
    order: 0,
    isActive: true,
    productId: "",
    config: offImg,
  } as any;
  assert.equal(resolveHeroSlides([p], []).length, 0);
  const offHtml = sanitizeHeroConfig({
    origin: "studio",
    layers: [{ type: "html", off: true }],
  });
  assert.equal(heroHasHtml({ config: offHtml }), false);
});

test("liens / sources : l'antislash est refusé", () => {
  assert.equal(cleanHeroLink("/\\evil.com"), null);
  assert.equal(cleanHeroSrc("/\\evil.com/a.png"), null);
  assert.equal(cleanHeroLink("/promotions"), "/promotions");
  assert.equal(urlOk("/\\evil.com"), false);
  assert.equal(urlOk("//evil.com"), false);
  assert.equal(urlOk("https://cdn.example.com/a.webp"), true);
  assert.equal(urlOk("javascript:alert(1)"), false);
  assert.equal(urlOk("https://x.com/a b.png"), false);
});

test("policy : balises (liste blanche, drop avec contenu, unwrap)", () => {
  assert.equal(tagAction("div"), "keep");
  assert.equal(tagAction("IMG"), "keep");
  for (const t of [
    "script",
    "style",
    "iframe",
    "svg",
    "math",
    "form",
    "input",
    "template",
  ]) {
    assert.equal(tagAction(t), "drop", t);
  }
  for (const t of ["font", "center", "button", "details", "foo-bar"]) {
    assert.equal(tagAction(t), "unwrap", t);
  }
  assert.equal(renameTag("H1"), "h2");
  assert.equal(renameTag("p"), "p");
});

test("policy : attributs", () => {
  assert.equal(decideAttr("div", "onclick", "alert(1)").keep, false);
  assert.equal(decideAttr("div", "style", "color:red").keep, true);
  assert.equal(
    decideAttr("div", "style", "background:url(javascript:alert(1))").keep,
    false,
  );
  assert.equal(decideAttr("a", "href", "https://evil.com").keep, false);
  assert.deepEqual(decideAttr("a", "href", "/promotions"), {
    keep: true,
    value: "/promotions",
  });
  assert.equal(decideAttr("a", "href", "#top").keep, true);
  assert.equal(
    decideAttr("img", "src", "data:image/png;base64,AAA").keep,
    false,
  );
  assert.equal(
    decideAttr("img", "src", "https://cdn.example.com/a.webp").keep,
    true,
  );
  assert.equal(
    decideAttr("img", "srcset", "https://a.com/1.png 1x, /b.png 2x").keep,
    true,
  );
  assert.equal(decideAttr("img", "srcset", "javascript:x 1x").keep, false);
  assert.equal(decideAttr("div", "src", "https://a.com/x").keep, false); // pas d'src sur un div
  assert.equal(decideAttr("div", "id", "x").keep, false);
  assert.equal(decideAttr("td", "colspan", "2").keep, true);
  assert.equal(decideAttr("div", "aria-label", "x").keep, true);
  assert.equal(
    cleanSrcset("https://a.com/1.png 1x, https://a.com/2.png 2x"),
    "https://a.com/1.png 1x, https://a.com/2.png 2x",
  );
  assert.equal(cleanSrcset("https://a.com/1.png 5y"), null);
});
```

---

## Lot 7 : dupliquer, appliquer à tous, modèles perso, rebuild sans cron

### 7.1 Migration (backend) : nouveau fichier `20261037`

```sql
-- supabase/migrations/20261037_hero_templates_flush.sql
-- Lot 7 : modèles de slides (config SEULE, jamais de HTML) + flush "si changé" appelable
-- par le studio (rebuild sans cron). Idempotent. Pas de BEGIN/COMMIT.

-- ─── 1) Modèles perso ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hero_templates (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  config     jsonb       NOT NULL
             CHECK (jsonb_typeof(config) = 'object' AND octet_length(config::text) <= 20000),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hero_templates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hero_templates FROM anon;

DROP POLICY IF EXISTS hero_templates_select_admin ON public.hero_templates;
CREATE POLICY hero_templates_select_admin ON public.hero_templates
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS hero_templates_insert_admin ON public.hero_templates;
CREATE POLICY hero_templates_insert_admin ON public.hero_templates
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS hero_templates_delete_admin ON public.hero_templates;
CREATE POLICY hero_templates_delete_admin ON public.hero_templates
  FOR DELETE TO authenticated USING (public.is_admin());

-- ─── 2) Flush "si changé" (débounce + empreinte côté serveur) ───────────
-- Sans cron (base partagée) : le studio l'appelle après chaque enregistrement et à
-- l'ouverture. Même garde-fous que le cron : rien ne part si le public n'a rien vu changer.
CREATE OR REPLACE FUNCTION public.hero_flush_if_changed()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_flush_if_changed: admin requis' USING ERRCODE = '42501';
  END IF;
  RETURN public.hero_flush_deploy_hook(false);
END;
$$;

REVOKE ALL ON FUNCTION public.hero_flush_if_changed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hero_flush_if_changed() TO authenticated;

NOTIFY pgrst, 'reload schema';
```

### 7.2 `src/api/supabaseApi.ts` : 3 modifications

**1)** Remplace l'import venant de `../lib/heroSchema` (celui qui contient `parseHeroConfig,`) par :

```ts
import {
  parseHeroConfig,
  sanitizeHeroConfig,
  buildHeroConfigFromLegacy,
  heroPayloadBudget,
  type HeroConfig,
  type LegacyHeroFields,
} from "../lib/heroSchema";
```

**2)** Remplace le bloc qui **commence** par `export const heroSyncApi = {` et se termine par son `};` par :

```ts
export const heroSyncApi = {
  async status(): Promise<HeroSyncStatus | null> {
    const { data, error } = await supabase.rpc("hero_sync_status");
    if (error || !data) return null;
    return data as HeroSyncStatus;
  },
  /** Force un build maintenant (ignore le débounce). Renvoie le code du flush. */
  async rebuild(): Promise<string> {
    const { data, error } = await supabase.rpc("hero_request_rebuild");
    if (error) throw error;
    return String(data);
  },
  /** Build seulement si le public a changé ET hors débounce (le serveur décide). */
  async flush(): Promise<string> {
    const { data, error } = await supabase.rpc("hero_flush_if_changed");
    if (error) throw error;
    return String(data);
  },
};
```

**3)** Juste **avant** la ligne `export const reviewApi = {`, ajoute :

```ts
// ─── Hero : modèles perso (config seule, jamais de HTML) ─────────────────────
export interface HeroUserTemplate {
  id: string;
  name: string;
  config: HeroConfig;
  createdAt: string;
}

export const heroTemplatesApi = {
  async list(): Promise<HeroUserTemplate[]> {
    const { data, error } = await supabase
      .from("hero_templates")
      .select("id, name, config, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      config: sanitizeHeroConfig(r.config),
      createdAt: r.created_at,
    }));
  },
  async create(name: string, config: HeroConfig): Promise<void> {
    const clean = sanitizeHeroConfig({ ...config, origin: "studio" });
    // Un modèle est générique : pas de couche HTML (contenu non enregistré), pas de produit lié.
    const layers = clean.layers
      .filter((l) => l.type !== "html")
      .map((l) => (l.type === "card" ? { ...l, productId: null } : l));
    const me = await adminUserApi.getMyRole();
    const { error } = await supabase.from("hero_templates").insert({
      name: name.trim().slice(0, 60),
      config: sanitizeHeroConfig({ ...clean, layers }),
      created_by: me?.email ?? null,
    });
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from("hero_templates")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
```

### 7.3 `src/admin/HeroSyncBadge.tsx` : remplacement complet

Elle appelle `flush()` après chaque enregistrement. Elle le rappelle une seule fois à l'ouverture si un build est en attente (le « trailing build » que le cron ferait).

```tsx
// src/admin/HeroSyncBadge.tsx — état du prerender (Deploy Hook) dans l'en-tête du studio.
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { heroSyncApi, type HeroSyncStatus } from "../api/supabaseApi";

const MSG: Record<string, string> = {
  triggered: "Build lancé : la boutique sera à jour dans quelques minutes.",
  "no-secret": "Deploy Hook non configuré (secret Vault manquant).",
  unchanged: "Rien à republier : la boutique est déjà à jour.",
  debounced:
    "Un build récent est déjà passé : le suivant partira à la prochaine ouverture ou « Republier ».",
};

export default function HeroSyncBadge() {
  const [st, setSt] = useState<HeroSyncStatus | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const refresh = useCallback(
    () => heroSyncApi.status().then(setSt, () => setSt(null)),
    [],
  );

  useEffect(() => {
    void refresh();
    // Après chaque enregistrement du studio : le serveur décide (empreinte + débounce).
    const on = () =>
      setTimeout(() => {
        heroSyncApi
          .flush()
          .catch(() => {})
          .finally(() => void refresh());
      }, 1500);
    window.addEventListener("storefront:invalidate", on);
    return () => window.removeEventListener("storefront:invalidate", on);
  }, [refresh]);

  // Build resté en attente (débounce) : on retente UNE fois à l'ouverture du studio.
  const pending = st ? st.pending : false;
  const configured = st ? st.hookConfigured : false;
  useEffect(() => {
    if (!pending || !configured) return;
    heroSyncApi
      .flush()
      .catch(() => {})
      .finally(() => void refresh());
  }, [pending, configured, refresh]);

  if (st === undefined) return null;
  const base: React.CSSProperties = {
    fontSize: 12,
    color: "var(--color-ink3)",
    marginTop: 4,
  };
  if (st === null) {
    return (
      <p style={base}>
        Statut du build indisponible (migration du lot 5 non appliquée ?).
      </p>
    );
  }

  const label = !st.hookConfigured
    ? "Rebuild automatique : non configuré"
    : st.pending
      ? "Build de la boutique en attente (≤ 10 min)"
      : "Boutique à jour";

  const rebuild = async () => {
    if (!window.confirm("Relancer la construction de la boutique maintenant ?"))
      return;
    setBusy(true);
    setInfo(null);
    try {
      const code = await heroSyncApi.rebuild();
      setInfo(MSG[code] ?? code);
      void refresh();
    } catch (e: any) {
      setInfo(e?.message || "Échec.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        ...base,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: !st.hookConfigured
            ? "#d97706"
            : st.pending
              ? "var(--color-accent)"
              : "var(--color-success)",
        }}
      />
      <span>
        {label}
        {st.lastHookAt
          ? ` · dernier build ${new Date(st.lastHookAt).toLocaleString("fr-FR")}`
          : ""}
      </span>
      {st.hookConfigured && (
        <button
          type="button"
          onClick={rebuild}
          disabled={busy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            color: "var(--color-ink2)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={11} /> Republier maintenant
        </button>
      )}
      {info && <span>{info}</span>}
    </div>
  );
}
```

### 7.4 `src/admin/HeroHtmlPanel.tsx` : 4 modifications (graine pour « Dupliquer »)

**1)** Dans l'interface `Props`, juste après la ligne `isFirst: boolean;`, ajoute :

```tsx
  /** HTML initial d'une copie (Dupliquer) : utilisé seulement quand slideId est null. */
  seed?: { html: string; css: string } | null;
```

**2)** Remplace la ligne `const { slideId, hasLayer, isSuper, isFirst, onLive, onDirty, measure, onRatios } = props;` par :

```tsx
const {
  slideId,
  hasLayer,
  isSuper,
  isFirst,
  onLive,
  onDirty,
  measure,
  onRatios,
  seed,
} = props;
```

**3)** Remplace la ligne `const [html, setHtml] = useState("");` par :

```tsx
const [html, setHtml] = useState(seed?.html ?? "");
```

**4)** Remplace la ligne `const [css, setCss] = useState("");` par :

```tsx
const [css, setCss] = useState(seed?.css ?? "");
```

### 7.5 `src/admin/HeroStudioPage.tsx` : 9 modifications

**1)** Remplace la ligne d'import `import { adminUserApi, heroPromotionsApi, productApi } from "../api/supabaseApi";` par :

```tsx
import {
  adminUserApi,
  heroHtmlApi,
  heroPromotionsApi,
  heroTemplatesApi,
  productApi,
  type HeroUserTemplate,
} from "../api/supabaseApi";
```

**2)** Juste après la ligne `const htmlRef = useRef<HeroHtmlPanelHandle>(null);`, ajoute :

```tsx
const [userTpls, setUserTpls] = useState<HeroUserTemplate[]>([]);
const [seedHtml, setSeedHtml] = useState<{ html: string; css: string } | null>(
  null,
);
const [draftSeq, setDraftSeq] = useState(0);
```

**3)** Juste **avant** la ligne de commentaire `// Mesure du HTML dans l'iframe (même rendu que la boutique).`, ajoute :

```tsx
// Modèles perso (config seule, sans HTML).
const reloadTemplates = () =>
  heroTemplatesApi.list().then(setUserTpls, () => setUserTpls([]));
useEffect(() => {
  void reloadTemplates();
}, []);
```

**4)** Dans `startNew`, remplace la ligne `setShowTemplates(false);` par :

```tsx
setShowTemplates(false);
setSeedHtml(null);
setDraftSeq((n) => n + 1);
```

**5)** Juste **avant** la ligne `const remove = async () => {`, ajoute :

```tsx
const duplicate = async () => {
  if (!draft || !confirmLeave()) return;
  // HTML : on emporte ce qui est dans le panneau (modifs non enregistrées incluses).
  let seed = liveHtml;
  if (
    !seed &&
    isSuper &&
    draft.id &&
    draft.config.layers.some((l) => l.type === "html")
  ) {
    try {
      const r = await heroHtmlApi.getForEdit(draft.id);
      if (r) seed = { html: r.html, css: r.css };
    } catch {
      /* copie sans HTML */
    }
  }
  setSeedHtml(seed);
  setDraftSeq((n) => n + 1);
  setDraft({
    ...draft,
    id: null,
    isActive: false,
    startsAt: null,
    endsAt: null,
    config: { ...draft.config, origin: "studio" },
  });
  setBaseline("");
  setMsg({
    ok: true,
    text: "Copie créée en brouillon : enregistre-la pour la conserver.",
  });
};

const saveAsTemplate = async () => {
  if (!draft) return;
  const name = window.prompt("Nom du modèle ?", "")?.trim();
  if (!name) return;
  try {
    await heroTemplatesApi.create(name, draft.config);
    await reloadTemplates();
    setMsg({
      ok: true,
      text: `Modèle « ${name} » enregistré (structure et réglages, sans HTML ni produit).`,
    });
  } catch (e: any) {
    setMsg({
      ok: false,
      text: e?.message || "Enregistrement du modèle impossible.",
    });
  }
};

const applySizingToAll = async () => {
  if (!draft) return;
  if (dirty) {
    setMsg({
      ok: false,
      text: "Enregistre d'abord le slide courant, puis applique ses dimensions à tous.",
    });
    return;
  }
  if (!window.confirm(`Appliquer ces dimensions aux ${slides.length} slides ?`))
    return;
  try {
    for (const s of slides) {
      if (s.id === draft.id) continue;
      await heroPromotionsApi.update(s.id, {
        config: sanitizeHeroConfig({
          ...resolveHeroConfig(s),
          origin: "studio",
          sizing: draft.config.sizing,
        }),
      });
    }
    window.dispatchEvent(new Event("storefront:invalidate"));
    await load(draft.id);
    setMsg({ ok: true, text: "Dimensions appliquées à tous les slides." });
  } catch (e: any) {
    setMsg({ ok: false, text: e?.message || "Application impossible." });
  }
};
```

**6)** Remplace le bloc qui **commence** par `{showTemplates && (` et se termine par `)}` situé juste avant la ligne `{draft && draft.id === null && (` par :

```tsx
{
  showTemplates && (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {HERO_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => startNew(t.build)}
          style={{
            ...btn,
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <strong style={{ color: "var(--color-ink)" }}>{t.label}</strong>
          <span style={{ fontWeight: 400, fontSize: 11 }}>{t.desc}</span>
        </button>
      ))}
      {userTpls.length > 0 && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--color-ink4)",
            marginTop: 4,
          }}
        >
          MES MODÈLES
        </div>
      )}
      {userTpls.map((t) => (
        <div key={t.id} style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={() =>
              startNew(() =>
                sanitizeHeroConfig({ ...t.config, origin: "studio" }),
              )
            }
            style={{ ...btn, flex: 1, justifyContent: "flex-start" }}
          >
            <strong style={{ color: "var(--color-ink)" }}>{t.name}</strong>
          </button>
          <button
            type="button"
            aria-label={`Supprimer le modèle ${t.name}`}
            style={{ ...btn, padding: 6, color: "#ef4444" }}
            onClick={async () => {
              if (!window.confirm(`Supprimer le modèle « ${t.name} » ?`))
                return;
              try {
                await heroTemplatesApi.remove(t.id);
                await reloadTemplates();
              } catch (e: any) {
                setMsg({
                  ok: false,
                  text: e?.message || "Suppression impossible.",
                });
              }
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
```

**7)** Juste **avant** la ligne `{dirty && <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-accent)" }}>● Non enregistré</span>}`, ajoute :

```tsx
            <button type="button" onClick={duplicate} style={btn} title="Créer une copie en brouillon">
              Dupliquer
            </button>
            <button type="button" onClick={saveAsTemplate} style={btn} title="Réutiliser cette structure pour de futurs slides">
              Enregistrer comme modèle
            </button>
```

**8)** Juste **avant** la ligne `<Section title="Fond">`, ajoute :

```tsx
<Section title="Tous les slides" open={false}>
  <p style={{ fontSize: 12, color: "var(--color-ink3)", margin: 0 }}>
    Le cadre du carrousel suit le slide n°1. Pour des dimensions homogènes :
  </p>
  <button type="button" style={btn} onClick={applySizingToAll}>
    <Ruler size={13} /> Appliquer ces dimensions à tous les slides
  </button>
</Section>
```

**9)** Dans l'élément `<HeroHtmlPanel`, remplace la ligne `key={draft.id ?? "new"}` par :

```tsx
                  key={`${draft.id ?? "new"}-${draftSeq}`}
                  seed={draft.id ? null : seedHtml}
```

---

## Lot 8 : accessibilité du carrousel

Un contenu qui défile plus de 5 secondes doit pouvoir être mis en pause (WCAG 2.2.2). Ce lot ajoute aussi le respect de `prefers-reduced-motion` : l'autoplay est coupé pour ces utilisateurs.

**Changement visible, déclaré :** un petit bouton pause/lecture (14 px) apparaît à gauche des points. Il est masqué si le visiteur a demandé moins de mouvement.

### 8.1 `src/components/HeroCarousel.tsx` : 6 modifications

**1)** Remplace la ligne `import { ChevronLeft, ChevronRight, ArrowDown } from "lucide-react";` par :

```tsx
import {
  ChevronLeft,
  ChevronRight,
  ArrowDown,
  Pause,
  Play,
} from "lucide-react";
```

**2)** Juste après la ligne `const [armed, setArmed] = useState(false);`, ajoute :

```tsx
const [userPaused, setUserPaused] = useState(false);
const [reduced, setReduced] = useState(
  () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true,
);
useEffect(() => {
  const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  if (!mq) return;
  const on = () => setReduced(mq.matches);
  mq.addEventListener?.("change", on);
  return () => mq.removeEventListener?.("change", on);
}, []);
```

**3)** Remplace le bloc de l'autoplay qui **commence** par `useEffect(() => {` suivi de `if (suspended || isPaused || count === 0) return;` et se termine par `}, [suspended, isPaused, count]);` par :

```tsx
useEffect(() => {
  if (suspended || isPaused || userPaused || reduced || count === 0) return;
  const timer = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
  return () => clearInterval(timer);
}, [suspended, isPaused, userPaused, reduced, count]);
```

**4)** Juste après la ligne `style={frameVars(sizing)}`, ajoute :

```tsx
        aria-roledescription="carousel"
        aria-label="Promotions"
        aria-live={isPaused || userPaused || reduced ? "polite" : "off"}
```

**5)** Juste après la ligne `className="absolute inset-0 transition-opacity duration-700"` (le wrapper de chaque slide), ajoute :

```tsx
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} / ${count}`}
```

**6)** Juste après la ligne `<div className="flex items-center gap-2 pointer-events-auto">`, ajoute :

```tsx
{
  !isSingle && !reduced && (
    <button
      type="button"
      onClick={() => setUserPaused((p) => !p)}
      aria-pressed={userPaused}
      aria-label={
        userPaused ? "Reprendre le défilement" : "Mettre le défilement en pause"
      }
      className="flex items-center justify-center min-w-[24px] min-h-[24px]"
      style={{ color: ink }}
    >
      {userPaused ? <Play size={14} /> : <Pause size={14} />}
    </button>
  );
}
```

### 8.2 `tests/hero-lot7.test.ts` (nouveau, gardes de la migration 37)

```ts
// tests/hero-lot7.test.ts — gardes statiques de la migration 20261037.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(
  join(root, "supabase/migrations/20261037_hero_templates_flush.sql"),
  "utf8",
);

test("lot 7 : modèles réservés aux admins, jamais de lecture anonyme", () => {
  assert.ok(sql.includes("ENABLE ROW LEVEL SECURITY"));
  assert.ok(sql.includes("REVOKE ALL ON public.hero_templates FROM anon"));
  for (const op of ["SELECT", "INSERT", "DELETE"]) {
    assert.ok(sql.includes(`FOR ${op} TO authenticated`), op);
  }
  assert.ok(!/USING\s*\(\s*true\s*\)/i.test(sql));
  assert.ok(!/TO\s+anon/i.test(sql.replace(/REVOKE[^;]*;/g, "")));
});

test("lot 7 : le flush exige is_admin() et reste débouncé côté serveur", () => {
  assert.ok(sql.includes("IF NOT public.is_admin()"));
  assert.ok(sql.includes("hero_flush_deploy_hook(false)")); // jamais p_force depuis ce chemin
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.hero_flush_if_changed() FROM PUBLIC, anon",
    ),
  );
});
```

---

## Vérifications, dans l'ordre

1. `npm rm dompurify @types/dompurify`, puis appliquer 4b.1 à 4b.4. `npm test` : la garde dompurify repasse au vert.
2. **Dans le studio, en super_admin** : section « HTML collé » → **« Tester le filtre »**. Tu dois voir `19/19 vecteurs neutralisés`. **S'il y a un échec, ne publie aucun HTML et envoie-moi le nom du vecteur.**
3. Colle un vrai bloc HTML + CSS : « Nettoyer & vérifier », puis enregistre.
4. Lot 6 : appliquer 6.1 à 6.6.
   - Dans la liste des couches, ferme l'œil d'une couche, verrouille-en une autre, et passe-en une en « masquée mobile ».
   - Bascule l'aperçu Desktop / Mobile.
   - Une couche verrouillée ne doit plus pouvoir être modifiée ni supprimée.
   - Tes 5 slides existants doivent rester **identiques** en boutique.
5. Lot 7 : migration `20261037`, puis 7.2 à 7.5. Teste « Dupliquer » (y compris un slide HTML en super_admin), « Enregistrer comme modèle » puis « Nouveau slide → Mes modèles », et « Appliquer à tous ».
6. Lot 8 : appliquer 8.1. Vérifie le bouton pause. Active « réduire les animations » dans ton OS : l'autoplay doit s'arrêter et le bouton disparaître.
7. `npm run lint`, `npm test`, `npm run build`.

---

## Suite de la roadmap, par ordre de valeur

| #   | Chantier                                                                                                                                     | Pourquoi                                                                                                                     | Ce qu'il me faut                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | **Historique et annulation** : les 10 dernières versions de la config (et du HTML, super_admin) par slide, avec « Restaurer » dans le studio | Aujourd'hui un enregistrement écrase l'état précédent, sans retour possible. C'est le principal risque d'un studio.          | Rien (migration 38 + trigger)                                                                      |
| 2   | **Slide n°1 en Declarative Shadow DOM au prerender**                                                                                         | Permet de mettre du HTML en slide n°1 sans perdre le LCP (supprime l'avertissement)                                          | `scripts/prerender.ts`                                                                             |
| 3   | **Statistiques du hero** : impressions et clics par slide et par bouton, avec l'A/B (`getVariant`)                                           | Savoir quel slide convertit                                                                                                  | La définition de la table `engagement_events` (contraintes CHECK sur `event_type` / `entity_type`) |
| 4   | **Variantes de grille** (bento, asymétrique, masonry des maquettes)                                                                          | Les maquettes les prévoyaient ; c'est une option de la couche « Tuiles », pas un nouveau moteur                              | Rien                                                                                               |
| 5   | **Cron en production uniquement** : bloc cron de la migration 36 + secret Vault                                                              | Rebuild automatique y compris pour les mises en ligne planifiées (sans cron, un slide planifié n'est pas rebuildé tout seul) | Un accès prod                                                                                      |

**Mon choix pour la prochaine étape : le n°1.** Il demande peu de code et protège tout le reste. Dis-moi « go historique » et je livre la migration 38, l'API et l'écran « Restaurer ».
