// src/hooks/useCookieConsent.ts — bannière simple : essentiels toujours ON,
// tout le reste = non-essentiels (analytics, perf, pub). Expiry 12 mois + version.
import { useState } from "react";

const STORAGE_KEY = "instawear-cookie-consent";
const CONSENT_VERSION = 2;
const EXPIRY_DAYS = 365;

export interface Consent {
  necessary: true;
  nonEssential: boolean;
  version: number;
  respondedAt: string;
}

function readConsent(): Consent | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Migration v1 {analytics, performance, functionality} → nonEssential
    if (parsed && parsed.version !== CONSENT_VERSION) {
      if (typeof parsed.analytics === "boolean" || typeof parsed.performance === "boolean") {
        return {
          necessary: true,
          nonEssential: !!(parsed.analytics || parsed.performance),
          version: CONSENT_VERSION,
          respondedAt: parsed.respondedAt || new Date().toISOString(),
        };
      }
      return null;
    }
    if (!parsed) return null;
    const age = Date.now() - new Date(parsed.respondedAt).getTime();
    if (age > EXPIRY_DAYS * 86400000) return null;
    return parsed as Consent;
  } catch {
    return null;
  }
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<Consent | null>(readConsent);

  const persist = (nonEssential: boolean) => {
    const full: Consent = {
      necessary: true,
      nonEssential,
      version: CONSENT_VERSION,
      respondedAt: new Date().toISOString(),
    };
    setConsent(full);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    } catch { /* ignore */ }
  };

  const acceptAll = () => persist(true);
  const rejectNonEssential = () => persist(false);
  const resetConsent = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
    setConsent(null);
  };

  return { consent, hasResponded: consent !== null, acceptAll, rejectNonEssential, resetConsent };
}
