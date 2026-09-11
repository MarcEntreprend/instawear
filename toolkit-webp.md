# Optimisation des images WebP avec ImageKit

This project uses ImageKit to automatically convert images to WebP format for faster loading and better Core Web Vitals.

## Configuration

### Environment Variables

Add these to your environment (e.g., `.env`):

```env
IMAGEKIT_PUBLIC_KEY=your_public_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/
```

### How it works

1. **Original images** are stored in the database as PNG/JPG (from Printful)
2. **At display time**, every image is converted to WebP via ImageKit CDN
3. **CDN serves** the optimized WebP version directly to the browser
4. **Automatic optimization** includes:
   - Format: WebP (better compression than JPEG/PNG)
   - Quality: 80 (balance between size and quality)
   - Resizing: Responsive (different sizes for mobile/desktop)
   - Automatic format detection per browser

## Benefits

- **Faster LCP** — WebP loads quicker than PNG/JPG
- **Reduced bandwidth** — WebP is ~25-35% smaller than JPEG
- **Better Core Web Vitals** — Improved Largest Contentful Paint
- **Zero technical debt** — No manual image processing
- **No SSRF risk** — Strict whitelist of allowed domains

## Files Created

- `src/lib/imagekit.ts` — Core utility for ImageKit integration
- `src/config/imagekit.ts` — Configuration constants
- `src/components/WebpImage.tsx` — Reusable WebP image component
- `src/hooks/useResponsiveImageUrl.ts` — Hook for responsive WebP URLs
- `src/components/OptimizedImage.tsx` — Optimized image component with srcSet
- `src/admin/PrintfulProductForm.tsx` — Updated import handler with WebP conversion
- `src/pages/ProductPage.tsx` — Updated to use OptimizedImage
- `src/components/StoreProductCard.tsx` — Updated to use OptimizedImage
- `.env.example` — Template for environment variables
- `README.md` — Documentation

## Setup

1. Create an account at [ImageKit](https://imagekit.io/) and create a free account
2. Generate a Public Key and Private Key
3. Set `IMAGEKIT_PUBLIC_KEY` and `IMAGEKIT_URL_ENDPOINT` in your environment
4. Run the development server

## Testing

After deployment, verify:

- Lighthouse score > 90 (Performance, LCP)
- Images load as WebP (check network tab)
- No broken image icons
- Mobile responsiveness maintained

## Security

- Only Printful domain is whitelisted
- IP address filtering prevents SSRF attacks
- All URLs validated before transformation
- Graceful fallback to original image if conversion fails
