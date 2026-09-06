// src/components/DealCountdown.tsx — V2 port live 1s
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

function getRemaining(endsAt: string) {
  return Math.max(0, new Date(endsAt).getTime() - Date.now());
}

export default function DealCountdown({ endsAt, compact }: { endsAt: string; compact?: boolean }) {
  const [remaining, setRemaining] = useState(() => getRemaining(endsAt));
  useEffect(() => {
    const id = setInterval(() => setRemaining(getRemaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  if (remaining <= 0) return null;
  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const label = d > 0 ? `${d}j ${h}h` : h > 0 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${compact ? "text-[10px]" : "text-xs"}`} style={{ color: "var(--color-accent)" }}>
      <Clock size={compact ? 10 : 12} /> {label}
    </span>
  );
}
