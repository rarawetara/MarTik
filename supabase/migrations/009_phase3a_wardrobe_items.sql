-- Phase 3A: wardrobe_items table + RLS + storage bucket "wardrobe" + storage policies
-- Run after 008_phase2f_beauty_routines_scheduling.sql
-- Storage path: {user_id}/{category}/filename.ext (e.g. user_id/top/abc123.webp)

CREATE TABLE IF NOT EXISTS public.wardrobe_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  color text,
  season text,
  notes text,
  photo_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_id
  ON public.wardrobe_items(user_id);

ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own wardrobe_items" ON public.wardrobe_items;
DROP POLICY IF EXISTS "Users can insert own wardrobe_items" ON public.wardrobe_items;
DROP POLICY IF EXISTS "Users can update own wardrobe_items" ON public.wardrobe_items;
DROP POLICY IF EXISTS "Users can delete own wardrobe_items" ON public.wardrobe_items;

CREATE POLICY "Users can read own wardrobe_items"
  ON public.wardrobe_items
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wardrobe_items"
  ON public.wardrobe_items
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own wardrobe_items"
  ON public.wardrobe_items
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own wardrobe_items"
  ON public.wardrobe_items
  FOR DELETE
  USING (user_id = auth.uid());

-- Storage bucket: wardrobe (clothing item photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wardrobe',
  'wardrobe',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: first folder in path = user_id (auth.uid())
DROP POLICY IF EXISTS "Users can read own wardrobe files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own wardrobe files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own wardrobe files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own wardrobe files" ON storage.objects;

CREATE POLICY "Users can read own wardrobe files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'wardrobe'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own wardrobe files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'wardrobe'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own wardrobe files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'wardrobe'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own wardrobe files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'wardrobe'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
