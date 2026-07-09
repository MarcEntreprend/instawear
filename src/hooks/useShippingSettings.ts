// src/hooks/useShippingSettings.ts

import { useState, useEffect } from "react";
import { storeSettingsApi } from "../api/supabaseApi";

interface ShippingSettings {
  cost: number;
  threshold: number;
  currencyCode: string;
  ready: boolean;
}

export function useShippingSettings(): ShippingSettings {
  const [settings, setSettings] = useState<ShippingSettings>({
    cost: 4.99,
    threshold: 35,
    currencyCode: "usd",
    ready: false,
  });

  useEffect(() => {
    storeSettingsApi
      .get()
      .then((s) => {
        setSettings({
          cost: s.shippingCost ?? 4.99,
          threshold: s.freeShippingThreshold ?? 35,
          currencyCode: (s.currency || "usd").toLowerCase(),
          ready: true,
        });
      })
      .catch(() => {
        setSettings((prev) => ({ ...prev, ready: true }));
      });
  }, []);

  return settings;
}
