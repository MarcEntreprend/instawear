// src/hooks/useTaxonomy.ts — listes de référence publiques (cache module).
// Une seule requête minuscule par session (~40 lignes) : facettes catalogue
// + nav header/footer. RLS anon SELECT (migration 20261031).
import { useEffect, useMemo, useState } from "react";
import type { ReferenceItem } from "../admin/adminTypes";
import { topRefValues, countByField, cleanTaxLabel } from "../utils/referenceMatch";

let cached: Promise<ReferenceItem[]> | null = null;

function fetchAll(): Promise<ReferenceItem[]> {
  if (!cached) {
    cached = import("../api/supabaseApi").then(({ referenceListApi }) =>
      referenceListApi.list().catch(() => [] as ReferenceItem[]),
    );
  }
  return cached;
}

export function useTaxonomy() {
  const [entries, setEntries] = useState<ReferenceItem[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetchAll().then((list) => {
      if (!cancelled) setEntries(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return entries;
}

/** Accès hors-React (tests d'intégration, scripts) : vide si non chargé. */
export function taxonomyCache(): Promise<ReferenceItem[]> {
  return fetchAll();
}

export interface NavTaxItem {
  value: string;
  label: string;
  count: number;
}

/**
 * Top-N d'un type pour nav/grilles (header, deals, footer) : même source
 * que les facettes (refs + comptes live), repli [] en chargement (l'appelant
 * garde sa liste statique le temps du fetch — pas de trou).
 */
export function useTopTaxonomy(
  products: { category?: string | null; eventType?: string | null; isActive?: boolean }[],
  type: "category" | "event_type",
  limit: number,
): NavTaxItem[] {
  const entries = useTaxonomy();
  return useMemo(() => {
    const refs = entries.filter((t) => t.type === type);
    if (refs.length === 0) return [];
    const field = type === "category" ? "category" : "eventType";
    const counts = countByField(products, field as "category" | "eventType");
    return topRefValues(refs, counts, limit).map((v) => ({
      value: v,
      label: cleanTaxLabel(refs.find((r) => r.value === v)?.label || v),
      count: counts.get(v) || 0,
    }));
  }, [entries, products, type, limit]);
}
