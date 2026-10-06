// src/hooks/useTaxonomy.ts — listes de référence publiques (cache module).
// Une seule requête minuscule par session (~40 lignes) : facettes catalogue
// + nav header/footer. RLS anon SELECT (migration 20261031).
import { useEffect, useState } from "react";
import type { ReferenceItem } from "../admin/adminTypes";

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
