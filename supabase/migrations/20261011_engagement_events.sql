-- Phase 2 Merchandising : capteurs comportementaux (silencieux)
-- Idempotent : rejouable sans erreur. Écriture seule côté front ;
-- lecture réservée admin/edge (jamais lue au rendu, que des vues agrégées).

create table if not exists engagement_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  customer_id text,
  event_type text not null check (event_type in (
    'section_impression', 'product_click', 'search',
    'filter_applied', 'add_to_cart', 'favourite'
  )),
  entity_type text not null,
  entity_id text not null,
  context jsonb not null default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_engagement_created on engagement_events (created_at desc);
create index if not exists idx_engagement_entity on engagement_events (entity_type, entity_id);
create index if not exists idx_engagement_session on engagement_events (session_id);

alter table engagement_events enable row level security;
drop policy if exists "engagement_insert_all" on engagement_events;
create policy "engagement_insert_all" on engagement_events
  for insert to anon, authenticated with check (
    char_length(session_id) between 8 and 64
    and char_length(entity_id) <= 200
  );
drop policy if exists "engagement_admin_all" on engagement_events;
create policy "engagement_admin_all" on engagement_events
  for all to authenticated using (is_admin()) with check (is_admin());
