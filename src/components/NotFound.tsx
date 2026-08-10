// src/components/NotFound.tsx
// Page 404 sobre, réutilise les variables CSS du design system.

import React from "react";
import { ArrowLeft, Home } from "lucide-react";

interface NotFoundProps {
  onBack: () => void;
}

export default function NotFound({ onBack }: NotFoundProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Grand 404 en arrière-plan */}
      <div
        className="text-[120px] font-black leading-none select-none"
        style={{
          color: "var(--color-accent)",
          opacity: 0.15,
          fontFamily: "var(--font-sans)",
        }}
      >
        404
      </div>

      <h1
        className="text-3xl font-black mt-2 tracking-tight"
        style={{ color: "var(--color-ink)", fontFamily: "var(--font-sans)" }}
      >
        Page not found
      </h1>
      <p
        className="text-sm mt-2 max-w-xs leading-relaxed"
        style={{ color: "var(--color-ink3)" }}
      >
        The page you're looking for doesn't exist or has been moved.
      </p>

      <div className="flex items-center gap-3 mt-8">
        {/* Bouton Retour */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
          style={{
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            color: "var(--color-ink2)",
            fontFamily: "var(--font-sans)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-surface)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-surface2)";
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} /> Go back
        </button>

        {/* Bouton Accueil */}
        <button
          onClick={onBack}
          className="pill-btn pill-btn-accent flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
          style={{
            boxShadow: "var(--shadow-accent)",
            fontFamily: "var(--font-sans)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(255,92,53,.28)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "var(--shadow-accent)";
          }}
        >
          <Home size={16} strokeWidth={2} /> Home
        </button>
      </div>
    </div>
  );
}
