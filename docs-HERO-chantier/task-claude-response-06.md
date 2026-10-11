# Hero Studio : lot 9 (historique, corbeille, annuler/rétablir, détection de conflit)

Ce lot contient quatre fonctions :

- **Historique par slide.** Les 30 dernières versions de la config, avec l'auteur et un résumé des différences par rapport à l'état actuel. « Charger dans l'éditeur » met la version en brouillon non enregistré, et tu enregistres pour la restaurer. « Annuler la restauration » revient à l'état d'avant.
- **Corbeille.** Un slide supprimé se récupère en brouillon, avec le même `id`, donc l'historique HTML suit.
- **Annuler / Rétablir de session** (Ctrl+Z, Ctrl+Y) dans le studio.
- **Détection de conflit.** Si un autre administrateur a enregistré le slide depuis ton ouverture, le studio te demande confirmation avant d'écraser. C'est utile sur ta base partagée.

**Numéro de migration : 20261041.** Elle est supérieure à ton 40, et ton 37 reste intact.

**HTML (garde super_admin).** L'historique du HTML est dans une table à part, `hero_html_versions`, lisible **uniquement par un `super_admin`** (RLS). La table de l'historique des slides ne contient **jamais** de HTML. Un éditeur peut donc consulter l'historique de la config mais jamais celui du HTML.

**Limites assumées :**

- Restaurer charge le contenu (config + produit) et **laisse la visibilité et la planification inchangées**. Un ancien slide ne se remet pas en ligne tout seul.
- Le HTML se restaure séparément, depuis le panneau « HTML collé → Historique HTML ».
- Un simple réordonnancement ne crée pas de version.
- Rétention : 30 versions par slide, 15 par HTML, 60 jours pour les slides supprimés.
- Sont enregistrées toutes les écritures sur la table, y compris celles de l'ancien formulaire Promotions.

---

## 1. Migration (backend) : nouveau fichier

```sql
-- supabase/migrations/20261041_hero_history.sql
-- Hero Studio — Lot 9 : historique des slides (config, JAMAIS de HTML), historique HTML
-- (super_admin uniquement) et corbeille. Idempotent. Pas de BEGIN/COMMIT.
-- Numéro 41 : après le 40 (modèles). 37 reste réservé à ton rollback.

-- ─── 1) Résumé léger d'un snapshot (la liste ne charge pas 30 Ko par ligne) ──
CREATE OR REPLACE FUNCTION public.hero_version_meta(snap jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'headline', left(btrim(split_part(COALESCE(snap->>'headline', ''), E'\n', 1)), 80),
    'layers',   CASE WHEN jsonb_typeof(snap->'config'->'layers') = 'array'
                     THEN jsonb_array_length(snap->'config'->'layers') ELSE 0 END,
    'ctas',     CASE WHEN jsonb_typeof(snap->'config'->'ctas') = 'array'
                     THEN jsonb_array_length(snap->'config'->'ctas') ELSE 0 END,
    'active',   COALESCE((snap->>'is_active')::boolean, false),
    'origin',   COALESCE(snap->'config'->>'origin', 'legacy'));
$$;

-- ─── 2) Historique des slides ───────────────────────────────────────────
-- Pas de FK : l'historique survit à la suppression du slide (corbeille).
CREATE TABLE IF NOT EXISTS public.hero_slide_versions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id   text        NOT NULL,
  reason     text        NOT NULL CHECK (reason IN ('create', 'update', 'delete')),
  snapshot   jsonb       NOT NULL
             CHECK (jsonb_typeof(snapshot) = 'object' AND octet_length(snapshot::text) <= 60000),
  meta       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hero_slide_versions_slide_idx
  ON public.hero_slide_versions (slide_id, created_at DESC);

ALTER TABLE public.hero_slide_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hero_slide_versions FROM anon, authenticated;
GRANT SELECT ON public.hero_slide_versions TO authenticated;
DROP POLICY IF EXISTS hero_slide_versions_select_admin ON public.hero_slide_versions;
CREATE POLICY hero_slide_versions_select_admin ON public.hero_slide_versions
  FOR SELECT TO authenticated USING (public.is_admin());

-- ─── 3) Historique HTML : super_admin SEUL (lecture comprise) ───────────
CREATE TABLE IF NOT EXISTS public.hero_html_versions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slide_id   text        NOT NULL,
  op         text        NOT NULL CHECK (op IN ('save', 'delete')),
  html       text        NOT NULL,
  css        text        NOT NULL,
  bytes      integer     GENERATED ALWAYS AS (octet_length(html) + octet_length(css)) STORED,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hero_html_versions_cap CHECK (octet_length(html) + octet_length(css) <= 51200)
);
CREATE INDEX IF NOT EXISTS hero_html_versions_slide_idx
  ON public.hero_html_versions (slide_id, created_at DESC);

ALTER TABLE public.hero_html_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hero_html_versions FROM anon, authenticated;
GRANT SELECT ON public.hero_html_versions TO authenticated;
DROP POLICY IF EXISTS hero_html_versions_select_super ON public.hero_html_versions;
CREATE POLICY hero_html_versions_select_super ON public.hero_html_versions
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- ─── 4) Baseline : une version "create" par slide / HTML existant ───────
INSERT INTO public.hero_slide_versions (slide_id, reason, snapshot, meta)
SELECT h.id, 'create', to_jsonb(h) - 'html' - 'css',
       public.hero_version_meta(to_jsonb(h) - 'html' - 'css')
FROM public.hero_promotions h
WHERE NOT EXISTS (SELECT 1 FROM public.hero_slide_versions v WHERE v.slide_id = h.id);

INSERT INTO public.hero_html_versions (slide_id, op, html, css)
SELECT x.slide_id, 'save', x.html, x.css
FROM public.hero_slide_html x
WHERE NOT EXISTS (SELECT 1 FROM public.hero_html_versions v WHERE v.slide_id = x.slide_id);

-- ─── 5) Trigger : enregistre chaque changement de slide ─────────────────
CREATE OR REPLACE FUNCTION public.hero_record_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snap jsonb;
  prev jsonb;
  sid  text;
  rsn  text;
  who  text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    snap := to_jsonb(OLD) - 'html' - 'css';
    sid := OLD.id;
    rsn := 'delete';
  ELSIF TG_OP = 'INSERT' THEN
    snap := to_jsonb(NEW) - 'html' - 'css';
    sid := NEW.id;
    rsn := 'create';
  ELSE
    snap := to_jsonb(NEW) - 'html' - 'css';
    sid := NEW.id;
    rsn := 'update';
    SELECT v.snapshot INTO prev
    FROM public.hero_slide_versions v
    WHERE v.slide_id = sid
    ORDER BY v.created_at DESC
    LIMIT 1;
    -- Réordonner (ou ré-enregistrer à l'identique) ne crée pas d'entrée.
    IF prev IS NOT NULL AND (prev - 'order') = (snap - 'order') THEN
      RETURN NULL;
    END IF;
  END IF;

  who := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';

  INSERT INTO public.hero_slide_versions (slide_id, reason, snapshot, meta, created_by)
  VALUES (sid, rsn, snap, public.hero_version_meta(snap), who);

  -- Rétention : 30 versions par slide ; slides supprimés : 60 jours.
  DELETE FROM public.hero_slide_versions v
  WHERE v.slide_id = sid
    AND v.id NOT IN (
      SELECT id FROM public.hero_slide_versions
      WHERE slide_id = sid ORDER BY created_at DESC LIMIT 30);
  DELETE FROM public.hero_slide_versions v
  WHERE v.created_at < now() - interval '60 days'
    AND NOT EXISTS (SELECT 1 FROM public.hero_promotions h WHERE h.id = v.slide_id);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS hero_promotions_record_version ON public.hero_promotions;
CREATE TRIGGER hero_promotions_record_version
  AFTER INSERT OR UPDATE OR DELETE ON public.hero_promotions
  FOR EACH ROW EXECUTE FUNCTION public.hero_record_version();

-- ─── 6) Trigger : enregistre chaque changement de HTML ──────────────────
-- Déclenché aussi par la suppression en cascade d'un slide : le HTML reste récupérable.
CREATE OR REPLACE FUNCTION public.hero_record_html_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid     text;
  h       text;
  c       text;
  o       text;
  last_op text;
  last_h  text;
  last_c  text;
  who     text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    sid := OLD.slide_id;
    h := OLD.html;
    c := OLD.css;
    o := 'delete';
  ELSE
    sid := NEW.slide_id;
    h := NEW.html;
    c := NEW.css;
    o := 'save';
    SELECT v.op, v.html, v.css INTO last_op, last_h, last_c
    FROM public.hero_html_versions v
    WHERE v.slide_id = sid
    ORDER BY v.created_at DESC
    LIMIT 1;
    IF last_op = 'save' AND last_h IS NOT DISTINCT FROM h AND last_c IS NOT DISTINCT FROM c THEN
      RETURN NULL;
    END IF;
  END IF;

  who := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';

  INSERT INTO public.hero_html_versions (slide_id, op, html, css, created_by)
  VALUES (sid, o, h, c, who);

  -- Rétention : 15 versions par slide ; slides supprimés : 60 jours.
  DELETE FROM public.hero_html_versions v
  WHERE v.slide_id = sid
    AND v.id NOT IN (
      SELECT id FROM public.hero_html_versions
      WHERE slide_id = sid ORDER BY created_at DESC LIMIT 15);
  DELETE FROM public.hero_html_versions v
  WHERE v.created_at < now() - interval '60 days'
    AND NOT EXISTS (SELECT 1 FROM public.hero_promotions p WHERE p.id = v.slide_id);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS hero_slide_html_record_version ON public.hero_slide_html;
CREATE TRIGGER hero_slide_html_record_version
  AFTER INSERT OR UPDATE OR DELETE ON public.hero_slide_html
  FOR EACH ROW EXECUTE FUNCTION public.hero_record_html_version();

-- ─── 7) Corbeille : lister et récupérer les slides supprimés (admin) ────
CREATE OR REPLACE FUNCTION public.hero_deleted_slides()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_deleted_slides: admin requis' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC)
    FROM (
      SELECT DISTINCT ON (v.slide_id)
             v.id AS version_id, v.slide_id, v.meta, v.created_by, v.created_at
      FROM public.hero_slide_versions v
      WHERE v.reason = 'delete'
        AND NOT EXISTS (SELECT 1 FROM public.hero_promotions h WHERE h.id = v.slide_id)
      ORDER BY v.slide_id, v.created_at DESC
    ) d), '[]'::jsonb);
END;
$$;

-- Recrée le slide avec son id d'origine, TOUJOURS en brouillon (is_active = false),
-- à la fin de la file. Le HTML se récupère ensuite via l'historique HTML (super_admin).
CREATE OR REPLACE FUNCTION public.hero_restore_deleted(p_version_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.hero_slide_versions%ROWTYPE;
  r public.hero_promotions%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_restore_deleted: admin requis' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v FROM public.hero_slide_versions
  WHERE id = p_version_id AND reason = 'delete';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'hero_restore_deleted: version introuvable';
  END IF;
  IF EXISTS (SELECT 1 FROM public.hero_promotions h WHERE h.id = v.slide_id) THEN
    RAISE EXCEPTION 'hero_restore_deleted: ce slide existe déjà';
  END IF;

  SELECT * INTO r FROM jsonb_populate_record(NULL::public.hero_promotions, v.snapshot);

  INSERT INTO public.hero_promotions
    (id, product_id, title, headline, sub, cta, bg_gradient, tag, image, "order",
     show_tag, show_title, is_active, layout, kind, link_url, tiles, config, starts_at, ends_at)
  VALUES
    (r.id,
     (SELECT p.id FROM public.products p WHERE p.id = r.product_id),
     r.title, r.headline, r.sub, r.cta, r.bg_gradient, r.tag, r.image,
     COALESCE((SELECT max(h."order") + 1 FROM public.hero_promotions h), 0),
     COALESCE(r.show_tag, true), COALESCE(r.show_title, true), false,
     COALESCE(r.layout, 'full'), COALESCE(r.kind, 'product'), r.link_url, r.tiles,
     COALESCE(r.config, '{"v":1}'::jsonb), r.starts_at, r.ends_at);

  RETURN r.id;
END;
$$;

REVOKE ALL ON FUNCTION public.hero_deleted_slides() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.hero_restore_deleted(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hero_deleted_slides() TO authenticated;
GRANT EXECUTE ON FUNCTION public.hero_restore_deleted(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
```

**Vérification** (à me coller) :

```sql
-- A. RLS active, 2 tables ; 2 triggers d'historique présents
SELECT relname, relrowsecurity FROM pg_class
WHERE relname IN ('hero_slide_versions', 'hero_html_versions');
SELECT tgname FROM pg_trigger
WHERE tgrelid IN ('public.hero_promotions'::regclass, 'public.hero_slide_html'::regclass)
  AND NOT tgisinternal ORDER BY 1;
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('hero_slide_versions', 'hero_html_versions') ORDER BY 1, 2;

-- B. Baseline : 1 version "create" par slide existant
SELECT slide_id, reason, meta FROM public.hero_slide_versions ORDER BY created_at;

-- C. Un UPDATE identique ne crée rien ; un vrai changement crée 1 version (puis ROLLBACK)
BEGIN;
SELECT count(*) AS avant FROM public.hero_slide_versions;
UPDATE public.hero_promotions SET is_active = is_active;
SELECT count(*) AS apres_update_identique FROM public.hero_slide_versions;   -- = avant
UPDATE public.hero_promotions SET tag = COALESCE(tag, '') || ' ' WHERE id = (SELECT id FROM public.hero_promotions LIMIT 1);
SELECT count(*) AS apres_vrai_changement FROM public.hero_slide_versions;    -- = avant + 1
ROLLBACK;
```

**Rollback** (en cas de problème) :

```sql
DROP TRIGGER IF EXISTS hero_promotions_record_version ON public.hero_promotions;
DROP TRIGGER IF EXISTS hero_slide_html_record_version ON public.hero_slide_html;
DROP FUNCTION IF EXISTS public.hero_record_version();
DROP FUNCTION IF EXISTS public.hero_record_html_version();
DROP FUNCTION IF EXISTS public.hero_deleted_slides();
DROP FUNCTION IF EXISTS public.hero_restore_deleted(uuid);
DROP FUNCTION IF EXISTS public.hero_version_meta(jsonb);
DROP TABLE IF EXISTS public.hero_slide_versions;
DROP TABLE IF EXISTS public.hero_html_versions;
```

---

## 2. `src/lib/heroHistory.ts` (nouveau, pur, testé en Node)

```ts
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
```

---

## 3. `src/api/supabaseApi.ts` : 2 modifications

**1)** Juste après la ligne `} from "../lib/heroSchema";` (fin de l'import de `heroSchema`), ajoute :

```ts
import type { HeroVersionSnapshot } from "../lib/heroHistory";
```

**2)** Juste **avant** la ligne `export const reviewApi = {`, ajoute :

```ts
// ─── Hero : historique, corbeille, historique HTML (super_admin) ──────────────
export interface HeroVersionRow {
  id: string;
  slideId: string;
  reason: "create" | "update" | "delete";
  createdBy: string | null;
  createdAt: string;
  meta: {
    headline?: string;
    layers?: number;
    ctas?: number;
    active?: boolean;
    origin?: string;
  };
}
export interface HeroDeletedRow {
  versionId: string;
  slideId: string;
  createdBy: string | null;
  createdAt: string;
  meta: HeroVersionRow["meta"];
}
export interface HeroHtmlVersionRow {
  id: string;
  op: "save" | "delete";
  createdBy: string | null;
  createdAt: string;
  bytes: number;
}

const mapVersionRow = (r: any): HeroVersionRow => ({
  id: r.id,
  slideId: r.slide_id,
  reason: r.reason,
  createdBy: r.created_by ?? null,
  createdAt: r.created_at,
  meta: r.meta && typeof r.meta === "object" ? r.meta : {},
});

export const heroHistoryApi = {
  /** Versions d'un slide (légères : sans snapshot). Admin (RLS). */
  async list(slideId: string, limit = 30): Promise<HeroVersionRow[]> {
    const { data, error } = await supabase
      .from("hero_slide_versions")
      .select("id, slide_id, reason, meta, created_by, created_at")
      .eq("slide_id", slideId)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(limit, 50)));
    if (error) throw error;
    return (data ?? []).map(mapVersionRow);
  },
  /** Dernière version (détection de conflit d'édition). */
  async latest(
    slideId: string,
  ): Promise<{
    id: string;
    createdBy: string | null;
    createdAt: string;
  } | null> {
    const { data, error } = await supabase
      .from("hero_slide_versions")
      .select("id, created_by, created_at")
      .eq("slide_id", slideId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      createdBy: data.created_by ?? null,
      createdAt: data.created_at,
    };
  },
  async getSnapshot(versionId: string): Promise<HeroVersionSnapshot | null> {
    const { data, error } = await supabase
      .from("hero_slide_versions")
      .select("snapshot")
      .eq("id", versionId)
      .maybeSingle();
    if (error || !data) return null;
    return data.snapshot as HeroVersionSnapshot;
  },
  /** Corbeille : slides supprimés (RPC admin). */
  async deleted(): Promise<HeroDeletedRow[]> {
    const { data, error } = await supabase.rpc("hero_deleted_slides");
    if (error) throw error;
    return ((data as any[]) ?? []).map((r) => ({
      versionId: r.version_id,
      slideId: r.slide_id,
      createdBy: r.created_by ?? null,
      createdAt: r.created_at,
      meta: r.meta && typeof r.meta === "object" ? r.meta : {},
    }));
  },
  /** Recrée le slide supprimé (même id, TOUJOURS en brouillon). Renvoie son id. */
  async restoreDeleted(versionId: string): Promise<string> {
    const { data, error } = await supabase.rpc("hero_restore_deleted", {
      p_version_id: versionId,
    });
    if (error) throw error;
    return String(data);
  },
  // ── HTML : super_admin (garde ici + RLS super_admin sur hero_html_versions) ──
  async htmlList(slideId: string): Promise<HeroHtmlVersionRow[]> {
    await requireSuperAdmin();
    const { data, error } = await supabase
      .from("hero_html_versions")
      .select("id, op, created_by, created_at, bytes")
      .eq("slide_id", slideId)
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id,
      op: r.op,
      createdBy: r.created_by ?? null,
      createdAt: r.created_at,
      bytes: Number(r.bytes) || 0,
    }));
  },
  async htmlGet(id: string): Promise<{ html: string; css: string } | null> {
    await requireSuperAdmin();
    const { data, error } = await supabase
      .from("hero_html_versions")
      .select("html, css")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return { html: data.html ?? "", css: data.css ?? "" };
  },
};
```

---

## 4. `src/admin/HeroHistoryPanel.tsx` (nouveau)

```tsx
// src/admin/HeroHistoryPanel.tsx — historique d'un slide + corbeille (Hero Studio, lot 9).
import { useEffect, useState, type CSSProperties } from "react";
import { RotateCcw } from "lucide-react";
import {
  heroHistoryApi,
  type HeroDeletedRow,
  type HeroVersionRow,
} from "../api/supabaseApi";
import {
  diffHeroConfigs,
  snapshotConfig,
  snapshotToDraftParts,
} from "../lib/heroHistory";
import type { HeroConfig } from "../lib/heroSchema";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const REASON = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
} as const;

const small: CSSProperties = {
  fontSize: 12,
  color: "var(--color-ink3)",
  margin: 0,
};
const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 11,
  cursor: "pointer",
};

const summary = (m: HeroVersionRow["meta"]) =>
  `« ${m.headline || "sans titre"} » · ${m.layers ?? 0} couche(s) · ${m.ctas ?? 0} bouton(s)${
    m.active === false ? " · hors ligne" : ""
  }`;

export default function HeroHistoryPanel({
  slideId,
  current,
  currentProductId,
  refreshKey,
  onLoad,
}: {
  slideId: string | null;
  current: HeroConfig;
  currentProductId: string;
  refreshKey: number;
  onLoad: (
    parts: { productId: string; config: HeroConfig },
    when: string,
  ) => void;
}) {
  const [rows, setRows] = useState<HeroVersionRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setErr(null);
    setOpen(null);
    setDiffs({});
    if (!slideId) return;
    let alive = true;
    heroHistoryApi.list(slideId).then(
      (r) => alive && setRows(r),
      (e) =>
        alive &&
        setErr(
          e?.message ||
            "Historique indisponible (migration du lot 9 non appliquée ?).",
        ),
    );
    return () => {
      alive = false;
    };
  }, [slideId, refreshKey]);

  const toggleDiff = async (row: HeroVersionRow) => {
    if (open === row.id) {
      setOpen(null);
      return;
    }
    setOpen(row.id);
    if (diffs[row.id]) return;
    setBusy(row.id);
    try {
      const snap = await heroHistoryApi.getSnapshot(row.id);
      if (!snap) throw new Error("Version introuvable.");
      const lines = diffHeroConfigs(current, snapshotConfig(snap), {
        currentProductId,
        versionProductId: snap.product_id ?? "",
      });
      setDiffs((d) => ({ ...d, [row.id]: lines }));
    } catch (e: any) {
      setErr(e?.message || "Lecture impossible.");
    } finally {
      setBusy(null);
    }
  };

  const load = async (row: HeroVersionRow) => {
    setBusy(row.id);
    try {
      const snap = await heroHistoryApi.getSnapshot(row.id);
      if (!snap) throw new Error("Version introuvable.");
      onLoad(snapshotToDraftParts(snap), fmt(row.createdAt));
    } catch (e: any) {
      setErr(e?.message || "Chargement impossible.");
    } finally {
      setBusy(null);
    }
  };

  if (!slideId)
    return (
      <p style={small}>
        L'historique apparaît après le premier enregistrement.
      </p>
    );
  if (err) return <p style={{ ...small, color: "#991b1b" }}>{err}</p>;
  if (rows === null) return <p style={small}>Chargement…</p>;
  if (rows.length === 0)
    return <p style={small}>Aucune version enregistrée.</p>;

  return (
    <>
      <p style={small}>
        {rows.length} dernière(s) version(s). « Charger » met la version dans
        l'éditeur sans l'enregistrer ; la visibilité et la planification ne
        changent pas.
      </p>
      {rows.map((r, i) => (
        <div
          key={r.id}
          style={{
            padding: 8,
            borderRadius: 10,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface2)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{ fontSize: 12, color: "var(--color-ink)", fontWeight: 700 }}
          >
            {fmt(r.createdAt)} · {REASON[r.reason]}
            {i === 0 && r.reason !== "delete" ? " · actuelle" : ""}
          </div>
          <div style={small}>
            {r.createdBy ?? "—"} · {summary(r.meta)}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              style={btn}
              disabled={busy === r.id}
              onClick={() => toggleDiff(r)}
            >
              {open === r.id ? "Masquer" : "Changements"}
            </button>
            <button
              type="button"
              style={btn}
              disabled={busy === r.id}
              onClick={() => load(r)}
            >
              <RotateCcw size={11} /> Charger dans l'éditeur
            </button>
          </div>
          {open === r.id && (
            <div style={{ fontSize: 12, color: "var(--color-ink2)" }}>
              {diffs[r.id] === undefined ? (
                "Calcul…"
              ) : diffs[r.id].length === 0 ? (
                "Identique au contenu actuel."
              ) : (
                <>
                  <div style={{ fontWeight: 700 }}>
                    Si tu charges cette version :
                  </div>
                  {diffs[r.id].map((l, k) => (
                    <div key={k}>• {l}</div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/** Corbeille : slides supprimés, récupérables en brouillon (même id). */
export function HeroTrashPanel({
  refreshKey,
  onRecovered,
}: {
  refreshKey: number;
  onRecovered: (slideId: string) => void;
}) {
  const [rows, setRows] = useState<HeroDeletedRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    heroHistoryApi.deleted().then(setRows, () => setRows([]));
  }, [refreshKey]);

  if (rows.length === 0) return null;

  const recover = async (r: HeroDeletedRow) => {
    if (!window.confirm("Récupérer ce slide en brouillon ?")) return;
    setBusy(r.versionId);
    setErr(null);
    try {
      const id = await heroHistoryApi.restoreDeleted(r.versionId);
      onRecovered(id);
    } catch (e: any) {
      setErr(e?.message || "Récupération impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <details style={{ marginTop: 6 }}>
      <summary
        style={{
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--color-ink2)",
        }}
      >
        Corbeille ({rows.length})
      </summary>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginTop: 8,
        }}
      >
        {rows.map((r) => (
          <div
            key={r.versionId}
            style={{
              padding: 8,
              borderRadius: 10,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface2)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--color-ink)",
              }}
            >
              {r.meta.headline || "Slide sans titre"}
            </div>
            <div style={small}>
              Supprimé le {fmt(r.createdAt)} par {r.createdBy ?? "—"}
            </div>
            <button
              type="button"
              style={btn}
              disabled={busy === r.versionId}
              onClick={() => recover(r)}
            >
              <RotateCcw size={11} /> Récupérer
            </button>
          </div>
        ))}
        {err && <p style={{ ...small, color: "#991b1b" }}>{err}</p>}
        <p style={small}>
          Le HTML collé se retrouve dans « HTML collé → Historique HTML »
          (super_admin).
        </p>
      </div>
    </details>
  );
}
```

---

## 5. `src/admin/HeroHtmlPanel.tsx` : historique du HTML, 4 modifications

**1)** Remplace la ligne `import { AlertTriangle, FileUp, Ruler, ShieldCheck } from "lucide-react";` par :

```tsx
import {
  AlertTriangle,
  FileUp,
  History,
  Ruler,
  ShieldCheck,
} from "lucide-react";
```

**2)** Remplace la ligne `import { heroHtmlApi } from "../api/supabaseApi";` par :

```tsx
import {
  heroHistoryApi,
  heroHtmlApi,
  type HeroHtmlVersionRow,
} from "../api/supabaseApi";
```

**3)** Juste après la ligne `const readOnly = !isSuper;`, ajoute :

```tsx
const [hist, setHist] = useState<HeroHtmlVersionRow[] | null>(null);
const [histOpen, setHistOpen] = useState(false);

const toggleHist = async () => {
  if (histOpen) {
    setHistOpen(false);
    return;
  }
  setHistOpen(true);
  if (!slideId) {
    setHist([]);
    return;
  }
  try {
    setHist(await heroHistoryApi.htmlList(slideId));
  } catch (e: any) {
    setNote({ ok: false, lines: [e?.message || "Historique indisponible."] });
  }
};

const loadHtmlVersion = async (id: string) => {
  setBusy(true);
  try {
    const v = await heroHistoryApi.htmlGet(id);
    if (!v) throw new Error("Version introuvable.");
    setHtml(v.html);
    setCss(v.css);
    setNote({
      ok: true,
      lines: [
        "Version chargée dans les champs. Enregistre le slide pour la restaurer.",
      ],
    });
  } catch (e: any) {
    setNote({ ok: false, lines: [e?.message || "Chargement impossible."] });
  } finally {
    setBusy(false);
  }
};
```

**4)** Juste **avant** la ligne `{note && (` (la seule du JSX), ajoute :

```tsx
{
  isSuper && slideId && (
    <div>
      <button type="button" style={smallBtn} onClick={toggleHist}>
        <History size={13} /> Historique HTML
      </button>
      {histOpen && (
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {hist === null
            ? "Chargement…"
            : hist.length === 0
              ? "Aucune version enregistrée."
              : hist.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {new Date(v.createdAt).toLocaleString("fr-FR")} ·{" "}
                      {v.createdBy ?? "—"} · {v.bytes} o
                      {v.op === "delete" ? " · avant suppression" : ""}
                    </span>
                    <button
                      type="button"
                      style={smallBtn}
                      disabled={busy}
                      onClick={() => loadHtmlVersion(v.id)}
                    >
                      Charger
                    </button>
                  </div>
                ))}
        </div>
      )}
    </div>
  );
}
```

---

## 6. `src/admin/HeroStudioPage.tsx` : 10 modifications

**1) Icônes.** Dans l'import `lucide-react`, juste après la ligne `  Ruler,`, ajoute :

```tsx
  Undo2,
  Redo2,
```

**2) Imports.** Remplace le bloc qui **commence** par `import {` suivi de `  adminUserApi,` et se termine par `} from "../api/supabaseApi";` par :

```tsx
import {
  adminUserApi,
  heroHistoryApi,
  heroHtmlApi,
  heroPromotionsApi,
  heroTemplatesApi,
  productApi,
  type HeroUserTemplate,
} from "../api/supabaseApi";
```

Puis juste après la ligne `import HeroHtmlPanel, { type HeroHtmlPanelHandle } from "./HeroHtmlPanel";`, ajoute :

```tsx
import HeroHistoryPanel, { HeroTrashPanel } from "./HeroHistoryPanel";
```

**3) États.** Juste après la ligne `const [draftSeq, setDraftSeq] = useState(0);`, ajoute :

```tsx
const [histTick, setHistTick] = useState(0);
const [restoreBackup, setRestoreBackup] = useState<Draft | null>(null);
const seenVersion = useRef<string | null>(null);
const draftRef = useRef<Draft | null>(null);
draftRef.current = draft;
const undoStack = useRef<HeroConfig[]>([]);
const redoStack = useRef<HeroConfig[]>([]);
const lastPush = useRef(0);
const [, setUndoTick] = useState(0);
```

**4) `patchConfig` + annuler/rétablir + chargement d'une version.** Remplace le bloc qui **commence** par `const patchConfig = (fn: (c: HeroConfig) => HeroConfig) =>` et se termine par `setDraft((d) => (d ? { ...d, config: fn(d.config) } : d));` par :

```tsx
// ── Annuler / Rétablir (session) : les modifs rapprochées (≤ 600 ms) = un seul pas. ──
const pushUndo = (c: HeroConfig) => {
  const now = Date.now();
  if (now - lastPush.current > 600) {
    undoStack.current.push(c);
    if (undoStack.current.length > 60) undoStack.current.shift();
  }
  lastPush.current = now;
  redoStack.current = [];
  setUndoTick((n) => n + 1);
};
const patchConfig = (fn: (c: HeroConfig) => HeroConfig) => {
  const d = draftRef.current;
  if (!d) return;
  const next = fn(d.config);
  if (next === d.config) return;
  pushUndo(d.config);
  const nd = { ...d, config: next };
  draftRef.current = nd;
  setDraft(nd);
};
const undo = () => {
  const d = draftRef.current;
  const prev = undoStack.current.pop();
  if (!d || !prev) return;
  redoStack.current.push(d.config);
  lastPush.current = 0;
  const nd = { ...d, config: prev };
  draftRef.current = nd;
  setDraft(nd);
  setUndoTick((n) => n + 1);
};
const redo = () => {
  const d = draftRef.current;
  const next = redoStack.current.pop();
  if (!d || !next) return;
  undoStack.current.push(d.config);
  lastPush.current = 0;
  const nd = { ...d, config: next };
  draftRef.current = nd;
  setDraft(nd);
  setUndoTick((n) => n + 1);
};

// Ctrl+Z / Ctrl+Y (ou Ctrl+Maj+Z) — jamais pendant la saisie dans un champ.
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const t = e.target as HTMLElement | null;
    if (
      t &&
      (t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable)
    )
      return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (k === "y" || (k === "z" && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
});

// Changer de slide : piles d'annulation et sauvegarde de restauration repartent à zéro.
useEffect(() => {
  undoStack.current = [];
  redoStack.current = [];
  lastPush.current = 0;
  setUndoTick((n) => n + 1);
  setRestoreBackup(null);
}, [draft?.id, draftSeq]);

// Détection de conflit : dernière version vue à l'ouverture du slide.
useEffect(() => {
  seenVersion.current = null;
  if (!draft?.id) return;
  let alive = true;
  heroHistoryApi.latest(draft.id).then(
    (l) => {
      if (alive) seenVersion.current = l?.id ?? null;
    },
    () => {},
  );
  return () => {
    alive = false;
  };
}, [draft?.id]);

// Charge une version de l'historique dans l'éditeur (non enregistrée).
const loadVersion = (
  parts: { productId: string; config: HeroConfig },
  when: string,
) => {
  const cur = draftRef.current;
  if (!cur) return;
  setRestoreBackup(cur);
  pushUndo(cur.config);
  const nd = { ...cur, productId: parts.productId, config: parts.config };
  draftRef.current = nd;
  setDraft(nd);
  setLayerSel(0);
  setSelCta(null);
  setMsg({
    ok: true,
    text: `Version du ${when} chargée (visibilité et planification inchangées). Enregistre pour la restaurer, ou « Annuler la restauration ».`,
  });
};
```

**5) Enregistrement : conflit + historique.**

a) Juste **avant** la ligne `const config = sanitizeHeroConfig({ ...draft.config, origin: "studio" });`, ajoute :

```tsx
// Conflit : un autre admin a-t-il enregistré ce slide depuis ton ouverture ?
if (draft.id) {
  const latest = await heroHistoryApi.latest(draft.id).catch(() => null);
  if (latest && seenVersion.current && latest.id !== seenVersion.current) {
    const ok = window.confirm(
      `Ce slide a été modifié par ${latest.createdBy ?? "un autre administrateur"} le ${new Date(latest.createdAt).toLocaleString("fr-FR")} depuis ton ouverture.\nÉcraser ses changements ?`,
    );
    if (!ok) return;
  }
}
```

b) Juste **après** la ligne `await load(saved.id);` (celle de `save`), ajoute :

```tsx
seenVersion.current =
  (await heroHistoryApi.latest(saved.id).catch(() => null))?.id ?? null;
setRestoreBackup(null);
setHistTick((n) => n + 1);
```

**6) Suppression.** Juste après la ligne `await load();` (dans `remove`), ajoute :

```tsx
setHistTick((n) => n + 1);
```

**7) Boutons d'en-tête.** Juste **avant** la ligne `<button type="button" onClick={duplicate} style={btn} title="Créer une copie en brouillon">`, ajoute :

```tsx
            <button type="button" onClick={undo} disabled={undoStack.current.length === 0} style={btn} title="Annuler (Ctrl+Z)" aria-label="Annuler">
              <Undo2 size={14} />
            </button>
            <button type="button" onClick={redo} disabled={redoStack.current.length === 0} style={btn} title="Rétablir (Ctrl+Y)" aria-label="Rétablir">
              <Redo2 size={14} />
            </button>
            {restoreBackup && (
              <button
                type="button"
                style={btn}
                onClick={() => {
                  const bk = restoreBackup;
                  draftRef.current = bk;
                  setDraft(bk);
                  setRestoreBackup(null);
                  setMsg({ ok: true, text: "Restauration annulée." });
                }}
              >
                Annuler la restauration
              </button>
            )}
```

**8) Corbeille.** Juste après la ligne `{slides.length === 0 && !draft && <p style={{ fontSize: 12, color: "var(--color-ink4)" }}>Aucun slide. Crée le premier avec un modèle.</p>}`, ajoute :

```tsx
<HeroTrashPanel
  refreshKey={histTick}
  onRecovered={async (id) => {
    await load(id);
    setHistTick((n) => n + 1);
    setMsg({
      ok: true,
      text: "Slide récupéré en brouillon (le HTML, s'il y en avait, se restaure via l'historique HTML).",
    });
  }}
/>
```

**9) Historique.** Juste **avant** la ligne `<Section title="Contrôle qualité" open={false}>`, ajoute :

```tsx
<Section title="Historique" open={false}>
  <HeroHistoryPanel
    slideId={draft.id}
    current={config}
    currentProductId={draft.productId}
    refreshKey={histTick}
    onLoad={loadVersion}
  />
</Section>
```

**10) Vérification de syntaxe.** Les modifications 4 et 5-b utilisent `heroHistoryApi` : vérifie que l'import (modification 2) est bien présent.

---

## 7. `tests/hero-lot9.test.ts` (nouveau)

```ts
// tests/hero-lot9.test.ts — historique : logique pure + gardes statiques de la migration 41.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import {
  snapshotConfig,
  snapshotToDraftParts,
  diffHeroConfigs,
} from "../src/lib/heroHistory.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sql = readFileSync(
  join(root, "supabase/migrations/20261041_hero_history.sql"),
  "utf8",
);
const IMG = "https://cdn.example.com/a.webp";

const A = sanitizeHeroConfig({
  origin: "studio",
  sizing: { mode: "fixed", width: "full", height: { unit: "vh", value: 78 } },
  background: { gradient: "linear-gradient(135deg, #111 0%, #222 100%)" },
  layers: [
    { type: "image", src: IMG },
    { type: "text", headline: "Titre A\nligne 2" },
  ],
  ctas: [{ label: "Go" }],
});

test("snapshot : la config v1 est prioritaire, sinon dérivée des colonnes legacy", () => {
  const v1 = snapshotConfig({ config: A });
  assert.equal(v1.layers.length, 2);
  const legacy = snapshotConfig({
    config: { v: 1 },
    kind: "image",
    image: IMG,
    headline: "Hi",
    cta: "Voir",
  });
  assert.equal(legacy.layers[0].type, "image");
  assert.equal(legacy.ctas[0].label, "Voir");
});

test("snapshotToDraftParts : contenu seulement, origin studio, productId vide si null", () => {
  const p = snapshotToDraftParts({
    config: { ...A, origin: "legacy" },
    product_id: null,
    is_active: false,
  });
  assert.equal(p.productId, "");
  assert.equal(p.config.origin, "studio");
  assert.equal(
    snapshotToDraftParts({ config: A, product_id: "p1" }).productId,
    "p1",
  );
});

test("diff : identique → [] ; changements → lignes lisibles (actuel → version)", () => {
  assert.deepEqual(
    diffHeroConfigs(A, A, { currentProductId: "p1", versionProductId: "p1" }),
    [],
  );

  const B = sanitizeHeroConfig({
    origin: "studio",
    sizing: {
      mode: "auto",
      width: "contained",
      ratio: { desktop: 2.4, mobile: 0.9 },
    },
    background: { gradient: "linear-gradient(135deg, #fff 0%, #eee 100%)" },
    layers: [
      { type: "image", src: IMG },
      { type: "text", headline: "Titre B" },
      { type: "card", src: IMG },
    ],
    ctas: [{ label: "Acheter" }],
  });
  const d = diffHeroConfigs(A, B, {
    currentProductId: "p1",
    versionProductId: "",
  });
  const all = d.join("\n");
  assert.ok(/Produit principal/.test(all));
  assert.ok(
    /Dimensions : fixe 78vh \(pleine\) → auto 2\.4 \(contenue\)/.test(all),
  );
  assert.ok(/Fond modifié/.test(all));
  assert.ok(/Couche 2 \(Texte\) modifiée/.test(all));
  assert.ok(/Couche 3 ajoutée : Carte visuelle/.test(all));
  assert.ok(/Titre : « Titre A \/ ligne 2 » → « Titre B »/.test(all));
  assert.ok(/Boutons : « Go » → « Acheter »/.test(all));
});

test("diff : ordre des clés sans effet, position de bouton détectée", () => {
  const C1 = sanitizeHeroConfig({
    origin: "studio",
    ctas: [{ label: "Go", pos: { desktop: { x: 10, y: 20 } } }],
  });
  const C2 = sanitizeHeroConfig({
    origin: "studio",
    ctas: [{ pos: { desktop: { y: 20, x: 10 } }, label: "Go" }],
  });
  assert.deepEqual(diffHeroConfigs(C1, C2), []);
  const C3 = sanitizeHeroConfig({
    origin: "studio",
    ctas: [{ label: "Go", pos: { desktop: { x: 90, y: 20 } } }],
  });
  assert.deepEqual(diffHeroConfigs(C1, C3), [
    "Boutons modifiés (position, lien ou style).",
  ]);
});

test("SQL lot 9 : RLS partout, HTML = super_admin seul, jamais d'accès anon", () => {
  assert.equal((sql.match(/ENABLE ROW LEVEL SECURITY/g) || []).length, 2);
  assert.ok(
    sql.includes(
      "REVOKE ALL ON public.hero_html_versions FROM anon, authenticated",
    ),
  );
  assert.ok(
    sql.includes(
      "REVOKE ALL ON public.hero_slide_versions FROM anon, authenticated",
    ),
  );
  assert.ok(sql.includes("hero_html_versions_select_super"));
  const htmlPolicy = sql.slice(sql.indexOf("hero_html_versions_select_super"));
  assert.ok(htmlPolicy.slice(0, 220).includes("public.is_super_admin()"));
  assert.ok(!/USING\s*\(\s*true\s*\)/i.test(sql));
  assert.ok(!/TO\s+anon/i.test(sql.replace(/REVOKE[^;]*;/gi, "")));
});

test("SQL lot 9 : l'historique des slides ne contient jamais de HTML", () => {
  assert.ok(sql.includes("- 'html' - 'css'"));
  assert.ok(!/hero_slide_versions[^;]*\bhtml\b\s+text/i.test(sql));
});

test("SQL lot 9 : fonctions sensibles figées (search_path) et RPC admin vérifiées", () => {
  const definer = (sql.match(/SECURITY DEFINER/g) || []).length;
  const pinned = (sql.match(/SET search_path = public/g) || []).length;
  assert.equal(definer, pinned);
  assert.ok((sql.match(/IF NOT public\.is_admin\(\)/g) || []).length >= 2);
  assert.ok(sql.includes("is_active") && sql.includes("false,")); // la récupération est TOUJOURS un brouillon
});

test("SQL lot 9 : réordonner ne crée pas d'entrée (comparaison sans order)", () => {
  assert.ok(sql.includes("(prev - 'order') = (snap - 'order')"));
});
```

---

## Vérifications, dans l'ordre

1. Lancer la migration `20261041`, puis les requêtes A, B, C (colle-moi le résultat).
2. Appliquer les sections 2, 3, 4, 5, 6, 7. Puis `npm run lint`, `npm test`, `npm run build`.
3. **Historique** :
   - Ouvre un slide, change un titre, enregistre deux fois (la 2e fois à l'identique : aucune nouvelle ligne n'apparaît).
   - Ouvre « Historique » : tu dois voir les versions, avec l'auteur.
   - « Changements » liste les différences. « Charger dans l'éditeur » met la version en brouillon non enregistré.
   - Teste « Annuler la restauration ».
4. **Conflit** : ouvre le même slide dans 2 navigateurs, enregistre dans le 1er, puis enregistre dans le 2nd. Une confirmation d'écrasement doit apparaître.
5. **Annuler / Rétablir** : modifie un titre et déplace un bouton, puis fais Ctrl+Z et Ctrl+Y. Dans un champ texte, Ctrl+Z reste celui du navigateur.
6. **Corbeille** : supprime un slide de test, puis « Corbeille → Récupérer ». Il revient en brouillon avec le même id.
7. **HTML (super_admin)** : modifie un HTML, enregistre, ouvre « Historique HTML → Charger ». Avec un compte **éditeur**, le bouton n'apparaît pas, et un `SELECT` direct sur `hero_html_versions` doit renvoyer 0 ligne.
8. **Boutique** : aucun changement visuel attendu (ce lot ne touche pas au rendu).

---

## Suite de la roadmap

| #   | Chantier                                                                                                                              | Il me faut                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Statistiques du hero** : impressions et clics par slide et par bouton (via `engagement_events`) avec un tableau dans le studio      | La définition de `engagement_events` (contraintes CHECK sur `event_type` / `entity_type`) et l'extrait de `lib/engagement.ts` côté admin, s'il existe |
| 2   | **Variantes de la couche « Tuiles »** : bento, bandeau, asymétrique (option de la couche existante, valeur par défaut = rendu actuel) | Rien                                                                                                                                                  |
| 3   | **Slide n°1 HTML sans perte de LCP** (shadow DOM déclaratif au prerender)                                                             | `scripts/prerender.ts` (tu m'as dit que le filtre de planification y est déjà, donc je le verrai en même temps)                                       |
| 4   | **Contrôle qualité avancé** : contraste texte / fond, `alt` manquants, avertissement si l'image du slide n°1 est trop lourde          | Rien                                                                                                                                                  |

**Mon choix : le n°1 (statistiques)**, parce que c'est ce qui te dit quel slide convertit, donc à quoi sert tout le reste. Colle-moi les deux éléments et je livre le lot 10.
