// src/hooks/useOffline.ts
// État hors-ligne combiné : navigateur (events online/offline) + erreur réseau
// métier (ex: fetch produits Supabase en échec). Utilisé pour afficher les
// fallbacks offline (placeholders, bloc "Oups") au lieu des états vides.
import { useEffect, useState } from "react";

function browserIsOffline(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.onLine === "boolean" &&
    !navigator.onLine
  );
}

export function useOffline(externalError = false): boolean {
  const [browserOffline, setBrowserOffline] = useState<boolean>(browserIsOffline);
  useEffect(() => {
    const goOnline = () => setBrowserOffline(false);
    const goOffline = () => setBrowserOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    // Re-synchronise au montage (onglet restauré, etc.)
    setBrowserOffline(browserIsOffline());
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  return browserOffline || externalError;
}

/** Placeholder de recherche adapté : exemple générique quand hors-ligne. */
export const SEARCH_PLACEHOLDER_ONLINE = "Search for an item, an event…";
export const SEARCH_PLACEHOLDER_OFFLINE = 'Try "birthday hoodie", "festival tee"…';
