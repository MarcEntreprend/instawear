-- 🔍 Script 1 – Photographie complète de la base de données


-- =============================================================================
-- 1. COLONNES ET TYPES DE CHAQUE TABLE
-- =============================================================================
| table_name             | column_name                 | data_type                | is_nullable | column_default                                                                      |
| ---------------------- | --------------------------- | ------------------------ | ----------- | ----------------------------------------------------------------------------------- |
| admin_users            | id                          | uuid                     | NO          | uuid_generate_v4()                                                                  |
| admin_users            | email                       | text                     | NO          | null                                                                                |
| admin_users            | role                        | text                     | NO          | null                                                                                |
| admin_users            | password_hash               | text                     | YES         | null                                                                                |
| admin_users            | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| admin_users            | last_login_date             | timestamp with time zone | YES         | null                                                                                |
| api_connections        | id                          | text                     | NO          | ('api-'::text || (EXTRACT(epoch FROM now()))::text)                                 |
| api_connections        | name                        | text                     | NO          | null                                                                                |
| api_connections        | type                        | text                     | NO          | null                                                                                |
| api_connections        | service                     | text                     | NO          | null                                                                                |
| api_connections        | base_url                    | text                     | NO          | null                                                                                |
| api_connections        | api_key                     | text                     | NO          | ''::text                                                                            |
| api_connections        | api_secret                  | text                     | NO          | ''::text                                                                            |
| api_connections        | enabled                     | boolean                  | YES         | false                                                                               |
| api_connections        | last_sync_at                | timestamp with time zone | YES         | null                                                                                |
| api_connections        | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| api_connections        | updated_at                  | timestamp with time zone | YES         | now()                                                                               |
| cart_items             | id                          | text                     | NO          | uuid_generate_v4()                                                                  |
| cart_items             | client_id                   | text                     | NO          | null                                                                                |
| cart_items             | product_id                  | text                     | NO          | null                                                                                |
| cart_items             | selected_color              | text                     | NO          | null                                                                                |
| cart_items             | selected_size               | text                     | NO          | null                                                                                |
| cart_items             | quantity                    | integer                  | NO          | null                                                                                |
| cart_items             | added_at                    | timestamp with time zone | YES         | now()                                                                               |
| cart_items             | unit_price                  | numeric                  | NO          | 0                                                                                   |
| customer_addresses     | id                          | uuid                     | NO          | gen_random_uuid()                                                                   |
| customer_addresses     | customer_id                 | text                     | NO          | null                                                                                |
| customer_addresses     | full_name                   | text                     | NO          | ''::text                                                                            |
| customer_addresses     | address                     | text                     | NO          | ''::text                                                                            |
| customer_addresses     | city                        | text                     | NO          | ''::text                                                                            |
| customer_addresses     | zip                         | text                     | NO          | ''::text                                                                            |
| customer_addresses     | country                     | text                     | NO          | 'US'::text                                                                          |
| customer_addresses     | phone                       | text                     | NO          | ''::text                                                                            |
| customer_addresses     | is_default                  | boolean                  | NO          | false                                                                               |
| customer_addresses     | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| customer_addresses     | state_code                  | text                     | YES         | null                                                                                |
| customer_addresses     | tax_number                  | text                     | YES         | null                                                                                |
| customer_notifications | id                          | uuid                     | NO          | gen_random_uuid()                                                                   |
| customer_notifications | customer_id                 | text                     | NO          | null                                                                                |
| customer_notifications | title                       | text                     | NO          | null                                                                                |
| customer_notifications | message                     | text                     | NO          | null                                                                                |
| customer_notifications | type                        | text                     | NO          | 'order_status'::text                                                                |
| customer_notifications | is_read                     | boolean                  | NO          | false                                                                               |
| customer_notifications | metadata                    | jsonb                    | YES         | '{}'::jsonb                                                                         |
| customer_notifications | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| customers              | id                          | text                     | NO          | (gen_random_uuid())::text                                                           |
| customers              | email                       | text                     | NO          | null                                                                                |
| customers              | name                        | text                     | YES         | null                                                                                |
| customers              | registration_date           | timestamp with time zone | YES         | now()                                                                               |
| customers              | last_login_date             | timestamp with time zone | YES         | null                                                                                |
| customers              | email_preferences           | jsonb                    | YES         | '{"promotions": false, "shipping_update": true, "order_confirmation": true}'::jsonb |
| customers              | date_of_birth               | date                     | YES         | null                                                                                |
| email_automations      | id                          | uuid                     | NO          | gen_random_uuid()                                                                   |
| email_automations      | name                        | text                     | NO          | null                                                                                |
| email_automations      | trigger_type                | text                     | NO          | null                                                                                |
| email_automations      | enabled                     | boolean                  | NO          | false                                                                               |
| email_automations      | delay_days                  | integer                  | NO          | 0                                                                                   |
| email_automations      | subject                     | text                     | NO          | ''::text                                                                            |
| email_automations      | html_body                   | text                     | NO          | ''::text                                                                            |
| email_automations      | sent_count                  | integer                  | YES         | 0                                                                                   |
| email_automations      | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| email_automations      | updated_at                  | timestamp with time zone | YES         | now()                                                                               |
| email_campaigns        | id                          | uuid                     | NO          | gen_random_uuid()                                                                   |
| email_campaigns        | title                       | text                     | NO          | null                                                                                |
| email_campaigns        | subject                     | text                     | NO          | null                                                                                |
| email_campaigns        | preview_text                | text                     | YES         | null                                                                                |
| email_campaigns        | html_body                   | text                     | NO          | ''::text                                                                            |
| email_campaigns        | audience_type               | text                     | NO          | 'newsletter'::text                                                                  |
| email_campaigns        | audience_filter             | jsonb                    | YES         | '{}'::jsonb                                                                         |
| email_campaigns        | status                      | text                     | NO          | 'draft'::text                                                                       |
| email_campaigns        | scheduled_at                | timestamp with time zone | YES         | null                                                                                |
| email_campaigns        | sent_at                     | timestamp with time zone | YES         | null                                                                                |
| email_campaigns        | recipient_count             | integer                  | YES         | null                                                                                |
| email_campaigns        | stats                       | jsonb                    | YES         | '{}'::jsonb                                                                         |
| email_campaigns        | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| email_campaigns        | updated_at                  | timestamp with time zone | YES         | now()                                                                               |
| email_sender_settings  | id                          | uuid                     | NO          | gen_random_uuid()                                                                   |
| email_sender_settings  | from_name                   | text                     | NO          | 'InstaWear'::text                                                                   |
| email_sender_settings  | from_email                  | text                     | NO          | 'hello@instawear.com'::text                                                         |
| email_sender_settings  | reply_to                    | text                     | NO          | 'support@instawear.com'::text                                                       |
| email_sender_settings  | footer_html                 | text                     | NO          | ''::text                                                                            |
| email_sender_settings  | unsubscribe_text            | text                     | NO          | 'Se désabonner'::text                                                               |
| email_sender_settings  | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| email_sender_settings  | updated_at                  | timestamp with time zone | YES         | now()                                                                               |
| favourites             | id                          | text                     | NO          | uuid_generate_v4()                                                                  |
| favourites             | client_id                   | text                     | NO          | null                                                                                |
| favourites             | product_id                  | text                     | NO          | null                                                                                |
| favourites             | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| hero_promotions        | id                          | text                     | NO          | uuid_generate_v4()                                                                  |
| hero_promotions        | product_id                  | text                     | NO          | null                                                                                |
| hero_promotions        | title                       | text                     | YES         | null                                                                                |
| hero_promotions        | headline                    | text                     | YES         | null                                                                                |
| hero_promotions        | sub                         | text                     | YES         | null                                                                                |
| hero_promotions        | cta                         | text                     | YES         | null                                                                                |
| hero_promotions        | bg_gradient                 | text                     | YES         | null                                                                                |
| hero_promotions        | tag                         | text                     | YES         | null                                                                                |
| hero_promotions        | image                       | text                     | YES         | null                                                                                |
| hero_promotions        | order                       | integer                  | NO          | 0                                                                                   |
| hero_promotions        | show_tag                    | boolean                  | YES         | true                                                                                |
| hero_promotions        | show_title                  | boolean                  | YES         | true                                                                                |
| hero_promotions        | is_active                   | boolean                  | YES         | true                                                                                |
| interaction_messages   | id                          | uuid                     | NO          | gen_random_uuid()                                                                   |
| interaction_messages   | interaction_id              | uuid                     | YES         | null                                                                                |
| interaction_messages   | from_field                  | text                     | NO          | null                                                                                |
| interaction_messages   | text                        | text                     | NO          | null                                                                                |
| interaction_messages   | timestamp                   | timestamp with time zone | YES         | now()                                                                               |
| interactions           | id                          | uuid                     | NO          | gen_random_uuid()                                                                   |
| interactions           | customer_id                 | text                     | NO          | null                                                                                |
| interactions           | customer_name               | text                     | NO          | null                                                                                |
| interactions           | customer_email              | text                     | NO          | null                                                                                |
| interactions           | type                        | text                     | NO          | null                                                                                |
| interactions           | status                      | text                     | NO          | 'open'::text                                                                        |
| interactions           | subject                     | text                     | NO          | null                                                                                |
| interactions           | last_message                | text                     | YES         | ''::text                                                                            |
| interactions           | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| interactions           | updated_at                  | timestamp with time zone | YES         | now()                                                                               |
| interactions           | metadata                    | jsonb                    | YES         | '{}'::jsonb                                                                         |
| newsletter_subscribers | email                       | text                     | NO          | null                                                                                |
| newsletter_subscribers | subscribed_at               | timestamp with time zone | YES         | now()                                                                               |
| notifications          | id                          | uuid                     | NO          | gen_random_uuid()                                                                   |
| notifications          | title                       | text                     | NO          | null                                                                                |
| notifications          | description                 | text                     | YES         | ''::text                                                                            |
| notifications          | category                    | text                     | NO          | null                                                                                |
| notifications          | priority                    | text                     | NO          | 'medium'::text                                                                      |
| notifications          | status                      | text                     | NO          | 'unread'::text                                                                      |
| notifications          | timestamp                   | timestamp with time zone | YES         | now()                                                                               |
| notifications          | metadata                    | jsonb                    | YES         | '{}'::jsonb                                                                         |
| notifications          | action_label                | text                     | YES         | null                                                                                |
| notifications          | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| notifications          | updated_at                  | timestamp with time zone | YES         | now()                                                                               |
| order_items            | id                          | text                     | NO          | null                                                                                |
| order_items            | order_id                    | text                     | NO          | null                                                                                |
| order_items            | product_id                  | text                     | YES         | null                                                                                |
| order_items            | product_title               | text                     | YES         | null                                                                                |
| order_items            | product_image               | text                     | YES         | null                                                                                |
| order_items            | selected_color              | text                     | NO          | null                                                                                |
| order_items            | selected_size               | text                     | NO          | null                                                                                |
| order_items            | quantity                    | integer                  | NO          | null                                                                                |
| order_items            | unit_price                  | numeric                  | NO          | null                                                                                |
| orders                 | id                          | text                     | NO          | null                                                                                |
| orders                 | client_id                   | text                     | YES         | null                                                                                |
| orders                 | client_name                 | text                     | YES         | null                                                                                |
| orders                 | client_email                | text                     | YES         | null                                                                                |
| orders                 | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| orders                 | status                      | text                     | NO          | null                                                                                |
| orders                 | total_amount                | numeric                  | NO          | null                                                                                |
| orders                 | shipping_cost               | numeric                  | YES         | 0                                                                                   |
| orders                 | shipping_address_full_name  | text                     | YES         | null                                                                                |
| orders                 | shipping_address_address    | text                     | YES         | null                                                                                |
| orders                 | shipping_address_city       | text                     | YES         | null                                                                                |
| orders                 | shipping_address_zip        | text                     | YES         | null                                                                                |
| orders                 | shipping_address_country    | text                     | YES         | null                                                                                |
| orders                 | shipping_address_phone      | text                     | YES         | null                                                                                |
| orders                 | external_order_id           | text                     | YES         | null                                                                                |
| orders                 | notes                       | text                     | YES         | null                                                                                |
| orders                 | shipping_address_state_code | text                     | YES         | null                                                                                |
| orders                 | shipping_address_tax_number | text                     | YES         | null                                                                                |
| orders                 | tracking_info               | jsonb                    | YES         | null                                                                                |
| pod_settings           | id                          | text                     | NO          | 'pod-main'::text                                                                    |
| pod_settings           | api_key                     | text                     | NO          | ''::text                                                                            |
| pod_settings           | store_id                    | text                     | YES         | null                                                                                |
| pod_settings           | store_name                  | text                     | NO          | 'InstaWear Boutique'::text                                                          |
| pod_settings           | is_connected                | boolean                  | YES         | false                                                                               |
| pod_settings           | last_sync_at                | timestamp with time zone | YES         | null                                                                                |
| pod_settings           | products_synced_count       | integer                  | YES         | 0                                                                                   |
| pod_settings           | sync_status                 | text                     | YES         | 'idle'::text                                                                        |
| product_mockups        | id                          | text                     | NO          | (gen_random_uuid())::text                                                           |
| product_mockups        | product_id                  | text                     | NO          | null                                                                                |
| product_mockups        | color                       | text                     | NO          | null                                                                                |
| product_mockups        | catalog_variant_ids         | ARRAY                    | NO          | '{}'::integer[]                                                                     |
| product_mockups        | mockup_url                  | text                     | NO          | null                                                                                |
| product_mockups        | storage_url                 | text                     | YES         | null                                                                                |
| product_mockups        | placement                   | text                     | NO          | 'front'::text                                                                       |
| product_mockups        | created_at                  | timestamp with time zone | NO          | now()                                                                               |
| product_reviews        | id                          | uuid                     | NO          | gen_random_uuid()                                                                   |
| product_reviews        | product_id                  | text                     | NO          | null                                                                                |
| product_reviews        | customer_id                 | text                     | NO          | null                                                                                |
| product_reviews        | customer_name               | text                     | NO          | 'Anonymous'::text                                                                   |
| product_reviews        | rating                      | integer                  | NO          | null                                                                                |
| product_reviews        | comment                     | text                     | YES         | ''::text                                                                            |
| product_reviews        | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| product_sales_stats    | product_id                  | text                     | YES         | null                                                                                |
| product_sales_stats    | total_bought                | bigint                   | YES         | null                                                                                |
| product_sales_stats    | bought_last_month           | bigint                   | YES         | null                                                                                |
| products               | id                          | text                     | NO          | (gen_random_uuid())::text                                                           |
| products               | is_active                   | boolean                  | NO          | true                                                                                |
| products               | title                       | text                     | NO          | null                                                                                |
| products               | brand                       | text                     | NO          | 'INSTAWEAR'::text                                                                   |
| products               | description                 | text                     | NO          | ''::text                                                                            |
| products               | full_description            | text                     | YES         | null                                                                                |
| products               | image                       | text                     | NO          | null                                                                                |
| products               | gallery                     | ARRAY                    | NO          | '{}'::text[]                                                                        |
| products               | mockup_preset               | text                     | YES         | null                                                                                |
| products               | price                       | numeric                  | NO          | null                                                                                |
| products               | original_price              | numeric                  | YES         | null                                                                                |
| products               | in_stock                    | boolean                  | NO          | true                                                                                |
| products               | stock_quantity              | integer                  | YES         | 0                                                                                   |
| products               | colors                      | ARRAY                    | NO          | '{}'::text[]                                                                        |
| products               | color_names                 | ARRAY                    | YES         | null                                                                                |
| products               | sizes                       | ARRAY                    | NO          | '{}'::text[]                                                                        |
| products               | size_surcharge              | jsonb                    | YES         | null                                                                                |
| products               | size_guide                  | jsonb                    | YES         | null                                                                                |
| products               | category                    | text                     | NO          | null                                                                                |
| products               | event_type                  | text                     | NO          | null                                                                                |
| products               | style                       | text                     | NO          | null                                                                                |
| products               | material                    | text                     | YES         | null                                                                                |
| products               | tags                        | ARRAY                    | NO          | '{}'::text[]                                                                        |
| products               | is_best_seller              | boolean                  | YES         | false                                                                               |
| products               | is_limited_time             | boolean                  | YES         | false                                                                               |
| products               | deal_active                 | boolean                  | YES         | false                                                                               |
| products               | deal_ends_at                | timestamp with time zone | YES         | null                                                                                |
| products               | deal_price                  | numeric                  | YES         | null                                                                                |
| products               | external_product_id         | text                     | YES         | null                                                                                |
| products               | external_variant_id         | text                     | YES         | null                                                                                |
| products               | last_external_sync          | timestamp with time zone | YES         | null                                                                                |
| products               | ratings_score               | numeric                  | YES         | null                                                                                |
| products               | ratings_count               | integer                  | YES         | 0                                                                                   |
| products               | bought_last_month           | integer                  | YES         | 0                                                                                   |
| products               | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| products               | updated_at                  | timestamp with time zone | YES         | now()                                                                               |
| products               | affiliate_mode              | boolean                  | YES         | false                                                                               |
| products               | affiliate_url               | text                     | YES         | null                                                                                |
| products               | printful_price              | numeric                  | YES         | null                                                                                |
| products               | printful_currency           | text                     | YES         | null                                                                                |
| products               | shipping_estimate           | numeric                  | YES         | null                                                                                |
| products               | color_images                | ARRAY                    | YES         | '{}'::text[]                                                                        |
| products               | variants                    | jsonb                    | YES         | '[]'::jsonb                                                                         |
| products               | show_ratings                | boolean                  | YES         | false                                                                               |
| products               | show_bought                 | boolean                  | YES         | false                                                                               |
| reference_lists        | id                          | text                     | NO          | null                                                                                |
| reference_lists        | type                        | text                     | NO          | null                                                                                |
| reference_lists        | value                       | text                     | NO          | null                                                                                |
| reference_lists        | label                       | text                     | NO          | null                                                                                |
| reference_lists        | keywords                    | ARRAY                    | YES         | '{}'::text[]                                                                        |
| reference_lists        | sort_order                  | integer                  | YES         | 0                                                                                   |
| reference_lists        | created_at                  | timestamp with time zone | YES         | now()                                                                               |
| store_settings         | id                          | boolean                  | NO          | true                                                                                |
| store_settings         | store_name                  | text                     | NO          | 'InstaWear'::text                                                                   |
| store_settings         | currency                    | text                     | NO          | 'EUR'::text                                                                         |
| store_settings         | country                     | text                     | NO          | 'FR'::text                                                                          |
| store_settings         | free_shipping_threshold     | numeric                  | NO          | 35                                                                                  |
| store_settings         | shipping_cost               | numeric                  | NO          | 4.99                                                                                |
| store_settings         | shipping_delay              | text                     | NO          | '3-5 jours ouvrés'::text                                                            |
| store_settings         | global_countdown_end        | timestamp with time zone | YES         | null                                                                                |
| store_settings         | shipping_delay_min_days     | integer                  | YES         | null                                                                                |
| store_settings         | shipping_delay_max_days     | integer                  | YES         | null                                                                                |
| sync_logs              | id                          | text                     | NO          | ('log-'::text || (EXTRACT(epoch FROM now()))::text)                                 |
| sync_logs              | sync_date                   | timestamp with time zone | YES         | now()                                                                               |
| sync_logs              | status                      | text                     | NO          | null                                                                                |
| sync_logs              | message                     | text                     | YES         | null                                                                                |
| sync_logs              | product_id                  | text                     | YES         | null                                                                                |
| sync_logs              | duration                    | integer                  | YES         | null                                                                                |

-- =============================================================================
-- 2. CONTRAINTES (PK, FK, UNIQUE, CHECK)
-- =============================================================================
| table_name             | constraint_name                           | constraint_type | column_name    | foreign_table          | foreign_column          |
| ---------------------- | ----------------------------------------- | --------------- | -------------- | ---------------------- | ----------------------- |
| admin_users            | 2200_17724_1_not_null                     | CHECK           | null           | null                   | null                    |
| admin_users            | 2200_17724_2_not_null                     | CHECK           | null           | null                   | null                    |
| admin_users            | 2200_17724_3_not_null                     | CHECK           | null           | null                   | null                    |
| admin_users            | admin_users_email_key                     | UNIQUE          | email          | admin_users            | email                   |
| admin_users            | admin_users_pkey                          | PRIMARY KEY     | id             | admin_users            | id                      |
| admin_users            | admin_users_role_check                    | CHECK           | null           | admin_users            | role                    |
| api_connections        | 2200_17710_1_not_null                     | CHECK           | null           | null                   | null                    |
| api_connections        | 2200_17710_2_not_null                     | CHECK           | null           | null                   | null                    |
| api_connections        | 2200_17710_3_not_null                     | CHECK           | null           | null                   | null                    |
| api_connections        | 2200_17710_4_not_null                     | CHECK           | null           | null                   | null                    |
| api_connections        | 2200_17710_5_not_null                     | CHECK           | null           | null                   | null                    |
| api_connections        | 2200_17710_6_not_null                     | CHECK           | null           | null                   | null                    |
| api_connections        | 2200_17710_7_not_null                     | CHECK           | null           | null                   | null                    |
| api_connections        | api_connections_pkey                      | PRIMARY KEY     | id             | api_connections        | id                      |
| api_connections        | api_connections_type_check                | CHECK           | null           | api_connections        | type                    |
| cart_items             | 2200_17628_1_not_null                     | CHECK           | null           | null                   | null                    |
| cart_items             | 2200_17628_2_not_null                     | CHECK           | null           | null                   | null                    |
| cart_items             | 2200_17628_3_not_null                     | CHECK           | null           | null                   | null                    |
| cart_items             | 2200_17628_4_not_null                     | CHECK           | null           | null                   | null                    |
| cart_items             | 2200_17628_5_not_null                     | CHECK           | null           | null                   | null                    |
| cart_items             | 2200_17628_6_not_null                     | CHECK           | null           | null                   | null                    |
| cart_items             | 2200_17628_8_not_null                     | CHECK           | null           | null                   | null                    |
| cart_items             | cart_items_client_id_fkey                 | FOREIGN KEY     | client_id      | customers              | id                      |
| cart_items             | cart_items_pkey                           | PRIMARY KEY     | id             | cart_items             | id                      |
| cart_items             | cart_items_product_id_fkey                | FOREIGN KEY     | product_id     | products               | id                      |
| cart_items             | cart_items_quantity_check                 | CHECK           | null           | cart_items             | quantity                |
| cart_items             | cart_items_unique                         | UNIQUE          | selected_size  | cart_items             | client_id               |
| cart_items             | cart_items_unique                         | UNIQUE          | selected_size  | cart_items             | product_id              |
| cart_items             | cart_items_unique                         | UNIQUE          | selected_size  | cart_items             | selected_color          |
| cart_items             | cart_items_unique                         | UNIQUE          | selected_size  | cart_items             | selected_size           |
| cart_items             | cart_items_unique                         | UNIQUE          | selected_color | cart_items             | selected_size           |
| cart_items             | cart_items_unique                         | UNIQUE          | selected_color | cart_items             | selected_color          |
| cart_items             | cart_items_unique                         | UNIQUE          | selected_color | cart_items             | product_id              |
| cart_items             | cart_items_unique                         | UNIQUE          | selected_color | cart_items             | client_id               |
| cart_items             | cart_items_unique                         | UNIQUE          | product_id     | cart_items             | selected_size           |
| cart_items             | cart_items_unique                         | UNIQUE          | product_id     | cart_items             | selected_color          |
| cart_items             | cart_items_unique                         | UNIQUE          | product_id     | cart_items             | product_id              |
| cart_items             | cart_items_unique                         | UNIQUE          | product_id     | cart_items             | client_id               |
| cart_items             | cart_items_unique                         | UNIQUE          | client_id      | cart_items             | selected_size           |
| cart_items             | cart_items_unique                         | UNIQUE          | client_id      | cart_items             | selected_color          |
| cart_items             | cart_items_unique                         | UNIQUE          | client_id      | cart_items             | product_id              |
| cart_items             | cart_items_unique                         | UNIQUE          | client_id      | cart_items             | client_id               |
| customer_addresses     | 2200_18930_1_not_null                     | CHECK           | null           | null                   | null                    |
| customer_addresses     | 2200_18930_2_not_null                     | CHECK           | null           | null                   | null                    |
| customer_addresses     | 2200_18930_3_not_null                     | CHECK           | null           | null                   | null                    |
| customer_addresses     | 2200_18930_4_not_null                     | CHECK           | null           | null                   | null                    |
| customer_addresses     | 2200_18930_5_not_null                     | CHECK           | null           | null                   | null                    |
| customer_addresses     | 2200_18930_6_not_null                     | CHECK           | null           | null                   | null                    |
| customer_addresses     | 2200_18930_7_not_null                     | CHECK           | null           | null                   | null                    |
| customer_addresses     | 2200_18930_8_not_null                     | CHECK           | null           | null                   | null                    |
| customer_addresses     | 2200_18930_9_not_null                     | CHECK           | null           | null                   | null                    |
| customer_addresses     | customer_addresses_customer_id_fkey       | FOREIGN KEY     | customer_id    | customers              | id                      |
| customer_addresses     | customer_addresses_pkey                   | PRIMARY KEY     | id             | customer_addresses     | id                      |
| customer_notifications | 2200_18855_1_not_null                     | CHECK           | null           | null                   | null                    |
| customer_notifications | 2200_18855_2_not_null                     | CHECK           | null           | null                   | null                    |
| customer_notifications | 2200_18855_3_not_null                     | CHECK           | null           | null                   | null                    |
| customer_notifications | 2200_18855_4_not_null                     | CHECK           | null           | null                   | null                    |
| customer_notifications | 2200_18855_5_not_null                     | CHECK           | null           | null                   | null                    |
| customer_notifications | 2200_18855_6_not_null                     | CHECK           | null           | null                   | null                    |
| customer_notifications | customer_notifications_pkey               | PRIMARY KEY     | id             | customer_notifications | id                      |
| customers              | 2200_17595_1_not_null                     | CHECK           | null           | null                   | null                    |
| customers              | 2200_17595_2_not_null                     | CHECK           | null           | null                   | null                    |
| customers              | customers_email_key                       | UNIQUE          | email          | customers              | email                   |
| customers              | customers_pkey                            | PRIMARY KEY     | id             | customers              | id                      |
| email_automations      | 2200_18888_1_not_null                     | CHECK           | null           | null                   | null                    |
| email_automations      | 2200_18888_2_not_null                     | CHECK           | null           | null                   | null                    |
| email_automations      | 2200_18888_3_not_null                     | CHECK           | null           | null                   | null                    |
| email_automations      | 2200_18888_4_not_null                     | CHECK           | null           | null                   | null                    |
| email_automations      | 2200_18888_5_not_null                     | CHECK           | null           | null                   | null                    |
| email_automations      | 2200_18888_6_not_null                     | CHECK           | null           | null                   | null                    |
| email_automations      | 2200_18888_7_not_null                     | CHECK           | null           | null                   | null                    |
| email_automations      | email_automations_pkey                    | PRIMARY KEY     | id             | email_automations      | id                      |
| email_campaigns        | 2200_18873_1_not_null                     | CHECK           | null           | null                   | null                    |
| email_campaigns        | 2200_18873_2_not_null                     | CHECK           | null           | null                   | null                    |
| email_campaigns        | 2200_18873_3_not_null                     | CHECK           | null           | null                   | null                    |
| email_campaigns        | 2200_18873_5_not_null                     | CHECK           | null           | null                   | null                    |
| email_campaigns        | 2200_18873_6_not_null                     | CHECK           | null           | null                   | null                    |
| email_campaigns        | 2200_18873_8_not_null                     | CHECK           | null           | null                   | null                    |
| email_campaigns        | email_campaigns_pkey                      | PRIMARY KEY     | id             | email_campaigns        | id                      |
| email_sender_settings  | 2200_18903_1_not_null                     | CHECK           | null           | null                   | null                    |
| email_sender_settings  | 2200_18903_2_not_null                     | CHECK           | null           | null                   | null                    |
| email_sender_settings  | 2200_18903_3_not_null                     | CHECK           | null           | null                   | null                    |
| email_sender_settings  | 2200_18903_4_not_null                     | CHECK           | null           | null                   | null                    |
| email_sender_settings  | 2200_18903_5_not_null                     | CHECK           | null           | null                   | null                    |
| email_sender_settings  | 2200_18903_6_not_null                     | CHECK           | null           | null                   | null                    |
| email_sender_settings  | email_sender_settings_pkey                | PRIMARY KEY     | id             | email_sender_settings  | id                      |
| favourites             | 2200_17609_1_not_null                     | CHECK           | null           | null                   | null                    |
| favourites             | 2200_17609_2_not_null                     | CHECK           | null           | null                   | null                    |
| favourites             | 2200_17609_3_not_null                     | CHECK           | null           | null                   | null                    |
| favourites             | favourites_client_id_fkey                 | FOREIGN KEY     | client_id      | customers              | id                      |
| favourites             | favourites_client_id_product_id_key       | UNIQUE          | client_id      | favourites             | client_id               |
| favourites             | favourites_client_id_product_id_key       | UNIQUE          | client_id      | favourites             | product_id              |
| favourites             | favourites_client_id_product_id_key       | UNIQUE          | product_id     | favourites             | product_id              |
| favourites             | favourites_client_id_product_id_key       | UNIQUE          | product_id     | favourites             | client_id               |
| favourites             | favourites_pkey                           | PRIMARY KEY     | id             | favourites             | id                      |
| favourites             | favourites_product_id_fkey                | FOREIGN KEY     | product_id     | products               | id                      |
| hero_promotions        | 2200_17751_10_not_null                    | CHECK           | null           | null                   | null                    |
| hero_promotions        | 2200_17751_1_not_null                     | CHECK           | null           | null                   | null                    |
| hero_promotions        | 2200_17751_2_not_null                     | CHECK           | null           | null                   | null                    |
| hero_promotions        | hero_promotions_pkey                      | PRIMARY KEY     | id             | hero_promotions        | id                      |
| hero_promotions        | hero_promotions_product_id_fkey           | FOREIGN KEY     | product_id     | products               | id                      |
| interaction_messages   | 2200_18688_1_not_null                     | CHECK           | null           | null                   | null                    |
| interaction_messages   | 2200_18688_3_not_null                     | CHECK           | null           | null                   | null                    |
| interaction_messages   | 2200_18688_4_not_null                     | CHECK           | null           | null                   | null                    |
| interaction_messages   | interaction_messages_from_field_check     | CHECK           | null           | interaction_messages   | from_field              |
| interaction_messages   | interaction_messages_interaction_id_fkey  | FOREIGN KEY     | interaction_id | interactions           | id                      |
| interaction_messages   | interaction_messages_pkey                 | PRIMARY KEY     | id             | interaction_messages   | id                      |
| interactions           | 2200_18673_1_not_null                     | CHECK           | null           | null                   | null                    |
| interactions           | 2200_18673_2_not_null                     | CHECK           | null           | null                   | null                    |
| interactions           | 2200_18673_3_not_null                     | CHECK           | null           | null                   | null                    |
| interactions           | 2200_18673_4_not_null                     | CHECK           | null           | null                   | null                    |
| interactions           | 2200_18673_5_not_null                     | CHECK           | null           | null                   | null                    |
| interactions           | 2200_18673_6_not_null                     | CHECK           | null           | null                   | null                    |
| interactions           | 2200_18673_7_not_null                     | CHECK           | null           | null                   | null                    |
| interactions           | interactions_pkey                         | PRIMARY KEY     | id             | interactions           | id                      |
| interactions           | interactions_status_check                 | CHECK           | null           | interactions           | status                  |
| interactions           | interactions_type_check                   | CHECK           | null           | interactions           | type                    |
| newsletter_subscribers | 2200_18843_1_not_null                     | CHECK           | null           | null                   | null                    |
| newsletter_subscribers | newsletter_subscribers_pkey               | PRIMARY KEY     | email          | newsletter_subscribers | email                   |
| notifications          | 2200_18615_1_not_null                     | CHECK           | null           | null                   | null                    |
| notifications          | 2200_18615_2_not_null                     | CHECK           | null           | null                   | null                    |
| notifications          | 2200_18615_4_not_null                     | CHECK           | null           | null                   | null                    |
| notifications          | 2200_18615_5_not_null                     | CHECK           | null           | null                   | null                    |
| notifications          | 2200_18615_6_not_null                     | CHECK           | null           | null                   | null                    |
| notifications          | notifications_category_check              | CHECK           | null           | notifications          | category                |
| notifications          | notifications_pkey                        | PRIMARY KEY     | id             | notifications          | id                      |
| notifications          | notifications_priority_check              | CHECK           | null           | notifications          | priority                |
| notifications          | notifications_status_check                | CHECK           | null           | notifications          | status                  |
| order_items            | 2200_17663_1_not_null                     | CHECK           | null           | null                   | null                    |
| order_items            | 2200_17663_2_not_null                     | CHECK           | null           | null                   | null                    |
| order_items            | 2200_17663_6_not_null                     | CHECK           | null           | null                   | null                    |
| order_items            | 2200_17663_7_not_null                     | CHECK           | null           | null                   | null                    |
| order_items            | 2200_17663_8_not_null                     | CHECK           | null           | null                   | null                    |
| order_items            | 2200_17663_9_not_null                     | CHECK           | null           | null                   | null                    |
| order_items            | order_items_order_id_fkey                 | FOREIGN KEY     | order_id       | orders                 | id                      |
| order_items            | order_items_pkey                          | PRIMARY KEY     | id             | order_items            | id                      |
| order_items            | order_items_product_id_fkey               | FOREIGN KEY     | product_id     | products               | id                      |
| order_items            | order_items_quantity_check                | CHECK           | null           | order_items            | quantity                |
| orders                 | 2200_17648_1_not_null                     | CHECK           | null           | null                   | null                    |
| orders                 | 2200_17648_6_not_null                     | CHECK           | null           | null                   | null                    |
| orders                 | 2200_17648_7_not_null                     | CHECK           | null           | null                   | null                    |
| orders                 | orders_pkey                               | PRIMARY KEY     | id             | orders                 | id                      |
| orders                 | orders_status_check                       | CHECK           | null           | orders                 | status                  |
| pod_settings           | 2200_17681_1_not_null                     | CHECK           | null           | null                   | null                    |
| pod_settings           | 2200_17681_2_not_null                     | CHECK           | null           | null                   | null                    |
| pod_settings           | 2200_17681_4_not_null                     | CHECK           | null           | null                   | null                    |
| pod_settings           | pod_settings_pkey                         | PRIMARY KEY     | id             | pod_settings           | id                      |
| pod_settings           | pod_settings_sync_status_check            | CHECK           | null           | pod_settings           | sync_status             |
| product_mockups        | 2200_19002_1_not_null                     | CHECK           | null           | null                   | null                    |
| product_mockups        | 2200_19002_2_not_null                     | CHECK           | null           | null                   | null                    |
| product_mockups        | 2200_19002_3_not_null                     | CHECK           | null           | null                   | null                    |
| product_mockups        | 2200_19002_4_not_null                     | CHECK           | null           | null                   | null                    |
| product_mockups        | 2200_19002_5_not_null                     | CHECK           | null           | null                   | null                    |
| product_mockups        | 2200_19002_7_not_null                     | CHECK           | null           | null                   | null                    |
| product_mockups        | 2200_19002_8_not_null                     | CHECK           | null           | null                   | null                    |
| product_mockups        | product_mockups_pkey                      | PRIMARY KEY     | id             | product_mockups        | id                      |
| product_mockups        | product_mockups_product_id_fkey           | FOREIGN KEY     | product_id     | products               | id                      |
| product_reviews        | 2200_19126_1_not_null                     | CHECK           | null           | null                   | null                    |
| product_reviews        | 2200_19126_2_not_null                     | CHECK           | null           | null                   | null                    |
| product_reviews        | 2200_19126_3_not_null                     | CHECK           | null           | null                   | null                    |
| product_reviews        | 2200_19126_4_not_null                     | CHECK           | null           | null                   | null                    |
| product_reviews        | 2200_19126_5_not_null                     | CHECK           | null           | null                   | null                    |
| product_reviews        | product_reviews_pkey                      | PRIMARY KEY     | id             | product_reviews        | id                      |
| product_reviews        | product_reviews_product_id_fkey           | FOREIGN KEY     | product_id     | products               | id                      |
| product_reviews        | product_reviews_rating_check              | CHECK           | null           | product_reviews        | rating                  |
| products               | 2200_17559_10_not_null                    | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_12_not_null                    | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_14_not_null                    | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_16_not_null                    | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_19_not_null                    | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_1_not_null                     | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_20_not_null                    | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_21_not_null                    | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_23_not_null                    | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_2_not_null                     | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_3_not_null                     | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_4_not_null                     | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_5_not_null                     | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_7_not_null                     | CHECK           | null           | null                   | null                    |
| products               | 2200_17559_8_not_null                     | CHECK           | null           | null                   | null                    |
| products               | products_original_price_check             | CHECK           | null           | products               | original_price          |
| products               | products_pkey                             | PRIMARY KEY     | id             | products               | id                      |
| products               | products_price_check                      | CHECK           | null           | products               | price                   |
| products               | products_ratings_count_check              | CHECK           | null           | products               | ratings_count           |
| products               | products_ratings_score_check              | CHECK           | null           | products               | ratings_score           |
| products               | products_stock_quantity_check             | CHECK           | null           | products               | stock_quantity          |
| reference_lists        | 2200_18567_1_not_null                     | CHECK           | null           | null                   | null                    |
| reference_lists        | 2200_18567_2_not_null                     | CHECK           | null           | null                   | null                    |
| reference_lists        | 2200_18567_3_not_null                     | CHECK           | null           | null                   | null                    |
| reference_lists        | 2200_18567_4_not_null                     | CHECK           | null           | null                   | null                    |
| reference_lists        | reference_lists_pkey                      | PRIMARY KEY     | id             | reference_lists        | id                      |
| store_settings         | 2200_17736_1_not_null                     | CHECK           | null           | null                   | null                    |
| store_settings         | 2200_17736_2_not_null                     | CHECK           | null           | null                   | null                    |
| store_settings         | 2200_17736_3_not_null                     | CHECK           | null           | null                   | null                    |
| store_settings         | 2200_17736_4_not_null                     | CHECK           | null           | null                   | null                    |
| store_settings         | 2200_17736_5_not_null                     | CHECK           | null           | null                   | null                    |
| store_settings         | 2200_17736_6_not_null                     | CHECK           | null           | null                   | null                    |
| store_settings         | 2200_17736_7_not_null                     | CHECK           | null           | null                   | null                    |
| store_settings         | store_settings_id_check                   | CHECK           | null           | store_settings         | id                      |
| store_settings         | store_settings_pkey                       | PRIMARY KEY     | id             | store_settings         | id                      |
| store_settings         | store_settings_shipping_delay_range_check | CHECK           | null           | store_settings         | shipping_delay_min_days |
| store_settings         | store_settings_shipping_delay_range_check | CHECK           | null           | store_settings         | shipping_delay_max_days |
| sync_logs              | 2200_17695_1_not_null                     | CHECK           | null           | null                   | null                    |
| sync_logs              | 2200_17695_3_not_null                     | CHECK           | null           | null                   | null                    |
| sync_logs              | sync_logs_pkey                            | PRIMARY KEY     | id             | sync_logs              | id                      |
| sync_logs              | sync_logs_product_id_fkey                 | FOREIGN KEY     | product_id     | products               | id                      |
| sync_logs              | sync_logs_status_check                    | CHECK           | null           | sync_logs              | status                  |

-- =============================================================================
-- 3. RLS ACTIVÉ PAR TABLE (true = RLS ON)
-- =============================================================================
| tablename              | rowsecurity |
| ---------------------- | ----------- |
| admin_users            | true        |
| api_connections        | true        |
| cart_items             | true        |
| customer_addresses     | true        |
| customer_notifications | true        |
| customers              | true        |
| email_automations      | true        |
| email_campaigns        | true        |
| email_sender_settings  | true        |
| favourites             | true        |
| hero_promotions        | true        |
| interaction_messages   | true        |
| interactions           | true        |
| newsletter_subscribers | true        |
| notifications          | true        |
| order_items            | true        |
| orders                 | true        |
| pod_settings           | true        |
| product_mockups        | true        |
| product_reviews        | true        |
| products               | true        |
| reference_lists        | true        |
| store_settings         | true        |
| sync_logs              | true        |

-- =============================================================================
-- 4. POLITIQUES RLS EXISTANTES
-- =============================================================================
| schemaname | tablename              | policyname                             | permissive | roles                | cmd    | qual                                                                                                                                                                                                | with_check                                                                                                                                                                                          |
| ---------- | ---------------------- | -------------------------------------- | ---------- | -------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public     | admin_users            | admin_users_delete_admin               | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | admin_users            | admin_users_insert_admin               | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | admin_users            | admin_users_select_admin               | PERMISSIVE | {authenticated}      | SELECT | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | admin_users            | admin_users_update_admin               | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | api_connections        | api_connections_delete_admin           | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | api_connections        | api_connections_insert_admin           | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | api_connections        | api_connections_select_admin           | PERMISSIVE | {authenticated}      | SELECT | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | api_connections        | api_connections_update_admin           | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | cart_items             | cart_items_delete_own                  | PERMISSIVE | {authenticated}      | DELETE | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | null                                                                                                                                                                                                |
| public     | cart_items             | cart_items_insert_own                  | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 |
| public     | cart_items             | cart_items_select_own                  | PERMISSIVE | {authenticated}      | SELECT | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | null                                                                                                                                                                                                |
| public     | cart_items             | cart_items_update_own                  | PERMISSIVE | {authenticated}      | UPDATE | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 |
| public     | customer_addresses     | customer_addresses_delete_own          | PERMISSIVE | {authenticated}      | DELETE | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     | null                                                                                                                                                                                                |
| public     | customer_addresses     | customer_addresses_insert_own          | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     |
| public     | customer_addresses     | customer_addresses_select_own          | PERMISSIVE | {authenticated}      | SELECT | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     | null                                                                                                                                                                                                |
| public     | customer_addresses     | customer_addresses_update_own          | PERMISSIVE | {authenticated}      | UPDATE | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     |
| public     | customer_notifications | customer_notifications_delete_own      | PERMISSIVE | {authenticated}      | DELETE | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) | null                                                                                                                                                                                                |
| public     | customer_notifications | customer_notifications_insert_own      | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) |
| public     | customer_notifications | customer_notifications_select_own      | PERMISSIVE | {authenticated}      | SELECT | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) | null                                                                                                                                                                                                |
| public     | customer_notifications | customer_notifications_update_own      | PERMISSIVE | {authenticated}      | UPDATE | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) |
| public     | customers              | customers_delete_admin                 | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | customers              | customers_insert_own                   | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | (is_admin() OR (id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text)))                                                                                                               |
| public     | customers              | customers_select_own                   | PERMISSIVE | {authenticated}      | SELECT | (is_admin() OR (id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text)))                                                                                                               | null                                                                                                                                                                                                |
| public     | customers              | customers_update_own                   | PERMISSIVE | {authenticated}      | UPDATE | (is_admin() OR (id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text)))                                                                                                               | (is_admin() OR (id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text)))                                                                                                               |
| public     | email_automations      | email_automations_delete_admin         | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | email_automations      | email_automations_insert_admin         | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | email_automations      | email_automations_select_authenticated | PERMISSIVE | {authenticated}      | SELECT | (is_admin() OR ((trigger_type = 'welcome'::text) AND (enabled = true)))                                                                                                                             | null                                                                                                                                                                                                |
| public     | email_automations      | email_automations_select_welcome       | PERMISSIVE | {anon}               | SELECT | ((trigger_type = 'welcome'::text) AND (enabled = true))                                                                                                                                             | null                                                                                                                                                                                                |
| public     | email_automations      | email_automations_update_admin         | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | email_campaigns        | email_campaigns_delete_admin           | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | email_campaigns        | email_campaigns_insert_admin           | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | email_campaigns        | email_campaigns_select_admin           | PERMISSIVE | {authenticated}      | SELECT | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | email_campaigns        | email_campaigns_update_admin           | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | email_sender_settings  | email_sender_settings_delete_admin     | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | email_sender_settings  | email_sender_settings_insert_admin     | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | email_sender_settings  | email_sender_settings_select_admin     | PERMISSIVE | {authenticated}      | SELECT | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | email_sender_settings  | email_sender_settings_update_admin     | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | favourites             | favourites_delete_own                  | PERMISSIVE | {authenticated}      | DELETE | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | null                                                                                                                                                                                                |
| public     | favourites             | favourites_insert_own                  | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 |
| public     | favourites             | favourites_select_own                  | PERMISSIVE | {authenticated}      | SELECT | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | null                                                                                                                                                                                                |
| public     | favourites             | favourites_update_own                  | PERMISSIVE | {authenticated}      | UPDATE | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 |
| public     | hero_promotions        | hero_promotions_delete_admin           | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | hero_promotions        | hero_promotions_insert_admin           | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | hero_promotions        | hero_promotions_select_public          | PERMISSIVE | {anon,authenticated} | SELECT | true                                                                                                                                                                                                | null                                                                                                                                                                                                |
| public     | hero_promotions        | hero_promotions_update_admin           | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | interaction_messages   | interaction_messages_delete_admin      | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | interaction_messages   | interaction_messages_insert_own        | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | (is_admin() OR (EXISTS ( SELECT 1
   FROM interactions i
  WHERE ((i.id = interaction_messages.interaction_id) AND (i.customer_email = (auth.jwt() ->> 'email'::text))))))                          |
| public     | interaction_messages   | interaction_messages_select_own        | PERMISSIVE | {authenticated}      | SELECT | (is_admin() OR (EXISTS ( SELECT 1
   FROM interactions i
  WHERE ((i.id = interaction_messages.interaction_id) AND (i.customer_email = (auth.jwt() ->> 'email'::text))))))                          | null                                                                                                                                                                                                |
| public     | interaction_messages   | interaction_messages_update_admin      | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | interactions           | interactions_delete_admin              | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | interactions           | interactions_insert_own                | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | (is_admin() OR (customer_email = (auth.jwt() ->> 'email'::text)))                                                                                                                                   |
| public     | interactions           | interactions_select_own                | PERMISSIVE | {authenticated}      | SELECT | (is_admin() OR (customer_email = (auth.jwt() ->> 'email'::text)))                                                                                                                                   | null                                                                                                                                                                                                |
| public     | interactions           | interactions_update_own                | PERMISSIVE | {authenticated}      | UPDATE | (is_admin() OR (customer_email = (auth.jwt() ->> 'email'::text)))                                                                                                                                   | (is_admin() OR (customer_email = (auth.jwt() ->> 'email'::text)))                                                                                                                                   |
| public     | notifications          | notifications_delete_admin             | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | notifications          | notifications_insert_public            | PERMISSIVE | {anon,authenticated} | INSERT | null                                                                                                                                                                                                | true                                                                                                                                                                                                |
| public     | notifications          | notifications_select_admin             | PERMISSIVE | {authenticated}      | SELECT | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | notifications          | notifications_update_admin             | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | order_items            | order_items_delete_admin               | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | order_items            | order_items_insert_public              | PERMISSIVE | {anon,authenticated} | INSERT | null                                                                                                                                                                                                | true                                                                                                                                                                                                |
| public     | order_items            | order_items_select_owner               | PERMISSIVE | {anon,authenticated} | SELECT | (is_admin() OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND ((o.client_id = (auth.uid())::text) OR (o.client_email = (auth.jwt() ->> 'email'::text)))))))         | null                                                                                                                                                                                                |
| public     | order_items            | order_items_update_admin               | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | orders                 | orders_delete_public                   | PERMISSIVE | {anon,authenticated} | DELETE | (is_admin() OR ((status = 'pending'::text) AND (created_at > (now() - '01:00:00'::interval))))                                                                                                      | null                                                                                                                                                                                                |
| public     | orders                 | orders_insert_check                    | PERMISSIVE | {anon,authenticated} | INSERT | null                                                                                                                                                                                                | (is_admin() OR ((status = 'pending'::text) AND ((client_id IS NULL) OR (client_id = (auth.uid())::text))))                                                                                          |
| public     | orders                 | orders_select_owner                    | PERMISSIVE | {anon,authenticated} | SELECT | (is_admin() OR (client_id = (auth.uid())::text) OR (client_email = (auth.jwt() ->> 'email'::text)))                                                                                                 | null                                                                                                                                                                                                |
| public     | orders                 | orders_update_admin                    | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | pod_settings           | pod_settings_delete_admin              | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | pod_settings           | pod_settings_insert_admin              | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | pod_settings           | pod_settings_select_admin              | PERMISSIVE | {authenticated}      | SELECT | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | pod_settings           | pod_settings_update_admin              | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | product_mockups        | product_mockups_delete_admin           | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | product_mockups        | product_mockups_insert_admin           | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | product_mockups        | product_mockups_select_public          | PERMISSIVE | {anon,authenticated} | SELECT | true                                                                                                                                                                                                | null                                                                                                                                                                                                |
| public     | product_mockups        | product_mockups_update_admin           | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | product_reviews        | product_reviews_delete_admin           | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | product_reviews        | product_reviews_insert_admin           | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | product_reviews        | product_reviews_select_public          | PERMISSIVE | {anon,authenticated} | SELECT | true                                                                                                                                                                                                | null                                                                                                                                                                                                |
| public     | product_reviews        | product_reviews_update_admin           | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | products               | products_delete_admin                  | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | products               | products_insert_admin                  | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | products               | products_select_public                 | PERMISSIVE | {anon,authenticated} | SELECT | true                                                                                                                                                                                                | null                                                                                                                                                                                                |
| public     | products               | products_update_admin                  | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | reference_lists        | reference_lists_delete_admin           | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | reference_lists        | reference_lists_insert_admin           | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | reference_lists        | reference_lists_select_public          | PERMISSIVE | {anon,authenticated} | SELECT | true                                                                                                                                                                                                | null                                                                                                                                                                                                |
| public     | reference_lists        | reference_lists_update_admin           | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | store_settings         | store_settings_delete_admin            | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | store_settings         | store_settings_insert_admin            | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | store_settings         | store_settings_select_public           | PERMISSIVE | {anon,authenticated} | SELECT | true                                                                                                                                                                                                | null                                                                                                                                                                                                |
| public     | store_settings         | store_settings_update_admin            | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| public     | sync_logs              | sync_logs_delete_admin                 | PERMISSIVE | {authenticated}      | DELETE | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | sync_logs              | sync_logs_insert_admin                 | PERMISSIVE | {authenticated}      | INSERT | null                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| public     | sync_logs              | sync_logs_select_admin                 | PERMISSIVE | {authenticated}      | SELECT | is_admin()                                                                                                                                                                                          | null                                                                                                                                                                                                |
| public     | sync_logs              | sync_logs_update_admin                 | PERMISSIVE | {authenticated}      | UPDATE | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |

-- =============================================================================
-- 5. PRIVILÈGES PAR TABLE (qui peut quoi)
-- =============================================================================
| grantee       | table_name             | privilege_type |
| ------------- | ---------------------- | -------------- |
| anon          | api_connections        | DELETE         |
| anon          | api_connections        | INSERT         |
| anon          | api_connections        | SELECT         |
| anon          | api_connections        | UPDATE         |
| anon          | cart_items             | DELETE         |
| anon          | cart_items             | INSERT         |
| anon          | cart_items             | SELECT         |
| anon          | cart_items             | UPDATE         |
| anon          | customer_addresses     | DELETE         |
| anon          | customer_addresses     | INSERT         |
| anon          | customer_addresses     | SELECT         |
| anon          | customer_addresses     | UPDATE         |
| anon          | customer_notifications | DELETE         |
| anon          | customer_notifications | INSERT         |
| anon          | customer_notifications | SELECT         |
| anon          | customer_notifications | UPDATE         |
| anon          | customers              | DELETE         |
| anon          | customers              | INSERT         |
| anon          | customers              | SELECT         |
| anon          | customers              | UPDATE         |
| anon          | email_automations      | DELETE         |
| anon          | email_automations      | INSERT         |
| anon          | email_automations      | SELECT         |
| anon          | email_automations      | UPDATE         |
| anon          | email_campaigns        | DELETE         |
| anon          | email_campaigns        | INSERT         |
| anon          | email_campaigns        | SELECT         |
| anon          | email_campaigns        | UPDATE         |
| anon          | email_sender_settings  | DELETE         |
| anon          | email_sender_settings  | INSERT         |
| anon          | email_sender_settings  | SELECT         |
| anon          | email_sender_settings  | UPDATE         |
| anon          | favourites             | DELETE         |
| anon          | favourites             | INSERT         |
| anon          | favourites             | SELECT         |
| anon          | favourites             | UPDATE         |
| anon          | hero_promotions        | DELETE         |
| anon          | hero_promotions        | INSERT         |
| anon          | hero_promotions        | SELECT         |
| anon          | hero_promotions        | UPDATE         |
| anon          | interaction_messages   | DELETE         |
| anon          | interaction_messages   | INSERT         |
| anon          | interaction_messages   | SELECT         |
| anon          | interaction_messages   | UPDATE         |
| anon          | interactions           | DELETE         |
| anon          | interactions           | INSERT         |
| anon          | interactions           | SELECT         |
| anon          | interactions           | UPDATE         |
| anon          | newsletter_subscribers | DELETE         |
| anon          | newsletter_subscribers | INSERT         |
| anon          | newsletter_subscribers | SELECT         |
| anon          | newsletter_subscribers | UPDATE         |
| anon          | notifications          | DELETE         |
| anon          | notifications          | INSERT         |
| anon          | notifications          | SELECT         |
| anon          | notifications          | UPDATE         |
| anon          | order_items            | DELETE         |
| anon          | order_items            | INSERT         |
| anon          | order_items            | SELECT         |
| anon          | order_items            | UPDATE         |
| anon          | orders                 | DELETE         |
| anon          | orders                 | INSERT         |
| anon          | orders                 | SELECT         |
| anon          | orders                 | UPDATE         |
| anon          | pod_settings           | DELETE         |
| anon          | pod_settings           | INSERT         |
| anon          | pod_settings           | SELECT         |
| anon          | pod_settings           | UPDATE         |
| anon          | product_mockups        | DELETE         |
| anon          | product_mockups        | INSERT         |
| anon          | product_mockups        | SELECT         |
| anon          | product_mockups        | UPDATE         |
| anon          | product_reviews        | DELETE         |
| anon          | product_reviews        | INSERT         |
| anon          | product_reviews        | SELECT         |
| anon          | product_reviews        | UPDATE         |
| anon          | product_sales_stats    | DELETE         |
| anon          | product_sales_stats    | INSERT         |
| anon          | product_sales_stats    | REFERENCES     |
| anon          | product_sales_stats    | SELECT         |
| anon          | product_sales_stats    | TRIGGER        |
| anon          | product_sales_stats    | TRUNCATE       |
| anon          | product_sales_stats    | UPDATE         |
| anon          | products               | DELETE         |
| anon          | products               | INSERT         |
| anon          | products               | SELECT         |
| anon          | products               | UPDATE         |
| anon          | reference_lists        | DELETE         |
| anon          | reference_lists        | INSERT         |
| anon          | reference_lists        | SELECT         |
| anon          | reference_lists        | UPDATE         |
| anon          | store_settings         | DELETE         |
| anon          | store_settings         | INSERT         |
| anon          | store_settings         | SELECT         |
| anon          | store_settings         | UPDATE         |
| anon          | sync_logs              | DELETE         |
| anon          | sync_logs              | INSERT         |
| anon          | sync_logs              | SELECT         |
| anon          | sync_logs              | UPDATE         |
| authenticated | admin_users            | DELETE         |
| authenticated | admin_users            | INSERT         |
| authenticated | admin_users            | SELECT         |
| authenticated | admin_users            | UPDATE         |
| authenticated | api_connections        | DELETE         |
| authenticated | api_connections        | INSERT         |
| authenticated | api_connections        | SELECT         |
| authenticated | api_connections        | UPDATE         |
| authenticated | cart_items             | DELETE         |
| authenticated | cart_items             | INSERT         |
| authenticated | cart_items             | SELECT         |
| authenticated | cart_items             | UPDATE         |
| authenticated | customer_addresses     | DELETE         |
| authenticated | customer_addresses     | INSERT         |
| authenticated | customer_addresses     | SELECT         |
| authenticated | customer_addresses     | UPDATE         |
| authenticated | customer_notifications | DELETE         |
| authenticated | customer_notifications | INSERT         |
| authenticated | customer_notifications | SELECT         |
| authenticated | customer_notifications | UPDATE         |
| authenticated | customers              | DELETE         |
| authenticated | customers              | INSERT         |
| authenticated | customers              | SELECT         |
| authenticated | customers              | UPDATE         |
| authenticated | email_automations      | DELETE         |
| authenticated | email_automations      | INSERT         |
| authenticated | email_automations      | SELECT         |
| authenticated | email_automations      | UPDATE         |
| authenticated | email_campaigns        | DELETE         |
| authenticated | email_campaigns        | INSERT         |
| authenticated | email_campaigns        | SELECT         |
| authenticated | email_campaigns        | UPDATE         |
| authenticated | email_sender_settings  | DELETE         |
| authenticated | email_sender_settings  | INSERT         |
| authenticated | email_sender_settings  | SELECT         |
| authenticated | email_sender_settings  | UPDATE         |
| authenticated | favourites             | DELETE         |
| authenticated | favourites             | INSERT         |
| authenticated | favourites             | SELECT         |
| authenticated | favourites             | UPDATE         |
| authenticated | hero_promotions        | DELETE         |
| authenticated | hero_promotions        | INSERT         |
| authenticated | hero_promotions        | SELECT         |
| authenticated | hero_promotions        | UPDATE         |
| authenticated | interaction_messages   | DELETE         |
| authenticated | interaction_messages   | INSERT         |
| authenticated | interaction_messages   | SELECT         |
| authenticated | interaction_messages   | UPDATE         |
| authenticated | interactions           | DELETE         |
| authenticated | interactions           | INSERT         |
| authenticated | interactions           | SELECT         |
| authenticated | interactions           | UPDATE         |
| authenticated | newsletter_subscribers | DELETE         |
| authenticated | newsletter_subscribers | INSERT         |
| authenticated | newsletter_subscribers | SELECT         |
| authenticated | newsletter_subscribers | UPDATE         |
| authenticated | notifications          | DELETE         |
| authenticated | notifications          | INSERT         |
| authenticated | notifications          | SELECT         |
| authenticated | notifications          | UPDATE         |
| authenticated | order_items            | DELETE         |
| authenticated | order_items            | INSERT         |
| authenticated | order_items            | SELECT         |
| authenticated | order_items            | UPDATE         |
| authenticated | orders                 | DELETE         |
| authenticated | orders                 | INSERT         |
| authenticated | orders                 | SELECT         |
| authenticated | orders                 | UPDATE         |
| authenticated | pod_settings           | DELETE         |
| authenticated | pod_settings           | INSERT         |
| authenticated | pod_settings           | SELECT         |
| authenticated | pod_settings           | UPDATE         |
| authenticated | product_mockups        | DELETE         |
| authenticated | product_mockups        | INSERT         |
| authenticated | product_mockups        | SELECT         |
| authenticated | product_mockups        | UPDATE         |
| authenticated | product_reviews        | DELETE         |
| authenticated | product_reviews        | INSERT         |
| authenticated | product_reviews        | SELECT         |
| authenticated | product_reviews        | UPDATE         |
| authenticated | product_sales_stats    | DELETE         |
| authenticated | product_sales_stats    | INSERT         |
| authenticated | product_sales_stats    | REFERENCES     |
| authenticated | product_sales_stats    | SELECT         |
| authenticated | product_sales_stats    | TRIGGER        |
| authenticated | product_sales_stats    | TRUNCATE       |
| authenticated | product_sales_stats    | UPDATE         |
| authenticated | products               | DELETE         |
| authenticated | products               | INSERT         |
| authenticated | products               | SELECT         |
| authenticated | products               | UPDATE         |
| authenticated | reference_lists        | DELETE         |
| authenticated | reference_lists        | INSERT         |
| authenticated | reference_lists        | SELECT         |
| authenticated | reference_lists        | UPDATE         |
| authenticated | store_settings         | DELETE         |
| authenticated | store_settings         | INSERT         |
| authenticated | store_settings         | SELECT         |
| authenticated | store_settings         | UPDATE         |
| authenticated | sync_logs              | DELETE         |
| authenticated | sync_logs              | INSERT         |
| authenticated | sync_logs              | SELECT         |
| authenticated | sync_logs              | UPDATE         |
| postgres      | admin_users            | DELETE         |
| postgres      | admin_users            | INSERT         |
| postgres      | admin_users            | REFERENCES     |
| postgres      | admin_users            | SELECT         |
| postgres      | admin_users            | TRIGGER        |
| postgres      | admin_users            | TRUNCATE       |
| postgres      | admin_users            | UPDATE         |
| postgres      | api_connections        | DELETE         |
| postgres      | api_connections        | INSERT         |
| postgres      | api_connections        | REFERENCES     |
| postgres      | api_connections        | SELECT         |
| postgres      | api_connections        | TRIGGER        |
| postgres      | api_connections        | TRUNCATE       |
| postgres      | api_connections        | UPDATE         |
| postgres      | cart_items             | DELETE         |
| postgres      | cart_items             | INSERT         |
| postgres      | cart_items             | REFERENCES     |
| postgres      | cart_items             | SELECT         |
| postgres      | cart_items             | TRIGGER        |
| postgres      | cart_items             | TRUNCATE       |
| postgres      | cart_items             | UPDATE         |
| postgres      | customer_addresses     | DELETE         |
| postgres      | customer_addresses     | INSERT         |
| postgres      | customer_addresses     | REFERENCES     |
| postgres      | customer_addresses     | SELECT         |
| postgres      | customer_addresses     | TRIGGER        |
| postgres      | customer_addresses     | TRUNCATE       |
| postgres      | customer_addresses     | UPDATE         |
| postgres      | customer_notifications | DELETE         |
| postgres      | customer_notifications | INSERT         |
| postgres      | customer_notifications | REFERENCES     |
| postgres      | customer_notifications | SELECT         |
| postgres      | customer_notifications | TRIGGER        |
| postgres      | customer_notifications | TRUNCATE       |
| postgres      | customer_notifications | UPDATE         |
| postgres      | customers              | DELETE         |
| postgres      | customers              | INSERT         |
| postgres      | customers              | REFERENCES     |
| postgres      | customers              | SELECT         |
| postgres      | customers              | TRIGGER        |
| postgres      | customers              | TRUNCATE       |
| postgres      | customers              | UPDATE         |
| postgres      | email_automations      | DELETE         |
| postgres      | email_automations      | INSERT         |
| postgres      | email_automations      | REFERENCES     |
| postgres      | email_automations      | SELECT         |
| postgres      | email_automations      | TRIGGER        |
| postgres      | email_automations      | TRUNCATE       |
| postgres      | email_automations      | UPDATE         |
| postgres      | email_campaigns        | DELETE         |
| postgres      | email_campaigns        | INSERT         |
| postgres      | email_campaigns        | REFERENCES     |
| postgres      | email_campaigns        | SELECT         |
| postgres      | email_campaigns        | TRIGGER        |
| postgres      | email_campaigns        | TRUNCATE       |
| postgres      | email_campaigns        | UPDATE         |
| postgres      | email_sender_settings  | DELETE         |
| postgres      | email_sender_settings  | INSERT         |
| postgres      | email_sender_settings  | REFERENCES     |
| postgres      | email_sender_settings  | SELECT         |
| postgres      | email_sender_settings  | TRIGGER        |
| postgres      | email_sender_settings  | TRUNCATE       |
| postgres      | email_sender_settings  | UPDATE         |
| postgres      | favourites             | DELETE         |
| postgres      | favourites             | INSERT         |
| postgres      | favourites             | REFERENCES     |
| postgres      | favourites             | SELECT         |
| postgres      | favourites             | TRIGGER        |
| postgres      | favourites             | TRUNCATE       |
| postgres      | favourites             | UPDATE         |
| postgres      | hero_promotions        | DELETE         |
| postgres      | hero_promotions        | INSERT         |
| postgres      | hero_promotions        | REFERENCES     |
| postgres      | hero_promotions        | SELECT         |
| postgres      | hero_promotions        | TRIGGER        |
| postgres      | hero_promotions        | TRUNCATE       |
| postgres      | hero_promotions        | UPDATE         |
| postgres      | interaction_messages   | DELETE         |
| postgres      | interaction_messages   | INSERT         |
| postgres      | interaction_messages   | REFERENCES     |
| postgres      | interaction_messages   | SELECT         |
| postgres      | interaction_messages   | TRIGGER        |
| postgres      | interaction_messages   | TRUNCATE       |
| postgres      | interaction_messages   | UPDATE         |
| postgres      | interactions           | DELETE         |
| postgres      | interactions           | INSERT         |
| postgres      | interactions           | REFERENCES     |
| postgres      | interactions           | SELECT         |
| postgres      | interactions           | TRIGGER        |
| postgres      | interactions           | TRUNCATE       |
| postgres      | interactions           | UPDATE         |
| postgres      | newsletter_subscribers | DELETE         |
| postgres      | newsletter_subscribers | INSERT         |
| postgres      | newsletter_subscribers | REFERENCES     |
| postgres      | newsletter_subscribers | SELECT         |
| postgres      | newsletter_subscribers | TRIGGER        |
| postgres      | newsletter_subscribers | TRUNCATE       |
| postgres      | newsletter_subscribers | UPDATE         |
| postgres      | notifications          | DELETE         |
| postgres      | notifications          | INSERT         |
| postgres      | notifications          | REFERENCES     |
| postgres      | notifications          | SELECT         |
| postgres      | notifications          | TRIGGER        |
| postgres      | notifications          | TRUNCATE       |
| postgres      | notifications          | UPDATE         |
| postgres      | order_items            | DELETE         |
| postgres      | order_items            | INSERT         |
| postgres      | order_items            | REFERENCES     |
| postgres      | order_items            | SELECT         |
| postgres      | order_items            | TRIGGER        |
| postgres      | order_items            | TRUNCATE       |
| postgres      | order_items            | UPDATE         |
| postgres      | orders                 | DELETE         |
| postgres      | orders                 | INSERT         |
| postgres      | orders                 | REFERENCES     |
| postgres      | orders                 | SELECT         |
| postgres      | orders                 | TRIGGER        |
| postgres      | orders                 | TRUNCATE       |
| postgres      | orders                 | UPDATE         |
| postgres      | pod_settings           | DELETE         |
| postgres      | pod_settings           | INSERT         |
| postgres      | pod_settings           | REFERENCES     |
| postgres      | pod_settings           | SELECT         |
| postgres      | pod_settings           | TRIGGER        |
| postgres      | pod_settings           | TRUNCATE       |
| postgres      | pod_settings           | UPDATE         |
| postgres      | product_mockups        | DELETE         |
| postgres      | product_mockups        | INSERT         |
| postgres      | product_mockups        | REFERENCES     |
| postgres      | product_mockups        | SELECT         |
| postgres      | product_mockups        | TRIGGER        |
| postgres      | product_mockups        | TRUNCATE       |
| postgres      | product_mockups        | UPDATE         |
| postgres      | product_reviews        | DELETE         |
| postgres      | product_reviews        | INSERT         |
| postgres      | product_reviews        | REFERENCES     |
| postgres      | product_reviews        | SELECT         |
| postgres      | product_reviews        | TRIGGER        |
| postgres      | product_reviews        | TRUNCATE       |
| postgres      | product_reviews        | UPDATE         |
| postgres      | product_sales_stats    | DELETE         |
| postgres      | product_sales_stats    | INSERT         |
| postgres      | product_sales_stats    | REFERENCES     |
| postgres      | product_sales_stats    | SELECT         |
| postgres      | product_sales_stats    | TRIGGER        |
| postgres      | product_sales_stats    | TRUNCATE       |
| postgres      | product_sales_stats    | UPDATE         |
| postgres      | products               | DELETE         |
| postgres      | products               | INSERT         |
| postgres      | products               | REFERENCES     |
| postgres      | products               | SELECT         |
| postgres      | products               | TRIGGER        |
| postgres      | products               | TRUNCATE       |
| postgres      | products               | UPDATE         |
| postgres      | reference_lists        | DELETE         |
| postgres      | reference_lists        | INSERT         |
| postgres      | reference_lists        | REFERENCES     |
| postgres      | reference_lists        | SELECT         |
| postgres      | reference_lists        | TRIGGER        |
| postgres      | reference_lists        | TRUNCATE       |
| postgres      | reference_lists        | UPDATE         |
| postgres      | store_settings         | DELETE         |
| postgres      | store_settings         | INSERT         |
| postgres      | store_settings         | REFERENCES     |
| postgres      | store_settings         | SELECT         |
| postgres      | store_settings         | TRIGGER        |
| postgres      | store_settings         | TRUNCATE       |
| postgres      | store_settings         | UPDATE         |
| postgres      | sync_logs              | DELETE         |
| postgres      | sync_logs              | INSERT         |
| postgres      | sync_logs              | REFERENCES     |
| postgres      | sync_logs              | SELECT         |
| postgres      | sync_logs              | TRIGGER        |
| postgres      | sync_logs              | TRUNCATE       |
| postgres      | sync_logs              | UPDATE         |
| service_role  | admin_users            | DELETE         |
| service_role  | admin_users            | INSERT         |
| service_role  | admin_users            | REFERENCES     |
| service_role  | admin_users            | SELECT         |
| service_role  | admin_users            | TRIGGER        |
| service_role  | admin_users            | TRUNCATE       |
| service_role  | admin_users            | UPDATE         |
| service_role  | api_connections        | DELETE         |
| service_role  | api_connections        | INSERT         |
| service_role  | api_connections        | REFERENCES     |
| service_role  | api_connections        | SELECT         |
| service_role  | api_connections        | TRIGGER        |
| service_role  | api_connections        | TRUNCATE       |
| service_role  | api_connections        | UPDATE         |
| service_role  | cart_items             | DELETE         |
| service_role  | cart_items             | INSERT         |
| service_role  | cart_items             | REFERENCES     |
| service_role  | cart_items             | SELECT         |
| service_role  | cart_items             | TRIGGER        |
| service_role  | cart_items             | TRUNCATE       |
| service_role  | cart_items             | UPDATE         |
| service_role  | customer_addresses     | DELETE         |
| service_role  | customer_addresses     | INSERT         |
| service_role  | customer_addresses     | REFERENCES     |
| service_role  | customer_addresses     | SELECT         |
| service_role  | customer_addresses     | TRIGGER        |
| service_role  | customer_addresses     | TRUNCATE       |
| service_role  | customer_addresses     | UPDATE         |
| service_role  | customer_notifications | DELETE         |
| service_role  | customer_notifications | INSERT         |
| service_role  | customer_notifications | REFERENCES     |
| service_role  | customer_notifications | SELECT         |
| service_role  | customer_notifications | TRIGGER        |
| service_role  | customer_notifications | TRUNCATE       |
| service_role  | customer_notifications | UPDATE         |
| service_role  | customers              | DELETE         |
| service_role  | customers              | INSERT         |
| service_role  | customers              | REFERENCES     |
| service_role  | customers              | SELECT         |
| service_role  | customers              | TRIGGER        |
| service_role  | customers              | TRUNCATE       |
| service_role  | customers              | UPDATE         |
| service_role  | email_automations      | DELETE         |
| service_role  | email_automations      | INSERT         |
| service_role  | email_automations      | REFERENCES     |
| service_role  | email_automations      | SELECT         |
| service_role  | email_automations      | TRIGGER        |
| service_role  | email_automations      | TRUNCATE       |
| service_role  | email_automations      | UPDATE         |
| service_role  | email_campaigns        | DELETE         |
| service_role  | email_campaigns        | INSERT         |
| service_role  | email_campaigns        | REFERENCES     |
| service_role  | email_campaigns        | SELECT         |
| service_role  | email_campaigns        | TRIGGER        |
| service_role  | email_campaigns        | TRUNCATE       |
| service_role  | email_campaigns        | UPDATE         |
| service_role  | email_sender_settings  | DELETE         |
| service_role  | email_sender_settings  | INSERT         |
| service_role  | email_sender_settings  | REFERENCES     |
| service_role  | email_sender_settings  | SELECT         |
| service_role  | email_sender_settings  | TRIGGER        |
| service_role  | email_sender_settings  | TRUNCATE       |
| service_role  | email_sender_settings  | UPDATE         |
| service_role  | favourites             | DELETE         |
| service_role  | favourites             | INSERT         |
| service_role  | favourites             | REFERENCES     |
| service_role  | favourites             | SELECT         |
| service_role  | favourites             | TRIGGER        |
| service_role  | favourites             | TRUNCATE       |
| service_role  | favourites             | UPDATE         |
| service_role  | hero_promotions        | DELETE         |
| service_role  | hero_promotions        | INSERT         |
| service_role  | hero_promotions        | REFERENCES     |
| service_role  | hero_promotions        | SELECT         |
| service_role  | hero_promotions        | TRIGGER        |
| service_role  | hero_promotions        | TRUNCATE       |
| service_role  | hero_promotions        | UPDATE         |
| service_role  | interaction_messages   | DELETE         |
| service_role  | interaction_messages   | INSERT         |
| service_role  | interaction_messages   | REFERENCES     |
| service_role  | interaction_messages   | SELECT         |
| service_role  | interaction_messages   | TRIGGER        |
| service_role  | interaction_messages   | TRUNCATE       |
| service_role  | interaction_messages   | UPDATE         |
| service_role  | interactions           | DELETE         |
| service_role  | interactions           | INSERT         |
| service_role  | interactions           | REFERENCES     |
| service_role  | interactions           | SELECT         |
| service_role  | interactions           | TRIGGER        |
| service_role  | interactions           | TRUNCATE       |
| service_role  | interactions           | UPDATE         |
| service_role  | newsletter_subscribers | DELETE         |
| service_role  | newsletter_subscribers | INSERT         |
| service_role  | newsletter_subscribers | REFERENCES     |
| service_role  | newsletter_subscribers | SELECT         |
| service_role  | newsletter_subscribers | TRIGGER        |
| service_role  | newsletter_subscribers | TRUNCATE       |
| service_role  | newsletter_subscribers | UPDATE         |
| service_role  | notifications          | DELETE         |
| service_role  | notifications          | INSERT         |
| service_role  | notifications          | REFERENCES     |
| service_role  | notifications          | SELECT         |
| service_role  | notifications          | TRIGGER        |
| service_role  | notifications          | TRUNCATE       |
| service_role  | notifications          | UPDATE         |
| service_role  | order_items            | DELETE         |
| service_role  | order_items            | INSERT         |
| service_role  | order_items            | REFERENCES     |
| service_role  | order_items            | SELECT         |
| service_role  | order_items            | TRIGGER        |
| service_role  | order_items            | TRUNCATE       |
| service_role  | order_items            | UPDATE         |
| service_role  | orders                 | DELETE         |
| service_role  | orders                 | INSERT         |
| service_role  | orders                 | REFERENCES     |
| service_role  | orders                 | SELECT         |
| service_role  | orders                 | TRIGGER        |
| service_role  | orders                 | TRUNCATE       |
| service_role  | orders                 | UPDATE         |
| service_role  | pod_settings           | DELETE         |
| service_role  | pod_settings           | INSERT         |
| service_role  | pod_settings           | REFERENCES     |
| service_role  | pod_settings           | SELECT         |
| service_role  | pod_settings           | TRIGGER        |
| service_role  | pod_settings           | TRUNCATE       |
| service_role  | pod_settings           | UPDATE         |
| service_role  | product_mockups        | DELETE         |
| service_role  | product_mockups        | INSERT         |
| service_role  | product_mockups        | REFERENCES     |
| service_role  | product_mockups        | SELECT         |
| service_role  | product_mockups        | TRIGGER        |
| service_role  | product_mockups        | TRUNCATE       |
| service_role  | product_mockups        | UPDATE         |
| service_role  | product_reviews        | DELETE         |
| service_role  | product_reviews        | INSERT         |
| service_role  | product_reviews        | REFERENCES     |
| service_role  | product_reviews        | SELECT         |
| service_role  | product_reviews        | TRIGGER        |
| service_role  | product_reviews        | TRUNCATE       |
| service_role  | product_reviews        | UPDATE         |
| service_role  | product_sales_stats    | DELETE         |
| service_role  | product_sales_stats    | INSERT         |
| service_role  | product_sales_stats    | REFERENCES     |
| service_role  | product_sales_stats    | SELECT         |
| service_role  | product_sales_stats    | TRIGGER        |
| service_role  | product_sales_stats    | TRUNCATE       |
| service_role  | product_sales_stats    | UPDATE         |
| service_role  | products               | DELETE         |
| service_role  | products               | INSERT         |
| service_role  | products               | REFERENCES     |
| service_role  | products               | SELECT         |
| service_role  | products               | TRIGGER        |
| service_role  | products               | TRUNCATE       |
| service_role  | products               | UPDATE         |
| service_role  | reference_lists        | DELETE         |
| service_role  | reference_lists        | INSERT         |
| service_role  | reference_lists        | REFERENCES     |
| service_role  | reference_lists        | SELECT         |
| service_role  | reference_lists        | TRIGGER        |
| service_role  | reference_lists        | TRUNCATE       |
| service_role  | reference_lists        | UPDATE         |
| service_role  | store_settings         | DELETE         |
| service_role  | store_settings         | INSERT         |
| service_role  | store_settings         | REFERENCES     |
| service_role  | store_settings         | SELECT         |
| service_role  | store_settings         | TRIGGER        |
| service_role  | store_settings         | TRUNCATE       |
| service_role  | store_settings         | UPDATE         |
| service_role  | sync_logs              | DELETE         |
| service_role  | sync_logs              | INSERT         |
| service_role  | sync_logs              | REFERENCES     |
| service_role  | sync_logs              | SELECT         |
| service_role  | sync_logs              | TRIGGER        |
| service_role  | sync_logs              | TRUNCATE       |
| service_role  | sync_logs              | UPDATE         |

-- =============================================================================
-- 6. FONCTIONS (avec code source)
-- =============================================================================
| routine_name                | routine_type | data_type | routine_definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| check_notification_rate     | FUNCTION     | trigger   | 
BEGIN
  -- Limiter le rôle anon à 20 insertions par minute
  IF auth.role() = 'anon' AND (
    SELECT count(*) FROM public.notifications
    WHERE timestamp > now() - interval '1 minute'
  ) >= 20 THEN
    RAISE EXCEPTION 'Rate limit exceeded for notifications';
  END IF;
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| get_email_prefs             | FUNCTION     | jsonb     | 
  SELECT email_preferences
  FROM public.customers
  WHERE email = p_email
  LIMIT 1;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| get_my_customer_profile     | FUNCTION     | jsonb     | 
  SELECT row_to_json(c)::jsonb
  FROM public.customers c
  WHERE c.id = auth.uid()::text
  LIMIT 1;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| get_newsletter_status       | FUNCTION     | boolean   | 
  SELECT EXISTS (
    SELECT 1 FROM public.newsletter_subscribers WHERE email = p_email
  );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| get_order_tracking          | FUNCTION     | jsonb     | 
DECLARE
  v_order jsonb;
  v_items jsonb;
BEGIN
  IF p_code IS NULL OR p_code !~ '^[A-Za-z0-9_-]{6,64}$' THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', o.id,
    'status', o.status,
    'created_at', o.created_at,
    'client_name', o.client_name,
    'total_amount', o.total_amount,
    'shipping_cost', o.shipping_cost,
    'tracking_info', o.tracking_info
  )
  INTO v_order
  FROM public.orders o
  WHERE o.id = p_code;

  IF v_order IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'product_id', i.product_id,
    'product_title', i.product_title,
    'product_image', i.product_image,
    'selected_color', i.selected_color,
    'selected_size', i.selected_size,
    'quantity', i.quantity,
    'unit_price', i.unit_price
  )), '[]'::jsonb)
  INTO v_items
  FROM public.order_items i
  WHERE i.order_id = p_code;

  RETURN v_order || jsonb_build_object('items', v_items);
END;
 |
| handle_new_user             | FUNCTION     | trigger   | 
BEGIN
  INSERT INTO public.customers (id, email, name, registration_date, last_login_date)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| is_admin                    | FUNCTION     | boolean   | 
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = auth.jwt() ->> 'email'
      AND role IN ('admin', 'super_admin')
  );
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| set_newsletter_subscription | FUNCTION     | void      | 
BEGIN
  IF p_subscribed THEN
    IF NOT EXISTS (SELECT 1 FROM public.newsletter_subscribers WHERE email = p_email) THEN
      INSERT INTO public.newsletter_subscribers (email) VALUES (p_email);
    END IF;
  ELSE
    DELETE FROM public.newsletter_subscribers WHERE email = p_email;
  END IF;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| update_email_prefs          | FUNCTION     | void      | 
  UPDATE public.customers
  SET email_preferences = p_prefs
  WHERE email = p_email;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| update_product_ratings      | FUNCTION     | trigger   | 
BEGIN
  UPDATE products
  SET
    ratings_score = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM product_reviews WHERE product_id = NEW.product_id), 0),
    ratings_count = (SELECT COUNT(*) FROM product_reviews WHERE product_id = NEW.product_id)
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

-- =============================================================================
-- 7. TRIGGERS
-- =============================================================================
| event_object_table | trigger_name            | action_timing | event_manipulation | action_statement                           |
| ------------------ | ----------------------- | ------------- | ------------------ | ------------------------------------------ |
| notifications      | notification_rate_limit | BEFORE        | INSERT             | EXECUTE FUNCTION check_notification_rate() |
| product_reviews    | trg_update_ratings      | AFTER         | INSERT             | EXECUTE FUNCTION update_product_ratings()  |
| product_reviews    | trg_update_ratings      | AFTER         | DELETE             | EXECUTE FUNCTION update_product_ratings()  |
| product_reviews    | trg_update_ratings      | AFTER         | UPDATE             | EXECUTE FUNCTION update_product_ratings()  |

-- =============================================================================
-- 8. RÔLES ET APPARTENANCE
-- =============================================================================
| rolname                     | memberof                                                     |
| --------------------------- | ------------------------------------------------------------ |
| anon                        | {NULL}                                                       |
| authenticated               | {NULL}                                                       |
| dashboard_user              | {NULL}                                                       |
| pg_checkpoint               | {NULL}                                                       |
| pg_create_subscription      | {NULL}                                                       |
| pg_database_owner           | {NULL}                                                       |
| pg_execute_server_program   | {NULL}                                                       |
| pg_maintain                 | {NULL}                                                       |
| pg_monitor                  | {pg_stat_scan_tables,pg_read_all_settings,pg_read_all_stats} |
| pg_read_all_data            | {NULL}                                                       |
| pg_read_all_settings        | {NULL}                                                       |
| pg_read_all_stats           | {NULL}                                                       |
| pg_read_server_files        | {NULL}                                                       |
| pg_signal_backend           | {NULL}                                                       |
| pg_stat_scan_tables         | {NULL}                                                       |
| pg_use_reserved_connections | {NULL}                                                       |
| pg_write_all_data           | {NULL}                                                       |
| pg_write_server_files       | {NULL}                                                       |
| service_role                | {NULL}                                                       |
| supabase_privileged_role    | {NULL}                                                       |
| supabase_realtime_admin     | {NULL}                                                       |

-- =============================================================================
-- 9. EXTENSIONS INSTALLÉES
-- =============================================================================
| extname            | extversion |
| ------------------ | ---------- |
| plpgsql            | 1.0        |
| pg_stat_statements | 1.11       |
| uuid-ossp          | 1.1        |
| pgcrypto           | 1.3        |
| supabase_vault     | 0.3.1      |




-- Vérification rapide de l’état de sécurité

-- =============================================================================
-- 1. Tables SANS RLS (doit être vide si tout est activé)
-- =============================================================================
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
--- > Success. No rows returned

-- =============================================================================
-- 2. Politiques par table (lecture, écriture, rôles autorisés)
-- =============================================================================
| tablename              | policyname                             | cmd    | roles                | using_condition                                                                                                                                                                                     | with_check_condition                                                                                                                                                                                |
| ---------------------- | -------------------------------------- | ------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| admin_users            | admin_users_delete_admin               | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| admin_users            | admin_users_insert_admin               | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| admin_users            | admin_users_select_admin               | SELECT | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| admin_users            | admin_users_update_admin               | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| api_connections        | api_connections_delete_admin           | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| api_connections        | api_connections_insert_admin           | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| api_connections        | api_connections_select_admin           | SELECT | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| api_connections        | api_connections_update_admin           | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| cart_items             | cart_items_delete_own                  | DELETE | {authenticated}      | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | true                                                                                                                                                                                                |
| cart_items             | cart_items_insert_own                  | INSERT | {authenticated}      | true                                                                                                                                                                                                | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 |
| cart_items             | cart_items_select_own                  | SELECT | {authenticated}      | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | true                                                                                                                                                                                                |
| cart_items             | cart_items_update_own                  | UPDATE | {authenticated}      | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = cart_items.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 |
| customer_addresses     | customer_addresses_delete_own          | DELETE | {authenticated}      | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     | true                                                                                                                                                                                                |
| customer_addresses     | customer_addresses_insert_own          | INSERT | {authenticated}      | true                                                                                                                                                                                                | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     |
| customer_addresses     | customer_addresses_select_own          | SELECT | {authenticated}      | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     | true                                                                                                                                                                                                |
| customer_addresses     | customer_addresses_update_own          | UPDATE | {authenticated}      | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_addresses.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))     |
| customer_notifications | customer_notifications_delete_own      | DELETE | {authenticated}      | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) | true                                                                                                                                                                                                |
| customer_notifications | customer_notifications_insert_own      | INSERT | {authenticated}      | true                                                                                                                                                                                                | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) |
| customer_notifications | customer_notifications_select_own      | SELECT | {authenticated}      | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) | true                                                                                                                                                                                                |
| customer_notifications | customer_notifications_update_own      | UPDATE | {authenticated}      | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) | (is_admin() OR (customer_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = customer_notifications.customer_id) AND (c.email = (auth.jwt() ->> 'email'::text)))))) |
| customers              | customers_delete_admin                 | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| customers              | customers_insert_own                   | INSERT | {authenticated}      | true                                                                                                                                                                                                | (is_admin() OR (id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text)))                                                                                                               |
| customers              | customers_select_own                   | SELECT | {authenticated}      | (is_admin() OR (id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text)))                                                                                                               | true                                                                                                                                                                                                |
| customers              | customers_update_own                   | UPDATE | {authenticated}      | (is_admin() OR (id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text)))                                                                                                               | (is_admin() OR (id = (auth.uid())::text) OR (email = (auth.jwt() ->> 'email'::text)))                                                                                                               |
| email_automations      | email_automations_delete_admin         | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| email_automations      | email_automations_insert_admin         | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| email_automations      | email_automations_select_welcome       | SELECT | {anon}               | ((trigger_type = 'welcome'::text) AND (enabled = true))                                                                                                                                             | true                                                                                                                                                                                                |
| email_automations      | email_automations_select_authenticated | SELECT | {authenticated}      | (is_admin() OR ((trigger_type = 'welcome'::text) AND (enabled = true)))                                                                                                                             | true                                                                                                                                                                                                |
| email_automations      | email_automations_update_admin         | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| email_campaigns        | email_campaigns_delete_admin           | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| email_campaigns        | email_campaigns_insert_admin           | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| email_campaigns        | email_campaigns_select_admin           | SELECT | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| email_campaigns        | email_campaigns_update_admin           | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| email_sender_settings  | email_sender_settings_delete_admin     | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| email_sender_settings  | email_sender_settings_insert_admin     | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| email_sender_settings  | email_sender_settings_select_admin     | SELECT | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| email_sender_settings  | email_sender_settings_update_admin     | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| favourites             | favourites_delete_own                  | DELETE | {authenticated}      | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | true                                                                                                                                                                                                |
| favourites             | favourites_insert_own                  | INSERT | {authenticated}      | true                                                                                                                                                                                                | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 |
| favourites             | favourites_select_own                  | SELECT | {authenticated}      | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | true                                                                                                                                                                                                |
| favourites             | favourites_update_own                  | UPDATE | {authenticated}      | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 | (is_admin() OR (client_id = (auth.uid())::text) OR (EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = favourites.client_id) AND (c.email = (auth.jwt() ->> 'email'::text))))))                 |
| hero_promotions        | hero_promotions_delete_admin           | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| hero_promotions        | hero_promotions_insert_admin           | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| hero_promotions        | hero_promotions_select_public          | SELECT | {anon,authenticated} | true                                                                                                                                                                                                | true                                                                                                                                                                                                |
| hero_promotions        | hero_promotions_update_admin           | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| interaction_messages   | interaction_messages_delete_admin      | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| interaction_messages   | interaction_messages_insert_own        | INSERT | {authenticated}      | true                                                                                                                                                                                                | (is_admin() OR (EXISTS ( SELECT 1
   FROM interactions i
  WHERE ((i.id = interaction_messages.interaction_id) AND (i.customer_email = (auth.jwt() ->> 'email'::text))))))                          |
| interaction_messages   | interaction_messages_select_own        | SELECT | {authenticated}      | (is_admin() OR (EXISTS ( SELECT 1
   FROM interactions i
  WHERE ((i.id = interaction_messages.interaction_id) AND (i.customer_email = (auth.jwt() ->> 'email'::text))))))                          | true                                                                                                                                                                                                |
| interaction_messages   | interaction_messages_update_admin      | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| interactions           | interactions_delete_admin              | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| interactions           | interactions_insert_own                | INSERT | {authenticated}      | true                                                                                                                                                                                                | (is_admin() OR (customer_email = (auth.jwt() ->> 'email'::text)))                                                                                                                                   |
| interactions           | interactions_select_own                | SELECT | {authenticated}      | (is_admin() OR (customer_email = (auth.jwt() ->> 'email'::text)))                                                                                                                                   | true                                                                                                                                                                                                |
| interactions           | interactions_update_own                | UPDATE | {authenticated}      | (is_admin() OR (customer_email = (auth.jwt() ->> 'email'::text)))                                                                                                                                   | (is_admin() OR (customer_email = (auth.jwt() ->> 'email'::text)))                                                                                                                                   |
| notifications          | notifications_delete_admin             | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| notifications          | notifications_insert_public            | INSERT | {anon,authenticated} | true                                                                                                                                                                                                | true                                                                                                                                                                                                |
| notifications          | notifications_select_admin             | SELECT | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| notifications          | notifications_update_admin             | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| order_items            | order_items_delete_admin               | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| order_items            | order_items_insert_public              | INSERT | {anon,authenticated} | true                                                                                                                                                                                                | true                                                                                                                                                                                                |
| order_items            | order_items_select_owner               | SELECT | {anon,authenticated} | (is_admin() OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND ((o.client_id = (auth.uid())::text) OR (o.client_email = (auth.jwt() ->> 'email'::text)))))))         | true                                                                                                                                                                                                |
| order_items            | order_items_update_admin               | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| orders                 | orders_delete_public                   | DELETE | {anon,authenticated} | (is_admin() OR ((status = 'pending'::text) AND (created_at > (now() - '01:00:00'::interval))))                                                                                                      | true                                                                                                                                                                                                |
| orders                 | orders_insert_check                    | INSERT | {anon,authenticated} | true                                                                                                                                                                                                | (is_admin() OR ((status = 'pending'::text) AND ((client_id IS NULL) OR (client_id = (auth.uid())::text))))                                                                                          |
| orders                 | orders_select_owner                    | SELECT | {anon,authenticated} | (is_admin() OR (client_id = (auth.uid())::text) OR (client_email = (auth.jwt() ->> 'email'::text)))                                                                                                 | true                                                                                                                                                                                                |
| orders                 | orders_update_admin                    | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| pod_settings           | pod_settings_delete_admin              | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| pod_settings           | pod_settings_insert_admin              | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| pod_settings           | pod_settings_select_admin              | SELECT | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| pod_settings           | pod_settings_update_admin              | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| product_mockups        | product_mockups_delete_admin           | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| product_mockups        | product_mockups_insert_admin           | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| product_mockups        | product_mockups_select_public          | SELECT | {anon,authenticated} | true                                                                                                                                                                                                | true                                                                                                                                                                                                |
| product_mockups        | product_mockups_update_admin           | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| product_reviews        | product_reviews_delete_admin           | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| product_reviews        | product_reviews_insert_admin           | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| product_reviews        | product_reviews_select_public          | SELECT | {anon,authenticated} | true                                                                                                                                                                                                | true                                                                                                                                                                                                |
| product_reviews        | product_reviews_update_admin           | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| products               | products_delete_admin                  | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| products               | products_insert_admin                  | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| products               | products_select_public                 | SELECT | {anon,authenticated} | true                                                                                                                                                                                                | true                                                                                                                                                                                                |
| products               | products_update_admin                  | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| reference_lists        | reference_lists_delete_admin           | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| reference_lists        | reference_lists_insert_admin           | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| reference_lists        | reference_lists_select_public          | SELECT | {anon,authenticated} | true                                                                                                                                                                                                | true                                                                                                                                                                                                |
| reference_lists        | reference_lists_update_admin           | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| store_settings         | store_settings_delete_admin            | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| store_settings         | store_settings_insert_admin            | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| store_settings         | store_settings_select_public           | SELECT | {anon,authenticated} | true                                                                                                                                                                                                | true                                                                                                                                                                                                |
| store_settings         | store_settings_update_admin            | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |
| sync_logs              | sync_logs_delete_admin                 | DELETE | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| sync_logs              | sync_logs_insert_admin                 | INSERT | {authenticated}      | true                                                                                                                                                                                                | is_admin()                                                                                                                                                                                          |
| sync_logs              | sync_logs_select_admin                 | SELECT | {authenticated}      | is_admin()                                                                                                                                                                                          | true                                                                                                                                                                                                |
| sync_logs              | sync_logs_update_admin                 | UPDATE | {authenticated}      | is_admin()                                                                                                                                                                                          | is_admin()                                                                                                                                                                                          |

-- =============================================================================
-- 3. Fonctions SECURITY DEFINER (vérifier qu'elles sont bien protégées)
-- =============================================================================
| routine_name                | routine_type | security_type | external_language |
| --------------------------- | ------------ | ------------- | ----------------- |
| check_notification_rate     | FUNCTION     | DEFINER       | PLPGSQL           |
| get_email_prefs             | FUNCTION     | DEFINER       | SQL               |
| get_my_customer_profile     | FUNCTION     | DEFINER       | SQL               |
| get_newsletter_status       | FUNCTION     | DEFINER       | SQL               |
| get_order_tracking          | FUNCTION     | DEFINER       | PLPGSQL           |
| handle_new_user             | FUNCTION     | DEFINER       | PLPGSQL           |
| is_admin                    | FUNCTION     | DEFINER       | SQL               |
| set_newsletter_subscription | FUNCTION     | DEFINER       | PLPGSQL           |
| update_email_prefs          | FUNCTION     | DEFINER       | SQL               |

-- =============================================================================
-- 4. Privilèges de anon et authenticated sur les tables sensibles
--    (admin_users, customers, orders, pod_settings, api_connections)
-- =============================================================================
| grantee       | table_name             | privilege_type |
| ------------- | ---------------------- | -------------- |
| anon          | api_connections        | DELETE         |
| anon          | api_connections        | INSERT         |
| anon          | api_connections        | SELECT         |
| anon          | api_connections        | UPDATE         |
| anon          | customers              | DELETE         |
| anon          | customers              | INSERT         |
| anon          | customers              | SELECT         |
| anon          | customers              | UPDATE         |
| anon          | newsletter_subscribers | DELETE         |
| anon          | newsletter_subscribers | INSERT         |
| anon          | newsletter_subscribers | SELECT         |
| anon          | newsletter_subscribers | UPDATE         |
| anon          | notifications          | DELETE         |
| anon          | notifications          | INSERT         |
| anon          | notifications          | SELECT         |
| anon          | notifications          | UPDATE         |
| anon          | order_items            | DELETE         |
| anon          | order_items            | INSERT         |
| anon          | order_items            | SELECT         |
| anon          | order_items            | UPDATE         |
| anon          | orders                 | DELETE         |
| anon          | orders                 | INSERT         |
| anon          | orders                 | SELECT         |
| anon          | orders                 | UPDATE         |
| anon          | pod_settings           | DELETE         |
| anon          | pod_settings           | INSERT         |
| anon          | pod_settings           | SELECT         |
| anon          | pod_settings           | UPDATE         |
| authenticated | admin_users            | DELETE         |
| authenticated | admin_users            | INSERT         |
| authenticated | admin_users            | SELECT         |
| authenticated | admin_users            | UPDATE         |
| authenticated | api_connections        | DELETE         |
| authenticated | api_connections        | INSERT         |
| authenticated | api_connections        | SELECT         |
| authenticated | api_connections        | UPDATE         |
| authenticated | customers              | DELETE         |
| authenticated | customers              | INSERT         |
| authenticated | customers              | SELECT         |
| authenticated | customers              | UPDATE         |
| authenticated | newsletter_subscribers | DELETE         |
| authenticated | newsletter_subscribers | INSERT         |
| authenticated | newsletter_subscribers | SELECT         |
| authenticated | newsletter_subscribers | UPDATE         |
| authenticated | notifications          | DELETE         |
| authenticated | notifications          | INSERT         |
| authenticated | notifications          | SELECT         |
| authenticated | notifications          | UPDATE         |
| authenticated | order_items            | DELETE         |
| authenticated | order_items            | INSERT         |
| authenticated | order_items            | SELECT         |
| authenticated | order_items            | UPDATE         |
| authenticated | orders                 | DELETE         |
| authenticated | orders                 | INSERT         |
| authenticated | orders                 | SELECT         |
| authenticated | orders                 | UPDATE         |
| authenticated | pod_settings           | DELETE         |
| authenticated | pod_settings           | INSERT         |
| authenticated | pod_settings           | SELECT         |
| authenticated | pod_settings           | UPDATE         |

-- =============================================================================
-- 5. Contraintes CHECK sur les statuts (orders, interactions, etc.)
-- =============================================================================
| constraint_name                           | table_name           | check_clause                                                                                                                                                                                                                                                      |
| ----------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| products_original_price_check             | products             | CHECK ((original_price >= (0)::numeric))                                                                                                                                                                                                                          |
| products_price_check                      | products             | CHECK ((price >= (0)::numeric))                                                                                                                                                                                                                                   |
| products_ratings_count_check              | products             | CHECK ((ratings_count >= 0))                                                                                                                                                                                                                                      |
| products_ratings_score_check              | products             | CHECK (((ratings_score >= (0)::numeric) AND (ratings_score <= (5)::numeric)))                                                                                                                                                                                     |
| products_stock_quantity_check             | products             | CHECK ((stock_quantity >= 0))                                                                                                                                                                                                                                     |
| cart_items_quantity_check                 | cart_items           | CHECK ((quantity > 0))                                                                                                                                                                                                                                            |
| orders_status_check                       | orders               | CHECK ((status = ANY (ARRAY['pending'::text, 'paid'::text, 'in_production'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'on_hold'::text, 'refunded'::text, 'returned'::text])))                                                                  |
| order_items_quantity_check                | order_items          | CHECK ((quantity > 0))                                                                                                                                                                                                                                            |
| pod_settings_sync_status_check            | pod_settings         | CHECK ((sync_status = ANY (ARRAY['idle'::text, 'syncing'::text, 'synced'::text, 'error'::text])))                                                                                                                                                                 |
| sync_logs_status_check                    | sync_logs            | CHECK ((status = ANY (ARRAY['success'::text, 'partial'::text, 'error'::text])))                                                                                                                                                                                   |
| api_connections_type_check                | api_connections      | CHECK ((type = ANY (ARRAY['pod'::text, 'affiliate'::text])))                                                                                                                                                                                                      |
| admin_users_role_check                    | admin_users          | CHECK ((role = ANY (ARRAY['super_admin'::text, 'editor'::text])))                                                                                                                                                                                                 |
| store_settings_id_check                   | store_settings       | CHECK ((id = true))                                                                                                                                                                                                                                               |
| store_settings_shipping_delay_range_check | store_settings       | CHECK ((((shipping_delay_min_days IS NULL) AND (shipping_delay_max_days IS NULL)) OR ((shipping_delay_min_days IS NOT NULL) AND (shipping_delay_min_days >= 0) AND ((shipping_delay_max_days IS NULL) OR (shipping_delay_min_days <= shipping_delay_max_days))))) |
| notifications_category_check              | notifications        | CHECK ((category = ANY (ARRAY['orders'::text, 'products'::text, 'customers'::text, 'interactions'::text, 'bonus'::text, 'api'::text, 'security'::text, 'finance'::text])))                                                                                        |
| notifications_priority_check              | notifications        | CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])))                                                                                                                                                                       |
| notifications_status_check                | notifications        | CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text, 'archived'::text])))                                                                                                                                                                                    |
| interactions_status_check                 | interactions         | CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))                                                                                                                                                               |
| interactions_type_check                   | interactions         | CHECK ((type = ANY (ARRAY['complaint'::text, 'question'::text, 'feedback'::text, 'retention'::text])))                                                                                                                                                            |
| interaction_messages_from_field_check     | interaction_messages | CHECK ((from_field = ANY (ARRAY['customer'::text, 'admin'::text])))                                                                                                                                                                                               |
| product_reviews_rating_check              | product_reviews      | CHECK (((rating >= 1) AND (rating <= 5)))                                                                                                                                                                                                                         |


--