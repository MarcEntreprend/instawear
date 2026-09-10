-- Email preferences hardening : journal admin + verrouillage anon newsletter
-- Idempotent : rejouable sans erreur.
--
-- Contexte : public/unsubscribe.html écrivait en REST anon direct
-- (newsletter_subscribers + customers). La page passe désormais par l'edge
-- `email-preferences` (service_role, validation, rate-limit). Ce fichier :
--  1) crée email_preference_events (rapport admin : qui a changé quoi, quand) ;
--  2) verrouille newsletter_subscribers en admin-only (le footer subscribe
--     passe par les RPC SECURITY DEFINER, l'admin par son JWT : aucun flux
--     légitime n'utilise le REST anon/authenticated direct).
-- customers : NON touché (trop de flux légitimes : checkout, compte, admin).

-- 1) Journal des changements de préférences (append-only, lecture admin)
create table if not exists email_preference_events (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  changes jsonb not null default '{}'::jsonb,
  source text not null default 'unsubscribe_page',
  ip text,
  created_at timestamptz not null default now()
);
create index if not exists idx_email_pref_events_email on email_preference_events (email);
create index if not exists idx_email_pref_events_created on email_preference_events (created_at desc);
alter table email_preference_events enable row level security;
drop policy if exists "email_pref_events_admin_all" on email_preference_events;
create policy "email_pref_events_admin_all" on email_preference_events
  for all to authenticated using (is_admin()) with check (is_admin());

-- 2) newsletter_subscribers : suppression de TOUTES les policies existantes
-- (noms inconnus : créées via dashboard), puis recréation admin-only.
-- Le service_role (edges) et les RPC SECURITY DEFINER contournent le RLS :
-- aucun flux légitime n'est impacté.
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'newsletter_subscribers'
  loop
    execute format('drop policy if exists %I on newsletter_subscribers', r.policyname);
  end loop;
end $$;
alter table newsletter_subscribers enable row level security;
drop policy if exists "newsletter_subscribers_admin_all" on newsletter_subscribers;
create policy "newsletter_subscribers_admin_all" on newsletter_subscribers
  for all to authenticated using (is_admin()) with check (is_admin());
