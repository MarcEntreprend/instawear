# Hero Studio : lot 10 (statistiques et test A/B)

Ce lot ajoute :

- le suivi des **impressions** et des **clics** de chaque slide ;
- un écran **Statistiques** dans le studio ;
- un test **A/B** avec verdict statistique.

Rien ne change visuellement en boutique.

**Ce que tu dois savoir avant de lire les chiffres :**

1. **Seuls les visiteurs qui ont accepté les cookies non essentiels sont mesurés.** C'est la garde RGPD de `engagement.ts`, que je n'ai pas contournée. Le CTR est donc celui des visiteurs consentants.
2. **« Visiteurs » = identifiants de session**, c'est-à-dire des navigateurs, pas des personnes.
3. Une impression est comptée **une fois par slide et par chargement de page**, après 1 s de présence, carrousel visible à 50 % et onglet actif.
4. **CTR = visiteurs ayant cliqué ÷ visiteurs ayant vu.** Ce calcul évite qu'un visiteur qui clique 5 fois fasse monter le taux.
5. Les clics du slide d'amorçage (prerender), de la preview du studio et des administrateurs connectés sont exclus.

**Modèle A/B : l'audience par slide.** Chaque slide a un réglage « Audience » : _Tous_ (par défaut), _Variante A_ ou _Variante B_. Pour tester deux créations, tu crées deux slides, un pour A et un pour B. La variante vient de `getVariant()`, la même que tes sections de merchandising : stable par navigateur, environ 50/50. Le verdict compare les CTR avec un test z de deux proportions.

**Limite à connaître (déclarée aussi dans le studio).** Le slide d'amorçage du prerender ne connaît pas l'audience. Si tu mets un slide limité à une variante en position 1, l'autre variante peut voir ce slide un instant avant que le JavaScript ne le retire. Pour un vrai test sur le slide n°1, il faudra que `prerender.ts` émette les deux variantes. C'est possible, mais il faut me coller le fichier.

---

## 1. Migration (backend) : nouveau fichier

Ta table `engagement_events` refuse tout `event_type` inconnu. La migration étend donc le `CHECK`, en retrouvant son nom automatiquement.

```sql
-- supabase/migrations/20261042_hero_stats.sql
-- Hero Studio — Lot 10 : événements hero_impression / hero_click + RPC de statistiques (admin).
-- Idempotent. Pas de BEGIN/COMMIT. 42 > 41 ; le 37 reste réservé à ton rollback.

-- ─── 1) Étendre le CHECK de event_type (nom du CHECK existant inconnu : on le retrouve) ──
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.engagement_events'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%event_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.engagement_events DROP CONSTRAINT %I', c.conname);
  END LOOP;

  ALTER TABLE public.engagement_events
    ADD CONSTRAINT engagement_events_event_type_check
    CHECK (event_type IN (
      'section_impression', 'product_click', 'search', 'filter_applied',
      'add_to_cart', 'favourite', 'hero_impression', 'hero_click'));
END $$;

-- ─── 2) Index partiel : les statistiques hero ne scannent que les lignes hero ──
CREATE INDEX IF NOT EXISTS engagement_events_hero_idx
  ON public.engagement_events (entity_id, created_at)
  WHERE entity_type = 'hero_slide';

-- ─── 3) Statistiques (admin) : par slide, par variante, par bouton, par jour ──
-- Exclut les administrateurs connectés (leurs visites ne polluent pas les chiffres).
CREATE OR REPLACE FUNCTION public.hero_stats(p_days integer DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d   integer := GREATEST(1, LEAST(COALESCE(p_days, 14), 90));
  res jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'hero_stats: admin requis' USING ERRCODE = '42501';
  END IF;

  WITH ev AS (
    SELECT e.entity_id AS slide_id, e.event_type, e.session_id,
           COALESCE(NULLIF(e.context->>'v', ''), '?')   AS v,
           COALESCE(NULLIF(e.context->>'cta', ''), '?') AS cta,
           e.created_at
    FROM public.engagement_events e
    WHERE e.entity_type = 'hero_slide'
      AND e.event_type IN ('hero_impression', 'hero_click')
      AND e.created_at >= now() - make_interval(days => d)
      AND NOT EXISTS (
        SELECT 1
        FROM auth.users u
        JOIN public.admin_users a ON lower(a.email) = lower(u.email)
        WHERE e.customer_id IS NOT NULL AND u.id::text = e.customer_id)
  ),
  per_slide AS (
    SELECT slide_id,
           count(*) FILTER (WHERE event_type = 'hero_impression') AS impressions,
           count(*) FILTER (WHERE event_type = 'hero_click')      AS clicks,
           count(DISTINCT session_id) FILTER (WHERE event_type = 'hero_impression') AS imp_sessions,
           count(DISTINCT session_id) FILTER (WHERE event_type = 'hero_click')      AS click_sessions
    FROM ev GROUP BY slide_id
  ),
  per_variant AS (
    SELECT slide_id,
           jsonb_object_agg(v, jsonb_build_object(
             'impressions', imp, 'clicks', clk,
             'impSessions', isess, 'clickSessions', csess)) AS j
    FROM (
      SELECT slide_id, v,
             count(*) FILTER (WHERE event_type = 'hero_impression') AS imp,
             count(*) FILTER (WHERE event_type = 'hero_click')      AS clk,
             count(DISTINCT session_id) FILTER (WHERE event_type = 'hero_impression') AS isess,
             count(DISTINCT session_id) FILTER (WHERE event_type = 'hero_click')      AS csess
      FROM ev GROUP BY slide_id, v
    ) x
    GROUP BY slide_id
  ),
  per_cta AS (
    SELECT slide_id, jsonb_object_agg(cta, n) AS j
    FROM (
      SELECT slide_id, cta, count(*) AS n
      FROM ev WHERE event_type = 'hero_click' GROUP BY slide_id, cta
    ) y
    GROUP BY slide_id
  ),
  per_day AS (
    SELECT (created_at AT TIME ZONE 'UTC')::date AS day,
           count(*) FILTER (WHERE event_type = 'hero_impression') AS impressions,
           count(*) FILTER (WHERE event_type = 'hero_click')      AS clicks
    FROM ev GROUP BY 1
  )
  SELECT jsonb_build_object(
    'days', d,
    'since', now() - make_interval(days => d),
    'lastEventAt', (SELECT max(created_at) FROM ev),
    'slides', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'slideId', s.slide_id,
               'impressions', s.impressions, 'clicks', s.clicks,
               'impSessions', s.imp_sessions, 'clickSessions', s.click_sessions,
               'byVariant', COALESCE(pv.j, '{}'::jsonb),
               'byCta', COALESCE(pc.j, '{}'::jsonb))
             ORDER BY s.impressions DESC)
      FROM per_slide s
      LEFT JOIN per_variant pv USING (slide_id)
      LEFT JOIN per_cta pc USING (slide_id)), '[]'::jsonb),
    'daily', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'date', day, 'impressions', impressions, 'clicks', clicks)
             ORDER BY day)
      FROM per_day), '[]'::jsonb))
  INTO res;

  RETURN res;
END;
$$;

REVOKE ALL ON FUNCTION public.hero_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hero_stats(integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
```

**Vérification** (à me coller) :

```sql
-- A. Le CHECK contient les 8 valeurs, et il n'y en a qu'un sur event_type
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.engagement_events'::regclass AND contype = 'c';

-- B. Insertion ANONYME, comme le fait le navigateur (puis ROLLBACK). Attendu : INSERT 0 1
BEGIN;
SET LOCAL ROLE anon;
INSERT INTO public.engagement_events (session_id, event_type, entity_type, entity_id, context)
VALUES ('verif-lot10', 'hero_impression', 'hero_slide', 'x', '{"v":"A","pos":0}');
ROLLBACK;
```

Si la requête B échoue, c'est une policy RLS de `engagement_events` qui filtre aussi le type d'événement : colle-moi `SELECT policyname, cmd, with_check FROM pg_policies WHERE tablename='engagement_events';`.

**Rollback** (si besoin) :

```sql
DELETE FROM public.engagement_events WHERE event_type LIKE 'hero_%';
DROP FUNCTION IF EXISTS public.hero_stats(integer);
DROP INDEX IF EXISTS public.engagement_events_hero_idx;
ALTER TABLE public.engagement_events DROP CONSTRAINT IF EXISTS engagement_events_event_type_check;
ALTER TABLE public.engagement_events ADD CONSTRAINT engagement_events_event_type_check
  CHECK (event_type IN ('section_impression','product_click','search','filter_applied','add_to_cart','favourite'));
```

---

## 2. Suivi (frontend)

### 2.1 `src/lib/heroTracking.ts` (nouveau)

```ts
// src/lib/heroTracking.ts — événements du hero (impression, clic). Passe par track() :
// batch, keepalive et GARDE DE CONSENTEMENT inchangés (rien n'est envoyé sans acceptation).
import { track, getVariant } from "./engagement";

// 1 impression par slide ET par chargement de page (comme les impressions de sections).
const seen = new Set<string>();

export function trackHeroImpression(slideId: string, pos: number): void {
  if (slideId === "lead") return; // slide d'amorçage du prerender : jamais mesuré
  if (typeof document !== "undefined" && document.visibilityState !== "visible")
    return;
  if (seen.has(slideId)) return;
  seen.add(slideId);
  track("hero_impression", "hero_slide", slideId, { v: getVariant(), pos });
}

export function trackHeroClick(
  slideId: string,
  kind: "cta" | "tile" | "main" | "html",
  key?: string,
): void {
  if (slideId === "lead") return;
  track("hero_click", "hero_slide", slideId, {
    v: getVariant(),
    kind,
    cta: key ?? kind,
  });
}
```

### 2.2 `src/lib/engagement.ts` : 2 modifications

1. Remplace la ligne `  | "favourite";` par :

```ts
  | "favourite"
  | "hero_impression"
  | "hero_click";
```

2. Remplace la ligne `  entity_type: "product" | "category" | "event_type" | "section";` par :

```ts
entity_type: "product" | "category" | "event_type" | "section" | "hero_slide";
```

### 2.3 `src/components/HeroSlideView.tsx` : 6 modifications

1. Juste après la ligne `  onLink?: (link: string) => void;` (dans `HeroSlideViewProps`), ajoute :

```ts
  /** Stats : clic sur un bouton, une tuile ou un lien du HTML collé. */
  onTrack?: (slideId: string, kind: "cta" | "tile" | "main" | "html", key?: string) => void;
```

2. Remplace la ligne `}: HeroSlideViewProps) {` par :

```tsx
  onTrack,
}: HeroSlideViewProps) {
```

3. Remplace la ligne `const fire = (cta: HeroCta) => onAction(slide, cta.link);` par :

```tsx
const fire = (cta: HeroCta) => {
  onTrack?.(slide.id, "cta", cta.id);
  onAction(slide, cta.link);
};
```

4. Remplace le bloc qui **commence** par `const click = (link: string | null) => {` et se termine par son `};` par :

```tsx
const click = (link: string | null, key: string) => {
  onTrack?.(slide.id, key === "main" ? "main" : "tile", key);
  if (link && onLink) onLink(link);
  else onAction(slide, null);
};
```

5. Remplace la ligne `onClick={() => click(main.link)}` par :

```tsx
                  onClick={() => click(main.link, "main")}
```

et la ligne `onClick={() => click(t.link || main?.link || null)}` par :

```tsx
                    onClick={() => click(t.link || main?.link || null, `tile-${ti}`)}
```

6. Remplace la ligne `onLink={onLink}` (celle de `<HeroHtmlBlock`) par :

```tsx
              onLink={(l) => {
                onTrack?.(slide.id, "html", "html");
                onLink?.(l);
              }}
```

### 2.4 `src/components/HeroCarousel.tsx` : 5 modifications

1. Juste après la ligne `import HeroSlideView from "./HeroSlideView";`, ajoute :

```tsx
import { trackHeroClick, trackHeroImpression } from "../lib/heroTracking";
```

2. Juste après la ligne `  suspended?: boolean;` (dans `HeroCarouselProps`), ajoute :

```tsx
  /** Preview admin / admin connecté : aucun événement de stats. */
  noTrack?: boolean;
```

Puis remplace la ligne `}: HeroCarouselProps) {` par :

```tsx
  noTrack = false,
}: HeroCarouselProps) {
```

3. Juste **avant** la ligne `const pauseAutoPlay = (duration = 8000) => {`, ajoute :

```tsx
// Stats : carrousel visible (≥ 50 %) + impression après 1 s de présence du slide actif.
const [rootEl, setRootEl] = useState<HTMLElement | null>(null);
const [inView, setInView] = useState(false);
useEffect(() => {
  if (!rootEl || typeof IntersectionObserver === "undefined") return;
  const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
    threshold: 0.5,
  });
  io.observe(rootEl);
  return () => io.disconnect();
}, [rootEl]);
const trackedId = count > 0 ? list[index % count]?.id : undefined;
useEffect(() => {
  if (noTrack || suspended || showLead || !inView || !trackedId) return;
  const t = setTimeout(
    () => trackHeroImpression(trackedId, index % count),
    1000,
  );
  return () => clearTimeout(t);
}, [noTrack, suspended, showLead, inView, trackedId]);
```

4. Dans le `<section` principal, juste **avant** la ligne `      onMouseEnter={() => setIsPaused(true)}`, ajoute :

```tsx
ref = { setRootEl };
```

5. Juste après la ligne `                onLink={onSlideLink}`, ajoute :

```tsx
                onTrack={noTrack ? undefined : trackHeroClick}
```

### 2.5 `src/admin/HeroPreviewFrame.tsx` : 1 modification

Remplace la ligne `<HeroCarousel slides={[slide]} loading={false} onSlideAction={() => {}} />` par :

```tsx
<HeroCarousel
  slides={[slide]}
  loading={false}
  onSlideAction={() => {}}
  noTrack
/>
```

### 2.6 `src/App.tsx` : 2 modifications

1. Juste après la ligne `suspended={suspendHeroForBootProduct}`, ajoute :

```tsx
noTrack = { isAdmin };
```

2. Remplace la ligne `    () => resolveHeroSlides(heroPromotions, products, heroNow, heroHtml),` par :

```tsx
    () => resolveHeroSlides(heroPromotions, products, heroNow, heroHtml, getVariant()),
```

`getVariant` est déjà importé dans `App.tsx`.

---

## 3. Test A/B : l'audience par slide

### 3.1 `src/lib/heroSchema.ts` : 2 modifications

1. Juste après la ligne `  origin: "legacy" | "studio";` (dans `HeroConfig`), ajoute :

```ts
  /** Test A/B : slide montré seulement à cette variante (absent = tous les visiteurs). */
  ab?: "A" | "B";
```

2. Remplace la ligne `    origin: r.origin === "studio" ? "studio" : "legacy",` par :

```ts
    origin: r.origin === "studio" ? "studio" : "legacy",
    ...(r.ab === "A" || r.ab === "B" ? { ab: r.ab as "A" | "B" } : {}),
```

La clé n'existe que si elle est posée : les configs existantes et le backfill restent strictement identiques.

### 3.2 `src/lib/heroResolve.ts` : 2 modifications

1. Remplace la ligne `  htmlById: Record<string, HeroHtmlPayload> = {},` par :

```ts
  htmlById: Record<string, HeroHtmlPayload> = {},
  variant: "A" | "B" | null = null,
```

2. Juste après la ligne `      const config = resolveHeroConfig(p);` (dans `resolveHeroSlides`), ajoute :

```ts
if (variant && config.ab && config.ab !== variant) return [];
```

### 3.3 `src/lib/heroStudio.ts` : 1 modification

Juste après la ligne `    w.push({ level: "info", text: "Les dimensions du slide n°1 s'appliquent à tout le carrousel." });`, ajoute :

```ts
if (c.ab) {
  w.push({
    level: "info",
    text: "Slide n°1 limité à une variante A/B : le slide d'amorçage du prerender peut apparaître un instant chez l'autre variante.",
  });
}
```

---

## 4. Statistiques et verdict

### 4.1 `src/lib/heroStats.ts` (nouveau, pur)

```ts
// src/lib/heroStats.ts — PUR : CTR et comparaison A/B (test z de deux proportions, bilatéral).
export interface Arm {
  /** Visiteurs (sessions) ayant vu le slide. */
  impSessions: number;
  /** Visiteurs ayant cliqué au moins une fois. */
  clickSessions: number;
}

export function ctr(a: Arm): number | null {
  return a.impSessions > 0 ? a.clickSessions / a.impSessions : null;
}

// erf : Abramowitz–Stegun 7.1.26 (erreur < 1,5e-7).
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  let poly = 1.061405429;
  poly = poly * t - 1.453152027;
  poly = poly * t + 1.421413741;
  poly = poly * t - 0.284496736;
  poly = poly * t + 0.254829592;
  return sign * (1 - poly * t * Math.exp(-ax * ax));
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

export interface CtrComparison {
  /** insufficient = trop peu de visiteurs ; none = pas de différence significative. */
  verdict: "insufficient" | "none" | "a" | "b";
  rateA: number | null;
  rateB: number | null;
  z: number | null;
  /** p-value bilatérale. */
  p: number | null;
  nA: number;
  nB: number;
  min: number;
}

/** Seuil 5 % ; au moins `min` visiteurs par bras (sinon aucun verdict). */
export function compareCtr(a: Arm, b: Arm, min = 100): CtrComparison {
  const nA = a.impSessions;
  const nB = b.impSessions;
  const rateA = ctr(a);
  const rateB = ctr(b);
  const base = { rateA, rateB, nA, nB, min };
  if (nA < min || nB < min || rateA === null || rateB === null) {
    return { verdict: "insufficient", z: null, p: null, ...base };
  }
  const pooled = (a.clickSessions + b.clickSessions) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (!(se > 0)) return { verdict: "none", z: null, p: null, ...base };
  const z = (rateA - rateB) / se;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  if (p >= 0.05) return { verdict: "none", z, p, ...base };
  return { verdict: rateA > rateB ? "a" : "b", z, p, ...base };
}
```

### 4.2 `src/api/supabaseApi.ts` : 1 ajout

Juste **avant** la ligne `export const reviewApi = {`, ajoute :

```ts
// ─── Hero : statistiques (RPC admin) ─────────────────────────────────────────
export interface HeroStatsArm {
  impressions: number;
  clicks: number;
  /** Visiteurs (sessions distinctes). */
  impSessions: number;
  clickSessions: number;
}
export interface HeroStatsSlide extends HeroStatsArm {
  slideId: string;
  byVariant: Record<string, HeroStatsArm>;
  byCta: Record<string, number>;
}
export interface HeroStats {
  days: number;
  since: string;
  lastEventAt: string | null;
  slides: HeroStatsSlide[];
  daily: { date: string; impressions: number; clicks: number }[];
}

const num0 = (v: unknown) => Number(v) || 0;
const toArm = (r: any): HeroStatsArm => ({
  impressions: num0(r?.impressions),
  clicks: num0(r?.clicks),
  impSessions: num0(r?.impSessions),
  clickSessions: num0(r?.clickSessions),
});

export const heroStatsApi = {
  async get(days = 14): Promise<HeroStats> {
    const { data, error } = await supabase.rpc("hero_stats", { p_days: days });
    if (error) throw error;
    const d: any = data ?? {};
    return {
      days: num0(d.days) || days,
      since: String(d.since ?? ""),
      lastEventAt: d.lastEventAt ?? null,
      slides: ((d.slides as any[]) ?? []).map((s) => ({
        ...toArm(s),
        slideId: String(s.slideId),
        byVariant: Object.fromEntries(
          Object.entries(s.byVariant ?? {}).map(([k, v]) => [k, toArm(v)]),
        ),
        byCta: Object.fromEntries(
          Object.entries(s.byCta ?? {}).map(([k, v]) => [k, num0(v)]),
        ),
      })),
      daily: ((d.daily as any[]) ?? []).map((x) => ({
        date: String(x.date),
        impressions: num0(x.impressions),
        clicks: num0(x.clicks),
      })),
    };
  },
};
```

### 4.3 `src/admin/HeroStatsPanel.tsx` (nouveau)

```tsx
// src/admin/HeroStatsPanel.tsx — statistiques du hero + verdict A/B (lot 10).
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { RefreshCw, X } from "lucide-react";
import {
  heroStatsApi,
  type HeroStats,
  type HeroStatsArm,
  type HeroStatsSlide,
} from "../api/supabaseApi";
import type { HeroPromotion } from "./adminTypes";
import { resolveHeroConfig } from "../lib/heroSchema";
import { compareCtr, ctr } from "../lib/heroStats";

interface Info {
  label: string;
  ab?: "A" | "B";
  ctas: Record<string, string>;
}
interface Row {
  id: string;
  pos: number;
  info: Info;
  stat: HeroStatsSlide | null;
}

const ZERO: HeroStatsArm = {
  impressions: 0,
  clicks: 0,
  impSessions: 0,
  clickSessions: 0,
};

function infoOf(p: HeroPromotion): Info {
  const c = resolveHeroConfig(p);
  const t = c.layers.find((l) => l.type === "text");
  const head = (t && t.type === "text" ? t.headline : p.headline || "")
    .split("\n")[0]
    .trim();
  return {
    label: head || `Slide ${p.id.slice(0, 6)}`,
    ab: c.ab,
    ctas: Object.fromEntries(c.ctas.map((x) => [x.id, x.label])),
  };
}

const ctaName = (info: Info, key: string) =>
  key === "main"
    ? "Visuel principal"
    : key.startsWith("tile-")
      ? `Tuile ${Number(key.slice(5)) + 1}`
      : key === "html"
        ? "Lien du HTML collé"
        : (info.ctas[key] ?? key);

const pct = (x: number | null) =>
  x == null ? "—" : `${(x * 100).toFixed(1)} %`;
const nf = (n: number) => n.toLocaleString("fr-FR");

const wrap: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 300,
  background: "rgba(10,9,7,.55)",
  overflowY: "auto",
  padding: "4vh 16px",
};
const card: CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};
const btn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink2)",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};
const sel: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface2)",
  color: "var(--color-ink)",
  fontSize: 12,
};
const th: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontSize: 11,
  color: "var(--color-ink3)",
  fontWeight: 700,
  whiteSpace: "nowrap",
};
const td: CSSProperties = {
  padding: "8px 10px",
  fontSize: 13,
  color: "var(--color-ink)",
  whiteSpace: "nowrap",
};
const note: CSSProperties = {
  fontSize: 12,
  color: "var(--color-ink3)",
  margin: 0,
  lineHeight: 1.5,
};

function Daily({ daily }: { daily: HeroStats["daily"] }) {
  if (daily.length === 0)
    return <p style={note}>Aucune donnée sur la période.</p>;
  const W = 600;
  const H = 70;
  const max = Math.max(1, ...daily.map((d) => d.impressions));
  const bw = W / daily.length;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: "100%", height: 90 }}
      role="img"
      aria-label="Impressions et clics par jour"
    >
      {daily.map((d, i) => {
        const h = (d.impressions / max) * (H - 4);
        const hc = (d.clicks / max) * (H - 4);
        const x = i * bw + bw * 0.15;
        const w = bw * 0.7;
        return (
          <g key={d.date}>
            <title>{`${d.date} : ${d.impressions} impressions, ${d.clicks} clics`}</title>
            <rect
              x={x}
              y={H - h}
              width={w}
              height={Math.max(h, 1)}
              fill="var(--color-border2)"
              rx={2}
            />
            <rect
              x={x}
              y={H - hc}
              width={w}
              height={hc}
              fill="var(--color-accent)"
              rx={2}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default function HeroStatsPanel({
  slides,
  onClose,
}: {
  slides: HeroPromotion[];
  onClose: () => void;
}) {
  const [days, setDays] = useState(14);
  const [data, setData] = useState<HeroStats | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [cmpA, setCmpA] = useState("");
  const [cmpB, setCmpB] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);
    heroStatsApi
      .get(days)
      .then(
        (d) => alive && setData(d),
        (e) =>
          alive &&
          setErr(
            e?.message ||
              "Statistiques indisponibles (migration du lot 10 non appliquée ?).",
          ),
      )
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [days, tick]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const byId = new Map(data.slides.map((s) => [s.slideId, s]));
    const known = slides.map((p, i) => ({
      id: p.id,
      pos: i + 1,
      info: infoOf(p),
      stat: byId.get(p.id) ?? null,
    }));
    const ids = new Set(slides.map((p) => p.id));
    const orphans = data.slides
      .filter((s) => !ids.has(s.slideId))
      .map((s) => ({
        id: s.slideId,
        pos: 0,
        info: {
          label: `Slide supprimé ${s.slideId.slice(0, 6)}`,
          ctas: {},
        } as Info,
        stat: s,
      }));
    return [...known, ...orphans];
  }, [data, slides]);

  // Comparaison par défaut : un slide A contre un slide B s'ils existent, sinon les deux premiers.
  useEffect(() => {
    if (cmpA || cmpB || rows.length < 2) return;
    const a = rows.find((r) => r.info.ab === "A") ?? rows[0];
    const b =
      rows.find((r) => r.info.ab === "B" && r.id !== a.id) ??
      rows.find((r) => r.id !== a.id);
    if (a) setCmpA(a.id);
    if (b) setCmpB(b.id);
  }, [rows]);

  const arm = (r?: Row) => ({
    impSessions: r?.stat?.impSessions ?? 0,
    clickSessions: r?.stat?.clickSessions ?? 0,
  });
  const rA = rows.find((r) => r.id === cmpA);
  const rB = rows.find((r) => r.id === cmpB);
  const cmp = rA && rB && rA.id !== rB.id ? compareCtr(arm(rA), arm(rB)) : null;
  const maxCtr = Math.max(0.0001, ...rows.map((r) => ctr(arm(r)) ?? 0));
  const totalImp = rows.reduce((n, r) => n + (r.stat?.impressions ?? 0), 0);
  const totalClk = rows.reduce((n, r) => n + (r.stat?.clicks ?? 0), 0);

  const verdict = () => {
    if (!cmp || !rA || !rB) return "Choisis deux slides différents.";
    if (cmp.verdict === "insufficient") {
      return `Pas assez de données : il faut au moins ${cmp.min} visiteurs par slide (actuellement ${nf(cmp.nA)} et ${nf(cmp.nB)}).`;
    }
    if (cmp.verdict === "none") {
      return `Aucune différence significative (CTR ${pct(cmp.rateA)} contre ${pct(cmp.rateB)}). Laisse tourner le test ou garde les deux.`;
    }
    const win = cmp.verdict === "a" ? rA : rB;
    const winRate = (cmp.verdict === "a" ? cmp.rateA : cmp.rateB) as number;
    const lose = (cmp.verdict === "a" ? cmp.rateB : cmp.rateA) as number;
    const lift =
      lose > 0
        ? ` (${(((winRate - lose) / lose) * 100).toFixed(0)} % de mieux)`
        : "";
    return `« ${win.info.label} » gagne : CTR ${pct(winRate)} contre ${pct(lose)}${lift}. Différence significative (p = ${(cmp.p as number).toFixed(4)}).`;
  };

  return (
    <div style={wrap} onClick={onClose}>
      <div
        style={card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Statistiques du hero"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-ink)",
              margin: 0,
              flex: 1,
            }}
          >
            Statistiques du hero
          </h2>
          <select
            style={sel}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Période"
          >
            {[7, 14, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d} derniers jours
              </option>
            ))}
          </select>
          <button
            type="button"
            style={btn}
            onClick={() => setTick((t) => t + 1)}
            disabled={loading}
          >
            <RefreshCw size={13} /> Actualiser
          </button>
          <button
            type="button"
            style={btn}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>

        <p style={note}>
          Mesures des visiteurs ayant accepté les cookies non essentiels. «
          Visiteurs » = navigateurs distincts, pas des personnes. Impression =
          slide visible ≥ 1 s, comptée une fois par chargement de page. CTR =
          visiteurs ayant cliqué ÷ visiteurs ayant vu. Les administrateurs
          connectés et l'aperçu du studio sont exclus.
        </p>

        {err && <p style={{ ...note, color: "#991b1b" }}>{err}</p>}
        {loading && !data && <p style={note}>Chargement…</p>}

        {data && (
          <>
            <div
              style={{
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                fontSize: 13,
                color: "var(--color-ink2)",
              }}
            >
              <span>
                <strong style={{ fontSize: 20, color: "var(--color-ink)" }}>
                  {nf(totalImp)}
                </strong>{" "}
                impressions
              </span>
              <span>
                <strong style={{ fontSize: 20, color: "var(--color-ink)" }}>
                  {nf(totalClk)}
                </strong>{" "}
                clics
              </span>
              <span style={{ color: "var(--color-ink3)" }}>
                {data.lastEventAt
                  ? `Dernier événement : ${new Date(data.lastEventAt).toLocaleString("fr-FR")}`
                  : "Aucun événement enregistré"}
              </span>
            </div>

            <Daily daily={data.daily} />
            <p style={note}>
              Gris : impressions · Orange : clics (par jour, tous slides).
            </p>

            <div
              style={{
                overflowX: "auto",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "var(--color-surface2)" }}>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>Slide</th>
                    <th style={th}>Audience</th>
                    <th style={th}>Impressions</th>
                    <th style={th}>Visiteurs</th>
                    <th style={th}>Clics</th>
                    <th style={th}>CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const a = arm(r);
                    const rate = ctr(a);
                    const isOpen = open === r.id;
                    return (
                      <FragmentRow
                        key={r.id}
                        row={r}
                        rate={rate}
                        maxCtr={maxCtr}
                        isOpen={isOpen}
                        onToggle={() => setOpen(isOpen ? null : r.id)}
                      />
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td style={td} colSpan={7}>
                        Aucun slide.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              style={{
                padding: 14,
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface2)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <strong style={{ fontSize: 14, color: "var(--color-ink)" }}>
                Comparer deux slides (test A/B)
              </strong>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <select
                  style={sel}
                  value={cmpA}
                  onChange={(e) => setCmpA(e.target.value)}
                  aria-label="Slide A"
                >
                  <option value="">— Slide —</option>
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.info.label}
                      {r.info.ab ? ` (${r.info.ab})` : ""}
                    </option>
                  ))}
                </select>
                <span style={{ color: "var(--color-ink3)" }}>contre</span>
                <select
                  style={sel}
                  value={cmpB}
                  onChange={(e) => setCmpB(e.target.value)}
                  aria-label="Slide B"
                >
                  <option value="">— Slide —</option>
                  {rows.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.info.label}
                      {r.info.ab ? ` (${r.info.ab})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--color-ink)",
                  fontWeight: 600,
                }}
              >
                {verdict()}
              </div>
              <p style={note}>
                Test z de deux proportions, seuil 5 %. Fixe la durée à l'avance
                (au moins 7 jours) et ne t'arrête pas au premier résultat «
                significatif » : regarder le test en cours fausse le verdict.
                Pour tester, règle l'« Audience » de chaque slide (A / B) dans
                le studio.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FragmentRow({
  row,
  rate,
  maxCtr,
  isOpen,
  onToggle,
}: {
  row: Row;
  rate: number | null;
  maxCtr: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const s = row.stat;
  const ctas = s ? Object.entries(s.byCta).sort((a, b) => b[1] - a[1]) : [];
  const variants = s ? Object.entries(s.byVariant).sort() : [];
  return (
    <>
      <tr
        onClick={onToggle}
        style={{
          cursor: "pointer",
          borderTop: "1px solid var(--color-border)",
          background: isOpen ? "var(--color-accent-bg)" : "transparent",
        }}
      >
        <td style={td}>{row.pos || "—"}</td>
        <td
          style={{
            ...td,
            maxWidth: 260,
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontWeight: 600,
          }}
        >
          {row.info.label}
        </td>
        <td style={td}>{row.info.ab ? `Variante ${row.info.ab}` : "Tous"}</td>
        <td style={td}>{nf(s?.impressions ?? 0)}</td>
        <td style={td}>{nf(s?.impSessions ?? 0)}</td>
        <td style={td}>{nf(s?.clicks ?? 0)}</td>
        <td style={td}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong>{pct(rate)}</strong>
            <div
              style={{
                width: 70,
                height: 6,
                borderRadius: 99,
                background: "var(--color-surface2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${((rate ?? 0) / maxCtr) * 100}%`,
                  height: "100%",
                  background: "var(--color-accent)",
                }}
              />
            </div>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr style={{ background: "var(--color-surface2)" }}>
          <td style={td} />
          <td style={{ ...td, whiteSpace: "normal" }} colSpan={6}>
            <div
              style={{
                display: "flex",
                gap: 32,
                flexWrap: "wrap",
                fontSize: 12,
                color: "var(--color-ink2)",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Clics par bouton
                </div>
                {ctas.length === 0
                  ? "Aucun clic."
                  : ctas.map(([k, n]) => (
                      <div key={k}>
                        {ctaName(row.info, k)} : {nf(n)}
                      </div>
                    ))}
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Par variante de visiteur
                </div>
                {variants.length === 0
                  ? "—"
                  : variants.map(([k, a]) => (
                      <div key={k}>
                        {k === "?" ? "Variante inconnue" : `Variante ${k}`} :{" "}
                        {nf(a.impSessions)} visiteurs, {nf(a.clickSessions)}{" "}
                        cliqueurs, CTR {pct(ctr(a))}
                      </div>
                    ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
```

### 4.4 `src/admin/HeroStudioPage.tsx` : 6 modifications

1. Dans l'import `lucide-react`, juste après la ligne `  Redo2,`, ajoute :

```tsx
  BarChart3,
```

2. Juste après la ligne `import HeroHistoryPanel, { HeroTrashPanel } from "./HeroHistoryPanel";`, ajoute :

```tsx
import HeroStatsPanel from "./HeroStatsPanel";
```

3. Juste après la ligne `const [histTick, setHistTick] = useState(0);`, ajoute :

```tsx
const [showStats, setShowStats] = useState(false);
```

4. Juste après la ligne `<HeroSyncBadge />`, ajoute :

```tsx
<button
  type="button"
  onClick={() => setShowStats(true)}
  style={{ ...btn, marginTop: 8 }}
>
  <BarChart3 size={14} /> Statistiques
</button>
```

5. Juste **avant** la ligne `<div className="hs-grid">`, ajoute :

```tsx
{
  showStats && (
    <HeroStatsPanel slides={slides} onClose={() => setShowStats(false)} />
  );
}
```

6. Dans la section « Slide » de l'inspecteur, juste après la ligne qui contient `<Field label="Fin (optionnel)">`, ajoute :

```tsx
<Field label="Audience (test A/B)">
  <select
    style={inputStyle}
    value={config.ab ?? ""}
    onChange={(e) =>
      patchConfig((c) => {
        const { ab: _old, ...rest } = c;
        return (
          e.target.value ? { ...rest, ab: e.target.value as "A" | "B" } : rest
        ) as HeroConfig;
      })
    }
  >
    <option value="">Tous les visiteurs</option>
    <option value="A">Variante A seulement (≈ 50 %)</option>
    <option value="B">Variante B seulement (≈ 50 %)</option>
  </select>
</Field>
```

---

## 5. `tests/hero-lot10.test.ts` (nouveau)

```ts
// tests/hero-lot10.test.ts — stats, A/B, gardes statiques (migration 42, consentement, preview).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compareCtr, ctr, normalCdf } from "../src/lib/heroStats.ts";
import { sanitizeHeroConfig } from "../src/lib/heroSchema.ts";
import { resolveHeroSlides } from "../src/lib/heroResolve.ts";
import { heroStudioWarnings } from "../src/lib/heroStudio.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const IMG = "https://cdn.example.com/a.webp";
const arm = (n: number, c: number) => ({ impSessions: n, clickSessions: c });

test("normalCdf et ctr", () => {
  assert.ok(Math.abs(normalCdf(1.96) - 0.975) < 0.001);
  assert.ok(Math.abs(normalCdf(0) - 0.5) < 1e-6);
  assert.equal(ctr(arm(0, 0)), null);
  assert.equal(ctr(arm(200, 20)), 0.1);
});

test("compareCtr : insuffisant, aucune différence, gagnant A ou B", () => {
  assert.equal(compareCtr(arm(50, 5), arm(50, 9)).verdict, "insufficient");
  assert.equal(compareCtr(arm(0, 0), arm(0, 0)).verdict, "insufficient");
  assert.equal(compareCtr(arm(1000, 100), arm(1000, 105)).verdict, "none");
  const b = compareCtr(arm(1000, 100), arm(1000, 150));
  assert.equal(b.verdict, "b");
  assert.ok(b.p !== null && b.p < 0.001);
  assert.equal(compareCtr(arm(1000, 150), arm(1000, 100)).verdict, "a");
  assert.equal(compareCtr(arm(1000, 0), arm(1000, 0)).verdict, "none"); // dégénéré : pas de verdict
});

test("A/B : la clé ab n'existe que si posée, valeurs strictes, idempotent", () => {
  assert.equal("ab" in sanitizeHeroConfig({}), false);
  assert.equal("ab" in sanitizeHeroConfig({ ab: "C" }), false);
  const a = sanitizeHeroConfig({ ab: "A", origin: "studio" });
  assert.equal(a.ab, "A");
  assert.deepEqual(sanitizeHeroConfig(a), a);
});

test("resolve : un slide limité à une variante n'est servi qu'à celle-ci", () => {
  const mk = (id: string, ab?: string) =>
    ({
      id,
      order: id === "a" ? 0 : id === "b" ? 1 : 2,
      isActive: true,
      productId: "",
      config: sanitizeHeroConfig({
        origin: "studio",
        ...(ab ? { ab } : {}),
        layers: [{ type: "image", src: IMG }],
      }),
    }) as any;
  const promos = [mk("a", "A"), mk("b", "B"), mk("c")];
  const ids = (v: "A" | "B" | null) =>
    resolveHeroSlides(promos, [], Date.now(), {}, v).map((s) => s.id);
  assert.deepEqual(ids("A"), ["a", "c"]);
  assert.deepEqual(ids("B"), ["b", "c"]);
  assert.deepEqual(ids(null), ["a", "b", "c"]); // preview / sans variante : tout
});

test("studio : avertissement A/B sur le slide n°1", () => {
  const c = sanitizeHeroConfig({
    origin: "studio",
    ab: "A",
    layers: [{ type: "image", src: IMG }],
  });
  const w = heroStudioWarnings(c, { isFirst: true, hasProduct: false });
  assert.ok(w.some((x) => /variante A\/B/.test(x.text)));
  assert.ok(
    !heroStudioWarnings(c, { isFirst: false, hasProduct: false }).some((x) =>
      /variante A\/B/.test(x.text),
    ),
  );
});

test("garde : événements hero déclarés dans engagement.ts (consentement inchangé)", () => {
  const e = read("src/lib/engagement.ts");
  for (const k of ['"hero_impression"', '"hero_click"', '"hero_slide"'])
    assert.ok(e.includes(k), k);
  assert.ok(
    e.includes("consentGranted()"),
    "la garde de consentement doit rester",
  );
});

test("garde : le suivi ignore le slide d'amorçage, dédoublonne, et la preview ne mesure rien", () => {
  const t = read("src/lib/heroTracking.ts");
  assert.ok(t.includes('slideId === "lead"'));
  assert.ok(t.includes("seen.has(slideId)"));
  assert.ok(read("src/admin/HeroPreviewFrame.tsx").includes("noTrack"));
  assert.ok(read("src/App.tsx").includes("noTrack={isAdmin}"));
});

test("SQL lot 10 : CHECK étendu sans perdre les anciennes valeurs ; RPC admin, jamais anon", () => {
  const sql = read("supabase/migrations/20261042_hero_stats.sql");
  for (const v of [
    "section_impression",
    "product_click",
    "search",
    "filter_applied",
    "add_to_cart",
    "favourite",
    "hero_impression",
    "hero_click",
  ]) {
    assert.ok(sql.includes(`'${v}'`), v);
  }
  assert.ok(sql.includes("engagement_events_event_type_check"));
  assert.ok(sql.includes("IF NOT public.is_admin()"));
  assert.ok(
    sql.includes(
      "REVOKE ALL ON FUNCTION public.hero_stats(integer) FROM PUBLIC, anon",
    ),
  );
  assert.ok(sql.includes("SET search_path = public"));
  assert.ok(!/TO\s+anon/i.test(sql.replace(/REVOKE[^;]*;/gi, "")));
});
```

---

## Vérifications, dans l'ordre

1. Lancer la migration `20261042`, puis A et B. Colle-moi les résultats.
2. Appliquer les sections 2 à 5. Puis `npm run lint`, `npm test`, `npm run build`.
3. **Mesure** (navigateur propre, cookies **acceptés** dans la bannière) :
   - Ouvre la boutique et reste 2 à 3 s sur le hero.
   - Clique un bouton.
   - Attends environ 15 s (le lot est envoyé toutes les 15 s, ou à la fermeture de l'onglet).
   - Ouvre Hero Studio → « Statistiques » : tu dois voir au moins 1 impression et 1 clic.
   - **Cookies refusés** : rien ne doit apparaître.
4. **Test A/B** : règle l'« Audience » d'un slide sur A et d'un autre sur B, puis enregistre.
   - Console du navigateur : `localStorage.setItem("instawear-engagement-sid","b")` puis recharge → tu es en **variante A**.
   - Avec `"a"` → **variante B**.
   - Chaque variante ne doit voir que ses slides (plus les slides « Tous »).
5. **Exclusions** : l'aperçu du studio et ta session admin ne doivent produire aucun événement (`hero_%`) dans `engagement_events`.
6. **Boutique** : aucun changement visuel attendu.

---

## Dette connue et suite

- Les stats ne mesurent que les visiteurs consentants.
- Le slide n°1 en test A/B est limité par le prerender (avertissement dans le studio).
- Volume : environ 1 ligne par slide vu et par visite, plus 1 par clic. Pas de purge automatique : dis-le-moi si tu veux une rétention (par exemple 180 jours).

Pour la suite, mon choix serait le **contrôle qualité avancé**, qui ne demande aucun fichier de ta part :

- contraste du texte sur le fond ;
- `alt` manquants ;
- alerte sur les images trop lourdes ou non optimisées au slide n°1.

Les variantes de la couche « Tuiles » (bento, bandeau) viendraient ensuite. Le slide n°1 en HTML sans perte de LCP et la mise à jour du prerender pour la planification demandent `scripts/prerender.ts`.
