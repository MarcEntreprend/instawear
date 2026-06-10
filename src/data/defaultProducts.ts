/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from "../types";

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "prod-rio-carnival-tshirt",
    title: "T-Shirt Rio Carnival Neon Edition 2026",
    brand: "INSTAWEAR",
    description:
      "T-shirt premium en coton bio célébrant l'emblématique Carnaval de Rio avec un graphisme néon vibrant.",
    fullDescription:
      "• Coton 100% biologique peigné (180 g/m²)\n• Impression numérique HD haute durabilité (certifiée éco-responsable)\n• Coupe unisexe moderne avec coutures latérales doublées\n• Design exclusif représentant l'énergie pure de la samba en éclairs néons",
    price: 29.99,
    originalPrice: 45.0,
    image:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop",
    ],
    colors: ["#00FFFF", "#FF00FF", "#1E1E1E", "#FFFFFF"],
    colorNames: [
      "Cyan Électrique",
      "Rose Samba",
      "Noir Anthracite",
      "Blanc Pur",
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    ratings: { score: 4.8, count: 124 },
    boughtLastMonth: 850,
    isBestSeller: true,
    isLimitedTime: true,
    material: "coton-bio",
    inStock: true,
    tags: ["Carnaval", "Rio", "Neon", "Samba", "Festival"],
    eventType: "culture",
    category: "tshirt",
    style: "street",
  },
  {
    id: "prod-ucl-champions-hoodie",
    title: "Hoodie Retro UCL Champions Finals 2026",
    brand: "INSTAWEAR",
    description:
      "Sweat à capuche premium ultra-confort commémorant la légendaire finale de la Ligue des Champions.",
    fullDescription:
      "• 85% coton bio peigné, 15% polyester recyclé (350 g/m²)\n• Intérieur gratté ultra doux pour une rétention de chaleur optimale\n• Capuche doublée avec cordon de serrage assorti et embouts métalliques\n• Poche kangourou spacieuse avec coutures renforcées\n• Graphisme vintage sérigraphié haute densité résistant au lavage",
    price: 54.99,
    originalPrice: 79.99,
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534126511673-b6899657816a?q=80&w=600&auto=format&fit=crop",
    ],
    colors: ["#0F172A", "#475569", "#FFFFFF"],
    colorNames: ["Bleu Minuit", "Gris Athlétique", "Blanc Pur"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    ratings: { score: 4.9, count: 452 },
    boughtLastMonth: 1420,
    isBestSeller: true,
    material: "polyester-recycle",
    inStock: true,
    tags: ["UCL", "Champions", "Ligue des Champions", "Football", "Sport"],
    eventType: "sport",
    category: "hoodie",
    style: "cozy",
  },
  {
    id: "prod-oktoberfest-tshirt",
    title: "T-Shirt Oktoberfest Beer Garland 2026",
    brand: "INSTAWEAR",
    description:
      "Design néo-traditionnel bavarois célébrant la bière et la camaraderie de l'Oktoberfest de Munich.",
    fullDescription:
      "• Coton 100% ringspun doux et léger (150 g/m²)\n• Encolure ras-du-cou côtelée de haute qualité\n• Impression numérique respirante idéale pour fêter activement\n• Illustration bavaroise revisitée avec des touches modernes",
    price: 24.99,
    originalPrice: 34.99,
    image:
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=600&auto=format&fit=crop",
    ],
    colors: ["#D97706", "#065F46", "#1E1E1E"],
    colorNames: ["Caramel Bavarois", "Vert Forêt", "Noir Sombre"],
    sizes: ["S", "M", "L", "XL"],
    ratings: { score: 4.7, count: 95 },
    boughtLastMonth: 310,
    isLimitedTime: true,
    material: "coton-bio",
    inStock: true,
    tags: ["Oktoberfest", "Munich", "Bière", "Fête", "Bavière"],
    eventType: "culture",
    category: "tshirt",
    style: "retro",
  },
  {
    id: "prod-halloween-glow-hoodie",
    title: "Hoodie Halloween Creepy Glow 2026",
    brand: "INSTAWEAR",
    description:
      "Sweat à capuche au design fluorescent célébrant le grand frisson de la nuit d'Halloween.",
    fullDescription:
      "• Coupe confort avec emmanchures descendues (300 g/m²)\n• Impression phosphorescente de qualité studio (brille dans le noir)\n• Finitions bord-côte élastiques aux poignets et à la taille\n• Capuche ajustable double épaisseur pour un look streetwear mystérieux",
    price: 49.99,
    originalPrice: 69.99,
    image:
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?q=80&w=600&auto=format&fit=crop",
    ],
    colors: ["#EA580C", "#1E1E1E", "#4D7C0F"],
    colorNames: ["Orange Citrouille", "Noir Absolu", "Vert Toxique"],
    sizes: ["M", "L", "XL", "XXL"],
    ratings: { score: 4.6, count: 68 },
    boughtLastMonth: 120,
    material: "coton-bio",
    inStock: true,
    tags: ["Halloween", "Glow", "Citrouille", "Saison", "Horreur"],
    eventType: "saisonnier",
    category: "hoodie",
    style: "cozy",
  },
  {
    id: "prod-coachella-tshirt",
    title: "T-Shirt Summer Vibes Desert Mirage Coachella",
    brand: "INSTAWEAR",
    description:
      "Une explosion de couleurs pastel et de motifs boho-chic inspirés par la brise chaleureuse du désert de Californie.",
    fullDescription:
      "• Coton biologique brossé extrêmement doux\n• Design de type collage artistique de vagues mélodiques\n• Coupe fluide décontractée avec manches à revers",
    price: 27.99,
    image:
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=600&auto=format&fit=crop",
    ],
    colors: ["#FEF08A", "#FEE2E2", "#ECFDF5"],
    colorNames: ["Sable Chaud", "Rose Crépuscule", "Menthe Fraîche"],
    sizes: ["S", "M", "L", "XL"],
    ratings: { score: 4.7, count: 210 },
    boughtLastMonth: 480,
    material: "coton-bio",
    inStock: true,
    tags: ["Coachella", "Festival", "Boho", "Summer", "Désert"],
    eventType: "culture",
    category: "tshirt",
    style: "cute",
  },
  {
    id: "prod-retro-olympics-cap",
    title: "Casquette Trucker Olympics Vintage 2026",
    brand: "INSTAWEAR",
    description:
      "Casquette de baseball rétro avec broderie dynamique aux couleurs olympiques légendaires.",
    fullDescription:
      "• Couronne structurée à 5 panneaux à profil moyen\n• Visière pré-courbée avec dessous contrasté rétro\n• Filet arrière respirant en nid d'abeille haute durabilité\n• Fermeture plastique snapback réglable de style classique",
    price: 19.99,
    originalPrice: 29.99,
    image:
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop",
    ],
    colors: ["#1E3A8A", "#B91C1C", "#15803D"],
    colorNames: ["Bleu Stadium", "Rouge Athlète", "Vert Olympique"],
    sizes: ["Unique (Réglable)"],
    ratings: { score: 4.9, count: 320 },
    boughtLastMonth: 950,
    isBestSeller: true,
    material: "polyester-recycle",
    inStock: true,
    tags: ["Olympics", "Casquette", "Sport", "Années 80", "Rétro"],
    eventType: "sport",
    category: "accessory",
    style: "retro",
  },
  {
    id: "prod-new-year-mug",
    title: "Mug de Fête Midnight Countdown 2026",
    brand: "INSTAWEAR",
    description:
      "Mug céramique thermo-réactif révélant un feu d'artifice doré majestueux lorsque la boisson chauffe.",
    fullDescription:
      "• Céramique haute intensité (325 ml)\n• Forme ergonomique confortable, anse large isolée thermiquement\n• Impression sensible à la température révélant un décompte festif magique",
    price: 14.99,
    originalPrice: 19.99,
    image:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?q=80&w=600&auto=format&fit=crop",
    ],
    colors: ["#000000", "#FFFFFF"],
    colorNames: ["Noir Minuit", "Blanc Pur"],
    sizes: ["Format Standard"],
    ratings: { score: 4.5, count: 52 },
    boughtLastMonth: 180,
    material: "ceramique",
    inStock: false,
    tags: ["Nouvel An", "Mug", "Café", "Or", "Saison"],
    eventType: "saisonnier",
    category: "mug",
    style: "cute",
  },
  {
    id: "prod-retro-f1-tshirt",
    title: "T-Shirt Grand Prix Monaco Race Vibe",
    brand: "INSTAWEAR",
    description:
      "Inspiré par le crissement des pneus sur les routes de la Principauté et l'héritage de la vitesse vintage.",
    fullDescription:
      '• Coupe droite classique "Boxy" rétro style années 90\n• Encolure épaisse et surpiqûres à double aiguilles\n• Graphisme de voiture de course rétro avec filtres artistiques',
    price: 28.99,
    originalPrice: 38.99,
    image:
      "https://images.unsplash.com/photo-1503341504253-dff48121cfc8?q=80&w=600&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1503341504253-dff48121cfc8?q=80&w=600&auto=format&fit=crop",
    ],
    colors: ["#DC2626", "#E2E8F0", "#1E1E1E"],
    colorNames: ["Rouge Racing", "Gris Asphalte", "Noir Pneu"],
    sizes: ["S", "M", "L", "XL"],
    ratings: { score: 4.8, count: 184 },
    boughtLastMonth: 420,
    material: "coton-bio",
    inStock: true,
    tags: ["F1", "Grand Prix", "Monaco", "Sport", "Retro"],
    eventType: "sport",
    category: "tshirt",
    style: "retro",
  },
];

export const MATERIALS = [
  { id: "coton-bio", label: "Coton bio" },
  { id: "polyester-recycle", label: "Polyester recyclé" },
  { id: "ceramique", label: "Céramique" },
];
