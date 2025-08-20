-- Fix vendors table by adding missing columns
-- This script adds the missing columns that should exist according to the entity definition

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'user_id') THEN
        ALTER TABLE vendors ADD COLUMN user_id VARCHAR(36) NOT NULL;
        RAISE NOTICE 'Added user_id column to vendors table';
    ELSE
        RAISE NOTICE 'user_id column already exists in vendors table';
    END IF;
END $$;

-- Add business_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'business_name') THEN
        ALTER TABLE vendors ADD COLUMN business_name VARCHAR(255) NOT NULL;
        RAISE NOTICE 'Added business_name column to vendors table';
    ELSE
        RAISE NOTICE 'business_name column already exists in vendors table';
    END IF;
END $$;

-- Add address_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'address_id') THEN
        ALTER TABLE vendors ADD COLUMN address_id VARCHAR(36) NOT NULL;
        RAISE NOTICE 'Added address_id column to vendors table';
    ELSE
        RAISE NOTICE 'address_id column already exists in vendors table';
    END IF;
END $$;

-- Add is_active column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'is_active') THEN
        ALTER TABLE vendors ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        RAISE NOTICE 'Added is_active column to vendors table';
    ELSE
        RAISE NOTICE 'is_active column already exists in vendors table';
    END IF;
END $$;

-- Add is_accepting_orders column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'is_accepting_orders') THEN
        ALTER TABLE vendors ADD COLUMN is_accepting_orders BOOLEAN NOT NULL DEFAULT false;
        RAISE NOTICE 'Added is_accepting_orders column to vendors table';
    ELSE
        RAISE NOTICE 'is_accepting_orders column already exists in vendors table';
    END IF;
END $$;

-- Add document_verification_status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'document_verification_status') THEN
        ALTER TABLE vendors ADD COLUMN document_verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING';
        RAISE NOTICE 'Added document_verification_status column to vendors table';
    ELSE
        RAISE NOTICE 'document_verification_status column already exists in vendors table';
    END IF;
END $$;

-- Add verification_notes column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'verification_notes') THEN
        ALTER TABLE vendors ADD COLUMN verification_notes TEXT;
        RAISE NOTICE 'Added verification_notes column to vendors table';
    ELSE
        RAISE NOTICE 'verification_notes column already exists in vendors table';
    END IF;
END $$;

-- Add verified_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'verified_at') THEN
        ALTER TABLE vendors ADD COLUMN verified_at TIMESTAMP;
        RAISE NOTICE 'Added verified_at column to vendors table';
    ELSE
        RAISE NOTICE 'verified_at column already exists in vendors table';
    END IF;
END $$;

-- Add verified_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'verified_by') THEN
        ALTER TABLE vendors ADD COLUMN verified_by VARCHAR(255);
        RAISE NOTICE 'Added verified_by column to vendors table';
    ELSE
        RAISE NOTICE 'verified_by column already exists in vendors table';
    END IF;
END $$;

-- Add documents column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'documents') THEN
        ALTER TABLE vendors ADD COLUMN documents JSONB;
        RAISE NOTICE 'Added documents column to vendors table';
    ELSE
        RAISE NOTICE 'documents column already exists in vendors table';
    END IF;
END $$;

-- Create indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_VENDORS_USER_ID') THEN
        CREATE INDEX IDX_VENDORS_USER_ID ON vendors(user_id);
        RAISE NOTICE 'Created IDX_VENDORS_USER_ID index';
    ELSE
        RAISE NOTICE 'IDX_VENDORS_USER_ID index already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_VENDORS_ADDRESS_ID') THEN
        CREATE INDEX IDX_VENDORS_ADDRESS_ID ON vendors(address_id);
        RAISE NOTICE 'Created IDX_VENDORS_ADDRESS_ID index';
    ELSE
        RAISE NOTICE 'IDX_VENDORS_ADDRESS_ID index already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_VENDORS_DOCUMENT_VERIFICATION_STATUS') THEN
        CREATE INDEX IDX_VENDORS_DOCUMENT_VERIFICATION_STATUS ON vendors(document_verification_status);
        RAISE NOTICE 'Created IDX_VENDORS_DOCUMENT_VERIFICATION_STATUS index';
    ELSE
        RAISE NOTICE 'IDX_VENDORS_DOCUMENT_VERIFICATION_STATUS index already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'IDX_VENDORS_IS_ACTIVE') THEN
        CREATE INDEX IDX_VENDORS_IS_ACTIVE ON vendors(is_active);
        RAISE NOTICE 'Created IDX_VENDORS_IS_ACTIVE index';
    ELSE
        RAISE NOTICE 'IDX_VENDORS_IS_ACTIVE index already exists';
    END IF;
END $$;

-- Create foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_VENDORS_USER_ID') THEN
        ALTER TABLE vendors ADD CONSTRAINT FK_VENDORS_USER_ID FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created FK_VENDORS_USER_ID foreign key constraint';
    ELSE
        RAISE NOTICE 'FK_VENDORS_USER_ID foreign key constraint already exists';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_VENDORS_ADDRESS_ID') THEN
        ALTER TABLE vendors ADD CONSTRAINT FK_VENDORS_ADDRESS_ID FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created FK_VENDORS_ADDRESS_ID foreign key constraint';
    ELSE
        RAISE NOTICE 'FK_VENDORS_ADDRESS_ID foreign key constraint already exists';
    END IF;
END $$;

-- Show final table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'vendors' 
ORDER BY ordinal_position; 