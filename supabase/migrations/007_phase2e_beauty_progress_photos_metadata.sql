-- Phase 2E: extend beauty_progress_photos with optional routine link and soft ratings.
-- Run after 006_phase2d_beauty_progress_photos.sql
-- All new columns nullable; existing rows remain valid.

ALTER TABLE public.beauty_progress_photos
  ADD COLUMN IF NOT EXISTS routine_id uuid REFERENCES public.beauty_routines(id) ON DELETE SET NULL;

ALTER TABLE public.beauty_progress_photos
  ADD COLUMN IF NOT EXISTS face_condition_rating text
  CHECK (face_condition_rating IS NULL OR face_condition_rating IN ('low', 'medium', 'good', 'great'));

ALTER TABLE public.beauty_progress_photos
  ADD COLUMN IF NOT EXISTS hair_quality_rating text
  CHECK (hair_quality_rating IS NULL OR hair_quality_rating IN ('low', 'medium', 'good', 'great'));

ALTER TABLE public.beauty_progress_photos
  ADD COLUMN IF NOT EXISTS hair_length_feeling_rating text
  CHECK (hair_length_feeling_rating IS NULL OR hair_length_feeling_rating IN ('low', 'medium', 'good', 'great'));

CREATE INDEX IF NOT EXISTS idx_beauty_progress_photos_routine_id
  ON public.beauty_progress_photos(routine_id)
  WHERE routine_id IS NOT NULL;
