-- Phase 1 — Fondations Produit : avis, helpful, stock fin
-- Idempotent : peut être rejoué sans erreur

-- 1) product_reviews : colonnes manquantes
alter table product_reviews add column if not exists title text;
alter table product_reviews add column if not exists body text;
alter table product_reviews add column if not exists helpful int not null default 0;
alter table product_reviews add column if not exists verified boolean not null default false;
alter table product_reviews add column if not exists updated_at timestamptz default now();
-- compat : si ancienne colonne comment existe, la garder (body fera office de comment)
-- index
create index if not exists idx_product_reviews_product on product_reviews(product_id);
create index if not exists idx_product_reviews_customer on product_reviews(customer_id);

-- 2) review_helpful : likes utiles (1 par user par avis)
create table if not exists review_helpful (
  review_id uuid references product_reviews(id) on delete cascade not null,
  customer_id text not null, -- customers.id (text = auth.uid()::text)
  created_at timestamptz default now(),
  primary key (review_id, customer_id)
);
create index if not exists idx_review_helpful_review on review_helpful(review_id);
alter table review_helpful enable row level security;

-- 3) RLS review_helpful
drop policy if exists "review_helpful_select_all" on review_helpful;
create policy "review_helpful_select_all" on review_helpful for select using (true);
drop policy if exists "review_helpful_insert_own" on review_helpful;
create policy "review_helpful_insert_own" on review_helpful for insert with check (
  is_admin() or customer_id = (auth.uid())::text or exists (select 1 from customers c where c.id = review_helpful.customer_id and c.email = (auth.jwt() ->> 'email'))
);
drop policy if exists "review_helpful_delete_own" on review_helpful;
create policy "review_helpful_delete_own" on review_helpful for delete using (
  is_admin() or customer_id = (auth.uid())::text or exists (select 1 from customers c where c.id = review_helpful.customer_id and c.email = (auth.jwt() ->> 'email'))
);

-- 4) RLS product_reviews : garder admin + ajouter user own (insert/update/delete)
drop policy if exists "product_reviews_insert_own" on product_reviews;
create policy "product_reviews_insert_own" on product_reviews for insert with check (
  is_admin() or customer_id = (auth.uid())::text or exists (select 1 from customers c where c.id = product_reviews.customer_id and c.email = (auth.jwt() ->> 'email'))
);
drop policy if exists "product_reviews_update_own" on product_reviews;
create policy "product_reviews_update_own" on product_reviews for update using (
  is_admin() or customer_id = (auth.uid())::text or exists (select 1 from customers c where c.id = product_reviews.customer_id and c.email = (auth.jwt() ->> 'email'))
) with check (
  is_admin() or customer_id = (auth.uid())::text or exists (select 1 from customers c where c.id = product_reviews.customer_id and c.email = (auth.jwt() ->> 'email'))
);
drop policy if exists "product_reviews_delete_own" on product_reviews;
create policy "product_reviews_delete_own" on product_reviews for delete using (
  is_admin() or customer_id = (auth.uid())::text or exists (select 1 from customers c where c.id = product_reviews.customer_id and c.email = (auth.jwt() ->> 'email'))
);
-- select public déjà existe : product_reviews_select_public (anon,authenticated true)

-- 5) Stock fin : products.stock_quantity existe déjà (int), s'assurer du check
-- (déjà présent : products_stock_quantity_check)

-- 6) Helper verified : un client est vérifié s'il a une commande paid/delivered/in_production/shipped contenant le produit
create or replace function is_verified_buyer(p_product_id text, p_customer_id text) returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from orders o
    join order_items oi on oi.order_id = o.id
    where (o.client_id = p_customer_id or o.client_email = (select email from customers where id = p_customer_id))
      and oi.product_id = p_product_id
      and o.status in ('paid','in_production','shipped','delivered','partial')
  );
$$;

-- 7) Trigger updated_at
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists trg_product_reviews_updated on product_reviews;
create trigger trg_product_reviews_updated before update on product_reviews for each row execute function touch_updated_at();

-- 8) Helpful count : trigger auto-incrémente/décrémente product_reviews.helpful
create or replace function trg_helpful_inc() returns trigger language plpgsql as $$
begin update product_reviews set helpful = helpful + 1 where id = new.review_id; return new; end; $$;
create or replace function trg_helpful_dec() returns trigger language plpgsql as $$
begin update product_reviews set helpful = greatest(helpful - 1, 0) where id = old.review_id; return old; end; $$;
drop trigger if exists trg_helpful_after_insert on review_helpful;
create trigger trg_helpful_after_insert after insert on review_helpful for each row execute function trg_helpful_inc();
drop trigger if exists trg_helpful_after_delete on review_helpful;
create trigger trg_helpful_after_delete after delete on review_helpful for each row execute function trg_helpful_dec();

-- 9) RPC helpers pour toggle côté client (optionnel, trigger fait le job)
create or replace function increment_helpful(rid uuid) returns void language sql as $$ update product_reviews set helpful = helpful + 1 where id = rid $$;
create or replace function decrement_helpful(rid uuid) returns void language sql as $$ update product_reviews set helpful = greatest(helpful - 1,0) where id = rid $$;

-- 10) Migration données : body = comment si body null
update product_reviews set body = comment where body is null and comment is not null;
update product_reviews set title = coalesce(title, '') where title is null;
