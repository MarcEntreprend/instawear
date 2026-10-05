-- supabase/migrations/20261030_product_slugs.sql
-- SEO : slug stable par produit (/produit/baby-short-sleeve-cook).
-- - Colonne slug UNIQUE (NULL multiples autorisés), remplie auto si absente.
-- - Slug manuel préservé (l'admin peut forcer) ; title modifié + slug déjà
--   posé = slug conservé (URLs stables, jamais de casse).
-- - Sans extension (pas d'unaccent) : que du regexp_replace builtin.
-- - Les URLs UUID restent valides (lookup slug OU id côté front).
-- Idempotent (IF NOT EXISTS / OR REPLACE / DROP TRIGGER IF EXISTS).

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text;
DROP INDEX IF EXISTS products_slug_unique;
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON public.products (slug);

CREATE OR REPLACE FUNCTION public.product_slug_for(
  title text,
  exclude_id text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  base text;
  cand text;
  n integer := 0;
BEGIN
  base := lower(coalesce(title, 'product'));
  base := regexp_replace(base, '[àáâãäå]', 'a', 'g');
  base := regexp_replace(base, '[èéêë]', 'e', 'g');
  base := regexp_replace(base, '[ìíîï]', 'i', 'g');
  base := regexp_replace(base, '[òóôõö]', 'o', 'g');
  base := regexp_replace(base, '[ùúûü]', 'u', 'g');
  base := regexp_replace(base, '[ýÿ]', 'y', 'g');
  base := regexp_replace(base, 'ç', 'c', 'g');
  base := regexp_replace(base, 'ñ', 'n', 'g');
  base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
  base := regexp_replace(base, '(^-+|-+$)', '', 'g');
  IF base = '' THEN base := 'product'; END IF;
  cand := base;
  WHILE EXISTS (
    SELECT 1 FROM public.products
    WHERE slug = cand AND (exclude_id IS NULL OR id::text <> exclude_id)
  ) LOOP
    n := n + 1;
    cand := base || '-' || n;
  END LOOP;
  RETURN cand;
END;
$function$;

CREATE OR REPLACE FUNCTION public.products_slug_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.product_slug_for(NEW.title, NEW.id::text);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS products_set_slug ON public.products;
CREATE TRIGGER products_set_slug
  BEFORE INSERT OR UPDATE OF title, slug ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_slug_trigger();

-- Backfill : touche title pour déclencher le trigger sur les lignes sans slug.
UPDATE public.products SET title = title WHERE slug IS NULL;
