// src/components/WebpImage.tsx
import React, { useState, useEffect } from 'react';
import { imageKitUrl } from '../lib/imagekit';

interface WebpImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: string;
  priority?: boolean;
}

export const WebpImage: React.FC<WebpImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 80,
  className = '',
  onLoad,
  onError,
  placeholder,
  priority = false,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(() => imageKitUrl(src, { quality, format: 'webp' }));
  const [error, setError] = useState(false);

  useEffect(() => {
    // Pré-chargement de l'URL transformée
    const transformed = imageKitUrl(src, { quality, format: 'webp' });
    setImgSrc(transformed);
  }, [src, quality]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setImgSrc(src); // fallback vers l'original
    onError?.();
  };

  // CLS fix : dimensions explicites ou ratio maintenu
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    minHeight: height || 'auto',
    minWidth: width || 'auto',
  };

  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transition: 'opacity 0.3s ease',
    opacity: isLoaded ? 1 : 0,
    backgroundColor: placeholder ? 'transparent' : '#f3f4f6',
  };

  return (
    <div 
      className={`webp-image-container ${className}`}
      style={containerStyle}
    >
      {placeholder && !isLoaded && (
        <div 
          style={{
            ...imgStyle,
            backgroundImage: `url(${placeholder})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
      <img
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={imgStyle}
        onLoad={handleLoad}
        onError={handleError}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

export default WebpImage;
