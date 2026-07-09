// src/hooks/useTabBadge.ts

import { useEffect, useRef } from "react";
import { notificationApi } from "../api/supabaseApi";
import type { CartItem } from "../types";

/**
 * Met à jour le titre de l'onglet et le favicon avec :
 * - Le nombre de notifications non lues (admin)
 * - Le nombre d'articles dans le panier (tous)
 *
 * Usage dans App.tsx :
 *   useTabBadge(cart, isAdmin);
 */
export function useTabBadge(cart: CartItem[], isAdmin: boolean) {
  const notifCountRef = useRef(0);
  const cartCountRef = useRef(0);
  const originalTitle = useRef(document.title);

  const update = async () => {
    let notifCount = 0;
    if (isAdmin) {
      try {
        notifCount = await notificationApi.getUnreadCount();
      } catch {
        // silencieux
      }
    }

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (
      notifCount !== notifCountRef.current ||
      cartCount !== cartCountRef.current
    ) {
      notifCountRef.current = notifCount;
      cartCountRef.current = cartCount;
      updateDocument(notifCount, cartCount, originalTitle.current);
    }
  };

  useEffect(() => {
    update();
    const interval = setInterval(update, 30000);
    const handler = () => update();
    window.addEventListener("notifications-updated", handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener("notifications-updated", handler);
    };
  }, [isAdmin, cart]);
}

function updateDocument(
  notifCount: number,
  cartCount: number,
  originalTitle: string,
) {
  // 1. Titre de l'onglet
  const parts: string[] = [];
  if (notifCount > 0) parts.push(`(${notifCount})`);
  if (cartCount > 0) parts.push(`🛒 ${cartCount}`);

  if (parts.length > 0) {
    document.title = `${parts.join(" ")} · ${originalTitle}`;
  } else {
    document.title = originalTitle;
  }

  // 2. Badge sur le favicon (affiche le total notifs + panier)
  drawFaviconBadge(notifCount + cartCount);
}

function drawFaviconBadge(totalCount: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const img = new Image();
  const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
  const faviconUrl = link?.href || "/InstaWear-logo-wh-middle-no-BG.png";

  img.crossOrigin = "anonymous";
  img.onload = () => {
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(img, 0, 0, 32, 32);

    if (totalCount > 0) {
      const badgeSize = totalCount > 9 ? 18 : 16;
      const x = 32 - badgeSize - 2;
      const y = 32 - badgeSize - 2;

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(
        x + badgeSize / 2,
        y + badgeSize / 2,
        badgeSize / 2,
        0,
        2 * Math.PI,
      );
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${totalCount > 9 ? 10 : 11}px Plus Jakarta Sans, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        totalCount > 99 ? "99+" : String(totalCount),
        x + badgeSize / 2,
        y + badgeSize / 2 + 1,
      );
    }

    const faviconLink =
      document.querySelector("link[rel='icon']") ||
      document.createElement("link");
    faviconLink.setAttribute("rel", "icon");
    faviconLink.setAttribute("type", "image/png");
    faviconLink.setAttribute("href", canvas.toDataURL("image/png"));
    if (!document.querySelector("link[rel='icon']")) {
      document.head.appendChild(faviconLink);
    }
  };
  img.src = faviconUrl;
}
