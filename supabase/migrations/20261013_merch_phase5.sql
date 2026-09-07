-- Phase 5 Merchandising : réglages A/B, calendrier events, relance panier
-- Idempotent : rejouable sans erreur. Additif uniquement.

-- 1) Réglages libres par section (ex. {"ab": true}, {"cart_hours": 48})
alter table merch_config add column if not exists settings jsonb not null default '{}';
alter table merch_config add column if not exists updated_at timestamptz default now();

-- 2) Calendrier des événements (pics de demande datés, ex. finales, carnavals)
create table if not exists event_dates (
  event_type text primary key,
  event_date date,
  label text
);
alter table event_dates enable row level security;
drop policy if exists "event_dates_select_public" on event_dates;
create policy "event_dates_select_public" on event_dates
  for select to anon, authenticated using (true);
drop policy if exists "event_dates_write_admin" on event_dates;
create policy "event_dates_write_admin" on event_dates
  for all to authenticated using (is_admin()) with check (is_admin());

-- 3) Marqueur anti-renvoi pour la relance panier abandonné
alter table cart_items add column if not exists reminded_at timestamptz;
