// src/lib/analytics.ts — traceurs chargés UNIQUEMENT après consentement.
// Aujourd'hui : aucun traceur tiers dans le site (pas de GA, Pixel, Hotjar).
// Quand un ID sera configuré (VITE_GA_ID), ce module l'injectera seulement si
// l'utilisateur a accepté les non-essentiels. Refus = rien n'est chargé.
import type { Consent } from "../hooks/useCookieConsent";

let loaded = false;

export function applyConsent(consent: Consent | null) {
  if (!consent?.nonEssential || loaded) return;
  const gaId = import.meta.env.VITE_GA_ID as string | undefined;
  if (!gaId) return; // aucun traceur configuré → rien à charger
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(s);
  (window as any).dataLayer = (window as any).dataLayer || [];
  const gtag = (...args: unknown[]) => (window as any).dataLayer.push(args);
  gtag("js", new Date());
  gtag("config", gaId, { anonymize_ip: true });
  loaded = true;
}
