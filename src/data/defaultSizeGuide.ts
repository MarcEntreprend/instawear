// src/data/defaultSizeGuide.ts
// Guide des tailles par défaut (format Printful ProductSizeGuide) utilisé
// quand un produit n'a pas de size_guide synchronisé.
// Valeurs standard unisex (style Bella + Canvas 3001, en pouces — même unité
// que Printful) : APPROXIMATIVES, à affiner par produit via resync.
// Le modal convertit en cm à la demande.

export interface DefaultSizeMeasurement {
  type_label: string;
  values: { size: string; value: string }[];
}

export interface DefaultSizeTable {
  type: string;
  unit: string;
  description: string;
  image_url: string | null;
  measurements: DefaultSizeMeasurement[];
}

export interface DefaultSizeGuide {
  product_id: null;
  available_sizes: string[];
  size_tables: DefaultSizeTable[];
  isDefault: true;
}

// Largeur (Width, aisselle à aisselle) et Longueur (Length) en pouces.
const WIDTH: Record<string, string> = {
  S: "18",
  M: "20",
  L: "22",
  XL: "24",
  "2XL": "26",
  "3XL": "28",
};
const LENGTH: Record<string, string> = {
  S: "28",
  M: "29",
  L: "30",
  XL: "31",
  "2XL": "32",
  "3XL": "33",
};

const SIZES = ["S", "M", "L", "XL", "2XL", "3XL"];

export const DEFAULT_SIZE_GUIDE: DefaultSizeGuide = {
  product_id: null,
  available_sizes: SIZES,
  size_tables: [
    {
      type: "product_measure",
      unit: "inches",
      description:
        "Generic unisex fit — approximate measurements. The exact product guide (with diagrams) appears automatically once synced from Printful.",
      image_url: null,
      measurements: [
        {
          type_label: "Width",
          values: SIZES.map((size) => ({ size, value: WIDTH[size] })),
        },
        {
          type_label: "Length",
          values: SIZES.map((size) => ({ size, value: LENGTH[size] })),
        },
      ],
    },
  ],
  isDefault: true,
};
