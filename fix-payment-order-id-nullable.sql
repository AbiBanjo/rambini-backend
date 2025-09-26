-- Make order_id column nullable in payments table for wallet funding support
ALTER TABLE "payments" ALTER COLUMN "order_id" DROP NOT NULL;

-- Optional: Add a comment to document the change
COMMENT ON COLUMN "payments"."order_id" IS 'Order ID - nullable for wallet funding transactions';
