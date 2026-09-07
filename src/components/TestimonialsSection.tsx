// src/components/TestimonialsSection.tsx — V2 visuals + auto-spin
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { TESTIMONIALS } from "../data/testimonials";

export default function TestimonialsSection() {
  const [index, setIndex] = useState(0);

  // Auto-spin toutes les 4 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Prendre 3 témoignages à partir de l'index courant (pour avoir 3 colonnes)
  const visible = [
    TESTIMONIALS[index % TESTIMONIALS.length],
    TESTIMONIALS[(index + 1) % TESTIMONIALS.length],
    TESTIMONIALS[(index + 2) % TESTIMONIALS.length],
  ];

  return (
    <section
      id="section-testimonials"
      className="section-container w-full px-4 py-14 sm:py-20 scroll-mt-28"
    >
      <div className="text-center mb-10">
        <span className="eyebrow justify-center">What people say</span>
        <h2
          className="text-2xl sm:text-3xl font-extrabold mt-2"
          style={{ color: "var(--color-ink)" }}
        >
          Real reviews from real customers
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {visible.map((t) => (
          <div
            key={t.id}
            className="card-premium p-5 text-left animate-fade-up"
          >
            <div className="flex gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={
                    i < t.rating
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-300"
                  }
                />
              ))}
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--color-ink2)" }}
            >
              "{t.text}"
            </p>
            <p
              className="text-xs font-bold mt-3"
              style={{ color: "var(--color-ink)" }}
            >
              — {t.name}, {t.location}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
