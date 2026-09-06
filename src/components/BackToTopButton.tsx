// src/components/BackToTopButton.tsx — V2 port
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="fixed right-4 sm:right-6 z-30 w-11 h-11 rounded-full flex items-center justify-center animate-scale-in bottom-24 lg:bottom-8"
      style={{ background: "var(--color-ink)", color: "var(--color-bg)", boxShadow: "var(--shadow-lg)" }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
