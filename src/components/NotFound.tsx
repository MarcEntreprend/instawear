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
        className="text-2xl font-black mt-2"
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
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{
            background: "var(--color-surface2)",
            border: "1px solid var(--color-border)",
            color: "var(--color-ink2)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <ArrowLeft size={16} strokeWidth={2} /> Go back
        </button>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{
            background: "var(--color-accent)",
            boxShadow: "var(--shadow-accent)",
            fontFamily: "var(--font-sans)",
          }}
        >
          <Home size={16} strokeWidth={2} /> Home
        </button>
      </div>
    </div>
  );
}
