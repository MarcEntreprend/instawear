-- Phase 3 Merchandising : scores pré-calculés + runs + tendances recherche
-- Idempotent : rejouable sans erreur. Additif uniquement.
-- Lecture front : product_scores (public, ids+scores non sensibles) et
-- search_trends (public, termes agrégés). Écriture : service_role uniquement.

-- 1) Scores par section (seule table lue au rendu : 1 query)
create table if not exists product_scores (
  section text not null,
  product_id text not null,
  score numeric not null default 0,
  computed_at timestamptz default now(),
  primary key (section, product_id)
);
alter table product_scores enable row level security;
drop policy if exists "product_scores_select_public" on product_scores;
create policy "product_scores_select_public" on product_scores
  for select to anon, authenticated using (true);
drop policy if exists "product_scores_write_admin" on product_scores;
create policy "product_scores_write_admin" on product_scores
  for all to authenticated using (is_admin()) with check (is_admin());

-- 2) Journal des runs du scorer (admin uniquement, pour l'audit phase 5)
create table if not exists merch_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  status text not null default 'running',
  stats jsonb not null default '{}'
);
alter table merch_runs enable row level security;
drop policy if exists "merch_runs_admin_all" on merch_runs;
create policy "merch_runs_admin_all" on merch_runs
  for all to authenticated using (is_admin()) with check (is_admin());

-- 3) Termes de recherche tendances (agrégés, jamais de PII : pas d'email)
create table if not exists search_trends (
  term text primary key,
  hits int not null default 0,
  updated_at timestamptz default now()
);
alter table search_trends enable row level security;
drop policy if exists "search_trends_select_public" on search_trends;
create policy "search_trends_select_public" on search_trends
  for select to anon, authenticated using (true);
drop policy if exists "search_trends_write_admin" on search_trends;
create policy "search_trends_write_admin" on search_trends
  for all to authenticated using (is_admin()) with check (is_admin());

-- 4) Planification optionnelle (ne pas décommenter sans pg_cron + vault) :
-- La clé service_role doit vivre dans vault, jamais en dur ici.
-- select cron.schedule(
--   'merch-scorer-nightly', '0 3 * * *',
--   $$ select net.http_post(
--     url := 'https://<PROJECT_REF>.supabase.co/functions/v1/merch-scorer',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'SERVICE_ROLE_KEY')
--     ),
--     body := '{}'::jsonb
--   ); $$
-- );
-- En attendant : déclenchement manuel (edge merch-scorer, apikey service_role).
