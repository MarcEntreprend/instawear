-- supabase/migrations/20261026_hero_layout.sql
-- Hero : choix de mise en page par slide (full-bleed historique vs split).
-- Idempotent : rejouable sans erreur (IF NOT EXISTS + valeur par défaut).
-- Colonne nullable-côté-écriture : les lignes existantes valent 'full'
-- (rendu d'avant, inchangé). Aucune RLS modifiée.

ALTER TABLE hero_promotions
  ADD COLUMN IF NOT EXISTS layout TEXT NOT NULL DEFAULT 'full';

-- Garde-fou : seules les deux valeurs connues (le rendu ignore le reste
-- et retombe sur 'full', mais la DB reste propre).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hero_promotions_layout_check'
  ) THEN
    ALTER TABLE hero_promotions
      ADD CONSTRAINT hero_promotions_layout_check
      CHECK (layout IN ('full', 'split'));
  END IF;
END $$;
