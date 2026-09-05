// src/components/CookieConsentBanner.tsx — V2 port
import { useState } from "react";
import { Cookie } from "lucide-react";

export interface CookieConsentBannerProps {
  isVisible: boolean;
  onAcceptAll: () => void;
  onRejectNonEssential: () => void;
  onSavePreferences: (prefs: { analytics: boolean; performance: boolean; functionality: boolean }) => void;
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
  const [performance, setPerformance] = useState(true);
  const [functionality, setFunctionality] = useState(true);

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
        <div className="flex flex-col gap-2 mb-4">
          {[
            { label: "Nécessaires", desc: "Panier, authentification — toujours actifs", value: true, setter: () => {}, disabled: true },
            { label: "Mesure d'audience", desc: "Nous aident à comprendre l'usage", value: analytics, setter: setAnalytics },
            { label: "Performance", desc: "Vitesse, cache, optimisation", value: performance, setter: setPerformance },
            { label: "Fonctionnalité", desc: "Préférences, chat, langue", value: functionality, setter: setFunctionality },
          ].map((row: any) => (
            <div key={row.label} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: "var(--color-surface2)" }}>
              <div>
                <p className="text-xs font-bold" style={{ color: "var(--color-ink)" }}>{row.label}{row.disabled && " (requis)"}</p>
                <p className="text-[11px]" style={{ color: "var(--color-ink3)" }}>{row.desc}</p>
              </div>
              <span
                onClick={() => !row.disabled && row.setter((v: boolean) => !v)}
                role="switch"
                aria-checked={row.value}
                className={`w-11 h-6 rounded-full relative shrink-0 transition-colors ${row.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                style={{ background: row.value ? "var(--color-accent)" : "var(--color-border2)" }}
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform" style={{ transform: row.value ? "translateX(22px)" : "translateX(2px)" }} />
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {isCustomizing ? (
          <button onClick={() => onSavePreferences({ analytics, performance, functionality })} className="btn btn-accent flex-1">
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
