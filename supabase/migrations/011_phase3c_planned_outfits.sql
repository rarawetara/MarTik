-- Phase 3C: planned_outfits — assign outfit to a date; one per user per day
-- Run after 010_phase3b_outfits.sql

CREATE TABLE IF NOT EXISTS public.planned_outfits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  outfit_id uuid NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  planned_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'worn', 'skipped')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, planned_date)
);

CREATE INDEX IF NOT EXISTS idx_planned_outfits_user_id ON public.planned_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_outfits_planned_date ON public.planned_outfits(planned_date);
CREATE INDEX IF NOT EXISTS idx_planned_outfits_outfit_id ON public.planned_outfits(outfit_id);

ALTER TABLE public.planned_outfits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own planned_outfits" ON public.planned_outfits;
DROP POLICY IF EXISTS "Users can insert own planned_outfits" ON public.planned_outfits;
DROP POLICY IF EXISTS "Users can update own planned_outfits" ON public.planned_outfits;
DROP POLICY IF EXISTS "Users can delete own planned_outfits" ON public.planned_outfits;

CREATE POLICY "Users can read own planned_outfits"
  ON public.planned_outfits FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own planned_outfits"
  ON public.planned_outfits FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own planned_outfits"
  ON public.planned_outfits FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own planned_outfits"
  ON public.planned_outfits FOR DELETE USING (user_id = auth.uid());
