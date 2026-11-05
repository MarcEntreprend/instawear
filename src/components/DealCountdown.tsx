// src/components/DealCountdown.tsx — compte à rebours hero (PORT-15B P5).
// Hydratation cliente uniquement. Compteur qui défile en temps réel.
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function getRemaining(endsAt: string) {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

export default function DealCountdown({
  endsAt,
  compact,
}: {
  endsAt: string;
  compact?: boolean;
}) {
  const [remaining, setRemaining] = useState(() => getRemaining(endsAt));
  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (remaining <= 0) return null;

  const totalSec = Math.floor(remaining / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const urgent = d === 0 && h <= 1;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold ${compact ? "text-[10px]" : "text-xs"}`}
      style={{
        color: urgent ? "#ff5c35" : "var(--color-accent-ink)",
        background: urgent ? "rgba(255,92,53,.12)" : "transparent",
        padding: "2px 6px",
        borderRadius: 6,
        border: urgent ? `1px solid #ff5c35` : "none",
      }}
    >
      <Clock size={compact ? 10 : 12} style={{ color: urgent ? "#ff5c35" : "var(--color-accent)" }} />
      {d > 0 ? (
        <>
          <span style={{ color: urgent ? "#ff5c35" : "var(--color-accent)", fontWeight: 800 }}>
            {pad(d)}
          </span>
          <span style={{ color: "#666", fontSize: 10 }}>j</span>
          <span style={{ color: urgent ? "#ff5c35" : "var(--color-accent)", fontWeight: 800 }}>
            {pad(h)}
          </span>
          <span style={{ color: "#666", fontSize: 10 }}>h</span>
          <span style={{ color: urgent ? "#ff5c35" : "var(--color-accent)", fontWeight: 800 }}>
            {pad(m)}
          </span>
          <span style={{ color: "#666", fontSize: 10 }}>m</span>
          <span style={{ color: urgent ? "#ff5c35" : "var(--color-accent)", fontWeight: 800 }}>
            {pad(s)}
          </span>
          <span style={{ color: "#666", fontSize: 10 }}>s</span>
        </>
      ) : (
        <>
          <span style={{ color: urgent ? "#ff5c35" : "var(--color-accent)", fontWeight: 800 }}>
            {pad(h)}
          </span>
          <span style={{ color: "#666", fontSize: 10 }}>h</span>
          <span style={{ color: urgent ? "#ff5c35" : "var(--color-accent)", fontWeight: 800 }}>
            {pad(m)}
          </span>
          <span style={{ color: "#666", fontSize: 10 }}>m</span>
          <span style={{ color: urgent ? "#ff5c35" : "var(--color-accent)", fontWeight: 800 }}>
            {pad(s)}
          </span>
          <span style={{ color: "#666", fontSize: 10 }}>s</span>
        </>
      )}
    </span>
  );
}
