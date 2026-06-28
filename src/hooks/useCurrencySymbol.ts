// src/hooks/useCurrencySymbol.ts
import { useState, useEffect, useCallback } from "react";
import { storeSettingsApi } from "../api/supabaseApi";

const SYMBOLS: Record<string, string> = {
  USD: "$",
  BRL: "R$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  CHF: "CHF",
  JPY: "¥",
};

export function useCurrencySymbol(): string {
  const [symbol, setSymbol] = useState<string>("$");

  const fetch = useCallback(() => {
    storeSettingsApi
      .get()
      .then((s) => setSymbol(SYMBOLS[s.currency] || "$"))
      .catch(() => setSymbol("$"));
  }, []);

  // Chargement initial
  useEffect(() => {
    fetch();
  }, [fetch]);

  // Écoute l'événement déclenché après une sauvegarde des paramètres
  useEffect(() => {
    const handler = () => fetch();
    window.addEventListener("store-settings-updated", handler);
    return () => window.removeEventListener("store-settings-updated", handler);
  }, [fetch]);

  return symbol;
}
