-- Phase 2D: beauty_progress_photos table + RLS; storage bucket beauty-progress + RLS.
-- Run after 005_phase2c_beauty_logs.sql
-- Path: {user_id}/{area}/filename.{ext}

CREATE TABLE IF NOT EXISTS public.beauty_progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  daily_entry_id uuid NOT NULL REFERENCES public.daily_entries(id) ON DELETE CASCADE,
  area text NOT NULL CHECK (area IN ('face', 'hair')),
  photo_url text NOT NULL,
  notes text,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beauty_progress_photos_user_id
  ON public.beauty_progress_photos(user_id);

CREATE INDEX IF NOT EXISTS idx_beauty_progress_photos_daily_entry_id
  ON public.beauty_progress_photos(daily_entry_id);

ALTER TABLE public.beauty_progress_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own beauty_progress_photos" ON public.beauty_progress_photos;
DROP POLICY IF EXISTS "Users can insert own beauty_progress_photos" ON public.beauty_progress_photos;
DROP POLICY IF EXISTS "Users can update own beauty_progress_photos" ON public.beauty_progress_photos;
DROP POLICY IF EXISTS "Users can delete own beauty_progress_photos" ON public.beauty_progress_photos;

CREATE POLICY "Users can read own beauty_progress_photos"
  ON public.beauty_progress_photos FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own beauty_progress_photos"
  ON public.beauty_progress_photos FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own beauty_progress_photos"
  ON public.beauty_progress_photos FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own beauty_progress_photos"
  ON public.beauty_progress_photos FOR DELETE USING (user_id = auth.uid());

-- Storage bucket: beauty-progress (consistent name everywhere)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'beauty-progress',
  'beauty-progress',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can read own beauty progress files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own beauty progress files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own beauty progress files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own beauty progress files" ON storage.objects;

CREATE POLICY "Users can read own beauty progress files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'beauty-progress' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own beauty progress files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'beauty-progress' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own beauty progress files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'beauty-progress' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own beauty progress files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'beauty-progress' AND (storage.foldername(name))[1] = auth.uid()::text);
