// src/admin/HeroSyncBadge.tsx — état du prerender (Deploy Hook) dans l'en-tête du studio.
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { heroSyncApi, type HeroSyncStatus } from "../api/supabaseApi";

const MSG: Record<string, string> = {
  triggered: "Build lancé : la boutique sera à jour dans quelques minutes.",
  "no-secret": "Deploy Hook non configuré (secret Vault manquant).",
  unchanged: "Rien à republier : la boutique est déjà à jour.",
  debounced:
    "Un build récent est déjà passé : le suivant partira à la prochaine ouverture ou « Republier ».",
};

export default function HeroSyncBadge() {
  const [st, setSt] = useState<HeroSyncStatus | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const refresh = useCallback(
    () => heroSyncApi.status().then(setSt, () => setSt(null)),
    [],
  );

  useEffect(() => {
    void refresh();
    // Après chaque enregistrement du studio : le serveur décide (empreinte + débounce).
    const on = () =>
      setTimeout(() => {
        heroSyncApi
          .flush()
          .catch(() => {})
          .finally(() => void refresh());
      }, 1500);
    window.addEventListener("storefront:invalidate", on);
    return () => window.removeEventListener("storefront:invalidate", on);
  }, [refresh]);

  // Build resté en attente (débounce) : on retente UNE fois à l'ouverture du studio.
  const pending = st ? st.pending : false;
  const configured = st ? st.hookConfigured : false;
  useEffect(() => {
    if (!pending || !configured) return;
    heroSyncApi
      .flush()
      .catch(() => {})
      .finally(() => void refresh());
  }, [pending, configured, refresh]);

  if (st === undefined) return null;
  const base: React.CSSProperties = {
    fontSize: 12,
    color: "var(--color-ink3)",
    marginTop: 4,
  };
  if (st === null) {
    return (
      <p style={base}>
        Statut du build indisponible (migration du lot 5 non appliquée ?).
      </p>
    );
  }

  const label = !st.hookConfigured
    ? "Rebuild automatique : non configuré"
    : st.pending
      ? "Build de la boutique en attente (≤ 10 min)"
      : "Boutique à jour";

  const rebuild = async () => {
    if (!window.confirm("Relancer la construction de la boutique maintenant ?"))
      return;
    setBusy(true);
    setInfo(null);
    try {
      const code = await heroSyncApi.rebuild();
      setInfo(MSG[code] ?? code);
      void refresh();
    } catch (e: any) {
      setInfo(e?.message || "Échec.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        ...base,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: !st.hookConfigured
            ? "#d97706"
            : st.pending
              ? "var(--color-accent)"
              : "var(--color-success)",
        }}
      />
      <span>
        {label}
        {st.lastHookAt
          ? ` · dernier build ${new Date(st.lastHookAt).toLocaleString("fr-FR")}`
          : ""}
      </span>
      {st.hookConfigured && (
        <button
          type="button"
          onClick={rebuild}
          disabled={busy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            color: "var(--color-ink2)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={11} /> Republier maintenant
        </button>
      )}
      {info && <span>{info}</span>}
    </div>
  );
}
