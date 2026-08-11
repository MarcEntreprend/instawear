// src/types.ts

export interface ProductVariant {
  color: string;
  color_name?: string;
  image?: string;
  sizes: Record<string, { price?: number; inStock?: boolean }>;
}

export interface Product {
  id: string;
  title: string;
  brand: string;
  description: string;
  fullDescription?: string;
  price: number;
  originalPrice?: number;
  dealActive?: boolean;
  dealPrice?: number;
  dealEndsAt?: string;
  image: string;
  gallery?: string[];
  colors: string[];
  colorNames?: string[];
  colorImages?: string[];
  sizes: string[];
  sizeSurcharge?: Record<string, number>;
  variants?: ProductVariant[];
  category: string;
  eventType?: string | null;
  tags: string[];
  style: string;
  isActive: boolean;
  isBestSeller?: boolean;
  isLimitedTime?: boolean;
  showRatings?: boolean;
  showBought?: boolean;
  ratings: { score: number; count: number };
  boughtLastMonth?: number;
  sizeGuide?: any;
}

export interface CartItem {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  quantity: number;
  unitPrice: number;
}

export interface NavLink {
  label: string;
  section: "catalog" | "about" | "faq" | "contact" | "testimonials" | "filters";
  eventType: string | null;
  category: string | null;
}
