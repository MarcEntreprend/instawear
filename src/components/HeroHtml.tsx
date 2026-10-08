// src/components/HeroHtml.tsx — bloc HTML collé (lot 4) : rendu sandboxé
// en Shadow DOM ouvert (styles scopés, zéro fuite CSS), contenu nettoyé
// (sanitizeHeroHtml), clics délégués (internes → routeur app, externes →
// nouvel onglet noopener, reste → bloqué). Aucun <script> ne survit.
import { useEffect, useRef } from "react";
import { classifyHeroHref, sanitizeHeroHtml } from "../lib/heroHtml";

export default function HeroHtml({
  html,
  css,
  onLink,
}: {
  html: string;
  css: string;
  onLink: (link: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    const shadow =
      host.shadowRoot ?? host.attachShadow({ mode: "open" });
    while (shadow.firstChild)
      shadow.removeChild(shadow.firstChild);
    const style = document.createElement("style");
    style.textContent = `:host{display:block;position:absolute;inset:0;overflow:hidden;}\n${css}`;
    const tpl = document.createElement("template");
    tpl.innerHTML = sanitizeHeroHtml(html);
    shadow.appendChild(style);
    shadow.appendChild(tpl.content.cloneNode(true));
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const kind = classifyHeroHref(href);
      if (kind === "internal") {
        e.preventDefault();
        onLink(href);
      } else if (kind === "external") {
        e.preventDefault();
        window.open(href, "_blank", "noopener");
      } else {
        e.preventDefault();
      }
    };
    shadow.addEventListener("click", onClick);
    return () => {
      shadow.removeEventListener("click", onClick);
    };
  }, [html, css, onLink]);

  return <div ref={ref} aria-label="Contenu personnalisé" />;
}
