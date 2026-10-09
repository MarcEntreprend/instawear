// src/hooks/useHeroSync.ts — contrôle de fraîcheur du hero SANS timer ni socket.
// Déclenché au retour sur l'onglet / focus / retour réseau, au plus une fois par minute.
import { useEffect, useRef } from "react";

export function useHeroSync(
  check: () => Promise<void> | void,
  minGapMs = 60_000,
) {
  const fn = useRef(check);
  useEffect(() => {
    fn.current = check;
  });
  const last = useRef(Date.now());

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - last.current < minGapMs) return;
      last.current = now;
      void Promise.resolve(fn.current()).catch(() => {});
    };
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    return () => {
      document.removeEventListener("visibilitychange", run);
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
    };
  }, [minGapMs]);
}
