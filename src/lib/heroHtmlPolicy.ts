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
