// src/components/product/ZoomImage.tsx — V2 port
import { useRef, useState, type MouseEvent } from "react";
import { Expand } from "lucide-react";
import { imageKitUrl, imageKitSrcSet } from "../../lib/imagekit";
import { PLACEHOLDER_IMG } from "../../constants/assets";

const LENS_SIZE = 160;
const ZOOM_FACTOR = 2.4;

export default function ZoomImage({
  src,
  alt,
  onRequestLightbox,
}: {
  src: string;
  alt: string;
  onRequestLightbox: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [bgPos, setBgPos] = useState({ x: 50, y: 50 });
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const relX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const relY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setLensPos({
      x: Math.min(
        rect.width - LENS_SIZE,
        Math.max(0, relX * rect.width - LENS_SIZE / 2),
      ),
      y: Math.min(
        rect.height - LENS_SIZE,
        Math.max(0, relY * rect.height - LENS_SIZE / 2),
      ),
    });
    setBgPos({ x: relX * 100, y: relY * 100 });
  };
  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="bezel-outer select-none"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onMouseMove={handleMouseMove}
        onClick={onRequestLightbox}
      >
        <div className="bezel-inner aspect-square relative cursor-zoom-in">
          <img
            src={
              imageKitUrl(src, {
                width: 1024,
                quality: 80,
                format: "webp",
              }) || src
            }
            srcSet={
              imageKitUrl(src, { width: 1024 }) !== src
                ? imageKitSrcSet(
                    src,
                    { quality: 80, format: "webp" },
                    [768, 1024, 1600],
                  )
                : undefined
            }
            sizes="(max-width: 640px) 100vw, 600px"
            alt={alt}
            className="w-full h-full object-cover"
            draggable={false}
            fetchPriority="high"
            decoding="async"
            onError={(e) => {
              // Visuel KO (401/404, produit retiré…) → placeholder local.
              // Garde anti-boucle : un seul basculement (jamais de produit en dur).
              const el = e.currentTarget;
              if (el.dataset.fbk) return;
              el.dataset.fbk = "1";
              el.src = PLACEHOLDER_IMG;
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestLightbox();
            }}
            aria-label="Expand"
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center lg:hidden"
            style={{ background: "rgba(15,13,10,.55)", color: "#fff" }}
          >
            <Expand size={15} />
          </button>
          {isHovering && (
            <span
              className="hidden lg:block absolute pointer-events-none rounded-lg"
              style={{
                width: LENS_SIZE,
                height: LENS_SIZE,
                left: lensPos.x,
                top: lensPos.y,
                background: "rgba(255,255,255,.25)",
                border: "2px solid var(--color-accent)",
                boxShadow: "0 0 0 9999px rgba(15,13,10,.15)",
              }}
            />
          )}
        </div>
      </div>
      {isHovering && (
        <div
          className="hidden lg:block absolute top-0 left-full ml-5 rounded-2xl overflow-hidden z-30"
          style={{
            width: 420,
            height: 420,
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-xl)",
            background: `url(${src})`,
            backgroundSize: `${ZOOM_FACTOR * 100}%`,
            backgroundPosition: `${bgPos.x}% ${bgPos.y}%`,
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
    </div>
  );
}
