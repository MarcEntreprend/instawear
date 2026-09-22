-- 1. Migrations réellement appliquées (le doc ne les trace pas)
| version |
| -------- |
| 20260813 |
| 20260814 |
| 20260815 |
| 20261020 |
| 20261022 |

-- 2. BASELINE ANTI-LOCKOUT (bloquant pour A1) : qui administre aujourd'hui ?
| role | count |
| ----------- | ----- |
| super_admin | 1 |

-- 3. Le check autorise quelles valeurs ?
| pg_get_constraintdef |
| ----------------------------------------------------------------- |
| CHECK ((role = ANY (ARRAY['super_admin'::text, 'editor'::text]))) |

-- 4. Preuve du trou de provisioning (A1) : des admins sans login ?
| admin_email | statut |
| ------------------------- | ------ |
| marcrubenmacean@gmail.com | ok |

-- 5. Colonnes critiques présentes ? (attention : password_hash doit être ABSENT)
| column_name |
| ------------ |
| gallery_meta |
| material |

-- 6. Contraintes sur notifications (A2 : mes valeurs passeront-elles ?)
| conname | pg_get_constraintdef |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| notifications_category_check | CHECK ((category = ANY (ARRAY['orders'::text, 'products'::text, 'customers'::text, 'interactions'::text, 'bonus'::text, 'api'::text, 'security'::text, 'finance'::text, 'approval'::text]))) |
| notifications_priority_check | CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))) |
| notifications_status_check | CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text, 'archived'::text]))) |

-- 7. Destinataires email des tickets (A3 : combien sans email ?)
| total | avec_email | sans_email |
| ----- | ---------- | ---------- |
| 17 | 17 | 0 |

-- 8. États des lieux files/notifs (A3/A4 : volumes + doublons existants)
| status | count |
| ------ | ----- |
| queued | 7 |
| done | 7 |

-- 9. RLS effectives aujourd'hui (le doc peut être périmé comme pour password_hash)
| tablename | policyname | cmd | roles |
| -------------------- | ----------------------------------- | ------ | -------------------- |
| admin_users | admin_users_delete_admin | DELETE | {authenticated} |
| admin_users | admin_users_insert_admin | INSERT | {authenticated} |
| admin_users | admin_users_select_admin | SELECT | {authenticated} |
| admin_users | admin_users_update_admin | UPDATE | {authenticated} |
| interaction_messages | interaction_messages_delete_admin | DELETE | {authenticated} |
| interaction_messages | interaction_messages_insert_contact | INSERT | {anon} |
| interaction_messages | interaction_messages_insert_own | INSERT | {authenticated} |
| interaction_messages | interaction_messages_select_own | SELECT | {authenticated} |
| interaction_messages | interaction_messages_update_admin | UPDATE | {authenticated} |
| interactions | interactions_delete_admin | DELETE | {authenticated} |
| interactions | interactions_insert_contact | INSERT | {anon} |
| interactions | interactions_insert_own | INSERT | {authenticated} |
| interactions | interactions_select_own | SELECT | {authenticated} |
| interactions | interactions_update_own | UPDATE | {authenticated} |
| mockup_jobs | mockup_jobs_admin_all | ALL | {public} |
| notifications | notifications_delete_admin | DELETE | {authenticated} |
| notifications | notifications_insert_authenticated | INSERT | {authenticated} |
| notifications | notifications_select_admin | SELECT | {authenticated} |
| notifications | notifications_update_admin | UPDATE | {authenticated} |
| products | products_delete_admin | DELETE | {authenticated} |
| products | products_insert_admin | INSERT | {authenticated} |
| products | products_select_public | SELECT | {anon,authenticated} |
| products | products_update_admin | UPDATE | {authenticated} |
| reference_lists | reference_lists_delete_admin | DELETE | {authenticated} |
| reference_lists | reference_lists_insert_admin | INSERT | {authenticated} |
| reference_lists | reference_lists_select_public | SELECT | {anon,authenticated} |
| reference_lists | reference_lists_update_admin | UPDATE | {authenticated} |

-- 10. Références matériau en place ? (hors vague mais utile)
| value | label |
| ------------------ | ------------------ |
| acrylic | Acrylic |
| bamboo | Bamboo |
| ceramic | Ceramic |
| cotton | Cotton |
| cotton-combed | Combed Cotton |
| cotton-organic | Organic Cotton |
| elastane | Elastane |
| fleece | Fleece |
| fleece-organic | Organic Fleece |
| hemp | Hemp |
| linen | Linen |
| nylon | Nylon |
| polyester | Polyester |
| polyester-recycled | Recycled Polyester |
| viscose | Viscose |
| wool | Wool |

---

---

-- A. password_hash vraiment parti ? (ton doc le listait encore)
| colonnes_password_hash |
| ---------------------- |
| 0 |

-- B. Expressions exactes des 2 policies suspectes (le USING dit tout)
| policyname | cmd | qual | with_check |
| --------------------- | --- | ---------- | ---------- |
| mockup_jobs_admin_all | ALL | is_admin() | is_admin() |

-- C. Qui est le super_admin + job file en attente (contexte opérationnel)
| product_id | status | attempts | updated_at |
| ------------------------------------ | ------ | -------- | ----------------------------- |
| prod-printful-452224559 | queued | 0 | 2026-09-19 21:27:15.17937+00 |
| 72ced7ce-9aba-4dd0-add5-9db4542b3b8a | queued | 0 | 2026-09-19 21:26:14.655037+00 |
| 8af2a897-d8ee-4a0f-a21d-34aca74c70b3 | queued | 0 | 2026-09-19 21:26:11.778369+00 |
| 36c1d9fb-f52a-4a29-a54d-c2ba11ef851b | queued | 0 | 2026-09-19 21:25:11.683468+00 |
| prod-printful-452063370 | queued | 0 | 2026-09-19 21:25:00.913007+00 |
| d62f5fba-3da2-4544-a9d5-646994fb3382 | queued | 0 | 2026-09-19 21:24:00.65146+00 |
| 1fcbd09a-a05c-4477-84e2-19cf35b9d170 | queued | 0 | 2026-09-19 21:23:51.797195+00 |
