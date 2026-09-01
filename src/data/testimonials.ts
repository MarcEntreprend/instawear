// src/data/testimonials.ts
import type { Testimonial } from "../types";

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Léa Fontaine",
    avatar: "https://i.pravatar.cc/150?img=32",
    location: "Lyon",
    rating: 5,
    text: "Le hoodie Bassline a survécu à tout le festival, l'impression n'a pas bougé d'un pixel.",
    product: "Hoodie Bassline",
    date: "2026-06-14",
  },
  {
    id: "t2",
    name: "Yanis Belkacem",
    avatar: "https://i.pravatar.cc/150?img=12",
    location: "Marseille",
    rating: 5,
    text: "Livré en 3 jours avant mon marathon, le tee Finish Line est incroyablement léger.",
    product: "Tee Finish Line",
    date: "2026-05-02",
  },
  {
    id: "t3",
    name: "Camille Roux",
    avatar: "https://i.pravatar.cc/150?img=47",
    location: "Nantes",
    rating: 4,
    text: "Super qualité de sérigraphie, j'aurais juste aimé un peu plus de choix de tailles.",
    product: "Tee Front Row",
    date: "2026-04-21",
  },
  {
    id: "t4",
    name: "Thomas Girard",
    avatar: "https://i.pravatar.cc/150?img=8",
    location: "Toulouse",
    rating: 5,
    text: "Le mug Backstage fait sensation à chaque petit-déj, cadeau parfait pour un fan de concerts.",
    product: "Mug Backstage",
    date: "2026-03-30",
  },
];
