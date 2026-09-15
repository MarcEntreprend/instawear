// supabase/functions/sync-printful/_shared/materials.ts
// Classification matière : Printful catalog Variant.material[] -> slug
// canonique stable, indépendant de tout produit (règles par forme).
//
// Forme réelle vérifiée live (GET /products/1577) + doc
// `docs-API/printiful API doc openapi.json` (schéma Material) :
//   [{ "name": "Organic Ring Spun Combed", "percentage": 80.0 },
//    { "name": "Recycled Polyester", "percentage": 20.0 }]
// - `name` : string, minuscules, qualifiers INCLUS (organic/recycled/...).
// - `percentage` : number (blends réels).
// Toute réponse tierce est validée comme entrée hostile (API10) : tableaux
// et types vérifiés, jamais de crash sur forme inattendue (fail gracieux).

export interface RawMaterialEntry {
  name?: unknown;
  percentage?: unknown;
}

export interface ClassifiedMaterial {
  slug: string;
  label: string;
  percentage: number;
}

export interface MaterialAggregation {
  /** Slug dominant (null si rien d'exploitable). */
  top: string | null;
  /** Slugs uniques triés par % décroissant. */
  breakdown: ClassifiedMaterial[];
  /** Noms bruts non reconnus (traçabilité admin, capés). */
  unmapped: string[];
}

interface FiberDef {
  tokens: string[];
  slug: string;
  label: string;
}

/** Vocabulaire fermé des fibres (EN catalogue + FR robustesse). */
const FIBERS: FiberDef[] = [
  { tokens: ["cotton", "coton"], slug: "cotton", label: "Cotton" },
  { tokens: ["polyester"], slug: "polyester", label: "Polyester" },
  { tokens: ["ceramic", "ceramique", "stoneware", "porcelain"], slug: "ceramic", label: "Ceramic" },
  { tokens: ["fleece", "molleton"], slug: "fleece", label: "Fleece" },
  { tokens: ["wool", "laine"], slug: "wool", label: "Wool" },
  { tokens: ["linen", "lin", "flax"], slug: "linen", label: "Linen" },
  { tokens: ["nylon", "polyamide"], slug: "nylon", label: "Nylon" },
  { tokens: ["acrylic", "acrylique"], slug: "acrylic", label: "Acrylic" },
  { tokens: ["viscose", "rayon"], slug: "viscose", label: "Viscose" },
  { tokens: ["elastane", "spandex", "lycra", "elasthanne"], slug: "elastane", label: "Elastane" },
  { tokens: ["hemp", "chanvre"], slug: "hemp", label: "Hemp" },
  { tokens: ["bamboo", "bambou"], slug: "bamboo", label: "Bamboo" },
];

interface QualifierDef {
  tokens: string[];
  slug: string;
  label: string;
}

/** Un seul qualifier par slug, par priorité (déterministe). */
const QUALIFIERS: QualifierDef[] = [
  { tokens: ["organic", "bio", "biologique"], slug: "organic", label: "Organic" },
  { tokens: ["recycled", "recycle"], slug: "recycled", label: "Recycled" },
  { tokens: ["combed", "peigne", "ring", "spun"], slug: "combed", label: "Combed" },
];

/** Convention catalogue vérifiée live : peigné/ring-spun sans fibre
 *  explicite ("Organic Ring Spun Combed") = coton. Hypothèse documentée,
 *  pas devinette : ces intitulés n'existent que sur base coton. */
const IMPLIED_COTTON_TOKENS = ["combed", "peigne", "ring", "spun"];

/** Anciens libellés FR stockés (saisie libre admin) -> slug. */
const LEGACY_FR: Record<string, string> = {
  "coton bio": "cotton-organic",
  coton: "cotton",
  "coton peigne": "cotton-combed",
  "polyester recycle": "polyester-recycled",
  polyester: "polyester",
  "molleton bio": "fleece-organic",
  molleton: "fleece",
  ceramique: "ceramic",
};

function normToken(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function tokenize(raw: string): string[] {
  return normToken(raw)
    .split(/[^a-z]+/)
    .filter((t) => t.length > 0);
}

function slugifyRaw(raw: string): string {
  const s = normToken(raw)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s || "other";
}

function prettifyRaw(raw: string): string {
  const clean = raw.replace(/[_-]+/g, " ").trim();
  if (!clean) return "Other";
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function normalizeLegacyMaterial(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const key = normToken(value).replace(/\s+/g, " ").trim();
  return LEGACY_FR[key] ?? null;
}

/** Classe UN nom brut -> { slug, label, known }. Pur, sans I/O. */
export function classifyMaterialName(rawName: unknown): {
  slug: string;
  label: string;
  known: boolean;
} {
  const name = typeof rawName === "string" ? rawName : "";
  const tokens = tokenize(name);
  let fiber: FiberDef | null = null;
  for (const f of FIBERS) {
    if (f.tokens.some((t) => tokens.includes(t))) {
      fiber = f;
      break;
    }
  }
  let qualifier: QualifierDef | null = null;
  for (const q of QUALIFIERS) {
    if (q.tokens.some((t) => tokens.includes(t))) {
      qualifier = q;
      break;
    }
  }
  if (!fiber) {
    if (tokens.some((t) => IMPLIED_COTTON_TOKENS.includes(t))) {
      fiber = FIBERS[0]; // coton implicite (convention documentée ci-dessus)
    } else if (name.trim().length === 0) {
      return { slug: "other", label: "Other", known: false };
    } else {
      const slug = slugifyRaw(name);
      return { slug, label: prettifyRaw(name), known: false };
    }
  }
  const slug = qualifier ? `${fiber.slug}-${qualifier.slug}` : fiber.slug;
  const label = qualifier ? `${qualifier.label} ${fiber.label}` : fiber.label;
  return { slug, label, known: true };
}

function toPercentage(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Agrège les entries de TOUS les variants d'un produit. */
export function aggregateProductMaterials(
  entries: unknown,
): MaterialAggregation {
  const empty: MaterialAggregation = { top: null, breakdown: [], unmapped: [] };
  if (!Array.isArray(entries) || entries.length === 0) return empty;
  const bySlug = new Map<string, { label: string; percentage: number; known: boolean; raw: string }>();
  const unmappedSeen = new Set<string>();
  for (const e of entries) {
    if (e == null || typeof e !== "object") continue;
    const rec = e as Record<string, unknown>;
    const rawName = typeof rec.name === "string" ? rec.name : "";
    const pct = toPercentage(rec.percentage);
    const c = classifyMaterialName(rawName);
    const prev = bySlug.get(c.slug);
    if (!prev || pct > prev.percentage) {
      bySlug.set(c.slug, { label: c.label, percentage: pct, known: c.known, raw: rawName });
    }
    if (!c.known && rawName.trim().length > 0 && unmappedSeen.size < 10) {
      unmappedSeen.add(rawName.trim().slice(0, 80));
    }
  }
  if (bySlug.size === 0) return empty;
  const breakdown: ClassifiedMaterial[] = [...bySlug.entries()]
    .map(([slug, v]) => ({ slug, label: v.label, percentage: v.percentage }))
    .sort((a, b) => b.percentage - a.percentage);
  return { top: breakdown[0].slug, breakdown, unmapped: [...unmappedSeen] };
}
