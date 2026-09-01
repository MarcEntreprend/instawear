// src/hooks/useCookieConsent.ts — V2 port
import { useState } from "react";

const STORAGE_KEY = "instawear-cookie-consent";

interface Consent {
  analytics: boolean;
  respondedAt: string;
}

function readConsent(): Consent | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(readConsent);

  const persist = (next: Consent) => {
    setConsent(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const acceptAll = () => persist({ analytics: true, respondedAt: new Date().toISOString() });
  const rejectNonEssential = () => persist({ analytics: false, respondedAt: new Date().toISOString() });
  const savePreferences = (analytics: boolean) => persist({ analytics, respondedAt: new Date().toISOString() });

  return { consent, hasResponded: consent !== null, acceptAll, rejectNonEssential, savePreferences };
}
