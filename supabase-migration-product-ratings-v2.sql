-- Product ratings v2: face metrics + запах/упаковка/внешне; убрано «цена/качество» (rating_value).

ALTER TABLE beauty_products ADD COLUMN IF NOT EXISTS rating_black_dots smallint DEFAULT NULL;
ALTER TABLE beauty_products ADD COLUMN IF NOT EXISTS rating_radiance   smallint DEFAULT NULL;
ALTER TABLE beauty_products ADD COLUMN IF NOT EXISTS rating_firmness   smallint DEFAULT NULL;
ALTER TABLE beauty_products ADD COLUMN IF NOT EXISTS rating_even_tone  smallint DEFAULT NULL;
ALTER TABLE beauty_products ADD COLUMN IF NOT EXISTS rating_appearance smallint DEFAULT NULL;

-- Перенос старой оценки «цена/качество» во «внешне», если новая пуста
UPDATE beauty_products
SET rating_appearance = rating_value
WHERE rating_value IS NOT NULL AND rating_appearance IS NULL;

ALTER TABLE beauty_products DROP CONSTRAINT IF EXISTS beauty_products_rating_value_check;
ALTER TABLE beauty_products DROP COLUMN IF EXISTS rating_value;
