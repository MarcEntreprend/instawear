// src/components/ProductUnavailable.tsx
// Message uniforme "produit indisponible" (Q2.2) : remplace les strings
// ad-hoc dispersées (carte, panier, toasts). Utilisé par la fiche produit
// (inactif), les deep-links invalides (/produit/:bad-id) et le retry failed.
import { PackageX, RotateCcw, Home } from "lucide-react";

export type UnavailableReason = "deleted" | "inactive" | "load-error";

const COPY: Record<UnavailableReason, { title: string; body: string }> = {
  deleted: {
    title: "This product is no longer available.",
    body: "It may have been removed. Browse the catalog for similar items.",
  },
  inactive: {
    title: "This product is currently unavailable.",
    body: "Check back soon or explore similar items in the catalog.",
  },
  "load-error": {
    title: "Oops! Something went wrong while loading the product.",
    body: "Please try again later or, if you prefer, return to the home page.",
  },
};

export default function ProductUnavailable({
  reason,
  onBackHome,
  onRetry,
  onBrowse,
}: {
  reason: UnavailableReason;
  onBackHome: () => void;
  onRetry?: () => void;
  onBrowse?: () => void;
}) {
  const copy = COPY[reason];
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-(--color-bg) animate-fade-in">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-24 text-center">
        <span
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "var(--color-surface2)" }}
        >
          <PackageX size={24} style={{ color: "var(--color-ink4)" }} />
        </span>
        <h1
          className="text-xl font-extrabold mb-2"
          style={{ color: "var(--color-ink)" }}
        >
          {copy.title}
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-ink3)" }}>
          {copy.body}
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {reason === "load-error" && onRetry && (
            <button onClick={onRetry} className="btn btn-secondary">
              <RotateCcw size={14} /> Try again
            </button>
          )}
          {onBrowse && (
            <button onClick={onBrowse} className="btn btn-secondary">
              Browse catalog
            </button>
          )}
          <button onClick={onBackHome} className="btn btn-secondary">
            <Home size={14} /> Back to home
          </button>
        </div>
      </div>
    </div>
  );
}
