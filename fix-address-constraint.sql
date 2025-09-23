-- Script to fix the address constraint issue
-- This removes the problematic unique constraint that prevents users from having multiple addresses
-- and replaces it with a proper constraint that only allows one default address per user

-- Drop the problematic unique constraint
DROP INDEX IF EXISTS "IDX_ADDRESSES_USER_ID_IS_DEFAULT";

-- Create a partial unique index that only enforces uniqueness for default addresses (is_default = true)
-- This allows multiple non-default addresses while ensuring only one default address per user
CREATE UNIQUE INDEX "IDX_ADDRESSES_USER_ID_DEFAULT_TRUE" 
ON "addresses" ("user_id") 
WHERE "is_default" = true;

-- Verify the fix
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'addresses' 
    AND indexname LIKE '%user_id%';
