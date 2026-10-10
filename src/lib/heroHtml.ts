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
