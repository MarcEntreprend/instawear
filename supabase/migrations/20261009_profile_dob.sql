-- Profil : exposer date_of_birth via la RPC (SECURITY DEFINER, sans RLS).
-- Recrée la fonction (le type de retour change : DROP + CREATE + GRANTs).
drop function if exists get_my_customer_profile();
create function get_my_customer_profile()
returns table (
  id text,
  email text,
  name text,
  registration_date timestamptz,
  last_login_date timestamptz,
  email_preferences jsonb,
  date_of_birth date
)
language sql stable security definer as $$
  select c.id, c.email, c.name, c.registration_date, c.last_login_date,
         c.email_preferences, c.date_of_birth
  from customers c
  where c.id = (auth.uid())::text;
$$;
grant execute on function get_my_customer_profile() to authenticated;
grant execute on function get_my_customer_profile() to anon;
