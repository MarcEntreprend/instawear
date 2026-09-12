// src/components/OptimizedImage.tsx
import React from 'react';
import { imageKitUrl } from '../lib/imagekit';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

/**
 * Composant d'image optimisé pour le frontstore
 * Utilise ImageKit pour le format WebP et le redimensionnement
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
}) => {
  const webpSrc = imageKitUrl(src, { quality: 80, format: 'webp' });

  // srcSet pour différentes densités de pixel
  const srcSet = `
    ${webpSrc} 1x,
    ${imageKitUrl(src, { quality: 80, width: 1440, format: 'webp' })} 2x
  `.trim();

  // sizes par défaut si non fourni
  const sizesValue = sizes || `(max-width: 768px) 480px, (max-width: 1200px) 768px, 1024px`;

  return (
    <img
      src={webpSrc}
      srcSet={srcSet}
      sizes={sizesValue}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      onError={(e) => {
        // Fallback vers l'original si ImageKit échoue
        (e.target as HTMLImageElement).src = src;
      }}
    />
  );
};

export default OptimizedImage;
