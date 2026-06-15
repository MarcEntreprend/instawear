import React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { FilterState } from "../types";
import { MATERIALS } from "../data/defaultProducts";

interface FilterPanelProps {
  filters: FilterState;
  onChange: (f: Partial<FilterState>) => void;
  onReset: () => void;
  productCount: number;
}

const CATEGORIES = [
  { id: "tshirt", label: "T-Shirts" },
  { id: "hoodie", label: "Hoodies" },
  { id: "accessory", label: "Accessoires" },
  { id: "mug", label: "Mugs" },
];

const EVENT_TYPES = [
  {
    id: "live",
    label: (
      <>
        Live 2026{" "}
        <span className="inline-block w-2 h-2 bg-rose-500 rounded-full ml-1 animate-ping" />
      </>
    ),
  },
  { id: "sport", label: "🏆 Sport" },
  { id: "culture", label: "🎉 Festival & Culture" },
  { id: "saisonnier", label: "🍂 Saisons & Fêtes" },
];

export default function FilterPanel({
  filters,
  onChange,
  onReset,
  productCount,
}: FilterPanelProps) {
  const activeCount = [
    filters.category,
    filters.eventType,
    filters.material,
    filters.inStockOnly,
    filters.priceMax < 100,
    filters.priceMin > 0,
  ].filter(Boolean).length;

  return (
    <aside
      className="rounded-2xl p-5 flex flex-col gap-5"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal
            size={16}
            strokeWidth={2}
            style={{ color: "var(--color-ink2)" }}
          />
          <span
            className="font-bold text-sm"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
            }}
          >
            Filtres
          </span>
          {activeCount > 0 && (
            <span
              className="badge text-gray-900"
              style={{ background: "var(--color-accent)", fontSize: "9px" }}
            >
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs font-semibold transition-colors"
            style={{ color: "var(--color-accent)" }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-xs" style={{ color: "var(--color-ink4)" }}>
        <span className="font-bold" style={{ color: "var(--color-ink)" }}>
          {productCount}
        </span>{" "}
        résultat{productCount !== 1 ? "s" : ""}
      </p>

      {/* Category */}
      <section>
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2.5"
          style={{ color: "var(--color-ink3)" }}
        >
          Catégorie
        </p>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                onChange({
                  category: filters.category === cat.id ? null : cat.id,
                })
              }
              className="text-left text-sm px-3 py-2 rounded-lg font-medium transition-all duration-150"
              style={{
                background:
                  filters.category === cat.id
                    ? "var(--color-accent-bg)"
                    : "transparent",
                color:
                  filters.category === cat.id
                    ? "var(--color-accent)"
                    : "var(--color-ink2)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Event type */}
      <section>
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2.5"
          style={{ color: "var(--color-ink3)" }}
        >
          Type d'événement
        </p>
        <div className="flex flex-col gap-1">
          {EVENT_TYPES.map((ev) => (
            <button
              key={ev.id}
              onClick={() =>
                onChange({
                  eventType: filters.eventType === ev.id ? null : ev.id,
                })
              }
              className="text-left text-sm px-3 py-2 rounded-lg font-medium transition-all duration-150"
              style={{
                background:
                  filters.eventType === ev.id
                    ? "var(--color-accent-bg)"
                    : "transparent",
                color:
                  filters.eventType === ev.id
                    ? "var(--color-accent)"
                    : "var(--color-ink2)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {ev.label}
            </button>
          ))}
        </div>
      </section>

      {/* Material */}
      <section>
        <p
          className="text-xs font-bold uppercase tracking-widest mb-2.5"
          style={{ color: "var(--color-ink3)" }}
        >
          Matériau
        </p>
        <div className="flex flex-col gap-1">
          {MATERIALS.map((mat) => (
            <button
              key={mat.id}
              onClick={() =>
                onChange({
                  material: filters.material === mat.id ? null : mat.id,
                })
              }
              className="text-left text-sm px-3 py-2 rounded-lg font-medium transition-all duration-150"
              style={{
                background:
                  filters.material === mat.id
                    ? "var(--color-accent-bg)"
                    : "transparent",
                color:
                  filters.material === mat.id
                    ? "var(--color-accent)"
                    : "var(--color-ink2)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {mat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Price range */}
      <section>
        <div className="flex items-center justify-between mb-2.5">
          <p
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--color-ink3)" }}
          >
            Prix
          </p>
          <span
            className="text-xs font-semibold"
            style={{
              color: "var(--color-ink2)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {filters.priceMin.toFixed(0)} $ — {filters.priceMax.toFixed(0)} $
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={filters.priceMin}
            onChange={(e) =>
              onChange({
                priceMin: Math.min(
                  Number(e.target.value),
                  filters.priceMax - 5,
                ),
              })
            }
          />
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={filters.priceMax}
            onChange={(e) =>
              onChange({
                priceMax: Math.max(
                  Number(e.target.value),
                  filters.priceMin + 5,
                ),
              })
            }
          />
        </div>
      </section>

      {/* In stock toggle */}
      <section>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className="relative w-10 h-5.5 rounded-full transition-colors duration-200 flex items-center"
            style={{
              background: filters.inStockOnly
                ? "var(--color-accent)"
                : "var(--color-border2)",
              padding: "2px",
              height: "22px",
            }}
            onClick={() => onChange({ inStockOnly: !filters.inStockOnly })}
          >
            <div
              className="w-4 h-4 rounded-full bg-white transition-transform duration-200"
              style={{
                transform: filters.inStockOnly
                  ? "translateX(18px)"
                  : "translateX(0)",
                boxShadow: "var(--shadow-sm)",
              }}
            />
          </div>
          <span
            className="text-sm font-medium"
            style={{
              color: "var(--color-ink2)",
              fontFamily: "var(--font-sans)",
            }}
          >
            En stock uniquement
          </span>
        </label>
      </section>
    </aside>
  );
}
