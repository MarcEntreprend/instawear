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
