-- Rambini Database Initialization Script
-- This script creates the initial database structure

-- Create database if it doesn't exist
-- Note: This will be handled by Docker environment variables

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vendor_status AS ENUM ('pending', 'approved', 'rejected', 'suspended', 'active');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('order_update', 'payment', 'promotion', 'system', 'vendor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
-- These will be created when entities are defined

-- Log the initialization
INSERT INTO pg_stat_statements_info (dealloc) VALUES (0) ON CONFLICT DO NOTHING; 