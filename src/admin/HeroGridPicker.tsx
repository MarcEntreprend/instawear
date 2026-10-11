// src/admin/HeroGridPicker.tsx — sélecteur visuel de disposition (vignettes générées par tilesLayout).
import {
  TILES_VARIANTS,
  tilesLayout,
  type HeroTilesVariant,
} from "../lib/heroGrid";

export default function HeroGridPicker({
  value,
  onChange,
}: {
  value: HeroTilesVariant;
  onChange: (v: HeroTilesVariant) => void;
}) {
  const current = TILES_VARIANTS.find((t) => t.value === value);
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {TILES_VARIANTS.map((v) => {
          const L = tilesLayout(v.value, 3, true);
          const on = v.value === value;
          return (
            <button
              key={v.value}
              type="button"
              title={v.desc}
              aria-pressed={on}
              onClick={() => onChange(v.value)}
              style={{
                padding: 6,
                borderRadius: 10,
                cursor: "pointer",
                border: on
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-border)",
                background: on
                  ? "var(--color-accent-bg)"
                  : "var(--color-surface2)",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: L.cols,
                  gridTemplateRows: L.rows,
                  gap: 2,
                  aspectRatio: "16 / 10",
                }}
              >
                {[L.main, ...L.items].map((c, i) => (
                  <span
                    key={i}
                    style={{
                      gridColumn: c.col,
                      gridRow: c.row,
                      borderRadius: 2,
                      background:
                        i === 0
                          ? "var(--color-accent)"
                          : "var(--color-border2)",
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--color-ink2)",
                  lineHeight: 1.2,
                }}
              >
                {v.label}
              </span>
            </button>
          );
        })}
      </div>
      {current && (
        <p
          style={{
            fontSize: 11,
            color: "var(--color-ink4)",
            margin: "6px 0 0",
          }}
        >
          {current.desc} Sur mobile : visuel principal puis rangée de tuiles,
          pour toutes les dispositions.
        </p>
      )}
    </>
  );
}
