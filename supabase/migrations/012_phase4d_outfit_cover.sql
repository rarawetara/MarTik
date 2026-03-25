-- Phase 4D: outfit cover photo — add column + storage bucket "outfits"
-- Run after 011_phase3c_planned_outfits.sql

ALTER TABLE public.outfits
  ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- Storage bucket: outfits (outfit cover photos)
-- Path: {user_id}/outfits/{outfit_id}.{ext}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'outfits',
  'outfits',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: path starts with user_id (auth.uid())
DROP POLICY IF EXISTS "Users can read own outfit files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own outfit files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own outfit files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own outfit files" ON storage.objects;

CREATE POLICY "Users can read own outfit files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'outfits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own outfit files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'outfits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own outfit files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'outfits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own outfit files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'outfits'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
