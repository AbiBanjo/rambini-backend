-- Fix delivery_quotes table to make order_id nullable
-- This allows delivery quotes to exist before orders are created

ALTER TABLE "delivery_quotes" 
ALTER COLUMN "order_id" DROP NOT NULL;
