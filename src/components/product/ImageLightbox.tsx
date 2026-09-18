// src/components/product/ImageLightbox.tsx — V2 port
import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { imageKitUrl } from "../../lib/imagekit";
import { PLACEHOLDER_IMG } from "../../constants/assets";
export default function ImageLightbox({
  images,
  initialIndex = 0,
  alt,
  onClose,
}: {
  images: string[];
  initialIndex?: number;
  alt: string;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const el = scrollRef.current;
    if (el) el.scrollLeft = initialIndex * el.clientWidth;
    return () => {
      document.body.style.overflow = "";
    };
  }, [initialIndex]);
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };
  const goTo = (i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };
  // Flèches prev/next : bornées (pas de boucle) ; aux extrémités le
  // bouton est désactivé + estompé (dim), jamais masqué (pas de saut layout).
  const goStep = (dir: 1 | -1) => {
    if (images.length <= 1) return;
    const next = Math.min(images.length - 1, Math.max(0, index + dir));
    if (next !== index) goTo(next);
  };
  const atStart = index <= 0;
  const atEnd = index >= images.length - 1;
  // Clavier : ArrowLeft/ArrowRight naviguent, Escape ferme (bouton X).
  // Sans tableau de deps : ré-abonnement à chaque render → closures
  // toujours fraîches (index, onClose), jamais périmées.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      goStep(e.key === "ArrowLeft" ? -1 : 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <div
      className="fixed inset-0 z-70 flex flex-col"
      style={{ background: "rgba(10,9,7,.97)" }}
    >
      <div className="flex items-center justify-between px-5 h-14 shrink-0">
        <span className="text-xs font-semibold text-white/70 font-mono-num">
          {index + 1} / {images.length}
        </span>
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,.1)" }}
        >
          <X size={18} color="#fff" />
        </button>
      </div>
      <div className="flex-1 relative min-h-0">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {images.map((img, i) => (
            <div
              key={img + i}
              className="w-full h-full shrink-0 snap-center flex items-center justify-center p-4"
            >
              <img
                src={img}
                alt={`${alt} ${i + 1}`}
                className="max-w-full max-h-full object-contain"
                decoding="async"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.dataset.fbk) return;
                  el.dataset.fbk = "1";
                  el.src = PLACEHOLDER_IMG;
                }}
              />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button
              onClick={() => goStep(-1)}
              disabled={atStart}
              aria-label="Image précédente"
              className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center disabled:cursor-default"
              style={{
                background: "rgba(255,255,255,.1)",
                opacity: atStart ? 0.3 : 1,
              }}
            >
              <ChevronLeft size={18} color="#fff" />
            </button>
            <button
              onClick={() => goStep(1)}
              disabled={atEnd}
              aria-label="Image suivante"
              className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full flex items-center justify-center disabled:cursor-default"
              style={{
                background: "rgba(255,255,255,.1)",
                opacity: atEnd ? 0.3 : 1,
              }}
            >
              <ChevronRight size={18} color="#fff" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="px-5 py-4 overflow-x-auto no-scrollbar shrink-0">
          {/* w-max + mx-auto : centré quand ça tient, scroll normal sinon
              (justify-center casserait l'accès au début en overflow). */}
          <div className="flex items-center gap-2.5 w-max mx-auto px-1">
          {images.map((img, i) => (
            <button
              key={img + i}
              onClick={() => goTo(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-pressed={i === index}
              className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
              style={{
                border:
                  i === index
                    ? "2px solid var(--color-accent)"
                    : "1px solid rgba(255,255,255,.2)",
              }}
            >
              <img
                src={
                  imageKitUrl(img, {
                    width: 96,
                    quality: 80,
                    format: "webp",
                  }) || img
                }
                alt=""
                sizes="48px"
                className="w-full h-full object-cover"
                decoding="async"
                onError={(e) => {
                  const el = e.currentTarget;
                  if (el.dataset.fbk) return;
                  el.dataset.fbk = "1";
                  el.src = PLACEHOLDER_IMG;
                }}
              />
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}
