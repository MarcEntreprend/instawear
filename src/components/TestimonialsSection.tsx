// src/components/TestimonialsSection.tsx — V2 visuals, static
import { Star } from "lucide-react";

const TESTIMONIALS = [
  { name: "Léa M.", text: "Incredible quality, super fast delivery!", rating: 5 },
  { name: "Thomas R.", text: "Design is true to photo, I recommend it.", rating: 5 },
  { name: "Inès K.", text: "Top customer service, easy exchange.", rating: 4 },
];

export default function TestimonialsSection() {
  return (
    <section id="section-testimonials" className="section-container w-full px-4 py-14 sm:py-20 scroll-mt-28">
      <div className="text-center mb-10">
        <span className="eyebrow justify-center">Customer reviews</span>
        <h2 className="text-2xl sm:text-3xl font-extrabold mt-2" style={{ color: "var(--color-ink)" }}>They trust us</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="card-premium p-6 text-center">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className={i < t.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"} />
              ))}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink2)" }}>"{t.text}"</p>
            <p className="text-xs font-bold mt-3" style={{ color: "var(--color-ink)" }}>{t.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
