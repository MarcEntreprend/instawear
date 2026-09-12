// src/utils/imageConversion.ts

import { imageKitUrl } from "../lib/imagekit";
import { AdminProduct } from "../admin/adminTypes";

export const convertProductImagesToWebp = (
  product: Partial<AdminProduct>,
): Partial<AdminProduct> => ({
  ...product,
  image: product.image
    ? imageKitUrl(product.image, { quality: 80, format: "webp" })
    : undefined,
  gallery: product.gallery?.map((url) =>
    imageKitUrl(url, { quality: 80, format: "webp" }),
  ),
  colorImages: product.colorImages?.map((url) =>
    imageKitUrl(url, { quality: 80, format: "webp" }),
  ),
  // Convert variant images if they exist
  variants: product.variants?.map((variant) => ({
    ...variant,
    image: variant.image
      ? imageKitUrl(variant.image, { quality: 80, format: "webp" })
      : variant.image,
  })),
});

export const batchConvertImages = (
  imageUrls: string[],
  options: { quality?: number; format?: "webp" } = {},
): string[] => {
  return imageUrls.map((url) =>
    imageKitUrl(url, {
      quality: options.quality ?? 80,
      format: options.format ?? "webp",
    }),
  );
};
