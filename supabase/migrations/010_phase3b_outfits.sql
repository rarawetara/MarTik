-- Phase 3B: outfits + outfit_items tables + RLS
-- Run after 009_phase3a_wardrobe_items.sql

CREATE TABLE IF NOT EXISTS public.outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outfits_user_id ON public.outfits(user_id);

ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own outfits" ON public.outfits;
DROP POLICY IF EXISTS "Users can insert own outfits" ON public.outfits;
DROP POLICY IF EXISTS "Users can update own outfits" ON public.outfits;
DROP POLICY IF EXISTS "Users can delete own outfits" ON public.outfits;

CREATE POLICY "Users can read own outfits"
  ON public.outfits FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own outfits"
  ON public.outfits FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own outfits"
  ON public.outfits FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own outfits"
  ON public.outfits FOR DELETE USING (user_id = auth.uid());

--

CREATE TABLE IF NOT EXISTS public.outfit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outfit_id uuid NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  wardrobe_item_id uuid NOT NULL REFERENCES public.wardrobe_items(id) ON DELETE CASCADE,
  slot_type text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(outfit_id, wardrobe_item_id)
);

CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit_id ON public.outfit_items(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_wardrobe_item_id ON public.outfit_items(wardrobe_item_id);

ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own outfit_items" ON public.outfit_items;
DROP POLICY IF EXISTS "Users can insert own outfit_items" ON public.outfit_items;
DROP POLICY IF EXISTS "Users can update own outfit_items" ON public.outfit_items;
DROP POLICY IF EXISTS "Users can delete own outfit_items" ON public.outfit_items;

CREATE POLICY "Users can read own outfit_items"
  ON public.outfit_items FOR SELECT
  USING (outfit_id IN (SELECT id FROM public.outfits WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own outfit_items"
  ON public.outfit_items FOR INSERT
  WITH CHECK (outfit_id IN (SELECT id FROM public.outfits WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own outfit_items"
  ON public.outfit_items FOR UPDATE
  USING (outfit_id IN (SELECT id FROM public.outfits WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own outfit_items"
  ON public.outfit_items FOR DELETE
  USING (outfit_id IN (SELECT id FROM public.outfits WHERE user_id = auth.uid()));
