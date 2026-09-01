// src/hooks/useCurrency.ts — V2 port (ship country -> currency)
import { useEffect, useState } from "react";
import { getCurrencyForCountry, type CurrencyInfo } from "../data/currency";

const STORAGE_KEY = "instawear-ship-country";
const DEFAULT_COUNTRY = "France";

export function useCurrency() {
  const [country, setCountryState] = useState<string>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_COUNTRY;
    } catch {
      return DEFAULT_COUNTRY;
    }
  });
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, country); }, [country]);
  const currency: CurrencyInfo = getCurrencyForCountry(country);
  const setCountry = (next: string) => setCountryState(next);
  return { country, setCountry, currency };
}
