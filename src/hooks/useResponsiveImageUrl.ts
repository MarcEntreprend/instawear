// src/hooks/useResponsiveImageUrl.ts
import { useMemo } from 'react';
import { imageKitUrl, imageKitSrcSet } from '../lib/imagekit';
import { useIsMobile } from './useIsMobile';

interface UseResponsiveImageUrlOptions {
  quality?: number;
  widths?: number[];
}

export const useResponsiveImageUrl = (
  src: string,
  options: UseResponsiveImageUrlOptions = {}
) => {
  const isMobile = useIsMobile();

  return useMemo(() => {
    const defaultWidths = isMobile ? [320, 480, 768] : [480, 768, 1024, 1600];
    const widths = options.widths || defaultWidths;

    return {
      url: imageKitUrl(src, { quality: options.quality || 80, format: 'webp' }),
      srcSet: imageKitSrcSet(src, { quality: options.quality || 80 }, widths),
    };
  }, [src, options.quality, options.widths, isMobile]);
};
