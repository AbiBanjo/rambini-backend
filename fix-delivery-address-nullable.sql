-- Migration to make delivery_address_id nullable in orders table for PICKUP orders
-- This addresses the issue where PICKUP orders don't need a delivery address

-- First, drop the existing foreign key constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS "FK_ORDERS_DELIVERY_ADDRESS";

-- Alter the column to allow NULL values
ALTER TABLE orders ALTER COLUMN delivery_address_id DROP NOT NULL;

-- Re-create the foreign key constraint (now allowing NULLs)
ALTER TABLE orders 
ADD CONSTRAINT "FK_ORDERS_DELIVERY_ADDRESS" 
FOREIGN KEY (delivery_address_id) 
REFERENCES addresses(id) 
ON DELETE RESTRICT 
ON UPDATE CASCADE;

-- Verify the change
SELECT 
    column_name, 
    is_nullable, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'delivery_address_id';
