// src/components/ImageZoom.tsx

import { useRef, useState } from "react";

interface ImageZoomProps {
  src: string;
  alt: string;
  lensSize?: number;
  zoomFactor?: number;
  children?: React.ReactNode;
}

export default function ImageZoom({
  src,
  alt,
  lensSize = 120,
  zoomFactor = 3,
  children,
}: ImageZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const zoomPanelRef = useRef<HTMLDivElement>(null);

  // State pour contrôler l'apparition/disparition au survol
  const [isHovered, setIsHovered] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !lensRef.current || !zoomPanelRef.current)
      return;

    const rect = containerRef.current.getBoundingClientRect();
    // Calcul en pourcentage (0 à 100%)
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // MISE À JOUR SYNCHRONE DU DOM (Contourne React pour une instantanéité parfaite)
    lensRef.current.style.left = `${x}%`;
    lensRef.current.style.top = `${y}%`;
    zoomPanelRef.current.style.backgroundPosition = `${x}% ${y}%`;
  };

  return (
    <div className="relative w-full aspect-square" ref={containerRef}>
      {/* Badges (enfants) */}
      {children}

      {/* Image (overflow hidden pour ne pas dépasser) */}
      <div
        className="w-full h-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-50"
        onMouseEnter={() => setIsHovered(true)}
        onMouseMove={handleMove}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img src={src} alt={alt} className="w-full h-full object-contain" />

        {/* Lentille (Suivi synchrone via ref) */}
        <div
          ref={lensRef}
          className="absolute border-2 border-(--color-accent) bg-white/20 pointer-events-none"
          style={{
            width: lensSize,
            height: lensSize,
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            display: isHovered ? "block" : "none",
          }}
        />
      </div>

      {/* Panneau zoom externe (Suivi synchrone via ref) */}
      <div
        ref={zoomPanelRef}
        className="absolute top-0 left-[calc(100%+16px)] w-75 h-75 border border-(--color-border) rounded-xl shadow-xl bg-no-repeat bg-white z-20 hidden sm:block"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: `${zoomFactor * 100}%`,
          display: isHovered ? "block" : "none",
        }}
      />
    </div>
  );
}
