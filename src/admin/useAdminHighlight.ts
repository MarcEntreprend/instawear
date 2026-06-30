// src/admin/useAdminHighlight.ts
import { useCallback, useEffect } from "react";

import type { AdminSection } from "./AdminSidebar";

interface HighlightParams {
  section: AdminSection;
  highlightId?: string; // ID de l'élément à surligner (productId, orderId…)
  highlightEvent?: string; // nom de l'événement à dispatcher (par défaut: instawear:highlight-{section})
}

/**
 * Hook réutilisable pour naviguer vers une section admin et surligner un élément.
 *
 * Usage dans une notification :
 *   const { navigateAndHighlight } = useAdminHighlight();
 *   navigateAndHighlight({ section: "products", highlightId: productId });
 */
export function useAdminHighlight() {
  const navigateAndHighlight = useCallback(
    ({ section, highlightId, highlightEvent }: HighlightParams) => {
      // 1. Naviguer vers la section
      window.dispatchEvent(
        new CustomEvent("instawear:navigate-admin", {
          detail: { section },
        }),
      );

      // 2. Surligner l'élément après un délai (le temps que la page se monte)
      if (highlightId) {
        const eventName = highlightEvent || `instawear:highlight-${section}`;
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent(eventName, { detail: highlightId }),
          );
        }, 400);
      }
    },
    [],
  );

  return { navigateAndHighlight };
}

/**
 * Hook à placer dans la page cible (ex: ProductsPage) pour écouter le highlight.
 *
 * Usage dans ProductsPage :
 *   useHighlightListener("instawear:highlight-products", setHighlightedId);
 */

export function useHighlightListener(
  eventName: string,
  onHighlight: (id: string) => void,
  duration = 3000,
  /** Sélecteur CSS pour trouver la ligne à scroller (ex: 'tr[data-product-id]') */
  rowSelector?: string,
) {
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      onHighlight(id);

      // Scroll automatique vers la ligne cible
      if (rowSelector) {
        setTimeout(() => {
          const row = document.querySelector(rowSelector.replace("{}", id));
          if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
      }

      setTimeout(() => onHighlight(""), duration);
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName, onHighlight, duration, rowSelector]);
}
