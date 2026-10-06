// src/hooks/useCurrency.ts — pays de livraison UNIQUEMENT (shipping).
// Ne pilote AUCUN montant : la boutique est mono-devise (settings USD).
// Défaut : pays du store_settings (admin, source de vérité), sinon France.
import { useEffect, useState } from "react";

const STORAGE_KEY = "instawear-ship-country";
const FALLBACK_COUNTRY = "France";

export function useCurrency() {
  const [country, setCountryState] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? FALLBACK_COUNTRY;
    } catch {
      return FALLBACK_COUNTRY;
    }
  });
  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        import("../api/supabaseApi").then(({ storeSettingsApi }) => {
          storeSettingsApi
            .get()
            .then((s) => {
              if (s.country) setCountryState(s.country);
            })
            .catch(() => {});
        });
      }
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, country);
    } catch {
      /* ignore */
    }
  }, [country]);
  const setCountry = (next: string) => setCountryState(next);
  return { country, setCountry };
}
