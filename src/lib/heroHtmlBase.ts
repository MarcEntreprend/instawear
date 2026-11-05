// src/lib/heroHtmlBase.ts — CSS de base du shadow root du HTML collé. PUR (partagé navigateur / prerender).
export const BASE_CSS =
  ":host{display:block;position:absolute;inset:0;overflow:hidden;contain:layout paint style;" +
  "color:var(--color-ink);font-family:var(--font-sans);line-height:1.4}" +
  "*,*::before,*::after{box-sizing:border-box}img,svg,picture{max-width:100%}";
