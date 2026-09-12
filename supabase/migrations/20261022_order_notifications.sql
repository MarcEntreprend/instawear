-- Notifications d'achat : admin + client, déclenchées côté base (tous les flux).
-- Idempotent : rejouable sans erreur.
--
-- Pourquoi un trigger plutôt que du code applicatif ?
-- Les commandes arrivent par plusieurs chemins (Stripe Checkout via webhook,
-- carte directe créée côté client, création admin) : seul Postgres les voit
-- toutes. Sans ça, les achats carte n'envoyaient AUCUNE notif.
--
-- Règles :
-- - Feu UNIQUEMENT à l'entrée dans un statut "payé" (paid, in_production,
--   shipped, delivered) : jamais sur les lignes "pending" (paniers abandonnés).
-- - Une seule fois (OLD déjà dans le set → skip : pas de doublon au fil des statuts).
-- - Best-effort : un échec de notif ne fait JAMAIS échouer l'écriture commande.
-- - Client notifié seulement si client_id renseigné (compte lié).

create or replace function notify_new_paid_order() returns trigger
language plpgsql security definer as $$
declare
  old_status text;
begin
  -- UPDATE : ne notifier que si l'ancien statut n'était pas déjà payé.
  -- (Comparaisons IN explicites + OLD copié en variable : insensible aux
  -- subtilités ANY/IS NOT NULL sur RECORD.)
  if tg_op = 'UPDATE' then
    old_status := old.status;
    if old_status is null then
      old_status := '';
    end if;
    if old_status = new.status then
      return new;
    end if;
    if old_status in ('paid', 'in_production', 'shipped', 'delivered') then
      return new;
    end if;
  end if;
  if new.status not in ('paid', 'in_production', 'shipped', 'delivered') then
    return new;
  end if;

  -- 1) Admin : file Notifications (cloche + badge + navigation /admin/orders)
  begin
    insert into notifications
      (title, description, category, priority, status, timestamp, metadata, action_label)
    values (
      'Nouvelle commande — ' || new.id,
      ('Client : ' || coalesce(new.client_name, new.client_email, 'invité')
        || ' · Total : ' || coalesce(new.total_amount::text, '?')),
      'orders',
      'high',
      'unread',
      now(),
      jsonb_build_object('orderId', new.id, 'linkTo', '/admin/orders', 'source', 'order-trigger', 'new_status', new.status),
      'Voir la commande'
    );
  exception when others then
    null;
  end;

  -- 2) Client : file compte (onglet notifications, badge pastille)
  if new.client_id is not null then
    begin
      insert into customer_notifications
        (customer_id, title, message, type, is_read, metadata)
      values (
        new.client_id,
        'Order ' || new.id || ' confirmed',
        'Thanks for your purchase! Track it anytime from your account.',
        'order_status',
        false,
        jsonb_build_object('orderId', new.id)
      );
    exception when others then
      null;
    end;
  end if;

  return new;
end $$;

drop trigger if exists trg_notify_new_paid_order on orders;
create trigger trg_notify_new_paid_order
  after insert or update of status on orders
  for each row execute function notify_new_paid_order();
