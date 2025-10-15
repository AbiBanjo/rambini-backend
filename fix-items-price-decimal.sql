-- Fix items_price column in delivery_quotes table
-- Change from integer to decimal(12,2)

ALTER TABLE delivery_quotes 
ALTER COLUMN items_price TYPE DECIMAL(12,2) 
USING CASE 
  WHEN items_price IS NULL THEN NULL 
  ELSE items_price::DECIMAL(12,2) 
END;

-- Verify the change
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'delivery_quotes' 
AND column_name = 'items_price';

