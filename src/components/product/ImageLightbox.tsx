// src/components/product/ImageLightbox.tsx — V2 port
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
export default function ImageLightbox({ images, initialIndex = 0, alt, onClose }: { images: string[]; initialIndex?: number; alt: string; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(initialIndex);
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const el = scrollRef.current;
    if (el) el.scrollLeft = initialIndex * el.clientWidth;
    return () => { document.body.style.overflow = ""; };
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
  return (
    <div className="fixed inset-0 z-70 flex flex-col" style={{ background: "rgba(10,9,7,.97)" }}>
      <div className="flex items-center justify-between px-5 h-14 shrink-0">
        <span className="text-xs font-semibold text-white/70 font-mono-num">{index + 1} / {images.length}</span>
        <button onClick={onClose} aria-label="Fermer" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.1)" }}><X size={18} color="#fff" /></button>
      </div>
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar">
        {images.map((img, i) => (
          <div key={img + i} className="w-full h-full shrink-0 snap-center flex items-center justify-center p-4">
            <img src={img} alt={`${alt} ${i + 1}`} className="max-w-full max-h-full object-contain" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="flex items-center gap-2.5 justify-center px-5 py-4 overflow-x-auto no-scrollbar shrink-0">
          {images.map((img, i) => (
            <button key={img + i} onClick={() => goTo(i)} className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ border: i === index ? "2px solid var(--color-accent)" : "1px solid rgba(255,255,255,.2)" }}>
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
