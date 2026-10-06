// src/utils/scroll.ts — scroll unifié vers le catalogue.
//
// Contexte : les scrollIntoView({smooth}) dispersés (header/footer/tuiles)
// atterrissaient différemment selon la direction parce que les sections
// portent content-visibility:auto (hauteurs estimées 800px, cibles qui
// bougent en plein scroll fluide). Ce helper force le rendu (purge
// l'estimation), mesure le header sticky réel, puis scrolle à l'offset
// exact. Une seule ancre : #section-catalog (scroll-mt-24 en fallback CSS).

/** Offset pur (testé) : position scroll pour poser une ancre sous le header. */
export function catalogScrollTop(
  elTopViewport: number,
  scrollY: number,
  headerH: number,
  gap = 8,
): number {
  return Math.max(0, elTopViewport + scrollY - headerH - gap);
}

/** Scroll vers le haut d'une section (défaut fluide). Sans effet hors DOM. */
export function scrollToCatalogTop(
  smooth = true,
  elementId = "section-catalog",
): void {
  if (typeof document === "undefined") return;
  const first = document.getElementById(elementId);
  if (!first) return;
  // Force le rendu du sous-arbre skippé (rect exact, pas l'estimation).
  first.getBoundingClientRect();
  requestAnimationFrame(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    const headerH =
      document.querySelector("header")?.getBoundingClientRect().height ?? 64;
    window.scrollTo({
      top: catalogScrollTop(
        el.getBoundingClientRect().top,
        window.scrollY,
        headerH,
      ),
      behavior: smooth ? "smooth" : "auto",
    });
  });
}
