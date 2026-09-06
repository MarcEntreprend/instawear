// src/hooks/usePageMeta.ts — V2 port
import { useEffect } from "react";

export interface PageMetaInput {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "product" | "article";
}

const SITE_NAME = "InstaWear";
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80";

function setMetaTag(selector: string, attr: "content", value: string, createAttrs: Record<string, string>) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    Object.entries(createAttrs).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function setLinkTag(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function usePageMeta({ title, description, image, url, type = "website" }: PageMetaInput) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? title : `${title} · ${SITE_NAME}`;
    const resolvedImage = image ?? DEFAULT_IMAGE;
    const resolvedUrl = url ?? window.location.href;
    document.title = fullTitle;
    setMetaTag('meta[name="description"]', "content", description, { name: "description" });
    setMetaTag('meta[property="og:title"]', "content", fullTitle, { property: "og:title" });
    setMetaTag('meta[property="og:description"]', "content", description, { property: "og:description" });
    setMetaTag('meta[property="og:image"]', "content", resolvedImage, { property: "og:image" });
    setMetaTag('meta[property="og:url"]', "content", resolvedUrl, { property: "og:url" });
    setMetaTag('meta[property="og:type"]', "content", type, { property: "og:type" });
    setMetaTag('meta[property="og:site_name"]', "content", SITE_NAME, { property: "og:site_name" });
    setMetaTag('meta[name="twitter:card"]', "content", "summary_large_image", { name: "twitter:card" });
    setMetaTag('meta[name="twitter:title"]', "content", fullTitle, { name: "twitter:title" });
    setMetaTag('meta[name="twitter:description"]', "content", description, { name: "twitter:description" });
    setMetaTag('meta[name="twitter:image"]', "content", resolvedImage, { name: "twitter:image" });
    setLinkTag("canonical", resolvedUrl);
  }, [title, description, image, url, type]);
}
