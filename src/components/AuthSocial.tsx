// src/components/AuthSocial.tsx — boutons OAuth de la modale auth.
// Additif pur : ne touche ni aux modes ni aux handlers email/OTP existants.
// - Google : réel (signInWithOAuth, câblé par AuthModal).
// - Apple/Facebook : "(soon)", disabled (jamais de bouton qui échoue).
//   Les activer un jour = ajouter l'id à OAUTH_LIVE (+ config dashboard),
//   le "(soon)" disparaît tout seul.
// Style : tokens InstaWear (surface/border/ink), pas d'assets externes.
import { Apple, Facebook, Loader2 } from "lucide-react";

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
  if (id === "apple") return <Apple size={16} />;
  if (id === "facebook") return <Facebook size={16} />;

  // Google — vrai logo multicolore officiel (SVG inline, aucune dépendance)
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
