// src/lib/heroHtml.ts — assainissement du HTML collé (navigateur). DOMPurify est chargé À LA
// DEMANDE : ni la boutique (sans slide HTML) ni l'admin hors studio ne le téléchargent.
import { cleanHeroLink } from "./heroSchema";
import { isSafeStyleAttr } from "./heroCss";

const FORBID_TAGS = [
  "style",
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "textarea",
  "select",
  "option",
  "button",
  "link",
  "meta",
  "base",
  "template",
  "slot",
  "noscript",
  "frame",
  "frameset",
  "audio",
  "video",
  "canvas",
  "dialog",
  "marquee",
];
const FORBID_ATTR = [
  "srcdoc",
  "formaction",
  "ping",
  "action",
  "autofocus",
  "contenteditable",
  "target",
];
const CFG = {
  USE_PROFILES: { html: true, svg: true },
  FORBID_TAGS,
  FORBID_ATTR,
  ALLOW_UNKNOWN_PROTOCOLS: false,
};

let sink: string[] = [];
const warn = (m: string) => {
  if (!sink.includes(m)) sink.push(m);
};
const urlOk = (u: string) => /^https:\/\//i.test(u) || /^\/(?!\/)/.test(u);

let purifyP: Promise<any> | null = null;
function getPurify(): Promise<any> {
  if (!purifyP) {
    purifyP = import("dompurify").then((mod: any) => {
      const base = mod.default ?? mod;
      // Instance PRIVÉE : nos hooks ne touchent pas l'instance globale.
      const p = typeof base === "function" ? base(window) : base;
      p.addHook("uponSanitizeAttribute", (node: Element, data: any) => {
        const name = String(data.attrName || "").toLowerCase();
        const val = String(data.attrValue ?? "");
        if (name === "style") {
          if (!isSafeStyleAttr(val)) {
            data.keepAttr = false;
            warn("Un attribut style non autorisé a été retiré.");
          }
          return;
        }
        if (name === "href" || name === "xlink:href") {
          if (node.nodeName.toLowerCase() === "a") {
            const link = cleanHeroLink(val);
            if (link) {
              data.attrValue = link;
              return;
            }
            if (val.trim().startsWith("#")) return;
            data.keepAttr = false;
            warn(
              "Lien externe ou invalide retiré (seuls les liens internes « /… » sont acceptés).",
            );
            return;
          }
          if (!urlOk(val.trim())) {
            data.keepAttr = false;
            warn(
              "Référence de média non autorisée retirée (https:// ou /… uniquement).",
            );
          }
          return;
        }
        if (name === "src" || name === "poster") {
          if (!urlOk(val.trim())) {
            data.keepAttr = false;
            warn(
              /^data:/i.test(val.trim())
                ? "Image en base64 retirée : héberge-la puis colle son URL."
                : "Source de média non autorisée retirée (https:// ou /… uniquement).",
            );
          }
          return;
        }
        if (name === "srcset") {
          const ok = val
            .split(",")
            .every((part) => urlOk((part.trim().split(/\s+/)[0] ?? "").trim()));
          if (!ok) {
            data.keepAttr = false;
            warn("srcset non autorisé retiré.");
          }
        }
      });
      p.addHook("afterSanitizeAttributes", (node: Element) => {
        if (node.nodeName.toLowerCase() === "a") {
          node.removeAttribute("target");
          node.setAttribute("rel", "noopener noreferrer");
        }
      });
      return p;
    });
  }
  return purifyP;
}

async function run(raw: string): Promise<{
  fragment: DocumentFragment;
  extractedCss: string;
  warnings: string[];
}> {
  const text = String(raw ?? "");
  const warnings: string[] = [];
  // DOMParser : document inerte (aucun script exécuté, aucune ressource chargée).
  const doc = new DOMParser().parseFromString(text, "text/html");
  let extractedCss = "";
  doc.querySelectorAll("style").forEach((s) => {
    extractedCss += (s.textContent ?? "") + "\n";
    s.remove();
  });
  if (doc.querySelector('link[rel~="stylesheet"]')) {
    warnings.push(
      "<link> de feuille de style ignoré : colle le CSS dans le champ CSS.",
    );
  }
  if (doc.querySelector("script, iframe, object, embed, form")) {
    warnings.push(
      "Scripts / iframes / formulaires retirés (le JavaScript n'est pas supporté).",
    );
  }
  const b64 = (text.match(/data:[a-z]+\/[a-z0-9.+-]+;base64,/gi) || []).length;
  if (b64 > 0) {
    warnings.push(
      `${b64} image(s) en base64 retirée(s) : héberge-les puis colle leur URL.`,
    );
  }
  const purify = await getPurify();
  sink = warnings;
  const fragment = purify.sanitize(doc.body, {
    ...CFG,
    RETURN_DOM_FRAGMENT: true,
  }) as DocumentFragment;
  sink = [];
  return { fragment, extractedCss, warnings };
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
  const r = await run(raw);
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
  return (await run(raw)).fragment;
}
