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

/** Code devise du store (ex: "USD") — source de vérité settings. */
export function useCurrencyCode(): string {
  const [code, setCode] = useState<string>("USD");

  const fetchCode = useCallback(() => {
    storeSettingsApi
      .get()
      .then((s) => setCode((s.currency || "USD").toUpperCase()))
      .catch(() => setCode("USD"));
  }, []);

  useEffect(() => {
    fetchCode();
  }, [fetchCode]);

  useEffect(() => {
    const handler = () => fetchCode();
    window.addEventListener("store-settings-updated", handler);
    return () => window.removeEventListener("store-settings-updated", handler);
  }, [fetchCode]);

  return code;
}
