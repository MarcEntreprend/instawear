// src/components/AuthSocial.tsx — boutons OAuth de la modale auth.
// Additif pur : ne touche ni aux modes ni aux handlers email/OTP existants.
// - Google : réel (signInWithOAuth, câblé par AuthModal).
// - Apple/Facebook : "(soon)", disabled (jamais de bouton qui échoue).
//   Les activer un jour = ajouter l'id à OAUTH_LIVE (+ config dashboard),
//   le "(soon)" disparaît tout seul.
// Style : tokens InstaWear (surface/border/ink), pas d'assets externes.
import { Loader2 } from "lucide-react";

export type OAuthProvider = "google" | "apple" | "facebook";

/** Providers réellement configurés côté Supabase Dashboard. */
export const OAUTH_LIVE: OAuthProvider[] = ["google"];

export interface SocialProviderDef {
  id: OAuthProvider;
  label: string;
}

export const SOCIAL_PROVIDERS: SocialProviderDef[] = [
  { id: "google", label: "Continue with Google" },
  { id: "apple", label: "Continue with Apple" },
  { id: "facebook", label: "Continue with Facebook" },
];

export function isOAuthLive(id: OAuthProvider): boolean {
  return OAUTH_LIVE.includes(id);
}

/** Libellé affiché : "(soon)" suffixé quand désactivé (jamais de leurre). */
export function socialLabel(def: SocialProviderDef): string {
  return isOAuthLive(def.id) ? def.label : `${def.label} (soon)`;
}

function ProviderGlyph({ id }: { id: OAuthProvider }) {
  // ── Apple — vrai logo officiel (pomme) ─────────────────────────────
  if (id === "apple") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        style={{ display: "block", flexShrink: 0 }}
      >
        <path
          fill="currentColor"
          d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
        />
      </svg>
    );
  }

  // ── Facebook — vrai logo officiel (cercle bleu + f blanc) ─────────
  if (id === "facebook") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        style={{ display: "block", flexShrink: 0 }}
      >
        <path
          fill="#1877F2"
          d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
        />
        <path
          fill="#FFFFFF"
          d="M16.671 15.543l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.513V4.996s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.643H7.078v3.47h3.047v8.385a12.09 12.09 0 003.75 0v-8.385h2.796z"
        />
      </svg>
    );
  }

  // ── Google — vrai logo multicolore officiel ────────────────────────
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

interface AuthSocialProps {
  /** Provider en cours de redirection (spinner), sinon null. */
  pending: OAuthProvider | null;
  onOAuth: (provider: OAuthProvider) => void;
}

export default function AuthSocial({ pending, onOAuth }: AuthSocialProps) {
  return (
    <div className="flex flex-col gap-2.5 animate-fade-up">
      {SOCIAL_PROVIDERS.map((p) => {
        const live = isOAuthLive(p.id);
        const busy = pending === p.id;
        return (
          <button
            key={p.id}
            type="button"
            disabled={!live || pending !== null}
            aria-disabled={!live}
            title={live ? p.label : `${p.label} — coming soon`}
            onClick={() => onOAuth(p.id)}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-sm font-semibold transition-all duration-150"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: live ? "var(--color-ink)" : "var(--color-ink4)",
              opacity: live ? 1 : 0.65,
              cursor: live ? "pointer" : "not-allowed",
            }}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <ProviderGlyph id={p.id} />
            )}
            {socialLabel(p)}
          </button>
        );
      })}
      <div className="flex items-center gap-3 my-1" aria-hidden="true">
        <span
          className="flex-1"
          style={{ borderTop: "1px solid var(--color-border)" }}
        />
        <span
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: "var(--color-ink4)" }}
        >
          OR
        </span>
        <span
          className="flex-1"
          style={{ borderTop: "1px solid var(--color-border)" }}
        />
      </div>
    </div>
  );
}
