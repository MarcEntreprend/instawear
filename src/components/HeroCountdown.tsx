// src/components/HeroCountdown.tsx — compte à rebours hero (lot 14).
// Hydratation cliente uniquement : le prerender ne peint qu'un placeholder
// statique (jamais de date figée), et ces slides sont exclus du lead.
// Un intervalle d'1 s par compteur, nettoyé au démontage. Zéro dépendance.
import { useEffect, useState } from "react";

/** Décomposition pure (testée) : jours/heures/min/sec + expiré. */
export function heroCountdownParts(
  targetMs: number,
  nowMs: number,
): { d: number; h: number; m: number; s: number; expired: boolean } {
  const diff = targetMs - nowMs;
  if (!Number.isFinite(diff) || diff <= 0)
    return { d: 0, h: 0, m: 0, s: 0, expired: true };
  const total = Math.floor(diff / 1000);
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
    expired: false,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

export default function HeroCountdown({
  targetAt,
  label,
  tone,
  expiredText,
}: {
  targetAt: string;
  label: string;
  tone: "light" | "dark";
  expiredText: string;
}) {
  const targetMs = Date.parse(targetAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const p = heroCountdownParts(targetMs, now);
  const light = tone === "light";
  const box: React.CSSProperties = {
    background: light ? "rgba(255,255,255,.9)" : "rgba(0,0,0,.55)",
    color: light ? "#111" : "#fff",
    borderRadius: 12,
    padding: "8px 0",
    minWidth: 58,
    textAlign: "center",
    backdropFilter: "blur(8px)",
  };
  return (
    <div
      role="timer"
      aria-label={p.expired ? expiredText : `${label} : ${p.d}j ${p.h}h ${p.m}m`}
      style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}
    >
      {!p.expired && label && (
        <div
          style={{
            color: "#fff",
            fontWeight: 800,
            fontSize: 13,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            textShadow: "0 1px 8px rgba(0,0,0,.5)",
          }}
        >
          {label}
        </div>
      )}
      {p.expired ? (
        <div style={{ ...box, padding: "10px 22px", fontWeight: 800 }}>
          {expiredText}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          {[
            [p.d, "j"],
            [p.h, "h"],
            [p.m, "m"],
            [p.s, "s"],
          ].map(([v, u], i) => (
            <div key={i} style={box}>
              <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1 }}>
                {pad(v as number)}
              </div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{u}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
