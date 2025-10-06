-- Make address and package fields nullable in delivery_quotes table
-- This allows delivery quotes to be created without these fields initially

ALTER TABLE "delivery_quotes" 
ALTER COLUMN "origin_address" DROP NOT NULL;

ALTER TABLE "delivery_quotes" 
ALTER COLUMN "destination_address" DROP NOT NULL;

ALTER TABLE "delivery_quotes" 
ALTER COLUMN "package_details" DROP NOT NULL;
