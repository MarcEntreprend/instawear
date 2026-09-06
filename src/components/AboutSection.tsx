// src/components/AboutSection.tsx
import { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { TESTIMONIALS } from "../data/testimonials";

export default function AboutSection() {
  return (
    <>
      {/* À propos */}
      <section
        id="about"
        className="max-w-350 mx-auto px-4 sm:px-6 py-16 sm:py-24"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="bezel-outer order-2 lg:order-1">
            <div className="bezel-inner aspect-4/5">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80"
                alt="L'équipe InstaWear"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="eyebrow mb-4 block">Notre histoire</span>
            <h2
              className="text-3xl sm:text-4xl font-extrabold leading-tight mb-5"
              style={{ color: "var(--color-ink)" }}
            >
              Le vestiaire pensé{" "}
              <em className="font-display not-italic sm:italic pb-1 inline-block">
                pour vos événements
              </em>
            </h2>
            <p
              className="text-base leading-relaxed mb-4"
              style={{ color: "var(--color-ink2)" }}
            >
              InstaWear est né d'une idée simple : chaque moment fort mérite une
              tenue qui lui ressemble. Festival, marathon, concert ou
              anniversaire — nous imprimons à la demande des pièces uniques,
              sans stock dormant et sans compromis sur la qualité.
            </p>
            <p
              className="text-base leading-relaxed mb-8"
              style={{ color: "var(--color-ink2)" }}
            >
              Chaque commande est fabriquée spécialement pour vous, au plus près
              de votre événement, avec des matières responsables et une
              sérigraphie pensée pour durer.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Stat value="12k+" label="Pièces imprimées" />
              <Stat value="4.7/5" label="Note moyenne" />
              <Stat value="48h" label="Délai d'expédition" />
            </div>
          </div>
        </div>
      </section>

      {/* Avis clients */}
      <TestimonialsCarousel />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p
        className="text-2xl font-extrabold"
        style={{ color: "var(--color-accent)" }}
      >
        {value}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--color-ink3)" }}>
        {label}
      </p>
    </div>
  );
}

function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const testimonial = TESTIMONIALS[index];

  const go = (dir: 1 | -1) =>
    setIndex((i) => (i + dir + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <section id="testimonials" style={{ background: "var(--color-surface2)" }}>
      <div className="max-w-350 mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="eyebrow mb-2 block">Ils en parlent</span>
            <h2
              className="text-2xl sm:text-3xl font-extrabold"
              style={{ color: "var(--color-ink)" }}
            >
              Avis clients
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => go(-1)}
              aria-label="Avis précédent"
              className="btn-icon"
            >
              <ChevronLeft size={17} />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Avis suivant"
              className="btn-icon"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>

        <div
          key={testimonial.id}
          className="card-premium p-8 sm:p-10 max-w-2xl animate-fade-up"
        >
          <Quote size={28} style={{ color: "var(--color-accent)" }} />
          <p
            className="text-lg sm:text-xl font-medium leading-relaxed my-6"
            style={{ color: "var(--color-ink)" }}
          >
            « {testimonial.text} »
          </p>
          <div className="flex items-center gap-3">
            <img
              src={testimonial.avatar}
              alt=""
              className="w-11 h-11 rounded-full object-cover"
            />
            <div>
              <p
                className="text-sm font-bold"
                style={{ color: "var(--color-ink)" }}
              >
                {testimonial.name}
              </p>
              <p className="text-xs" style={{ color: "var(--color-ink3)" }}>
                {testimonial.location} · {testimonial.product}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={13}
                  fill={i < testimonial.rating ? "var(--color-gold)" : "none"}
                  style={{ color: "var(--color-gold)" }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex sm:hidden items-center gap-2 mt-6">
          <button
            onClick={() => go(-1)}
            aria-label="Avis précédent"
            className="btn-icon"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Avis suivant"
            className="btn-icon"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
}
