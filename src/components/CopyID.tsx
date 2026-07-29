// src/components/CopyID.tsx
import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyIDProps {
  id: string;
  /** Taille du conteneur carré (22px par défaut) */
  containerSize?: number;
  /** Taille de l'icône à l'intérieur (16px par défaut) */
  iconSize?: number;
}

export default function CopyID({
  id,
  containerSize = 22,
  iconSize = 16,
}: CopyIDProps) {
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
      className="inline-flex items-center justify-center"
      title={`Copier ${id}`}
      role="button"
      tabIndex={0}
      style={{
        width: containerSize,
        height: containerSize,
        flexShrink: 0,
        cursor: "pointer",
        verticalAlign: "middle",
        marginLeft: 4,
      }}
    >
      <span
        className="flex items-center justify-center transition-opacity duration-200"
        style={{
          width: containerSize,
          height: containerSize,
          opacity: 1,
        }}
      >
        {copied ? (
          <Check
            size={iconSize}
            style={{
              color: "var(--color-success)",
              margin: "auto",
            }}
          />
        ) : (
          <Copy
            size={iconSize}
            className="m-auto"
            style={{
              color: "var(--color-ink4)",
              margin: "auto",
            }}
          />
        )}
      </span>
    </span>
  );
}
