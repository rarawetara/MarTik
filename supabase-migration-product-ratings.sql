-- Add price and rating fields to beauty_products
ALTER TABLE beauty_products
  ADD COLUMN IF NOT EXISTS price            numeric(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rating_scent     smallint       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rating_packaging smallint       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rating_value     smallint       DEFAULT NULL;

-- Add check constraints separately (avoids IF NOT EXISTS limitation with inline CHECK)
ALTER TABLE beauty_products
  ADD CONSTRAINT beauty_products_rating_scent_check
    CHECK (rating_scent BETWEEN 1 AND 5);

ALTER TABLE beauty_products
  ADD CONSTRAINT beauty_products_rating_packaging_check
    CHECK (rating_packaging BETWEEN 1 AND 5);

ALTER TABLE beauty_products
  ADD CONSTRAINT beauty_products_rating_value_check
    CHECK (rating_value BETWEEN 1 AND 5);
