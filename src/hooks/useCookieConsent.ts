// src/hooks/useCookieConsent.ts — 4 catégories + expiration 12 mois + version
import { useState } from "react";

const STORAGE_KEY = "instawear-cookie-consent";
const CONSENT_VERSION = 1;
const EXPIRY_DAYS = 365;

export interface Consent {
  necessary: true;
  analytics: boolean;
  performance: boolean;
  functionality: boolean;
  version: number;
  respondedAt: string;
}

function readConsent(): Consent | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // ancien format {analytics, respondedAt} → migrer
    if (parsed && typeof parsed.analytics === "boolean" && !("version" in parsed)) {
      return {
        necessary: true,
        analytics: !!parsed.analytics,
        performance: !!parsed.analytics,
        functionality: true,
        version: CONSENT_VERSION,
        respondedAt: parsed.respondedAt || new Date().toISOString(),
      };
    }
    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    const age = Date.now() - new Date(parsed.respondedAt).getTime();
    if (age > EXPIRY_DAYS * 86400000) return null;
    return parsed as Consent;
  } catch {
    return null;
  }
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(readConsent);

  const persist = (next: Omit<Consent, "necessary" | "version"> & Partial<Pick<Consent, "necessary" | "version">>) => {
    const full: Consent = {
      necessary: true,
      analytics: !!next.analytics,
      performance: !!next.performance,
      functionality: next.functionality !== false,
      version: CONSENT_VERSION,
      respondedAt: next.respondedAt || new Date().toISOString(),
    };
    setConsent(full);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  };

  const acceptAll = () => persist({ analytics: true, performance: true, functionality: true, respondedAt: new Date().toISOString() });
  const rejectNonEssential = () => persist({ analytics: false, performance: false, functionality: true, respondedAt: new Date().toISOString() });
  const savePreferences = (prefs: { analytics: boolean; performance: boolean; functionality: boolean }) =>
    persist({ ...prefs, respondedAt: new Date().toISOString() });
  const resetConsent = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setConsent(null);
  };

  return { consent, hasResponded: consent !== null, acceptAll, rejectNonEssential, savePreferences, resetConsent };
}
