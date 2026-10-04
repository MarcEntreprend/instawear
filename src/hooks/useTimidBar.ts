// src/hooks/useTimidBar.ts — barre "timide" : visible au scroll-up / en haut,
// masquée au scroll-down (fini les allers-retours en haut de page).
// Même pattern que la "bande timide" du header (delta + rAF).
// Scroll fenêtre par défaut, ou conteneur (ref) pour les zones à scroll interne
// (onglets compte). Pur et testé : voir timidNext.

import { useEffect, useRef, useState, type RefObject } from "react";

/** État suivant de visibilité. y = position scroll, lastY = précédente. */
export function timidNext(
  visible: boolean,
  y: number,
  lastY: number,
  delta = 12,
  topThreshold = 8,
): boolean {
  if (y <= topThreshold) return true;
  const d = y - lastY;
  if (d > delta) return false;
  if (d < -delta) return true;
  return visible;
}

export function useTimidBar(
  container?: RefObject<HTMLElement | null>,
  delta = 12,
): boolean {
  const [visible, setVisible] = useState(true);
  const lastY = useRef<number | null>(null);

  useEffect(() => {
    const el = container?.current ?? null;
    const readY = () => (el ? el.scrollTop : window.scrollY);
    lastY.current = readY();
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = readY();
        const prev = lastY.current ?? y;
        lastY.current = y;
        setVisible((v) => {
          const next = timidNext(v, y, prev, delta);
          return next === v ? v : next;
        });
      });
    };
    const target: HTMLElement | Window = el ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [container, delta]);

  return visible;
}
