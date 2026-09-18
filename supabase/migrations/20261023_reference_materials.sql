-- Listes de référence : matières textiles (type 'material').
-- Idempotent : rejouable sans erreur (garde WHERE NOT EXISTS par ligne).
-- Source : classification sync-printful/_shared/materials.ts (slugs canoniques).
-- Les libellés EN suivent la langue du storefront ; les keywords servent à
-- l'auto-détection à l'import (PrintfulProductForm) en EN + FR.
-- RLS : écriture réservée admin (inchangée) ; lecture anonyme déjà ouverte.

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-cotton', 'material', 'cotton', 'Cotton',
  array['cotton', 'coton'], 10
where not exists (select 1 from reference_lists where type = 'material' and value = 'cotton');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-cotton-organic', 'material', 'cotton-organic', 'Organic Cotton',
  array['cotton', 'coton', 'organic', 'bio', 'biologique'], 20
where not exists (select 1 from reference_lists where type = 'material' and value = 'cotton-organic');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-cotton-combed', 'material', 'cotton-combed', 'Combed Cotton',
  array['cotton', 'coton', 'combed', 'peigne', 'ring', 'spun'], 30
where not exists (select 1 from reference_lists where type = 'material' and value = 'cotton-combed');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-polyester', 'material', 'polyester', 'Polyester',
  array['polyester'], 40
where not exists (select 1 from reference_lists where type = 'material' and value = 'polyester');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-polyester-recycled', 'material', 'polyester-recycled', 'Recycled Polyester',
  array['polyester', 'recycled', 'recycle'], 50
where not exists (select 1 from reference_lists where type = 'material' and value = 'polyester-recycled');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-fleece', 'material', 'fleece', 'Fleece',
  array['fleece', 'molleton'], 60
where not exists (select 1 from reference_lists where type = 'material' and value = 'fleece');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-fleece-organic', 'material', 'fleece-organic', 'Organic Fleece',
  array['fleece', 'molleton', 'organic', 'bio', 'biologique'], 70
where not exists (select 1 from reference_lists where type = 'material' and value = 'fleece-organic');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-ceramic', 'material', 'ceramic', 'Ceramic',
  array['ceramic', 'ceramique', 'stoneware', 'porcelain'], 80
where not exists (select 1 from reference_lists where type = 'material' and value = 'ceramic');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-wool', 'material', 'wool', 'Wool',
  array['wool', 'laine'], 90
where not exists (select 1 from reference_lists where type = 'material' and value = 'wool');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-linen', 'material', 'linen', 'Linen',
  array['linen', 'lin', 'flax'], 100
where not exists (select 1 from reference_lists where type = 'material' and value = 'linen');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-nylon', 'material', 'nylon', 'Nylon',
  array['nylon', 'polyamide'], 110
where not exists (select 1 from reference_lists where type = 'material' and value = 'nylon');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-acrylic', 'material', 'acrylic', 'Acrylic',
  array['acrylic', 'acrylique'], 120
where not exists (select 1 from reference_lists where type = 'material' and value = 'acrylic');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-viscose', 'material', 'viscose', 'Viscose',
  array['viscose', 'rayon'], 130
where not exists (select 1 from reference_lists where type = 'material' and value = 'viscose');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-elastane', 'material', 'elastane', 'Elastane',
  array['elastane', 'spandex', 'lycra', 'elasthanne'], 140
where not exists (select 1 from reference_lists where type = 'material' and value = 'elastane');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-hemp', 'material', 'hemp', 'Hemp',
  array['hemp', 'chanvre'], 150
where not exists (select 1 from reference_lists where type = 'material' and value = 'hemp');

insert into reference_lists (id, type, value, label, keywords, sort_order)
select 'material-bamboo', 'material', 'bamboo', 'Bamboo',
  array['bamboo', 'bambou'], 160
where not exists (select 1 from reference_lists where type = 'material' and value = 'bamboo');
