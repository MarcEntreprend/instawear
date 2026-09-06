-- Preuve d'acceptation des CGV à l'inscription (nullable, aucune RLS à changer :
-- les policies existantes de `customers` couvrent déjà la table).
alter table customers add column if not exists terms_accepted_at timestamptz;
