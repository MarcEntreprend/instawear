// src/lib/imagekit.ts
import { imageKitConfig } from '../config/imagekit';

const SOURCE_WHITELIST = [
  'https://printful.com',
  'https://images.printful.com',
  'https://file.cloudinary.com', // fallback
];

const DANGEROUS_SCHEMES = ['file:', 'ftp:', 'javascript:', 'data:'];
const PRIVATE_IP_REGEX = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|localhost|::1)/i;

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'webp' | 'jpeg' | 'png' | 'auto'; // auto = détecte le navigateur
  fit?: 'cover' | 'contain' | 'crop';
  x?: number;
  y?: number;
  blur?: number;
}

/**
 * Valide qu'une URL source est sûre et autorisée
 */
export const validateSourceUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;

  // Vérifier les schémas dangereux
  if (DANGEROUS_SCHEMES.some(scheme => url.toLowerCase().startsWith(scheme))) return false;

  // Vérifier les IPs privées (SSRF protection)
  try {
    const host = new URL(url).hostname;
    if (PRIVATE_IP_REGEX.test(host)) return false;
  } catch { return false; }

  // Vérifier la whitelist des domaines sources
  const urlObj = new URL(url);
  const isAllowed = SOURCE_WHITELIST.some(allowed => url.startsWith(allowed));
  if (!isAllowed) return false;

  return true;
};

/**
 * Génère une URL ImageKit transformée en fonction des options
 */
export const imageKitUrl = (
  sourceUrl: string,
  options: ImageTransformOptions = {}
): string => {
  // Si URL invalide, retourner l'originale (avec warning en dev)
  if (!validateSourceUrl(sourceUrl)) {
    console.warn(`[imageKit] URL non autorisée ou invalide: ${sourceUrl}`);
    return sourceUrl;
  }

  // Encode l'URL source
  const encodedPath = encodeURIComponent(sourceUrl);

  // Construit les paramètres de transformation
  const transformParts: string[] = [];

  if (options.width) transformParts.push(`w-${options.width}`);
  if (options.height) transformParts.push(`h-${options.height}`);
  if (options.quality) transformParts.push(`q-${options.quality}`);
  if (options.format && options.format !== 'auto') transformParts.push(`f-${options.format}`);
  if (options.fit) transformParts.push(`fit-${options.fit}`);
  if (options.blur) transformParts.push(`bl-${options.blur}`);

  // Construit l'URL finale
  const transformString = transformParts.join(',');
  const basePath = imageKitConfig.urlEndpoint;

  return `${basePath}${encodedPath}${transformString ? `tr:${transformString}` : ''}`;
};

/**
 * Génère un srcSet WebP responsive
 */
export const imageKitSrcSet = (
  sourceUrl: string,
  options: Omit<ImageTransformOptions, 'width'> = {},
  widths = [480, 768, 1024, 1600]
): string => {
  return widths
    .map(w => `${imageKitUrl(sourceUrl, { ...options, width: w })} ${w}w`)
    .join(', ');
};

/**
 * Wrapper sécurisé pour les URLs d'images Printful
 */
export const printfulImageUrl = (
  imageUrl: string,
  options: ImageTransformOptions = { quality: 80, format: 'webp' }
): string => {
  // ImageKit fait la conversion automatiquement si format='webp'
  return imageKitUrl(imageUrl, options);
};

export default imageKitUrl;
