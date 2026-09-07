// src/components/SitewideCountdownBanner.tsx — Phase 6 : bandeau flash sale
// Lit store_settings.global_countdown_end (déjà éditable dans Paramètres).
// Masqué si absent ou dépassé. Aucun appel si l'admin ne l'a jamais défini.
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import DealCountdown from "./DealCountdown";
import { storeSettingsApi } from "../api/supabaseApi";

export default function SitewideCountdownBanner() {
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    storeSettingsApi
      .get()
      .then((s) => {
        if (cancelled) return;
        const end = (s as any)?.globalCountdownEnd || null;
        if (end && new Date(end).getTime() > Date.now()) setEndsAt(end);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!checked || !endsAt) return null;

  return (
    <div
      className="w-full py-2.5 px-4 flex items-center justify-center gap-3 text-center"
      style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
    >
      <Zap size={14} style={{ color: "var(--color-accent)" }} />
      <span className="text-xs font-bold uppercase tracking-widest">
        Flash sale ends in
      </span>
      <DealCountdown endsAt={endsAt} />
    </div>
  );
}
