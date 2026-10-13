# Hero Studio, lot 13 : slide n°1 en HTML sans perte de LCP, planification et A/B dans le prerender

Aucune migration SQL (le 43 reste le dernier). Je n'ai rien exécuté ici : lint, tests et build sont à lancer chez toi.

**Ce que fait ce lot**

1. **Planification et A/B** : le prerender applique les mêmes règles que la boutique, via `resolveHeroSlides`. Il tient compte de l'activation, de la fenêtre de planification (évaluée à l'heure du build), du produit actif, de la variante A/B et du HTML publié.
2. **Un slide d'amorçage par variante** : si le slide n°1 diffère entre A et B, les deux sont émis dans la page. Un script inline de 400 octets cache l'autre avant la première peinture. Il reproduit `getVariant()` à l'identique, et un test le prouve.
3. **Slide n°1 en HTML en Declarative Shadow DOM** : le HTML est peint par le navigateur avant tout JavaScript. Au démarrage de React, il est monté de façon synchrone avant la peinture, puis re-vérifié par le filtre navigateur. Si le résultat est identique, rien n'est recréé.
4. **Le cadre du slide d'amorçage suit la config** : il utilise `.hero-box`, avec sizing auto ou fixe, largeur contenue ou pleine. Avant, il était figé à 78vh.
5. **Une seule source de vérité** pour les largeurs d'image, la construction d'URL, le cadre et le CSS de base, partagée entre React et Node. Les URLs d'image du slide d'amorçage sont maintenant identiques à celles du slide final.

**Décisions que je déclare**

- **Dépendance** : `parse5`, en devDependency, utilisée au build seulement. Le HTML collé est parsé et reconstruit en Node avec la même politique que dans le navigateur (`heroHtmlPolicy.ts`). Il n'y a ni regex ni re-sérialisation par le parseur. Si le paquet est absent, le build n'échoue pas : un slide n°1 en HTML n'a alors pas d'amorçage.
- **Un `innerHTML` ciblé** : uniquement pour le slide d'amorçage (`instant`), dont le HTML est un artefact de build déjà filtré. Il évite un écran vide le temps de charger le chunk du filtre. Tous les autres chemins gardent la reconstruction DOM.
- **Poids de la page** : si le slide n°1 est un HTML, son contenu apparaît deux fois dans `index.html` (DSD et JSON). C'est jusqu'à ~100 Ko dans le pire cas du plafond de 50 Ko. Un HTML typique fait quelques Ko.
- **Rendu avant JavaScript** : il montre le visuel (image, carte) et le HTML. Les textes et boutons de la config apparaissent au démarrage de React. Les tuiles sont approximées par leur image principale, comme avant.

---

## 0. Installation

```bash
npm i -D parse5
```

---

## 1. Nouveaux fichiers purs (`src/lib`)

### 1.1 `src/lib/heroImages.ts` (nouveau)

```ts
// src/lib/heroImages.ts — PUR (importé aussi par le prerender Node) : largeurs d'image du hero et
// construction d'URL Supabase render/image. SOURCE UNIQUE : HeroSlideView et le prerender doivent
// produire la même URL octet pour octet (sinon l'image est téléchargée deux fois).
export interface HeroRenderOpts {
  width?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png";
}

export const HERO_IMG_OPTS = {
  fill: { width: 1280, quality: 75 },
  mobile: { width: 800, quality: 75 },
  tile: { width: 400, quality: 70 },
} as const;

/** `host` = hostname Supabase en minuscules (null = pas de transformation). */
export function buildSupabaseRenderUrl(
  host: string | null,
  sourceUrl: string,
  opts: HeroRenderOpts = {},
): string {
  if (!sourceUrl || typeof sourceUrl !== "string") return sourceUrl;
  if (!host) return sourceUrl;
  const h = host.toLowerCase();
  let u: URL;
  try {
    u = new URL(sourceUrl);
  } catch {
    return sourceUrl;
  }
  if (u.hostname.toLowerCase() !== h) return sourceUrl;
  const m = u.pathname.match(/^\/storage\/v1\/object\/public\/(.+)$/);
  if (!m) return sourceUrl;
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.quality) params.set("quality", String(opts.quality));
  params.set("format", opts.format ?? "webp");
  return `https://${h}/storage/v1/render/image/public/${m[1]}?${params.toString()}`;
}
```

### 1.2 `src/lib/heroFrame.ts` (nouveau)

```ts
// src/lib/heroFrame.ts — PUR : variables CSS du cadre du hero (.hero-box). Partagé React / prerender.
import type { HeroSizing } from "./heroSchema.ts";

export function heroHeightCss(h: { unit: "vh" | "px"; value: number }): string {
  // vh : mêmes bornes que l'ancien h-[78vh] min-h-105 max-h-190 (420px / 760px).
  return h.unit === "vh" ? `clamp(420px, ${h.value}vh, 760px)` : `${h.value}px`;
}

export function heroFrameVars(s: HeroSizing): Record<string, string | number> {
  if (s.mode === "auto")
    return { "--hero-r": s.ratio.desktop, "--hero-rm": s.ratio.mobile };
  return {
    "--hero-h": heroHeightCss(s.height),
    "--hero-hm": heroHeightCss(s.heightMobile ?? s.height),
  };
}
```

### 1.3 `src/lib/heroHtmlBase.ts` (nouveau)

```ts
// src/lib/heroHtmlBase.ts — CSS de base du shadow root du HTML collé. PUR (partagé navigateur / prerender).
export const BASE_CSS =
  ":host{display:block;position:absolute;inset:0;overflow:hidden;contain:layout paint style;" +
  "color:var(--color-ink);font-family:var(--font-sans);line-height:1.4}" +
  "*,*::before,*::after{box-sizing:border-box}img,svg,picture{max-width:100%}";
```

### 1.4 `src/lib/heroLead.ts` (nouveau)

```ts
// src/lib/heroLead.ts — slide d'amorçage (prerender → navigateur). PUR, sauf readLeadSlide /
// leadHtmlSeed qui lisent le DOM à l'appel (jamais à l'import : importable en Node).
import { parseHeroConfig, type HeroConfig } from "./heroSchema.ts";
import {
  parseLeadHero,
  resolveHeroSlides,
  type HeroHtmlPayload,
  type ResolvedHeroSlide,
} from "./heroResolve.ts";

export const LEAD_ELEMENT_ID = "lead-hero-data";
/** Le slide rendu garde l'id "lead" : le suivi ne le mesure jamais (heroTracking). */
export const LEAD_SLIDE_ID = "lead";

export interface LeadPayload {
  /** Id RÉEL du slide : sert uniquement à amorcer son HTML (App → heroHtml). */
  id: string;
  product: {
    id: string;
    title: string;
    description: string;
    image: string;
  } | null;
  config: HeroConfig;
  /** HTML/CSS déjà filtrés au build (même politique que le navigateur). */
  html: HeroHtmlPayload | null;
}

/** Format du JSON embarqué : un seul slide pour tous, ou un par variante A/B. */
export type LeadDoc =
  | { v: 2; lead: LeadPayload }
  | { v: 2; A: LeadPayload | null; B: LeadPayload | null };

/**
 * Script inline posé AVANT les slides d'amorçage : fixe html[data-hero-v] = "A" | "B".
 * Reproduit EXACTEMENT getSessionId() + getVariant() de src/lib/engagement.ts (même clé de
 * stockage, même hachage). Un test exécute ce script et compare au calcul de référence.
 */
export const LEAD_VARIANT_SCRIPT =
  '(function(){var v="A";try{var k="instawear-engagement-sid",s;try{s=localStorage.getItem(k);' +
  "if(!s){s=(window.crypto&&window.crypto.randomUUID&&window.crypto.randomUUID())||" +
  '(Date.now()+"-"+Math.random().toString(36).slice(2));localStorage.setItem(k,s)}}' +
  'catch(e){s="memory-session"}var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;' +
  'v=h%2===0?"A":"B"}catch(e){}document.documentElement.setAttribute("data-hero-v",v)})();';

export const LEAD_VARIANT_CSS =
  'html[data-hero-v="A"] [data-lead-v="B"],html[data-hero-v="B"] [data-lead-v="A"]{display:none!important}';

export function buildLeadPayload(slide: ResolvedHeroSlide): LeadPayload {
  const p = slide.product;
  return {
    id: slide.id,
    product: p
      ? {
          id: p.id,
          title: p.title,
          description: p.description ?? "",
          image: p.image ?? "",
        }
      : null,
    config: slide.config,
    html: slide.html ?? null,
  };
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const s = (v: unknown): string => (typeof v === "string" ? v : "");

/** Payload → slide prêt à rendre (id "lead"). null si invalide. Jamais d'exception. */
export function parseLeadPayload(raw: unknown): ResolvedHeroSlide | null {
  if (!isObj(raw)) return null;
  const id = s(raw.id).slice(0, 80);
  const config = parseHeroConfig(raw.config);
  if (!id || !config) return null;
  const rp = isObj(raw.product) ? raw.product : null;
  const product =
    rp && s(rp.id)
      ? {
          id: s(rp.id),
          title: s(rp.title),
          description: s(rp.description),
          image: s(rp.image),
          isActive: true,
        }
      : null;
  const rh = isObj(raw.html) ? raw.html : null;
  const html =
    rh && typeof rh.html === "string" && typeof rh.css === "string"
      ? { html: rh.html, css: rh.css }
      : null;
  // Mêmes règles que la boutique (slide HTML sans HTML = écarté, etc.).
  const [slide] = resolveHeroSlides(
    [
      {
        id,
        order: 0,
        isActive: true,
        productId: product ? product.id : "",
        config,
      },
    ],
    product ? [product] : [],
    Date.now(),
    html ? { [id]: html } : {},
    null,
  );
  return slide ? { ...slide, id: LEAD_SLIDE_ID } : null;
}

function readDoc(): unknown {
  try {
    if (typeof document === "undefined") return null;
    const node = document.getElementById(LEAD_ELEMENT_ID);
    return node && node.textContent ? JSON.parse(node.textContent) : null;
  } catch {
    return null;
  }
}

/** undefined = ce n'est pas le format v2 (ancien format à plat). */
function pickPayload(doc: unknown, variant: "A" | "B"): unknown {
  if (!isObj(doc) || doc.v !== 2) return undefined;
  return doc.lead !== undefined ? doc.lead : doc[variant];
}

/** Slide d'amorçage de CETTE variante (v2), sinon ancien format à plat (builds antérieurs). */
export function readLeadSlide(variant: "A" | "B"): ResolvedHeroSlide | null {
  const doc = readDoc();
  if (doc === null) return null;
  const picked = pickPayload(doc, variant);
  if (picked !== undefined) return parseLeadPayload(picked);
  try {
    return parseLeadHero(doc);
  } catch {
    return null;
  }
}

/** HTML du slide d'amorçage, indexé par l'id réel : amorce l'état heroHtml d'App (pas de trou). */
export function leadHtmlSeed(
  variant: "A" | "B",
): Record<string, HeroHtmlPayload> {
  const picked = pickPayload(readDoc(), variant);
  if (!isObj(picked) || !s(picked.id) || !isObj(picked.html)) return {};
  const h = picked.html;
  if (typeof h.html !== "string" || typeof h.css !== "string") return {};
  return { [s(picked.id)]: { html: h.html, css: h.css } };
}
```

---

## 2. Fichier Node : `scripts/hero-lead.ts` (nouveau)

```ts
// scripts/hero-lead.ts — slide d'amorçage du hero, côté BUILD (Node). Utilisé par scripts/prerender.ts.
// - mêmes règles de sélection que la boutique (resolveHeroSlides) pour chaque variante A/B ;
// - HTML collé : parse5 (parseur HTML5 conforme) + MÊME politique que le navigateur
//   (heroHtmlPolicy) ; on reconstruit une chaîne neuve, rien n'est re-sérialisé par le parseur ;
// - slide n°1 en HTML => Declarative Shadow DOM (<template shadowrootmode>).
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseHeroConfig } from "../src/lib/heroSchema.ts";
import {
  heroHasHtml,
  resolveHeroSlides,
  type HeroHtmlPayload,
  type HeroProductLite,
  type HeroPromoLike,
  type ResolvedHeroSlide,
} from "../src/lib/heroResolve.ts";
import {
  HERO_HTML_MAX_DEPTH,
  HERO_HTML_MAX_NODES,
  HTML_NS,
  decideAttr,
  renameTag,
  tagAction,
} from "../src/lib/heroHtmlPolicy.ts";
import { sanitizeHeroCss } from "../src/lib/heroCss.ts";
import { BASE_CSS } from "../src/lib/heroHtmlBase.ts";
import {
  HERO_IMG_OPTS,
  buildSupabaseRenderUrl,
} from "../src/lib/heroImages.ts";
import { heroFrameVars } from "../src/lib/heroFrame.ts";
import {
  LEAD_ELEMENT_ID,
  LEAD_VARIANT_CSS,
  LEAD_VARIANT_SCRIPT,
  buildLeadPayload,
  type LeadDoc,
} from "../src/lib/heroLead.ts";

export interface HeroLead {
  /** HTML à placer au début de #root (espaceurs, slides d'amorçage, JSON). */
  markup: string;
  /** <link rel="preload"> du <head> (slide HTML à variante unique seulement). */
  preload: string | null;
  /** Ligne de log du build. */
  info: string;
}

// ─── Assainissement Node du HTML collé ──────────────────────────────────
interface P5 {
  nodeName: string;
  tagName?: string;
  namespaceURI?: string;
  value?: string;
  attrs?: { name: string; value: string }[];
  childNodes?: P5[];
}
export interface NodeSanitized {
  html: string;
  css: string;
  firstImg: string | null;
}

const VOID = new Set(["br", "hr", "img", "source", "col", "wbr"]);
const escText = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (t: string) => escText(t).replace(/"/g, "&quot;");

function find(n: P5, name: string): P5 | null {
  for (const c of n.childNodes ?? []) {
    if (c.nodeName === name) return c;
    const r = find(c, name);
    if (r) return r;
  }
  return null;
}
function collectStyles(n: P5): string {
  let out = "";
  for (const c of n.childNodes ?? []) {
    if (c.nodeName === "style")
      out += (c.childNodes ?? []).map((t) => t.value ?? "").join("") + "\n";
    else out += collectStyles(c);
  }
  return out;
}

interface Ctx {
  count: number;
  firstImg: string | null;
}
/** Miroir de build() de src/lib/heroHtml.ts, mais en chaînes. */
function build(src: P5, ctx: Ctx, depth: number): string {
  let out = "";
  for (const child of src.childNodes ?? []) {
    if (ctx.count >= HERO_HTML_MAX_NODES) break;
    if (child.nodeName === "#text") {
      out += escText(child.value ?? "");
      ctx.count++;
      continue;
    }
    if (!child.tagName) continue; // commentaires, doctype : jamais copiés
    if (child.namespaceURI !== HTML_NS) continue; // SVG / MathML : retirés
    const tag = child.tagName.toLowerCase();
    const action = tagAction(tag);
    if (action === "drop") continue;
    if (action === "unwrap") {
      out += build(child, ctx, depth);
      continue;
    }
    if (depth >= HERO_HTML_MAX_DEPTH) continue;
    const outTag = renameTag(tag);
    let attrs = "";
    for (const a of child.attrs ?? []) {
      const d = decideAttr(tag, a.name, a.value);
      if (!d.keep) continue;
      attrs += ` ${a.name.toLowerCase()}="${escAttr(d.value)}"`;
      if (tag === "img" && a.name.toLowerCase() === "src" && !ctx.firstImg)
        ctx.firstImg = d.value;
    }
    if (tag === "a") attrs += ' rel="noopener noreferrer"';
    ctx.count++;
    out += VOID.has(outTag)
      ? `<${outTag}${attrs}>`
      : `<${outTag}${attrs}>${build(child, ctx, depth + 1)}</${outTag}>`;
  }
  return out;
}

/** null si parse5 est absent ou si le résultat dépasse 60 Ko : l'appelant n'émet alors aucun DSD. */
export async function sanitizeHeroHtmlNode(
  rawHtml: string,
  rawCss: string,
): Promise<NodeSanitized | null> {
  let parse: (html: string) => P5;
  try {
    const spec = "parse5"; // spécificateur dynamique : le build ne casse pas sans le paquet
    parse = ((await import(spec)) as { parse: (html: string) => P5 }).parse;
  } catch {
    return null;
  }
  const doc = parse(String(rawHtml ?? ""));
  const body = find(doc, "body");
  if (!body) return null;
  const ctx: Ctx = { count: 0, firstImg: null };
  const html = build(body, ctx, 0);
  const merged = `${rawCss ?? ""}\n${collectStyles(doc)}`.trim();
  const c = sanitizeHeroCss(merged);
  const css = c.errors.length ? "" : c.css;
  const bytes = new TextEncoder().encode(html + css).length;
  if (bytes > 60_000) return null;
  return { html, css, firstImg: ctx.firstImg };
}

// ─── Slide préparé ──────────────────────────────────────────────────────
export interface PreparedLead {
  slide: ResolvedHeroSlide;
  clean: NodeSanitized | null;
}

/** Slide HTML : filtre le HTML (sinon null = pas d'amorçage). Autres slides : tels quels. */
export async function prepareLeadSlide(
  slide: ResolvedHeroSlide | null,
): Promise<PreparedLead | null> {
  if (!slide) return null;
  if (!slide.html) return { slide, clean: null };
  const clean = await sanitizeHeroHtmlNode(slide.html.html, slide.html.css);
  if (!clean) return null;
  return {
    slide: { ...slide, html: { html: clean.html, css: clean.css } },
    clean,
  };
}

// ─── Balisage statique ──────────────────────────────────────────────────
const esc = escAttr;
const SPACERS =
  `<div style="height:34px;background:var(--color-accent-strong);"></div>` +
  `<div style="height:64px;background:var(--color-bg);"></div>`;

const SCRIM_HTML = {
  left: '<div style="position:absolute;inset:0;background:linear-gradient(90deg, rgba(15,13,10,.68) 0%, rgba(15,13,10,.28) 55%, transparent 100%)"></div>',
  bottom:
    '<div style="position:absolute;left:0;right:0;bottom:0;height:45%;background:linear-gradient(180deg, transparent, rgba(10,9,7,.55))"></div>',
} as const;

function pic(
  src: string,
  srcMobile: string | null,
  style: string,
  cls = "",
): string {
  const img =
    `<img src="${esc(src)}" alt="" ${cls ? `class="${cls}" ` : ""}style="${style}" ` +
    `fetchpriority="high" decoding="async" ` +
    `onerror="this.closest('[data-lead-hero]').style.display='none'" />`;
  return srcMobile
    ? `<picture style="display:contents"><source media="(max-width: 767px)" srcset="${esc(srcMobile)}" />${img}</picture>`
    : img;
}

/** Image visible avant JS : mêmes URLs que HeroSlideView (cache partagé). */
function staticVisual(slide: ResolvedHeroSlide, host: string | null): string {
  const p = slide.product;
  const fill = (u: string) =>
    buildSupabaseRenderUrl(host, u, HERO_IMG_OPTS.fill);
  const mob = (u: string) =>
    buildSupabaseRenderUrl(host, u, HERO_IMG_OPTS.mobile);
  for (const l of slide.config.layers) {
    if (l.off) continue;
    if (l.type === "image") {
      const src = l.src || p?.image || null;
      if (!src) continue;
      const raw = l.scrim === "left" && l.dim < 1; // même règle que HeroSlideView
      return (
        pic(
          raw ? src : fill(src),
          l.srcMobile ? mob(l.srcMobile) : null,
          `position:absolute;inset:0;width:100%;height:100%;object-fit:${l.fit};opacity:${l.dim}`,
        ) + (l.scrim !== "none" ? SCRIM_HTML[l.scrim] : "")
      );
    }
    if (l.type === "card") {
      const src = l.src || p?.image || null;
      if (!src) continue;
      const side =
        l.side === "left" ? "left-4 sm:left-8" : "right-4 sm:right-8";
      return (
        `<div class="absolute ${side} top-1/2 -translate-y-1/2 w-[34vw] sm:w-[38vw] max-w-105">` +
        pic(
          fill(src),
          l.srcMobile ? mob(l.srcMobile) : null,
          "box-shadow:var(--shadow-xl)",
          "w-full aspect-[4/5] max-h-[60vh] object-cover rounded-2xl",
        ) +
        `</div>`
      );
    }
    if (l.type === "tiles") {
      const src = l.main ? l.main.src || p?.image || null : null;
      if (src)
        return pic(
          fill(src),
          null,
          "position:absolute;inset:0;width:100%;height:100%;object-fit:cover",
        );
    }
  }
  return "";
}

/** Même formule que HeroHtmlBlock : l'égalité des chaînes évite tout re-rendu au boot. */
function runtimeCssText(css: string): string {
  const c = sanitizeHeroCss(css);
  return BASE_CSS + (c.errors.length ? "" : c.css);
}

function dsd(slide: ResolvedHeroSlide, clean: NodeSanitized): string {
  const css = runtimeCssText(slide.html?.css ?? clean.css).replace(
    /<\//g,
    "<\\/",
  );
  return (
    `<div data-lead-html style="position:absolute;inset:0;overflow:hidden;contain:layout paint style">` +
    `<template shadowrootmode="open"><style>${css}</style>${clean.html}</template></div>`
  );
}

/** Cadre identique à HeroCarousel (mêmes classes, mêmes variables). */
function frame(
  prep: PreparedLead,
  host: string | null,
  variant: "A" | "B" | null,
): string {
  const { slide, clean } = prep;
  const sizing = slide.config.sizing;
  const contained = sizing.width === "contained";
  const vars = Object.entries(heroFrameVars(sizing))
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
  const inner = staticVisual(slide, host) + (clean ? dsd(slide, clean) : "");
  const box =
    `<div data-lead-hero class="hero-box ${sizing.mode === "auto" ? "hero-box--auto" : ""} ` +
    `${contained ? "overflow-hidden rounded-3xl" : ""}" style="${esc(vars)}">` +
    `<div class="absolute inset-0" style="background:${esc(slide.bg)}">${inner}</div></div>`;
  const v = variant ? ` data-lead-v="${variant}"` : "";
  return contained
    ? `<section${v} class="relative max-w-350 mx-auto px-4 sm:px-6 pt-4">${box}</section>`
    : `<section${v} class="relative overflow-hidden rounded-b-4xl sm:rounded-b-[2.5rem]">${box}</section>`;
}

/** Assemble le balisage (pur, testé). a / b = slide n°1 des variantes A / B. */
export function composeHeroLead(
  a: PreparedLead | null,
  b: PreparedLead | null,
  host: string | null,
): HeroLead | null {
  if (!a && !b) return null;
  const same = !!a && !!b && a.slide.id === b.slide.id;
  let blocks: string;
  let doc: LeadDoc;
  let preloadSrc: string | null = null;
  if (same && a) {
    blocks = frame(a, host, null);
    doc = { v: 2, lead: buildLeadPayload(a.slide) };
    preloadSrc = a.clean?.firstImg ?? null;
  } else {
    blocks =
      `<style>${LEAD_VARIANT_CSS}</style><script>${LEAD_VARIANT_SCRIPT}</script>` +
      (a ? frame(a, host, "A") : "") +
      (b ? frame(b, host, "B") : "");
    doc = {
      v: 2,
      A: a ? buildLeadPayload(a.slide) : null,
      B: b ? buildLeadPayload(b.slide) : null,
    };
  }
  const json = JSON.stringify(doc).replace(/</g, "\\u003c");
  const preload = preloadSrc
    ? `<link rel="preload" as="image" href="${esc(preloadSrc)}" fetchpriority="high" />`
    : null;
  const withHtml = [a, b].some((x) => x?.clean);
  return {
    markup:
      SPACERS +
      blocks +
      `<script id="${LEAD_ELEMENT_ID}" type="application/json">${json}</script>`,
    preload,
    info:
      `hero lead : ${same ? "slide unique" : `A=${a?.slide.id ?? "—"} / B=${b?.slide.id ?? "—"}`}` +
      `${withHtml ? " (HTML en shadow DOM déclaratif)" : ""}`,
  };
}

// ─── Lecture Supabase + sélection ───────────────────────────────────────
function toPromo(r: any): HeroPromoLike {
  return {
    id: String(r.id),
    order: Number(r.order) || 0,
    isActive: r.is_active,
    startsAt: r.starts_at ?? null,
    endsAt: r.ends_at ?? null,
    config: parseHeroConfig(r.config),
    productId: r.product_id ?? "",
    kind: r.kind,
    layout: r.layout,
    headline: r.headline,
    sub: r.sub,
    cta: r.cta,
    tag: r.tag,
    showTag: r.show_tag,
    image: r.image,
    bgGradient: r.bg_gradient,
    linkUrl: r.link_url,
    tiles: r.tiles,
  };
}

export async function buildHeroLead(
  supabase: SupabaseClient,
  opts: { supabaseUrl: string; now?: number },
): Promise<HeroLead | null> {
  const now = opts.now ?? Date.now();
  let host: string | null = null;
  try {
    host = new URL(opts.supabaseUrl).hostname.toLowerCase();
  } catch {
    host = null;
  }

  const { data: rows, error } = await supabase
    .from("hero_promotions")
    .select(
      "id, product_id, title, headline, sub, cta, bg_gradient, tag, image, order, show_tag, is_active, layout, kind, link_url, tiles, config, starts_at, ends_at",
    )
    .order("order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  const promos = (rows ?? []).map(toPromo);
  if (promos.length === 0) return null;

  const { data: prods, error: pErr } = await supabase
    .from("products")
    .select("id, title, description, image, is_active")
    .eq("is_active", true);
  if (pErr) throw new Error(pErr.message);
  const products: HeroProductLite[] = (prods ?? []).map((p: any) => ({
    id: String(p.id),
    title: String(p.title ?? ""),
    description: p.description ?? "",
    image: p.image ?? "",
    isActive: true,
  }));

  const htmlRaw: Record<string, HeroHtmlPayload> = {};
  const ids = promos.filter((p) => heroHasHtml(p)).map((p) => p.id);
  if (ids.length > 0) {
    const { data: hrows, error: hErr } = await supabase
      .from("hero_slide_html")
      .select("slide_id, html, css")
      .in("slide_id", ids);
    if (hErr) throw new Error(hErr.message);
    for (const r of hrows ?? []) {
      htmlRaw[(r as any).slide_id] = {
        html: (r as any).html ?? "",
        css: (r as any).css ?? "",
      };
    }
  }

  const first = (v: "A" | "B") =>
    resolveHeroSlides(promos, products, now, htmlRaw, v)[0] ?? null;
  const a = await prepareLeadSlide(first("A"));
  const b = await prepareLeadSlide(first("B"));
  return composeHeroLead(a, b, host);
}
```

---

## 3. Modifications de fichiers existants

### 3.1 `src/lib/supabaseImage.ts` : 2 modifications

1. Juste après la ligne `import { envVar } from "../config/imagekit";`, ajoute :

```ts
import { buildSupabaseRenderUrl } from "./heroImages";
```

2. Remplace le bloc qui **commence** par `/** URL render/image dimensionnée, ou l'originale si non applicable. */` et va **jusqu'à la fin du fichier** par :

```ts
/** URL render/image dimensionnée, ou l'originale si non applicable. */
export function supabaseImageUrl(
  sourceUrl: string,
  opts: SupabaseImageOptions = {},
): string {
  return buildSupabaseRenderUrl(storageHost(), sourceUrl, opts);
}
```

### 3.2 `src/components/HeroHtmlBlock.tsx` : 5 modifications

1. Remplace la ligne `import { useEffect, useRef, type MouseEvent } from "react";` par :

```tsx
import { useEffect, useLayoutEffect, useRef, type MouseEvent } from "react";
```

2. Juste après la ligne `import { cleanHeroLink } from "../lib/heroSchema";`, ajoute :

```tsx
import { BASE_CSS } from "../lib/heroHtmlBase";
```

3. **Supprime** le bloc qui commence par `const BASE_CSS =` et se termine par la ligne `  "*,*::before,*::after{box-sizing:border-box}img,svg,picture{max-width:100%}";` (la constante vit maintenant dans `heroHtmlBase.ts`).
4. Remplace le bloc qui **commence** par la ligne `  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });` (dans `mountHeroHtml`) et se termine par la ligne `  root.replaceChildren(st, frag.cloneNode(true));` par :

```tsx
const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
const c = sanitizeHeroCss(css);
const cssText = BASE_CSS + (c.errors.length ? "" : c.css);
// Contenu déjà identique (slide d'amorçage posé par le prerender) : on ne recrée rien,
// donc aucun clignotement d'image quand le filtre navigateur repasse derrière.
const cur = root.firstChild;
if (cur instanceof HTMLStyleElement && cur.textContent === cssText) {
  const a = document.createElement("div");
  const b = document.createElement("div");
  root.childNodes.forEach((n, i) => {
    if (i > 0) a.appendChild(n.cloneNode(true));
  });
  b.appendChild(frag.cloneNode(true));
  if (a.innerHTML === b.innerHTML) return;
}
const st = document.createElement("style");
st.textContent = cssText;
root.replaceChildren(st, frag.cloneNode(true));
```

5. Remplace le bloc qui **commence** par `export default function HeroHtmlBlock({` et se termine par la ligne `  const ref = useRef<HTMLDivElement>(null);` par :

```tsx
export default function HeroHtmlBlock({
  html,
  css,
  onLink,
  instant = false,
}: {
  html: string;
  css: string;
  onLink?: (link: string) => void;
  /** Slide d'amorçage : html/css viennent du prerender (déjà filtrés AU BUILD par la même
   *  politique). Montés avant la peinture ; le filtre navigateur re-vérifie ensuite. */
  instant?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Montage synchrone, une seule fois (jamais pour le HTML saisi dans le studio / la preview).
  useLayoutEffect(() => {
    if (!instant) return;
    const host = ref.current;
    if (!host) return;
    try {
      const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
      const c = sanitizeHeroCss(css);
      const st = document.createElement("style");
      st.textContent = BASE_CSS + (c.errors.length ? "" : c.css);
      const tpl = document.createElement("template");
      tpl.innerHTML = html; // artefact de build, filtré par heroHtmlPolicy (voir scripts/hero-lead.ts)
      root.replaceChildren(st, tpl.content);
    } catch {
      /* le chemin asynchrone ci-dessous prend le relais */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

### 3.3 `src/components/HeroSlideView.tsx` : 3 modifications

1. Juste après la ligne `import { supabaseImageUrl } from "../lib/supabaseImage";`, ajoute :

```tsx
import { HERO_IMG_OPTS } from "../lib/heroImages";
```

2. Remplace le bloc qui **commence** par `const U = {` et se termine par la ligne `};` qui le ferme (juste avant `const SCRIM`) par :

```tsx
const U = {
  fill: (s: string) => supabaseImageUrl(s, HERO_IMG_OPTS.fill),
  mobile: (s: string) => supabaseImageUrl(s, HERO_IMG_OPTS.mobile),
  tile: (s: string) => supabaseImageUrl(s, HERO_IMG_OPTS.tile),
};
```

3. Dans `<HeroHtmlBlock`, juste après la ligne `css={slide.html.css}`, ajoute :

```tsx
              instant={!!isLead}
```

### 3.4 `src/components/HeroCarousel.tsx` : 4 modifications

1. Remplace la ligne `import { parseLeadHero, type ResolvedHeroSlide } from "../lib/heroResolve";` par :

```tsx
import type { ResolvedHeroSlide } from "../lib/heroResolve";
import { readLeadSlide } from "../lib/heroLead";
import { heroFrameVars } from "../lib/heroFrame";
import { getVariant } from "../lib/engagement";
```

2. Remplace le bloc qui **commence** par `/** Lit le slide d'amorçage embarqué par le prerender. Jamais d'exception. */` et se termine par le `}` de `function frameVars` (juste avant `interface HeroCarouselProps {`) par :

```tsx
const frameVars = (s: HeroSizing): CSSProperties =>
  heroFrameVars(s) as CSSProperties;
```

3. Remplace la ligne `  const [lead] = useState<ResolvedHeroSlide | null>(() => readLeadHero());` par :

```tsx
const [lead] = useState<ResolvedHeroSlide | null>(() =>
  readLeadSlide(getVariant()),
);
```

4. Si `getVariant` était déjà importé plus haut dans ce fichier, supprime le doublon (tsc te le dira).

### 3.5 `src/App.tsx` : 2 modifications

1. Juste après la ligne `import { useHeroSync } from "./hooks/useHeroSync";`, ajoute :

```tsx
import { leadHtmlSeed } from "./lib/heroLead";
```

2. Remplace la ligne `  const [heroHtml, setHeroHtml] = useState<Record<string, { html: string; css: string }>>({});` par :

```tsx
// Amorcé avec le HTML du slide d'amorçage : le slide n°1 en HTML ne disparaît pas entre le
// chargement du snapshot et celui de son HTML (puis getPublished prend la main).
const [heroHtml, setHeroHtml] = useState<
  Record<string, { html: string; css: string }>
>(() => leadHtmlSeed(getVariant()));
```

### 3.6 `src/lib/heroStudio.ts` : 1 modification

L'avertissement du lot 10 n'est plus vrai. Remplace la ligne qui commence par `        text: "Slide n°1 limité à une variante A/B : le slide d'amorçage du prerender peut apparaître` par :

```ts
        text: "Slide n°1 limité à une variante A/B : le prerender prépare un slide d'amorçage par variante (choisi avant la peinture). Republie pour qu'il soit pris en compte.",
```

### 3.7 `scripts/prerender.ts` : 4 modifications

1. Juste après la ligne `import { DOCS } from "../src/data/legal";`, ajoute :

```ts
import { buildHeroLead, type HeroLead } from "./hero-lead";
```

2. Remplace la fonction qui **commence** par `function shell(` et se termine par le `}` qui précède la ligne `// ── main ──` par :

```ts
function shell(inner: string, lead?: HeroLead | null): string {
  // `lead.markup` (accueil seul) : espaceurs haut + slide(s) d'amorçage visibles AVANT le JS
  // + JSON lu par HeroCarousel. Voir scripts/hero-lead.ts.
  return (
    (lead ? lead.markup : "") +
    `<noscript><main style="max-width:720px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif;color:#1a1a1a;">` +
    `<p><a href="${SITE}/" style="font-weight:800;font-size:20px;color:#ff5c35;text-decoration:none;">InstaWear</a></p>` +
    inner +
    `<hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />` +
    `<p style="font-size:13px;color:#666;">` +
    `<a href="${SITE}/">Home</a> · <a href="${SITE}/promotions">Promotions</a> · ` +
    `<a href="${SITE}/faq">FAQ</a> · <a href="${SITE}/contact">Contact</a> · ` +
    `<a href="${SITE}/suivi">Track order</a></p></main></noscript>`
  );
}
```

3. Remplace le bloc qui **commence** par `// 1b) 1re bannière hero (P4b — mêmes règles que App.tsx : 1re promo active` et se termine par le `}` qui ferme `if (url && anon && products.length > 0) {` (juste avant `// 2) Accueil`) par :

```ts
// 1b) Slide d'amorçage du hero (P4b) : MÊMES règles que la boutique (actif, planifié, produit
// actif, variante A/B, HTML publié) via resolveHeroSlides — voir scripts/hero-lead.ts.
let heroLead: HeroLead | null = null;
if (url && anon && products.length > 0) {
  try {
    heroLead = await buildHeroLead(createClient(url, anon), {
      supabaseUrl: url,
    });
    if (heroLead) console.log(`prerender: ${heroLead.info}`);
  } catch (e: any) {
    console.error("prerender: hero query failed:", e?.message || e);
  }
}
```

4. Remplace les 4 lignes consécutives

```ts
    leadHero,
    leadData,
  );
  write("index.html", setRoot(template, snap));
```

par :

```ts
    heroLead,
  );
  const homeHead = heroLead?.preload
    ? template.replace("</head>", `    ${heroLead.preload}\n  </head>`)
    : template;
  write("index.html", setRoot(homeHead, snap));
```

---

## 4. Tests : nouveau fichier `tests/hero-lot13.test.ts`

```ts
// tests/hero-lot13.test.ts — prerender du hero : images, cadre, payload, variante A/B, assainisseur Node, DSD.
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { resolveHeroSlides } from "../src/lib/heroResolve.ts";
import {
  buildSupabaseRenderUrl,
  HERO_IMG_OPTS,
} from "../src/lib/heroImages.ts";
import { heroFrameVars } from "../src/lib/heroFrame.ts";
import {
  LEAD_VARIANT_SCRIPT,
  buildLeadPayload,
  parseLeadPayload,
} from "../src/lib/heroLead.ts";
import {
  composeHeroLead,
  prepareLeadSlide,
  sanitizeHeroHtmlNode,
} from "../scripts/hero-lead.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const hasParse5 = await import("parse5").then(
  () => true,
  () => false,
);

const HOST = "abc.supabase.co";
const SRC = `https://${HOST}/storage/v1/object/public/hero/a.png`;
const PRODUCTS = [
  {
    id: "p1",
    title: "Hoodie",
    description: "Warm",
    image: "https://cdn.x/p.webp",
    isActive: true,
  },
];
const studio = (layers: unknown[]) =>
  sanitizeHeroConfig({ origin: "studio", layers });
const promo = (
  id: string,
  config: ReturnType<typeof studio>,
  productId = "",
) => ({
  id,
  order: 0,
  isActive: true,
  productId,
  config,
});
const imageSlide = (id = "s1") =>
  resolveHeroSlides(
    [promo(id, studio([{ type: "image", src: null }]), "p1")],
    PRODUCTS,
  )[0];
const htmlSlide = (html: string, id = "s2") =>
  resolveHeroSlides(
    [promo(id, studio([{ type: "html" }]))],
    [],
    Date.now(),
    { [id]: { html, css: "" } },
    null,
  )[0];

test("images : URL identique à l'ancienne formule, passthrough hors Supabase", () => {
  assert.equal(
    buildSupabaseRenderUrl(HOST, SRC, HERO_IMG_OPTS.fill),
    `https://${HOST}/storage/v1/render/image/public/hero/a.png?width=1280&quality=75&format=webp`,
  );
  assert.equal(
    buildSupabaseRenderUrl(HOST, "https://other.com/a.png", HERO_IMG_OPTS.fill),
    "https://other.com/a.png",
  );
  assert.equal(buildSupabaseRenderUrl(null, SRC), SRC);
  assert.equal(buildSupabaseRenderUrl(HOST, "/a.png"), "/a.png");
});

test("cadre : variables auto / fixe", () => {
  assert.deepEqual(
    heroFrameVars({
      mode: "fixed",
      width: "full",
      height: { unit: "vh", value: 78 },
    }),
    {
      "--hero-h": "clamp(420px, 78vh, 760px)",
      "--hero-hm": "clamp(420px, 78vh, 760px)",
    },
  );
  assert.deepEqual(
    heroFrameVars({
      mode: "auto",
      width: "full",
      ratio: { desktop: 2.4, mobile: 0.9 },
    }),
    { "--hero-r": 2.4, "--hero-rm": 0.9 },
  );
});

test("payload : aller-retour JSON, id 'lead', produit et HTML conservés ; entrées invalides => null", () => {
  const slide = imageSlide();
  const payload = JSON.parse(JSON.stringify(buildLeadPayload(slide)));
  const back = parseLeadPayload(payload)!;
  assert.equal(payload.id, "s1");
  assert.equal(back.id, "lead");
  assert.equal(back.product?.title, "Hoodie");
  assert.deepEqual(back.config, slide.config);

  const h = htmlSlide("<p>x</p>");
  const hp = JSON.parse(JSON.stringify(buildLeadPayload(h)));
  assert.deepEqual(parseLeadPayload(hp)!.html, { html: "<p>x</p>", css: "" });
  assert.equal(
    parseLeadPayload({ ...hp, html: null }),
    null,
    "slide HTML sans HTML = écarté",
  );

  for (const bad of [null, 1, {}, { id: "x" }, { id: "x", config: { v: 2 } }]) {
    assert.equal(parseLeadPayload(bad), null);
  }
});

const hashAB = (sid: string) => {
  let h = 0;
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0;
  return h % 2 === 0 ? "A" : "B";
};
const runScript = (ls: unknown) => {
  const out: Record<string, string> = {};
  vm.runInNewContext(LEAD_VARIANT_SCRIPT, {
    window: { crypto: {} },
    localStorage: ls,
    Date,
    Math,
    document: {
      documentElement: { setAttribute: (k: string, v: string) => (out[k] = v) },
    },
  });
  return out["data-hero-v"];
};

test("variante : le script inline = getVariant() (sid existant, créé, stockage KO)", () => {
  for (const sid of [
    "a",
    "abc",
    "550e8400-e29b-41d4-a716-446655440000",
    "1760000000000-k3j2h1",
  ]) {
    assert.equal(runScript({ getItem: () => sid, setItem() {} }), hashAB(sid));
  }
  assert.equal(
    runScript({
      getItem() {
        throw new Error("x");
      },
      setItem() {},
    }),
    hashAB("memory-session"),
  );
  let stored = "";
  const v = runScript({
    getItem: () => null,
    setItem: (_k: string, s: string) => (stored = s),
  });
  assert.ok(stored.length > 0);
  assert.equal(v, hashAB(stored));

  const e = read("src/lib/engagement.ts");
  assert.ok(e.includes("h = (h * 31 + sid.charCodeAt(i)) >>> 0"));
  assert.ok(e.includes('h % 2 === 0 ? "A" : "B"'));
  assert.ok(
    e.includes('"instawear-engagement-sid"') && e.includes('"memory-session"'),
  );
});

const jsonOf = (markup: string) => {
  const m = markup.match(
    /<script id="lead-hero-data" type="application\/json">(.*?)<\/script>/s,
  );
  assert.ok(m, "JSON embarqué");
  return { raw: m![1], doc: JSON.parse(m![1]) };
};

test("composition : slide unique (même slide A et B) => pas de script ni de data-lead-v", async () => {
  const p = await prepareLeadSlide(imageSlide());
  const r = composeHeroLead(p, p, HOST)!;
  assert.ok(
    r.markup.includes("data-lead-hero") && r.markup.includes('class="hero-box'),
  );
  assert.ok(
    !r.markup.includes("data-lead-v") &&
      !r.markup.includes("<script>(function"),
  );
  const { doc, raw } = jsonOf(r.markup);
  assert.equal(doc.v, 2);
  assert.equal(doc.lead.id, "s1");
  assert.ok(!raw.includes("<"), "aucun < brut dans le JSON");
  assert.equal(r.preload, null);
});

test("composition : slides différents par variante => deux blocs, style et script de choix", async () => {
  const a = await prepareLeadSlide(imageSlide("s1"));
  const b = await prepareLeadSlide(imageSlide("s9"));
  const r = composeHeroLead(a, b, HOST)!;
  assert.ok(
    r.markup.includes('data-lead-v="A"') &&
      r.markup.includes('data-lead-v="B"'),
  );
  assert.ok(r.markup.includes(LEAD_VARIANT_SCRIPT));
  const { doc } = jsonOf(r.markup);
  assert.equal(doc.A.id, "s1");
  assert.equal(doc.B.id, "s9");
  const onlyA = composeHeroLead(a, null, HOST)!;
  assert.ok(!onlyA.markup.includes('data-lead-v="B"'));
  assert.equal(jsonOf(onlyA.markup).doc.B, null);
  assert.equal(composeHeroLead(null, null, HOST), null);
});

test("composition : l'image statique utilise l'URL dimensionnée du slide final", async () => {
  const slide = resolveHeroSlides(
    [promo("s1", studio([{ type: "image", src: SRC, dim: 1, scrim: "none" }]))],
    [],
  )[0];
  const r = composeHeroLead(
    await prepareLeadSlide(slide),
    await prepareLeadSlide(slide),
    HOST,
  )!;
  assert.ok(r.markup.includes(`render/image/public/hero/a.png?width=1280`));
});

test(
  "DSD : slide HTML => template shadowrootmode + préchargement de la 1re image",
  { skip: !hasParse5 },
  async () => {
    const slide = htmlSlide(
      '<h1>Promo</h1><img src="https://cdn.x/a.webp" alt="a"><a href="/promotions">Go</a>',
    );
    const p = await prepareLeadSlide(slide);
    assert.ok(p && p.clean);
    const r = composeHeroLead(p, p, HOST)!;
    assert.ok(r.markup.includes('<template shadowrootmode="open"><style>'));
    assert.ok(r.markup.includes("data-lead-html"));
    assert.ok(r.markup.includes("<h2>Promo</h2>"), "h1 => h2");
    assert.ok(r.markup.includes('rel="noopener noreferrer"'));
    assert.ok(r.preload?.includes('href="https://cdn.x/a.webp"'));
    assert.ok(!jsonOf(r.markup).raw.includes("<"));
    assert.deepEqual(jsonOf(r.markup).doc.lead.html.html, p!.clean!.html);
  },
);

test(
  "assainisseur Node : vecteurs d'attaque, échappement, idempotence",
  { skip: !hasParse5 },
  async () => {
    const run = async (html: string, css = "") =>
      (await sanitizeHeroHtmlNode(html, css))!;
    assert.equal(
      (await run("<p>ok</p><script>alert(1)</script>")).html,
      "<p>ok</p>",
    );
    assert.ok(
      !/onerror|alert/i.test((await run("<img src=x onerror=alert(1)>")).html),
    );
    assert.ok(
      !/javascript|alert/i.test(
        (await run('<a href="javascript:alert(1)">x</a>')).html,
      ),
    );
    assert.ok(
      !/evil/.test((await run('<a href="https://evil.com/x">x</a>')).html),
    );
    assert.ok(
      !/evil/.test(
        (await run('<a href="/\\evil.com">x</a><img src="/\\evil.com/a.png">'))
          .html,
      ),
    );
    assert.ok(
      !/svg|script|alert|javascript/i.test(
        (
          await run(
            '<svg><script>alert(1)</script><a xlink:href="javascript:alert(1)">x</a></svg>',
          )
        ).html,
      ),
    );
    assert.ok(
      !/javascript|url\(/i.test(
        (await run('<div style="background:url(javascript:alert(1))">x</div>'))
          .html,
      ),
    );
    assert.ok(
      !/iframe|object|embed|evil/i.test(
        (
          await run(
            '<iframe src="https://evil.com"></iframe><object data="https://evil.com"></object><embed src="https://evil.com">',
          )
        ).html,
      ),
    );
    assert.ok(
      !/form|input|evil/i.test(
        (
          await run(
            '<form action="https://evil.com"><input name=a><button>go</button></form>',
          )
        ).html,
      ),
    );
    assert.ok(
      !/onerror|alert/i.test(
        (await run("<noscript><img src=x onerror=alert(1)></noscript>")).html,
      ),
    );
    assert.ok(
      !/data:/i.test(
        (await run('<img src="data:image/png;base64,AAAA">')).html,
      ),
    );
    assert.ok(
      !/evil|<base|<meta|<link/i.test(
        (
          await run(
            '<base href="https://evil.com"><meta http-equiv="refresh" content="0;url=https://evil.com"><link rel="stylesheet" href="https://evil.com/a.css"><p>x</p>',
          )
        ).html,
      ),
    );
    const mx = await run(
      '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">',
    );
    assert.ok(!/onerror|alert|<style/i.test(mx.html));

    const st = await run(
      "<style>@import url(https://evil.com/x.css)</style><p>a</p>",
    );
    assert.equal(st.html, "<p>a</p>");
    assert.equal(st.css, "", "CSS refusé => vide");

    assert.equal(
      (await run("<p>1 &lt; 2 &amp; 3</p>")).html,
      "<p>1 &lt; 2 &amp; 3</p>",
    );
    assert.equal((await run("<h1>t</h1>")).html, "<h2>t</h2>");
    assert.equal(
      (await run('<img src="https://cdn.x/a.webp" alt="a">')).firstImg,
      "https://cdn.x/a.webp",
    );

    for (const src of [
      '<div class="a"><p>un</p><a href="/faq">lien</a></div>',
      "<ul><li>a</li><li>b</li></ul>",
    ]) {
      const once = await run(src);
      assert.equal(
        (await run(once.html)).html.replace(/ rel="noopener noreferrer"/g, ""),
        once.html.replace(/ rel="noopener noreferrer"/g, ""),
      );
    }
  },
);

test("gardes : branchements des fichiers modifiés", () => {
  const pre = read("scripts/prerender.ts");
  assert.ok(pre.includes("buildHeroLead") && !pre.includes("leadHero"));
  const car = read("src/components/HeroCarousel.tsx");
  assert.ok(
    car.includes("readLeadSlide(getVariant())") &&
      !car.includes("readLeadHero"),
  );
  assert.ok(read("src/App.tsx").includes("leadHtmlSeed(getVariant())"));
  const view = read("src/components/HeroSlideView.tsx");
  assert.ok(
    view.includes("instant={!!isLead}") && view.includes("HERO_IMG_OPTS.fill"),
  );
  const blk = read("src/components/HeroHtmlBlock.tsx");
  assert.ok(
    blk.includes("instant") &&
      blk.includes('from "../lib/heroHtmlBase"') &&
      !blk.includes("const BASE_CSS"),
  );
  assert.ok(read("src/lib/heroLead.ts").includes('LEAD_SLIDE_ID = "lead"'));
});
```

---

## Vérifications, dans l'ordre

1. `npm i -D parse5`, puis appliquer les sections 1 à 4. Lancer `npm run lint`, `npm test`, `npm run build`. Les tests de l'assainisseur Node se mettent en `skip` si `parse5` est absent. Dans ce cas ils ne testent rien.
2. **Build avec Supabase configuré.** Le log doit contenir une ligne `prerender: hero lead : slide unique` ou `A=… / B=…`, avec `(HTML en shadow DOM déclaratif)` si le slide n°1 est un HTML.
3. **`dist/index.html`** :
   - le `<script id="lead-hero-data">` doit contenir `"v":2` ;
   - si le slide n°1 est un HTML, `<template shadowrootmode="open">` doit être dans le `#root`, et un `<link rel="preload" as="image">` dans le `<head>` si le HTML contient une image.
4. **Boutique, thèmes clair et sombre**, avec ton slide Black Friday en position 1 :
   - rechargement forcé avec Réseau en « Slow 4G » : le HTML doit apparaître avant l'hydratation, sans clignotement ni saut au démarrage de React ;
   - un navigateur avec JavaScript désactivé affiche le HTML DSD.
5. **Test A/B.** Pose un slide limité à la variante B en position 1, republie, puis dans la console fais `localStorage.setItem('instawear-engagement-sid','…')` avec deux valeurs qui donnent A puis B. La variante servie doit changer sans flash de l'autre slide.
6. **Lighthouse mobile sur l'accueil.** C'est le seul vrai verdict sur le LCP, je n'ai pas pu le mesurer. Deux points sont à surveiller :
   - le DSD demande Chrome 111+, Safari 16.4+ ou Firefox 123+. Sur un navigateur plus ancien, le contenu DSD n'apparaît qu'au démarrage de React ;
   - je ne suis pas certain que le preload scanner lise le contenu d'un `<template>` DSD, d'où le `<link rel="preload">`. Si le LCP ne s'améliore pas, dis-le-moi avec le rapport.
7. **CSP.** Le script de variante et le `onerror` des images sont inline. Si ta CSP interdit l'inline, les deux ne s'exécutent pas : la variante resterait à `A` côté amorçage. Dis-le-moi dans ce cas.

---

## Ce qui reste

| Chantier                                                                                            | Il me faut   |
| --------------------------------------------------------------------------------------------------- | ------------ |
| **Poids de l'image du slide n°1** : bouton « Peser » (requête HEAD) avec alerte au-dessus de 250 Ko | Rien         |
| **Rétention de `engagement_events`** (purge quotidienne, par exemple 180 jours)                     | Le cron prod |
| **Couche Tuiles jusqu'à 5 tuiles** avec dispositions dédiées                                        | Rien         |
| **Cron Deploy Hook en prod**                                                                        | Fusion prod  |

Mon choix serait le bouton « Peser » : c'est le dernier contrôle qualité qui protège directement le LCP du slide n°1, et il ne demande rien de ta part.
