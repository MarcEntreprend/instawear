// scripts/generate-sitemap.ts
// Régénère public/sitemap.xml : URLs statiques + /produit/:id actifs depuis Supabase.
// Run: npm run sitemap (lit .env : VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://instawear.vercel.app";
const STATIC_URLS: { loc: string; changefreq: string; priority: string }[] = [
  { loc: `${SITE}/`, changefreq: "daily", priority: "1.0" },
  { loc: `${SITE}/faq`, changefreq: "weekly", priority: "0.6" },
  { loc: `${SITE}/contact`, changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE}/legal/cgv`, changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE}/legal/privacy`, changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE}/legal/cookies`, changefreq: "yearly", priority: "0.3" },
  { loc: `${SITE}/promotions`, changefreq: "daily", priority: "0.7" },
];

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

let productUrls: { loc: string; changefreq: string; priority: string }[] = [];
if (url && anon) {
  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", true);
  if (error) {
    console.error("sitemap: products query failed:", error.message);
  } else {
    productUrls = (data ?? []).map((p: any) => ({
      loc: `${SITE}/produit/${p.id}`,
      changefreq: "weekly",
      priority: "0.8",
    }));
  }
} else {
  console.warn("sitemap: VITE_SUPABASE_URL/ANON_KEY manquants — URLs statiques uniquement");
}

const all = [...STATIC_URLS, ...productUrls];
const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  all
    .map(
      (u) =>
        `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

writeFileSync("public/sitemap.xml", xml);
console.log(`sitemap: ${all.length} URLs (${productUrls.length} produits) → public/sitemap.xml`);
