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
  return (
    <span
      aria-hidden="true"
      className="flex items-center justify-center font-black"
      style={{ width: 16, height: 16, fontSize: 14, lineHeight: 1 }}
    >
      G
    </span>
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
