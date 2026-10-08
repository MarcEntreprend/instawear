// src/lib/heroHtml.ts — HTML collé du hero (lot 4). Contenu réservé aux
// super_admin (garde serveur hero_promotions_guard_html, non contournable),
// rendu sandboxé en Shadow DOM (HeroHtml.tsx), ET nettoyé ici en défense
// en profondeur : <script>, handlers on*, iframes/objets/embeds, URL
// javascript:/data: refusés. Pur (string → string), testé sans DOM.
//
// Limite honnête : nettoyage par regex, pas par parseur DOM (pas de DOM en
// node/tests). Suffisant pour du contenu super-admin déjà timbré serveur,
// pas pour du HTML utilisateur anonyme (qui n'existe pas dans ce produit).

export type HeroHrefKind = "internal" | "external" | "blocked";

/** Interne (même origine, routé par l'app), externe (nouvel onglet),
 *  bloqué (javascript:, data:, relatif ambigu, vide, ancre seule). */
export function classifyHeroHref(href: unknown): HeroHrefKind {
  if (typeof href !== "string") return "blocked";
  const t = href.trim();
  if (!t || t === "#") return "blocked";
  if (t.startsWith("/") && !t.startsWith("//")) return "internal";
  if (/^https?:\/\//i.test(t)) return "external";
  return "blocked";
}

const BLOCKED_ATTRS = "javascript|data|vbscript";

/** Nettoie un fragment HTML : jamais d'exception, jamais de script. */
export function sanitizeHeroHtml(dirty: unknown): string {
  if (typeof dirty !== "string") return "";
  let out = dirty;
  // <script>…</script> (multiligne, casse mixte, même non fermé) +-</script>
  // orphelines.
  out = out.replace(/<script[\s>][\s\S]*?(<\/script\s*>|$)/gi, "");
  out = out.replace(/<\/script\s*>/gi, "");
  // Éléments actifs ou hors-portée (clics piégés, navigation, exfiltration).
  // <form> avec son contenu (champs = exfiltration potentielle).
  out = out.replace(/<form\b[^>]*>[\s\S]*?(<\/form\s*>|$)/gi, "");
  out = out.replace(
    /<\/?(iframe|object|embed|form|base|link|meta|title|noscript)\b[^>]*>/gi,
    "",
  );
  // Handlers on* (guillemets doubles, simples ou non quotés).
  out = out.replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Schémas dangereux dans les attributs d'URL.
  out = out.replace(
    /\s(href|src|xlink:href|action)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (m, attr: string, _q: string, d: string, s: string, u: string) => {
      const v = (d ?? s ?? u ?? "").trim();
      return new RegExp(`^\\s*(${BLOCKED_ATTRS})\\s*:`, "i").test(v)
        ? ` ${attr}="#"`
        : m;
    },
  );
  // Ceinture + bretelles (le serveur plafonne html+css à 50 Ko).
  return out.slice(0, 60000);
}
