-- Contact invité : autoriser la création de tickets support depuis ContactPage
-- Idempotent : rejouable sans erreur.
-- Les tickets atterrissent dans `interactions` (file admin existante : InteractionsPage).

-- 1) INSERT anonyme restreint : type question/feedback, email valide, message 10..5000 chars
drop policy if exists "interactions_insert_contact" on interactions;
create policy "interactions_insert_contact" on interactions for insert to anon with check (
  type in ('question', 'feedback')
  and status = 'open'
  and customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and char_length(coalesce(last_message, '')) between 10 and 5000
  and char_length(coalesce(subject, '')) <= 200
);

-- 2) Premier message anonyme lié à un ticket contact
-- (le ticket parent est créé juste avant ; on rattache par interaction_id)
drop policy if exists "interaction_messages_insert_contact" on interaction_messages;
create policy "interaction_messages_insert_contact" on interaction_messages for insert to anon with check (
  from_field = 'customer'
  and char_length(coalesce(text, '')) between 10 and 5000
  and exists (
    select 1 from interactions i
    where i.id = interaction_id
      and i.type in ('question', 'feedback')
  )
);
