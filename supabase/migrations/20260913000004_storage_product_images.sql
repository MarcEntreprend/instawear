-- S2 (audit sécurité) — verrouille le bucket public `product-images`.
-- Constat dashboard : 3 policies larges (DELETE public, INSERT tout
-- authentifié sans préfixe, SELECT listant tout le bucket).
-- Appelants réels (src) : admin → products|gallery (ProductFormPanel,
-- PrintfulProductForm), clients loggués → tickets/ (AccountPage),
-- JAMAIS d'upload anonyme, JAMAIS de delete non-admin.
-- Resserrage compatible, sans changement fonctionnel :
--   - admin : ALL sur le bucket (via is_admin(), comme les autres tables) ;
--   - clients : INSERT limité au préfixe tickets/ (pièces support) ;
--   - lecture publique conservée (images boutique + suivi : <img> direct) ;
--   - aucun UPDATE (personne n'en fait, upsert:false côté front).
-- Idempotent : DROP IF EXISTS + recréation. SQL Editor, schéma storage.
-- Résiduel assumé : le listing public reste possible (indissociable de la
-- lecture publique PostgREST) — noms timestampés, sensibilité faible ;
-- déplacer tickets/ vers un bucket privé = futur chantier si besoin.

-- Anciennes policies larges (noms exacts du dashboard).
DROP POLICY IF EXISTS "Admins can delete" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;

-- Admin : tout sur ce bucket.
CREATE POLICY "product-images admin all"
  ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'product-images' AND is_admin())
  WITH CHECK (bucket_id = 'product-images' AND is_admin());

-- Clients loggués : pièces jointes support uniquement (préfixe tickets/).
CREATE POLICY "product-images tickets upload"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = 'tickets'
  );

-- Lecture publique (boutique + suivi) : indispensable aux <img> directs.
CREATE POLICY "product-images public read"
  ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
