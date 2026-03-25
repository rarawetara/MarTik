-- Add note_category column to beauty_progress_photos
ALTER TABLE beauty_progress_photos
  ADD COLUMN IF NOT EXISTS note_category text DEFAULT NULL;
