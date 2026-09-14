-- Audit sécurité (WARN) — la colonne password_hash de admin_users n'a
-- jamais rien contenu d'utile : l'auth admin est 100% Supabase Auth natif
-- (auth.users), et aucun code ne lit ni n'écrit cette colonne avec une
-- vraie valeur (vérifié : seul un insert à NULL existait, supprimé).
-- Une colonne credentials vide aujourd'hui = un piège demain (un futur
-- dev pourrait y stocker en clair). Suppression définitive.
-- Idempotent. SQL Editor, schéma public.

ALTER TABLE public.admin_users
DROP COLUMN IF EXISTS password_hash;
