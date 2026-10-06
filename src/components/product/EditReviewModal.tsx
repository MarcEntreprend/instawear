// src/components/product/EditReviewModal.tsx — édition d'un avis (PDP + compte).
// Mêmes règles que le dépôt (titre OU corps requis) + verrou anti-double-submit.
// Boutons visibles uniquement sur ses propres avis (isOwnReview) ; le serveur
// applique RLS owner (migrations existantes).
import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";

export interface ReviewDraft {
  rating: number;
  title: string;
  body: string;
}

/** Règle de validation (miroir du dépôt) : message d'erreur ou null si OK. */
export function validateReview(input: {
  rating: number;
  title: string;
  body: string;
}): string | null {
  if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5)
    return "Please select a rating.";
  if (!input.title.trim() && !input.body.trim())
    return "Write a title or a review.";
  if (input.body.trim().length > 0 && input.body.trim().length < 3)
    return "Review is too short.";
  return null;
}

/** Vrai si l'avis appartient au client connecté (jamais d'ID forgé côté UI). */
export function isOwnReview(
  review: { customerId?: string | null; customer_id?: string | null } | null,
  customerId: string | null,
): boolean {
  if (!review || !customerId) return false;
  return (
    review.customerId === customerId ||
    (review as any).customer_id === customerId
  );
}

interface EditReviewModalProps {
  initial: ReviewDraft;
  saving: boolean;
  error: string | null;
  onSave: (draft: ReviewDraft) => void;
  onClose: () => void;
}

export default function EditReviewModal({
  initial,
  saving,
  error,
  onSave,
  onClose,
}: EditReviewModalProps) {
  const [rating, setRating] = useState(initial.rating);
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    const err = validateReview({ rating, title, body });
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    onSave({ rating, title: title.trim(), body: body.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,13,10,.5)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit review"
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 animate-fade-up"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p
            className="text-sm font-bold"
            style={{ color: "var(--color-ink)" }}
          >
            Edit your review
          </p>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ color: "var(--color-ink3)" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              aria-label={`Rate ${s} out of 5 stars`}
              aria-pressed={s === rating}
              className="flex items-center justify-center min-w-[28px] min-h-[28px]"
            >
              <Star
                size={20}
                fill={s <= rating ? "var(--color-gold)" : "none"}
                style={{ color: "var(--color-gold)" }}
              />
            </button>
          ))}
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full px-3 py-2 rounded-xl text-sm mb-2"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            color: "var(--color-ink)",
          }}
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Your review..."
          rows={4}
          className="w-full px-3 py-2 rounded-xl text-sm resize-none"
          style={{
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            color: "var(--color-ink)",
          }}
        />
        {(localError || error) && (
          <p
            className="text-xs mt-2 font-semibold"
            style={{ color: "var(--color-negative)" }}
          >
            {localError || error}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
