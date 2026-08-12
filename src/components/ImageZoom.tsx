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

  const [isHovered, setIsHovered] = useState(false);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !lensRef.current || !zoomPanelRef.current)
      return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Mise à jour de la loupe
    lensRef.current.style.left = `${x}%`;
    lensRef.current.style.top = `${y}%`;

    // Mise à jour du contenu zoomé (le panneau reste fixe)
    zoomPanelRef.current.style.backgroundPosition = `${x}% ${y}%`;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMove}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image et enfants */}
      <div className="w-full h-full rounded-2xl overflow-hidden border border-gray-200 bg-gray-50">
        <img src={src} alt={alt} className="w-full h-full object-contain" />

        {/* Loupe */}
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

      {/* Badges enfants */}
      {children}

      {/* Panneau zoom – fixe à droite de l’image */}
      <div
        ref={zoomPanelRef}
        className="absolute top-0 left-[calc(100%+16px)] w-72 h-72 border border-(--color-border) rounded-xl shadow-xl bg-no-repeat bg-white z-20 hidden sm:block"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: `${zoomFactor * 100}%`,
          display: isHovered ? "block" : "none",
        }}
      />
    </div>
  );
}
