// scripts/prerender.ts
// Prerender statique post-build : chaque route publique obtient son HTML avec
// meta/OG/JSON-LD dédiés + snapshot de contenu lisible sans JS (bots, partage social).
// Le SPA React démarre normalement par-dessus (mêmes assets, #root remplacé au boot).
// Run auto via "postbuild" (npm run build). Sans env Supabase : routes statiques seules, exit 0.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { FAQS } from "../src/data/faq";
import { DOCS } from "../src/data/legal";

const SITE = "https://instawear.vercel.app";
const LOGO = `${SITE}/InstaWear-logo.png`;

// ── env (même pattern que generate-sitemap.ts) ──
function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(".env")) return out;
  for (const line of readFileSync(".env", "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = loadEnv();
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

// ── helpers ──
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function absImg(src: string | null | undefined): string {
  if (!src) return LOGO;
  if (/^https?:\/\//.test(src)) return src;
  return SITE + (src.startsWith("/") ? src : `/${src}`);
}

const SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", CAD: "$", CHF: "CHF " };
let currencyCode = "USD";

interface Product {
  id: string;
  title: string;
  price: number;
  dealPrice: number | null;
  description: string;
  image: string;
  category: string;
  eventType: string;
  rating: number | null;
  ratingCount: number;
}

function pickPrice(p: any): { price: number; deal: number | null } {
  const price = Number(p.price) || 0;
  const active = p.deal_active === true || p.deal_active === "true";
  const deal = active && p.deal_price != null ? Number(p.deal_price) : null;
  return { price, deal: deal != null && deal < price ? deal : null };
}
function pickImage(p: any): string {
  if (Array.isArray(p.images) && p.images[0]) return String(p.images[0]);
  if (typeof p.image === "string" && p.image) return p.image;
  if (p.colorImages && typeof p.colorImages === "object") {
    const first = Object.values(p.colorImages)[0];
    if (Array.isArray(first) && first[0]) return String(first[0]);
  }
  return "";
}
function pickText(p: any): string {
  const t = p.description || p.fullDescription || "";
  return String(t).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ── gabarit head ──
function setHead(
  html: string,
  opts: { title: string; desc: string; url: string; image?: string; type?: string },
): string {
  const image = opts.image || LOGO;
  const type = opts.type || "website";
  let out = html;
  out = out.replace(/<title>.*?<\/title>/s, `<title>${esc(opts.title)} · InstaWear</title>`);
  out = out.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${esc(opts.desc)}" />`,
  );
  out = out.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${esc(opts.url)}" />`,
  );
  const og = (prop: string, val: string) => {
    const re = new RegExp(`<meta property="${prop}" content="[^"]*" \\/>`);
    out = out.replace(re, `<meta property="${prop}" content="${esc(val)}" />`);
  };
  og("og:title", `${opts.title} · InstaWear`);
  og("og:description", opts.desc);
  og("og:url", opts.url);
  og("og:image", image);
  og("og:type", type);
  out = out.replace(
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${esc(opts.title)} · InstaWear" />`,
  );
  out = out.replace(
    /<meta name="twitter:description" content="[^"]*" \/>/,
    `<meta name="twitter:description" content="${esc(opts.desc)}" />`,
  );
  out = out.replace(
    /<meta name="twitter:image" content="[^"]*" \/>/,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  );
  return out;
}

function addJsonLd(html: string, obj: unknown): string {
  const tag = `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;
  return html.replace("</head>", `    ${tag}\n  </head>`);
}

function setRoot(html: string, snapshot: string): string {
  return html.replace('<div id="root"></div>', `<div id="root">${snapshot}</div>`);
}

// ── snapshot partagé ──
// Dans <noscript> : les navigateurs AVEC JS ne l'affichent pas (zéro flash,
// React remplace le contenu au boot), les bots SANS JS voient le contenu réel
// (SEO/LLM préservés, même contenu que l'app = pas de cloaking).
// leadHero (accueil uniquement) : image LCP VISIBLE peinte avant même le JS
// (mêmes dimensions que le carrousel : swap quasi invisible au boot).
function shell(inner: string, leadHero?: { src: string; alt: string }): string {
  const heroFigure = leadHero
    ? `<div style="height:78vh;min-height:420px;max-height:760px;overflow:hidden;background:#eceae6;">` +
      `<img src="${leadHero.src}" alt="${leadHero.alt}" fetchpriority="high" decoding="async" ` +
      `style="width:100%;height:100%;object-fit:cover;display:block;" ` +
      `onerror="this.closest('div').style.display='none'" /></div>`
    : "";
  return (
    heroFigure +
    `<noscript><main style="max-width:720px;margin:0 auto;padding:32px 20px;font-family:system-ui,sans-serif;color:#1a1a1a;">` +
    `<p><a href="${SITE}/" style="font-weight:800;font-size:20px;color:#ff5c35;text-decoration:none;">InstaWear</a></p>` +
    inner +
    `<hr style="margin:32px 0;border:none;border-top:1px solid #eee;" />` +
    `<p style="font-size:13px;color:#666;">` +
    `<a href="${SITE}/">Home</a> · <a href="${SITE}/promotions">Promotions</a> · ` +
    `<a href="${SITE}/faq">FAQ</a> · <a href="${SITE}/contact">Contact</a> · ` +
    `<a href="${SITE}/suivi">Track order</a></p></main></noscript>`
  );
}

// ── main ──
const templatePath = "dist/index.html";
if (!existsSync(templatePath)) {
  console.error("prerender: dist/index.html introuvable — lancez vite build d'abord");
  process.exit(0);
}
const template = readFileSync(templatePath, "utf-8");
let written = 0;
function write(rel: string, html: string) {
  const path = `dist/${rel}`;
  const dir = path.split("/").slice(0, -1).join("/");
  if (dir) mkdirSync(dir, { recursive: true });
  writeFileSync(path, html);
  written += 1;
}

// 1) Produits + devise store
let products: Product[] = [];
if (url && anon) {
  try {
    const supabase = createClient(url, anon);
    const { data: settings } = await supabase.from("store_settings").select("currency").limit(1).maybeSingle();
    if (settings && typeof (settings as any).currency === "string") {
      currencyCode = String((settings as any).currency).toUpperCase();
    }
    const { data, error } = await supabase.from("products").select("*").eq("is_active", true);
    if (error) {
      console.error("prerender: products query failed:", error.message);
    } else {
      products = (data ?? []).map((p: any) => {
        const { price, deal } = pickPrice(p);
        return {
          id: String(p.id),
          title: String(p.title || "InstaWear product"),
          price,
          dealPrice: deal,
          description: pickText(p),
          image: absImg(pickImage(p)),
          category: String(p.category || ""),
          eventType: String(p.event_type || p.eventType || ""),
          rating: p.ratings_score != null ? Number(p.ratings_score) : null,
          ratingCount: Number(p.ratings_count) || 0,
        };
      });
    }
  } catch (e: any) {
    console.error("prerender: supabase indisponible:", e?.message || e);
  }
} else {
  console.warn("prerender: VITE_SUPABASE_URL/ANON_KEY manquants — routes statiques uniquement");
}
const sym = SYMBOLS[currencyCode] || "$";
const fmt = (n: number) => `${sym}${n.toFixed(2)}`;

// 1b) 1re image hero (même règle que App.tsx : 1re promo active avec produit
// actif, sinon rien). Peinte en visible avant le JS (LCP instantané).
let leadHero: { src: string; alt: string } | undefined;
if (url && anon && products.length > 0) {
  try {
    const supabase = createClient(url, anon);
    const { data: promos } = await supabase
      .from("hero_promotions")
      .select("image, product_id, title, headline")
      .order("order", { ascending: true });
    const first = (promos ?? []).find((pr: any) => {
      if (pr == null) return false;
      if ((pr as any).isActive === false || (pr as any).is_active === false) return false;
      const prod = products.find((p) => p.id === String((pr as any).productId || (pr as any).product_id));
      return !!prod;
    });
    if (first) {
      const prod = products.find(
        (p) => p.id === String((first as any).productId || (first as any).product_id),
      )!;
      const src = String((first as any).image || prod.image || "");
      if (src && !src.includes("missing-item")) {
        leadHero = { src: esc(src), alt: esc(String((first as any).title || (first as any).headline || prod.title)) };
      }
    }
  } catch (e: any) {
    console.error("prerender: hero query failed:", e?.message || e);
  }
}

// 2) Accueil (index.html enrichi, head inchangé = déjà bon)
{
  const snap = shell(
    `<h1>Wear the Moment — print-on-demand for every major event</h1>` +
      `<p>Champions League, Rio Carnival, Oktoberfest, Halloween. Organic cotton, exclusive AI designs, delivery in 3–7 business days.</p>` +
      `<ul>${["T-Shirts", "Hoodies", "Accessories", "Mugs"]
        .map((c) => `<li><a href="${SITE}/recherche?q=${encodeURIComponent(c)}">${c}</a></li>`)
        .join("")}</ul>` +
      (products.length > 0
        ? `<h2>Featured products</h2><ul>${products
            .slice(0, 6)
            .map((p) => `<li><a href="${SITE}/produit/${esc(p.id)}">${esc(p.title)}</a> — ${fmt(p.dealPrice ?? p.price)}</li>`)
            .join("")}</ul>`
          : ""),
    leadHero,
  );
  write("index.html", setRoot(template, snap));
}

// 3) Pages statiques
const STATIC: { file: string; title: string; desc: string; url: string; body: () => string; jsonLd?: () => unknown }[] = [
  {
    file: "faq.html",
    title: "Frequently Asked Questions",
    desc: "Shipping, returns, customization: answers to InstaWear frequently asked questions.",
    url: `${SITE}/faq`,
    body: () =>
      `<h1>Frequently Asked Questions</h1>` +
      FAQS.map((f) => `<h2>${esc(f.question)}</h2><p>${esc(f.answer)}</p>`).join(""),
    jsonLd: () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    }),
  },
  {
    file: "contact.html",
    title: "Contact",
    desc: "Contact InstaWear: reply within 24 business hours. Email bonjour@instawear.com.",
    url: `${SITE}/contact`,
    body: () =>
      `<h1>Contact InstaWear</h1><p>Reply within 24 business hours. Email us at ` +
      `<a href="mailto:bonjour@instawear.com">bonjour@instawear.com</a> or use the contact form on the site.</p>`,
  },
  {
    file: "promotions.html",
    title: "Current promotions",
    desc: "InstaWear print-on-demand deals: t-shirts, hoodies and event accessories on sale.",
    url: `${SITE}/promotions`,
    body: () => {
      const deals = products.filter((p) => p.dealPrice != null);
      return (
        `<h1>Current promotions</h1>` +
        (deals.length > 0
          ? `<ul>${deals
              .map(
                (p) =>
                  `<li><a href="${SITE}/produit/${esc(p.id)}">${esc(p.title)}</a> — ` +
                  `<s>${fmt(p.price)}</s> <strong>${fmt(p.dealPrice as number)}</strong></li>`,
              )
              .join("")}</ul>`
          : `<p>No active deals right now — new drops land regularly. Check the catalog for new arrivals.</p>`)
      );
    },
  },
  {
    file: "recherche.html",
    title: "Search",
    desc: "Search the InstaWear catalog: event outfits, categories and new arrivals.",
    url: `${SITE}/recherche`,
    body: () =>
      `<h1>Search the catalog</h1><p>Browse by category or event:</p><ul>` +
      ["T-Shirts", "Hoodies", "Accessories", "Mugs", "Festival", "Sport", "Concert", "Seasonal", "Birthday"]
        .map((c) => `<li><a href="${SITE}/recherche?q=${encodeURIComponent(c)}">${c}</a></li>`)
        .join("") +
      `</ul>`,
  },
  {
    file: "suivi.html",
    title: "Order tracking",
    desc: "Track your InstaWear order in real time with your ORD number.",
    url: `${SITE}/suivi`,
    body: () =>
      `<h1>Track your order</h1><p>Enter your order code (format ORD-YYYY-XXXXXX, sent by email after checkout) ` +
      `in the tracking field on the site to see production and shipping status in real time.</p>`,
  },
];
for (const s of STATIC) {
  let html = setHead(template, { title: s.title, desc: s.desc, url: s.url });
  if (s.jsonLd) html = addJsonLd(html, s.jsonLd());
  write(s.file, setRoot(html, shell(s.body())));
}

// 4) Légal (depuis src/data/legal.ts — même source que la page)
for (const slug of Object.keys(DOCS)) {
  const doc = DOCS[slug];
  let html = setHead(template, {
    title: doc.title,
    desc: doc.intro.slice(0, 158),
    url: `${SITE}/legal/${slug}`,
  });
  const snap =
    `<h1>${esc(doc.title)}</h1><p>${esc(doc.intro)}</p>` +
    doc.sections
      .map((sec) => `<h2>${esc(sec.heading)}</h2>${sec.body.map((p) => `<p>${esc(p)}</p>`).join("")}`)
      .join("");
  write(`legal/${slug}.html`, setRoot(html, shell(snap)));
}

// 5) Produits
for (const p of products) {
  const desc = (p.description ? p.description.slice(0, 155) + " " : "") + `${p.title} — ${fmt(p.dealPrice ?? p.price)} · InstaWear print-on-demand.`;
  let html = setHead(template, {
    title: p.title,
    desc: desc.slice(0, 300),
    url: `${SITE}/produit/${p.id}`,
    image: p.image,
    type: "product",
  });
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: `${SITE}/produit/${p.id}`,
    priceCurrency: currencyCode,
    price: (p.dealPrice ?? p.price).toFixed(2),
    availability: "https://schema.org/InStock",
  };
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    image: p.image,
    url: `${SITE}/produit/${p.id}`,
    description: p.description || p.title,
    offers: offer,
  };
  if (p.rating != null && p.ratingCount > 0) {
    productLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: p.rating,
      reviewCount: p.ratingCount,
    };
  }
  html = addJsonLd(html, productLd);
  html = addJsonLd(html, {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Catalog", item: `${SITE}/` },
      { "@type": "ListItem", position: 3, name: p.title, item: `${SITE}/produit/${p.id}` },
    ],
  });
  const snap =
    `<h1>${esc(p.title)}</h1>` +
    `<img src="${esc(p.image)}" alt="${esc(p.title)}" style="max-width:100%;height:auto;" />` +
    `<p><strong>${fmt(p.dealPrice ?? p.price)}</strong>` +
    (p.dealPrice != null ? ` <s style="color:#888;">${fmt(p.price)}</s>` : "") +
    `</p>` +
    (p.description ? `<p>${esc(p.description.slice(0, 600))}</p>` : "") +
    (p.category || p.eventType ? `<p style="color:#666;">${esc([p.category, p.eventType].filter(Boolean).join(" · "))}</p>` : "") +
    (p.rating != null && p.ratingCount > 0 ? `<p>Rated ${p.rating}/5 (${p.ratingCount} reviews)</p>` : "") +
    `<p><a href="${SITE}/produit/${esc(p.id)}">View and customize this product on InstaWear →</a></p>`;
  write(`produit/${p.id}.html`, setRoot(html, shell(snap)));
}

console.log(`prerender: ${written} fichiers HTML (${products.length} produits) → dist/`);
