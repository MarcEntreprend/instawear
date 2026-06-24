// src/hooks/useCurrencySymbol.ts

import { useState, useEffect } from "react";
import { storeSettingsApi } from "../api/supabaseApi";

const SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  BRL: "R$",
  CAD: "CA$",
  CHF: "CHF",
  JPY: "¥",
};

let cachedSymbol: string | null = null;
let cacheTimestamp = 0;

export function useCurrencySymbol(): string {
  const [symbol, setSymbol] = useState<string>(cachedSymbol ?? "$");

  useEffect(() => {
    if (cachedSymbol && Date.now() - cacheTimestamp < 60_000) {
      setSymbol(cachedSymbol);
      return;
    }
    storeSettingsApi
      .get()
      .then((settings) => {
        const sym = SYMBOLS[settings.currency] || settings.currency;
        cachedSymbol = sym;
        cacheTimestamp = Date.now();
        setSymbol(sym);
      })
      .catch(() => {
        // garde le symbole par défaut
      });
  }, []);

  return symbol;
}
