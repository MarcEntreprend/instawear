// src/components/CopyID.tsx
import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyIDProps {
  id: string;
  size?: number;
}

export default function CopyID({ id, size = 14 }: CopyIDProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span
      onClick={handleCopy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
        cursor: "pointer",
        marginLeft: 6,
        color: copied ? "var(--color-success)" : "var(--color-ink4)",
        flexShrink: 0,
        lineHeight: 1,
      }}
      title={`Copier ${id}`}
      role="button"
      tabIndex={0}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </span>
  );
}
