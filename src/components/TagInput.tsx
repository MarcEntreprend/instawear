// src/components/TagInput.tsx

import React, { useState } from "react";
import { X, Plus } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export default function TagInput({
  value,
  onChange,
  placeholder = "Appuyez sur Entrée pour ajouter",
}: TagInputProps) {
  const [input, setInput] = useState("");

  const addItem = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  const removeItem = (item: string) =>
    onChange(value.filter((v) => v !== item));

  return (
    <div>
      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}
      >
        {value.map((item) => (
          <span
            key={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              borderRadius: 999,
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              fontSize: 12,
              color: "var(--color-ink2)",
            }}
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(item)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-ink4)",
                padding: 0,
                display: "flex",
              }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            fontSize: 13,
            color: "var(--color-ink)",
            fontFamily: "var(--font-body)",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={addItem}
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid var(--color-accent)",
            background: "transparent",
            color: "var(--color-accent)",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Plus size={14} />
          Ajouter
        </button>
      </div>
    </div>
  );
}
