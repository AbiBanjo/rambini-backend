-- Script to fix NULL emails before migration
-- Run this script manually in your database before running the migration

-- Update all users with NULL email to have a temporary unique email
UPDATE users 
SET email = 'migrated_' || id || '_' || EXTRACT(EPOCH FROM NOW())::bigint || '_' || floor(random() * 10000)::int || '@migrated.rambini.com' 
WHERE email IS NULL;

-- Verify no NULL emails remain
SELECT COUNT(*) as null_email_count FROM users WHERE email IS NULL;
-- Should return 0

