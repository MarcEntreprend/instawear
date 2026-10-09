// src/components/HeroHtmlBlock.tsx — rendu ISOLÉ du HTML collé (Shadow DOM).
// Le CSS du site n'entre pas, le CSS collé ne sort pas ; les variables (--color-*) traversent
// la frontière : le HTML peut s'adapter au thème avec var(--color-ink) etc.
import { useEffect, useRef, type MouseEvent } from "react";
import { sanitizeHeroCss } from "../lib/heroCss";
import { cleanHeroLink } from "../lib/heroSchema";

const BASE_CSS =
  ":host{display:block;position:absolute;inset:0;overflow:hidden;contain:layout paint style;" +
  "color:var(--color-ink);font-family:var(--font-sans);line-height:1.4}" +
  "*,*::before,*::after{box-sizing:border-box}img,svg,picture{max-width:100%}";

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
  const st = document.createElement("style");
  st.textContent = BASE_CSS + (c.errors.length ? "" : c.css);
  root.replaceChildren(st, frag.cloneNode(true));
}

export default function HeroHtmlBlock({
  html,
  css,
  onLink,
}: {
  html: string;
  css: string;
  onLink?: (link: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

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
