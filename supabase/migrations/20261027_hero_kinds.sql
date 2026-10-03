-- supabase/migrations/20261027_hero_kinds.sql
-- Hero Phase 2 : kinds image/grid + liens internes + tuiles.
-- Idempotent : rejouable sans erreur (IF NOT EXISTS, valeurs par défaut).
-- kind='product' = comportement historique (produit imposé).
-- kind='image' = visuel custom plein cadre + lien optionnel.
-- kind='grid' = visuel principal + tuiles latérales liées.
-- link_url/tiles : chemins INTERNES uniquement (doivent commencer par "/",
-- validé côté formulaire ; jamais de data:/javascript:).
-- Aucune RLS modifiée.

ALTER TABLE hero_promotions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'product';

ALTER TABLE hero_promotions
  ADD COLUMN IF NOT EXISTS link_url TEXT;

ALTER TABLE hero_promotions
  ADD COLUMN IF NOT EXISTS tiles JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hero_promotions_kind_check'
  ) THEN
    ALTER TABLE hero_promotions
      ADD CONSTRAINT hero_promotions_kind_check
      CHECK (kind IN ('product', 'image', 'grid'));
  END IF;
END $$;
