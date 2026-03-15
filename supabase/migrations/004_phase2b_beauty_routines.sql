-- Phase 2B: beauty_routines and beauty_routine_steps. No beauty_logs (Phase 2C).
-- Run after 003_phase2a_beauty_products.sql
-- Safe to re-run: IF NOT EXISTS, DROP POLICY IF EXISTS.

CREATE TABLE IF NOT EXISTS public.beauty_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beauty_routines_user_id
  ON public.beauty_routines(user_id);

ALTER TABLE public.beauty_routines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own beauty_routines" ON public.beauty_routines;
DROP POLICY IF EXISTS "Users can insert own beauty_routines" ON public.beauty_routines;
DROP POLICY IF EXISTS "Users can update own beauty_routines" ON public.beauty_routines;
DROP POLICY IF EXISTS "Users can delete own beauty_routines" ON public.beauty_routines;

CREATE POLICY "Users can read own beauty_routines"
  ON public.beauty_routines FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own beauty_routines"
  ON public.beauty_routines FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own beauty_routines"
  ON public.beauty_routines FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own beauty_routines"
  ON public.beauty_routines FOR DELETE USING (user_id = auth.uid());

-- Steps: each step belongs to one routine and references one product. deleted_at for soft-delete.
CREATE TABLE IF NOT EXISTS public.beauty_routine_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES public.beauty_routines(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.beauty_products(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_beauty_routine_steps_routine_id
  ON public.beauty_routine_steps(routine_id);

ALTER TABLE public.beauty_routine_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own routine steps" ON public.beauty_routine_steps;
DROP POLICY IF EXISTS "Users can insert own routine steps" ON public.beauty_routine_steps;
DROP POLICY IF EXISTS "Users can update own routine steps" ON public.beauty_routine_steps;
DROP POLICY IF EXISTS "Users can delete own routine steps" ON public.beauty_routine_steps;

CREATE POLICY "Users can read own routine steps"
  ON public.beauty_routine_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.beauty_routines r WHERE r.id = routine_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can insert own routine steps"
  ON public.beauty_routine_steps FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.beauty_routines r WHERE r.id = routine_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can update own routine steps"
  ON public.beauty_routine_steps FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.beauty_routines r WHERE r.id = routine_id AND r.user_id = auth.uid()));

CREATE POLICY "Users can delete own routine steps"
  ON public.beauty_routine_steps FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.beauty_routines r WHERE r.id = routine_id AND r.user_id = auth.uid()));
