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
