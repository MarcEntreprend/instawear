// src/admin/HeroFlagButtons.tsx — œil / verrou / masquage par appareil (couches ET boutons).
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Monitor,
  MonitorSmartphone,
  Smartphone,
} from "lucide-react";

export interface HeroFlagsPatch {
  off?: boolean;
  lock?: boolean;
  hide?: "desktop" | "mobile";
}

const b: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 3,
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  cursor: "pointer",
};
const on: React.CSSProperties = {
  ...b,
  color: "var(--color-accent)",
  borderColor: "var(--color-accent)",
};

export default function HeroFlagButtons({
  off,
  lock,
  hide,
  onChange,
}: HeroFlagsPatch & { onChange: (p: HeroFlagsPatch) => void }) {
  // Cycle : partout → masquée sur mobile → masquée sur desktop → partout.
  const nextHide = (h?: "desktop" | "mobile") =>
    h === undefined ? "mobile" : h === "mobile" ? "desktop" : undefined;
  const HideIcon =
    hide === "mobile"
      ? Smartphone
      : hide === "desktop"
        ? Monitor
        : MonitorSmartphone;
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      <button
        type="button"
        style={off ? on : b}
        aria-label={off ? "Afficher" : "Masquer (œil fermé)"}
        title={
          off
            ? "Œil fermé : non affichée. Cliquer pour afficher."
            : "Masquer cet élément"
        }
        onClick={() => onChange({ off: off ? undefined : true })}
      >
        {off ? <EyeOff size={12} /> : <Eye size={12} />}
      </button>
      <button
        type="button"
        style={lock ? on : b}
        aria-label={lock ? "Déverrouiller" : "Verrouiller"}
        title={
          lock
            ? "Verrouillé (studio). Cliquer pour déverrouiller."
            : "Verrouiller dans le studio"
        }
        onClick={() => onChange({ lock: lock ? undefined : true })}
      >
        {lock ? <Lock size={12} /> : <Unlock size={12} />}
      </button>
      <button
        type="button"
        style={hide ? on : b}
        aria-label="Masquer sur un appareil"
        title={
          hide === "mobile"
            ? "Masquée sur mobile. Cliquer : masquer sur desktop."
            : hide === "desktop"
              ? "Masquée sur desktop. Cliquer : afficher partout."
              : "Affichée partout. Cliquer : masquer sur mobile."
        }
        onClick={() => onChange({ hide: nextHide(hide) })}
      >
        <HideIcon size={12} />
      </button>
    </span>
  );
}
