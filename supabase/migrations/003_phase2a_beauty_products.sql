-- Phase 2A: beauty_products table + RLS + storage bucket/policies
-- Run after 002_daily_tasks_per_day.sql
-- Safe to re-run: uses IF NOT EXISTS, DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING.
--
-- Storage path for uploads: {user_id}/filename.ext (e.g. user_id/abc123.webp)

CREATE TABLE IF NOT EXISTS public.beauty_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  area text,
  time_of_day text,
  notes text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beauty_products_user_id
  ON public.beauty_products(user_id);

ALTER TABLE public.beauty_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own beauty_products" ON public.beauty_products;
DROP POLICY IF EXISTS "Users can insert own beauty_products" ON public.beauty_products;
DROP POLICY IF EXISTS "Users can update own beauty_products" ON public.beauty_products;
DROP POLICY IF EXISTS "Users can delete own beauty_products" ON public.beauty_products;

CREATE POLICY "Users can read own beauty_products"
  ON public.beauty_products
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own beauty_products"
  ON public.beauty_products
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own beauty_products"
  ON public.beauty_products
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own beauty_products"
  ON public.beauty_products
  FOR DELETE
  USING (user_id = auth.uid());

-- Storage bucket: id and name as string 'beauty-products' (bucket_id in storage.objects is text)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'beauty-products',
  'beauty-products',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: bucket_id is text — compare to string 'beauty-products' only (no ::uuid)
DROP POLICY IF EXISTS "Users can read own beauty product files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own beauty product files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own beauty product files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own beauty product files" ON storage.objects;

CREATE POLICY "Users can read own beauty product files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'beauty-products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own beauty product files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'beauty-products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own beauty product files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'beauty-products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own beauty product files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'beauty-products'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
