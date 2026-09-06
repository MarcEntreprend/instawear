-- Phase 1 Merchandising : config par section + affinité co-achats réels
-- Idempotent : rejouable sans erreur. Additif uniquement.

-- 1) Config merchandising (pins / excludes / kill switch / poids futurs)
create table if not exists merch_config (
  section text primary key,
  enabled boolean not null default true,
  pins text[] not null default '{}',
  excludes text[] not null default '{}',
  weights jsonb not null default '{}',
  updated_at timestamptz default now()
);
alter table merch_config enable row level security;
drop policy if exists "merch_config_select_public" on merch_config;
create policy "merch_config_select_public" on merch_config
  for select to anon, authenticated using (true);
drop policy if exists "merch_config_write_admin" on merch_config;
create policy "merch_config_write_admin" on merch_config
  for all to authenticated using (is_admin()) with check (is_admin());

insert into merch_config (section) values
  ('frequently'), ('related'), ('new'), ('featured'),
  ('catalog'), ('search')
on conflict (section) do nothing;

-- 2) Affinité co-achats : produits achetés avec p_product_id (commandes
-- annulées/remboursées exclues). SECURITY DEFINER : aucune RLS à changer,
-- lecture globale autorisée car seuls des ids + compteurs sont exposés.
create or replace function product_affinity(p_product_id text, p_limit int default 9)
returns table (product_id text, bought_together int)
language sql stable security definer as $$
  select oi2.product_id, count(*)::int as bought_together
  from order_items oi1
  join order_items oi2 on oi2.order_id = oi1.order_id
  join orders o on o.id = oi1.order_id
  where oi1.product_id = p_product_id
    and oi2.product_id <> p_product_id
    and o.status not in ('cancelled', 'refunded')
  group by oi2.product_id
  order by bought_together desc
  limit greatest(p_limit, 1);
$$;
grant execute on function product_affinity(text, int) to anon, authenticated;
