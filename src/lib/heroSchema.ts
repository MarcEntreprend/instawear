// src/lib/heroSchema.ts
// Schéma v1 de la composition hero (colonne jsonb hero_promotions.config).
// 100 % PUR, zéro dépendance, pas d'enum/classe : importable en node (tests) comme
// dans le navigateur. Validateurs maison (pattern sanitizeHeroPhase2) : AUCUNE
// exception levée, toute entrée invalide est ramenée à une valeur sûre ou écartée.
// ⚠ buildHeroConfigFromLegacy est le miroir TS du backfill SQL de la migration
// 20261034 : si l'un change, l'autre doit changer (voir tests/hero-schema.test.ts).

export const HERO_SCHEMA_VERSION = 1 as const;
export const HERO_PAYLOAD_CAP_BYTES = 51200; // = CHECK SQL hero_promotions_payload_cap_check
export const HERO_PAYLOAD_WARN_BYTES = 35840; // 35 Ko : avertissement orange
export const HERO_MAX_LAYERS = 8;
export const HERO_MAX_CTAS = 4;
export const HERO_MAX_TILES = 3;

// ─── Types ──────────────────────────────────────────────────────────────
export type HeroWidth = "full" | "contained";
export interface HeroHeight {
  unit: "vh" | "px";
  value: number;
}
/** auto = ratio mesuré par le studio puis figé (zéro JS de mesure au runtime).
 *  fixed = hauteur explicite. Mutuellement exclusifs (union discriminée). */
export interface HeroSizingAuto {
  mode: "auto";
  width: HeroWidth;
  ratio: { desktop: number; mobile: number }; // largeur / hauteur
}
export interface HeroSizingFixed {
  mode: "fixed";
  width: HeroWidth;
  height: HeroHeight;
  heightMobile?: HeroHeight;
}
export type HeroSizing = HeroSizingAuto | HeroSizingFixed;

export type HeroTextAnchor =
  | "left-middle"
  | "right-middle"
  | "center"
  | "bottom-left";
export type HeroTone = "auto" | "light" | "dark";

/** Visibilité responsive (02 : Hide-on). Absent = visible partout. */
export interface HeroHidden {
  mobile?: boolean;
  desktop?: boolean;
}

/** Fond plein cadre. src null = image du produit principal (product_id). */
export interface HeroImageLayer {
  type: "image";
  src: string | null;
  srcMobile?: string;
  srcDark?: string;
  alt: string;
  fit: "cover" | "contain";
  dim: number; // 0..1 (opacité de l'image sur le fond ; legacy "full" = 0.55)
  scrim: "none" | "left" | "bottom";
  hidden?: HeroHidden;
}
/** Visuel cadré sur un côté (ex-layout split). productId => infos produit live. */
export interface HeroCardLayer {
  type: "card";
  side: "left" | "right";
  src: string | null; // null = image du produit
  srcMobile?: string;
  alt: string;
  productId: string | null;
  showMeta: boolean;
  hidden?: HeroHidden;
}
export interface HeroTile {
  src: string;
  label: string;
  link: string | null;
}
export interface HeroTilesMain {
  src: string | null; // null = image du produit principal
  link: string | null;
  label: string;
  ctaLabel: string;
  fromProduct: boolean; // label vide => titre produit
}
/** Ex-kind "grid" : visuel principal + jusqu'à 3 tuiles liées. */
export interface HeroTilesLayer {
  type: "tiles";
  main: HeroTilesMain | null;
  items: HeroTile[];
  hidden?: HeroHidden;
}
export interface HeroTextLayer {
  type: "text";
  anchor: HeroTextAnchor;
  tone: HeroTone; // auto : encre sombre sur fond clair sans image plein cadre
  tag: string;
  showTag: boolean;
  headline: string;
  headlineLines: "all" | "first";
  sub: string;
  showSub: boolean;
  fromProduct: boolean; // champs vides => titre / description du produit principal
  hidden?: HeroHidden;
  /** Typo fine (02) : absents = rendu historique. */
  lineHeight?: number; // 0.9..2.0
  letterSpacing?: number; // em, -0.05..0.1
  align?: "left" | "center" | "right" | "justify";
  transform?: "none" | "uppercase" | "lowercase" | "capitalize";
  maxWidth?: string; // "34ch" | "80%" | "520px" (motif strict)
  balance?: boolean; // text-wrap: balance sur le titre
  /** Police du bloc (02) : liste fermée, vide = globale puis défaut. */
  font?: string;
  fontLocked?: boolean; // verrouillée : ignore la globale
  fontWeight?: number; // 100..900 (centaines)
}
/** Réservé Phase 4 (contenu dans les colonnes html / css, pas dans config). */
export interface HeroHtmlLayer {
  type: "html";
}
export type HeroLayer =
  | HeroImageLayer
  | HeroCardLayer
  | HeroTilesLayer
  | HeroTextLayer
  | HeroHtmlLayer;

export interface HeroCtaPoint {
  x: number; // % de la largeur, 0..100
  y: number; // % de la hauteur, 0..100
}
export interface HeroCta {
  id: string;
  label: string;
  link: string | null; // null = fiche du produit principal
  style: "accent" | "light" | "dark" | "ghost";
  /** null = "inline" (dans le flux du bloc texte, comportement legacy).
   *  Sinon position libre ; au rendu : left/top = x%/y% + translate(-x%, -y%)
   *  => le bouton ne déborde JAMAIS, même à 0 % ou 100 %. */
  pos: null | { desktop: HeroCtaPoint; mobile?: HeroCtaPoint };
  hidden?: HeroHidden;
}

export interface HeroConfig {
  v: 1;
  /** legacy = régénérée depuis les colonnes legacy ; studio = source de vérité. */
  origin: "legacy" | "studio";
  sizing: HeroSizing;
  background: { gradient: string };
  layers: HeroLayer[];
  ctas: HeroCta[];
  /** Police globale (02) : appliquée aux blocs non verrouillés. Liste fermée. */
  fontFamily?: string;
  /** Import custom (lot 12) : URL css2 Google Fonts validée (swap forcé). */
  fontUrl?: string;
}

// ─── Helpers de validation ──────────────────────────────────────────────
type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function num(v: unknown, min: number, max: number, fallback: number): number {
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && v.trim() !== ""
        ? Number(v)
        : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function pick<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

const SITE_HOSTS = ["instawear.vercel.app", "localhost", "127.0.0.1"];

/** Lien interne uniquement : "/…" ou URL absolue same-origin réduite au chemin.
 *  Externe / javascript: / data: => null. (Même règle que sanitizeHeroPhase2.) */
export function cleanHeroLink(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.startsWith("/") && !t.startsWith("//") && t.length <= 200) return t;
  const m = t.match(
    /^https?:\/\/([^/:?#]+)(?::\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/i,
  );
  if (m && SITE_HOSTS.includes(m[1].toLowerCase())) {
    const path = (m[2] || "/") + (m[3] || "") + (m[4] || "");
    return path.length <= 200 ? path : null;
  }
  return null;
}

/** Source d'image : http(s):// ou chemin "/…". Jamais data:, javascript:, "//". */
export function cleanHeroSrc(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > 1000) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  return null;
}

/** Fond CSS : dégradé / couleur uniquement. url(), @import, ;{}<> => rejeté. */
export function cleanHeroBackground(v: unknown): string {
  const t = str(v, 600);
  if (!t) return "";
  if (/url\s*\(|expression\s*\(|@import|[;{}<>]/i.test(t)) return "";
  return /gradient\(|^#|^var\(--|^rgba?\(|^hsla?\(/i.test(t) ? t : "";
}

/** Polices autorisées (02 Font Library) : liste fermée, display=swap. */
export const HERO_FONT_FAMILIES = [
  "Inter",
  "Sora",
  "Instrument Serif",
  "General Sans",
  "Space Grotesk",
  "JetBrains Mono",
] as const;

/** Famille valide ou undefined (jamais d'injection via font-family). */
export function cleanHeroFont(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return (HERO_FONT_FAMILIES as readonly string[]).includes(t)
    ? t
    : undefined;
}

/** URL d'import de fonte (lot 12) : uniquement le css2 Google Fonts
 *  (même discipline que les liens hero : domaine fermé), display=swap
 *  forcé, familles valides requises. Tout le reste => undefined. */
export function cleanHeroFontUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (t.length === 0 || t.length > 500) return undefined;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return undefined;
  }
  if (u.protocol !== "https:") return undefined;
  if (u.hostname.toLowerCase() !== "fonts.googleapis.com") return undefined;
  if (!u.pathname.startsWith("/css2")) return undefined;
  const families = parseHeroFontUrlFamilies(t);
  if (families.length === 0) return undefined;
  u.searchParams.set("display", "swap");
  return u.toString();
}

/** Noms de familles déclarés par une URL css2 (tokens sûrs uniquement). */
export function parseHeroFontUrlFamilies(url: string): string[] {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const f of u.searchParams.getAll("family")) {
    const name = f.split(":")[0].replace(/\+/g, " ").trim();
    if (/^[A-Za-z][A-Za-z0-9 ]{1,39}$/.test(name) && !out.includes(name))
      out.push(name);
  }
  return out;
}

/** Police effective d'un bloc : bloc > globale (nom ou URL, sauf verrou).
 *  Retourne un NOM de famille (l'URL est résolue vers sa 1re famille). */
export function heroEffectiveFont(
  cfg: { fontFamily?: string; fontUrl?: string },
  layer: { font?: string; fontLocked?: boolean },
): string | undefined {
  if (layer.font) return layer.font;
  if (!layer.fontLocked) {
    if (cfg.fontFamily) return cfg.fontFamily;
    if (cfg.fontUrl) {
      const fams = parseHeroFontUrlFamilies(cfg.fontUrl);
      if (fams.length > 0) return fams[0];
    }
  }
  return undefined;
}

/** Hide-on (02) : ne retient que des `true` explicites, sinon absent
 *  (= visible partout — les configs legacy restent inchangées au byte). */
export function cleanHeroHidden(raw: unknown): HeroHidden | undefined {
  if (!isObj(raw)) return undefined;
  const out: HeroHidden = {};
  if (raw.mobile === true) out.mobile = true;
  if (raw.desktop === true) out.desktop = true;
  return out.mobile || out.desktop ? out : undefined;
}

/** Couche/CTA masqué sur le device courant ? (pur, testé). */
export function isHeroHidden(
  hidden: HeroHidden | undefined,
  isMobile: boolean,
): boolean {
  if (!hidden) return false;
  return isMobile ? hidden.mobile === true : hidden.desktop === true;
}

// ─── Sizing ─────────────────────────────────────────────────────────────
export const HERO_DEFAULT_SIZING: HeroSizingFixed = {
  mode: "fixed",
  width: "full",
  height: { unit: "vh", value: 78 },
};

function sanitizeHeight(raw: unknown, fallback: HeroHeight): HeroHeight {
  if (!isObj(raw)) return { ...fallback };
  const unit = pick(raw.unit, ["vh", "px"] as const, fallback.unit);
  if (unit === "vh") {
    return { unit, value: Math.round(num(raw.value, 30, 100, 78)) };
  }
  return { unit, value: Math.round(num(raw.value, 200, 1200, 520)) };
}

function sanitizeSizing(raw: unknown): HeroSizing {
  if (!isObj(raw)) return { ...HERO_DEFAULT_SIZING };
  const width = pick(raw.width, ["full", "contained"] as const, "full");
  if (raw.mode === "auto") {
    const r: Obj = isObj(raw.ratio) ? raw.ratio : {};
    return {
      mode: "auto",
      width,
      ratio: {
        desktop: round2(num(r.desktop, 0.3, 6, 2.4)),
        mobile: round2(num(r.mobile, 0.3, 6, 0.9)),
      },
    };
  }
  const height = sanitizeHeight(raw.height, HERO_DEFAULT_SIZING.height);
  const out: HeroSizingFixed = { mode: "fixed", width, height };
  if (isObj(raw.heightMobile))
    out.heightMobile = sanitizeHeight(raw.heightMobile, height);
  return out;
}

// ─── Couches ────────────────────────────────────────────────────────────
function sanitizeLayer(raw: unknown): HeroLayer | null {
  if (!isObj(raw)) return null;
  switch (raw.type) {
    case "image": {
      const layer: HeroImageLayer = {
        type: "image",
        src: cleanHeroSrc(raw.src),
        alt: str(raw.alt, 140),
        fit: pick(raw.fit, ["cover", "contain"] as const, "cover"),
        dim: round2(num(raw.dim, 0, 1, 1)),
        scrim: pick(raw.scrim, ["none", "left", "bottom"] as const, "none"),
      };
      const m = cleanHeroSrc(raw.srcMobile);
      if (m) layer.srcMobile = m;
      const d = cleanHeroSrc(raw.srcDark);
      if (d) layer.srcDark = d;
      return layer;
    }
    case "card": {
      const layer: HeroCardLayer = {
        type: "card",
        side: pick(raw.side, ["left", "right"] as const, "right"),
        src: cleanHeroSrc(raw.src),
        alt: str(raw.alt, 140),
        productId: str(raw.productId, 80) || null,
        showMeta: raw.showMeta === true,
      };
      const m = cleanHeroSrc(raw.srcMobile);
      if (m) layer.srcMobile = m;
      return layer;
    }
    case "tiles": {
      const main: HeroTilesMain | null = isObj(raw.main)
        ? {
            src: cleanHeroSrc(raw.main.src),
            link: cleanHeroLink(raw.main.link),
            label: str(raw.main.label, 60),
            ctaLabel: str(raw.main.ctaLabel, 40),
            fromProduct: raw.main.fromProduct === true,
          }
        : null;
      const items: HeroTile[] = [];
      for (const t of Array.isArray(raw.items) ? raw.items : []) {
        if (items.length >= HERO_MAX_TILES) break;
        if (!isObj(t)) continue;
        const src = cleanHeroSrc(t.src);
        if (!src) continue;
        items.push({
          src,
          label: str(t.label, 40),
          link: cleanHeroLink(t.link),
        });
      }
      return { type: "tiles", main, items };
    }
    case "text":
      return withTypo({
        type: "text",
        anchor: pick(
          raw.anchor,
          ["left-middle", "right-middle", "center", "bottom-left"] as const,
          "left-middle",
        ),
        tone: pick(raw.tone, ["auto", "light", "dark"] as const, "auto"),
        tag: str(raw.tag, 40),
        showTag: raw.showTag !== false,
        headline: str(raw.headline, 200),
        headlineLines: pick(
          raw.headlineLines,
          ["all", "first"] as const,
          "all",
        ),
        sub: str(raw.sub, 400),
        showSub: raw.showSub !== false,
        fromProduct: raw.fromProduct === true,
      }, raw);
    case "html":
      return { type: "html" };
    default:
      return null;
  }
}

function sanitizePoint(raw: unknown): HeroCtaPoint {
  const o: Obj = isObj(raw) ? raw : {};
  return { x: round1(num(o.x, 0, 100, 50)), y: round1(num(o.y, 0, 100, 50)) };
}

function sanitizeCta(raw: unknown, index: number): HeroCta | null {
  if (!isObj(raw)) return null;
  const label = str(raw.label, 40);
  if (!label) return null;
  let pos: HeroCta["pos"] = null;
  if (isObj(raw.pos) && isObj(raw.pos.desktop)) {
    pos = { desktop: sanitizePoint(raw.pos.desktop) };
    if (isObj(raw.pos.mobile)) pos.mobile = sanitizePoint(raw.pos.mobile);
  }
  return {
    id: str(raw.id, 40) || `cta-${index + 1}`,
    label,
    link: cleanHeroLink(raw.link),
    style: pick(
      raw.style,
      ["accent", "light", "dark", "ghost"] as const,
      "accent",
    ),
    pos,
  };
}

// ─── API publique du schéma ─────────────────────────────────────────────
/** Normalise N'IMPORTE QUELLE entrée en config valide (écritures admin). */
export function sanitizeHeroConfig(raw: unknown): HeroConfig {
  const r: Obj = isObj(raw) ? raw : {};

  const layers: HeroLayer[] = [];
  for (const l of Array.isArray(r.layers) ? r.layers : []) {
    if (layers.length >= HERO_MAX_LAYERS) break;
    const s = sanitizeLayer(l);
    if (!s) continue;
    // Hide-on (02) : conservé tel quel s'il est présent dans l'entrée.
    const h = cleanHeroHidden(isObj(l) ? (l as Obj).hidden : undefined);
    if (h) (s as { hidden?: HeroHidden }).hidden = h;
    layers.push(s);
  }

  const ctas: HeroCta[] = [];
  const seen = new Set<string>();
  for (const c of Array.isArray(r.ctas) ? r.ctas : []) {
    if (ctas.length >= HERO_MAX_CTAS) break;
    const s = sanitizeCta(c, ctas.length);
    if (!s) continue;
    const h = cleanHeroHidden(isObj(c) ? (c as Obj).hidden : undefined);
    if (h) s.hidden = h;
    let id = s.id;
    let n = 2;
    while (seen.has(id)) id = `${s.id}-${n++}`;
    s.id = id;
    seen.add(id);
    ctas.push(s);
  }

  return {
    v: HERO_SCHEMA_VERSION,
    origin: r.origin === "studio" ? "studio" : "legacy",
    sizing: sanitizeSizing(r.sizing),
    background: {
      gradient: cleanHeroBackground(
        isObj(r.background) ? r.background.gradient : "",
      ),
    },
    layers,
    ctas,
    ...(cleanHeroFont(r.fontFamily)
      ? { fontFamily: cleanHeroFont(r.fontFamily)! }
      : null),
    ...(cleanHeroFontUrl(r.fontUrl)
      ? { fontUrl: cleanHeroFontUrl(r.fontUrl)! }
      : null),
  };
}

/** Lecture depuis la base : null si la ligne n'est pas migrée ({"v":1} sans layers),
 *  version inconnue ou forme invalide => l'appelant retombe sur le legacy. */
export function parseHeroConfig(raw: unknown): HeroConfig | null {
  if (!isObj(raw)) return null;
  if (raw.v !== HERO_SCHEMA_VERSION) return null;
  if (!Array.isArray(raw.layers)) return null;
  return sanitizeHeroConfig(raw);
}

/** Typo fine (02) : ne retient que les clés EXPLICITEMENT fournies
 *  (les configs legacy gardent leur rendu historique au byte). */
function withTypo(
  layer: HeroTextLayer,
  raw: Obj,
): HeroTextLayer {
  if (raw.lineHeight !== undefined)
    layer.lineHeight = round1(num(raw.lineHeight, 0.9, 2, 1));
  if (raw.letterSpacing !== undefined)
    layer.letterSpacing = round2(num(raw.letterSpacing, -0.05, 0.1, 0));
  if (raw.align !== undefined)
    layer.align = pick(
      raw.align,
      ["left", "center", "right", "justify"] as const,
      "left",
    );
  if (raw.transform !== undefined)
    layer.transform = pick(
      raw.transform,
      ["none", "uppercase", "lowercase", "capitalize"] as const,
      "none",
    );
  if (raw.maxWidth !== undefined) {
    const v = str(raw.maxWidth, 12);
    layer.maxWidth = /^(\d+(\.\d+)?(ch|%|px|em|rem|vw)|none)$/.test(v)
      ? v
      : undefined;
    if (layer.maxWidth === undefined) delete layer.maxWidth;
  }
  if (raw.balance === true) layer.balance = true;
  const font = cleanHeroFont(raw.font);
  if (font) layer.font = font;
  if (raw.fontLocked === true) layer.fontLocked = true;
  if (raw.fontWeight !== undefined) {
    const w = Math.round(num(raw.fontWeight, 100, 900, 400) / 100) * 100;
    if (w !== 400) layer.fontWeight = w;
  }
  return layer;
}

// ─── Legacy → config (miroir TS du backfill SQL) ────────────────────────
export interface LegacyHeroFields {
  kind?: string | null;
  layout?: string | null;
  headline?: string | null;
  sub?: string | null;
  cta?: string | null;
  tag?: string | null;
  showTag?: boolean | null;
  image?: string | null;
  bgGradient?: string | null;
  linkUrl?: string | null;
  tiles?: unknown;
  productId?: string | null;
}

export function buildHeroConfigFromLegacy(l: LegacyHeroFields): HeroConfig {
  const kind = l.kind === "image" || l.kind === "grid" ? l.kind : "product";
  const split = l.layout === "split";
  const image = cleanHeroSrc(l.image);
  const tag = str(l.tag, 40);
  const showTag = l.showTag !== false;
  const headline = str(l.headline, 200);
  const sub = str(l.sub, 400);
  const ctaLabel = str(l.cta, 40) || "Discover";
  const link = cleanHeroLink(l.linkUrl);
  const productId = str(l.productId, 80) || null;

  let layers: HeroLayer[];
  let ctas: HeroCta[];

  if (kind === "grid") {
    const items: HeroTile[] = [];
    for (const t of Array.isArray(l.tiles) ? l.tiles : []) {
      if (items.length >= HERO_MAX_TILES) break;
      if (!isObj(t)) continue;
      const src = cleanHeroSrc(t.image);
      if (!src) continue;
      items.push({ src, label: str(t.label, 40), link: cleanHeroLink(t.link) });
    }
    const label = [headline.split("\n")[0].trim(), sub]
      .filter(Boolean)
      .join(" — ")
      .slice(0, 60);
    layers = [
      {
        type: "tiles",
        main: { src: image, link, label, ctaLabel, fromProduct: true },
        items,
      },
    ];
    ctas = [];
  } else if (kind === "image") {
    layers = [
      {
        type: "image",
        src: image,
        alt: "",
        fit: "cover",
        dim: 1,
        scrim: "bottom",
      },
      {
        type: "text",
        anchor: "bottom-left",
        tone: "light",
        tag,
        showTag,
        headline,
        headlineLines: "first",
        sub: "",
        showSub: false,
        fromProduct: true,
      },
    ];
    ctas = [
      {
        id: "cta-1",
        label: ctaLabel,
        link,
        style: "accent",
        pos: { desktop: { x: 96, y: 82 }, mobile: { x: 96, y: 84 } },
      },
    ];
  } else {
    const text: HeroTextLayer = {
      type: "text",
      anchor: "left-middle",
      tone: split ? "auto" : "light",
      tag,
      showTag,
      headline,
      headlineLines: "all",
      sub,
      showSub: true,
      fromProduct: true,
    };
    layers = split
      ? [
          {
            type: "card",
            side: "right",
            src: image,
            alt: "",
            productId,
            showMeta: false,
          },
          text,
        ]
      : [
          {
            type: "image",
            src: image,
            alt: "",
            fit: "cover",
            dim: 0.55,
            scrim: "left",
          },
          text,
        ];
    ctas = [{ id: "cta-1", label: ctaLabel, link, style: "accent", pos: null }];
  }

  return sanitizeHeroConfig({
    v: HERO_SCHEMA_VERSION,
    origin: "legacy",
    sizing: HERO_DEFAULT_SIZING,
    background: { gradient: l.bgGradient ?? "" },
    layers,
    ctas,
  });
}

/** Config effective d'un slide : la config stockée, sinon dérivée du legacy. */
export function resolveHeroConfig(
  p: LegacyHeroFields & { config?: HeroConfig | null },
): HeroConfig {
  return p.config ?? buildHeroConfigFromLegacy(p);
}

// ─── Budget 50 Ko (HTML + CSS critique) ─────────────────────────────────
export type HeroBudgetLevel = "ok" | "warn" | "over";
export interface HeroBudget {
  bytes: number;
  capBytes: number;
  warnBytes: number;
  pct: number; // 0..100+ (peut dépasser 100)
  level: HeroBudgetLevel;
}

export function utf8Bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

/** Même mesure que le CHECK SQL : octet_length(html) + octet_length(css). */
export function heroPayloadBudget(html: string, css: string): HeroBudget {
  const bytes = utf8Bytes(html || "") + utf8Bytes(css || "");
  const level: HeroBudgetLevel =
    bytes > HERO_PAYLOAD_CAP_BYTES
      ? "over"
      : bytes >= HERO_PAYLOAD_WARN_BYTES
        ? "warn"
        : "ok";
  return {
    bytes,
    capBytes: HERO_PAYLOAD_CAP_BYTES,
    warnBytes: HERO_PAYLOAD_WARN_BYTES,
    pct: Math.round((bytes / HERO_PAYLOAD_CAP_BYTES) * 1000) / 10,
    level,
  };
}

// ─── Planification (filtre runtime) ─────────────────────────────────────
export function isHeroScheduledLive(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  const s = startsAt ? Date.parse(startsAt) : NaN;
  const e = endsAt ? Date.parse(endsAt) : NaN;
  if (!Number.isNaN(s) && now < s) return false;
  if (!Number.isNaN(e) && now >= e) return false;
  return true;
}
