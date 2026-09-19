-- Galerie curatée : métadonnées par visuel (couleur, placement, source,
-- choix admin). Idempotent : rejouable sans erreur.
-- Contrat (cf. _shared/gallery.ts) :
-- - gallery (text[]) reste la source d'affichage, dans l'ordre ;
-- - gallery_meta aligne les annotations par URL (+ kept = choix admin) ;
-- - NULL = comportement legacy (pas de curation).
alter table products
  add column if not exists gallery_meta jsonb;
comment on column products.gallery_meta is
  'Galerie curatée : [{url, color, placement, source, kept}]. source = generated|blank|custom. kept=false = retiré par l''admin, jamais ré-ajouté auto.';
