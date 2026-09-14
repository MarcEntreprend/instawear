-- Bloc 2 (audit sécurité) — resserrage compatible, sans changement fonctionnel.
-- Idempotent et rejouable : DROP IF EXISTS + recréation.
-- À exécuter dans le SQL Editor de Supabase (schéma public).
--
-- H1 : notifications_insert_public acceptait {anon,authenticated} en
--   check true — n'importe qui pouvait écrire dans la cloche admin (spam).
--   Audit des appelants : front = sessions admin authentifiées uniquement,
--   invités via edges (service_role, hors RLS). Le rôle anon est donc
--   retiré SANS changer aucun flux légitime.
-- H4 : orders_delete_public permettait à n'importe qui de supprimer TOUTE
--   commande pending <1h (y compris celles des clients loggués) par simple
--   énumération d'IDs. Resserré au propriétaire (client_id/email JWT, ou
--   commande invitée sans client) + admin. Les cleanups front (invité +
--   loggé, toujours sur SES propres pendings) continuent de passer.

-- ── H1 ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS notifications_insert_public ON public.notifications;

CREATE POLICY notifications_insert_authenticated
  ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── H4 ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS orders_delete_public ON public.orders;

CREATE POLICY orders_delete_owner
  ON public.orders
  FOR DELETE TO anon, authenticated
  USING (
    is_admin()
    OR (
      status = 'pending'::text
      AND created_at > (now() - '01:00:00'::interval)
      AND (
        client_id IS NULL
        OR client_id = (auth.uid())::text
        OR client_email = (auth.jwt() ->> 'email'::text)
      )
    )
  );
