-- Optional 1–5 star rating on beauty routines (separate from product ratings).

ALTER TABLE public.beauty_routines ADD COLUMN IF NOT EXISTS rating smallint DEFAULT NULL;

DO $$
BEGIN
  ALTER TABLE public.beauty_routines
    ADD CONSTRAINT beauty_routines_rating_check
    CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
