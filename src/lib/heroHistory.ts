// src/lib/heroHistory.ts — PUR : snapshot de version → config/brouillon + différences lisibles.
import {
  buildHeroConfigFromLegacy,
  parseHeroConfig,
  sanitizeHeroConfig,
  type HeroConfig,
  type HeroLayer,
  type HeroSizing,
} from "./heroSchema.ts";

/** Ligne de hero_promotions telle que stockée dans un snapshot (snake_case, sans html/css). */
export interface HeroVersionSnapshot {
  id?: string;
  product_id?: string | null;
  is_active?: boolean | null;
  starts_at?: string | null;
  ends_at?: string | null;
  config?: unknown;
  kind?: string | null;
  layout?: string | null;
  headline?: string | null;
  sub?: string | null;
  cta?: string | null;
  tag?: string | null;
  show_tag?: boolean | null;
  image?: string | null;
  bg_gradient?: string | null;
  link_url?: string | null;
  tiles?: unknown;
}

/** Config d'un snapshot : la config v1 si présente, sinon dérivée des colonnes legacy. */
export function snapshotConfig(s: HeroVersionSnapshot): HeroConfig {
  return (
    parseHeroConfig(s.config) ??
    buildHeroConfigFromLegacy({
      kind: s.kind,
      layout: s.layout,
      headline: s.headline,
      sub: s.sub,
      cta: s.cta,
      tag: s.tag,
      showTag: s.show_tag,
      image: s.image,
      bgGradient: s.bg_gradient,
      linkUrl: s.link_url,
      tiles: s.tiles,
      productId: s.product_id,
    })
  );
}

/** Ce que "Charger dans l'éditeur" applique : contenu seulement (pas la visibilité ni la planification). */
export function snapshotToDraftParts(s: HeroVersionSnapshot): {
  productId: string;
  config: HeroConfig;
} {
  return {
    productId: s.product_id ?? "",
    config: sanitizeHeroConfig({ ...snapshotConfig(s), origin: "studio" }),
  };
}

function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

const TYPE_LABEL: Record<string, string> = {
  image: "Image de fond",
  card: "Carte visuelle",
  tiles: "Tuiles",
  text: "Texte",
  html: "HTML collé",
};
const label = (l: HeroLayer) => TYPE_LABEL[l.type] ?? l.type;

function sizingLabel(s: HeroSizing): string {
  const w = s.width === "contained" ? "contenue" : "pleine";
  return s.mode === "auto"
    ? `auto ${s.ratio.desktop} (${w})`
    : `fixe ${s.height.value}${s.height.unit} (${w})`;
}

function firstTitle(c: HeroConfig): string {
  const t = c.layers.find((l) => l.type === "text");
  return t && t.type === "text" ? t.headline.replace(/\n/g, " / ") : "";
}

/**
 * Ce qui changerait si on chargeait `version` à la place de `current`
 * (lecture : « actuel → version »). [] = identique.
 */
export function diffHeroConfigs(
  current: HeroConfig,
  version: HeroConfig,
  ctx: { currentProductId?: string; versionProductId?: string } = {},
): string[] {
  const out: string[] = [];
  if ((ctx.currentProductId ?? "") !== (ctx.versionProductId ?? "")) {
    out.push("Produit principal : remplacé par celui de la version.");
  }
  if (stable(current.sizing) !== stable(version.sizing)) {
    out.push(
      `Dimensions : ${sizingLabel(current.sizing)} → ${sizingLabel(version.sizing)}`,
    );
  }
  if (current.background.gradient !== version.background.gradient)
    out.push("Fond modifié.");

  const n = Math.max(current.layers.length, version.layers.length);
  for (let i = 0; i < n; i++) {
    const a = current.layers[i];
    const b = version.layers[i];
    if (!a && b) out.push(`Couche ${i + 1} ajoutée : ${label(b)}`);
    else if (a && !b) out.push(`Couche ${i + 1} retirée : ${label(a)}`);
    else if (a && b && stable(a) !== stable(b)) {
      out.push(
        a.type !== b.type
          ? `Couche ${i + 1} : ${label(a)} → ${label(b)}`
          : `Couche ${i + 1} (${label(a)}) modifiée`,
      );
    }
  }

  const ta = firstTitle(current);
  const tb = firstTitle(version);
  if (ta !== tb) out.push(`Titre : « ${ta || "—"} » → « ${tb || "—"} »`);

  const la = current.ctas.map((c) => `« ${c.label} »`).join(", ") || "aucun";
  const lb = version.ctas.map((c) => `« ${c.label} »`).join(", ") || "aucun";
  if (la !== lb) out.push(`Boutons : ${la} → ${lb}`);
  else if (stable(current.ctas) !== stable(version.ctas)) {
    out.push("Boutons modifiés (position, lien ou style).");
  }
  return out;
}
