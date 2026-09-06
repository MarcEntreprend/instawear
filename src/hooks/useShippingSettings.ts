// src/hooks/useShippingSettings.ts
// Source de vérité : store_settings (admin) pour le coût/seuil/devises de base.
// shippingRates.ts = surcharges par pays (fallback = valeurs admin).
import { useState, useEffect } from "react";
import { SHIPPING_RATES, DEFAULT_SHIPPING } from "../data/shippingRates";

interface ShippingSettings {
  cost: number;
  threshold: number;
  currencyCode: string;
  ready: boolean;
}

export function useShippingSettings(countryCode?: string): ShippingSettings {
  const [settings, setSettings] = useState<ShippingSettings>(() => {
    const rate =
      (countryCode && SHIPPING_RATES[countryCode]) || DEFAULT_SHIPPING;
    return {
      cost: rate.cost,
      threshold: rate.freeThreshold,
      currencyCode: "usd",
      ready: false,
    };
  });

  useEffect(() => {
    let cancelled = false;
    // Base immédiate : override pays si présent, sinon défauts statiques
    const rate =
      (countryCode && SHIPPING_RATES[countryCode]) || DEFAULT_SHIPPING;
    setSettings((prev) => ({
      ...prev,
      cost: rate.cost,
      threshold: rate.freeThreshold,
    }));

    // Source de vérité admin : écrase les défauts (pas les overrides pays)
    import("../api/supabaseApi").then(({ storeSettingsApi }) => {
      storeSettingsApi
        .get()
        .then((s) => {
          if (cancelled) return;
          const hasCountryOverride =
            !!countryCode && !!SHIPPING_RATES[countryCode];
          setSettings({
            cost: hasCountryOverride
              ? SHIPPING_RATES[countryCode!].cost
              : (s.shippingCost ?? rate.cost),
            threshold: hasCountryOverride
              ? SHIPPING_RATES[countryCode!].freeThreshold
              : (s.freeShippingThreshold ?? rate.freeThreshold),
            currencyCode: (s.currency || "usd").toLowerCase(),
            ready: true,
          });
        })
        .catch(() => {
          if (!cancelled)
            setSettings((prev) => ({ ...prev, ready: true }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  return settings;
}
