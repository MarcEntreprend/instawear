// src/hooks/useShippingSettings.ts

import { useState, useEffect } from "react";
import { SHIPPING_RATES, DEFAULT_SHIPPING } from "../data/shippingRates";

interface ShippingSettings {
  cost: number;
  threshold: number;
  currencyCode: string;
  ready: boolean;
}

export function useShippingSettings(countryCode?: string): ShippingSettings {
  const getRate = () =>
    countryCode
      ? SHIPPING_RATES[countryCode] || DEFAULT_SHIPPING
      : DEFAULT_SHIPPING;

  const [settings, setSettings] = useState<ShippingSettings>(() => {
    const rate = getRate();
    return {
      cost: rate.cost,
      threshold: rate.freeThreshold,
      currencyCode: "usd",
      ready: true,
    };
  });

  // Met à jour immédiatement quand le pays change (sans attendre l'API)
  useEffect(() => {
    const rate = getRate();
    setSettings((prev) => ({
      ...prev,
      cost: rate.cost,
      threshold: rate.freeThreshold,
    }));
  }, [countryCode]);

  // ⚠️ Désactivé pour le MVP – les tarifs sont pilotés par shippingRates.ts
  // Charge les settings depuis Supabase (optionnel, peut écraser les valeurs si configuré)
  // useEffect(() => {
  //   import("../api/supabaseApi").then(({ storeSettingsApi }) => {
  //     storeSettingsApi
  //       .get()
  //       .then((s) => {
  //         const rate = getRate();
  //         setSettings({
  //           cost: s.shippingCost ?? rate.cost,
  //           threshold: s.freeShippingThreshold ?? rate.freeThreshold,
  //           currencyCode: (s.currency || "usd").toLowerCase(),
  //           ready: true,
  //         });
  //       })
  //       .catch(() => {});
  //   });
  // }, [countryCode]);

  return settings;
}
