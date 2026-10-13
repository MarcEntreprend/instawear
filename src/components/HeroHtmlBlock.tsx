// src/components/HeroHtmlBlock.tsx — rendu ISOLÉ du HTML collé (Shadow DOM).
// Le CSS du site n'entre pas, le CSS collé ne sort pas ; les variables (--color-*) traversent
// la frontière : le HTML peut s'adapter au thème avec var(--color-ink) etc.
import { useEffect, useLayoutEffect, useRef, type MouseEvent } from "react";
import { sanitizeHeroCss } from "../lib/heroCss";
import { cleanHeroLink } from "../lib/heroSchema";
import { BASE_CSS } from "../lib/heroHtmlBase";

// Cache du fragment nettoyé (un slide démonté/remonté ne re-passe pas le filtre).
const cache = new Map<string, Promise<DocumentFragment>>();
function cleanFragment(html: string): Promise<DocumentFragment> {
  let p = cache.get(html);
  if (!p) {
    p = import("../lib/heroHtml").then((m) =>
      m.sanitizeHeroHtmlToFragment(html),
    );
    cache.set(html, p);
    if (cache.size > 12) cache.delete(cache.keys().next().value as string);
  }
  return p;
}

/** Monte (et re-nettoie) html+css dans un shadow root. Partagé avec la mesure du studio. */
export async function mountHeroHtml(
  host: HTMLElement,
  html: string,
  css: string,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const frag = await cleanFragment(html);
  if (!isCurrent()) return;
  const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  const c = sanitizeHeroCss(css);
  const cssText = BASE_CSS + (c.errors.length ? "" : c.css);
// Contenu déjà identique (montage instantané du slide d'amorçage, ou HTML inchangé entre
// l'amorçage et le vrai slide) : on ne recrée rien, donc aucun clignotement d'image quand le
// filtre navigateur repasse derrière. (Le nœud DSD du prerender, lui, est reconstruit par createRoot.)
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
}

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

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let alive = true;
    mountHeroHtml(host, html, css, () => alive).catch(() => {
      if (alive) host.shadowRoot?.replaceChildren();
    });
    return () => {
      alive = false;
    };
  }, [html, css]);

  // Liens internes du HTML collé → routeur de l'app (jamais de rechargement complet).
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const a = e.nativeEvent
      .composedPath()
      .find((n): n is HTMLAnchorElement => n instanceof HTMLAnchorElement);
    if (!a) return;
    e.preventDefault();
    const link = cleanHeroLink(a.getAttribute("href"));
    if (link && onLink) onLink(link);
  };

  return (
    <div
      ref={ref}
      onClick={onClick}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        contain: "layout paint style",
      }}
    />
  );
}
