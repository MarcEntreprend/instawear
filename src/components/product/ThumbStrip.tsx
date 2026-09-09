// src/components/product/ThumbStrip.tsx
// Bandeau de miniatures scrollable avec indicateurs :
// - flèche haut/bas (ou gauche/droite) quand le contenu dépasse
// - pastille "+N" = miniatures restantes hors champ (clic = fait défiler)
// Évite que la colonne dépasse le cadre quand il y a bcp d'images.

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ThumbStripProps {
  images: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  orientation: "vertical" | "horizontal";
  /** Classes de taille/arrondi des miniatures (ex: "w-16 h-16 rounded-xl"). */
  thumbClassName?: string;
  /** Espace entre miniatures en px (doit matcher le gap CSS). */
  gapPx?: number;
  /** Hauteur max de la colonne verticale avant scroll. */
  maxPx?: number;
  className?: string;
}

/** Nombre de miniatures restantes hors champ (pur, testé). */
export function computeDownCount(
  scrollSize: number,
  scrollPos: number,
  clientSize: number,
  thumbSize: number,
): number {
  if (thumbSize <= 0) return 0;
  if (scrollSize <= clientSize + 4) return 0;
  return Math.max(0, Math.ceil((scrollSize - scrollPos - clientSize) / thumbSize));
}

export default function ThumbStrip({
  images,
  activeIndex,
  onSelect,
  orientation,
  thumbClassName = "w-16 h-16 rounded-xl",
  gapPx = 10,
  maxPx = 420,
  className = "",
}: ThumbStripProps) {
  const vertical = orientation === "vertical";
  const trackRef = useRef<HTMLDivElement>(null);
  const [canUp, setCanUp] = useState(false);
  const [downCount, setDownCount] = useState(0);

  const refresh = () => {
    const el = trackRef.current;
    if (!el) return;
    const scrollPos = vertical ? el.scrollTop : el.scrollLeft;
    const client = vertical ? el.clientHeight : el.clientWidth;
    const size = vertical ? el.scrollHeight : el.scrollWidth;
    const first = el.querySelector("button");
    const thumb =
      (vertical
        ? first?.clientHeight ?? 0
        : first?.clientWidth ?? 0) + gapPx;
    setCanUp(scrollPos > 4);
    setDownCount(computeDownCount(size, scrollPos, client, thumb || 1));
  };

  useEffect(() => {
    refresh();
    window.addEventListener("resize", refresh);
    return () => window.removeEventListener("resize", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, orientation, maxPx]);

  const step = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.querySelector("button");
    const thumb =
      (vertical ? first?.clientHeight ?? 64 : first?.clientWidth ?? 64) +
      gapPx;
    el.scrollBy({
      top: vertical ? dir * thumb * 2 : 0,
      left: vertical ? 0 : dir * thumb * 2,
      behavior: "smooth",
    });
  };

  if (images.length <= 1) return null;

  const trackStyle: CSSProperties = vertical
    ? { maxHeight: maxPx }
    : {};

  const UpIcon = vertical ? ChevronUp : ChevronLeft;
  const DownIcon = vertical ? ChevronDown : ChevronRight;

  return (
    <div className={`relative shrink-0 ${className}`}>
      {canUp && (
        <button
          type="button"
          aria-label="Voir précédentes"
          onClick={() => step(-1)}
          className="absolute z-10 flex items-center justify-center w-6 h-6 rounded-full shadow"
          style={
            vertical
              ? {
                  top: 2,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink2)",
                }
              : {
                  left: 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-ink2)",
                }
          }
        >
          <UpIcon size={14} />
        </button>
      )}
      <div
        ref={trackRef}
        onScroll={refresh}
        className={
          vertical
            ? "flex flex-col overflow-y-auto no-scrollbar"
            : "flex overflow-x-auto no-scrollbar"
        }
        style={{ ...trackStyle, gap: gapPx, scrollbarWidth: "none" }}
      >
        {images.map((img, i) => (
          <button
            key={img + i}
            type="button"
            onClick={() => onSelect(i)}
            className={`${thumbClassName} overflow-hidden shrink-0 aspect-square`}
            style={{
              border:
                activeIndex === i
                  ? "2px solid var(--color-accent)"
                  : "1px solid var(--color-border)",
            }}
          >
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      {downCount > 0 && (
        <button
          type="button"
          onClick={() => step(1)}
          className="absolute z-10 flex items-center gap-0.5 rounded-full shadow pl-1.5 pr-2 py-0.5 text-[10px] font-black"
          style={
            vertical
              ? {
                  bottom: 2,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "var(--color-ink)",
                  color: "var(--color-bg)",
                }
              : {
                  right: 2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "var(--color-ink)",
                  color: "var(--color-bg)",
                }
          }
          aria-label={`Voir ${downCount} images suivantes`}
          title={`${downCount} more`}
        >
          +{downCount} <DownIcon size={12} />
        </button>
      )}
    </div>
  );
}
