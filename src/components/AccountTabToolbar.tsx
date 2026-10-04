// src/components/AccountTabToolbar.tsx — bloc "Search + select + Newest"
// partagé des onglets compte (orders/notifications/support/reviews).
// Même visuel et même logique partout : recherche + filtre optionnel +
// tri date. Chaque onglet adapte options etfiltrage, le composant ne fait
// que l'UI. Enveloppe sticky timide incluse (visible = prop).
import { Search, Clock, X } from "lucide-react";

export interface TabFilterOption {
  value: string;
  label: string;
}

interface AccountTabToolbarProps {
  /** Visibilité (hook useTimidBar de l'onglet). */
  visible: boolean;
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  /** Select (absent = pas de filtre sur l'onglet, ex. avis). */
  filterValue?: string;
  onFilterChange?: (v: string) => void;
  filterOptions?: TabFilterOption[];
  filterLabel?: string;
  sortOrder: "newest" | "oldest";
  onToggleSort: () => void;
  /** Reset (visible si recherche ou filtre non défaut). */
  showReset: boolean;
  onReset: () => void;
}

export default function AccountTabToolbar({
  visible,
  search,
  onSearch,
  searchPlaceholder,
  filterValue = "all",
  onFilterChange,
  filterOptions,
  filterLabel = "Filter",
  sortOrder,
  onToggleSort,
  showReset,
  onReset,
}: AccountTabToolbarProps) {
  return (
    <div
      className="sticky top-0 z-10 -mx-1 px-1"
      style={{
        background: "var(--color-bg)",
        maxHeight: visible ? 160 : 0,
        opacity: visible ? 1 : 0,
        overflow: "hidden",
        transition: "max-height .3s ease, opacity .25s ease",
      }}
    >
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <div
          className="flex items-center gap-2 flex-1 min-w-0 rounded-xl border px-3 py-2"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <Search
            size={14}
            strokeWidth={1.75}
            style={{ color: "var(--color-ink4)", flexShrink: 0 }}
          />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px]"
            style={{
              color: "var(--color-ink)",
              fontFamily: "var(--font-sans)",
            }}
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              aria-label="Clear search"
              className="shrink-0"
              style={{ color: "var(--color-ink4)" }}
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>
        {filterOptions && onFilterChange && (
          <select
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            aria-label={filterLabel}
            className="rounded-xl border px-3 py-2 text-[12.5px] font-medium outline-none cursor-pointer"
            style={{
              background: "var(--color-surface)",
              borderColor: "var(--color-border)",
              color: "var(--color-ink2)",
            }}
          >
            {filterOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={onToggleSort}
          className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12.5px] font-medium transition-colors"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-ink2)",
          }}
        >
          <Clock size={13} strokeWidth={1.75} />
          {sortOrder === "newest" ? "Newest" : "Oldest"}
        </button>
        {showReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors"
            style={{
              background: "var(--color-surface2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-accent)",
            }}
          >
            <X size={12} strokeWidth={2} /> Reset
          </button>
        )}
      </div>
    </div>
  );
}
