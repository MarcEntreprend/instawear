// src/lib/heroCss.ts — filtre CSS PUR pour le HTML collé (Shadow DOM). Zéro dépendance,
// importable en node (tests). Principe : tout ce qui est douteux est REFUSÉ (jamais "réparé"
// en silence) — l'admin voit pourquoi. Les contrôles portent sur le texte DÉCODÉ (échappements
// CSS résolus) : `u\72l(` est vu comme `url(`.

export interface HeroCssResult {
  /** CSS nettoyé ; "" si au moins une erreur. */
  css: string;
  errors: string[];
  warnings: string[];
}

const ALLOWED_AT = new Set([
  "media",
  "supports",
  "keyframes",
  "-webkit-keyframes",
  "container",
  "layer",
]);

function decodeCssEscapes(s: string): string {
  return s.replace(
    /\\([0-9a-fA-F]{1,6})[ \t\n\r\f]?|\\([^\n])/g,
    (_m, hex?: string, ch?: string) => {
      if (hex) {
        const cp = parseInt(hex, 16);
        return cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : "\uFFFD";
      }
      return ch ?? "";
    },
  );
}

/** html / body / :root n'existent pas dans un shadow root : on vise l'hôte. */
function rewriteRoots(css: string): { css: string; changed: boolean } {
  let changed = false;
  const out = css.replace(
    /(^|[{},;>+~(]\s*|\s)(html|body|:root)(?![\w-])/gi,
    (_m, pre: string) => {
      changed = true;
      return `${pre}:host`;
    },
  );
  return { css: out.replace(/:host(\s+:host)+/g, ":host"), changed };
}

const urlOk = (u: string) =>
  /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u) || u.startsWith("#");

export function sanitizeHeroCss(raw: string): HeroCssResult {
  const src = typeof raw === "string" ? raw : "";
  const stripped = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\u0000/g, "")
    .trim();
  const { css, changed } = rewriteRoots(stripped);
  const dec = decodeCssEscapes(css);
  const low = dec.toLowerCase();
  const errors: string[] = [];
  const warnings: string[] = [];
  const add = (m: string) => {
    if (!errors.includes(m)) errors.push(m);
  };

  for (const m of low.matchAll(/@([a-z-]+)/g)) {
    if (!ALLOWED_AT.has(m[1])) add(`Règle @${m[1]} non autorisée.`);
  }
  if (
    /expression\s*\(|javascript:|vbscript:|-moz-binding|behavior\s*:|<\/?style|<\/?script|<!--|-->/.test(
      low,
    )
  ) {
    add(
      "Construction CSS dangereuse refusée (expression, javascript:, behavior, balises…).",
    );
  }
  if (/image-set\s*\(|cross-fade\s*\(|element\s*\(/.test(low)) {
    add(
      "image-set(), cross-fade() et element() ne sont pas autorisés : utilise url().",
    );
  }

  const urls = Array.from(
    dec.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s][^)]*?))\s*\)/gi),
  );
  const urlCalls = (low.match(/url\(/g) || []).length;
  if (urls.length !== urlCalls) add("Une url() n'a pas pu être analysée.");
  for (const m of urls) {
    const u = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (!urlOk(u)) {
      add(
        /^data:/i.test(u)
          ? "Image en base64 dans le CSS refusée : héberge-la puis utilise son URL https://."
          : `url(${u.slice(0, 40)}) refusée : seules les URL https://, /chemin ou #ancre sont acceptées.`,
      );
    }
  }

  const open = (css.match(/\{/g) || []).length;
  const close = (css.match(/\}/g) || []).length;
  if (open !== close) add("Accolades non équilibrées.");

  if (changed)
    warnings.push("Sélecteurs html / body / :root remplacés par :host.");
  return { css: errors.length ? "" : css, errors, warnings };
}

/** Valeur d'un attribut style="" : mêmes règles, sans accolade ni at-rule. */
export function isSafeStyleAttr(v: string): boolean {
  if (/[{}@]/.test(v)) return false;
  return sanitizeHeroCss(`x{${v}}`).errors.length === 0;
}
