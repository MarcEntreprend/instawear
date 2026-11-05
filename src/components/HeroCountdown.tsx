// src/components/HeroCountdown.tsx — compte à rebours hero (P5).
// Hydratation cliente uniquement. Compteur qui défile en temps réel.
// Zéro dépendance.
import { useEffect, useState, type CSSProperties } from "react";

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
  const urgent = p.d === 0 && p.h <= 1;
  if (p.expired) return null;
  return (
    <div
      role="timer"
      aria-label={`${label} : ${p.d}j ${p.h}h ${p.m}m ${p.s}s`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 8,
        background: urgent ? "rgba(255,92,53,.12)" : "rgba(0,0,0,.05)",
        border: `1px solid ${urgent ? "#ff5c35" : "var(--color-border)"}`,
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
        color: urgent ? "#ff5c35" : "var(--color-ink)",
      }}
    >
      <span
        style={{
          color: urgent ? "#ff5c35" : "var(--color-accent)",
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: urgent ? "#ff5c35" : "var(--color-ink)",
          fontWeight: 800,
        }}
      >
        {pad(p.d)}
      </span>
      <span style={{ color: "#666", fontSize: 10 }}>j</span>
      <span
        style={{
          color: urgent ? "#ff5c35" : "var(--color-ink)",
          fontWeight: 800,
        }}
      >
        {pad(p.h)}
      </span>
      <span style={{ color: "#666", fontSize: 10 }}>h</span>
      <span
        style={{
          color: urgent ? "#ff5c35" : "var(--color-ink)",
          fontWeight: 800,
        }}
      >
        {pad(p.m)}
      </span>
      <span style={{ color: "#666", fontSize: 10 }}>m</span>
      <span
        style={{
          color: urgent ? "#ff5c35" : "var(--color-ink)",
          fontWeight: 800,
        }}
      >
        {pad(p.s)}
      </span>
      <span style={{ color: "#666", fontSize: 10 }}>s</span>
    </div>
  );
}
