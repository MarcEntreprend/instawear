// src/components/CookieConsentBanner.tsx — bannière simple 2 boutons
import { Cookie } from "lucide-react";

export interface CookieConsentBannerProps {
  isVisible: boolean;
  onAcceptAll: () => void;
  onRejectNonEssential: () => void;
  onNavigateLegal: () => void;
}

export default function CookieConsentBanner({
  isVisible,
  onAcceptAll,
  onRejectNonEssential,
  onNavigateLegal,
}: CookieConsentBannerProps) {
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
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink2)" }}>
          We use cookies to improve your experience.{" "}
          <button onClick={onNavigateLegal} className="underline font-semibold" style={{ color: "var(--color-ink)" }}>
            Learn more
          </button>
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onAcceptAll} className="btn btn-accent flex-1">
          Accept all
        </button>
        <button onClick={onRejectNonEssential} className="btn btn-secondary flex-1">
          Reject non-essential
        </button>
      </div>
    </div>
  );
}
