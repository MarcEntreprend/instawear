// src/components/CookieConsentBanner.tsx — V2 port
import { useState } from "react";
import { Cookie } from "lucide-react";

export interface CookieConsentBannerProps {
  isVisible: boolean;
  onAcceptAll: () => void;
  onRejectNonEssential: () => void;
  onSavePreferences: (analytics: boolean) => void;
  onNavigateLegal: () => void;
}

export default function CookieConsentBanner({
  isVisible,
  onAcceptAll,
  onRejectNonEssential,
  onSavePreferences,
  onNavigateLegal,
}: CookieConsentBannerProps) {
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(true);

  if (!isVisible) return null;

  return (
    <div
      className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-45 rounded-2xl p-5 animate-fade-up bottom-24 lg:bottom-6"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-xl)",
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--color-accent-bg)", color: "var(--color-accent)" }}
        >
          <Cookie size={17} />
        </span>
        <div>
          <p className="text-sm font-bold mb-1" style={{ color: "var(--color-ink)" }}>
            On utilise des cookies
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink3)" }}>
            Certains sont essentiels au fonctionnement du site, d'autres nous aident à l'améliorer.{" "}
            <button onClick={onNavigateLegal} className="underline font-semibold" style={{ color: "var(--color-ink2)" }}>
              En savoir plus
            </button>
          </p>
        </div>
      </div>

      {isCustomizing && (
        <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl" style={{ background: "var(--color-surface2)" }}>
          <div>
            <p className="text-xs font-bold" style={{ color: "var(--color-ink)" }}>
              Cookies de mesure d'audience
            </p>
            <p className="text-[11px]" style={{ color: "var(--color-ink3)" }}>
              Nous aident à comprendre l'usage du site
            </p>
          </div>
          <span
            onClick={() => setAnalytics((v) => !v)}
            role="switch"
            aria-checked={analytics}
            className="w-11 h-6 rounded-full relative shrink-0 cursor-pointer transition-colors"
            style={{ background: analytics ? "var(--color-accent)" : "var(--color-border2)" }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{ transform: analytics ? "translateX(22px)" : "translateX(2px)" }}
            />
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {isCustomizing ? (
          <button onClick={() => onSavePreferences(analytics)} className="btn btn-accent flex-1">
            Enregistrer mes préférences
          </button>
        ) : (
          <>
            <button onClick={onAcceptAll} className="btn btn-accent flex-1">
              Accepter tout
            </button>
            <button onClick={onRejectNonEssential} className="btn btn-secondary">
              Refuser
            </button>
            <button onClick={() => setIsCustomizing(true)} className="btn btn-ghost">
              Personnaliser
            </button>
          </>
        )}
      </div>
    </div>
  );
}
