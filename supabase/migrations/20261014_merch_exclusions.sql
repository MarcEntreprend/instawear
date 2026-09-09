-- Exclusion du trafic de test (admin / comptes de test) des stats merchandising
-- Idempotent : rejouable sans erreur. Additif uniquement.
-- Les emails exclus sont ignorés par le scorer (ventes + events) et par la
-- RPC product_affinity. Lecture/écriture réservées admin (jamais exposé au front).

create table if not exists merch_excluded_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  note text,
  created_at timestamptz default now()
);
alter table merch_excluded_users enable row level security;
drop policy if exists "merch_excluded_admin_all" on merch_excluded_users;
create policy "merch_excluded_admin_all" on merch_excluded_users
  for all to authenticated using (is_admin()) with check (is_admin());

insert into merch_excluded_users (email, note) values
  ('marcrubenmacean@gmail.com', 'Admin — test purchases must not pollute stats'),
  ('marc.entreprend@gmail.com', 'Test account — test purchases must not pollute stats')
on conflict (email) do nothing;

-- product_affinity : exclut les commandes des emails exclus (SECURITY DEFINER :
-- aucune RLS à changer, seuls des ids + compteurs restent exposés).
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
    and (o.client_email is null or o.client_email not in (select email from merch_excluded_users))
    and (o.client_id is null or o.client_id not in (
      select c.id::text from customers c
      where c.email in (select email from merch_excluded_users)
    ))
  group by oi2.product_id
  order by bought_together desc
  limit greatest(p_limit, 1);
$$;
grant execute on function product_affinity(text, int) to anon, authenticated;
