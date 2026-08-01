// src/constants/assets.ts

/**
 * Assets centralisés – Toutes les URLs d'images et logos réutilisables
 * Modifier ce fichier pour changer une image dans toute l'application.
 */

// Logo principal (header, footer)
export const LOGO_URL = "/InstaWear-logo.png";

// Logo principal sans  background (Favicon)
export const LOGO_NO_BACKGROUND = "/InstaWear-logo-wh-middle-no-BG.png";

// Logo admin (sidebar)
export const LOGO_SETTINGS_URL = "/InstaWear-logo-settings.png";

// Image placeholder pour les produits (si pas d'image fournie)
export const PLACEHOLDER_IMG = "/Instawear-missing-item.svg";

// Icon for no internet
export const NO_INTERNET = "/globe-off.svg";

export const CART_NEUTRAL = "/cart.svg";

export const CART_PLUS_ICON = "/cart-plus.svg";

export const CART_CHECK_ICON = "/cart-check.svg";

export const CART_X_ICON = "/cart-x.svg";

export const FLAG_URL: Record<string, string> = {
  US: "/flags/us.svg",
  CA: "/flags/ca.svg",
  GB: "/flags/gb.svg",
  FR: "/flags/fr.svg",
  CH: "/flags/ch.svg",
  BE: "/flags/be.svg",
  BR: "/flags/br.svg",
  JP: "/flags/jp.svg",
};
